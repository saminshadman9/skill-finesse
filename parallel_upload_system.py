"""
True Parallel Upload System - Server and CDN simultaneously
"""
import os
import time
import threading
import queue
import requests
from werkzeug.datastructures import FileStorage
import uuid
import tempfile

class ParallelUploadSystem:
    def __init__(self, uploader):
        self.uploader = uploader
        self.chunk_size = 2 * 1024 * 1024  # 2MB chunks for smooth progress
        
    def upload_parallel_streams(self, upload_id: str, file_obj: FileStorage, course_id: int, video_data: dict):
        """Upload to server and CDN in parallel with real-time progress"""
        try:
            # Get file size
            file_obj.stream.seek(0, 2)
            file_size = file_obj.stream.tell()
            file_obj.stream.seek(0)
            
            print(f"🚀 Starting parallel upload: {self.uploader.format_bytes(file_size)}")
            
            # Create temp file for server storage
            temp_dir = tempfile.gettempdir()
            file_extension = os.path.splitext(file_obj.filename)[1]
            unique_filename = f"{course_id}_{int(time.time())}{file_extension}"
            temp_file_path = os.path.join(temp_dir, unique_filename)
            
            # Setup CDN upload path
            folder_name = self.uploader.get_course_folder_name(course_id)
            video_filename = f"{uuid.uuid4()}{file_extension}"
            remote_path = f"videos/{folder_name}/{video_filename}"
            cdn_url = f"https://{self.uploader.storage_hostname}/{self.uploader.storage_zone}/{remote_path}"
            
            # Progress tracking
            server_bytes = 0
            cdn_bytes = 0
            start_time = time.time()
            
            # Shared data between threads
            upload_data = {
                'server_complete': False,
                'cdn_complete': False,
                'server_bytes': 0,
                'cdn_bytes': 0,
                'error': None,
                'cdn_url': None
            }
            
            # Thread-safe queue for chunks
            chunk_queue = queue.Queue()
            chunks_total = (file_size + self.chunk_size - 1) // self.chunk_size
            
            def read_file_chunks():
                """Read file and put chunks in queue"""
                try:
                    chunk_index = 0
                    while True:
                        chunk_data = file_obj.stream.read(self.chunk_size)
                        if not chunk_data:
                            break
                        chunk_queue.put((chunk_index, chunk_data))
                        chunk_index += 1
                    chunk_queue.put(None)  # Signal end
                except Exception as e:
                    print(f"❌ Error reading file: {e}")
                    upload_data['error'] = str(e)
            
            def server_upload_worker():
                """Upload chunks to server"""
                try:
                    with open(temp_file_path, 'wb') as f:
                        while True:
                            item = chunk_queue.get()
                            if item is None:  # End signal
                                break
                            
                            chunk_index, chunk_data = item
                            f.write(chunk_data)
                            upload_data['server_bytes'] += len(chunk_data)
                            
                            # Update server progress
                            server_percent = (upload_data['server_bytes'] / file_size) * 100
                            server_speed = self.uploader.calculate_speed(upload_data['server_bytes'], start_time)
                            server_eta = self.uploader.calculate_eta(upload_data['server_bytes'], file_size, start_time)
                            
                            self.uploader.update_progress(
                                upload_id, server_percent,
                                f"Server: {self.uploader.format_bytes(upload_data['server_bytes'])} / {self.uploader.format_bytes(file_size)}",
                                server_speed, "uploading", server_eta, 
                                upload_data['server_bytes'], file_size, "server"
                            )
                            
                            chunk_queue.task_done()
                    
                    upload_data['server_complete'] = True
                    self.uploader.update_progress(
                        upload_id, 100,
                        "✅ Server upload completed\!",
                        self.uploader.calculate_speed(file_size, start_time), "completed", "Completed",
                        file_size, file_size, "server"
                    )
                    
                except Exception as e:
                    print(f"❌ Server upload error: {e}")
                    upload_data['error'] = str(e)
            
            def cdn_upload_worker():
                """Upload chunks to CDN in parallel"""
                try:
                    session = requests.Session()
                    uploaded_chunks = {}
                    
                    while True:
                        item = chunk_queue.get()
                        if item is None:  # End signal
                            break
                        
                        chunk_index, chunk_data = item
                        chunk_start = chunk_index * self.chunk_size
                        chunk_end = chunk_start + len(chunk_data)
                        
                        # Upload chunk to CDN
                        headers = {
                            'AccessKey': self.uploader.storage_password,
                            'Content-Type': 'application/octet-stream',
                            'Content-Range': f'bytes {chunk_start}-{chunk_end-1}/{file_size}'
                        }
                        
                        response = session.put(
                            cdn_url,
                            data=chunk_data,
                            headers=headers,
                            timeout=(30, 1800)
                        )
                        
                        if response.status_code in [200, 201, 206]:
                            upload_data['cdn_bytes'] += len(chunk_data)
                            uploaded_chunks[chunk_index] = True
                            
                            # Update CDN progress
                            cdn_percent = (upload_data['cdn_bytes'] / file_size) * 100
                            cdn_speed = self.uploader.calculate_speed(upload_data['cdn_bytes'], start_time)
                            cdn_eta = self.uploader.calculate_eta(upload_data['cdn_bytes'], file_size, start_time)
                            
                            self.uploader.update_progress(
                                upload_id, cdn_percent,
                                f"CDN: {self.uploader.format_bytes(upload_data['cdn_bytes'])} / {self.uploader.format_bytes(file_size)} (Parallel)",
                                cdn_speed, "uploading", cdn_eta,
                                upload_data['cdn_bytes'], file_size, "cdn"
                            )
                        else:
                            print(f"❌ CDN chunk {chunk_index} failed: {response.status_code}")
                        
                        chunk_queue.task_done()
                    
                    upload_data['cdn_complete'] = True
                    upload_data['cdn_url'] = f"https://{self.uploader.cdn_hostname}/{remote_path}"
                    
                    self.uploader.update_progress(
                        upload_id, 100,
                        "✅ CDN upload completed\!",
                        self.uploader.calculate_speed(file_size, start_time), "completed", "Completed",
                        file_size, file_size, "cdn"
                    )
                    
                except Exception as e:
                    print(f"❌ CDN upload error: {e}")
                    upload_data['error'] = str(e)
            
            # Start all threads
            reader_thread = threading.Thread(target=read_file_chunks, daemon=True)
            server_thread = threading.Thread(target=server_upload_worker, daemon=True)
            cdn_thread = threading.Thread(target=cdn_upload_worker, daemon=True)
            
            # Initial progress
            self.uploader.update_progress(
                upload_id, 0,
                "🚀 Starting parallel upload to server and CDN...",
                "0 B/s", "uploading", "Calculating...", 0, file_size, "parallel"
            )
            
            reader_thread.start()
            time.sleep(0.1)  # Let reader start first
            server_thread.start()
            cdn_thread.start()
            
            # Monitor progress
            while not (upload_data['server_complete'] and upload_data['cdn_complete']) and not upload_data['error']:
                time.sleep(0.5)
                
                # Show combined progress
                total_bytes = upload_data['server_bytes'] + upload_data['cdn_bytes']
                combined_percent = (total_bytes / (file_size * 2)) * 100  # Total for both uploads
                combined_speed = self.uploader.calculate_speed(total_bytes, start_time)
                
                self.uploader.update_progress(
                    upload_id, combined_percent,
                    f"Parallel: Server {upload_data['server_bytes']//1024//1024}MB + CDN {upload_data['cdn_bytes']//1024//1024}MB",
                    combined_speed, "uploading", "In Progress",
                    total_bytes, file_size * 2, "parallel"
                )
            
            # Wait for threads to complete
            reader_thread.join(timeout=10)
            server_thread.join(timeout=30)
            cdn_thread.join(timeout=30)
            
            if upload_data['error']:
                return {'success': False, 'error': upload_data['error']}
            
            if upload_data['server_complete'] and upload_data['cdn_complete']:
                # Save to database
                from app import db, Video
                
                video = Video(
                    title=video_data['title'],
                    description=video_data.get('description', ''),
                    video_url=upload_data['cdn_url'],
                    course_id=course_id,
                    order_index=video_data.get('order_index', 0),
                    is_preview=video_data.get('is_preview', False),
                    instructions=video_data.get('instructions', ''),
                    external_links=video_data.get('external_links', '')
                )
                
                db.session.add(video)
                db.session.commit()
                
                # Final completion
                self.uploader.update_progress(
                    upload_id, 100,
                    "✅ Parallel upload completed\! Server + CDN + Database",
                    self.uploader.calculate_speed(file_size, start_time), "completed", "Completed",
                    file_size, file_size, "completed"
                )
                
                # Clean up temp file
                try:
                    os.remove(temp_file_path)
                except:
                    pass
                
                return {
                    'success': True,
                    'cdn_url': upload_data['cdn_url'],
                    'video_id': video.id
                }
            else:
                return {'success': False, 'error': 'Upload incomplete'}
                
        except Exception as e:
            print(f"❌ Parallel upload error: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

# Create global instance
parallel_upload_system = None

def init_parallel_upload_system(uploader):
    global parallel_upload_system
    parallel_upload_system = ParallelUploadSystem(uploader)
    return parallel_upload_system

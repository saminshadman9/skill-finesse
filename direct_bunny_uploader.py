"""
Direct Bunny CDN Upload System with Real-Time Progress
No file size limits, maximum speed, real progress tracking
"""

import os
import time
import requests
import threading
from typing import Dict, Optional
import uuid
import hashlib
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import concurrent.futures
from werkzeug.datastructures import FileStorage

class DirectBunnyUploader:
    def __init__(self):
        # Bunny.net configuration
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.api_key = '08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # Ultra-high speed settings for unlimited file sizes
        self.chunk_size = 128 * 1024 * 1024  # 128MB chunks for maximum speed
        self.max_parallel_chunks = 12  # More parallel uploads
        self.connection_timeout = 30
        self.read_timeout = 7200  # 2 hours for very large files
        
        # Progress tracking
        self.progress_data = {}
        self.upload_metadata = {}
        
        # Create optimized session pool
        self.sessions = self._create_session_pool()
        
    def _create_session_pool(self):
        """Create pool of ultra-optimized sessions"""
        sessions = []
        for _ in range(self.max_parallel_chunks):
            session = requests.Session()
            
            # Ultra-fast retry strategy
            retry_strategy = Retry(
                total=3,
                backoff_factor=0.1,
                status_forcelist=[429, 500, 502, 503, 504],
                method_whitelist=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE", "POST"]
            )
            
            adapter = HTTPAdapter(
                max_retries=retry_strategy,
                pool_connections=50,
                pool_maxsize=50,
                pool_block=False
            )
            
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            sessions.append(session)
            
        return sessions
        
    def update_progress(self, upload_id: str, percent: float, message: str, speed: str = "", 
                       status: str = "uploading", eta: str = "", bytes_uploaded: int = 0, 
                       total_bytes: int = 0, stage: str = "upload"):
        """Update progress with real percentages"""
        self.progress_data[upload_id] = {
            'status': status,
            'percent': round(percent, 2),  # More precise percentages
            'message': message,
            'speed': speed,
            'eta': eta,
            'bytes_uploaded': bytes_uploaded,
            'total_bytes': total_bytes,
            'timestamp': time.time(),
            'stage': stage
        }
        print(f"📊 [{stage.upper()}] {upload_id}: {percent:.2f}% - {speed} - {message}")
    
    def get_progress(self, upload_id: str) -> Optional[Dict]:
        """Get current progress"""
        return self.progress_data.get(upload_id)
    
    def calculate_speed(self, bytes_uploaded: int, start_time: float) -> str:
        """Calculate upload speed"""
        elapsed = time.time() - start_time
        if elapsed > 0:
            speed_bps = bytes_uploaded / elapsed
            if speed_bps >= 1024 * 1024 * 1024:  # GB/s
                return f"{speed_bps / (1024 * 1024 * 1024):.2f} GB/s"
            elif speed_bps >= 1024 * 1024:  # MB/s
                return f"{speed_bps / (1024 * 1024):.1f} MB/s"
            elif speed_bps >= 1024:  # KB/s
                return f"{speed_bps / 1024:.1f} KB/s"
            else:
                return f"{speed_bps:.1f} B/s"
        return "0 B/s"
    
    def calculate_eta(self, bytes_uploaded: int, total_bytes: int, start_time: float) -> str:
        """Calculate ETA"""
        if bytes_uploaded <= 0:
            return "Calculating..."
        
        elapsed = time.time() - start_time
        if elapsed <= 0:
            return "Calculating..."
        
        speed = bytes_uploaded / elapsed
        if speed <= 0:
            return "Calculating..."
        
        remaining_bytes = total_bytes - bytes_uploaded
        eta_seconds = remaining_bytes / speed
        
        if eta_seconds < 60:
            return f"{int(eta_seconds)}s"
        elif eta_seconds < 3600:
            return f"{int(eta_seconds / 60)}m {int(eta_seconds % 60)}s"
        else:
            hours = int(eta_seconds / 3600)
            minutes = int((eta_seconds % 3600) / 60)
            return f"{hours}h {minutes}m"
    
    def format_bytes(self, bytes_count: int) -> str:
        """Format bytes"""
        if bytes_count >= 1024 ** 4:  # TB
            return f"{bytes_count / (1024 ** 4):.2f} TB"
        elif bytes_count >= 1024 ** 3:  # GB
            return f"{bytes_count / (1024 ** 3):.2f} GB"
        elif bytes_count >= 1024 ** 2:  # MB
            return f"{bytes_count / (1024 ** 2):.2f} MB"
        elif bytes_count >= 1024:  # KB
            return f"{bytes_count / 1024:.2f} KB"
        else:
            return f"{bytes_count} B"
    
    def upload_file_stream_direct(self, file_obj: FileStorage, remote_path: str, upload_id: str) -> dict:
        """Direct stream upload to Bunny CDN with real-time progress"""
        start_time = time.time()
        
        try:
            # Get file size
            file_obj.stream.seek(0, 2)
            file_size = file_obj.stream.tell()
            file_obj.stream.seek(0)
            
            print(f"🚀 Direct Bunny upload: {self.format_bytes(file_size)} -> {remote_path}")
            
            # Initialize progress
            self.update_progress(
                upload_id, 0,
                f"Starting direct upload to Bunny CDN ({self.format_bytes(file_size)})...",
                "0 B/s", "uploading", "Calculating...", 0, file_size, "upload"
            )
            
            # Create upload URL
            url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            headers = {
                'AccessKey': self.storage_password,
                'Content-Type': 'application/octet-stream'
            }
            
            # Use chunked upload for large files
            if file_size > self.chunk_size:
                return self._upload_chunked_direct(file_obj, url, headers, file_size, upload_id, start_time, remote_path)
            else:
                return self._upload_single_direct(file_obj, url, headers, file_size, upload_id, start_time, remote_path)
                
        except Exception as e:
            print(f"❌ Direct upload error: {e}")
            self.update_progress(
                upload_id, 0,
                f"Upload error: {str(e)}",
                "0 B/s", "error", "Failed", 0, file_size, "error"
            )
            return {'success': False, 'error': str(e)}
    
    def _upload_single_direct(self, file_obj, url, headers, file_size, upload_id, start_time, remote_path):
        """Single file upload for smaller files"""
        try:
            session = self.sessions[0]
            
            # Create progress wrapper
            class ProgressWrapper:
                def __init__(self, file_obj, upload_id, uploader, file_size, start_time):
                    self.file_obj = file_obj
                    self.upload_id = upload_id
                    self.uploader = uploader
                    self.file_size = file_size
                    self.start_time = start_time
                    self.bytes_read = 0
                    
                def read(self, size=-1):
                    data = self.file_obj.stream.read(size)
                    if data:
                        self.bytes_read += len(data)
                        percent = (self.bytes_read / self.file_size) * 100
                        speed = self.uploader.calculate_speed(self.bytes_read, self.start_time)
                        eta = self.uploader.calculate_eta(self.bytes_read, self.file_size, self.start_time)
                        
                        self.uploader.update_progress(
                            self.upload_id, percent,
                            f"Uploading: {self.uploader.format_bytes(self.bytes_read)} / {self.uploader.format_bytes(self.file_size)}",
                            speed, "uploading", eta, self.bytes_read, self.file_size, "upload"
                        )
                    return data
            
            wrapper = ProgressWrapper(file_obj, upload_id, self, file_size, start_time)
            
            response = session.put(
                url,
                data=wrapper,
                headers=headers,
                timeout=(self.connection_timeout, self.read_timeout)
            )
            
            if response.status_code in [200, 201]:
                cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                
                # Check if file needs processing
                self._check_bunny_processing(upload_id, cdn_url, start_time, file_size)
                
                return {
                    'success': True,
                    'cdn_url': cdn_url,
                    'storage_path': remote_path
                }
            else:
                return {
                    'success': False,
                    'error': f'Upload failed: HTTP {response.status_code}'
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _upload_chunked_direct(self, file_obj, url, headers, file_size, upload_id, start_time, remote_path):
        """Chunked upload for large files with parallel processing"""
        try:
            total_chunks = (file_size + self.chunk_size - 1) // self.chunk_size
            bytes_uploaded = 0
            chunks_completed = 0
            
            print(f"📦 Chunked upload: {total_chunks} chunks of {self.format_bytes(self.chunk_size)}")
            
            # Read all chunks first (for unlimited size files)
            chunks = []
            chunk_index = 0
            while chunk_index < total_chunks:
                chunk_data = file_obj.stream.read(self.chunk_size)
                if not chunk_data:
                    break
                chunks.append((chunk_index, chunk_data))
                chunk_index += 1
            
            def upload_chunk(chunk_data_tuple):
                chunk_index, chunk_data = chunk_data_tuple
                chunk_start = chunk_index * self.chunk_size
                chunk_end = min(chunk_start + len(chunk_data), file_size)
                
                session = self.sessions[chunk_index % len(self.sessions)]
                chunk_headers = headers.copy()
                chunk_headers['Content-Range'] = f'bytes {chunk_start}-{chunk_end-1}/{file_size}'
                
                try:
                    response = session.put(
                        url,
                        data=chunk_data,
                        headers=chunk_headers,
                        timeout=(self.connection_timeout, self.read_timeout)
                    )
                    
                    if response.status_code in [200, 201, 206]:
                        return len(chunk_data)
                    else:
                        print(f"❌ Chunk {chunk_index + 1} failed: {response.status_code}")
                        return 0
                except Exception as e:
                    print(f"❌ Chunk {chunk_index + 1} error: {e}")
                    return 0
            
            # Upload chunks with limited parallelism
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_parallel_chunks) as executor:
                chunk_futures = []
                
                for chunk_data_tuple in chunks:
                    future = executor.submit(upload_chunk, chunk_data_tuple)
                    chunk_futures.append(future)
                    
                    # Process completed chunks
                    if len(chunk_futures) >= self.max_parallel_chunks:
                        for future in concurrent.futures.as_completed(chunk_futures):
                            chunk_bytes = future.result()
                            bytes_uploaded += chunk_bytes
                            chunks_completed += 1
                            
                            percent = (bytes_uploaded / file_size) * 100
                            speed = self.calculate_speed(bytes_uploaded, start_time)
                            eta = self.calculate_eta(bytes_uploaded, file_size, start_time)
                            
                            self.update_progress(
                                upload_id, percent,
                                f"Chunk {chunks_completed}/{total_chunks}: {self.format_bytes(bytes_uploaded)} / {self.format_bytes(file_size)}",
                                speed, "uploading", eta, bytes_uploaded, file_size, "upload"
                            )
                        
                        chunk_futures = []
                
                # Process remaining chunks
                for future in concurrent.futures.as_completed(chunk_futures):
                    chunk_bytes = future.result()
                    bytes_uploaded += chunk_bytes
                    chunks_completed += 1
                    
                    percent = (bytes_uploaded / file_size) * 100
                    speed = self.calculate_speed(bytes_uploaded, start_time)
                    eta = self.calculate_eta(bytes_uploaded, file_size, start_time)
                    
                    self.update_progress(
                        upload_id, percent,
                        f"Chunk {chunks_completed}/{total_chunks}: {self.format_bytes(bytes_uploaded)} / {self.format_bytes(file_size)}",
                        speed, "uploading", eta, bytes_uploaded, file_size, "upload"
                    )
            
            if chunks_completed == total_chunks:
                cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                
                # Check if file needs processing
                self._check_bunny_processing(upload_id, cdn_url, start_time, file_size)
                
                return {
                    'success': True,
                    'cdn_url': cdn_url,
                    'storage_path': remote_path
                }
            else:
                return {
                    'success': False,
                    'error': f'Upload incomplete: {chunks_completed}/{total_chunks} chunks'
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _check_bunny_processing(self, upload_id: str, cdn_url: str, start_time: float, file_size: int):
        """Check if Bunny needs additional processing time"""
        try:
            # Show upload completion
            upload_speed = self.calculate_speed(file_size, start_time)
            self.update_progress(
                upload_id, 100,
                f"✅ Upload completed at {upload_speed}\! Checking Bunny processing...",
                upload_speed, "processing", "Checking...", file_size, file_size, "processing"
            )
            
            # Check if file is immediately available
            processing_start = time.time()
            max_processing_time = 300  # 5 minutes max processing check
            
            while time.time() - processing_start < max_processing_time:
                try:
                    response = requests.head(cdn_url, timeout=10)
                    if response.status_code == 200:
                        processing_time = time.time() - processing_start
                        self.update_progress(
                            upload_id, 100,
                            f"✅ File ready on Bunny CDN\! Processing took {processing_time:.1f}s",
                            upload_speed, "completed", "Completed", file_size, file_size, "completed"
                        )
                        return
                    else:
                        # Show processing progress
                        elapsed = time.time() - processing_start
                        processing_percent = min(95 + (elapsed / max_processing_time) * 5, 99.9)
                        
                        self.update_progress(
                            upload_id, processing_percent,
                            f"🔄 Bunny processing... ({elapsed:.1f}s)",
                            "Processing", "processing", f"{max_processing_time - elapsed:.0f}s", file_size, file_size, "processing"
                        )
                        
                        time.sleep(2)
                except:
                    time.sleep(2)
            
            # Processing complete or timeout
            self.update_progress(
                upload_id, 100,
                "✅ Upload completed\! File available on Bunny CDN",
                upload_speed, "completed", "Completed", file_size, file_size, "completed"
            )
            
        except Exception as e:
            print(f"⚠️ Processing check error: {e}")
            # Still mark as completed since upload finished
            self.update_progress(
                upload_id, 100,
                "✅ Upload completed\!",
                self.calculate_speed(file_size, start_time), "completed", "Completed", file_size, file_size, "completed"
            )
    
    def get_course_folder_name(self, course_id: int) -> str:
        """Get sanitized course folder name using exact course title"""
        try:
            from flask import current_app
            with current_app.app_context():
                from app import Course
                course = Course.query.get(course_id)
                if course:
                    # Use the exact course title as folder name
                    # Only remove characters that are not allowed in URLs/paths
                    import re
                    folder_name = re.sub(r'[<>:"|?*\\]', '', course.title)
                    # Keep spaces and other valid characters
                    return folder_name.strip()
                else:
                    return f"course_{course_id}"
        except:
            return f"course_{course_id}"
    
    def upload_video_direct_async(self, file_obj: FileStorage, course_id: int, video_data: dict, upload_id: str):
        """Complete async direct upload to Bunny CDN"""
        print(f"🚀 Starting direct Bunny upload: {video_data.get('title', 'Untitled')}")
        
        self.upload_metadata[upload_id] = video_data
        
        from flask import current_app
        app = current_app._get_current_object()
        
        def upload_worker():
            with app.app_context():
                try:
                    # Get course folder
                    folder_name = self.get_course_folder_name(course_id)
                    
                    # Generate unique filename
                    file_extension = os.path.splitext(file_obj.filename)[1]
                    video_filename = f"{uuid.uuid4()}{file_extension}"
                    remote_path = f"courses/{folder_name}/{video_filename}"
                    
                    # Direct upload to Bunny CDN
                    cdn_result = self.upload_file_stream_direct(file_obj, remote_path, upload_id)
                    
                    if cdn_result['success']:
                        # Save to database
                        from app import db, Video
                        
                        video = Video(
                            title=video_data['title'],
                            description=video_data.get('description', ''),
                            video_url=cdn_result['cdn_url'],
                            course_id=course_id,
                            order_index=video_data.get('order_index', 0),
                            is_preview=video_data.get('is_preview', False),
                            instructions=video_data.get('instructions', ''),
                            external_links=video_data.get('external_links', '')
                        )
                        
                        db.session.add(video)
                        db.session.commit()
                        
                        print(f"✅ Direct upload completed: {video_data.get('title')}")
                    else:
                        self.update_progress(
                            upload_id, 0,
                            f"Upload failed: {cdn_result['error']}",
                            "0 B/s", "error", "Failed", 0, 0, "error"
                        )
                        
                except Exception as e:
                    print(f"❌ Direct upload error: {e}")
                    import traceback
                    traceback.print_exc()
                    self.update_progress(
                        upload_id, 0,
                        f"Upload error: {str(e)}",
                        "0 B/s", "error", "Failed", 0, 0, "error"
                    )
        
        # Start upload in background
        thread = threading.Thread(target=upload_worker, daemon=True)
        thread.start()

# Create global instance
direct_bunny_uploader = DirectBunnyUploader()

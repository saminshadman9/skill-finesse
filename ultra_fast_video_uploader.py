"""
Ultra-Fast Video Upload System with Parallel Chunk Processing
Optimized for maximum speed with no file size limits
"""

import os
import time
import requests
import threading
from typing import Dict, Optional, List
import uuid
import tempfile
import concurrent.futures
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import hashlib
from collections import defaultdict
import queue

class UltraFastVideoUploader:
    def __init__(self):
        # Bunny.net configuration
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.api_key = '08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # Ultra-fast performance settings
        self.chunk_size = 64 * 1024 * 1024  # 64MB chunks for maximum speed
        self.max_parallel_chunks = 8  # Upload 8 chunks simultaneously
        self.max_workers = 16  # Thread pool size
        self.connection_pool_size = 32  # Large connection pool
        self.connection_timeout = 30
        self.read_timeout = 3600  # 1 hour for very large files
        
        # Progress tracking
        self.progress_data = {}
        self.upload_metadata = {}
        self.chunk_progress = defaultdict(dict)
        
        # Create optimized session pool
        self.sessions = self._create_session_pool()
        
    def _create_session_pool(self) -> List[requests.Session]:
        """Create a pool of optimized sessions for parallel uploads"""
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
                pool_connections=self.connection_pool_size,
                pool_maxsize=self.connection_pool_size,
                pool_block=False
            )
            
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            
            # Optimize socket options for speed
            session.stream = False
            session.verify = True
            session.trust_env = False
            
            sessions.append(session)
            
        return sessions
        
    def update_progress(self, upload_id: str, percent: float, message: str, speed: str = "", 
                       status: str = "uploading", eta: str = "", bytes_uploaded: int = 0, 
                       total_bytes: int = 0, stage: str = "server"):
        """Update upload progress with stage information"""
        self.progress_data[upload_id] = {
            'status': status,
            'percent': round(percent, 1),
            'message': message,
            'speed': speed,
            'eta': eta,
            'bytes_uploaded': bytes_uploaded,
            'total_bytes': total_bytes,
            'timestamp': time.time(),
            'stage': stage  # 'server' or 'cdn'
        }
        print(f"📊 [{stage.upper()}] Progress: {upload_id} - {percent:.1f}% - {speed} - ETA: {eta} - {message}")
    
    def get_progress(self, upload_id: str) -> Optional[Dict]:
        """Get current progress for upload"""
        return self.progress_data.get(upload_id)
    
    def calculate_speed(self, bytes_uploaded: int, start_time: float) -> str:
        """Calculate upload speed in human readable format"""
        elapsed = time.time() - start_time
        if elapsed > 0:
            speed_bps = bytes_uploaded / elapsed
            if speed_bps >= 1024 * 1024 * 1024:  # GB/s
                return f"{speed_bps / (1024 * 1024 * 1024):.1f} GB/s"
            elif speed_bps >= 1024 * 1024:  # MB/s
                return f"{speed_bps / (1024 * 1024):.1f} MB/s"
            elif speed_bps >= 1024:  # KB/s
                return f"{speed_bps / 1024:.1f} KB/s"
            else:
                return f"{speed_bps:.1f} B/s"
        return "0 B/s"
    
    def calculate_eta(self, bytes_uploaded: int, total_bytes: int, start_time: float) -> str:
        """Calculate estimated time of arrival"""
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
        """Format bytes in human readable format"""
        if bytes_count >= 1024 * 1024 * 1024 * 1024:  # TB
            return f"{bytes_count / (1024 * 1024 * 1024 * 1024):.2f} TB"
        elif bytes_count >= 1024 * 1024 * 1024:  # GB
            return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"
        elif bytes_count >= 1024 * 1024:  # MB
            return f"{bytes_count / (1024 * 1024):.2f} MB"
        elif bytes_count >= 1024:  # KB
            return f"{bytes_count / 1024:.2f} KB"
        else:
            return f"{bytes_count} B"
    
    def upload_chunk_parallel(self, chunk_data: bytes, chunk_index: int, total_chunks: int, 
                            remote_path: str, file_size: int, upload_id: str, 
                            session_index: int, progress_queue: queue.Queue) -> bool:
        """Upload a single chunk using parallel processing"""
        chunk_start = chunk_index * self.chunk_size
        chunk_end = min(chunk_start + len(chunk_data), file_size)
        
        try:
            session = self.sessions[session_index % len(self.sessions)]
            
            url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            headers = {
                'AccessKey': self.storage_password,
                'Content-Type': 'application/octet-stream',
                'Content-Range': f'bytes {chunk_start}-{chunk_end-1}/{file_size}'
            }
            
            # Ultra-fast upload with optimized settings
            response = session.put(
                url, 
                data=chunk_data, 
                headers=headers,
                timeout=(self.connection_timeout, self.read_timeout),
                stream=False  # Don't stream for better performance
            )
            
            if response.status_code in [200, 201, 206]:
                # Report chunk completion
                progress_queue.put({
                    'chunk_index': chunk_index,
                    'bytes': len(chunk_data),
                    'success': True
                })
                return True
            else:
                print(f"❌ Chunk {chunk_index + 1}/{total_chunks} failed: HTTP {response.status_code}")
                progress_queue.put({
                    'chunk_index': chunk_index,
                    'bytes': 0,
                    'success': False
                })
                return False
                
        except Exception as e:
            print(f"❌ Chunk {chunk_index + 1}/{total_chunks} error: {e}")
            progress_queue.put({
                'chunk_index': chunk_index,
                'bytes': 0,
                'success': False
            })
            return False
    
    def upload_file_parallel_ultra_fast(self, file_path: str, remote_path: str, upload_id: str, stage: str = "cdn") -> dict:
        """Ultra-fast parallel chunk upload to Bunny CDN"""
        print(f"🚀 Starting ULTRA-FAST parallel upload: {remote_path}")
        start_time = time.time()
        
        try:
            file_size = os.path.getsize(file_path)
            total_chunks = (file_size + self.chunk_size - 1) // self.chunk_size
            
            print(f"📊 File: {self.format_bytes(file_size)}, Chunks: {total_chunks}, Parallel: {self.max_parallel_chunks}")
            
            # Initialize progress tracking
            bytes_uploaded = 0
            progress_queue = queue.Queue()
            chunks_completed = 0
            
            # Progress monitoring thread
            def monitor_progress():
                nonlocal bytes_uploaded, chunks_completed
                while chunks_completed < total_chunks:
                    try:
                        progress_update = progress_queue.get(timeout=0.1)
                        if progress_update['success']:
                            bytes_uploaded += progress_update['bytes']
                            chunks_completed += 1
                            
                            percent = (bytes_uploaded / file_size) * 100
                            speed = self.calculate_speed(bytes_uploaded, start_time)
                            eta = self.calculate_eta(bytes_uploaded, file_size, start_time)
                            
                            self.update_progress(
                                upload_id, percent,
                                f"Ultra-fast {stage.upper()} upload - Chunk {chunks_completed}/{total_chunks}",
                                speed, "uploading", eta, bytes_uploaded, file_size, stage
                            )
                    except queue.Empty:
                        pass
                    except Exception as e:
                        print(f"Progress monitor error: {e}")
            
            # Start progress monitor
            monitor_thread = threading.Thread(target=monitor_progress, daemon=True)
            monitor_thread.start()
            
            # Read and upload chunks in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_parallel_chunks) as executor:
                futures = []
                
                with open(file_path, 'rb') as f:
                    for chunk_index in range(total_chunks):
                        # Read chunk
                        chunk_data = f.read(self.chunk_size)
                        
                        # Submit chunk upload
                        future = executor.submit(
                            self.upload_chunk_parallel,
                            chunk_data, chunk_index, total_chunks,
                            remote_path, file_size, upload_id,
                            chunk_index, progress_queue
                        )
                        futures.append(future)
                        
                        # Limit concurrent uploads
                        if len(futures) >= self.max_parallel_chunks:
                            # Wait for some to complete
                            concurrent.futures.wait(futures, return_when=concurrent.futures.FIRST_COMPLETED)
                            # Remove completed futures
                            futures = [f for f in futures if not f.done()]
                
                # Wait for all remaining uploads
                concurrent.futures.wait(futures)
            
            # Wait for progress monitor to finish
            monitor_thread.join(timeout=5)
            
            # Check if all chunks uploaded successfully
            upload_duration = time.time() - start_time
            average_speed = self.calculate_speed(file_size, start_time)
            
            if chunks_completed == total_chunks:
                print(f"✅ Ultra-fast upload completed in {upload_duration:.1f}s at {average_speed}")
                
                cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                
                self.update_progress(
                    upload_id, 100,
                    f"✅ {stage.upper()} upload completed at {average_speed}\!",
                    average_speed, "completed", "Completed", file_size, file_size, stage
                )
                
                return {
                    'success': True,
                    'cdn_url': cdn_url,
                    'storage_path': remote_path,
                    'upload_speed': average_speed,
                    'duration': upload_duration
                }
            else:
                print(f"❌ Upload incomplete: {chunks_completed}/{total_chunks} chunks")
                return {
                    'success': False,
                    'error': f'Only {chunks_completed}/{total_chunks} chunks uploaded'
                }
                
        except Exception as e:
            print(f"❌ Ultra-fast upload error: {e}")
            import traceback
            traceback.print_exc()
            self.update_progress(
                upload_id, 0,
                f"Upload error: {str(e)}",
                "0 B/s", "error", "Failed", 0, file_size, stage
            )
            return {
                'success': False,
                'error': str(e)
            }
    
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
    
    def save_video_to_database(self, upload_id: str, course_id: int, video_data: dict, cdn_url: str, storage_path: str) -> dict:
        """Save video to database"""
        try:
            from flask import current_app
            from app import db, Video
            
            video = Video(
                title=video_data['title'],
                description=video_data.get('description', ''),
                video_url=cdn_url,
                course_id=course_id,
                order_index=video_data.get('order_index', 0),
                is_preview=video_data.get('is_preview', False),
                instructions=video_data.get('instructions', ''),
                external_links=video_data.get('external_links', '')
            )
            
            db.session.add(video)
            db.session.commit()
            
            return {'success': True, 'video_id': video.id}
            
        except Exception as e:
            print(f"❌ Database error: {e}")
            return {'success': False, 'error': str(e)}
    
    def upload_video_async_ultra_fast(self, file_path: str, course_id: int, video_data: dict, upload_id: str):
        """Complete async video upload process with ultra-fast parallel processing"""
        print(f"🚀🚀 Starting ULTRA-FAST video upload: {video_data.get('title', 'Untitled')}")
        
        # Store metadata
        self.upload_metadata[upload_id] = video_data
        
        from flask import current_app
        app = current_app._get_current_object()
        
        def upload_worker():
            with app.app_context():
                try:
                    start_time = time.time()
                    file_size = os.path.getsize(file_path)
                    
                    # Phase 1: Server upload tracking (already completed when this is called)
                    self.update_progress(
                        upload_id, 100, 
                        f"✅ Server upload completed\! Starting CDN upload...", 
                        "0 B/s", "preparing", "Starting CDN", file_size, file_size, "server"
                    )
                    
                    time.sleep(1)  # Brief pause to show server completion
                    
                    # Phase 2: CDN upload with ultra-fast parallel processing
                    self.update_progress(
                        upload_id, 0, 
                        f"🚀 Starting ultra-fast CDN upload ({self.format_bytes(file_size)})...", 
                        "0 B/s", "uploading", "Calculating...", 0, file_size, "cdn"
                    )
                    
                    # Get course folder
                    folder_name = self.get_course_folder_name(course_id)
                    
                    # Generate unique filename
                    file_extension = os.path.splitext(file_path)[1]
                    video_filename = f"{uuid.uuid4()}{file_extension}"
                    remote_path = f"courses/{folder_name}/{video_filename}"
                    
                    # Ultra-fast parallel upload to CDN
                    cdn_result = self.upload_file_parallel_ultra_fast(file_path, remote_path, upload_id, "cdn")
                    
                    if cdn_result['success']:
                        # Phase 3: Database save
                        self.update_progress(
                            upload_id, 95, 
                            "💾 Saving to database...",
                            "0 B/s", "saving", "Almost done", file_size, file_size, "database"
                        )
                        
                        db_result = self.save_video_to_database(
                            upload_id, course_id, video_data, 
                            cdn_result['cdn_url'], cdn_result['storage_path']
                        )
                        
                        if db_result['success']:
                            total_duration = time.time() - start_time
                            avg_speed = self.calculate_speed(file_size, start_time)
                            
                            self.update_progress(
                                upload_id, 100, 
                                f"✅ Upload completed\! Total time: {total_duration:.1f}s at {avg_speed}",
                                avg_speed, "completed", "Completed", file_size, file_size, "completed"
                            )
                            print(f"✅✅ ULTRA-FAST upload success: {video_data.get('title')}")
                            print(f"📊 Stats: {self.format_bytes(file_size)} in {total_duration:.1f}s = {avg_speed}")
                        else:
                            self.update_progress(
                                upload_id, 95, 
                                f"Database error: {db_result['error']}",
                                "0 B/s", "error", "Failed", file_size, file_size, "error"
                            )
                    else:
                        self.update_progress(
                            upload_id, 50, 
                            f"CDN error: {cdn_result['error']}",
                            "0 B/s", "error", "Failed", 0, file_size, "error"
                        )
                    
                    # Clean up temp file
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"🗑️ Cleaned up temp file: {file_path}")
                    except:
                        pass
                        
                except Exception as e:
                    error_msg = f"Upload error: {str(e)}"
                    print(f"❌ {error_msg}")
                    import traceback
                    traceback.print_exc()
                    self.update_progress(upload_id, 0, error_msg, "", "error", "Failed", 0, 0, "error")
        
        # Start upload in background thread
        thread = threading.Thread(target=upload_worker, daemon=True)
        thread.start()
        print(f"✅ Ultra-fast upload thread started for: {video_data.get('title')}")

# Create global instance
ultra_fast_video_uploader = UltraFastVideoUploader()

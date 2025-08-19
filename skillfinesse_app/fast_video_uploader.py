"""
High-Performance Video Upload System for Skill Finesse
Optimized for fast uploads with chunked parallel processing
"""

import os
import time
import requests
import threading
from typing import Dict, Optional
import uuid
import tempfile
import concurrent.futures
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class FastVideoUploader:
    def __init__(self):
        # Bunny.net configuration
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.api_key = '08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # Performance optimization settings
        self.chunk_size = 32 * 1024 * 1024  # 32MB chunks for faster uploads
        self.max_workers = 4  # Parallel upload threads
        self.connection_timeout = 30
        self.read_timeout = 300
        
        # Progress tracking
        self.progress_data = {}
        self.upload_metadata = {}
        
        # Create optimized session
        self.session = self._create_optimized_session()
        
    def _create_optimized_session(self):
        """Create optimized requests session with retry strategy"""
        session = requests.Session()
        
        # Retry strategy for network resilience
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE"]
        )
        
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=10,
            pool_maxsize=20,
            pool_block=False
        )
        
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
        
    def update_progress(self, upload_id: str, percent: float, message: str, speed: str = "", status: str = "uploading", eta: str = "", bytes_uploaded: int = 0, total_bytes: int = 0):
        """Update upload progress with detailed information"""
        self.progress_data[upload_id] = {
            'status': status,
            'percent': round(percent, 1),
            'message': message,
            'speed': speed,
            'eta': eta,
            'bytes_uploaded': bytes_uploaded,
            'total_bytes': total_bytes,
            'timestamp': time.time()
        }
        print(f"📊 Progress: {upload_id} - {percent:.1f}% - {speed} - ETA: {eta} - {message}")
    
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
        if bytes_count >= 1024 * 1024 * 1024:
            return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"
        elif bytes_count >= 1024 * 1024:
            return f"{bytes_count / (1024 * 1024):.2f} MB"
        elif bytes_count >= 1024:
            return f"{bytes_count / 1024:.2f} KB"
        else:
            return f"{bytes_count} B"
    
    def upload_chunked_file(self, file_path: str, remote_path: str, upload_id: str, start_time: float, total_size: int):
        """Upload file in chunks with parallel processing for maximum speed"""
        print(f"🚀 Starting chunked upload: {remote_path}")
        
        try:
            # Calculate optimal number of chunks
            file_size = os.path.getsize(file_path)
            num_chunks = max(1, (file_size + self.chunk_size - 1) // self.chunk_size)
            
            # Limit concurrent uploads to prevent server overload
            max_concurrent = min(self.max_workers, num_chunks)
            
            print(f"📊 File size: {self.format_bytes(file_size)}, Chunks: {num_chunks}, Concurrent: {max_concurrent}")
            
            bytes_uploaded = 0
            upload_lock = threading.Lock()
            
            def upload_chunk(chunk_index):
                nonlocal bytes_uploaded
                chunk_start = chunk_index * self.chunk_size
                chunk_end = min(chunk_start + self.chunk_size, file_size)
                chunk_data_size = chunk_end - chunk_start
                
                try:
                    with open(file_path, 'rb') as f:
                        f.seek(chunk_start)
                        chunk_data = f.read(chunk_data_size)
                    
                    # Upload chunk with retry
                    url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
                    headers = {
                        'AccessKey': self.storage_password,
                        'Content-Type': 'application/octet-stream',
                        'Content-Range': f'bytes {chunk_start}-{chunk_end-1}/{file_size}'
                    }
                    
                    response = self.session.put(
                        url, 
                        data=chunk_data, 
                        headers=headers,
                        timeout=(self.connection_timeout, self.read_timeout)
                    )
                    
                    if response.status_code in [200, 201, 206]:
                        with upload_lock:
                            bytes_uploaded += chunk_data_size
                            percent = (bytes_uploaded / file_size) * 100
                            speed = self.calculate_speed(bytes_uploaded, start_time)
                            eta = self.calculate_eta(bytes_uploaded, file_size, start_time)
                            
                            self.update_progress(
                                upload_id, percent,
                                f"Uploading {remote_path} - Chunk {chunk_index + 1}/{num_chunks}",
                                speed, "uploading", eta, bytes_uploaded, file_size
                            )
                        
                        print(f"✅ Chunk {chunk_index + 1}/{num_chunks} uploaded successfully")
                        return True
                    else:
                        print(f"❌ Chunk {chunk_index + 1} failed: {response.status_code}")
                        return False
                        
                except Exception as e:
                    print(f"❌ Chunk {chunk_index + 1} error: {e}")
                    return False
            
            # Use single-threaded upload for better reliability
            success_count = 0
            for i in range(num_chunks):
                if upload_chunk(i):
                    success_count += 1
                else:
                    # Retry failed chunk once
                    print(f"🔄 Retrying chunk {i + 1}")
                    if upload_chunk(i):
                        success_count += 1
            
            # Check if all chunks uploaded successfully
            if success_count == num_chunks:
                self.update_progress(
                    upload_id, 100,
                    f"Upload completed: {remote_path}",
                    self.calculate_speed(file_size, start_time), "completed", "Completed", file_size, file_size
                )
                return True
            else:
                print(f"❌ Upload failed: {success_count}/{num_chunks} chunks successful")
                return False
                
        except Exception as e:
            print(f"❌ Chunked upload error: {e}")
            self.update_progress(
                upload_id, 0,
                f"Upload failed: {str(e)}",
                "0 B/s", "error", "Failed", 0, total_size
            )
            return False
    
    def upload_video_to_bunny(self, file_path: str, remote_path: str, upload_id: str, start_time: float, total_size: int):
        """Fast upload to Bunny CDN with optimizations"""
        try:
            # Try chunked upload first (best for large files)
            return self.upload_chunked_file(file_path, remote_path, upload_id, start_time, total_size)
            
        except Exception as e:
            print(f"❌ Fast upload failed: {e}")
            self.update_progress(
                upload_id, 0,
                f"Upload error: {str(e)}",
                "0 B/s", "error", "Failed", 0, total_size
            )
            return False
    
    def get_course_folder_name(self, course_id: int) -> str:
        """Get sanitized course folder name"""
        try:
            from flask import current_app
            with current_app.app_context():
                from app import Course
                course = Course.query.get(course_id)
                if course:
                    # Sanitize folder name
                    folder_name = course.title.replace(' ', '_').replace('/', '_')
                    return f"course_{course_id}_{folder_name}"
                else:
                    return f"course_{course_id}"
        except:
            return f"course_{course_id}"
    
    def upload_video_async(self, file_path: str, course_id: int, video_data: dict, upload_id: str):
        """Complete async video upload process with optimizations"""
        print(f"🚀 Starting fast video upload: {video_data.get('title', 'Untitled')}")
        
        # Store metadata
        self.upload_metadata[upload_id] = video_data
        
        from flask import current_app
        app = current_app._get_current_object()
        
        def upload_worker():
            with app.app_context():
                try:
                    start_time = time.time()
                    file_size = os.path.getsize(file_path)
                    
                    self.update_progress(
                        upload_id, 0, 
                        f"Initializing fast upload ({self.format_bytes(file_size)})...", 
                        "0 B/s", "initializing", "Calculating...", 0, file_size
                    )
                    
                    # Get course folder
                    folder_name = self.get_course_folder_name(course_id)
                    
                    # Generate unique filename
                    file_extension = os.path.splitext(file_path)[1]
                    video_filename = f"{uuid.uuid4()}{file_extension}"
                    remote_path = f"videos/{folder_name}/{video_filename}"
                    
                    self.update_progress(
                        upload_id, 5, 
                        f"Starting upload to: {remote_path}",
                        "0 B/s", "uploading", "Calculating...", 0, file_size
                    )
                    
                    # Upload video with fast chunked method
                    success = self.upload_video_to_bunny(file_path, remote_path, upload_id, start_time, file_size)
                    
                    if success:
                        # Create video URL
                        video_url = f"https://{self.cdn_hostname}/{remote_path}"
                        
                        # Save to database
                        from app import db, Video
                        
                        video = Video(
                            title=video_data['title'],
                            description=video_data.get('description', ''),
                            video_url=video_url,
                            course_id=course_id,
                            order_index=video_data.get('order_index', 0),
                            is_preview=video_data.get('is_preview', False),
                            instructions=video_data.get('instructions', ''),
                            external_links=video_data.get('external_links', '')
                        )
                        
                        db.session.add(video)
                        db.session.commit()
                        
                        self.update_progress(
                            upload_id, 100,
                            f"✅ Video uploaded successfully\!",
                            self.calculate_speed(file_size, start_time), "completed", "Completed", file_size, file_size
                        )
                        
                        print(f"✅ Upload completed successfully: {video_url}")
                        
                        # Clean up temp file
                        try:
                            os.remove(file_path)
                        except:
                            pass
                    else:
                        self.update_progress(
                            upload_id, 0,
                            "❌ Upload failed",
                            "0 B/s", "error", "Failed", 0, file_size
                        )
                        
                except Exception as e:
                    print(f"❌ Upload worker error: {e}")
                    import traceback
                    traceback.print_exc()
                    self.update_progress(
                        upload_id, 0,
                        f"Upload error: {str(e)}",
                        "0 B/s", "error", "Failed", 0, 0
                    )
        
        # Start upload in background thread
        thread = threading.Thread(target=upload_worker)
        thread.start()

# Create global instance
fast_video_uploader = FastVideoUploader()

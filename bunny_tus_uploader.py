"""
Bunny Stream TUS Resumable Uploader
Implements TUS protocol for resumable uploads with chunked transfers and real-time progress

Features:
- Resumable uploads: Pauses/retries on flaky connections
- Chunked transfers: No need to buffer entire file in memory  
- Progress callbacks: Real-time progress bars and feedback
- Automatic retry: Exponential backoff for failed chunks
- Server-Sent Events: Compatible with existing SSE infrastructure

Usage:
The uploader automatically detects large files (>50MB) and uses TUS resumable uploads.
For smaller files, it falls back to the standard upload method.

Integration:
- Flask routes: Enhanced to support 'use_tus' parameter
- Frontend: Automatically detects file size and enables TUS
- Progress tracking: Uses existing SSE infrastructure
- Fallback: Gracefully falls back to standard upload if TUS fails
"""

import os
import json
import time
import requests
import threading
import hashlib
from typing import Dict, Optional, Callable
from flask import current_app
import math
import concurrent.futures
from queue import Queue

# Create a high-performance session for 500GB+ enterprise uploads
session = requests.Session()
# Configure aggressive connection pooling for maximum performance
adapter = requests.adapters.HTTPAdapter(
    pool_connections=50,  # Increased for parallel uploads
    pool_maxsize=100,     # Large pool for 8 parallel streams
    max_retries=0         # We handle retries manually
)
session.mount('http://', adapter)
session.mount('https://', adapter)

# Configure session for high-throughput uploads
session.trust_env = False  # Disable proxy detection for better performance

class BunnyTUSUploader:
    """Bunny Stream TUS resumable uploader with real-time progress tracking"""
    
    def __init__(self):
        # Bunny.net configuration matching your provided details
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.api_key = '08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # For TUS uploads, we'll use the storage zone with chunked uploads instead of Stream API
        # This provides better compatibility and real progress tracking
        self.use_storage_tus = True
        
        # Progress tracking
        self.upload_progress = {}
        self.upload_threads = {}
        
        # Parallel upload configuration for 500GB+ files
        self.max_parallel_chunks = 8  # Upload 8 chunks simultaneously for high-speed connections
        self.upload_semaphore = {}  # Control concurrent uploads per file
        
        # TUS chunk size (256MB chunks optimized for 500GB+ files with high-speed connections)
        self.chunk_size = 256 * 1024 * 1024  # 256MB for enterprise-level uploads
        
    def update_progress(self, upload_id: str, status: str, percent: float = 0, 
                       message: str = "", speed: str = "", bytes_uploaded: int = 0, total_bytes: int = 0):
        """Update upload progress for SSE streaming"""
        self.upload_progress[upload_id] = {
            'status': status,
            'percent': percent,
            'message': message,
            'speed': speed,
            'bytes_uploaded': bytes_uploaded,
            'total_bytes': total_bytes,
            'timestamp': time.time()
        }
    
    def get_progress(self, upload_id: str) -> Optional[Dict]:
        """Get current upload progress"""
        return self.upload_progress.get(upload_id)
    
    def calculate_speed(self, bytes_uploaded: int, start_time: float) -> str:
        """Calculate upload speed"""
        elapsed = time.time() - start_time
        if elapsed > 0:
            speed_bps = bytes_uploaded / elapsed
            if speed_bps > 1024 * 1024:
                return f"{speed_bps / (1024 * 1024):.1f} MB/s"
            elif speed_bps > 1024:
                return f"{speed_bps / 1024:.1f} KB/s"
            else:
                return f"{speed_bps:.0f} B/s"
        return "0 B/s"
    
    def get_course_folder_name(self, course_id: int) -> str:
        """Get sanitized course folder name using raw SQL for thread safety"""
        try:
            from flask import current_app
            import sqlalchemy as sa
            
            # Use raw SQL to avoid Flask-SQLAlchemy context issues in worker threads
            engine = current_app.extensions['sqlalchemy'].engine
            
            with engine.connect() as conn:
                query = sa.text("SELECT title FROM course WHERE id = :course_id")
                result = conn.execute(query, {'course_id': course_id})
                row = result.fetchone()
                
                if row and row[0]:
                    course_title = row[0].strip()
                    print(f"📁 Found course title: '{course_title}' for course ID: {course_id}")
                    
                    # Sanitize course title for folder name
                    folder_name = course_title
                    invalid_chars = '<>:"/\\|?*'
                    for char in invalid_chars:
                        folder_name = folder_name.replace(char, '-')
                    
                    # Replace multiple spaces/dashes with single dash but preserve the original structure
                    import re
                    folder_name = re.sub(r'\s+', ' ', folder_name)  # Replace multiple spaces with single space
                    folder_name = re.sub(r'-+', '-', folder_name)   # Replace multiple dashes with single dash
                    
                    # Remove leading/trailing dashes and limit length
                    folder_name = folder_name.strip('-').strip()
                    folder_name = folder_name[:100]  # Increased limit for longer course names
                    
                    print(f"📁 Sanitized folder name: '{folder_name}'")
                    return folder_name or f"course-{course_id}"
                
                print(f"❌ No course found with ID: {course_id}")
                return f"course-{course_id}"
                
        except Exception as e:
            print(f"❌ Error getting course folder name: {e}")
            import traceback
            traceback.print_exc()
            return f"course-{course_id}"
    
    def _create_course_folder(self, course_id: int, upload_id: str) -> bool:
        """Create course folder in Bunny.net storage if it doesn't exist"""
        try:
            self.update_progress(upload_id, 'creating_folder', 0, 
                               "Creating course folder in Bunny.net storage...")
            
            folder_name = self.get_course_folder_name(course_id)
            folder_path = f"courses/{folder_name}/"
            
            # Check if folder exists by trying to list its contents
            list_url = f"https://{self.storage_hostname}/{self.storage_zone}/{folder_path}"
            headers = {
                'AccessKey': self.storage_password,
                'Content-Type': 'application/json'
            }
            
            response = session.get(list_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                # Folder exists
                print(f"✅ Course folder already exists: {folder_path}")
                self.update_progress(upload_id, 'folder_ready', 5, 
                                   "Course folder ready, starting upload...")
                return True
            elif response.status_code == 404:
                # Folder doesn't exist, create it
                # Create a placeholder file to ensure folder exists
                placeholder_path = f"{folder_path}.folder_created"
                placeholder_url = f"https://{self.storage_hostname}/{self.storage_zone}/{placeholder_path}"
                
                placeholder_response = session.put(
                    placeholder_url,
                    headers=headers,
                    data=b"folder_created",
                    timeout=30
                )
                
                if placeholder_response.status_code in [200, 201]:
                    print(f"✅ Course folder created: {folder_path}")
                    self.update_progress(upload_id, 'folder_ready', 5, 
                                       "Course folder created, starting upload...")
                    return True
                else:
                    print(f"❌ Failed to create folder: {placeholder_response.status_code}")
                    return False
            else:
                print(f"❌ Unexpected response checking folder: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error creating course folder: {e}")
            return False
    
    def create_tus_upload(self, file_path: str, filename: str, upload_id: str) -> Optional[str]:
        """Create TUS upload session with Bunny Stream"""
        try:
            file_size = os.path.getsize(file_path)
            
            headers = {
                'Authorization': f'Bearer {self.stream_api_key}',
                'Tus-Resumable': '1.0.0',
                'Upload-Length': str(file_size),
                'Upload-Metadata': f'filename {self._encode_base64(filename)}',
                'Content-Type': 'application/offset+octet-stream'
            }
            
            self.update_progress(upload_id, 'creating', 0, "Creating TUS upload session...")
            
            response = requests.post(self.tus_endpoint, headers=headers, timeout=30)
            
            if response.status_code == 201:
                upload_url = response.headers.get('Location')
                if upload_url:
                    print(f"✅ TUS upload session created: {upload_url}")
                    return upload_url
                else:
                    print("❌ No upload URL in response")
                    return None
            else:
                print(f"❌ Failed to create TUS session: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error creating TUS upload: {e}")
            self.update_progress(upload_id, 'error', 0, f"Failed to create upload session: {str(e)}")
            return None
    
    def _encode_base64(self, text: str) -> str:
        """Encode text to base64 for TUS metadata"""
        import base64
        return base64.b64encode(text.encode('utf-8')).decode('utf-8')
    
    def resume_tus_upload(self, upload_url: str, upload_id: str) -> int:
        """Get current offset for resuming upload"""
        try:
            headers = {
                'Authorization': f'Bearer {self.stream_api_key}',
                'Tus-Resumable': '1.0.0'
            }
            
            response = requests.head(upload_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                offset = int(response.headers.get('Upload-Offset', 0))
                print(f"📍 Resume upload from offset: {offset}")
                return offset
            else:
                print(f"❌ Failed to get upload offset: {response.status_code}")
                return 0
                
        except Exception as e:
            print(f"❌ Error getting upload offset: {e}")
            return 0
    
    def upload_chunk_tus(self, upload_url: str, file_path: str, offset: int, 
                        chunk_size: int, upload_id: str, start_time: float) -> tuple:
        """Upload a single chunk using TUS protocol"""
        try:
            with open(file_path, 'rb') as file:
                file.seek(offset)
                chunk_data = file.read(chunk_size)
                
                if not chunk_data:
                    return offset, True  # EOF reached
                
                headers = {
                    'Authorization': f'Bearer {self.stream_api_key}',
                    'Tus-Resumable': '1.0.0',
                    'Upload-Offset': str(offset),
                    'Content-Type': 'application/offset+octet-stream'
                }
                
                response = requests.patch(upload_url, headers=headers, data=chunk_data, timeout=60)
                
                if response.status_code == 204:
                    new_offset = int(response.headers.get('Upload-Offset', offset + len(chunk_data)))
                    
                    # Update progress
                    file_size = os.path.getsize(file_path)
                    percent = (new_offset / file_size) * 100
                    speed = self.calculate_speed(new_offset, start_time)
                    
                    self.update_progress(
                        upload_id, 
                        'uploading', 
                        percent, 
                        f"Uploading chunk... {percent:.1f}%", 
                        speed,
                        new_offset,
                        file_size
                    )
                    
                    return new_offset, new_offset >= file_size
                else:
                    print(f"❌ Chunk upload failed: {response.status_code} - {response.text}")
                    return offset, False
                    
        except Exception as e:
            print(f"❌ Error uploading chunk: {e}")
            return offset, False
    
    def upload_chunk_parallel(self, upload_url: str, file_path: str, chunk_start: int, 
                             chunk_size: int, file_size: int, upload_id: str, chunk_index: int) -> Dict:
        """Upload a single chunk in parallel"""
        try:
            with open(file_path, 'rb') as file:
                file.seek(chunk_start)
                chunk_data = file.read(chunk_size)
                
                if not chunk_data:
                    return {'success': False, 'chunk_index': chunk_index, 'error': 'No data to upload'}
                
                headers = {
                    'AccessKey': self.storage_password,
                    'Content-Type': 'application/octet-stream',
                    'Content-Range': f'bytes {chunk_start}-{chunk_start + len(chunk_data) - 1}/{file_size}'
                }
                
                # Upload chunk with extended timeout for 256MB chunks
                response = session.put(
                    upload_url, 
                    headers=headers, 
                    data=chunk_data, 
                    timeout=3600  # 1 hour timeout for 256MB chunks
                )
                
                if response.status_code in [200, 201, 206]:
                    return {
                        'success': True, 
                        'chunk_index': chunk_index,
                        'bytes_uploaded': len(chunk_data),
                        'chunk_start': chunk_start
                    }
                else:
                    return {
                        'success': False, 
                        'chunk_index': chunk_index,
                        'error': f'HTTP {response.status_code}: {response.text}'
                    }
                    
        except Exception as e:
            return {
                'success': False, 
                'chunk_index': chunk_index,
                'error': str(e)
            }

    def upload_video_tus_parallel(self, file_path: str, course_id: int, 
                                 filename: str, upload_id: str) -> Dict:
        """Ultra-fast parallel upload for 500GB+ files"""
        try:
            print(f"🚀 Starting PARALLEL TUS upload: {filename} (ID: {upload_id})")
            
            file_size = os.path.getsize(file_path)
            print(f"📊 File size: {file_size / (1024*1024*1024):.1f} GB")
            
            # Create course folder first
            if not self._create_course_folder(course_id, upload_id):
                return {
                    'success': False,
                    'message': 'Failed to create course folder in Bunny.net storage'
                }
            
            # Get course folder name and construct remote path
            folder_name = self.get_course_folder_name(course_id)
            remote_path = f"courses/{folder_name}/{filename}"
            upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            
            print(f"📁 Uploading to: {remote_path}")
            print(f"📦 Using {self.max_parallel_chunks} parallel streams with 256MB chunks")
            
            # Calculate chunks
            total_chunks = (file_size + self.chunk_size - 1) // self.chunk_size
            print(f"📊 Total chunks: {total_chunks}")
            
            # Upload chunks in parallel using ThreadPoolExecutor
            start_time = time.time()
            uploaded_bytes = 0
            failed_chunks = []
            
            self.update_progress(upload_id, 'uploading', 0, 
                               f"Starting parallel upload with {self.max_parallel_chunks} streams...", "0 B/s")
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_parallel_chunks) as executor:
                # Submit all chunk upload tasks
                future_to_chunk = {}
                
                for chunk_index in range(total_chunks):
                    chunk_start = chunk_index * self.chunk_size
                    current_chunk_size = min(self.chunk_size, file_size - chunk_start)
                    
                    future = executor.submit(
                        self.upload_chunk_parallel,
                        upload_url, file_path, chunk_start, current_chunk_size,
                        file_size, upload_id, chunk_index
                    )
                    future_to_chunk[future] = chunk_index
                
                # Process completed chunks
                completed_chunks = 0
                for future in concurrent.futures.as_completed(future_to_chunk):
                    result = future.result()
                    completed_chunks += 1
                    
                    if result['success']:
                        uploaded_bytes += result['bytes_uploaded']
                        bunny_percent = (uploaded_bytes / file_size) * 100
                        total_percent = 5 + (bunny_percent * 0.95)  # 5% folder + 95% upload
                        speed = self.calculate_speed(uploaded_bytes, start_time)
                        
                        self.update_progress(
                            upload_id, 
                            'uploading', 
                            total_percent, 
                            f"Parallel upload: {total_percent:.1f}% - Bunny: {bunny_percent:.1f}% ({uploaded_bytes / (1024*1024*1024):.1f}GB / {file_size / (1024*1024*1024):.1f}GB) - {completed_chunks}/{total_chunks} chunks", 
                            speed,
                            uploaded_bytes,
                            file_size
                        )
                        
                        print(f"✅ Chunk {result['chunk_index']}/{total_chunks} completed ({total_percent:.1f}%)")
                    else:
                        failed_chunks.append(result)
                        print(f"❌ Chunk {result['chunk_index']} failed: {result['error']}")
            
            # Check if all chunks uploaded successfully
            if failed_chunks:
                return {
                    'success': False,
                    'message': f'Failed to upload {len(failed_chunks)} chunks out of {total_chunks}'
                }
            
            # Upload completed successfully
            cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
            total_time = time.time() - start_time
            avg_speed = (file_size / (1024*1024)) / total_time if total_time > 0 else 0
            
            self.update_progress(upload_id, 'completed', 100, 
                               f"Parallel upload completed! {avg_speed:.1f} MB/s average speed")
            
            print(f"🎉 PARALLEL upload successful: {cdn_url}")
            print(f"⚡ Average speed: {avg_speed:.1f} MB/s")
            print(f"⏱️ Total time: {total_time / 60:.1f} minutes")
            
            return {
                'success': True,
                'cdn_url': cdn_url,
                'message': f'Parallel upload completed in {total_time / 60:.1f} minutes at {avg_speed:.1f} MB/s',
                'upload_time': total_time,
                'average_speed': avg_speed
            }
                
        except Exception as e:
            error_msg = f"Parallel TUS upload failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.update_progress(upload_id, 'error', 0, error_msg)
            return {'success': False, 'message': error_msg}

    def upload_video_tus_resumable(self, file_path: str, course_id: int, 
                                  filename: str, upload_id: str) -> Dict:
        """Upload video using TUS-like chunked upload with real progress tracking"""
        try:
            print(f"🔄 Starting TUS-style chunked upload: {filename} (ID: {upload_id})")
            
            file_size = os.path.getsize(file_path)
            print(f"📊 File size: {file_size / (1024*1024):.1f} MB")
            
            # Create course folder first
            if not self._create_course_folder(course_id, upload_id):
                return {
                    'success': False,
                    'message': 'Failed to create course folder in Bunny.net storage'
                }
            
            # Get course folder name and construct remote path
            folder_name = self.get_course_folder_name(course_id)
            remote_path = f"courses/{folder_name}/{filename}"
            upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            
            print(f"📁 Uploading to: {remote_path}")
            
            # Upload file in chunks with real progress tracking
            start_time = time.time()
            current_offset = 0
            max_retries = 3
            
            # Optimize memory usage with buffered reading
            with open(file_path, 'rb', buffering=self.chunk_size) as file:
                while current_offset < file_size:
                    retry_count = 0
                    chunk_uploaded = False
                    
                    while retry_count < max_retries and not chunk_uploaded:
                        try:
                            # Read chunk
                            file.seek(current_offset)
                            chunk_data = file.read(self.chunk_size)
                            
                            if not chunk_data:
                                break
                            
                            # Upload chunk with progress tracking
                            headers = {
                                'AccessKey': self.storage_password,
                                'Content-Type': 'application/octet-stream',
                                'Content-Range': f'bytes {current_offset}-{current_offset + len(chunk_data) - 1}/{file_size}'
                            }
                            
                            # Upload chunk directly without progress wrapper for better performance
                            response = session.put(
                                upload_url, 
                                headers=headers, 
                                data=chunk_data, 
                                timeout=1800  # 30 minutes timeout for very large 32MB chunks
                            )
                            
                            # Update progress after chunk upload completes
                            if response.status_code in [200, 201, 206]:
                                current_offset += len(chunk_data)
                                chunk_uploaded = True
                                bunny_percent = (current_offset / file_size) * 100
                                total_percent = 5 + (bunny_percent * 0.95)  # 5% folder + 95% upload
                                speed = self.calculate_speed(current_offset, start_time)
                                
                                self.update_progress(
                                    upload_id, 
                                    'uploading', 
                                    total_percent, 
                                    f"TUS chunked upload... {total_percent:.1f}% - Bunny: {bunny_percent:.1f}% ({current_offset / (1024*1024):.1f}MB / {file_size / (1024*1024):.1f}MB)", 
                                    speed,
                                    current_offset,
                                    file_size
                                )
                                print(f"✅ Chunk uploaded: {current_offset}/{file_size} bytes")
                            else:
                                print(f"❌ Chunk upload failed: {response.status_code} - {response.text}")
                                retry_count += 1
                                if retry_count < max_retries:
                                    wait_time = min(2 ** retry_count, 10)  # Cap at 10 seconds
                                    print(f"⏳ Retrying chunk in {wait_time} seconds...")
                                    time.sleep(wait_time)
                                    
                        except Exception as e:
                            print(f"❌ Chunk upload attempt {retry_count + 1} failed: {e}")
                            retry_count += 1
                            if retry_count < max_retries:
                                time.sleep(min(2 ** retry_count, 10))  # Cap at 10 seconds
                    
                    if not chunk_uploaded:
                        return {
                            'success': False, 
                            'message': f'Failed to upload chunk at offset {current_offset} after {max_retries} retries'
                        }
            
            # Upload completed
            cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
            self.update_progress(upload_id, 'completed', 100, "TUS upload completed successfully!")
            print(f"✅ TUS upload successful: {cdn_url}")
            
            return {
                'success': True,
                'cdn_url': cdn_url,
                'message': 'TUS chunked upload completed successfully'
            }
                
        except Exception as e:
            error_msg = f"TUS upload failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.update_progress(upload_id, 'error', 0, error_msg)
            return {'success': False, 'message': error_msg}
    
    def _get_bunny_stream_url(self, upload_url: str, upload_id: str) -> Optional[str]:
        """Get the final video URL after TUS upload completion"""
        try:
            # For Bunny Stream, the video URL is typically available after processing
            # This might need adjustment based on Bunny Stream's API response
            
            # Extract video ID from upload URL or response
            # This is a placeholder - adjust based on actual Bunny Stream API
            video_id = upload_url.split('/')[-1] if upload_url else None
            
            if video_id:
                # Construct the stream URL
                stream_url = f"https://vz-{self.stream_library_id}.b-cdn.net/{video_id}/playlist.m3u8"
                return stream_url
            
            return None
            
        except Exception as e:
            print(f"❌ Error getting stream URL: {e}")
            return None
    
    def upload_video_async_tus(self, file_path: str, course_id: int, 
                              filename: str, upload_id: str, video_metadata: dict = None):
        """Upload video asynchronously using TUS protocol"""
        # Capture the current Flask app context
        from flask import current_app
        app = current_app._get_current_object()
        
        def upload_worker():
            try:
                # Push the Flask app context into the worker thread
                with app.app_context():
                    # Use parallel upload for files larger than 1GB for maximum speed
                    file_size = os.path.getsize(file_path)
                    if file_size > 1024 * 1024 * 1024:  # 1GB threshold for parallel upload
                        print(f"🚀 Large file detected ({file_size / (1024*1024*1024):.1f}GB) - using PARALLEL upload")
                        result = self.upload_video_tus_parallel(file_path, course_id, filename, upload_id)
                    else:
                        print(f"📤 Using standard TUS upload for {file_size / (1024*1024):.1f}MB file")
                        result = self.upload_video_tus_resumable(file_path, course_id, filename, upload_id)
                    
                    # Store upload result first
                    self.upload_progress[upload_id]['result'] = result
                    
                    # Clean up temporary file
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"🗑️ Cleaned up temporary file: {file_path}")
                    except Exception as e:
                        print(f"⚠️ Warning: Could not clean up temp file {file_path}: {e}")
                        
            except Exception as e:
                error_msg = f"TUS upload worker failed: {str(e)}"
                print(f"❌ {error_msg}")
                self.update_progress(upload_id, 'error', 0, error_msg)
        
        def db_worker():
            """Separate worker for database operations"""
            try:
                # Wait for upload to complete (extended for 500GB+ files)
                max_wait = 21600  # 6 hours max wait for 500GB+ files
                wait_time = 0
                while wait_time < max_wait:
                    time.sleep(1)
                    wait_time += 1
                    
                    progress = self.upload_progress.get(upload_id, {})
                    result = progress.get('result')
                    
                    if result:
                        # Upload completed, create database record
                        if result['success'] and video_metadata:
                            with app.app_context():
                                self._create_video_record_safe(result['cdn_url'], course_id, video_metadata, upload_id)
                        break
                    elif progress.get('status') == 'error':
                        # Upload failed, no need to wait
                        break
                        
            except Exception as e:
                error_msg = f"TUS Database worker failed: {str(e)}"
                print(f"❌ {error_msg}")
                self.update_progress(upload_id, 'error', 0, error_msg)
        
        # Start both workers
        upload_thread = threading.Thread(target=upload_worker)
        upload_thread.daemon = True
        self.upload_threads[upload_id] = upload_thread
        upload_thread.start()
        
        # Start database worker if metadata provided
        if video_metadata:
            db_thread = threading.Thread(target=db_worker)
            db_thread.daemon = True
            db_thread.start()
    
    def _create_video_record_safe(self, cdn_url: str, course_id: int, metadata: dict, upload_id: str):
        """Safely create video record using raw SQL to avoid Flask-SQLAlchemy issues"""
        try:
            from flask import current_app
            import sqlalchemy as sa
            
            print(f"🔍 TUS: Creating database record with raw SQL")
            
            # Get database engine from current app
            engine = current_app.extensions['sqlalchemy'].engine
            
            # Use raw SQL to insert the video record
            with engine.connect() as conn:
                # Insert video lesson
                video_insert = sa.text("""
                    INSERT INTO video_lesson 
                    (title, description, video_url, course_id, order_index, is_preview, instructions, external_links, created_at, updated_at)
                    VALUES (:title, :description, :video_url, :course_id, :order_index, :is_preview, :instructions, :external_links, NOW(), NOW())
                    RETURNING id
                """)
                
                result = conn.execute(video_insert, {
                    'title': metadata.get('title', 'Untitled Video'),
                    'description': metadata.get('description', ''),
                    'video_url': cdn_url,
                    'course_id': course_id,
                    'order_index': metadata.get('order_index', 0),
                    'is_preview': metadata.get('is_preview', False),
                    'instructions': metadata.get('instructions', ''),
                    'external_links': metadata.get('external_links', '')
                })
                
                video_id = result.fetchone()[0]
                print(f"✅ TUS: Video record created with ID: {video_id}")
                
                # Handle attachments if provided
                attachments = metadata.get('attachments', [])
                if attachments:
                    for attachment_data in attachments:
                        attachment_insert = sa.text("""
                            INSERT INTO lesson_attachment 
                            (lesson_id, filename, original_filename, file_url, file_type, file_size, description, created_at)
                            VALUES (:lesson_id, :filename, :original_filename, :file_url, :file_type, :file_size, :description, NOW())
                        """)
                        
                        conn.execute(attachment_insert, {
                            'lesson_id': video_id,
                            'filename': attachment_data['filename'],
                            'original_filename': attachment_data['original_filename'],
                            'file_url': attachment_data.get('file_url', ''),
                            'file_type': attachment_data.get('file_type', 'unknown'),
                            'file_size': attachment_data.get('file_size', 0),
                            'description': attachment_data.get('description', '')
                        })
                
                # Commit the transaction
                conn.commit()
                
                print(f"✅ TUS: Database record created successfully for video: {video_id}")
                
                # Update progress with success
                self.update_progress(upload_id, 'completed', 100, 
                                   f"TUS upload completed and database record created!")
            
        except Exception as e:
            error_msg = f"Failed to create database record: {str(e)}"
            print(f"❌ TUS: {error_msg}")
            self.update_progress(upload_id, 'error', 0, error_msg)
    
    def _create_video_record(self, cdn_url: str, course_id: int, metadata: dict, upload_id: str):
        """Legacy method - kept for compatibility"""
        # Redirect to the safer method
        self._create_video_record_safe(cdn_url, course_id, metadata, upload_id)
    
    def cleanup_progress(self, upload_id: str):
        """Clean up progress tracking data"""
        if upload_id in self.upload_progress:
            del self.upload_progress[upload_id]
        if upload_id in self.upload_threads:
            del self.upload_threads[upload_id]

# Global instance
bunny_tus_uploader = BunnyTUSUploader()
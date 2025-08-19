"""
Enhanced Bunny.net Upload with Real-time Progress Tracking
Supports automatic folder creation and chunked uploads for large files
"""

import os
import json
import time
import requests
import threading
from typing import Dict, Optional, Callable
from flask import current_app
import math

class BunnyProgressUploader:
    """Enhanced Bunny.net uploader with real-time progress tracking"""
    
    def __init__(self):
        # Bunny.net configuration
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.api_key = '08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # Progress tracking
        self.upload_progress = {}
        self.upload_threads = {}
        
        # Chunk size for large file uploads (256MB chunks for 500GB+ files)
        self.chunk_size = 256 * 1024 * 1024  # 256MB for enterprise-level uploads
        
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
    
    def create_course_folder(self, course_id: int, upload_id: str) -> bool:
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
            
            response = requests.get(list_url, headers=headers, timeout=30)
            
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
                
                placeholder_response = requests.put(
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
    
    def update_progress(self, upload_id: str, status: str, percent: float = 0, 
                       message: str = "", speed: str = ""):
        """Update upload progress for SSE streaming"""
        self.upload_progress[upload_id] = {
            'status': status,
            'percent': percent,
            'message': message,
            'speed': speed,
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
    
    def upload_video_with_progress(self, file_path: str, course_id: int, 
                                 filename: str, upload_id: str) -> Dict:
        """Upload video to Bunny.net with real-time progress tracking"""
        try:
            print(f"🔄 Starting Bunny.net upload: {filename} (ID: {upload_id})")
            
            # Create course folder first
            if not self.create_course_folder(course_id, upload_id):
                return {
                    'success': False,
                    'message': 'Failed to create course folder in Bunny.net storage'
                }
            
            # Get course folder name and construct remote path
            folder_name = self.get_course_folder_name(course_id)
            remote_path = f"courses/{folder_name}/{filename}"
            
            # Prepare upload
            file_size = os.path.getsize(file_path)
            upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            
            headers = {
                'AccessKey': self.storage_password,
                'Content-Type': 'application/octet-stream'
            }
            
            print(f"📁 Uploading to: {remote_path}")
            print(f"📊 File size: {file_size / (1024*1024):.1f} MB")
            
            # Start upload
            start_time = time.time()
            bytes_uploaded = 0
            
            # Continue from folder creation progress (5%) instead of resetting to 0
            self.update_progress(upload_id, 'uploading', 6, f"Starting upload stream for {filename}...", "0 B/s")
            print(f"🔄 Starting actual upload for: {filename} (Upload ID: {upload_id})")
            
            # For large files, use chunked upload for better progress tracking
            if file_size > self.chunk_size:
                return self._chunked_upload(file_path, upload_url, headers, 
                                          file_size, upload_id, start_time)
            else:
                return self._simple_upload(file_path, upload_url, headers, 
                                         file_size, upload_id, start_time)
                
        except Exception as e:
            error_msg = f"Upload failed: {str(e)}"
            print(f"❌ {error_msg}")
            self.update_progress(upload_id, 'error', 0, error_msg)
            return {'success': False, 'message': error_msg}
    
    def _simple_upload(self, file_path: str, upload_url: str, headers: Dict,
                      file_size: int, upload_id: str, start_time: float) -> Dict:
        """Simple upload for smaller files with real Bunny.net progress tracking"""
        try:
            # Create progress wrapper class for real upload tracking
            class ProgressFileWrapper:
                def __init__(self, file_path, file_size, upload_id, progress_callback):
                    self.file_path = file_path
                    self.file_size = file_size
                    self.upload_id = upload_id
                    self.progress_callback = progress_callback
                    self.bytes_uploaded = 0
                    self.file_obj = open(file_path, 'rb')
                    print(f"🔧 ProgressFileWrapper initialized for {file_path} ({file_size} bytes)")
                    
                def read(self, size=-1):
                    data = self.file_obj.read(size)
                    if data:
                        self.bytes_uploaded += len(data)
                        # Calculate real upload progress percentage (starting from 5% after folder creation)
                        bunny_percent = (self.bytes_uploaded / self.file_size) * 100
                        total_percent = 5 + (bunny_percent * 0.95)  # 5% folder + 95% upload
                        # Call progress callback with real upload progress
                        if self.bytes_uploaded % (1024 * 1024) < len(data):  # Log every MB
                            print(f"📊 Upload progress: {total_percent:.1f}% ({self.bytes_uploaded}/{self.file_size} bytes)")
                        self.progress_callback(self.upload_id, total_percent, self.bytes_uploaded, self.file_size)
                    return data
                
                def __len__(self):
                    return self.file_size
                
                def close(self):
                    if hasattr(self, 'file_obj'):
                        self.file_obj.close()
                        
                def __enter__(self):
                    return self
                    
                def __exit__(self, exc_type, exc_val, exc_tb):
                    self.close()
            
            # Progress callback for real-time updates
            def update_real_progress(upload_id, percent, bytes_uploaded, total_bytes):
                speed = self.calculate_speed(bytes_uploaded, start_time)
                bunny_percent = (bytes_uploaded / total_bytes) * 100
                print(f"🔄 Progress callback: {percent:.1f}% - Speed: {speed}")
                self.update_progress(
                    upload_id, 
                    'uploading', 
                    percent, 
                    f"Uploading to Bunny.net... {percent:.1f}% - Bunny: {bunny_percent:.1f}% ({bytes_uploaded / (1024*1024):.1f}MB / {total_bytes / (1024*1024):.1f}MB)", 
                    speed
                )
            
            # Use progress wrapper for real upload tracking
            with ProgressFileWrapper(file_path, file_size, upload_id, update_real_progress) as file_wrapper:
                self.update_progress(upload_id, 'uploading', 7, "Uploading data to Bunny.net...", "0 B/s")
                print(f"📤 Starting PUT request to Bunny.net for: {filename}")
                
                response = requests.put(
                    upload_url, 
                    headers=headers, 
                    data=file_wrapper, 
                    timeout=300
                )
                
                if response.status_code in [200, 201]:
                    # Construct CDN URL with proper path
                    remote_path = upload_url.split(f"{self.storage_zone}/")[1]
                    cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                    self.update_progress(upload_id, 'completed', 100, "Upload completed successfully!")
                    print(f"✅ Upload successful: {cdn_url}")
                    return {
                        'success': True,
                        'cdn_url': cdn_url,
                        'message': 'Upload completed successfully'
                    }
                else:
                    error_msg = f"Upload failed with status {response.status_code}: {response.text}"
                    self.update_progress(upload_id, 'error', 0, error_msg)
                    return {'success': False, 'message': error_msg}
                    
        except Exception as e:
            error_msg = f"Simple upload failed: {str(e)}"
            self.update_progress(upload_id, 'error', 0, error_msg)
            return {'success': False, 'message': error_msg}
    
    def _chunked_upload(self, file_path: str, upload_url: str, headers: Dict,
                       file_size: int, upload_id: str, start_time: float) -> Dict:
        """Chunked upload for large files with real Bunny.net upload progress tracking"""
        try:
            # Create a custom upload session with real-time progress tracking
            import io
            
            class ProgressFileWrapper:
                def __init__(self, file_path, file_size, upload_id, progress_callback):
                    self.file_path = file_path
                    self.file_size = file_size
                    self.upload_id = upload_id
                    self.progress_callback = progress_callback
                    self.bytes_uploaded = 0
                    self.file_obj = open(file_path, 'rb')
                    print(f"🔧 ProgressFileWrapper initialized for {file_path} ({file_size} bytes)")
                    
                def read(self, size=-1):
                    data = self.file_obj.read(size)
                    if data:
                        self.bytes_uploaded += len(data)
                        # Calculate real upload progress percentage (starting from 5% after folder creation)
                        bunny_percent = (self.bytes_uploaded / self.file_size) * 100
                        total_percent = 5 + (bunny_percent * 0.95)  # 5% folder + 95% upload
                        # Call progress callback with real upload progress
                        if self.bytes_uploaded % (1024 * 1024) < len(data):  # Log every MB
                            print(f"📊 Upload progress: {total_percent:.1f}% ({self.bytes_uploaded}/{self.file_size} bytes)")
                        self.progress_callback(self.upload_id, total_percent, self.bytes_uploaded, self.file_size)
                    return data
                
                def __len__(self):
                    return self.file_size
                
                def close(self):
                    if hasattr(self, 'file_obj'):
                        self.file_obj.close()
                        
                def __enter__(self):
                    return self
                    
                def __exit__(self, exc_type, exc_val, exc_tb):
                    self.close()
            
            # Progress callback for real-time updates
            def update_real_progress(upload_id, percent, bytes_uploaded, total_bytes):
                speed = self.calculate_speed(bytes_uploaded, start_time)
                bunny_percent = (bytes_uploaded / total_bytes) * 100
                print(f"🔄 Progress callback: {percent:.1f}% - Speed: {speed}")
                self.update_progress(
                    upload_id, 
                    'uploading', 
                    percent, 
                    f"Uploading to Bunny.net... {percent:.1f}% - Bunny: {bunny_percent:.1f}% ({bytes_uploaded / (1024*1024):.1f}MB / {total_bytes / (1024*1024):.1f}MB)", 
                    speed
                )
            
            # Use progress wrapper for real upload tracking
            with ProgressFileWrapper(file_path, file_size, upload_id, update_real_progress) as file_wrapper:
                self.update_progress(upload_id, 'uploading', 7, "Uploading data to Bunny.net (chunked)...", "0 B/s")
                print(f"📤 Starting chunked PUT request to Bunny.net for: {file_path}")
                
                response = requests.put(
                    upload_url, 
                    headers=headers, 
                    data=file_wrapper, 
                    timeout=3600  # 1 hour for 256MB chunks
                )
                
                if response.status_code in [200, 201]:
                    # Construct CDN URL
                    remote_path = upload_url.split(f"{self.storage_zone}/")[1]
                    cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                    
                    self.update_progress(upload_id, 'completed', 100, "Upload completed successfully!")
                    print(f"✅ Chunked upload successful: {cdn_url}")
                    return {
                        'success': True,
                        'cdn_url': cdn_url,
                        'message': 'Upload completed successfully'
                    }
                else:
                    error_msg = f"Chunked upload failed with status {response.status_code}: {response.text}"
                    self.update_progress(upload_id, 'error', 0, error_msg)
                    return {'success': False, 'message': error_msg}
                    
        except Exception as e:
            error_msg = f"Chunked upload failed: {str(e)}"
            self.update_progress(upload_id, 'error', 0, error_msg)
            return {'success': False, 'message': error_msg}
    
    def upload_video_async(self, file_path: str, course_id: int, 
                          filename: str, upload_id: str, video_metadata: dict = None):
        """Upload video asynchronously in a separate thread"""
        # Initialize progress tracking immediately
        self.update_progress(upload_id, 'initializing', 0, f"Initializing upload for {filename}...", "0 B/s")
        print(f"🚀 Starting async upload for: {filename} (ID: {upload_id})")
        
        # Capture the current Flask app context
        from flask import current_app
        app = current_app._get_current_object()
        
        def upload_worker():
            try:
                # Push the Flask app context into the worker thread
                with app.app_context():
                    print(f"🔄 Upload worker started for: {filename} (ID: {upload_id})")
                    result = self.upload_video_with_progress(file_path, course_id, filename, upload_id)
                    
                    # Store upload result first - ensure progress dict exists
                    if upload_id not in self.upload_progress:
                        self.upload_progress[upload_id] = {}
                    self.upload_progress[upload_id]['result'] = result
                    print(f"✅ Upload worker completed for: {filename} (ID: {upload_id})")
                    
                    # Clean up temporary file
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"🗑️ Cleaned up temporary file: {file_path}")
                    except Exception as e:
                        print(f"⚠️ Warning: Could not clean up temp file {file_path}: {e}")
                        
            except Exception as e:
                error_msg = f"Upload worker failed: {str(e)}"
                print(f"❌ {error_msg}")
                import traceback
                traceback.print_exc()
                
                # Ensure progress dict exists before updating
                if upload_id not in self.upload_progress:
                    self.upload_progress[upload_id] = {}
                    
                self.upload_progress[upload_id].update({
                    'status': 'error',
                    'percent': 0,
                    'message': error_msg,
                    'speed': '',
                    'timestamp': time.time()
                })
        
        def db_worker():
            """Separate worker for database operations"""
            try:
                # Wait for upload to complete
                max_wait = 300  # 5 minutes max wait
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
                error_msg = f"Database worker failed: {str(e)}"
                print(f"❌ {error_msg}")
                self.update_progress(upload_id, 'error', 0, error_msg)
        
        # Start both workers
        upload_thread = threading.Thread(target=upload_worker)
        upload_thread.daemon = True
        self.upload_threads[upload_id] = upload_thread
        print(f"🔄 Starting upload thread for: {filename} (ID: {upload_id})")
        upload_thread.start()
        print(f"✅ Upload thread started successfully for: {filename} (ID: {upload_id})")
        
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
            
            print(f"🔍 Creating database record with raw SQL")
            
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
                print(f"✅ Video record created with ID: {video_id}")
                
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
                
                print(f"✅ Database record created successfully for video: {video_id}")
                
                # Update progress with success
                self.update_progress(upload_id, 'completed', 100, 
                                   f"Upload completed and database record created!")
            
        except Exception as e:
            error_msg = f"Failed to create database record: {str(e)}"
            print(f"❌ {error_msg}")
            self.update_progress(upload_id, 'error', 0, error_msg)
    
    def _create_video_record(self, cdn_url: str, course_id: int, metadata: dict, upload_id: str):
        """Legacy method - kept for compatibility"""
        # Redirect to the safer method
        self._create_video_record_safe(cdn_url, course_id, metadata, upload_id)
    
    def test_upload_progress(self, upload_id: str):
        """Test function to verify progress tracking works"""
        print(f"🔧 Testing progress tracking for upload ID: {upload_id}")
        
        # Test progress updates
        self.update_progress(upload_id, 'test', 0, "Testing progress tracking...", "0 B/s")
        time.sleep(1)
        
        for i in range(1, 6):
            percent = i * 20
            self.update_progress(upload_id, 'test', percent, f"Test progress: {percent}%", f"{i} MB/s")
            print(f"📊 Test progress: {percent}%")
            time.sleep(1)
        
        self.update_progress(upload_id, 'completed', 100, "Test completed!", "5 MB/s")
        print(f"✅ Test completed for upload ID: {upload_id}")
    
    def cleanup_progress(self, upload_id: str):
        """Clean up progress tracking data"""
        if upload_id in self.upload_progress:
            del self.upload_progress[upload_id]
        if upload_id in self.upload_threads:
            del self.upload_threads[upload_id]

# Global instance
bunny_uploader = BunnyProgressUploader()
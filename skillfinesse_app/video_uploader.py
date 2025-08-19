"""
Complete Video Upload System for Skill Finesse
Handles uploads to Bunny.net CDN and database storage
"""

import os
import time
import requests
import threading
from typing import Dict, Optional
import uuid
import tempfile

class VideoUploader:
    def __init__(self):
        # Bunny.net configuration
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.api_key = '08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # Progress tracking
        self.progress_data = {}
        self.upload_metadata = {}
        
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
                return f"{speed_bps / (1024 * 1024 * 1024):.2f} GB/s"
            elif speed_bps >= 1024 * 1024:  # MB/s
                return f"{speed_bps / (1024 * 1024):.2f} MB/s"
            elif speed_bps >= 1024:  # KB/s
                return f"{speed_bps / 1024:.2f} KB/s"
            else:
                return f"{speed_bps:.0f} B/s"
        return "0 B/s"
    
    def calculate_eta(self, bytes_uploaded: int, total_bytes: int, start_time: float) -> str:
        """Calculate estimated time remaining"""
        if bytes_uploaded <= 0 or total_bytes <= 0:
            return "Calculating..."
        
        elapsed = time.time() - start_time
        if elapsed <= 0:
            return "Calculating..."
        
        bytes_remaining = total_bytes - bytes_uploaded
        speed_bps = bytes_uploaded / elapsed
        
        if speed_bps <= 0:
            return "Calculating..."
        
        eta_seconds = bytes_remaining / speed_bps
        
        if eta_seconds < 60:
            return f"{int(eta_seconds)}s"
        elif eta_seconds < 3600:
            minutes = int(eta_seconds / 60)
            seconds = int(eta_seconds % 60)
            return f"{minutes}m {seconds}s"
        else:
            hours = int(eta_seconds / 3600)
            minutes = int((eta_seconds % 3600) / 60)
            return f"{hours}h {minutes}m"
    
    def format_bytes(self, bytes_count: int) -> str:
        """Format bytes in human readable format"""
        if bytes_count >= 1024 * 1024 * 1024:  # GB
            return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"
        elif bytes_count >= 1024 * 1024:  # MB
            return f"{bytes_count / (1024 * 1024):.2f} MB"
        elif bytes_count >= 1024:  # KB
            return f"{bytes_count / 1024:.2f} KB"
        else:
            return f"{bytes_count} B"
    
    def get_course_folder_name(self, course_id: int) -> str:
        """Get sanitized course folder name using raw SQL to avoid app context issues"""
        try:
            from flask import current_app
            import sqlalchemy as sa
            
            # Use raw SQL to avoid ORM context issues
            engine = current_app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = sa.text("SELECT title FROM course WHERE id = :course_id")
                result = conn.execute(query, {'course_id': course_id})
                row = result.fetchone()
                
                if row and row[0]:
                    course_title = row[0].strip()
                    # Sanitize folder name
                    folder_name = course_title
                    invalid_chars = '<>:"/\\|?*'
                    for char in invalid_chars:
                        folder_name = folder_name.replace(char, '-')
                    return folder_name[:100] or f"course-{course_id}"
                
                return f"course-{course_id}"
        except Exception as e:
            print(f"❌ Error getting course folder: {e}")
            return f"course-{course_id}"
    
    class ProgressFileWrapper:
        """File wrapper that tracks upload progress with speed and ETA"""
        def __init__(self, file_path: str, upload_id: str, uploader):
            self.file_path = file_path
            self.upload_id = upload_id
            self.uploader = uploader
            self.file_size = os.path.getsize(file_path)
            self.bytes_uploaded = 0
            self.file_obj = open(file_path, 'rb')
            self.start_time = time.time()
            self.last_update = 0
            
            print(f"📁 Progress wrapper created for {file_path} ({self.uploader.format_bytes(self.file_size)})")
        
        def read(self, size=-1):
            data = self.file_obj.read(size)
            if data:
                self.bytes_uploaded += len(data)
                
                # Update progress every 1MB or when completed
                if self.bytes_uploaded - self.last_update >= 1024*1024 or self.bytes_uploaded >= self.file_size:
                    percent = (self.bytes_uploaded / self.file_size) * 100
                    speed = self.uploader.calculate_speed(self.bytes_uploaded, self.start_time)
                    eta = self.uploader.calculate_eta(self.bytes_uploaded, self.file_size, self.start_time)
                    
                    uploaded_str = self.uploader.format_bytes(self.bytes_uploaded)
                    total_str = self.uploader.format_bytes(self.file_size)
                    
                    message = f"Uploading to Bunny CDN: {uploaded_str} / {total_str} ({percent:.1f}%)"
                    
                    self.uploader.update_progress(
                        self.upload_id, 
                        10 + ((self.bytes_uploaded / self.file_size) * 80),  # Map CDN upload to 10-90% range
                        message,
                        speed,
                        "uploading",
                        eta,
                        self.bytes_uploaded,
                        self.file_size
                    )
                    self.last_update = self.bytes_uploaded
            
            return data
        
        def __enter__(self):
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            self.file_obj.close()

    def upload_file_to_bunny(self, file_path: str, remote_path: str, upload_id: str = None) -> dict:
        """Upload a file to Bunny CDN with detailed progress tracking"""
        try:
            file_size = os.path.getsize(file_path)
            upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            
            headers = {
                'AccessKey': self.storage_password,
                'Content-Type': 'application/octet-stream'
            }
            
            print(f"📤 Uploading {self.format_bytes(file_size)} to: {upload_url}")
            
            if upload_id:
                self.update_progress(
                    upload_id, 10, 
                    f"Starting upload to Bunny CDN ({self.format_bytes(file_size)})...",
                    "0 B/s", "uploading", "Calculating...", 0, file_size
                )
            
            # Upload with real-time progress tracking
            if upload_id:
                with self.ProgressFileWrapper(file_path, upload_id, self) as file_wrapper:
                    response = requests.put(upload_url, headers=headers, data=file_wrapper, timeout=(30, 7200)  # Extended timeout for large files  # 30s connect, 30min read timeout for large files)
            else:
                with open(file_path, 'rb') as file:
                    response = requests.put(upload_url, headers=headers, data=file, timeout=(30, 7200)  # Extended timeout for large files  # 30s connect, 30min read timeout for large files)
            
            if response.status_code in [200, 201]:
                cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                if upload_id:
                    self.update_progress(
                        upload_id, 90, 
                        f"Upload completed ({self.format_bytes(file_size)})",
                        "0 B/s", "uploading", "Completed", file_size, file_size
                    )
                
                print(f"✅ CDN Upload successful: {cdn_url}")
                return {
                    'success': True,
                    'cdn_url': cdn_url,
                    'storage_path': remote_path
                }
            else:
                error_msg = f"CDN upload failed: HTTP {response.status_code}"
                print(f"❌ {error_msg}")
                return {'success': False, 'error': error_msg}
                
        except Exception as e:
            error_msg = f"CDN upload error: {str(e)}"
            print(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}
    
    def save_video_to_database(self, upload_id: str, course_id: int, video_data: dict, cdn_url: str, storage_path: str) -> dict:
        """Save video and attachments to database using raw SQL"""
        try:
            print(f"💾 Saving video to database using raw SQL...")
            print(f"💾 Video data: {video_data}")
            
            from flask import current_app
            import sqlalchemy as sa
            from datetime import datetime
            
            # Get database engine
            engine = current_app.extensions['sqlalchemy'].engine
            
            with engine.begin() as conn:  # Use transaction
                # Insert video lesson
                video_insert_sql = sa.text("""
                    INSERT INTO video_lesson 
                    (course_id, title, description, video_url, bunny_video_id, storage_path, 
                     order_index, is_preview, instructions, external_links, duration, created_at)
                    VALUES 
                    (:course_id, :title, :description, :video_url, :bunny_video_id, :storage_path,
                     :order_index, :is_preview, :instructions, :external_links, :duration, :created_at)
                    RETURNING id
                """)
                
                video_result = conn.execute(video_insert_sql, {
                    'course_id': course_id,
                    'title': video_data.get('title', 'Untitled Video'),
                    'description': video_data.get('description', ''),
                    'video_url': cdn_url,
                    'bunny_video_id': video_data.get('filename', ''),
                    'storage_path': storage_path,
                    'order_index': video_data.get('order_index', 0),
                    'is_preview': video_data.get('is_preview', False),
                    'instructions': video_data.get('instructions', ''),
                    'external_links': video_data.get('external_links'),
                    'duration': 0,  # Default duration
                    'created_at': datetime.utcnow()
                })
                
                video_id = video_result.fetchone()[0]
                print(f"✅ Video lesson created with ID: {video_id}")
                
                # Handle attachments
                attachments = video_data.get('attachments', [])
                if attachments:
                    print(f"📎 Processing {len(attachments)} attachments...")
                    
                    for att_data in attachments:
                        if 'temp_path' in att_data and os.path.exists(att_data['temp_path']):
                            # Upload attachment to CDN
                            folder_name = self.get_course_folder_name(course_id)
                            att_remote_path = f"courses/{folder_name}/{att_data['filename']}"
                            
                            att_result = self.upload_file_to_bunny(att_data['temp_path'], att_remote_path)
                            
                            if att_result['success']:
                                # Save attachment to database using raw SQL
                                attachment_insert_sql = sa.text("""
                                    INSERT INTO lesson_attachment 
                                    (lesson_id, filename, original_filename, file_url, file_type, file_size, description, created_at)
                                    VALUES 
                                    (:lesson_id, :filename, :original_filename, :file_url, :file_type, :file_size, :description, :created_at)
                                """)
                                
                                conn.execute(attachment_insert_sql, {
                                    'lesson_id': video_id,
                                    'filename': att_data['filename'],
                                    'original_filename': att_data.get('original_filename', ''),
                                    'file_url': att_result['cdn_url'],
                                    'file_type': att_data.get('file_type', ''),
                                    'file_size': att_data.get('file_size', 0),
                                    'description': att_data.get('description', ''),
                                    'created_at': datetime.utcnow()
                                })
                                
                                print(f"✅ Attachment saved: {att_data['original_filename']}")
                                
                                # Clean up temp file
                                try:
                                    os.remove(att_data['temp_path'])
                                    print(f"🗑️ Cleaned up: {att_data['temp_path']}")
                                except:
                                    pass
                            else:
                                print(f"❌ Failed to upload attachment: {att_data['original_filename']}")
                
                print(f"✅ All data saved to database successfully")
                
                return {
                    'success': True,
                    'video_id': video_id
                }
            
        except Exception as e:
            print(f"❌ Database save error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_video_async(self, file_path: str, course_id: int, video_data: dict, upload_id: str):
        """Complete async video upload process"""
        print(f"🚀 Starting video upload: {video_data.get('title', 'Untitled')}")
        
        # Store metadata
        self.upload_metadata[upload_id] = video_data
        
        from flask import current_app
        app = current_app._get_current_object()
        
        def upload_worker():
            with app.app_context():
                try:
                    file_size = os.path.getsize(file_path)
                    
                    self.update_progress(
                        upload_id, 0, 
                        f"Initializing upload ({self.format_bytes(file_size)})...", 
                        "0 B/s", "initializing", "Calculating...", 0, file_size
                    )
                    
                    # Get course folder
                    folder_name = self.get_course_folder_name(course_id)
                    self.update_progress(
                        upload_id, 5, 
                        f"Preparing course folder: {folder_name}",
                        "0 B/s", "preparing", "Calculating...", 0, file_size
                    )
                    
                    # Upload video to CDN with real-time progress
                    video_filename = video_data.get('filename', f"{uuid.uuid4()}.mp4")
                    remote_path = f"courses/{folder_name}/{video_filename}"
                    
                    # Stage 1: Server upload (0-30%), Stage 2: CDN upload (30-95%), Stage 3: Database (95-100%)
                    cdn_result = self.upload_file_to_bunny(file_path, remote_path, upload_id)
                    
                    if cdn_result['success']:
                        self.update_progress(
                            upload_id, 95, 
                            "Saving to database...",
                            "0 B/s", "saving", "Almost done", file_size, file_size
                        )
                        
                        # Save to database
                        db_result = self.save_video_to_database(
                            upload_id, course_id, video_data, 
                            cdn_result['cdn_url'], cdn_result['storage_path']
                        )
                        
                        if db_result['success']:
                            self.update_progress(
                                upload_id, 100, 
                                f"Upload completed successfully! ({self.format_bytes(file_size)})",
                                "0 B/s", "completed", "Completed", file_size, file_size
                            )
                            print(f"✅ Complete upload success for: {video_data.get('title')}")
                        else:
                            self.update_progress(
                                upload_id, 95, 
                                f"Database error: {db_result['error']}",
                                "0 B/s", "error", "Failed", file_size, file_size
                            )
                    else:
                        self.update_progress(
                            upload_id, 50, 
                            f"CDN error: {cdn_result['error']}",
                            "0 B/s", "error", "Failed", 0, file_size
                        )
                    
                    # Clean up video temp file
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"🗑️ Cleaned up video file: {file_path}")
                    except:
                        pass
                        
                except Exception as e:
                    error_msg = f"Upload error: {str(e)}"
                    print(f"❌ {error_msg}")
                    import traceback
                    traceback.print_exc()
                    self.update_progress(upload_id, 0, error_msg, "", "error")
        
        # Start upload in background thread
        thread = threading.Thread(target=upload_worker, daemon=True)
        thread.start()
        print(f"✅ Upload thread started for: {video_data.get('title')}")

# Global instance
video_uploader = VideoUploader()
# Initialize upload completion monitor
from ensure_upload_completion import init_upload_monitor
upload_monitor = init_upload_monitor(video_uploader)
    def mark_upload_completed(self, upload_id: str):
        """Explicitly mark an upload as completed"""
        try:
            # Force completion status
            self.update_progress(
                upload_id, 100, 
                "Upload completed successfully\!",
                "0 B/s", "completed", "Completed", 0, 0
            )
            print(f"✅ Forced completion status for upload: {upload_id}")
        except Exception as e:
            print(f"❌ Error marking upload completed: {e}")

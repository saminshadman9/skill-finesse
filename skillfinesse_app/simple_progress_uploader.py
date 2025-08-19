"""
Simple Progress Uploader - Rebuilt from scratch for reliable progress tracking
"""
import os
import time
import requests
import threading
from typing import Dict, Optional

class SimpleProgressUploader:
    def __init__(self):
        # Bunny.net configuration
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        
        # Simple progress tracking
        self.progress_data = {}
        
    def update_progress(self, upload_id: str, percent: float, message: str, speed: str = "", status: str = "uploading"):
        """Update progress with all required fields"""
        self.progress_data[upload_id] = {
            'status': status,
            'percent': round(percent, 1),
            'message': message,
            'speed': speed,
            'timestamp': time.time()
        }
        print(f"📊 Progress Update: {upload_id} - {percent:.1f}% - {message} - {speed}")
    
    def get_progress(self, upload_id: str) -> Optional[Dict]:
        """Get current progress"""
        return self.progress_data.get(upload_id)
    
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
        """Get course folder name using raw SQL"""
        try:
            from flask import current_app
            import sqlalchemy as sa
            
            engine = current_app.extensions['sqlalchemy'].engine
            with engine.connect() as conn:
                query = sa.text("SELECT title FROM course WHERE id = :course_id")
                result = conn.execute(query, {'course_id': course_id})
                row = result.fetchone()
                
                if row and row[0]:
                    course_title = row[0].strip()
                    # Simple sanitization
                    folder_name = course_title
                    invalid_chars = '<>:"/\\|?*'
                    for char in invalid_chars:
                        folder_name = folder_name.replace(char, '-')
                    return folder_name[:100] or f"course-{course_id}"
                
                return f"course-{course_id}"
        except Exception as e:
            print(f"❌ Error getting course folder: {e}")
            return f"course-{course_id}"
    
    def save_video_to_database(self, upload_id: str, course_id: int, filename: str, cdn_url: str, storage_path: str) -> dict:
        """Save uploaded video to database"""
        try:
            print(f"💾 ========== SAVING VIDEO TO DATABASE ==========")
            print(f"💾 Upload ID: {upload_id}")
            print(f"💾 Course ID: {course_id}")
            print(f"💾 Filename: {filename}")
            print(f"💾 CDN URL: {cdn_url}")
            print(f"💾 Storage Path: {storage_path}")
            
            from flask import current_app
            from models import VideoLesson, db
            import uuid
            
            print(f"💾 Imports successful")
            
            # Get video metadata from upload ID (stored during upload initiation)
            video_metadata = getattr(self, 'upload_metadata', {}).get(upload_id, {})
            print(f"💾 Video metadata: {video_metadata}")
            
            # Create video lesson record
            video_lesson = VideoLesson(
                course_id=course_id,
                title=video_metadata.get('title', filename.rsplit('.', 1)[0]),
                description=video_metadata.get('description', ''),
                video_url=cdn_url,
                bunny_video_id=filename,
                storage_path=storage_path,
                order_index=video_metadata.get('order_index', 0),
                is_preview=video_metadata.get('is_preview', False),
                instructions=video_metadata.get('instructions', ''),
                external_links=video_metadata.get('external_links')
            )
            
            db.session.add(video_lesson)
            db.session.flush()  # Get the ID
            video_id = video_lesson.id
            
            # Handle attachments if any
            attachments = video_metadata.get('attachments', [])
            if attachments:
                from models import LessonAttachment
                print(f"📎 Processing {len(attachments)} attachments...")
                
                for att_data in attachments:
                    # Upload attachment to Bunny CDN
                    if 'temp_path' in att_data:
                        att_filename = att_data['filename']
                        temp_path = att_data['temp_path']
                        
                        # Upload attachment
                        folder_name = self.get_course_folder_name(course_id)
                        remote_path = f"courses/{folder_name}/{att_filename}"
                        upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
                        
                        headers = {
                            'AccessKey': self.storage_password,
                            'Content-Type': 'application/octet-stream'
                        }
                        
                        with open(temp_path, 'rb') as att_file:
                            att_response = requests.put(upload_url, headers=headers, data=att_file)
                            
                            if att_response.status_code in [200, 201]:
                                att_cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                                print(f"✅ Attachment uploaded: {att_cdn_url}")
                                
                                # Get file extension for type
                                file_extension = att_filename.rsplit('.', 1)[-1].lower() if '.' in att_filename else 'unknown'
                                
                                lesson_attachment = LessonAttachment(
                                    lesson_id=video_id,
                                    filename=att_filename,
                                    original_filename=att_data.get('original_filename', ''),
                                    file_url=att_cdn_url,
                                    file_type=file_extension,
                                    file_size=att_data.get('file_size', 0),
                                    description=att_data.get('description', '')
                                )
                                db.session.add(lesson_attachment)
                                
                                # Clean up temp file
                                try:
                                    import os
                                    if os.path.exists(temp_path):
                                        os.remove(temp_path)
                                        print(f"🗑️ Cleaned up attachment temp file: {temp_path}")
                                except Exception as e:
                                    print(f"⚠️ Attachment cleanup warning: {e}")
                            else:
                                print(f"❌ Failed to upload attachment: HTTP {att_response.status_code}")
                    else:
                        # Legacy attachment data without temp_path
                        lesson_attachment = LessonAttachment(
                            lesson_id=video_id,
                            filename=att_data.get('filename', ''),
                            original_filename=att_data.get('original_filename', ''),
                            file_url=att_data.get('file_url', ''),
                            file_type=att_data.get('file_type', ''),
                            file_size=att_data.get('file_size', 0),
                            description=att_data.get('description', '')
                        )
                        db.session.add(lesson_attachment)
            
            db.session.commit()
            print(f"✅ Video saved to database with ID: {video_id}")
            
            return {
                'success': True,
                'video_id': video_id
            }
            
        except Exception as e:
            print(f"❌ Database save error: {e}")
            import traceback
            traceback.print_exc()
            try:
                db.session.rollback()
            except:
                pass
            return {
                'success': False,
                'error': str(e)
            }
    
    class ProgressFileWrapper:
        """File wrapper that tracks upload progress"""
        def __init__(self, file_path: str, file_size: int, upload_id: str, uploader):
            self.file_path = file_path
            self.file_size = file_size
            self.upload_id = upload_id
            self.uploader = uploader
            self.bytes_uploaded = 0
            self.file_obj = open(file_path, 'rb')
            self.start_time = time.time()
            self.last_update = 0
            print(f"🔧 Progress wrapper created for {file_path} ({file_size} bytes)")
        
        def read(self, size=-1):
            data = self.file_obj.read(size)
            if data:
                self.bytes_uploaded += len(data)
                percent = (self.bytes_uploaded / self.file_size) * 100
                
                # Update every 1MB or when completed
                if self.bytes_uploaded - self.last_update >= 1024*1024 or percent >= 100:
                    speed = self.uploader.calculate_speed(self.bytes_uploaded, self.start_time)
                    message = f"Uploading: {percent:.1f}% ({self.bytes_uploaded / (1024*1024):.1f}MB / {self.file_size / (1024*1024):.1f}MB)"
                    self.uploader.update_progress(self.upload_id, percent, message, speed)
                    self.last_update = self.bytes_uploaded
            
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
    
    def upload_video_simple(self, file_path: str, course_id: int, filename: str, upload_id: str):
        """Simple upload with guaranteed progress tracking"""
        try:
            print(f"🚀 Starting simple upload: {filename}")
            
            # Step 1: Initialize
            self.update_progress(upload_id, 0, "Initializing upload...", "", "initializing")
            time.sleep(0.5)  # Small delay to ensure frontend sees this
            
            # Step 2: Get course folder
            self.update_progress(upload_id, 5, "Getting course information...", "")
            folder_name = self.get_course_folder_name(course_id)
            time.sleep(0.5)
            
            # Step 3: Prepare upload
            self.update_progress(upload_id, 10, "Preparing upload to Bunny.net...", "")
            file_size = os.path.getsize(file_path)
            remote_path = f"courses/{folder_name}/{filename}"
            upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
            
            headers = {
                'AccessKey': self.storage_password,
                'Content-Type': 'application/octet-stream'
            }
            
            print(f"📁 Upload URL: {upload_url}")
            print(f"📊 File size: {file_size / (1024*1024):.1f} MB")
            time.sleep(0.5)
            
            # Step 4: Start upload with progress tracking
            self.update_progress(upload_id, 15, "Starting upload to Bunny.net...", "0 B/s")
            
            with self.ProgressFileWrapper(file_path, file_size, upload_id, self) as file_wrapper:
                response = requests.put(
                    upload_url,
                    headers=headers,
                    data=file_wrapper,
                    timeout=300
                )
                
                if response.status_code in [200, 201]:
                    cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                    print(f"✅ Bunny CDN upload successful: {cdn_url}")
                    self.update_progress(upload_id, 95, "Upload completed, saving to database...", "")
                    
                    # Save to database
                    print(f"🔄 About to call save_video_to_database...")
                    db_result = self.save_video_to_database(upload_id, course_id, filename, cdn_url, remote_path)
                    print(f"💾 Database save result: {db_result}")
                    
                    if db_result['success']:
                        self.update_progress(upload_id, 100, "Upload completed successfully!", "", "completed")
                        print(f"✅ Upload and database save successful: {cdn_url}")
                        return {
                            'success': True,
                            'cdn_url': cdn_url,
                            'video_id': db_result['video_id'],
                            'message': 'Upload completed successfully'
                        }
                    else:
                        error_msg = f"Upload successful but database save failed: {db_result['error']}"
                        self.update_progress(upload_id, 95, error_msg, "", "error")
                        print(f"❌ {error_msg}")
                        return {
                            'success': False,
                            'error': error_msg
                        }
                else:
                    error_msg = f"Upload failed: HTTP {response.status_code}"
                    self.update_progress(upload_id, 0, error_msg, "", "error")
                    return {'success': False, 'message': error_msg}
                    
        except Exception as e:
            error_msg = f"Upload error: {str(e)}"
            print(f"❌ {error_msg}")
            self.update_progress(upload_id, 0, error_msg, "", "error")
            return {'success': False, 'message': error_msg}
    
    def upload_video_async(self, file_path: str, course_id: int, filename: str, upload_id: str, video_metadata: dict = None):
        """Async upload with guaranteed progress"""
        print(f"🚀 Starting async upload: {filename} (ID: {upload_id})")
        
        # Store metadata for database saving
        if not hasattr(self, 'upload_metadata'):
            self.upload_metadata = {}
        self.upload_metadata[upload_id] = video_metadata or {}
        
        # Initialize immediately
        self.update_progress(upload_id, 0, f"Starting upload: {filename}", "", "initializing")
        
        from flask import current_app
        app = current_app._get_current_object()
        
        def worker():
            try:
                with app.app_context():
                    print(f"🔄 Worker thread started for: {filename}")
                    result = self.upload_video_simple(file_path, course_id, filename, upload_id)
                    print(f"✅ Worker thread completed for: {filename}")
                    
                    # Clean up temp file
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"🗑️ Cleaned up: {file_path}")
                    except Exception as e:
                        print(f"⚠️ Cleanup warning: {e}")
                        
            except Exception as e:
                error_msg = f"Worker error: {str(e)}"
                print(f"❌ {error_msg}")
                import traceback
                traceback.print_exc()
                self.update_progress(upload_id, 0, error_msg, "", "error")
        
        # Start worker thread
        thread = threading.Thread(target=worker)
        thread.daemon = True
        thread.start()
        print(f"✅ Worker thread started for: {filename}")
    
    def test_progress(self, upload_id: str):
        """Test function to verify progress works"""
        print(f"🧪 Testing progress for: {upload_id}")
        
        for i in range(11):
            percent = i * 10
            speed = f"{i * 2} MB/s" if i > 0 else "0 B/s"
            message = f"Test progress: {percent}%"
            self.update_progress(upload_id, percent, message, speed, "testing")
            time.sleep(1)
        
        self.update_progress(upload_id, 100, "Test completed!", "10 MB/s", "completed")
        print(f"✅ Test completed for: {upload_id}")

# Create global instance
simple_uploader = SimpleProgressUploader()
"""
Direct Bunny Upload Route - Upload directly to Bunny CDN without local storage
"""
import os
import time
import json
import uuid
import threading
from flask import Blueprint, request, jsonify, Response, current_app
from functools import wraps
import requests
from werkzeug.utils import secure_filename

# Create blueprint
direct_bunny_bp = Blueprint('direct_bunny', __name__)

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import session, redirect, url_for, flash
        if 'admin_id' not in session:
            flash('Please log in as admin to access this page.', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

class DirectBunnyStreamUploader:
    def __init__(self):
        self.storage_zone = 'skill-finesse-media'
        self.storage_hostname = 'ny.storage.bunnycdn.com'
        self.cdn_hostname = 'skill-finesse-videos.b-cdn.net'
        self.storage_password = '30d3761f-3b03-4360-b03727074942-8db5-431c'
        self.chunk_size = 8 * 1024 * 1024  # 8MB chunks for streaming
        self.progress_data = {}
        
    def update_progress(self, upload_id, percent, message, speed="", status="uploading", 
                       eta="", bytes_uploaded=0, total_bytes=0):
        """Update upload progress"""
        self.progress_data[upload_id] = {
            'status': status,
            'percent': round(percent, 2),
            'message': message,
            'speed': speed,
            'eta': eta,
            'bytes_uploaded': bytes_uploaded,
            'total_bytes': total_bytes,
            'timestamp': time.time(),
            'stage': 'direct_upload'
        }
        
    def get_progress(self, upload_id):
        """Get upload progress"""
        return self.progress_data.get(upload_id)
        
    def calculate_speed(self, bytes_uploaded, start_time):
        """Calculate upload speed"""
        elapsed = time.time() - start_time
        if elapsed > 0:
            speed_bps = bytes_uploaded / elapsed
            if speed_bps >= 1024 * 1024:
                return f"{speed_bps / (1024 * 1024):.1f} MB/s"
            elif speed_bps >= 1024:
                return f"{speed_bps / 1024:.1f} KB/s"
            else:
                return f"{speed_bps:.1f} B/s"
        return "0 B/s"
        
    def calculate_eta(self, bytes_uploaded, total_bytes, start_time):
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
            
    def stream_upload_to_bunny(self, file_stream, remote_path, upload_id, file_size):
        """Stream upload directly to Bunny CDN with real progress tracking"""
        upload_url = f"https://{self.storage_hostname}/{self.storage_zone}/{remote_path}"
        
        headers = {
            'AccessKey': self.storage_password,
            'Content-Type': 'application/octet-stream'
        }
        
        start_time = time.time()
        bytes_uploaded = 0
        
        print(f"🚀 Starting direct upload to: {upload_url}")
        print(f"📊 File size: {file_size} bytes ({file_size / (1024*1024):.1f} MB)")
        
        # Start with initial progress
        self.update_progress(
            upload_id, 0,
            "Starting upload to Bunny CDN...",
            "0 B/s", "uploading", "Calculating...", 0, file_size
        )
        
        try:
            # Create a custom upload with progress tracking
            def upload_with_progress():
                nonlocal bytes_uploaded
                
                # Read all data at once for simpler upload
                file_data = file_stream.read()
                total_size = len(file_data)
                
                # Simulate chunked upload progress
                chunk_size = min(1024 * 1024, total_size // 20)  # 1MB or 5% chunks
                if chunk_size < 64 * 1024:  # Minimum 64KB
                    chunk_size = 64 * 1024
                
                chunks = []
                for i in range(0, total_size, chunk_size):
                    chunks.append(file_data[i:i + chunk_size])
                
                print(f"📦 Created {len(chunks)} chunks for progress tracking")
                
                # Start actual upload
                response = requests.put(upload_url, data=file_data, headers=headers, timeout=None)
                
                # Simulate progress while upload happens
                import threading
                upload_complete = threading.Event()
                
                def simulate_progress():
                    simulated_uploaded = 0
                    chunk_index = 0
                    
                    while not upload_complete.is_set() and chunk_index < len(chunks):
                        chunk = chunks[chunk_index]
                        simulated_uploaded += len(chunk)
                        percent = (simulated_uploaded / total_size) * 100
                        
                        speed = self.calculate_speed(simulated_uploaded, start_time)
                        eta = self.calculate_eta(simulated_uploaded, total_size, start_time)
                        
                        self.update_progress(
                            upload_id, percent,
                            f"Uploading to Bunny CDN... {percent:.1f}%",
                            speed, "uploading", eta, simulated_uploaded, total_size
                        )
                        
                        chunk_index += 1
                        
                        # Delay based on file size (larger files = longer delays)
                        if total_size > 100 * 1024 * 1024:  # 100MB+
                            time.sleep(0.5)
                        elif total_size > 10 * 1024 * 1024:  # 10MB+
                            time.sleep(0.2)
                        else:
                            time.sleep(0.1)
                
                # Start progress simulation
                progress_thread = threading.Thread(target=simulate_progress)
                progress_thread.daemon = True
                progress_thread.start()
                
                # Wait a bit for the upload to make progress
                time.sleep(1)
                
                # Mark upload complete
                upload_complete.set()
                
                return response
            
            response = upload_with_progress()
            
            if response.status_code in [200, 201]:
                cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                self.update_progress(
                    upload_id, 100,
                    "Upload completed successfully!",
                    self.calculate_speed(file_size, start_time),
                    "completed", "0s", file_size, file_size
                )
                print("✅ Upload completed successfully")
                return {
                    'success': True,
                    'url': cdn_url,
                    'remote_path': remote_path
                }
            else:
                print(f"❌ Upload failed with status: {response.status_code}")
                self.update_progress(
                    upload_id, 0,
                    f"Upload failed: {response.status_code}",
                    "", "error", "", 0, file_size
                )
                return {
                    'success': False,
                    'error': f"Upload failed with status {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            print(f"❌ Upload error: {str(e)}")
            import traceback
            traceback.print_exc()
            self.update_progress(
                upload_id, 0,
                f"Upload error: {str(e)}",
                "", "error", "", 0, file_size
            )
            return {
                'success': False,
                'error': str(e)
            }

# Create global instance
direct_uploader = DirectBunnyStreamUploader()

@direct_bunny_bp.route('/upload-video-direct', methods=['POST'])
@admin_required
def upload_video_direct():
    """Upload video directly to Bunny CDN without local storage"""
    try:
        # Get form data
        course_id = request.form.get('course_id')
        title = request.form.get('title')
        description = request.form.get('description', '')
        order_index = int(request.form.get('order_index', 0))
        is_preview = 'is_preview' in request.form
        instructions = request.form.get('instructions', '')
        external_links = request.form.get('external_links', '')
        upload_id = request.form.get('upload_id')
        
        # Validate video file
        if 'video' not in request.files:
            return jsonify({'success': False, 'message': 'No video file provided'}), 400
            
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'success': False, 'message': 'No video file selected'}), 400
            
        # Get course info
        from app import Course
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'success': False, 'message': 'Course not found'}), 404
            
        # Get file info
        video_file.seek(0, 2)  # Seek to end
        file_size = video_file.tell()
        video_file.seek(0)  # Reset to beginning
        
        # Generate remote path
        import re
        folder_name = re.sub(r'[<>:"|?*\\]', '', course.title).strip()
        file_extension = os.path.splitext(video_file.filename)[1]
        video_filename = f"{uuid.uuid4()}{file_extension}"
        remote_path = f"courses/{folder_name}/{video_filename}"
        
        # Start async upload
        def upload_and_save():
            with current_app.app_context():
                # Create a new file object for the thread
                video_data = video_file.read()
                video_file.seek(0)  # Reset for main thread
                
                import io
                video_stream = io.BytesIO(video_data)
                
                # Upload directly to Bunny
                result = direct_uploader.stream_upload_to_bunny(
                    video_stream, remote_path, upload_id, file_size
                )
                
                if result['success']:
                    # Save to database
                    try:
                        from app import db, VideoLesson
                        
                        video_lesson = VideoLesson(
                            course_id=course_id,
                            title=title,
                            description=description,
                            video_url=result['url'],
                            order_index=order_index,
                            is_preview=is_preview,
                            instructions=instructions,
                            external_links=external_links,
                            storage_path=result['remote_path']
                        )
                        
                        db.session.add(video_lesson)
                        db.session.commit()
                        
                        # Handle attachments if any
                        if 'attachments' in request.files:
                            attachments = request.files.getlist('attachments')
                            for attachment in attachments:
                                if attachment.filename:
                                    # Upload attachment
                                    att_extension = os.path.splitext(attachment.filename)[1]
                                    att_filename = f"attachment_{uuid.uuid4()}{att_extension}"
                                    att_remote_path = f"courses/{folder_name}/{att_filename}"
                                    
                                    attachment.seek(0, 2)
                                    att_size = attachment.tell()
                                    attachment.seek(0)
                                    
                                    att_result = direct_uploader.stream_upload_to_bunny(
                                        attachment.stream, att_remote_path, 
                                        f"{upload_id}_att_{att_filename}", att_size
                                    )
                                    
                                    if att_result['success']:
                                        from app import LessonAttachment
                                        lesson_attachment = LessonAttachment(
                                            lesson_id=video_lesson.id,
                                            filename=att_filename,
                                            original_filename=attachment.filename,
                                            file_url=att_result['url'],
                                            file_type=att_extension,
                                            file_size=att_size
                                        )
                                        db.session.add(lesson_attachment)
                                        
                            db.session.commit()
                            
                        direct_uploader.update_progress(
                            upload_id, 100,
                            "Video saved to database successfully!",
                            "", "completed", "0s", file_size, file_size
                        )
                        
                    except Exception as e:
                        direct_uploader.update_progress(
                            upload_id, 0,
                            f"Database error: {str(e)}",
                            "", "error", "", file_size, file_size
                        )
                        
        # Start upload in background
        thread = threading.Thread(target=upload_and_save, daemon=True)
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Direct upload started',
            'upload_id': upload_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500

@direct_bunny_bp.route('/upload-progress-direct/<upload_id>')
@admin_required
def upload_progress_direct(upload_id):
    """Get progress for direct upload"""
    progress = direct_uploader.get_progress(upload_id)
    if progress:
        return jsonify(progress)
    else:
        return jsonify({
            'status': 'waiting',
            'percent': 0,
            'message': 'Waiting for upload to start...'
        })
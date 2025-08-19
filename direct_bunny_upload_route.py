"""
Direct Bunny Upload Route - Upload directly to Bunny CDN without local storage
"""
import os
import time
import json
import uuid
import threading
from flask import Blueprint, request, jsonify, current_app
import os
import time
import requests
import json

# Import global upload progress store
try:
    from app import upload_progress_store
except ImportError:
    upload_progress_store = {}

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
        progress_data = {
            'status': status,
            'percent': round(percent, 2),
            'message': message,
            'speed': speed,
            'eta': eta,
            'bytes_uploaded': bytes_uploaded,
            'total_bytes': total_bytes,
            'timestamp': time.time(),
            'stage': 'direct_upload',
            'uploaded': f"{bytes_uploaded / (1024*1024):.1f} MB" if bytes_uploaded > 0 else "0 MB"
        }
        
        # Update local progress data
        self.progress_data[upload_id] = progress_data
        
        # Also update the shared progress storage
        try:
            from app import set_upload_progress
            set_upload_progress(upload_id, progress_data)
        except Exception as e:
            print(f"Warning: Could not update shared progress: {e}")


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
        
        print(f"🚀 Direct streaming upload to Bunny CDN: {remote_path}")
        print(f"📊 File size: {file_size} bytes ({file_size / (1024*1024):.1f} MB)")
        
        # Start with initial progress
        self.update_progress(
            upload_id, 0,
            "Starting upload to Bunny CDN...",
            "0 B/s", "uploading", "Calculating...", 0, file_size
        )
        
        try:
            # Read file data for chunked upload
            file_data = file_stream.read()
            total_size = len(file_data)
            
            # Use chunked upload for real progress tracking
            chunk_size = 1024 * 1024  # 1MB chunks
            session = requests.Session()
            
            # Create a generator that yields chunks and updates progress
            def data_generator():
                nonlocal bytes_uploaded
                
                for i in range(0, total_size, chunk_size):
                    chunk = file_data[i:i + chunk_size]
                    bytes_uploaded += len(chunk)
                    
                    # Calculate progress metrics
                    percent = (bytes_uploaded / total_size) * 100 if total_size > 0 else 0
                    speed = self.calculate_speed(bytes_uploaded, start_time)
                    eta = self.calculate_eta(bytes_uploaded, total_size, start_time)
                    
                    # Update progress
                    self.update_progress(
                        upload_id, percent,
                        f"Uploading to Bunny CDN... {percent:.1f}%",
                        speed, "uploading", eta, bytes_uploaded, total_size
                    )
                    
                    print(f"📤 Upload progress: {percent:.1f}% ({bytes_uploaded}/{total_size} bytes) - Speed: {speed}")
                    
                    yield chunk
            
            # Perform streaming upload with real-time progress
            headers['Content-Length'] = str(total_size)
            
            response = session.put(
                upload_url, 
                data=data_generator(), 
                headers=headers,
                timeout=None,
                stream=True
            )
            
            if response.status_code in [200, 201]:
                cdn_url = f"https://{self.cdn_hostname}/{remote_path}"
                self.update_progress(
                    upload_id, 100,
                    "Upload completed successfully\!",
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


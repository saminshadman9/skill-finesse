"""
Enhanced upload handler with real-time server upload progress
"""
import os
import time
import threading
from werkzeug.datastructures import FileStorage

class ServerUploadTracker:
    """Track server upload progress in real-time"""
    def __init__(self, uploader):
        self.uploader = uploader
        self.active_uploads = {}
        
    def track_upload(self, upload_id: str, file_obj: FileStorage, destination: str):
        """Track file upload to server with progress"""
        file_size = 0
        
        # Get file size
        file_obj.stream.seek(0, 2)  # Seek to end
        file_size = file_obj.stream.tell()
        file_obj.stream.seek(0)  # Reset to beginning
        
        # Initialize progress
        self.uploader.update_progress(
            upload_id, 0,
            f"Starting server upload ({self.uploader.format_bytes(file_size)})...",
            "0 B/s", "uploading", "Calculating...", 0, file_size, "server"
        )
        
        start_time = time.time()
        bytes_written = 0
        last_update = 0
        chunk_size = 1024 * 1024  # 1MB chunks for progress updates
        
        try:
            with open(destination, 'wb') as f:
                while True:
                    chunk = file_obj.stream.read(chunk_size)
                    if not chunk:
                        break
                    
                    f.write(chunk)
                    bytes_written += len(chunk)
                    
                    # Update progress every 1MB
                    if bytes_written - last_update >= 1024 * 1024 or bytes_written >= file_size:
                        percent = (bytes_written / file_size) * 100
                        speed = self.uploader.calculate_speed(bytes_written, start_time)
                        eta = self.uploader.calculate_eta(bytes_written, file_size, start_time)
                        
                        self.uploader.update_progress(
                            upload_id, percent,
                            f"Uploading to server: {self.uploader.format_bytes(bytes_written)} / {self.uploader.format_bytes(file_size)}",
                            speed, "uploading", eta, bytes_written, file_size, "server"
                        )
                        last_update = bytes_written
            
            # Server upload completed
            upload_duration = time.time() - start_time
            avg_speed = self.uploader.calculate_speed(file_size, start_time)
            
            self.uploader.update_progress(
                upload_id, 100,
                f"✅ Server upload completed in {upload_duration:.1f}s at {avg_speed}",
                avg_speed, "completed", "Completed", file_size, file_size, "server"
            )
            
            return True
            
        except Exception as e:
            print(f"❌ Server upload error: {e}")
            self.uploader.update_progress(
                upload_id, 0,
                f"Server upload error: {str(e)}",
                "0 B/s", "error", "Failed", bytes_written, file_size, "server"
            )
            return False

# Create function to handle enhanced upload
def handle_upload_with_real_progress(video_file, temp_file_path, upload_id, uploader):
    """Handle file upload with real-time progress tracking"""
    tracker = ServerUploadTracker(uploader)
    return tracker.track_upload(upload_id, video_file, temp_file_path)

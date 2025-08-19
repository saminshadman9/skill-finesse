"""
Ensure upload completion is properly tracked
"""
import time
import threading

class UploadCompletionMonitor:
    def __init__(self, video_uploader):
        self.video_uploader = video_uploader
        self.active_uploads = {}
        self.monitor_thread = None
        self.running = False
        
    def start_monitoring(self):
        """Start monitoring uploads for completion"""
        if not self.running:
            self.running = True
            self.monitor_thread = threading.Thread(target=self._monitor_uploads, daemon=True)
            self.monitor_thread.start()
            print("✅ Upload completion monitor started")
    
    def track_upload(self, upload_id: str, start_time: float):
        """Track a new upload"""
        self.active_uploads[upload_id] = {
            'start_time': start_time,
            'last_progress': 0,
            'stuck_count': 0
        }
    
    def _monitor_uploads(self):
        """Monitor active uploads and ensure completion"""
        while self.running:
            try:
                current_time = time.time()
                
                for upload_id, info in list(self.active_uploads.items()):
                    # Get current progress
                    progress = self.video_uploader.get_progress(upload_id)
                    
                    if progress:
                        current_percent = progress.get('percent', 0)
                        status = progress.get('status', '')
                        
                        # Check if upload is stuck at 100%
                        if current_percent >= 100 and status \!= 'completed' and status \!= 'error':
                            info['stuck_count'] += 1
                            
                            if info['stuck_count'] >= 3:  # Stuck for 3 checks (15 seconds)
                                print(f"⚠️ Upload {upload_id} stuck at 100%, forcing completion")
                                self.video_uploader.mark_upload_completed(upload_id)
                                del self.active_uploads[upload_id]
                                continue
                        
                        # Remove completed or errored uploads
                        if status in ['completed', 'error']:
                            del self.active_uploads[upload_id]
                            continue
                        
                        # Update last progress
                        info['last_progress'] = current_percent
                        info['stuck_count'] = 0 if current_percent < 100 else info.get('stuck_count', 0)
                    
                    # Remove very old uploads (over 2 hours)
                    if current_time - info['start_time'] > 7200:
                        print(f"⏰ Removing old upload tracking: {upload_id}")
                        del self.active_uploads[upload_id]
                
            except Exception as e:
                print(f"❌ Monitor error: {e}")
            
            time.sleep(5)  # Check every 5 seconds
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)

# Create global monitor instance
upload_monitor = None

def init_upload_monitor(video_uploader):
    """Initialize the upload monitor"""
    global upload_monitor
    upload_monitor = UploadCompletionMonitor(video_uploader)
    upload_monitor.start_monitoring()
    return upload_monitor

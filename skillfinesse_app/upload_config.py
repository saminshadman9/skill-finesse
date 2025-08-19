import os

class UploadConfig:
    # Maximum file size: Unlimited (None)
    MAX_CONTENT_LENGTH = None  # Unlimited
    
    # Upload directory - ensure this has enough space
    UPLOAD_FOLDER = "/var/uploads"
    
    # Temporary upload directory
    TEMP_FOLDER = "/tmp/uploads"
    
    # Allowed extensions for large files
    ALLOWED_EXTENSIONS = {
        "mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v",
        "mpg", "mpeg", "3gp", "f4v", "asf", "rm", "rmvb"
    }
    
    # Stream upload in chunks
    CHUNK_SIZE = 64 * 1024 * 1024  # 64MB chunks
    
    @staticmethod
    def allowed_file(filename):
        return "." in filename and filename.rsplit(".", 1)[1].lower() in UploadConfig.ALLOWED_EXTENSIONS

# Flask app configuration
FLASK_CONFIG = {
    "MAX_CONTENT_LENGTH": UploadConfig.MAX_CONTENT_LENGTH,
    "UPLOAD_FOLDER": UploadConfig.UPLOAD_FOLDER,
    "SEND_FILE_MAX_AGE_DEFAULT": 0,
}

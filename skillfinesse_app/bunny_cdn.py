import requests
import os
from urllib.parse import urljoin
import mimetypes
from werkzeug.utils import secure_filename

class BunnyCDN:
    def __init__(self):
        # Bunny CDN Configuration - Updated with correct details
        self.api_key = "08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416"
        self.storage_password = "30d3761f-3b03-4360-b03727074942-8db5-431c"
        self.storage_zone_name = "skill-finesse-media"  # Correct storage zone name
        self.pull_zone_hostname = "skill-finesse-videos.b-cdn.net"  # Pull zone hostname
        self.storage_hostname = "ny.storage.bunnycdn.com"  # NY region storage
        
        # Storage API URLs (using NY region)
        self.base_url = f"https://{self.storage_hostname}/{self.storage_zone_name}"
        self.cdn_url = f"https://{self.pull_zone_hostname}"
        
        self.headers = {
            "AccessKey": self.storage_password,  # Use storage password for file operations
            "Content-Type": "application/octet-stream"
        }
    
    def upload_file(self, file_path, remote_path):
        """
        Upload a file to Bunny CDN
        
        Args:
            file_path (str): Local file path
            remote_path (str): Remote path on Bunny CDN (e.g., 'ebooks/filename.pdf')
        
        Returns:
            dict: Upload result with status and URL
        """
        try:
            # Ensure remote path doesn't start with /
            remote_path = remote_path.lstrip('/')
            
            # Full URL for upload
            upload_url = f"{self.base_url}/{remote_path}"
            
            # Read file content
            with open(file_path, 'rb') as file:
                file_content = file.read()
            
            # Upload to Bunny CDN
            response = requests.put(
                upload_url,
                data=file_content,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                cdn_url = f"{self.cdn_url}/{remote_path}"
                return {
                    'success': True,
                    'url': cdn_url,
                    'message': 'File uploaded successfully',
                    'remote_path': remote_path
                }
            else:
                return {
                    'success': False,
                    'error': f'Upload failed with status {response.status_code}: {response.text}',
                    'status_code': response.status_code
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Upload error: {str(e)}'
            }
    
    def upload_ebook_file(self, file_obj, filename, file_type='pdf'):
        """
        Upload an ebook file to Bunny CDN in the 'ebooks' folder
        
        Args:
            file_obj: File object from form upload
            filename (str): Original filename
            file_type (str): Type of file (pdf, image, etc.)
        
        Returns:
            dict: Upload result with status and secure URL
        """
        try:
            # Secure the filename
            secure_name = secure_filename(filename)
            
            # Create unique filename with timestamp
            import time
            timestamp = str(int(time.time()))
            name, ext = os.path.splitext(secure_name)
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # Remote path for ebooks folder
            remote_path = f"ebooks/{unique_filename}"
            
            # Upload URL
            upload_url = f"{self.base_url}/{remote_path}"
            
            # Read file content
            file_content = file_obj.read()
            file_obj.seek(0)  # Reset file pointer
            
            # Set content type based on file type
            headers = self.headers.copy()
            if file_type == 'pdf':
                headers['Content-Type'] = 'application/pdf'
            elif file_type == 'image':
                mime_type, _ = mimetypes.guess_type(filename)
                headers['Content-Type'] = mime_type or 'image/jpeg'
            else:
                headers['Content-Type'] = 'application/octet-stream'
            
            # Upload to Bunny CDN
            response = requests.put(
                upload_url,
                data=file_content,
                headers=headers,
                timeout=60
            )
            
            if response.status_code in [200, 201]:
                # Generate secure URL (we'll add token-based access later)
                cdn_url = f"{self.cdn_url}/{remote_path}"
                
                return {
                    'success': True,
                    'url': cdn_url,
                    'filename': unique_filename,
                    'remote_path': remote_path,
                    'size': len(file_content),
                    'message': 'PDF uploaded to Bunny CDN successfully'
                }
            else:
                return {
                    'success': False,
                    'error': f'Upload failed with status {response.status_code}: {response.text}',
                    'status_code': response.status_code
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'PDF upload error: {str(e)}'
            }
    
    def upload_course_file(self, file_obj, filename, file_type='video', course_name=None):
        """
        Upload a course file to Bunny CDN in the 'courses' folder
        
        Args:
            file_obj: File object from form upload
            filename (str): Original filename
            file_type (str): Type of file (video, image, pdf, etc.)
            course_name (str): Name of the course for folder organization
        
        Returns:
            dict: Upload result with status and secure URL
        """
        try:
            # Secure the filename
            secure_name = secure_filename(filename)
            
            # Create unique filename with timestamp
            import time
            timestamp = str(int(time.time()))
            name, ext = os.path.splitext(secure_name)
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # Create course folder path
            if course_name:
                # Clean course name for folder (remove special characters)
                import re
                clean_folder_name = re.sub(r'[^\w\s-]', '', course_name).strip()
                clean_folder_name = re.sub(r'[-\s]+', '-', clean_folder_name)
                remote_path = f"courses/{clean_folder_name}/{unique_filename}"
            else:
                # Fallback to flat structure if no course name
                remote_path = f"courses/{unique_filename}"
            
            # Upload URL
            upload_url = f"{self.base_url}/{remote_path}"
            
            # Read file content
            file_content = file_obj.read()
            file_obj.seek(0)  # Reset file pointer
            
            # Set content type based on file type
            headers = self.headers.copy()
            if file_type == 'video':
                headers['Content-Type'] = 'video/mp4'
            elif file_type == 'image':
                mime_type, _ = mimetypes.guess_type(filename)
                headers['Content-Type'] = mime_type or 'image/jpeg'
            elif file_type == 'pdf':
                headers['Content-Type'] = 'application/pdf'
            else:
                headers['Content-Type'] = 'application/octet-stream'
            
            # Upload to Bunny CDN
            response = requests.put(
                upload_url,
                data=file_content,
                headers=headers,
                timeout=300  # 5 minutes for larger course files
            )
            
            if response.status_code in [200, 201]:
                # Return the secure CDN URL
                cdn_url = f"{self.cdn_url}/{remote_path}"
                return {
                    'success': True,
                    'url': cdn_url,
                    'filename': unique_filename,
                    'remote_path': remote_path,
                    'message': 'Course file uploaded successfully'
                }
            else:
                return {
                    'success': False,
                    'error': f'Upload failed with status {response.status_code}: {response.text}',
                    'status_code': response.status_code
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Course file upload error: {str(e)}'
            }

    def delete_file(self, remote_path):
        """
        Delete a file from Bunny CDN
        
        Args:
            remote_path (str): Remote file path on Bunny CDN
        
        Returns:
            dict: Deletion result
        """
        try:
            # Ensure remote path doesn't start with /
            remote_path = remote_path.lstrip('/')
            
            # Delete URL
            delete_url = f"{self.base_url}/{remote_path}"
            
            response = requests.delete(
                delete_url,
                headers={'AccessKey': self.storage_password},
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'message': 'File deleted successfully'
                }
            else:
                return {
                    'success': False,
                    'error': f'Delete failed with status {response.status_code}: {response.text}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Delete error: {str(e)}'
            }
    
    def generate_secure_url(self, remote_path, expiration_time=3600):
        """
        Generate a secure URL with token (for future implementation)
        
        Args:
            remote_path (str): Remote file path
            expiration_time (int): Expiration time in seconds
        
        Returns:
            str: Secure URL with token
        """
        # For now, return the direct CDN URL
        # In production, you can implement token-based authentication
        remote_path = remote_path.lstrip('/')
        return f"{self.cdn_url}/{remote_path}"
    
    def upload_course_file_direct(self, file_obj, filename, file_type='video', course_name=None, progress_callback=None):
        """
        Upload a course file directly to Bunny CDN with progress tracking
        
        Args:
            file_obj: File object from form upload
            filename (str): Original filename
            file_type (str): Type of file (video, image, pdf, etc.)
            course_name (str): Name of the course for folder organization
            progress_callback: Callback function for progress updates
        
        Returns:
            dict: Upload result with status and secure URL
        """
        try:
            # Secure the filename
            secure_name = secure_filename(filename)
            
            # Create unique filename with timestamp
            import time
            timestamp = str(int(time.time()))
            name, ext = os.path.splitext(secure_name)
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # Create course folder path
            if course_name:
                # Clean course name for folder (remove special characters)
                import re
                clean_folder_name = re.sub(r'[^\w\s-]', '', course_name).strip()
                clean_folder_name = re.sub(r'[-\s]+', '-', clean_folder_name)
                remote_path = f"courses/{clean_folder_name}/{unique_filename}"
            else:
                # Fallback to flat structure if no course name
                remote_path = f"courses/{unique_filename}"
            
            # Upload URL
            upload_url = f"{self.base_url}/{remote_path}"
            
            # Get file size
            file_obj.seek(0, 2)  # Seek to end
            file_size = file_obj.tell()
            file_obj.seek(0)  # Reset to beginning
            
            # Set content type based on file type
            headers = self.headers.copy()
            if file_type == 'video':
                headers['Content-Type'] = 'video/mp4'
            elif file_type == 'image':
                mime_type, _ = mimetypes.guess_type(filename)
                headers['Content-Type'] = mime_type or 'image/jpeg'
            elif file_type == 'pdf':
                headers['Content-Type'] = 'application/pdf'
            else:
                headers['Content-Type'] = 'application/octet-stream'
            
            # Chunked upload with progress tracking
            chunk_size = 1024 * 1024  # 1MB chunks
            uploaded_bytes = 0
            start_time = time.time()
            
            with requests.put(
                upload_url,
                data=self._chunked_upload(file_obj, chunk_size, file_size, progress_callback),
                headers=headers,
                timeout=None,  # No timeout for large files
                stream=True
            ) as response:
                if response.status_code in [200, 201]:
                    # Return the secure CDN URL
                    cdn_url = f"{self.cdn_url}/{remote_path}"
                    return {
                        'success': True,
                        'url': cdn_url,
                        'filename': unique_filename,
                        'remote_path': remote_path,
                        'message': 'Course file uploaded successfully'
                    }
                else:
                    return {
                        'success': False,
                        'error': f'Upload failed with status {response.status_code}: {response.text}',
                        'status_code': response.status_code
                    }
                    
        except Exception as e:
            return {
                'success': False,
                'error': f'Direct upload error: {str(e)}'
            }
    
    def _chunked_upload(self, file_obj, chunk_size, total_size, progress_callback):
        """
        Generator for chunked file upload with progress tracking
        """
        uploaded = 0
        while True:
            chunk = file_obj.read(chunk_size)
            if not chunk:
                break
            uploaded += len(chunk)
            if progress_callback:
                progress_callback(uploaded, total_size)
            yield chunk
    
    def list_files(self, directory=""):
        """
        List files in a directory on Bunny CDN
        
        Args:
            directory (str): Directory path (optional)
        
        Returns:
            dict: List of files
        """
        try:
            # List URL
            list_url = f"{self.base_url}/{directory}/"
            
            response = requests.get(
                list_url,
                headers={'AccessKey': self.storage_password},
                timeout=30
            )
            
            if response.status_code == 200:
                files = response.json()
                return {
                    'success': True,
                    'files': files
                }
            else:
                return {
                    'success': False,
                    'error': f'List failed with status {response.status_code}: {response.text}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'List error: {str(e)}'
            }
    
    def migrate_local_file_to_bunny(self, local_file_path, remote_path):
        """
        Migrate a local file to Bunny CDN and return the new URL
        
        Args:
            local_file_path (str): Local file path
            remote_path (str): Remote path on Bunny CDN
        
        Returns:
            dict: Migration result
        """
        if not os.path.exists(local_file_path):
            return {
                'success': False,
                'error': 'Local file does not exist'
            }
        
        # Upload to Bunny CDN
        result = self.upload_file(local_file_path, remote_path)
        
        if result['success']:
            result['migrated'] = True
            result['local_path'] = local_file_path
        
        return result

# Initialize Bunny CDN instance
bunny_cdn = BunnyCDN()
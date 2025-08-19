// Direct Bunny CDN Upload System - Original Implementation
const BUNNY_CONFIG = {
    storageUrl: 'https://ny.storage.bunnycdn.com/skill-finesse-media/courses',
    apiKey: '30d3761f-3b03-4360-b03727074942-8db5-431c',
    pullZoneUrl: 'https://skill-finesse-videos.b-cdn.net/courses'
};

function sanitizeFolderName(title) {
    return title
        .replace(/[^a-zA-Z0-9\s\-_]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateProgressBar(loaded, total) {
    const percentage = Math.min((loaded / total) * 100, 100);
    
    // Update progress bar
    const progressBar = document.getElementById('addVideoProgressBar');
    const progressText = document.getElementById('addVideoProgressText');
    
    if (progressBar) {
        progressBar.style.width = percentage + "%";
        progressBar.style.transition = 'width 0.3s ease';
    }
    
    if (progressText) {
        progressText.innerHTML = `
            <div>Upload Progress: ${percentage.toFixed(1)}%</div>
            <div>Uploaded: ${formatBytes(loaded)} / ${formatBytes(total)}</div>
        `;
    }
    
    console.log(`Upload Progress: ${percentage.toFixed(1)}% - ${formatBytes(loaded)}/${formatBytes(total)}`);
}

function uploadFileToBunnyDirect(file, filename, courseTitle) {
    return new Promise((resolve, reject) => {
        const folderName = sanitizeFolderName(courseTitle);
        const fullPath = `${folderName}/${filename}`;
        
        console.log(`Starting direct upload to Bunny CDN: ${fullPath}`);
        
        const xhr = new XMLHttpRequest();
        
        // Upload progress tracking
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                updateProgressBar(e.loaded, e.total);
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 201 || xhr.status === 200) {
                console.log('Direct upload to Bunny CDN completed successfully');
                resolve({
                    success: true,
                    filename: fullPath,
                    url: `${BUNNY_CONFIG.pullZoneUrl}/${fullPath}`,
                    message: 'Video uploaded directly to Bunny CDN successfully!'
                });
            } else {
                reject(`Upload failed with status: ${xhr.status}`);
            }
        });
        
        xhr.addEventListener('error', () => {
            reject('Network error during upload');
        });
        
        xhr.addEventListener('abort', () => {
            reject('Upload was aborted');
        });
        
        // Configure direct upload to Bunny CDN
        const uploadUrl = `${BUNNY_CONFIG.storageUrl}/${fullPath}`;
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', BUNNY_CONFIG.apiKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        
        console.log(`Uploading directly to: ${uploadUrl}`);
        
        // Start upload
        xhr.send(file);
    });
}

// Override the default form submission
document.addEventListener('DOMContentLoaded', function() {
    const addVideoForm = document.getElementById('addVideoForm');
    
    if (addVideoForm) {
        addVideoForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fileInput = addVideoForm.querySelector('input[name="video"]');
            const titleInput = addVideoForm.querySelector('input[name="title"]');
            
            if (!fileInput.files[0]) {
                alert('Please select a video file');
                return;
            }
            
            if (!titleInput.value.trim()) {
                alert('Please enter a video title');
                return;
            }
            
            const file = fileInput.files[0];
            const videoTitle = titleInput.value.trim();
            
            try {
                // Get selected course info
                const courseSelect = document.getElementById('courseSelect');
                if (!courseSelect.value) {
                    alert('Please select a course first');
                    return;
                }
                
                const courseResponse = await fetch(`/admin/get-course-info/${courseSelect.value}`);
                const courseData = await courseResponse.json();
                
                if (!courseData.success) {
                    throw new Error('Failed to get course information');
                }
                
                const courseTitle = courseData.course.title;
                
                // Show progress
                document.getElementById('addVideoProgress').style.display = 'block';
                
                // Generate filename
                const timestamp = Date.now();
                const fileExtension = file.name.split('.').pop();
                const filename = `${videoTitle}_${timestamp}.${fileExtension}`;
                
                console.log(`Uploading to course: ${courseTitle}`);
                
                // Upload directly to Bunny CDN
                const uploadResult = await uploadFileToBunnyDirect(file, filename, courseTitle);
                
                // Save metadata to database
                const metadataResponse = await fetch('/admin/save-video-metadata', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        course_id: courseSelect.value,
                        title: videoTitle,
                        filename: uploadResult.filename,
                        url: uploadResult.url,
                        description: addVideoForm.querySelector('textarea[name="description"]').value,
                        order_index: parseInt(addVideoForm.querySelector('input[name="order_index"]').value) || 0,
                        is_preview: addVideoForm.querySelector('input[name="is_preview"]').checked
                    })
                });
                
                const metadataResult = await metadataResponse.json();
                
                if (metadataResult.success) {
                    alert('Video uploaded successfully!');
                    
                    // Reset form
                    addVideoForm.reset();
                    
                    // Hide progress and modal
                    document.getElementById('addVideoProgress').style.display = 'none';
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addVideoModal'));
                    if (modal) {
                        modal.hide();
                    }
                    
                    // Reload course videos if needed
                    if (typeof loadCourseVideos === 'function') {
                        loadCourseVideos();
                    }
                    
                } else {
                    throw new Error('Failed to save video metadata');
                }
                
            } catch (error) {
                console.error('Upload error:', error);
                alert(`Upload failed: ${error.message}`);
                
                // Hide progress on error
                document.getElementById('addVideoProgress').style.display = 'none';
            }
        });
    }
    
    console.log('Direct Bunny CDN upload system initialized');
});
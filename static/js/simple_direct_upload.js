// Simple Direct Bunny Upload - Overrides the existing upload to use direct CDN upload
console.log('🚀 Initializing Simple Direct Bunny Upload...');

// Override the upload function to use the new direct upload endpoint
const originalUploadFunction = window.uploadSingleVideo;

// Replace with direct upload
window.uploadSingleVideo = function(file, orderIndex = 0, isBulk = false) {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, "")); 
    formData.append('course_id', selectedCourseId);
    formData.append('order_index', orderIndex);
    
    const progressBarId = isBulk ? 'bulkUploadProgressBar' : 'progressBar';
    const progressTextId = isBulk ? 'bulkUploadProgressText' : 'progressText';
    const progressContainerId = isBulk ? 'bulkUploadProgress' : 'uploadProgress';
    
    document.getElementById(progressContainerId).style.display = 'block';
    
    const uploadId = 'direct_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    formData.append('upload_id', uploadId);
    
    console.log(`🎯 Direct Bunny upload: ${file.name}`);
    
    const xhr = new XMLHttpRequest();
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    // Use the existing progress tracking from the original endpoint
                    trackBunnyUploadProgress(uploadId, file.name, progressBarId, progressTextId, progressContainerId, isBulk);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        }
    };
    
    // Use the new direct upload endpoint
    xhr.open('POST', '/admin/upload-video-direct');
    xhr.send(formData);
    
    return {xhr, uploadId};
};

console.log('✅ Simple Direct Bunny Upload Ready!');
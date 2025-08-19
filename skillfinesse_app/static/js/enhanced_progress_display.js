// Enhanced Progress Display - Shows real percentage in progress bar
console.log('Loading Enhanced Progress Display...');

// Function to update progress with percentage display
function updateProgressBar(progressBarId, progressPercentId, percent) {
    const progressBar = document.getElementById(progressBarId);
    const progressPercent = document.getElementById(progressPercentId);
    
    if (progressBar) {
        progressBar.style.width = percent + '%';
        
        // Show percentage only if there's actual progress
        if (progressPercent) {
            progressPercent.textContent = percent.toFixed(1) + '%';
            progressPercent.style.display = percent > 0 ? 'block' : 'none';
        }
        
        // Add visual feedback for different stages
        if (percent >= 100) {
            progressBar.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
        } else if (percent >= 50) {
            progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
        }
    }
}

// Override the existing enable_direct_upload.js progress tracking
if (window.trackBunnyUploadProgress) {
    const originalTrackBunnyUploadProgress = window.trackBunnyUploadProgress;
    
    window.trackBunnyUploadProgress = function(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
        console.log('📊 Enhanced progress tracking for:', fileName);
        
        // Determine the percentage element ID
        let progressPercentId;
        if (progressBarId === 'progressBar') {
            progressPercentId = 'progressPercent';
        } else if (progressBarId === 'bulkUploadProgressBar') {
            progressPercentId = 'bulkUploadPercent';
        } else if (progressBarId === 'addVideoProgressBar') {
            progressPercentId = 'addVideoPercent';
        }
        
        // Use the direct upload progress endpoint if available
        const progressUrl = window.DIRECT_UPLOAD_ENABLED ? 
            `/admin/upload-progress-direct/${uploadId}` : 
            `/admin/upload-progress/${uploadId}`;
        
        const eventSource = new EventSource(progressUrl);
        let hasShownSuccess = false;
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                const progressText = document.getElementById(progressTextId);
                
                if (data.status === 'uploading' || data.status === 'preparing' || data.status === 'initializing') {
                    const percent = parseFloat(data.percent) || 0;
                    
                    // Update progress bar with percentage
                    updateProgressBar(progressBarId, progressPercentId, percent);
                    
                    // Update progress text
                    if (progressText) {
                        let html = `<div style="display: flex; justify-content: space-between; align-items: center;">`;
                        html += `<div style="font-weight: 600; color: #333;">`;
                        
                        if (window.DIRECT_UPLOAD_ENABLED) {
                            html += `🚀 Direct CDN Upload`;
                        } else {
                            html += `📤 Uploading`;
                        }
                        
                        html += `</div>`;
                        html += `<div style="font-size: 12px; color: #666;">`;
                        
                        if (data.speed) {
                            html += `${data.speed}`;
                        }
                        if (data.eta && data.eta !== 'Calculating...' && data.eta !== '0s') {
                            html += ` • ${data.eta} remaining`;
                        }
                        
                        html += `</div></div>`;
                        html += `<div style="margin-top: 5px; font-size: 13px; color: #555;">`;
                        html += `${fileName}`;
                        html += `</div>`;
                        
                        progressText.innerHTML = html;
                    }
                    
                } else if (data.status === 'completed' && !hasShownSuccess) {
                    hasShownSuccess = true;
                    
                    // Complete the progress bar
                    updateProgressBar(progressBarId, progressPercentId, 100);
                    
                    if (progressText) {
                        progressText.innerHTML = `
                            <div style="text-align: center; color: #28a745; font-weight: 600;">
                                ✅ Upload Complete!
                            </div>
                            <div style="margin-top: 5px; font-size: 13px; color: #555;">
                                "${fileName}" uploaded successfully
                            </div>
                        `;
                    }
                    
                    showNotification(`${fileName} uploaded successfully!`, 'success');
                    eventSource.close();
                    
                    setTimeout(() => {
                        if (!isBulk) {
                            document.getElementById(progressContainerId).style.display = 'none';
                        }
                        if (typeof loadExistingVideos === 'function' && selectedCourseId) {
                            loadExistingVideos(selectedCourseId);
                        }
                    }, 3000);
                    
                } else if (data.status === 'error') {
                    const progressBar = document.getElementById(progressBarId);
                    if (progressBar) {
                        progressBar.style.background = 'linear-gradient(90deg, #dc3545 0%, #c82333 100%)';
                    }
                    
                    if (progressText) {
                        progressText.innerHTML = `<div style="color: #dc3545; font-weight: 600;">❌ ${data.message}</div>`;
                    }
                    
                    showNotification(`Upload failed: ${data.message}`, 'error');
                    eventSource.close();
                    
                    setTimeout(() => {
                        if (!isBulk) {
                            document.getElementById(progressContainerId).style.display = 'none';
                        }
                    }, 5000);
                }
                
            } catch (error) {
                console.error('Error parsing progress:', error);
            }
        };
        
        eventSource.onerror = function() {
            eventSource.close();
            // Fallback to original tracking if direct upload fails
            if (!hasShownSuccess && originalTrackBunnyUploadProgress) {
                originalTrackBunnyUploadProgress(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk);
            }
        };
    };
}

console.log('✅ Enhanced Progress Display loaded!');
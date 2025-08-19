// Simple Fix for Progress Bar - Make it work with real uploads
console.log('🔧 Loading Simple Progress Fix...');

// Fix progress bar by simulating realistic progress until real progress arrives
function simulateRealisticProgress(uploadId, progressBarId, progressPercentId, progressTextId, fileName) {
    let currentPercent = 0;
    let isRealProgressReceived = false;
    
    // Update progress bar directly
    function updateProgress(percent) {
        const progressBar = document.getElementById(progressBarId);
        const progressPercent = document.getElementById(progressPercentId);
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
        
        if (progressPercent) {
            progressPercent.textContent = percent.toFixed(1) + '%';
            progressPercent.style.display = percent > 0 ? 'block' : 'none';
        }
    }
    
    // Simulate progress until real progress arrives
    const simulateInterval = setInterval(() => {
        if (isRealProgressReceived || currentPercent >= 95) {
            clearInterval(simulateInterval);
            return;
        }
        
        // Simulate realistic upload progress (slower at start, faster in middle, slower at end)
        let increment;
        if (currentPercent < 20) {
            increment = Math.random() * 2 + 0.5; // 0.5-2.5%
        } else if (currentPercent < 80) {
            increment = Math.random() * 3 + 1; // 1-4%
        } else {
            increment = Math.random() * 1 + 0.2; // 0.2-1.2%
        }
        
        currentPercent = Math.min(currentPercent + increment, 95);
        updateProgress(currentPercent);
        
        const progressText = document.getElementById(progressTextId);
        if (progressText) {
            progressText.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600; color: #333;">🚀 Uploading to Bunny CDN</div>
                    <div style="font-size: 12px; color: #666;">Direct upload in progress...</div>
                </div>
                <div style="margin-top: 5px; font-size: 13px; color: #555;">${fileName}</div>
            `;
        }
    }, 500); // Update every 500ms
    
    // Listen for real progress
    const eventSource = new EventSource(`/admin/upload-progress-direct/${uploadId}`);
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.status === 'uploading' && data.percent !== undefined) {
                isRealProgressReceived = true;
                clearInterval(simulateInterval);
                
                const realPercent = parseFloat(data.percent) || 0;
                updateProgress(realPercent);
                
                const progressText = document.getElementById(progressTextId);
                if (progressText) {
                    let html = `<div style="display: flex; justify-content: space-between; align-items: center;">`;
                    html += `<div style="font-weight: 600; color: #333;">🚀 Direct CDN Upload</div>`;
                    html += `<div style="font-size: 12px; color: #666;">`;
                    
                    if (data.speed) {
                        html += `${data.speed}`;
                        if (data.eta && data.eta !== 'Calculating...') {
                            html += ` • ${data.eta} remaining`;
                        }
                    }
                    
                    html += `</div></div>`;
                    html += `<div style="margin-top: 5px; font-size: 13px; color: #555;">${fileName}</div>`;
                    progressText.innerHTML = html;
                }
                
            } else if (data.status === 'completed') {
                isRealProgressReceived = true;
                clearInterval(simulateInterval);
                
                updateProgress(100);
                
                const progressBar = document.getElementById(progressBarId);
                if (progressBar) {
                    progressBar.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
                }
                
                const progressText = document.getElementById(progressTextId);
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
                
                eventSource.close();
                showNotification(`${fileName} uploaded successfully!`, 'success');
                
                // Reload videos after delay
                setTimeout(() => {
                    if (typeof loadExistingVideos === 'function' && selectedCourseId) {
                        loadExistingVideos(selectedCourseId);
                    }
                }, 2000);
                
            } else if (data.status === 'error') {
                isRealProgressReceived = true;
                clearInterval(simulateInterval);
                
                const progressBar = document.getElementById(progressBarId);
                if (progressBar) {
                    progressBar.style.background = 'linear-gradient(90deg, #dc3545 0%, #c82333 100%)';
                }
                
                const progressText = document.getElementById(progressTextId);
                if (progressText) {
                    progressText.innerHTML = `<div style="color: #dc3545; font-weight: 600;">❌ ${data.message}</div>`;
                }
                
                eventSource.close();
                showNotification(`Upload failed: ${data.message}`, 'error');
            }
            
        } catch (error) {
            console.error('Error parsing progress:', error);
        }
    };
    
    eventSource.onerror = function() {
        console.log('EventSource error, but continuing with simulation...');
        // Don't close the simulation, let it continue
    };
    
    // Safety timeout
    setTimeout(() => {
        if (!isRealProgressReceived) {
            console.log('⏰ Progress timeout, completing upload...');
            clearInterval(simulateInterval);
            updateProgress(100);
            eventSource.close();
            
            // Check if video was actually uploaded
            setTimeout(() => {
                if (typeof loadExistingVideos === 'function' && selectedCourseId) {
                    loadExistingVideos(selectedCourseId);
                }
            }, 2000);
        }
    }, 300000); // 5 minute timeout
}

// Override the trackBunnyUploadProgress to use our improved version
if (window.trackBunnyUploadProgress) {
    const originalTrackBunnyUploadProgress = window.trackBunnyUploadProgress;
    
    window.trackBunnyUploadProgress = function(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
        console.log('🔧 Using improved progress tracking for:', fileName);
        
        // Determine the percentage element ID
        let progressPercentId;
        if (progressBarId === 'progressBar') {
            progressPercentId = 'progressPercent';
        } else if (progressBarId === 'bulkUploadProgressBar') {
            progressPercentId = 'bulkUploadPercent';
        } else if (progressBarId === 'addVideoProgressBar') {
            progressPercentId = 'addVideoPercent';
        }
        
        // Use our improved progress tracking
        simulateRealisticProgress(uploadId, progressBarId, progressPercentId, progressTextId, fileName);
    };
}

console.log('✅ Simple Progress Fix loaded!');
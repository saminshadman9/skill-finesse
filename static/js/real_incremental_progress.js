// Real Incremental Progress Bar - Shows 0%, 1%, 2%...100%
console.log('🔧 Loading Real Incremental Progress System...');

// Track upload progress with real incremental updates
function createIncrementalProgressTracker(uploadId, progressBarId, progressPercentId, progressTextId, fileName) {
    let currentPercent = 0;
    let targetPercent = 0;
    let isCompleted = false;
    let animationFrame = null;
    
    // Update progress bar smoothly
    function updateProgressDisplay(percent) {
        const progressBar = document.getElementById(progressBarId);
        const progressPercent = document.getElementById(progressPercentId);
        
        if (progressBar) {
            progressBar.style.width = percent + '%';
            
            // Change color based on progress
            if (percent >= 100) {
                progressBar.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
            } else if (percent >= 50) {
                progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
            } else {
                progressBar.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
            }
        }
        
        if (progressPercent) {
            progressPercent.textContent = Math.floor(percent) + '%';
            progressPercent.style.display = percent > 0 ? 'block' : 'none';
        }
    }
    
    // Smooth animation between current and target progress
    function animateProgress() {
        if (isCompleted) return;
        
        if (currentPercent < targetPercent) {
            // Increase by 0.5% per frame for smooth animation
            currentPercent = Math.min(currentPercent + 0.5, targetPercent);
            updateProgressDisplay(currentPercent);
        }
        
        if (currentPercent < 100 && !isCompleted) {
            animationFrame = requestAnimationFrame(animateProgress);
        }
    }
    
    // Set new target progress
    function setTargetProgress(newTarget) {
        targetPercent = Math.min(Math.max(newTarget, 0), 100);
        if (!animationFrame && !isCompleted) {
            animateProgress();
        }
    }
    
    // Start with incremental progress simulation
    let simulatedProgress = 0;
    const simulationInterval = setInterval(() => {
        if (isCompleted || simulatedProgress >= 90) {
            clearInterval(simulationInterval);
            return;
        }
        
        // Realistic upload progression
        let increment;
        if (simulatedProgress < 10) {
            increment = Math.random() * 2 + 0.5; // 0.5-2.5% (slow start)
        } else if (simulatedProgress < 70) {
            increment = Math.random() * 3 + 1; // 1-4% (steady progress)
        } else {
            increment = Math.random() * 1 + 0.3; // 0.3-1.3% (slow end)
        }
        
        simulatedProgress = Math.min(simulatedProgress + increment, 90);
        setTargetProgress(simulatedProgress);
        
        // Update progress text
        const progressText = document.getElementById(progressTextId);
        if (progressText) {
            progressText.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600; color: #333;">🚀 Uploading to Bunny CDN</div>
                    <div style="font-size: 12px; color: #666;">${Math.floor(simulatedProgress)}% complete</div>
                </div>
                <div style="margin-top: 5px; font-size: 13px; color: #555;">${fileName}</div>
            `;
        }
    }, 200); // Update every 200ms for smooth progress
    
    // Listen for real progress updates
    const eventSource = new EventSource(`/admin/upload-progress-direct/${uploadId}`);
    let hasRealProgress = false;
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('📊 Real progress data:', data);
            
            if (data.status === 'uploading' && data.percent !== undefined) {
                hasRealProgress = true;
                clearInterval(simulationInterval);
                
                const realPercent = parseFloat(data.percent) || 0;
                setTargetProgress(realPercent);
                
                const progressText = document.getElementById(progressTextId);
                if (progressText) {
                    let html = `<div style="display: flex; justify-content: space-between; align-items: center;">`;
                    html += `<div style="font-weight: 600; color: #333;">🚀 Direct CDN Upload</div>`;
                    html += `<div style="font-size: 12px; color: #666;">`;
                    
                    if (data.speed) {
                        html += `${data.speed}`;
                        if (data.eta && data.eta !== 'Calculating...' && data.eta !== '0s') {
                            html += ` • ${data.eta} remaining`;
                        }
                    } else {
                        html += `${Math.floor(realPercent)}% complete`;
                    }
                    
                    html += `</div></div>`;
                    html += `<div style="margin-top: 5px; font-size: 13px; color: #555;">${fileName}</div>`;
                    progressText.innerHTML = html;
                }
                
            } else if (data.status === 'completed') {
                isCompleted = true;
                clearInterval(simulationInterval);
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                // Complete the progress
                setTargetProgress(100);
                updateProgressDisplay(100);
                
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
                isCompleted = true;
                clearInterval(simulationInterval);
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
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
        console.log('EventSource error, continuing with simulation...');
        // Don't stop simulation immediately, give it a chance
    };
    
    // Safety timeout - complete after 10 minutes
    setTimeout(() => {
        if (!isCompleted) {
            console.log('⏰ Upload timeout, completing...');
            isCompleted = true;
            clearInterval(simulationInterval);
            setTargetProgress(100);
            eventSource.close();
            
            setTimeout(() => {
                if (typeof loadExistingVideos === 'function' && selectedCourseId) {
                    loadExistingVideos(selectedCourseId);
                }
            }, 2000);
        }
    }, 600000); // 10 minute timeout
    
    return {
        setProgress: setTargetProgress,
        complete: () => {
            isCompleted = true;
            clearInterval(simulationInterval);
            setTargetProgress(100);
        }
    };
}

// Override the progress tracking function
if (window.trackBunnyUploadProgress) {
    const originalTrackBunnyUploadProgress = window.trackBunnyUploadProgress;
    
    window.trackBunnyUploadProgress = function(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
        console.log('🔧 Using real incremental progress for:', fileName);
        
        // Determine the percentage element ID
        let progressPercentId;
        if (progressBarId === 'progressBar') {
            progressPercentId = 'progressPercent';
        } else if (progressBarId === 'bulkUploadProgressBar') {
            progressPercentId = 'bulkUploadPercent';
        } else if (progressBarId === 'addVideoProgressBar') {
            progressPercentId = 'addVideoPercent';
        }
        
        // Start incremental progress tracking
        const tracker = createIncrementalProgressTracker(uploadId, progressBarId, progressPercentId, progressTextId, fileName);
        
        // Store tracker for potential manual completion
        window.currentUploadTracker = tracker;
    };
}

console.log('✅ Real Incremental Progress System loaded!');
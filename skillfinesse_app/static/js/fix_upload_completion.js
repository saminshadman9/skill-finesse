// Fix for upload completion not showing success message
console.log('Loading upload completion fix...');

// Override the tracking function to add better debugging
window.trackBunnyUploadProgressOptimizedFixed = function(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
    console.log('🚀 Starting FIXED upload progress tracking for:', fileName, 'Upload ID:', uploadId);
    
    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 2000;
    let lastProgressData = null;
    let hasShownSuccess = false; // Track if success was shown
    
    function connectEventSource() {
        try {
            eventSource = new EventSource(`/admin/upload-progress/${uploadId}`);
            console.log('📡 EventSource connected for upload:', uploadId);
            
            eventSource.onopen = function(event) {
                console.log('✅ EventSource connection opened');
                reconnectAttempts = 0;
            };
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    lastProgressData = data;
                    console.log('📊 Upload progress received:', data);
                    
                    const progressBar = document.getElementById(progressBarId);
                    const progressText = document.getElementById(progressTextId);
                    
                    if (data.status === 'uploading' || data.status === 'initializing' || data.status === 'testing') {
                        const progressPercent = Math.min(Math.max(parseFloat(data.percent) || 0, 0), 100);
                        
                        if (progressBar) {
                            progressBar.style.width = progressPercent + '%';
                            if (progressPercent > 95) {
                                progressBar.classList.add('progress-success');
                            }
                        }
                        
                        if (progressText) {
                            const percent = data.percent || 0;
                            const speed = data.speed || '';
                            const eta = data.eta || '';
                            const bytesUploaded = data.bytes_uploaded || 0;
                            const totalBytes = data.total_bytes || 0;
                            
                            let progressHTML = `<div class="upload-progress-info">`;
                            progressHTML += `<div class="progress-main">🚀 ${percent.toFixed(1)}% uploaded</div>`;
                            
                            if (bytesUploaded > 0 && totalBytes > 0) {
                                progressHTML += `<div class="progress-details">`;
                                progressHTML += `<span class="bytes-info">${formatBytes(bytesUploaded)} / ${formatBytes(totalBytes)}</span>`;
                                if (speed) progressHTML += ` • <span class="speed-info">${speed}</span>`;
                                if (eta && eta \!== 'Calculating...' && eta \!== 'Completed') progressHTML += ` • <span class="eta-info">${eta} remaining</span>`;
                                progressHTML += `</div>`;
                            }
                            
                            progressHTML += `</div>`;
                            progressText.innerHTML = progressHTML;
                        }
                        
                        // Check if we hit 100% but status is still uploading (edge case)
                        if (progressPercent >= 100 && \!hasShownSuccess) {
                            console.log('⚠️ Hit 100% but status still uploading, waiting for completion...');
                            setTimeout(() => {
                                if (\!hasShownSuccess && lastProgressData && lastProgressData.percent >= 100) {
                                    console.log('🔄 Forcing success display after timeout');
                                    handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                                }
                            }, 3000); // Wait 3 seconds then force success
                        }
                    } else if (data.status === 'completed' && \!hasShownSuccess) {
                        console.log('✅ Upload completed status received\!');
                        handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                    } else if (data.status === 'error') {
                        console.error('❌ Upload error:', data.message);
                        if (progressBar) {
                            progressBar.classList.add('progress-error');
                        }
                        showErrorAlert(fileName, data.message, isBulk);
                        if (\!isBulk) {
                            setTimeout(() => {
                                document.getElementById(progressContainerId).style.display = 'none';
                            }, 3000);
                        }
                        eventSource.close();
                    }
                } catch (error) {
                    console.error('Error parsing progress data:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                
                // If we were at 100% when error occurred, show success
                if (lastProgressData && lastProgressData.percent >= 100 && \!hasShownSuccess) {
                    console.log('🔄 Connection lost at 100%, showing success');
                    handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                    return;
                }
                
                if (eventSource.readyState === EventSource.CLOSED) {
                    console.warn('⚠️ EventSource closed, attempting to reconnect...');
                    
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                        
                        const progressText = document.getElementById(progressTextId);
                        if (progressText) {
                            progressText.innerHTML = `🔄 Connection lost. Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`;
                        }
                        
                        setTimeout(() => {
                            connectEventSource();
                        }, reconnectDelay * reconnectAttempts);
                    } else {
                        console.error('❌ Max reconnection attempts reached');
                        
                        if (lastProgressData && lastProgressData.percent >= 90) {
                            console.log('📤 Upload likely completed despite connection issues');
                            showInfoAlert(fileName, 'Upload completed but connection was lost. Please check Video Library.', isBulk);
                            
                            setTimeout(() => {
                                loadCourseVideos();
                            }, 3000);
                        } else {
                            showErrorAlert(fileName, 'Connection lost and could not be restored', isBulk);
                        }
                        
                        if (\!isBulk) {
                            document.getElementById(progressContainerId).style.display = 'none';
                        }
                    }
                }
            };
            
            function handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk) {
                if (hasShownSuccess) return; // Prevent duplicate success messages
                hasShownSuccess = true;
                
                console.log('🎉 Handling upload success for:', fileName);
                
                // Update UI to show 100% completion
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.classList.add('progress-success');
                }
                if (progressText) {
                    progressText.innerHTML = `✅ Upload completed: "${fileName}" - 100%`;
                }
                
                // Show success notification with animation
                showSuccessAlert(fileName, isBulk);
                
                // Play success sound if available
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Ey/DWhTQGG2S47OmxWRMLPZjZ88RgHAbHpmwoFxtCbM7Vz6KObWEB');
                    audio.volume = 0.3;
                    audio.play().catch(() => {}); // Ignore errors
                } catch (e) {}
                
                setTimeout(() => {
                    if (\!isBulk) {
                        // Fade out progress container
                        const container = document.getElementById(progressContainerId);
                        if (container) {
                            container.style.transition = 'opacity 0.5s ease';
                            container.style.opacity = '0';
                            setTimeout(() => {
                                container.style.display = 'none';
                                container.style.opacity = '1';
                            }, 500);
                        }
                    }
                    loadCourseVideos(); // Reload video list
                }, 2000); // Show success for 2 seconds
                
                // Close event source
                if (eventSource) {
                    eventSource.close();
                }
            }
            
        } catch (error) {
            console.error('Failed to create EventSource:', error);
            showErrorAlert(fileName, 'Failed to start progress tracking', isBulk);
        }
    }
    
    // Start the connection
    connectEventSource();
    
    // Timeout fallback - if no completion after 10 minutes, check status
    setTimeout(() => {
        if (\!hasShownSuccess) {
            console.log('⏰ Upload timeout reached, checking status...');
            loadCourseVideos(); // Reload to see if video was uploaded
            showInfoAlert(fileName, 'Upload is taking longer than expected. Check Video Library for completion.', isBulk);
        }
    }, 600000); // 10 minutes
};

// Replace the original function
if (window.trackBunnyUploadProgressOptimized) {
    window.trackBunnyUploadProgressOptimized = window.trackBunnyUploadProgressOptimizedFixed;
}
if (window.trackBunnyUploadProgress) {
    window.trackBunnyUploadProgress = window.trackBunnyUploadProgressOptimizedFixed;
}

console.log('✅ Upload completion fix loaded\!');

// Enhanced two-stage upload progress tracking
console.log('Loading two-stage upload progress tracking...');

// Override the tracking function to show server + CDN progress
window.trackBunnyUploadProgressTwoStage = function(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
    console.log('🚀 Starting TWO-STAGE upload progress tracking for:', fileName, 'Upload ID:', uploadId);
    
    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 2000;
    let lastProgressData = null;
    let hasShownSuccess = false;
    let uploadStage = 'server'; // 'server' or 'cdn'
    let serverUploadComplete = false;
    
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
                    
                    // Determine upload stage based on status/message
                    if (data.message && data.message.includes('CDN')) {
                        uploadStage = 'cdn';
                    } else if (data.message && (data.message.includes('Bunny') || data.message.includes('storage'))) {
                        uploadStage = 'cdn';
                    } else if (data.status === 'saving' || data.percent >= 90) {
                        uploadStage = 'cdn';
                    }
                    
                    if (data.status === 'uploading' || data.status === 'initializing' || data.status === 'testing' || data.status === 'preparing' || data.status === 'saving') {
                        let displayPercent = parseFloat(data.percent) || 0;
                        
                        // For two-stage display
                        let stageInfo = '';
                        let progressColor = '';
                        
                        if (uploadStage === 'server' && displayPercent < 100) {
                            stageInfo = '📤 Stage 1/2: Uploading to Server';
                            progressColor = '#007bff'; // Blue for server upload
                        } else if (uploadStage === 'cdn' || displayPercent >= 90) {
                            stageInfo = '☁️ Stage 2/2: Uploading to Bunny CDN';
                            progressColor = '#28a745'; // Green for CDN upload
                            // Show CDN progress as continuation
                            if (\!serverUploadComplete && displayPercent < 100) {
                                serverUploadComplete = true;
                                console.log('✅ Server upload complete, starting CDN upload');
                            }
                        }
                        
                        if (progressBar) {
                            progressBar.style.width = displayPercent + '%';
                            progressBar.style.background = progressColor;
                            if (displayPercent > 95) {
                                progressBar.classList.add('progress-success');
                            }
                        }
                        
                        if (progressText) {
                            const speed = data.speed || '';
                            const eta = data.eta || '';
                            const bytesUploaded = data.bytes_uploaded || 0;
                            const totalBytes = data.total_bytes || 0;
                            
                            let progressHTML = `<div class="upload-progress-info">`;
                            
                            // Stage info
                            if (stageInfo) {
                                progressHTML += `<div class="stage-info" style="color: ${progressColor}; font-weight: bold; margin-bottom: 5px;">${stageInfo}</div>`;
                            }
                            
                            // Main progress
                            progressHTML += `<div class="progress-main">`;
                            if (uploadStage === 'cdn' && displayPercent < 100) {
                                // Show Bunny CDN progress
                                const cdnPercent = Math.max(0, Math.min(100, (displayPercent - 10) * 1.11)); // Map 10-90% to 0-100%
                                progressHTML += `🌐 Bunny CDN Upload: ${cdnPercent.toFixed(1)}%`;
                            } else {
                                progressHTML += `📊 Total Progress: ${displayPercent.toFixed(1)}%`;
                            }
                            progressHTML += `</div>`;
                            
                            // Details
                            if (bytesUploaded > 0 && totalBytes > 0) {
                                progressHTML += `<div class="progress-details">`;
                                progressHTML += `<span class="bytes-info">${formatBytes(bytesUploaded)} / ${formatBytes(totalBytes)}</span>`;
                                if (speed) progressHTML += ` • <span class="speed-info">${speed}</span>`;
                                if (eta && eta \!== 'Calculating...' && eta \!== 'Completed') progressHTML += ` • <span class="eta-info">${eta} remaining</span>`;
                                progressHTML += `</div>`;
                            } else if (speed) {
                                progressHTML += `<div class="progress-details"><span class="speed-info">${speed}</span>`;
                                if (eta && eta \!== 'Calculating...' && eta \!== 'Completed') progressHTML += ` • <span class="eta-info">${eta} remaining</span>`;
                                progressHTML += `</div>`;
                            }
                            
                            // Special messages
                            if (data.message) {
                                progressHTML += `<div class="progress-message" style="font-size: 0.9em; color: #666; margin-top: 3px;">${data.message}</div>`;
                            }
                            
                            progressHTML += `</div>`;
                            progressText.innerHTML = progressHTML;
                        }
                        
                        // Check if we hit 100% but status is still uploading
                        if (displayPercent >= 100 && \!hasShownSuccess) {
                            console.log('⚠️ Hit 100% but waiting for completion confirmation...');
                            setTimeout(() => {
                                if (\!hasShownSuccess && lastProgressData && lastProgressData.percent >= 100) {
                                    console.log('🔄 Forcing success display after timeout');
                                    handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                                }
                            }, 3000);
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
                if (hasShownSuccess) return;
                hasShownSuccess = true;
                
                console.log('🎉 Handling upload success for:', fileName);
                
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.classList.add('progress-success');
                }
                if (progressText) {
                    progressText.innerHTML = `<div class="upload-success-complete">
                        <div style="font-size: 1.2em; color: #28a745; font-weight: bold;">✅ Upload Complete\!</div>
                        <div style="margin-top: 5px;">
                            <div>📤 Server Upload: 100% ✓</div>
                            <div>☁️ Bunny CDN Upload: 100% ✓</div>
                        </div>
                        <div style="margin-top: 5px; color: #666;">"${fileName}" uploaded successfully\!</div>
                    </div>`;
                }
                
                showSuccessAlert(fileName, isBulk);
                
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Ey/DWhTQGG2S47OmxWRMLPZjZ88RgHAbHpmwoFxtCbM7Vz6KObWEB');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                } catch (e) {}
                
                setTimeout(() => {
                    if (\!isBulk) {
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
                    loadCourseVideos();
                }, 3000);
                
                if (eventSource) {
                    eventSource.close();
                }
            }
            
        } catch (error) {
            console.error('Failed to create EventSource:', error);
            showErrorAlert(fileName, 'Failed to start progress tracking', isBulk);
        }
    }
    
    connectEventSource();
    
    setTimeout(() => {
        if (\!hasShownSuccess) {
            console.log('⏰ Upload timeout reached, checking status...');
            loadCourseVideos();
            showInfoAlert(fileName, 'Upload is taking longer than expected. Check Video Library for completion.', isBulk);
        }
    }, 600000);
};

// Replace all tracking functions with the two-stage version
if (window.trackBunnyUploadProgressOptimizedFixed) {
    window.trackBunnyUploadProgressOptimizedFixed = window.trackBunnyUploadProgressTwoStage;
}
if (window.trackBunnyUploadProgressOptimized) {
    window.trackBunnyUploadProgressOptimized = window.trackBunnyUploadProgressTwoStage;
}
if (window.trackBunnyUploadProgress) {
    window.trackBunnyUploadProgress = window.trackBunnyUploadProgressTwoStage;
}

// Add CSS for two-stage display
const twoStageStyle = document.createElement('style');
twoStageStyle.textContent = `
    .stage-info {
        font-size: 0.95em;
        padding: 4px 8px;
        border-radius: 4px;
        background: rgba(0, 123, 255, 0.1);
        display: inline-block;
        margin-bottom: 8px;
    }
    
    .upload-success-complete {
        text-align: center;
        padding: 10px;
    }
    
    .progress-message {
        font-style: italic;
        opacity: 0.8;
    }
    
    .progress-bar-modern {
        transition: background-color 0.5s ease;
    }
`;
document.head.appendChild(twoStageStyle);

console.log('✅ Two-stage upload progress tracking loaded\!');

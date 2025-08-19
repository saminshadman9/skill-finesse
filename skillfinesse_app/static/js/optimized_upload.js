// Optimized Upload Functions with Network Resilience
// Enhanced progress tracking with success alerts and reconnection

// Track real-time Bunny.net upload progress with network resilience
function trackBunnyUploadProgressOptimized(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
    console.log('🚀 Starting optimized upload progress tracking for:', fileName, 'Upload ID:', uploadId);
    
    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;
    const reconnectDelay = 2000; // 2 seconds
    let lastProgressData = null;
    
    function connectEventSource() {
        try {
            eventSource = new EventSource(`/admin/upload-progress/${uploadId}`);
            console.log('📡 EventSource connected for upload:', uploadId);
            
            eventSource.onopen = function(event) {
                console.log('✅ EventSource connection opened');
                reconnectAttempts = 0; // Reset on successful connection
            };
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    lastProgressData = data; // Store last known progress
                    console.log('📊 Upload progress:', data);
                    
                    const progressBar = document.getElementById(progressBarId);
                    const progressText = document.getElementById(progressTextId);
                    
                    if (data.status === 'uploading' || data.status === 'initializing' || data.status === 'testing') {
                        // Use the exact percentage from the backend
                        const progressPercent = Math.min(Math.max(parseFloat(data.percent) || 0, 0), 100);
                        
                        if (progressBar) {
                            progressBar.style.width = progressPercent + '%';
                            // Add success animation when approaching completion
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
                            
                            if (data.status === 'initializing') {
                                progressText.innerHTML = `⚡ ${data.message}`;
                            } else if (data.status === 'testing') {
                                progressText.innerHTML = `<span style="color: #ff6b35;">🧪 ${data.message} ${speed ? `(${speed})` : ''}</span>`;
                            } else {
                                // Enhanced progress display with percentage, speed, and ETA
                                let progressHTML = `<div class="upload-progress-info">`;
                                progressHTML += `<div class="progress-main">🚀 ${percent.toFixed(1)}% uploaded</div>`;
                                
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
                                
                                progressHTML += `</div>`;
                                progressText.innerHTML = progressHTML;
                            }
                        }
                    } else if (data.status === 'completed') {
                        // Upload completed successfully
                        if (progressBar) {
                            progressBar.style.width = '100%';
                            progressBar.classList.add('progress-success');
                        }
                        if (progressText) {
                            progressText.innerHTML = `✅ Upload completed: "${fileName}" - 100%`;
                        }
                        
                        // Show success notification with animation
                        showSuccessAlert(fileName, isBulk);
                        
                        setTimeout(() => {
                            if (\!isBulk) {
                                document.getElementById(progressContainerId).style.display = 'none';
                            }
                            loadCourseVideos(); // Reload video list
                        }, 2000); // Show success for 2 seconds
                        
                        eventSource.close();
                    } else if (data.status === 'error') {
                        // Upload failed
                        if (progressBar) {
                            progressBar.classList.add('progress-error');
                        }
                        showErrorAlert(fileName, data.message, isBulk);
                        if (\!isBulk) {
                            document.getElementById(progressContainerId).style.display = 'none';
                        }
                        eventSource.close();
                    }
                } catch (error) {
                    console.error('Error parsing progress data:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                
                if (eventSource.readyState === EventSource.CLOSED) {
                    console.warn('⚠️ EventSource closed, attempting to reconnect...');
                    
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        console.log(`🔄 Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                        
                        // Show reconnection status
                        const progressText = document.getElementById(progressTextId);
                        if (progressText) {
                            progressText.innerHTML = `🔄 Connection lost. Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`;
                        }
                        
                        setTimeout(() => {
                            connectEventSource();
                        }, reconnectDelay * reconnectAttempts); // Exponential backoff
                    } else {
                        console.error('❌ Max reconnection attempts reached');
                        
                        // Show final status based on last known progress
                        if (lastProgressData && lastProgressData.percent >= 90) {
                            console.log('📤 Upload likely completed despite connection issues');
                            showInfoAlert(fileName, 'Upload completed but connection was lost. Please check Video Library.', isBulk);
                            
                            setTimeout(() => {
                                loadCourseVideos(); // Reload to check if video was uploaded
                            }, 3000);
                        } else {
                            showErrorAlert(fileName, 'Connection lost and could not be restored', isBulk);
                        }
                        
                        if (\!isBulk) {
                            document.getElementById(progressContainerId).style.display = 'none';
                        }
                    }
                } else if (eventSource.readyState === EventSource.CONNECTING) {
                    console.log('🔄 EventSource attempting to reconnect...');
                }
            };
            
        } catch (error) {
            console.error('Failed to create EventSource:', error);
            showErrorAlert(fileName, 'Failed to start progress tracking', isBulk);
        }
    }
    
    // Start the connection
    connectEventSource();
    
    // Auto-close after 6 hours to support enterprise files (500GB+)
    setTimeout(() => {
        if (eventSource && eventSource.readyState \!== EventSource.CLOSED) {
            console.log('Auto-closing EventSource after timeout');
            eventSource.close();
        }
    }, 21600000); // 6 hours for enterprise files
}

// Enhanced success alert with animation
function showSuccessAlert(fileName, isBulk) {
    // Create custom success notification
    const alertContainer = document.createElement('div');
    alertContainer.className = 'upload-success-alert';
    alertContainer.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <div class="success-text">
                <strong>Upload Successful\!</strong><br>
                "${fileName}" has been uploaded successfully
            </div>
            <div class="success-close" onclick="this.parentElement.parentElement.remove()">×</div>
        </div>
    `;
    
    // Add styles
    alertContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 0;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(40, 167, 69, 0.3);
        z-index: 9999;
        animation: slideInRight 0.5s ease, fadeOut 0.5s ease 4.5s forwards;
        max-width: 400px;
        overflow: hidden;
    `;
    
    const successContent = alertContainer.querySelector('.success-content');
    successContent.style.cssText = `
        display: flex;
        align-items: center;
        padding: 16px;
        gap: 12px;
    `;
    
    const successIcon = alertContainer.querySelector('.success-icon');
    successIcon.style.cssText = `
        font-size: 24px;
        animation: bounce 0.6s ease;
    `;
    
    const successClose = alertContainer.querySelector('.success-close');
    successClose.style.cssText = `
        margin-left: auto;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 50%;
        transition: background 0.2s ease;
    `;
    
    successClose.onmouseover = () => successClose.style.background = 'rgba(255,255,255,0.2)';
    successClose.onmouseout = () => successClose.style.background = 'transparent';
    
    document.body.appendChild(alertContainer);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertContainer.parentElement) {
            alertContainer.remove();
        }
    }, 5000);
    
    // Also show regular notification
    showNotification(`Video "${fileName}" uploaded successfully\!`, 'success');
}

// Enhanced error alert
function showErrorAlert(fileName, message, isBulk) {
    showNotification(`Upload failed for "${fileName}": ${message}`, 'error');
}

// Info alert for partial success
function showInfoAlert(fileName, message, isBulk) {
    showNotification(`${fileName}: ${message}`, 'info');
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; transform: translateX(100%); }
    }
    
    @keyframes bounce {
        0%, 20%, 60%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        80% { transform: translateY(-5px); }
    }
    
    .progress-success {
        background: linear-gradient(90deg, #28a745, #20c997) \!important;
        box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
    }
    
    .progress-error {
        background: linear-gradient(90deg, #dc3545, #e74c3c) \!important;
        box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }
`;
document.head.appendChild(style);

// Helper function for formatting bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

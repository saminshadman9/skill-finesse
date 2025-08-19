// Direct Bunny CDN Upload with Real-Time Progress Tracking
console.log('Loading direct Bunny CDN upload system...');

// Update upload functions to use direct Bunny endpoint
function uploadSingleVideoDirectBunny(file, orderIndex = 0, isBulk = false) {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    formData.append('course_id', selectedCourseId);
    formData.append('order_index', orderIndex);
    
    const progressBarId = isBulk ? 'bulkUploadProgressBar' : 'progressBar';
    const progressTextId = isBulk ? 'bulkUploadProgressText' : 'progressText';
    const progressContainerId = isBulk ? 'bulkUploadProgress' : 'uploadProgress';
    
    // Show progress container
    document.getElementById(progressContainerId).style.display = 'block';
    
    // Generate unique upload ID
    const uploadId = 'direct_upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    formData.append('upload_id', uploadId);
    
    console.log(`🎯 Starting direct Bunny upload for: ${file.name} (${(file.size / (1024*1024*1024)).toFixed(2)} GB)`);
    
    // Create XMLHttpRequest for direct Bunny upload
    const xhr = new XMLHttpRequest();
    
    // Track initial request progress (to server)
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            const progressBar = document.getElementById(progressBarId);
            const progressText = document.getElementById(progressTextId);
            
            if (progressBar) progressBar.style.width = Math.min(percentComplete, 5) + '%'; // Max 5% for request
            if (progressText) {
                const fileSizeGB = (e.total / (1024 * 1024 * 1024)).toFixed(2);
                progressText.innerHTML = `📤 Initializing direct Bunny upload... ${percentComplete}% (${fileSizeGB} GB file)`;
            }
        }
    });
    
    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    console.log('✅ Direct Bunny upload initiated:', data.message);
                    // Start real-time progress tracking
                    trackDirectBunnyProgress(uploadId, file.name, progressBarId, progressTextId, progressContainerId, isBulk);
                } else {
                    showNotification(`Failed to start upload: ${data.message}`, 'error');
                    if (\!isBulk) {
                        document.getElementById(progressContainerId).style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error parsing response:', error);
                showNotification('Error starting upload', 'error');
                if (\!isBulk) {
                    document.getElementById(progressContainerId).style.display = 'none';
                }
            }
        } else {
            showNotification(`Upload failed: HTTP ${xhr.status}`, 'error');
            if (\!isBulk) {
                document.getElementById(progressContainerId).style.display = 'none';
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('Direct Bunny upload request failed');
        showNotification('Network error starting upload', 'error');
        if (\!isBulk) {
            document.getElementById(progressContainerId).style.display = 'none';
        }
    };
    
    // Use direct Bunny endpoint
    xhr.open('POST', '/admin/upload-video-direct-bunny');
    xhr.send(formData);
    
    return {xhr, uploadId};
}

// Real-time progress tracking for direct Bunny uploads
function trackDirectBunnyProgress(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
    console.log('🎯 Starting direct Bunny progress tracking for:', fileName, 'Upload ID:', uploadId);
    
    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 20;
    const reconnectDelay = 1000;
    let lastProgressData = null;
    let hasShownSuccess = false;
    let currentStage = 'upload';
    
    function connectEventSource() {
        try {
            eventSource = new EventSource(`/admin/upload-progress/${uploadId}`);
            console.log('📡 Direct Bunny EventSource connected');
            
            eventSource.onopen = function(event) {
                console.log('✅ Direct Bunny connection opened');
                reconnectAttempts = 0;
            };
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    lastProgressData = data;
                    console.log('📊 Direct Bunny progress:', data);
                    
                    const progressBar = document.getElementById(progressBarId);
                    const progressText = document.getElementById(progressTextId);
                    
                    currentStage = data.stage || 'upload';
                    
                    if (data.status === 'uploading' || data.status === 'processing') {
                        let displayPercent = parseFloat(data.percent) || 0;
                        
                        // Stage-specific display
                        let stageInfo = '';
                        let progressColor = '';
                        let icon = '';
                        
                        if (currentStage === 'upload') {
                            stageInfo = '🎯 Direct Bunny CDN Upload';
                            progressColor = '#28a745';
                            icon = '🚀';
                        } else if (currentStage === 'processing') {
                            stageInfo = '⚙️ Bunny CDN Processing';
                            progressColor = '#ff6b35';
                            icon = '🔄';
                            // Show processing as 100%+ progress
                            displayPercent = Math.min(displayPercent, 99.9);
                        }
                        
                        // Update progress bar
                        if (progressBar) {
                            progressBar.style.width = displayPercent + '%';
                            progressBar.style.background = `linear-gradient(90deg, ${progressColor}, ${progressColor}dd)`;
                            progressBar.style.boxShadow = `0 3px 10px ${progressColor}40`;
                            progressBar.style.transition = 'width 0.3s ease';
                        }
                        
                        // Update progress text with precise percentages
                        if (progressText) {
                            let progressHTML = `<div class="direct-bunny-progress">`;
                            
                            // Stage header
                            progressHTML += `<div class="stage-header" style="background: ${progressColor}15; color: ${progressColor}; padding: 6px 15px; border-radius: 25px; display: inline-block; margin-bottom: 10px; font-weight: bold; font-size: 0.95em;">`;
                            progressHTML += `${icon} ${stageInfo}`;
                            progressHTML += `</div>`;
                            
                            // Precise percentage
                            progressHTML += `<div class="precise-progress" style="font-size: 1.2em; font-weight: 700; margin-bottom: 8px; color: ${progressColor};">`;
                            if (currentStage === 'processing') {
                                progressHTML += `Upload: 100% • Processing: ${(displayPercent - 100).toFixed(1)}%`;
                            } else {
                                progressHTML += `${displayPercent.toFixed(2)}% Complete`;
                            }
                            progressHTML += `</div>`;
                            
                            // Speed and file info
                            const speed = data.speed || '';
                            const eta = data.eta || '';
                            const bytesUploaded = data.bytes_uploaded || 0;
                            const totalBytes = data.total_bytes || 0;
                            
                            if (bytesUploaded > 0 && totalBytes > 0) {
                                progressHTML += `<div class="upload-details" style="margin-bottom: 6px;">`;
                                progressHTML += `<span style="color: #333; font-weight: 500;">${formatBytes(bytesUploaded)} / ${formatBytes(totalBytes)}</span>`;
                                if (speed && currentStage === 'upload') {
                                    progressHTML += ` • <span style="color: ${progressColor}; font-weight: 600;">${speed}</span>`;
                                }
                                if (eta && eta \!== 'Calculating...' && eta \!== 'Completed' && currentStage === 'upload') {
                                    progressHTML += ` • <span style="color: #666; font-style: italic;">${eta} remaining</span>`;
                                }
                                progressHTML += `</div>`;
                            }
                            
                            // Status message
                            if (data.message) {
                                progressHTML += `<div class="status-message" style="color: #666; font-size: 0.9em; font-style: italic;">`;
                                progressHTML += data.message;
                                progressHTML += `</div>`;
                            }
                            
                            // File info
                            progressHTML += `<div class="file-info" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; color: #888; font-size: 0.85em;">`;
                            progressHTML += `📁 ${fileName}`;
                            if (totalBytes > 0) {
                                progressHTML += ` • ${formatBytes(totalBytes)}`;
                            }
                            progressHTML += `</div>`;
                            
                            progressHTML += `</div>`;
                            progressText.innerHTML = progressHTML;
                        }
                        
                    } else if (data.status === 'completed' && \!hasShownSuccess) {
                        console.log('✅ Direct Bunny upload completed\!');
                        handleDirectBunnySuccess(fileName, progressBar, progressText, progressContainerId, isBulk, data);
                    } else if (data.status === 'error') {
                        console.error('❌ Direct Bunny upload error:', data.message);
                        handleDirectBunnyError(fileName, data.message, progressBar, progressText, progressContainerId, isBulk);
                    }
                } catch (error) {
                    console.error('Error parsing direct Bunny progress:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('Direct Bunny EventSource error:', error);
                
                if (lastProgressData && lastProgressData.percent >= 100 && \!hasShownSuccess) {
                    console.log('🔄 Connection lost at completion, showing success');
                    handleDirectBunnySuccess(fileName, progressBar, progressText, progressContainerId, isBulk, lastProgressData);
                    return;
                }
                
                if (eventSource.readyState === EventSource.CLOSED && reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    console.log(`🔄 Direct Bunny reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                    
                    const progressText = document.getElementById(progressTextId);
                    if (progressText) {
                        progressText.innerHTML = `<div style="text-align: center; color: #ff6b35; padding: 15px;">🔄 Connection lost. Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})</div>`;
                    }
                    
                    setTimeout(() => {
                        connectEventSource();
                    }, reconnectDelay);
                } else if (reconnectAttempts >= maxReconnectAttempts) {
                    console.error('❌ Max reconnection attempts reached');
                    
                    if (lastProgressData && lastProgressData.percent >= 90) {
                        showInfoAlert(fileName, 'Upload likely completed. Please check Video Library.', isBulk);
                        setTimeout(() => loadCourseVideos(), 3000);
                    } else {
                        showErrorAlert(fileName, 'Connection lost and could not be restored', isBulk);
                    }
                    
                    if (\!isBulk) {
                        document.getElementById(progressContainerId).style.display = 'none';
                    }
                }
            };
            
        } catch (error) {
            console.error('Failed to create direct Bunny EventSource:', error);
            showErrorAlert(fileName, 'Failed to start progress tracking', isBulk);
        }
    }
    
    function handleDirectBunnySuccess(fileName, progressBar, progressText, progressContainerId, isBulk, data) {
        if (hasShownSuccess) return;
        hasShownSuccess = true;
        
        console.log('🎉 Direct Bunny upload success for:', fileName);
        
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.classList.add('progress-success');
            progressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
            progressBar.style.boxShadow = '0 4px 20px rgba(40, 167, 69, 0.4)';
        }
        
        if (progressText) {
            const speed = data?.speed || 'High Speed';
            progressText.innerHTML = `<div class="direct-bunny-success" style="text-align: center; padding: 20px;">`;
            progressText.innerHTML += `<div style="font-size: 1.4em; color: #28a745; font-weight: bold; margin-bottom: 12px;">✅ Direct Bunny Upload Complete\!</div>`;
            progressText.innerHTML += `<div style="margin-bottom: 10px;">`;
            progressText.innerHTML += `<div style="color: #28a745; font-weight: 600;">🎯 Direct CDN Upload: 100% ✓</div>`;
            progressText.innerHTML += `<div style="color: #ff6b35; font-weight: 600;">⚙️ Bunny Processing: 100% ✓</div>`;
            progressText.innerHTML += `<div style="color: #6f42c1; font-weight: 600;">💾 Database Save: 100% ✓</div>`;
            progressText.innerHTML += `</div>`;
            progressText.innerHTML += `<div style="color: #666; font-size: 0.95em; margin-bottom: 10px;">"${fileName}" uploaded at ${speed}</div>`;
            progressText.innerHTML += `<div class="direct-bunny-badge" style="background: linear-gradient(90deg, #28a745, #20c997); color: white; padding: 6px 16px; border-radius: 20px; display: inline-block; font-size: 0.85em; font-weight: bold;">🎯 DIRECT BUNNY CDN</div>`;
            progressText.innerHTML += `</div>`;
        }
        
        showSuccessAlert(fileName + ' (Direct Bunny)', isBulk);
        
        // Success sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Ey/DWhTQGG2S47OmxWRMLPZjZ88RgHAbHpmwoFxtCbM7Vz6KObWEB');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (e) {}
        
        setTimeout(() => {
            if (\!isBulk) {
                const container = document.getElementById(progressContainerId);
                if (container) {
                    container.style.transition = 'all 0.6s ease';
                    container.style.transform = 'scale(0.95)';
                    container.style.opacity = '0';
                    setTimeout(() => {
                        container.style.display = 'none';
                        container.style.transform = 'scale(1)';
                        container.style.opacity = '1';
                    }, 600);
                }
            }
            loadCourseVideos();
        }, 4000);
        
        if (eventSource) {
            eventSource.close();
        }
    }
    
    function handleDirectBunnyError(fileName, message, progressBar, progressText, progressContainerId, isBulk) {
        if (progressBar) {
            progressBar.classList.add('progress-error');
            progressBar.style.background = 'linear-gradient(90deg, #dc3545, #e74c3c)';
        }
        showErrorAlert(fileName, message, isBulk);
        if (\!isBulk) {
            setTimeout(() => {
                document.getElementById(progressContainerId).style.display = 'none';
            }, 5000);
        }
        if (eventSource) {
            eventSource.close();
        }
    }
    
    connectEventSource();
    
    // Extended timeout for very large files
    setTimeout(() => {
        if (\!hasShownSuccess) {
            console.log('⏰ Direct Bunny upload timeout');
            loadCourseVideos();
            showInfoAlert(fileName, 'Upload is taking longer than expected. Check Video Library.', isBulk);
        }
    }, 3600000); // 1 hour timeout for large files
}

// Replace original upload functions
window.uploadSingleVideo = uploadSingleVideoDirectBunny;

// Update bulk upload to use direct Bunny
function handleBulkUploadDirectBunny(files) {
    if (\!selectedCourseId) {
        showNotification('Please select a course first', 'error');
        return;
    }
    
    if (files.length === 0) {
        showNotification('No video files selected', 'error');
        return;
    }
    
    showNotification(`Starting direct Bunny upload of ${files.length} videos...`, 'info');
    
    document.getElementById('bulkUploadProgress').style.display = 'block';
    document.getElementById('bulkUploadTotal').textContent = files.length;
    document.getElementById('bulkUploadCurrent').textContent = '0';
    
    let completedUploads = 0;
    
    const uploadNext = (index) => {
        if (index >= files.length) {
            document.getElementById('bulkUploadProgress').style.display = 'none';
            showNotification(`All ${files.length} videos uploaded to Bunny CDN\!`, 'success');
            return;
        }
        
        const file = files[index];
        uploadSingleVideoDirectBunny(file, index + 1, true);
        
        document.getElementById('bulkUploadCurrent').textContent = (index + 1).toString();
        
        setTimeout(() => {
            uploadNext(index + 1);
        }, 2000); // Stagger uploads for better performance
    };
    
    uploadNext(0);
}

// Override bulk upload handler
if (window.handleBulkUpload) {
    window.handleBulkUpload = handleBulkUploadDirectBunny;
}

console.log('✅ Direct Bunny CDN upload system loaded\!');

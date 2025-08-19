// Ultra-fast progress display with real-time tracking for both server and CDN
console.log('Loading ultra-fast progress display...');

window.trackUltraFastUploadProgress = function(uploadId, fileName, progressBarId, progressTextId, progressContainerId, isBulk) {
    console.log('🚀🚀 Starting ULTRA-FAST upload progress tracking for:', fileName, 'Upload ID:', uploadId);
    
    let eventSource = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 15;
    const reconnectDelay = 1000;
    let lastProgressData = null;
    let hasShownSuccess = false;
    let currentStage = 'server';
    let serverCompleted = false;
    let cdnStarted = false;
    
    function connectEventSource() {
        try {
            eventSource = new EventSource(`/admin/upload-progress/${uploadId}`);
            console.log('📡 Ultra-fast EventSource connected for upload:', uploadId);
            
            eventSource.onopen = function(event) {
                console.log('✅ Ultra-fast EventSource connection opened');
                reconnectAttempts = 0;
            };
            
            eventSource.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    lastProgressData = data;
                    console.log('📊 Ultra-fast progress:', data);
                    
                    const progressBar = document.getElementById(progressBarId);
                    const progressText = document.getElementById(progressTextId);
                    
                    // Determine current stage
                    const stage = data.stage || 'server';
                    if (stage \!== currentStage) {
                        currentStage = stage;
                        console.log(`🔄 Stage changed to: ${stage}`);
                    }
                    
                    if (stage === 'server' && data.status === 'completed') {
                        serverCompleted = true;
                    }
                    
                    if (stage === 'cdn' && \!cdnStarted) {
                        cdnStarted = true;
                        console.log('☁️ CDN upload started');
                    }
                    
                    if (data.status === 'uploading' || data.status === 'preparing' || data.status === 'saving') {
                        let displayPercent = parseFloat(data.percent) || 0;
                        
                        // Stage-specific styling and info
                        let stageInfo = '';
                        let progressColor = '';
                        let speedDisplay = data.speed || '';
                        let etaDisplay = data.eta || '';
                        
                        if (stage === 'server') {
                            stageInfo = '📤 Stage 1/3: Server Upload (Real-time)';
                            progressColor = '#007bff';
                        } else if (stage === 'cdn') {
                            stageInfo = '☁️ Stage 2/3: Bunny CDN Upload (Ultra-fast Parallel)';
                            progressColor = '#28a745';
                        } else if (stage === 'database') {
                            stageInfo = '💾 Stage 3/3: Database Save';
                            progressColor = '#6f42c1';
                        }
                        
                        // Update progress bar
                        if (progressBar) {
                            progressBar.style.width = displayPercent + '%';
                            progressBar.style.background = `linear-gradient(90deg, ${progressColor}, ${progressColor}dd)`;
                            progressBar.style.boxShadow = `0 2px 8px ${progressColor}40`;
                            
                            if (displayPercent > 95) {
                                progressBar.classList.add('progress-success');
                            }
                        }
                        
                        // Update progress text with enhanced display
                        if (progressText) {
                            let progressHTML = `<div class="ultra-fast-progress-info">`;
                            
                            // Stage indicator
                            progressHTML += `<div class="stage-indicator" style="background: ${progressColor}20; color: ${progressColor}; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 8px; font-weight: bold; font-size: 0.9em;">`;
                            progressHTML += stageInfo;
                            progressHTML += `</div>`;
                            
                            // Main progress
                            progressHTML += `<div class="progress-main" style="font-size: 1.1em; font-weight: 600; margin-bottom: 6px;">`;
                            if (stage === 'cdn') {
                                progressHTML += `🚀 Ultra-Fast CDN: ${displayPercent.toFixed(1)}%`;
                            } else {
                                progressHTML += `📊 ${displayPercent.toFixed(1)}% Complete`;
                            }
                            progressHTML += `</div>`;
                            
                            // Speed and bytes info
                            const bytesUploaded = data.bytes_uploaded || 0;
                            const totalBytes = data.total_bytes || 0;
                            
                            if (bytesUploaded > 0 && totalBytes > 0) {
                                progressHTML += `<div class="progress-details" style="margin-bottom: 4px;">`;
                                progressHTML += `<span class="bytes-info" style="color: #333; font-weight: 500;">${formatBytes(bytesUploaded)} / ${formatBytes(totalBytes)}</span>`;
                                if (speedDisplay) {
                                    progressHTML += ` • <span class="speed-info" style="color: ${progressColor}; font-weight: 600;">${speedDisplay}</span>`;
                                }
                                if (etaDisplay && etaDisplay \!== 'Calculating...' && etaDisplay \!== 'Completed') {
                                    progressHTML += ` • <span class="eta-info" style="color: #666; font-style: italic;">${etaDisplay} remaining</span>`;
                                }
                                progressHTML += `</div>`;
                            } else if (speedDisplay) {
                                progressHTML += `<div class="progress-details"><span class="speed-info" style="color: ${progressColor}; font-weight: 600;">${speedDisplay}</span>`;
                                if (etaDisplay && etaDisplay \!== 'Calculating...' && etaDisplay \!== 'Completed') {
                                    progressHTML += ` • <span class="eta-info" style="color: #666; font-style: italic;">${etaDisplay} remaining</span>`;
                                }
                                progressHTML += `</div>`;
                            }
                            
                            // Status message
                            if (data.message) {
                                progressHTML += `<div class="status-message" style="font-size: 0.9em; color: #666; margin-top: 4px; font-style: italic;">`;
                                if (stage === 'cdn') {
                                    progressHTML += `⚡ ${data.message}`;
                                } else {
                                    progressHTML += data.message;
                                }
                                progressHTML += `</div>`;
                            }
                            
                            // Special indicators for ultra-fast mode
                            if (stage === 'cdn' && speedDisplay) {
                                progressHTML += `<div class="ultra-fast-indicator" style="background: linear-gradient(90deg, #ff6b35, #f7931e); color: white; padding: 2px 8px; border-radius: 12px; display: inline-block; margin-top: 4px; font-size: 0.8em; font-weight: bold;">`;
                                progressHTML += `⚡ ULTRA-FAST MODE`;
                                progressHTML += `</div>`;
                            }
                            
                            progressHTML += `</div>`;
                            progressText.innerHTML = progressHTML;
                        }
                        
                        // Auto-success detection for stuck uploads
                        if (displayPercent >= 100 && \!hasShownSuccess && stage \!== 'database') {
                            setTimeout(() => {
                                if (\!hasShownSuccess && lastProgressData && lastProgressData.percent >= 100) {
                                    console.log('🔄 Auto-triggering success after 100%');
                                    handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                                }
                            }, 3000);
                        }
                        
                    } else if (data.status === 'completed' && \!hasShownSuccess) {
                        console.log('✅ Ultra-fast upload completed\!');
                        handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                    } else if (data.status === 'error') {
                        console.error('❌ Ultra-fast upload error:', data.message);
                        if (progressBar) {
                            progressBar.classList.add('progress-error');
                            progressBar.style.background = 'linear-gradient(90deg, #dc3545, #e74c3c)';
                        }
                        showErrorAlert(fileName, data.message, isBulk);
                        if (\!isBulk) {
                            setTimeout(() => {
                                document.getElementById(progressContainerId).style.display = 'none';
                            }, 5000);
                        }
                        eventSource.close();
                    }
                } catch (error) {
                    console.error('Error parsing ultra-fast progress data:', error);
                }
            };
            
            eventSource.onerror = function(error) {
                console.error('Ultra-fast EventSource error:', error);
                
                if (lastProgressData && lastProgressData.percent >= 100 && \!hasShownSuccess) {
                    console.log('🔄 Connection lost at 100%, showing success');
                    handleUploadSuccess(fileName, progressBar, progressText, progressContainerId, isBulk);
                    return;
                }
                
                if (eventSource.readyState === EventSource.CLOSED) {
                    console.warn('⚠️ Ultra-fast EventSource closed, attempting to reconnect...');
                    
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        console.log(`🔄 Ultra-fast reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
                        
                        const progressText = document.getElementById(progressTextId);
                        if (progressText) {
                            progressText.innerHTML = `<div style="text-align: center; color: #ff6b35;">🔄 Connection lost. Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})</div>`;
                        }
                        
                        setTimeout(() => {
                            connectEventSource();
                        }, reconnectDelay);
                    } else {
                        console.error('❌ Max ultra-fast reconnection attempts reached');
                        
                        if (lastProgressData && lastProgressData.percent >= 90) {
                            console.log('📤 Upload likely completed despite connection issues');
                            showInfoAlert(fileName, 'Upload completed but connection was lost. Checking Video Library...', isBulk);
                            
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
                
                console.log('🎉🚀 Ultra-fast upload success for:', fileName);
                
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.classList.add('progress-success');
                    progressBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
                    progressBar.style.boxShadow = '0 4px 16px rgba(40, 167, 69, 0.4)';
                }
                
                if (progressText) {
                    progressText.innerHTML = `<div class="upload-success-complete" style="text-align: center; padding: 15px;">`;
                    progressText.innerHTML += `<div style="font-size: 1.3em; color: #28a745; font-weight: bold; margin-bottom: 10px;">✅ Ultra-Fast Upload Complete\!</div>`;
                    progressText.innerHTML += `<div style="margin-bottom: 8px;">`;
                    progressText.innerHTML += `<div style="color: #007bff;">📤 Server Upload: 100% ✓</div>`;
                    progressText.innerHTML += `<div style="color: #28a745;">☁️ Bunny CDN Upload: 100% ✓</div>`;
                    progressText.innerHTML += `<div style="color: #6f42c1;">💾 Database Save: 100% ✓</div>`;
                    progressText.innerHTML += `</div>`;
                    progressText.innerHTML += `<div style="color: #666; font-size: 0.9em;">"${fileName}" uploaded with ultra-fast parallel processing\!</div>`;
                    progressText.innerHTML += `<div class="ultra-fast-badge" style="background: linear-gradient(90deg, #ff6b35, #f7931e); color: white; padding: 4px 12px; border-radius: 16px; display: inline-block; margin-top: 8px; font-size: 0.8em; font-weight: bold;">⚡ ULTRA-FAST MODE</div>`;
                    progressText.innerHTML += `</div>`;
                }
                
                showSuccessAlert(fileName + ' (Ultra-Fast)', isBulk);
                
                // Ultra-fast completion sound
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi2Ey/DWhTQGG2S47OmxWRMLPZjZ88RgHAbHpmwoFxtCbM7Vz6KObWEB');
                    audio.volume = 0.4;
                    audio.play().catch(() => {});
                } catch (e) {}
                
                setTimeout(() => {
                    if (\!isBulk) {
                        const container = document.getElementById(progressContainerId);
                        if (container) {
                            container.style.transition = 'all 0.5s ease';
                            container.style.transform = 'scale(0.95)';
                            container.style.opacity = '0';
                            setTimeout(() => {
                                container.style.display = 'none';
                                container.style.transform = 'scale(1)';
                                container.style.opacity = '1';
                            }, 500);
                        }
                    }
                    loadCourseVideos();
                }, 4000);
                
                if (eventSource) {
                    eventSource.close();
                }
            }
            
        } catch (error) {
            console.error('Failed to create ultra-fast EventSource:', error);
            showErrorAlert(fileName, 'Failed to start ultra-fast progress tracking', isBulk);
        }
    }
    
    connectEventSource();
    
    // Extended timeout for large files
    setTimeout(() => {
        if (\!hasShownSuccess) {
            console.log('⏰ Ultra-fast upload timeout, checking status...');
            loadCourseVideos();
            showInfoAlert(fileName, 'Ultra-fast upload is taking longer than expected. Check Video Library.', isBulk);
        }
    }, 1800000); // 30 minutes timeout
};

// Replace all tracking functions with ultra-fast version
window.trackBunnyUploadProgress = window.trackUltraFastUploadProgress;
window.trackBunnyUploadProgressOptimized = window.trackUltraFastUploadProgress;
window.trackBunnyUploadProgressOptimizedFixed = window.trackUltraFastUploadProgress;
window.trackBunnyUploadProgressTwoStage = window.trackUltraFastUploadProgress;

console.log('✅ Ultra-fast progress display loaded\!');

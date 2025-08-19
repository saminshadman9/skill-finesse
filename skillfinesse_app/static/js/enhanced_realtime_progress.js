// ENHANCED REAL-TIME PROGRESS BAR WITH DETAILED ANALYTICS
console.log("Loading Enhanced Real-Time Progress System...");

// Progress tracking state
let progressState = {
    startTime: null,
    lastUpdateTime: null,
    lastBytesLoaded: 0,
    speedHistory: [],
    averageSpeed: 0,
    peakSpeed: 0,
    stalls: 0,
    totalPauses: 0,
    isStalled: false
};

// Format bytes with precision
function formatBytesDetailed(bytes, precision) {
    precision = precision || 2;
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(precision)) + " " + sizes[i];
}

// Format speed with color coding
function formatSpeedWithColor(speed) {
    const speedMBps = speed / (1024 * 1024);
    let color = "#28a745"; // Green
    let icon = "🚀";
    
    if (speedMBps < 1) {
        color = "#dc3545"; // Red
        icon = "🐌";
    } else if (speedMBps < 5) {
        color = "#ffc107"; // Yellow
        icon = "🚶";
    } else if (speedMBps < 10) {
        color = "#17a2b8"; // Blue
        icon = "🏃";
    }
    
    return {
        text: formatBytesDetailed(speed) + "/s",
        color: color,
        icon: icon
    };
}

// Calculate comprehensive statistics
function calculateDetailedStats(uploaded, total, currentTime) {
    const elapsed = (currentTime - progressState.startTime) / 1000;
    const timeSinceLastUpdate = (currentTime - progressState.lastUpdateTime) / 1000;
    
    // Calculate instant speed
    const bytesThisUpdate = uploaded - progressState.lastBytesLoaded;
    const instantSpeed = timeSinceLastUpdate > 0 ? bytesThisUpdate / timeSinceLastUpdate : 0;
    
    // Update speed history (keep last 10 measurements)
    progressState.speedHistory.push(instantSpeed);
    if (progressState.speedHistory.length > 10) {
        progressState.speedHistory.shift();
    }
    
    // Calculate average speed
    const totalSpeed = progressState.speedHistory.reduce((sum, speed) => sum + speed, 0);
    progressState.averageSpeed = totalSpeed / progressState.speedHistory.length;
    
    // Update peak speed
    if (instantSpeed > progressState.peakSpeed) {
        progressState.peakSpeed = instantSpeed;
    }
    
    // Detect stalls
    const isCurrentlyStalled = instantSpeed < 1024; // Less than 1KB/s
    if (isCurrentlyStalled && \!progressState.isStalled) {
        progressState.stalls++;
        progressState.isStalled = true;
    } else if (\!isCurrentlyStalled) {
        progressState.isStalled = false;
    }
    
    // Calculate ETA using average speed
    const remaining = total - uploaded;
    const eta = progressState.averageSpeed > 0 ? remaining / progressState.averageSpeed : 0;
    
    // Calculate progress percentage
    const percentage = (uploaded / total) * 100;
    
    // Update state
    progressState.lastUpdateTime = currentTime;
    progressState.lastBytesLoaded = uploaded;
    
    return {
        percentage: percentage,
        uploaded: uploaded,
        total: total,
        elapsed: elapsed,
        instantSpeed: instantSpeed,
        averageSpeed: progressState.averageSpeed,
        peakSpeed: progressState.peakSpeed,
        eta: eta,
        stalls: progressState.stalls,
        isStalled: progressState.isStalled,
        remaining: remaining
    };
}

// Format time with detailed breakdown
function formatDetailedTime(seconds) {
    if (seconds <= 0) return "0s";
    if (seconds < 60) return Math.round(seconds) + "s";
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return mins + "m " + secs + "s";
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours + "h " + mins + "m";
}

// Get network quality indicator
function getNetworkQuality(averageSpeed) {
    const speedMBps = averageSpeed / (1024 * 1024);
    
    if (speedMBps >= 10) return { quality: "Excellent", color: "#28a745", bars: 5 };
    if (speedMBps >= 5) return { quality: "Good", color: "#17a2b8", bars: 4 };
    if (speedMBps >= 2) return { quality: "Fair", color: "#ffc107", bars: 3 };
    if (speedMBps >= 0.5) return { quality: "Poor", color: "#fd7e14", bars: 2 };
    return { quality: "Very Poor", color: "#dc3545", bars: 1 };
}

// Create signal strength bars
function createSignalBars(bars, color) {
    let barsHtml = "";
    for (let i = 1; i <= 5; i++) {
        const opacity = i <= bars ? "1" : "0.2";
        const height = i * 3 + 2;
        barsHtml += "<div class=\"signal-bar\" style=\"background-color: " + color + "; opacity: " + opacity + "; height: " + height + "px;\"></div>";
    }
    return barsHtml;
}

// Update enhanced progress display
function updateEnhancedProgress(uploaded, total, startTime, filename) {
    const progressBar = document.getElementById("addVideoProgressBar");
    const progressContainer = document.getElementById("addVideoProgress");
    
    if (\!progressBar || \!progressContainer) return;
    
    const currentTime = Date.now();
    
    // Initialize progress state if needed
    if (\!progressState.startTime) {
        progressState.startTime = startTime;
        progressState.lastUpdateTime = currentTime;
        progressState.lastBytesLoaded = 0;
    }
    
    // Calculate detailed statistics
    const stats = calculateDetailedStats(uploaded, total, currentTime);
    
    // Update progress bar
    progressBar.style.width = stats.percentage.toFixed(2) + "%";
    progressBar.style.transition = "none"; // Smooth real-time updates
    
    // Add progress bar glow effect based on speed
    const speedFormatted = formatSpeedWithColor(stats.instantSpeed);
    progressBar.style.boxShadow = "0 0 10px " + speedFormatted.color + "40";
    
    // Get network quality
    const networkQuality = getNetworkQuality(stats.averageSpeed);
    
    // Create enhanced progress HTML
    const stalledIndicator = stats.isStalled ? "<span class=\"indicator stalled\">⚠️ Connection Stalled</span>" : "";
    const halfwayIndicator = stats.percentage > 50 ? "<span class=\"indicator halfway\">🎯 Halfway Complete</span>" : "";
    const almostDoneIndicator = stats.percentage > 90 ? "<span class=\"indicator almost-done\">🏁 Almost Done</span>" : "";
    
    const progressHtml = 
        "<div class=\"enhanced-progress-container\">" +
            "<\!-- Main Progress Info -->" +
            "<div class=\"progress-main-info\">" +
                "<div class=\"progress-title\">" +
                    "<span class=\"upload-icon\">📤</span>" +
                    "<span class=\"upload-text\">Uploading to Bunny CDN</span>" +
                    "<span class=\"progress-percentage\">" + stats.percentage.toFixed(1) + "%</span>" +
                "</div>" +
                "<div class=\"file-info\">" +
                    "<span class=\"file-name\">📁 " + filename + "</span>" +
                "</div>" +
            "</div>" +
            
            "<\!-- Detailed Statistics Grid -->" +
            "<div class=\"progress-stats-grid\">" +
                "<\!-- Data Transfer Stats -->" +
                "<div class=\"stat-card\">" +
                    "<div class=\"stat-header\">📊 Data Transfer</div>" +
                    "<div class=\"stat-content\">" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Transferred:</span>" +
                            "<span class=\"stat-value\">" + formatBytesDetailed(stats.uploaded) + "</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Total Size:</span>" +
                            "<span class=\"stat-value\">" + formatBytesDetailed(stats.total) + "</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Remaining:</span>" +
                            "<span class=\"stat-value\">" + formatBytesDetailed(stats.remaining) + "</span>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
                
                "<\!-- Speed Analytics -->" +
                "<div class=\"stat-card\">" +
                    "<div class=\"stat-header\">⚡ Speed Analytics</div>" +
                    "<div class=\"stat-content\">" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Current:</span>" +
                            "<span class=\"stat-value\" style=\"color: " + speedFormatted.color + "\">" +
                                speedFormatted.icon + " " + speedFormatted.text +
                            "</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Average:</span>" +
                            "<span class=\"stat-value\">" + formatBytesDetailed(stats.averageSpeed) + "/s</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Peak:</span>" +
                            "<span class=\"stat-value\">🏆 " + formatBytesDetailed(stats.peakSpeed) + "/s</span>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
                
                "<\!-- Time Information -->" +
                "<div class=\"stat-card\">" +
                    "<div class=\"stat-header\">⏱️ Time Info</div>" +
                    "<div class=\"stat-content\">" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Elapsed:</span>" +
                            "<span class=\"stat-value\">" + formatDetailedTime(stats.elapsed) + "</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">ETA:</span>" +
                            "<span class=\"stat-value\">" + (stats.eta > 0 ? formatDetailedTime(stats.eta) : "Calculating...") + "</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Total Est:</span>" +
                            "<span class=\"stat-value\">" + formatDetailedTime(stats.elapsed + stats.eta) + "</span>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
                
                "<\!-- Network Quality -->" +
                "<div class=\"stat-card\">" +
                    "<div class=\"stat-header\">📶 Network</div>" +
                    "<div class=\"stat-content\">" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Quality:</span>" +
                            "<span class=\"stat-value\" style=\"color: " + networkQuality.color + "\">" +
                                networkQuality.quality +
                            "</span>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Signal:</span>" +
                            "<div class=\"signal-strength\">" +
                                createSignalBars(networkQuality.bars, networkQuality.color) +
                            "</div>" +
                        "</div>" +
                        "<div class=\"stat-row\">" +
                            "<span class=\"stat-label\">Stalls:</span>" +
                            "<span class=\"stat-value " + (stats.stalls > 0 ? "text-warning" : "") + "\">" + stats.stalls + "</span>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
            "</div>" +
            
            "<\!-- Progress Actions -->" +
            "<div class=\"progress-actions\">" +
                "<div class=\"progress-indicators\">" +
                    stalledIndicator + halfwayIndicator + almostDoneIndicator +
                "</div>" +
            "</div>" +
        "</div>";
    
    // Update the progress text container
    const progressTextElement = document.getElementById("addVideoProgressText");
    if (progressTextElement) {
        progressTextElement.innerHTML = progressHtml;
    }
    
    // Console logging for debugging
    console.log("Progress: " + stats.percentage.toFixed(2) + "% | Speed: " + speedFormatted.text + " | ETA: " + formatDetailedTime(stats.eta));
}

// Show enhanced completion
function showEnhancedCompletion(filename, uploadTime, folder) {
    const progressBar = document.getElementById("addVideoProgressBar");
    const progressTextElement = document.getElementById("addVideoProgressText");
    
    if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.style.background = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
        progressBar.style.boxShadow = "0 0 20px rgba(40, 167, 69, 0.8)";
        progressBar.style.animation = "completionPulse 1s ease-in-out";
    }
    
    const completionHtml = 
        "<div class=\"enhanced-progress-container completion\">" +
            "<div class=\"completion-header\">" +
                "<div class=\"completion-icon\">✅</div>" +
                "<div class=\"completion-title\">Upload Completed Successfully\!</div>" +
            "</div>" +
            
            "<div class=\"completion-stats\">" +
                "<div class=\"completion-stat\">" +
                    "<span class=\"completion-label\">📁 File:</span>" +
                    "<span class=\"completion-value\">" + filename + "</span>" +
                "</div>" +
                "<div class=\"completion-stat\">" +
                    "<span class=\"completion-label\">⏱️ Upload Time:</span>" +
                    "<span class=\"completion-value\">" + uploadTime.toFixed(1) + "s</span>" +
                "</div>" +
                "<div class=\"completion-stat\">" +
                    "<span class=\"completion-label\">📂 Location:</span>" +
                    "<span class=\"completion-value\">" + folder + "</span>" +
                "</div>" +
                "<div class=\"completion-stat\">" +
                    "<span class=\"completion-label\">🏆 Peak Speed:</span>" +
                    "<span class=\"completion-value\">" + formatBytesDetailed(progressState.peakSpeed) + "/s</span>" +
                "</div>" +
                "<div class=\"completion-stat\">" +
                    "<span class=\"completion-label\">📶 Network Quality:</span>" +
                    "<span class=\"completion-value\">" + getNetworkQuality(progressState.averageSpeed).quality + "</span>" +
                "</div>" +
            "</div>" +
            
            "<div class=\"completion-footer\">" +
                "<div class=\"success-message\">" +
                    "🎉 Your video has been successfully uploaded to Bunny CDN and is ready for streaming\!" +
                "</div>" +
            "</div>" +
        "</div>";
    
    if (progressTextElement) {
        progressTextElement.innerHTML = completionHtml;
    }
    
    console.log("Upload completed\! File: " + filename + " | Time: " + uploadTime.toFixed(1) + "s | Peak Speed: " + formatBytesDetailed(progressState.peakSpeed) + "/s");
}

// Reset progress state for new upload
function resetProgressState() {
    progressState = {
        startTime: null,
        lastUpdateTime: null,
        lastBytesLoaded: 0,
        speedHistory: [],
        averageSpeed: 0,
        peakSpeed: 0,
        stalls: 0,
        totalPauses: 0,
        isStalled: false
    };
}

// Export functions
window.updateEnhancedProgress = updateEnhancedProgress;
window.showEnhancedCompletion = showEnhancedCompletion;
window.resetProgressState = resetProgressState;

console.log("Enhanced Real-Time Progress System loaded successfully\!");

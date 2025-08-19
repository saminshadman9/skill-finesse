// Progress Display Fixes for Direct Bunny Upload
console.log("Loading progress display fixes...");

// Override the existing updateProgressDisplay function
window.updateProgressDisplay = function(uploadId, progress, uploaded, total, startTime, phase = "uploading") {
    const progressBar = document.getElementById("addVideoProgressBar") || document.getElementById("bulkUploadProgressBar");
    const progressText = document.getElementById("addVideoProgressText") || document.getElementById("bulkUploadProgressText");
    
    if (\!progressBar || \!progressText) return;
    
    let displayProgress = progress;
    let statusText = "";
    let showStats = true;
    
    // Phase-based progress calculation
    if (phase === "uploading") {
        // Upload phase: 0-90% of total progress
        displayProgress = Math.min(progress * 0.9, 90);
        statusText = "Uploading directly to Bunny CDN... " + progress.toFixed(1) + "%";
    } else if (phase === "processing") {
        // Processing phase: 90-100% of total progress
        displayProgress = 90 + (progress * 0.1);
        statusText = "Saving video metadata... " + displayProgress.toFixed(1) + "%";
        showStats = false; // Do not show speed/ETA for metadata saving
    } else if (phase === "completed") {
        displayProgress = 100;
        statusText = "Video uploaded successfully\!";
        showStats = false;
    } else if (phase === "error") {
        displayProgress = 0;
        statusText = "Upload failed";
        showStats = false;
    }
    
    // Update progress bar with smooth animation
    progressBar.style.width = displayProgress + "%";
    progressBar.style.transition = "width 0.3s ease";
    
    // Update progress text
    if (showStats && uploaded && total && startTime) {
        const stats = calculateSpeedAndETA(uploaded, total, startTime);
        progressText.innerHTML = 
            "<div class=\"upload-progress-info\">" +
                "<div class=\"progress-main\">" + statusText + "</div>" +
                "<div class=\"progress-details\">" +
                    "<span class=\"bytes-info\">" + formatBytes(uploaded) + " / " + formatBytes(total) + "</span>" +
                    "<span class=\"speed-info\">" + stats.speed + "</span>" +
                    "<span class=\"eta-info\">ETA: " + stats.eta + "</span>" +
                "</div>" +
            "</div>";
    } else {
        progressText.innerHTML = 
            "<div class=\"upload-progress-info\">" +
                "<div class=\"progress-main\">" + statusText + "</div>" +
            "</div>";
    }
};

// Override the main upload function with proper phase handling
window.uploadVideoDirectToBunnyFixed = async function(file, formData) {
    const uploadId = "direct_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const courseId = formData.get("course_id");
    const filename = generateUniqueFilename(file.name, courseId);
    
    // Show progress container
    const progressContainer = document.getElementById("addVideoProgress") || document.getElementById("bulkUploadProgress");
    if (progressContainer) {
        progressContainer.style.display = "block";
    }
    
    console.log("Starting direct Bunny upload: " + file.name + " (" + formatBytes(file.size) + ")");
    
    try {
        // Phase 1: Upload file directly to Bunny CDN (0-90% progress)
        updateProgressDisplay(uploadId, 0, 0, file.size, Date.now(), "uploading");
        const uploadResult = await uploadFileToBunnyDirect(file, filename, uploadId);
        
        // Brief pause to show upload completion
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Phase 2: Save metadata to database (90-100% progress)
        updateProgressDisplay(uploadId, 0, 0, 0, 0, "processing");
        
        const metadataFormData = new FormData();
        metadataFormData.append("course_id", formData.get("course_id"));
        metadataFormData.append("title", formData.get("title"));
        metadataFormData.append("description", formData.get("description") || "");
        metadataFormData.append("order_index", formData.get("order_index") || "0");
        metadataFormData.append("instructions", formData.get("instructions") || "");
        metadataFormData.append("external_links", formData.get("external_links") || "");
        metadataFormData.append("video_url", uploadResult.url);
        metadataFormData.append("bunny_video_id", filename);
        metadataFormData.append("file_size", file.size);
        
        if (formData.get("is_preview")) {
            metadataFormData.append("is_preview", "on");
        }
        
        // Handle attachments if any
        const attachments = formData.getAll("attachments");
        if (attachments.length > 0) {
            attachments.forEach(attachment => {
                if (attachment.size > 0) {
                    metadataFormData.append("attachments", attachment);
                }
            });
        }
        
        // Show processing progress
        updateProgressDisplay(uploadId, 50, 0, 0, 0, "processing");
        
        const response = await fetch("/admin/save-video-metadata", {
            method: "POST",
            body: metadataFormData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show completion
            updateProgressDisplay(uploadId, 100, 0, 0, 0, "completed");
            console.log("Video uploaded and metadata saved successfully");
            
            // Hide progress after delay and reload
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.display = "none";
                }
                
                // Close modal and reload
                const modal = document.getElementById("addVideoModal");
                if (modal) {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) modalInstance.hide();
                }
                
                // Clear form
                const form = document.getElementById("addVideoForm");
                if (form) form.reset();
                
                // Reload course videos
                if (typeof loadCourseVideos === "function") {
                    loadCourseVideos();
                }
                
                // Show success notification
                showNotification("Video uploaded successfully\!", "success");
            }, 2000);
            
            return { success: true, message: "Video uploaded successfully\!" };
            
        } else {
            throw new Error(result.message || "Failed to save video metadata");
        }
        
    } catch (error) {
        console.error("Upload failed:", error);
        
        // Show error state
        updateProgressDisplay(uploadId, 0, 0, 0, 0, "error");
        
        // Show error notification
        showNotification("Upload failed: " + error.message, "error");
        
        return { success: false, message: error.message };
    }
};

// Replace the original function
window.uploadVideoDirectToBunny = window.uploadVideoDirectToBunnyFixed;

// Show notification helper
function showNotification(message, type) {
    type = type || "info";
    
    // Try to use existing notification system first
    if (typeof showToast === "function") {
        showToast(message, type);
        return;
    }
    
    // Fallback notification
    const notification = document.createElement("div");
    notification.className = "notification " + type;
    notification.textContent = message;
    
    let bgColor = "#17a2b8"; // info
    if (type === "success") bgColor = "#28a745";
    if (type === "error") bgColor = "#dc3545";
    
    notification.style.cssText = 
        "position: fixed;" +
        "top: 20px;" +
        "right: 20px;" +
        "padding: 15px 20px;" +
        "border-radius: 5px;" +
        "color: white;" +
        "z-index: 9999;" +
        "background-color: " + bgColor + ";";
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

console.log("Progress display fixes loaded successfully");

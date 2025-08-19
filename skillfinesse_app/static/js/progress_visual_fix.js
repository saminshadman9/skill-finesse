// Progress Bar Visual Fixes - Ensures 100% completion display
console.log("Loading progress bar visual fixes...");

// Enhanced updateProgressDisplay with proper 100% completion
window.updateProgressDisplayFixed = function(uploadId, progress, uploaded, total, startTime, phase = "uploading") {
    const progressBar = document.getElementById("addVideoProgressBar") || document.getElementById("bulkUploadProgressBar");
    const progressText = document.getElementById("addVideoProgressText") || document.getElementById("bulkUploadProgressText");
    
    if (\!progressBar || \!progressText) return;
    
    let displayProgress = progress;
    let statusText = "";
    let showStats = true;
    
    // Phase-based progress calculation
    if (phase === "uploading") {
        // Upload phase: 0-85% of total progress (leave room for processing)
        displayProgress = Math.min(progress * 0.85, 85);
        statusText = "Uploading directly to Bunny CDN... " + progress.toFixed(1) + "%";
    } else if (phase === "processing") {
        // Processing phase: 85-95% of total progress
        displayProgress = 85 + (progress * 0.1);
        statusText = "Saving video metadata... " + displayProgress.toFixed(1) + "%";
        showStats = false;
    } else if (phase === "completed") {
        displayProgress = 100; // Ensure 100% display
        statusText = "Video uploaded successfully\!";
        showStats = false;
    } else if (phase === "error") {
        displayProgress = 0;
        statusText = "Upload failed";
        showStats = false;
    }
    
    // Force 100% completion visual
    if (displayProgress >= 99.9) {
        displayProgress = 100;
    }
    
    // Update progress bar with immediate 100% completion
    progressBar.style.width = displayProgress + "%";
    progressBar.style.transition = phase === "completed" ? "width 0.5s ease" : "width 0.3s ease";
    
    // Ensure progress bar reaches full width visually
    if (displayProgress === 100) {
        progressBar.style.width = "100%";
        progressBar.style.minWidth = "100%";
        progressBar.classList.add("progress-complete");
    }
    
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

// Enhanced upload function with guaranteed 100% completion
window.uploadVideoDirectToBunnyComplete = async function(file, formData) {
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
        // Phase 1: Upload file directly to Bunny CDN (0-85% progress)
        updateProgressDisplayFixed(uploadId, 0, 0, file.size, Date.now(), "uploading");
        const uploadResult = await uploadFileToBunnyDirect(file, filename, uploadId);
        
        // Show upload completion at 85%
        updateProgressDisplayFixed(uploadId, 100, file.size, file.size, Date.now(), "uploading");
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Phase 2: Save metadata to database (85-95% progress)
        updateProgressDisplayFixed(uploadId, 0, 0, 0, 0, "processing");
        
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
        
        // Handle attachments
        const attachments = formData.getAll("attachments");
        if (attachments.length > 0) {
            attachments.forEach(attachment => {
                if (attachment.size > 0) {
                    metadataFormData.append("attachments", attachment);
                }
            });
        }
        
        // Show processing at 50%
        updateProgressDisplayFixed(uploadId, 50, 0, 0, 0, "processing");
        
        const response = await fetch("/admin/save-video-metadata", {
            method: "POST",
            body: metadataFormData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show processing completion at 95%
            updateProgressDisplayFixed(uploadId, 100, 0, 0, 0, "processing");
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Phase 3: Show final completion at 100%
            updateProgressDisplayFixed(uploadId, 100, 0, 0, 0, "completed");
            console.log("Video uploaded and metadata saved successfully");
            
            // Keep 100% visible for 2 seconds before hiding
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
        updateProgressDisplayFixed(uploadId, 0, 0, 0, 0, "error");
        
        // Show error notification
        showNotification("Upload failed: " + error.message, "error");
        
        return { success: false, message: error.message };
    }
};

// Replace both functions
window.updateProgressDisplay = window.updateProgressDisplayFixed;
window.uploadVideoDirectToBunny = window.uploadVideoDirectToBunnyComplete;

console.log("Progress bar visual fixes loaded successfully");

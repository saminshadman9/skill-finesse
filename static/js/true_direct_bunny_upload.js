// TRUE DIRECT BUNNY CDN UPLOAD - Real Progress, Real Time
console.log("🚀 Loading TRUE direct Bunny CDN upload system...");

// Bunny CDN Configuration
const REAL_BUNNY_CONFIG = {
    storageZone: "skill-finesse-media",
    storagePassword: "30d3761f-3b03-4360-b03727074942-8db5-431c",
    storageUrl: "https://ny.storage.bunnycdn.com/skill-finesse-media",
    cdnUrl: "https://skill-finesse-videos.b-cdn.net"
};

// Generate unique filename for course organization
function generateRealUniqueFilename(originalFilename, courseId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = originalFilename.split(".").pop();
    const baseName = originalFilename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
    
    return `courses/${courseId}/videos/${timestamp}_${random}_${baseName}.${extension}`;
}

// Format bytes for display
function formatRealBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Calculate real-time upload speed and ETA
function calculateRealSpeed(uploaded, total, startTime) {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const speed = uploaded / elapsed; // bytes per second
    const remaining = total - uploaded;
    const eta = remaining / speed; // seconds
    
    return {
        speed: formatRealBytes(speed) + "/s",
        eta: eta > 0 && eta < 86400 ? formatRealTime(eta) : "Calculating..."
    };
}

// Format time in human readable format
function formatRealTime(seconds) {
    if (seconds < 60) return Math.round(seconds) + "s";
    if (seconds < 3600) return Math.round(seconds / 60) + "m " + Math.round(seconds % 60) + "s";
    return Math.round(seconds / 3600) + "h " + Math.round((seconds % 3600) / 60) + "m";
}

// Update progress display with REAL progress
function updateRealProgress(uploadId, uploaded, total, startTime) {
    const progressBar = document.getElementById("addVideoProgressBar") || document.getElementById("bulkUploadProgressBar");
    const progressText = document.getElementById("addVideoProgressText") || document.getElementById("bulkUploadProgressText");
    
    if (\!progressBar || \!progressText) return;
    
    // Calculate real progress percentage
    const realProgress = (uploaded / total) * 100;
    
    // Update progress bar to exact percentage
    progressBar.style.width = realProgress.toFixed(2) + "%";
    progressBar.style.transition = "none"; // Remove transition for real-time updates
    
    // Calculate speed and ETA
    const stats = calculateRealSpeed(uploaded, total, startTime);
    
    // Update progress text with real-time info
    progressText.innerHTML = 
        "<div class=\"upload-progress-info\">" +
            "<div class=\"progress-main\">🚀 Uploading directly to Bunny CDN... " + realProgress.toFixed(1) + "%</div>" +
            "<div class=\"progress-details\">" +
                "<span class=\"bytes-info\">" + formatRealBytes(uploaded) + " / " + formatRealBytes(total) + "</span>" +
                "<span class=\"speed-info\">" + stats.speed + "</span>" +
                "<span class=\"eta-info\">ETA: " + stats.eta + "</span>" +
            "</div>" +
        "</div>";
    
    console.log("📊 Real progress: " + realProgress.toFixed(1) + "% (" + formatRealBytes(uploaded) + "/" + formatRealBytes(total) + ")");
}

// Show completion
function showRealCompletion() {
    const progressBar = document.getElementById("addVideoProgressBar") || document.getElementById("bulkUploadProgressBar");
    const progressText = document.getElementById("addVideoProgressText") || document.getElementById("bulkUploadProgressText");
    
    if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.style.background = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
    }
    
    if (progressText) {
        progressText.innerHTML = 
            "<div class=\"upload-progress-info\">" +
                "<div class=\"progress-main\" style=\"color: #28a745; font-weight: 700;\">✅ Upload completed successfully\!</div>" +
            "</div>";
    }
    
    console.log("✅ Upload completed - 100% real progress achieved");
}

// TRUE DIRECT UPLOAD TO BUNNY CDN
function uploadDirectToBunnyReal(file, filename, progressContainer) {
    return new Promise((resolve, reject) => {
        console.log("🎯 Starting TRUE direct upload to Bunny CDN:", filename);
        
        const startTime = Date.now();
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${REAL_BUNNY_CONFIG.storageUrl}/${filename}`;
        
        // Show progress container
        if (progressContainer) {
            progressContainer.style.display = "block";
        }
        
        // REAL-TIME PROGRESS TRACKING
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                // Update with REAL uploaded bytes
                updateRealProgress("real_upload", e.loaded, e.total, startTime);
            }
        });
        
        // UPLOAD COMPLETION
        xhr.addEventListener("load", () => {
            console.log("📡 Bunny CDN response status:", xhr.status);
            
            if (xhr.status === 200 || xhr.status === 201) {
                // Show 100% completion immediately
                showRealCompletion();
                
                console.log("✅ Direct upload to Bunny CDN successful\!");
                resolve({
                    success: true,
                    url: `${REAL_BUNNY_CONFIG.cdnUrl}/${filename}`,
                    filename: filename,
                    uploadTime: (Date.now() - startTime) / 1000
                });
            } else {
                console.error("❌ Bunny CDN upload failed with status:", xhr.status);
                reject(new Error(`Bunny CDN upload failed: ${xhr.status} - ${xhr.responseText}`));
            }
        });
        
        // ERROR HANDLING
        xhr.addEventListener("error", () => {
            console.error("❌ Network error during Bunny CDN upload");
            reject(new Error("Network error during direct upload to Bunny CDN"));
        });
        
        // CONFIGURE AND SEND REQUEST
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("AccessKey", REAL_BUNNY_CONFIG.storagePassword);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        
        console.log("📤 Sending file directly to Bunny CDN...");
        xhr.send(file);
    });
}

// MAIN UPLOAD FUNCTION - REAL DIRECT UPLOAD
async function uploadVideoRealDirect(file, formData) {
    console.log("🚀 Starting REAL direct video upload:", file.name, "(" + formatRealBytes(file.size) + ")");
    
    const courseId = formData.get("course_id");
    const filename = generateRealUniqueFilename(file.name, courseId);
    
    // Get progress container
    const progressContainer = document.getElementById("addVideoProgress") || document.getElementById("bulkUploadProgress");
    
    try {
        // STEP 1: Upload directly to Bunny CDN (REAL UPLOAD)
        console.log("📤 Phase 1: Direct upload to Bunny CDN");
        const uploadResult = await uploadDirectToBunnyReal(file, filename, progressContainer);
        
        console.log("🎉 Bunny CDN upload completed in", uploadResult.uploadTime, "seconds");
        
        // STEP 2: Save metadata to database (QUICK)
        console.log("💾 Phase 2: Saving metadata to database");
        
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
        
        const response = await fetch("/admin/save-video-metadata", {
            method: "POST",
            body: metadataFormData
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Video metadata saved successfully");
            
            // Hide progress after 2 seconds and clean up
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.display = "none";
                }
                
                // Close modal
                const modal = document.getElementById("addVideoModal");
                if (modal) {
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    if (modalInstance) modalInstance.hide();
                }
                
                // Reset form
                const form = document.getElementById("addVideoForm");
                if (form) form.reset();
                
                // Reload course videos
                if (typeof loadCourseVideos === "function") {
                    loadCourseVideos();
                }
                
                // Show success notification
                alert("✅ Video uploaded successfully to Bunny CDN\!");
                
            }, 2000);
            
            return { success: true, message: "Video uploaded successfully\!" };
            
        } else {
            throw new Error(result.message || "Failed to save video metadata");
        }
        
    } catch (error) {
        console.error("❌ Upload failed:", error);
        
        // Show error
        const progressText = document.getElementById("addVideoProgressText") || document.getElementById("bulkUploadProgressText");
        if (progressText) {
            progressText.innerHTML = 
                "<div class=\"text-danger\">❌ Upload failed: " + error.message + "</div>";
        }
        
        alert("❌ Upload failed: " + error.message);
        return { success: false, message: error.message };
    }
}

// BULK UPLOAD - REAL DIRECT
async function uploadMultipleVideosRealDirect(files) {
    console.log("📁 Starting bulk direct upload:", files.length, "files");
    
    const bulkProgressContainer = document.getElementById("bulkUploadProgress");
    const bulkProgressBar = document.getElementById("bulkUploadProgressBar");
    const bulkProgressText = document.getElementById("bulkUploadProgressText");
    const bulkCurrentEl = document.getElementById("bulkUploadCurrent");
    const bulkTotalEl = document.getElementById("bulkUploadTotal");
    
    if (bulkProgressContainer) bulkProgressContainer.style.display = "block";
    if (bulkTotalEl) bulkTotalEl.textContent = files.length;
    
    let completed = 0;
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (bulkCurrentEl) bulkCurrentEl.textContent = i + 1;
        if (bulkProgressText) {
            bulkProgressText.innerHTML = `📁 Uploading file ${i + 1} of ${files.length}: ${file.name}`;
        }
        
        try {
            const formData = new FormData();
            formData.append("course_id", selectedCourseId);
            formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
            formData.append("order_index", i);
            
            const result = await uploadVideoRealDirect(file, formData);
            results.push(result);
            
            if (result.success) {
                completed++;
            }
            
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            results.push({ success: false, message: error.message, filename: file.name });
        }
        
        // Update overall progress
        const overallProgress = ((i + 1) / files.length) * 100;
        if (bulkProgressBar) bulkProgressBar.style.width = overallProgress + "%";
    }
    
    // Show completion summary
    if (bulkProgressText) {
        bulkProgressText.innerHTML = `✅ Bulk upload completed: ${completed}/${files.length} files uploaded successfully`;
    }
    
    // Hide progress after delay
    setTimeout(() => {
        if (bulkProgressContainer) bulkProgressContainer.style.display = "none";
        if (typeof loadCourseVideos === "function") {
            loadCourseVideos();
        }
        
        alert(`Bulk upload completed: ${completed}/${files.length} files uploaded successfully`);
    }, 3000);
    
    return results;
}

// REPLACE ALL EXISTING UPLOAD FUNCTIONS
window.uploadVideoDirectToBunny = uploadVideoRealDirect;
window.uploadMultipleVideosDirectToBunny = uploadMultipleVideosRealDirect;

console.log("✅ TRUE Direct Bunny CDN Upload System loaded - REAL PROGRESS, REAL TIME\!");

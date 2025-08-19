// ENHANCED DIRECT BUNNY UPLOAD WITH REAL-TIME DETAILED PROGRESS
console.log("Loading Enhanced Direct Bunny Upload System...");

// Bunny CDN Configuration
const ENHANCED_BUNNY_CONFIG = {
    storageZone: "skill-finesse-media",
    storagePassword: "30d3761f-3b03-4360-b03727074942-8db5-431c",
    storageUrl: "https://ny.storage.bunnycdn.com/skill-finesse-media",
    cdnUrl: "https://skill-finesse-videos.b-cdn.net",
    apiKey: "08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416"
};

// Global variables
let enhancedCurrentCourseTitle = null;
let enhancedUploadInProgress = false;

// Sanitize course title for folder name
function enhancedSanitizeFolderName(title) {
    return title
        .replace(/[^a-zA-Z0-9\s\-_]/g, "") // Remove special chars
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/_+/g, "_") // Replace multiple underscores with single
        .replace(/^_|_$/g, "") // Remove leading/trailing underscores
        .toLowerCase();
}

// Generate unique filename with course title folder
function enhancedGenerateFilename(originalFilename, courseTitle) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = originalFilename.split(".").pop().toLowerCase();
    const baseName = originalFilename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
    
    const folderName = enhancedSanitizeFolderName(courseTitle);
    return `courses/${folderName}/${timestamp}_${random}_${baseName}.${extension}`;
}

// Get course title from course ID
async function enhancedGetCourseTitle(courseId) {
    try {
        const response = await fetch(`/admin/get-course-info/${courseId}`);
        const data = await response.json();
        
        if (data.success && data.course) {
            return data.course.title;
        } else {
            console.warn("Could not get course title, using ID:", courseId);
            return `Course_${courseId}`;
        }
    } catch (error) {
        console.warn("Error getting course title:", error);
        return `Course_${courseId}`;
    }
}

// ENHANCED DIRECT UPLOAD TO BUNNY CDN
function enhancedUploadToBunnyDirect(file, filename, startTime) {
    return new Promise((resolve, reject) => {
        console.log("Starting enhanced direct upload to Bunny CDN:", filename);
        
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${ENHANCED_BUNNY_CONFIG.storageUrl}/${filename}`;
        
        // Reset progress state for new upload
        resetProgressState();
        
        // ENHANCED REAL-TIME PROGRESS TRACKING
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                // Use enhanced progress display with detailed analytics
                updateEnhancedProgress(e.loaded, e.total, startTime, filename.split("/").pop());
            }
        });
        
        // UPLOAD SUCCESS
        xhr.addEventListener("load", () => {
            const uploadTime = (Date.now() - startTime) / 1000;
            console.log("Bunny CDN response:", xhr.status, xhr.responseText);
            
            if (xhr.status === 200 || xhr.status === 201) {
                const folder = `courses/${enhancedSanitizeFolderName(enhancedCurrentCourseTitle)}/`;
                showEnhancedCompletion(filename.split("/").pop(), uploadTime, folder);
                
                resolve({
                    success: true,
                    url: `${ENHANCED_BUNNY_CONFIG.cdnUrl}/${filename}`,
                    filename: filename,
                    uploadTime: uploadTime,
                    folder: folder
                });
            } else {
                console.error("Bunny CDN upload failed:", xhr.status, xhr.responseText);
                reject(new Error(`Bunny CDN upload failed: ${xhr.status}`));
            }
        });
        
        // ERROR HANDLING
        xhr.addEventListener("error", () => {
            console.error("Network error during upload");
            reject(new Error("Network error during direct upload"));
        });
        
        xhr.addEventListener("timeout", () => {
            console.error("Upload timeout");
            reject(new Error("Upload timeout"));
        });
        
        // CONFIGURE REQUEST
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("AccessKey", ENHANCED_BUNNY_CONFIG.storagePassword);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.timeout = 300000; // 5 minute timeout
        
        console.log("Uploading to:", uploadUrl);
        xhr.send(file);
    });
}

// MAIN ENHANCED UPLOAD FUNCTION
async function enhancedUploadVideoDirectBunny(file, formData) {
    if (enhancedUploadInProgress) {
        alert("Another upload is in progress. Please wait...");
        return { success: false, message: "Another upload in progress" };
    }
    
    enhancedUploadInProgress = true;
    
    try {
        console.log("Starting enhanced direct video upload:", file.name, "(" + formatBytesDetailed(file.size) + ")");
        
        const courseId = formData.get("course_id");
        if (\!courseId) {
            throw new Error("No course selected");
        }
        
        // Get course title for folder organization
        enhancedCurrentCourseTitle = await enhancedGetCourseTitle(courseId);
        console.log("Course title:", enhancedCurrentCourseTitle);
        
        // Generate filename with course folder
        const filename = enhancedGenerateFilename(file.name, enhancedCurrentCourseTitle);
        console.log("Upload path:", filename);
        
        // Show progress container
        const progressContainer = document.getElementById("addVideoProgress");
        if (progressContainer) {
            progressContainer.style.display = "block";
        }
        
        // STEP 1: Enhanced direct upload to Bunny CDN
        const startTime = Date.now();
        const uploadResult = await enhancedUploadToBunnyDirect(file, filename, startTime);
        
        console.log("Enhanced direct upload completed:", uploadResult);
        
        // STEP 2: Save metadata to database
        console.log("Saving video metadata...");
        
        const metadataFormData = new FormData();
        metadataFormData.append("course_id", courseId);
        metadataFormData.append("title", formData.get("title"));
        metadataFormData.append("description", formData.get("description") || "");
        metadataFormData.append("order_index", formData.get("order_index") || "0");
        metadataFormData.append("instructions", formData.get("instructions") || "");
        metadataFormData.append("external_links", formData.get("external_links") || "");
        metadataFormData.append("video_url", uploadResult.url);
        metadataFormData.append("bunny_video_id", filename);
        metadataFormData.append("file_size", file.size);
        metadataFormData.append("upload_folder", uploadResult.folder);
        
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
        
        const response = await fetch("/admin/save-video-metadata", {
            method: "POST",
            body: metadataFormData
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("Video metadata saved successfully");
            
            // Hide progress and clean up after 3 seconds
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
                
                // Reload videos
                if (typeof loadCourseVideos === "function") {
                    loadCourseVideos();
                }
                
                // Success notification
                alert("Video uploaded successfully to Bunny CDN\!\nFolder: " + uploadResult.folder + "\nPeak Speed: " + formatBytesDetailed(progressState.peakSpeed) + "/s");
                
            }, 3000);
            
            return { success: true, message: "Video uploaded successfully\!" };
            
        } else {
            throw new Error(result.message || "Failed to save video metadata");
        }
        
    } catch (error) {
        console.error("Enhanced upload failed:", error);
        
        // Show error in progress display
        const progressText = document.getElementById("addVideoProgressText");
        if (progressText) {
            progressText.innerHTML = 
                "<div class=\"enhanced-progress-container\">" +
                    "<div class=\"completion-header\">" +
                        "<div class=\"completion-icon\">❌</div>" +
                        "<div class=\"completion-title\" style=\"color: #dc3545;\">Upload Failed</div>" +
                    "</div>" +
                    "<div class=\"completion-footer\">" +
                        "<div class=\"error-message\" style=\"color: #dc3545;\">" +
                            "Error: " + error.message +
                        "</div>" +
                    "</div>" +
                "</div>";
        }
        
        alert("Upload failed: " + error.message);
        return { success: false, message: error.message };
        
    } finally {
        enhancedUploadInProgress = false;
    }
}

// ENHANCED BULK UPLOAD
async function enhancedUploadMultipleVideosDirect(files) {
    console.log("Starting enhanced bulk direct upload:", files.length, "files");
    
    if (\!selectedCourseId) {
        alert("Please select a course first");
        return;
    }
    
    // Get course title once for all uploads
    enhancedCurrentCourseTitle = await enhancedGetCourseTitle(selectedCourseId);
    console.log("Bulk upload folder:", enhancedSanitizeFolderName(enhancedCurrentCourseTitle));
    
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
            
            const result = await enhancedUploadVideoDirectBunny(file, formData);
            results.push(result);
            
            if (result.success) completed++;
            
        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            results.push({ success: false, message: error.message, filename: file.name });
        }
        
        // Update bulk progress
        const overallProgress = ((i + 1) / files.length) * 100;
        if (bulkProgressBar) bulkProgressBar.style.width = overallProgress + "%";
    }
    
    // Show completion
    if (bulkProgressText) {
        bulkProgressText.innerHTML = `✅ Enhanced bulk upload completed: ${completed}/${files.length} files in courses/${enhancedSanitizeFolderName(enhancedCurrentCourseTitle)}/`;
    }
    
    setTimeout(() => {
        if (bulkProgressContainer) bulkProgressContainer.style.display = "none";
        if (typeof loadCourseVideos === "function") {
            loadCourseVideos();
        }
        alert(`Enhanced bulk upload completed: ${completed}/${files.length} files uploaded with detailed analytics`);
    }, 3000);
    
    return results;
}

// REPLACE EXISTING FUNCTIONS WITH ENHANCED VERSIONS
window.uploadVideoDirectToBunny = enhancedUploadVideoDirectBunny;
window.uploadMultipleVideosDirectToBunny = enhancedUploadMultipleVideosDirect;

console.log("Enhanced Direct Bunny CDN Upload System loaded - Real-Time Detailed Progress\!");

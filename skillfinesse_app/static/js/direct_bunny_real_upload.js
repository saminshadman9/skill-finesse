// DIRECT BUNNY CDN UPLOAD - Real Progress, Course Title Folders
console.log("🚀 Loading DIRECT Bunny CDN Upload System...");

// Bunny CDN Configuration
const BUNNY_DIRECT_CONFIG = {
    storageZone: "skill-finesse-media",
    storagePassword: "30d3761f-3b03-4360-b03727074942-8db5-431c",
    storageUrl: "https://ny.storage.bunnycdn.com/skill-finesse-media",
    cdnUrl: "https://skill-finesse-videos.b-cdn.net",
    apiKey: "08b32784-a662-44ab-8045-0aec41fe17ee0ca63ea3-c5ee-4a7c-bedb-69700ee8e416"
};

// Global variables
let currentCourseTitle = null;
let uploadInProgress = false;

// Sanitize course title for folder name
function sanitizeFolderName(title) {
    return title
        .replace(/[^a-zA-Z0-9\s\-_]/g, "") // Remove special chars except spaces, hyphens, underscores
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/_+/g, "_") // Replace multiple underscores with single
        .replace(/^_|_$/g, "") // Remove leading/trailing underscores
        .toLowerCase();
}

// Generate unique filename with course title folder
function generateDirectFilename(originalFilename, courseTitle) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = originalFilename.split(".").pop().toLowerCase();
    const baseName = originalFilename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
    
    const folderName = sanitizeFolderName(courseTitle);
    return `courses/${folderName}/${timestamp}_${random}_${baseName}.${extension}`;
}

// Format bytes for display
function formatDirectBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Calculate real-time speed and ETA
function calculateDirectSpeed(uploaded, total, startTime) {
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = elapsed > 0 ? uploaded / elapsed : 0;
    const remaining = total - uploaded;
    const eta = speed > 0 ? remaining / speed : 0;
    
    return {
        speed: formatDirectBytes(speed) + "/s",
        eta: eta > 0 && eta < 86400 ? formatDirectTime(eta) : "Calculating...",
        elapsed: elapsed
    };
}

// Format time
function formatDirectTime(seconds) {
    if (seconds < 60) return Math.round(seconds) + "s";
    if (seconds < 3600) return Math.round(seconds / 60) + "m " + Math.round(seconds % 60) + "s";
    return Math.round(seconds / 3600) + "h " + Math.round((seconds % 3600) / 60) + "m";
}

// Update progress display with REAL progress
function updateDirectProgress(uploaded, total, startTime, filename) {
    const progressBar = document.getElementById("addVideoProgressBar");
    const progressText = document.getElementById("addVideoProgressText");
    
    if (\!progressBar || \!progressText) return;
    
    // Calculate exact progress percentage
    const percentage = (uploaded / total) * 100;
    
    // Update progress bar immediately (no transitions for real-time)
    progressBar.style.width = percentage.toFixed(2) + "%";
    progressBar.style.transition = "none";
    
    // Get speed and ETA
    const stats = calculateDirectSpeed(uploaded, total, startTime);
    
    // Update text with real-time info
    progressText.innerHTML = 
        "<div class=\"upload-progress-info\">" +
            "<div class=\"progress-main\">🚀 Uploading to Bunny CDN... " + percentage.toFixed(1) + "%</div>" +
            "<div class=\"progress-details\">" +
                "<span class=\"bytes-info\">" + formatDirectBytes(uploaded) + " / " + formatDirectBytes(total) + "</span>" +
                "<span class=\"speed-info\">" + stats.speed + "</span>" +
                "<span class=\"eta-info\">ETA: " + stats.eta + "</span>" +
            "</div>" +
            "<div class=\"progress-file\">" +
                "<small>File: " + filename + "</small>" +
            "</div>" +
        "</div>";
    
    console.log("📊 Progress: " + percentage.toFixed(2) + "% (" + formatDirectBytes(uploaded) + "/" + formatDirectBytes(total) + ") " + stats.speed);
}

// Show upload completion
function showDirectCompletion(filename, uploadTime) {
    const progressBar = document.getElementById("addVideoProgressBar");
    const progressText = document.getElementById("addVideoProgressText");
    
    if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.style.background = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
        progressBar.style.boxShadow = "0 0 15px rgba(40, 167, 69, 0.6)";
    }
    
    if (progressText) {
        progressText.innerHTML = 
            "<div class=\"upload-progress-info\">" +
                "<div class=\"progress-main\" style=\"color: #28a745; font-weight: 700;\">✅ Upload completed successfully\!</div>" +
                "<div class=\"progress-details\">" +
                    "<span class=\"upload-time\">Upload time: " + uploadTime.toFixed(1) + "s</span>" +
                    "<span class=\"file-location\">Stored in: courses/" + sanitizeFolderName(currentCourseTitle) + "/</span>" +
                "</div>" +
            "</div>";
    }
    
    console.log("✅ Upload completed in " + uploadTime.toFixed(1) + "s - File: " + filename);
}

// Get course title from course ID
async function getCourseTitle(courseId) {
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

// DIRECT UPLOAD TO BUNNY CDN
function uploadToBunnyDirect(file, filename, startTime) {
    return new Promise((resolve, reject) => {
        console.log("📤 Starting direct upload to Bunny CDN:", filename);
        
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${BUNNY_DIRECT_CONFIG.storageUrl}/${filename}`;
        
        // REAL-TIME PROGRESS TRACKING
        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
                updateDirectProgress(e.loaded, e.total, startTime, filename.split("/").pop());
            }
        });
        
        // UPLOAD SUCCESS
        xhr.addEventListener("load", () => {
            const uploadTime = (Date.now() - startTime) / 1000;
            console.log("📡 Bunny CDN response:", xhr.status, xhr.responseText);
            
            if (xhr.status === 200 || xhr.status === 201) {
                showDirectCompletion(filename, uploadTime);
                
                resolve({
                    success: true,
                    url: `${BUNNY_DIRECT_CONFIG.cdnUrl}/${filename}`,
                    filename: filename,
                    uploadTime: uploadTime,
                    folder: `courses/${sanitizeFolderName(currentCourseTitle)}/`
                });
            } else {
                console.error("❌ Bunny upload failed:", xhr.status, xhr.responseText);
                reject(new Error(`Bunny CDN upload failed: ${xhr.status}`));
            }
        });
        
        // ERROR HANDLING
        xhr.addEventListener("error", () => {
            console.error("❌ Network error during upload");
            reject(new Error("Network error during direct upload"));
        });
        
        xhr.addEventListener("timeout", () => {
            console.error("❌ Upload timeout");
            reject(new Error("Upload timeout"));
        });
        
        // CONFIGURE REQUEST
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("AccessKey", BUNNY_DIRECT_CONFIG.storagePassword);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.timeout = 300000; // 5 minute timeout
        
        console.log("🎯 Uploading to:", uploadUrl);
        xhr.send(file);
    });
}

// MAIN UPLOAD FUNCTION
async function uploadVideoDirectBunny(file, formData) {
    if (uploadInProgress) {
        alert("❌ Another upload is in progress. Please wait...");
        return { success: false, message: "Another upload in progress" };
    }
    
    uploadInProgress = true;
    
    try {
        console.log("🚀 Starting direct video upload:", file.name, "(" + formatDirectBytes(file.size) + ")");
        
        const courseId = formData.get("course_id");
        if (\!courseId) {
            throw new Error("No course selected");
        }
        
        // Get course title for folder organization
        currentCourseTitle = await getCourseTitle(courseId);
        console.log("📁 Course title:", currentCourseTitle);
        
        // Generate filename with course folder
        const filename = generateDirectFilename(file.name, currentCourseTitle);
        console.log("📂 Upload path:", filename);
        
        // Show progress container
        const progressContainer = document.getElementById("addVideoProgress");
        if (progressContainer) {
            progressContainer.style.display = "block";
        }
        
        // STEP 1: Direct upload to Bunny CDN
        const startTime = Date.now();
        const uploadResult = await uploadToBunnyDirect(file, filename, startTime);
        
        console.log("🎉 Direct upload completed:", uploadResult);
        
        // STEP 2: Save metadata to database
        console.log("💾 Saving video metadata...");
        
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
            console.log("✅ Video metadata saved successfully");
            
            // Hide progress and clean up after 2 seconds
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
                alert("✅ Video uploaded successfully to Bunny CDN\!\nFolder: " + uploadResult.folder);
                
            }, 2000);
            
            return { success: true, message: "Video uploaded successfully\!" };
            
        } else {
            throw new Error(result.message || "Failed to save video metadata");
        }
        
    } catch (error) {
        console.error("❌ Upload failed:", error);
        
        // Show error
        const progressText = document.getElementById("addVideoProgressText");
        if (progressText) {
            progressText.innerHTML = 
                "<div class=\"text-danger\">❌ Upload failed: " + error.message + "</div>";
        }
        
        alert("❌ Upload failed: " + error.message);
        return { success: false, message: error.message };
        
    } finally {
        uploadInProgress = false;
    }
}

// BULK UPLOAD
async function uploadMultipleVideosDirect(files) {
    console.log("📁 Starting bulk direct upload:", files.length, "files");
    
    if (\!selectedCourseId) {
        alert("❌ Please select a course first");
        return;
    }
    
    // Get course title once for all uploads
    currentCourseTitle = await getCourseTitle(selectedCourseId);
    console.log("📁 Bulk upload folder:", sanitizeFolderName(currentCourseTitle));
    
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
            
            const result = await uploadVideoDirectBunny(file, formData);
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
        bulkProgressText.innerHTML = `✅ Bulk upload completed: ${completed}/${files.length} files in courses/${sanitizeFolderName(currentCourseTitle)}/`;
    }
    
    setTimeout(() => {
        if (bulkProgressContainer) bulkProgressContainer.style.display = "none";
        if (typeof loadCourseVideos === "function") {
            loadCourseVideos();
        }
        alert(`✅ Bulk upload completed: ${completed}/${files.length} files uploaded`);
    }, 3000);
    
    return results;
}

// REPLACE EXISTING FUNCTIONS
window.uploadVideoDirectToBunny = uploadVideoDirectBunny;
window.uploadMultipleVideosDirectToBunny = uploadMultipleVideosDirect;

console.log("✅ DIRECT Bunny CDN Upload System loaded - Course Title Folders + Real Progress\!");

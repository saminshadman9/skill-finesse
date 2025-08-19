// Course Upload Handler - Updated for Direct Bunny CDN Upload
console.log("Loading Course Upload Handler with Direct Bunny CDN Support...");

// Global variables
let selectedCourseId = null;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    initializeCourseUpload();
});

function initializeCourseUpload() {
    // Load courses into select
    loadCourses();
    
    // Setup form handlers
    setupFormHandlers();
    
    // Setup drag and drop
    setupDragAndDrop();
}

function loadCourses() {
    fetch("/admin/get-courses")
        .then(response => response.json())
        .then(data => {
            const courseSelect = document.getElementById("courseSelect");
            if (\!courseSelect) return;
            
            courseSelect.innerHTML = "<option value=>Choose a course to get started...</option>";
            
            if (data.success && data.courses) {
                data.courses.forEach(course => {
                    const option = document.createElement("option");
                    option.value = course.id;
                    option.textContent = course.title;
                    courseSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error("Error loading courses:", error);
        });
}

function loadCourseVideos() {
    if (\!selectedCourseId) return;
    
    fetch(`/admin/get-course-videos/${selectedCourseId}`)
        .then(response => response.json())
        .then(data => {
            const videoList = document.getElementById("videoList");
            if (\!videoList) return;
            
            if (data.success && data.videos && data.videos.length > 0) {
                videoList.innerHTML = "";
                
                data.videos.forEach(video => {
                    const videoElement = createVideoElement(video);
                    videoList.appendChild(videoElement);
                });
            } else {
                videoList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-video"></i>
                        </div>
                        <h4 class="empty-title">No videos yet</h4>
                        <p class="empty-description">Start building your course by adding your first video</p>
                        <button class="btn-modern btn-primary" data-bs-toggle="modal" data-bs-target="#addVideoModal">
                            <i class="fas fa-plus me-2"></i>Add Your First Video
                        </button>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error("Error loading course videos:", error);
        });
}

function createVideoElement(video) {
    const videoDiv = document.createElement("div");
    videoDiv.className = "video-item-modern";
    videoDiv.innerHTML = `
        <div class="video-content-modern">
            <div class="video-thumbnail-modern">
                <i class="fas fa-play"></i>
            </div>
            <div class="video-info-modern">
                <h4 class="video-title-modern">${video.title}</h4>
                <div class="video-meta-modern">
                    <div class="video-meta-item">
                        <i class="fas fa-sort-numeric-up"></i>
                        Order: ${video.order_index}
                    </div>
                    <div class="video-meta-item">
                        <i class="fas fa-clock"></i>
                        Duration: N/A
                    </div>
                    ${video.is_preview ? "<div class=\"video-meta-item\"><i class=\"fas fa-eye\"></i>Preview</div>" : ""}
                </div>
                ${video.description ? `<p class="video-description">${video.description}</p>` : ""}
            </div>
            <div class="video-actions-modern">
                <button class="action-btn preview" onclick="previewVideo(${video.id})">
                    <i class="fas fa-play"></i> Preview
                </button>
                <button class="action-btn edit" onclick="editVideo(${video.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete" onclick="deleteVideo(${video.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    return videoDiv;
}

function setupFormHandlers() {
    // Add Video Form Handler (Modal)
    const addVideoForm = document.getElementById("addVideoForm");
    if (addVideoForm) {
        addVideoForm.addEventListener("submit", handleAddVideoSubmit);
    }
    
    // Course Selection Handler
    const courseSelect = document.getElementById("courseSelect");
    if (courseSelect) {
        courseSelect.addEventListener("change", function() {
            selectedCourseId = this.value;
            
            if (selectedCourseId) {
                // Show course info
                showCourseInfo();
                
                // Show video upload section
                const videoUploadSection = document.getElementById("videoUploadSection");
                if (videoUploadSection) {
                    videoUploadSection.style.display = "block";
                }
                
                // Load course videos
                loadCourseVideos();
            } else {
                // Hide video upload section
                const videoUploadSection = document.getElementById("videoUploadSection");
                if (videoUploadSection) {
                    videoUploadSection.style.display = "none";
                }
            }
        });
    }
    
    // Bulk Upload Handler
    const bulkVideoUpload = document.getElementById("bulkVideoUpload");
    if (bulkVideoUpload) {
        bulkVideoUpload.addEventListener("change", handleBulkUpload);
    }
}

function setupDragAndDrop() {
    const bulkUploadArea = document.getElementById("bulkUploadArea");
    if (\!bulkUploadArea) return;
    
    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
        bulkUploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ["dragenter", "dragover"].forEach(eventName => {
        bulkUploadArea.addEventListener(eventName, highlight, false);
    });
    
    ["dragleave", "drop"].forEach(eventName => {
        bulkUploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    bulkUploadArea.addEventListener("drop", handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        bulkUploadArea.classList.add("dragover");
    }
    
    function unhighlight(e) {
        bulkUploadArea.classList.remove("dragover");
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleBulkUploadFiles(Array.from(files));
        }
    }
}

async function handleAddVideoSubmit(e) {
    e.preventDefault();
    
    if (\!selectedCourseId) {
        alert("Please select a course first");
        return;
    }
    
    const formData = new FormData(e.target);
    formData.append("course_id", selectedCourseId);
    
    const videoFile = formData.get("video");
    if (\!videoFile || videoFile.size === 0) {
        alert("Please select a video file");
        return;
    }
    
    console.log("Starting direct Bunny CDN upload...");
    
    try {
        const result = await uploadVideoDirectToBunny(videoFile, formData);
        
        if (result.success) {
            // Reset form
            e.target.reset();
            
            // Show success message
            showNotification("Video uploaded successfully\!", "success");
        } else {
            showNotification(`Upload failed: ${result.message}`, "error");
        }
    } catch (error) {
        console.error("Upload error:", error);
        showNotification(`Upload failed: ${error.message}`, "error");
    }
}

function handleBulkUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleBulkUploadFiles(files);
    }
}

async function handleBulkUploadFiles(files) {
    if (\!selectedCourseId) {
        alert("Please select a course first");
        return;
    }
    
    console.log(`Starting bulk upload of ${files.length} files...`);
    
    try {
        const results = await uploadMultipleVideosDirectToBunny(files);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        let message = `Bulk upload completed: ${successCount} successful`;
        if (failCount > 0) {
            message += `, ${failCount} failed`;
        }
        
        showNotification(message, successCount > 0 ? "success" : "error");
        
    } catch (error) {
        console.error("Bulk upload error:", error);
        showNotification(`Bulk upload failed: ${error.message}`, "error");
    }
}

function showCourseInfo() {
    // This would show course information - implement as needed
    const courseInfoPanel = document.getElementById("selectedCourseInfo");
    if (courseInfoPanel) {
        courseInfoPanel.style.display = "block";
        // Add course info content here
    }
}

function showNotification(message, type = "info") {
    // Simple notification - you can enhance this
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 9999;
        ${type === "success" ? "background-color: #28a745;" : ""}
        ${type === "error" ? "background-color: #dc3545;" : ""}
        ${type === "info" ? "background-color: #17a2b8;" : ""}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Video management functions
function previewVideo(videoId) {
    // Implement video preview
    console.log("Preview video:", videoId);
}

function editVideo(videoId) {
    // Implement video edit
    console.log("Edit video:", videoId);
}

function deleteVideo(videoId) {
    if (confirm("Are you sure you want to delete this video?")) {
        fetch(`/admin/delete-video/${videoId}`, {
            method: "DELETE"
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification("Video deleted successfully", "success");
                loadCourseVideos();
            } else {
                showNotification(`Delete failed: ${data.message}`, "error");
            }
        })
        .catch(error => {
            console.error("Delete error:", error);
            showNotification(`Delete failed: ${error.message}`, "error");
        });
    }
}

console.log("Course Upload Handler loaded successfully");

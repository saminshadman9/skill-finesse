// Progress 100% Completion Guarantee
console.log("Loading progress 100% completion guarantee...");

// Core function to absolutely guarantee 100% completion
function guaranteeProgress100(progressBarId, progressTextId, message) {
    console.log("💯 GUARANTEEING 100% completion for:", progressBarId);
    
    const progressBar = document.getElementById(progressBarId);
    const progressText = document.getElementById(progressTextId);
    const progressContainer = progressBar ? progressBar.closest(".upload-progress-container") : null;
    
    if (\!progressBar) {
        console.error("❌ Progress bar not found:", progressBarId);
        return false;
    }
    
    // Method 1: Direct style manipulation
    progressBar.style.width = "100%";
    progressBar.style.minWidth = "100%";
    progressBar.style.maxWidth = "100%";
    progressBar.style.flexBasis = "100%";
    progressBar.style.transform = "scaleX(1)";
    progressBar.style.setProperty("width", "100%", "important");
    
    // Method 2: CSS classes
    progressBar.classList.add("progress-complete");
    progressBar.classList.add("force-complete");
    progressBar.classList.add("width-100");
    
    // Method 3: Create overlay if needed
    let overlay = progressBar.querySelector(".progress-overlay-100");
    if (\!overlay) {
        overlay = document.createElement("div");
        overlay.className = "progress-overlay-100";
        overlay.style.cssText = 
            "position: absolute;" +
            "top: 0;" +
            "left: 0;" +
            "width: 100%;" +
            "height: 100%;" +
            "background: linear-gradient(135deg, #28a745 0%, #20c997 100%);" +
            "border-radius: inherit;" +
            "z-index: 10;";
        progressBar.style.position = "relative";
        progressBar.appendChild(overlay);
    }
    
    // Method 4: Force reflow multiple times
    progressBar.offsetHeight;
    progressBar.offsetWidth;
    
    // Update text
    if (progressText) {
        progressText.innerHTML = 
            "<div class=\"upload-progress-info\">" +
                "<div class=\"progress-main\" style=\"color: #28a745; font-weight: 700; font-size: 1.1rem;\">" +
                    "✅ " + (message || "Upload completed successfully\!") +
                "</div>" +
            "</div>";
    }
    
    console.log("✅ Progress bar guaranteed at 100%");
    return true;
}

// Enhanced XMLHttpRequest upload event handler
function enhanceXHRUpload(xhr, progressBarId, progressTextId, file) {
    let lastProgress = 0;
    
    xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            
            // Update progress normally
            updateProgressDisplay(
                "xhr_upload", 
                progress, 
                e.loaded, 
                e.total, 
                Date.now(), 
                "uploading"
            );
            
            // Force 100% if we are very close
            if (progress >= 99.8 && lastProgress < 99.8) {
                console.log("🎯 XHR Upload very close to completion, forcing 100%");
                setTimeout(() => {
                    guaranteeProgress100(progressBarId, progressTextId, "Upload completed\!");
                }, 200);
            }
            
            lastProgress = progress;
        }
    });
    
    xhr.upload.addEventListener("load", () => {
        console.log("📡 XHR Upload load event fired");
        setTimeout(() => {
            guaranteeProgress100(progressBarId, progressTextId, "Upload completed\!");
        }, 100);
    });
    
    xhr.addEventListener("load", () => {
        console.log("📡 XHR load event fired");
        if (xhr.status === 200 || xhr.status === 201) {
            setTimeout(() => {
                guaranteeProgress100(progressBarId, progressTextId, "Upload completed\!");
            }, 100);
        }
    });
}

// Override the single chunk upload function
const originalUploadSingleChunk = window.uploadSingleChunk;
if (originalUploadSingleChunk) {
    window.uploadSingleChunk = function(file, filename, uploadId, startTime, resolve, reject) {
        console.log("🔄 Enhanced single chunk upload");
        
        const xhr = new XMLHttpRequest();
        const uploadUrl = BUNNY_CONFIG.storageUrl + "/" + filename;
        
        // Enhance with guaranteed completion
        enhanceXHRUpload(xhr, "addVideoProgressBar", "addVideoProgressText", file);
        
        xhr.onload = function() {
            console.log("📡 Single chunk upload completed with status:", xhr.status);
            
            if (xhr.status === 200 || xhr.status === 201) {
                // Guarantee 100% completion
                guaranteeProgress100("addVideoProgressBar", "addVideoProgressText", "Upload to Bunny CDN completed\!");
                
                resolve({
                    success: true,
                    url: BUNNY_CONFIG.cdnUrl + "/" + filename,
                    filename: filename
                });
            } else {
                reject(new Error("Upload failed with status: " + xhr.status));
            }
        };
        
        xhr.onerror = () => {
            console.error("❌ Single chunk upload error");
            reject(new Error("Network error during upload"));
        };
        
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("AccessKey", BUNNY_CONFIG.storagePassword);
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.send(file);
    };
}

// Final completion guarantee for any upload
function setupFinalCompletionGuarantee() {
    // Watch for successful upload completion
    const originalUploadVideo = window.uploadVideoDirectToBunny;
    
    window.uploadVideoDirectToBunny = async function(file, formData) {
        console.log("🚀 Starting upload with 100% completion guarantee");
        
        try {
            const result = await originalUploadVideo(file, formData);
            
            if (result && result.success) {
                console.log("✅ Upload reported successful, guaranteeing 100% visual completion");
                
                // Multiple attempts to ensure 100% completion
                setTimeout(() => guaranteeProgress100("addVideoProgressBar", "addVideoProgressText"), 100);
                setTimeout(() => guaranteeProgress100("addVideoProgressBar", "addVideoProgressText"), 500);
                setTimeout(() => guaranteeProgress100("addVideoProgressBar", "addVideoProgressText"), 1000);
            }
            
            return result;
            
        } catch (error) {
            console.error("❌ Upload failed:", error);
            throw error;
        }
    };
}

// CSS to ensure 100% completion is visible
function injectGuaranteeCSS() {
    const style = document.createElement("style");
    style.textContent = 
        ".width-100, .progress-overlay-100 { width: 100% \!important; }" +
        ".force-complete { " +
            "width: 100% \!important; " +
            "min-width: 100% \!important; " +
            "background: linear-gradient(135deg, #28a745 0%, #20c997 100%) \!important; " +
            "box-shadow: 0 0 20px rgba(40, 167, 69, 0.7) \!important; " +
        "}" +
        ".progress-bar-modern { overflow: visible \!important; }" +
        ".upload-progress-container { padding: 1.5rem \!important; }";
    
    document.head.appendChild(style);
}

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
    injectGuaranteeCSS();
    setupFinalCompletionGuarantee();
    console.log("🎯 Progress 100% completion guarantee initialized");
});

console.log("✅ Progress 100% completion guarantee loaded");

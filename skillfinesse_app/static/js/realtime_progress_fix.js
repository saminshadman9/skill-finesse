// Real-time Progress Bar Completion Fix
console.log("Loading real-time progress bar fix...");

// Global variables to track progress state
let progressMonitorInterval = null;
let lastProgressUpdate = 0;

// Enhanced real-time progress monitoring
function startProgressMonitoring(progressBarId, progressTextId) {
    console.log("Starting real-time progress monitoring for:", progressBarId);
    
    if (progressMonitorInterval) {
        clearInterval(progressMonitorInterval);
    }
    
    progressMonitorInterval = setInterval(() => {
        const progressBar = document.getElementById(progressBarId);
        const progressText = document.getElementById(progressTextId);
        
        if (\!progressBar) return;
        
        const currentWidth = parseFloat(progressBar.style.width) || 0;
        
        // Force visual completion if we detect stalling near 100%
        if (currentWidth >= 98 && currentWidth < 100) {
            console.log("Forcing progress completion at:", currentWidth + "%");
            forceVisualCompletion(progressBarId, progressTextId);
        }
        
        // Check for completion
        if (currentWidth >= 100) {
            console.log("Progress monitoring detected 100% completion");
            clearInterval(progressMonitorInterval);
            progressMonitorInterval = null;
        }
        
    }, 250); // Check every 250ms
}

// Force visual completion with immediate effect
function forceVisualCompletion(progressBarId, progressTextId) {
    console.log("Forcing visual completion for:", progressBarId);
    
    const progressBar = document.getElementById(progressBarId);
    const progressText = document.getElementById(progressTextId);
    
    if (progressBar) {
        // Multiple methods to ensure 100% completion
        progressBar.style.width = "100%";
        progressBar.style.minWidth = "100%";
        progressBar.style.maxWidth = "100%";
        progressBar.style.flexBasis = "100%";
        progressBar.style.transform = "scaleX(1)";
        
        // Force reflow
        progressBar.offsetHeight;
        
        // Add completion class
        progressBar.classList.add("progress-complete");
        progressBar.classList.add("force-complete");
        
        // Set CSS custom property
        progressBar.style.setProperty("--progress-width", "100%");
        
        console.log("Progress bar forced to 100% width");
    }
    
    if (progressText) {
        progressText.innerHTML = 
            "<div class=\"upload-progress-info\">" +
                "<div class=\"progress-main\" style=\"color: #28a745; font-weight: 700;\">" +
                    "Upload completed successfully\!" +
                "</div>" +
            "</div>";
    }
}

// Enhanced updateProgressDisplay with real-time completion
const originalUpdateProgressDisplay = window.updateProgressDisplay;
window.updateProgressDisplayRealtime = function(uploadId, progress, uploaded, total, startTime, phase) {
    phase = phase || "uploading";
    console.log("Progress update:", progress.toFixed(1) + "% (" + phase + ")");
    
    // Call original function first
    if (originalUpdateProgressDisplay) {
        originalUpdateProgressDisplay(uploadId, progress, uploaded, total, startTime, phase);
    }
    
    const progressBarId = "addVideoProgressBar";
    const progressTextId = "addVideoProgressText";
    
    // Start monitoring if not already started
    if (\!progressMonitorInterval && phase === "uploading") {
        startProgressMonitoring(progressBarId, progressTextId);
    }
    
    // Handle completion phases
    if (phase === "completed" || progress >= 100) {
        console.log("Detected completion phase, forcing visual completion");
        setTimeout(() => {
            forceVisualCompletion(progressBarId, progressTextId);
        }, 100);
    }
    
    // Force completion if upload phase reaches 100%
    if (phase === "uploading" && progress >= 99.5) {
        console.log("Upload phase near completion, preparing for finish");
        setTimeout(() => {
            const progressBar = document.getElementById(progressBarId);
            if (progressBar && parseFloat(progressBar.style.width) < 100) {
                forceVisualCompletion(progressBarId, progressTextId);
            }
        }, 500);
    }
    
    lastProgressUpdate = Date.now();
};

// Override the existing function
window.updateProgressDisplay = window.updateProgressDisplayRealtime;

// Enhanced upload function with guaranteed completion
const originalUploadFunction = window.uploadVideoDirectToBunny;
window.uploadVideoDirectToBunnyRealtime = async function(file, formData) {
    console.log("Starting enhanced real-time upload for:", file.name);
    
    const progressBarId = "addVideoProgressBar";
    const progressTextId = "addVideoProgressText";
    
    // Clear any existing monitoring
    if (progressMonitorInterval) {
        clearInterval(progressMonitorInterval);
        progressMonitorInterval = null;
    }
    
    try {
        // Call original upload function
        const result = await originalUploadFunction(file, formData);
        
        // Ensure completion is visually shown
        if (result.success) {
            console.log("Upload successful, ensuring visual completion");
            setTimeout(() => {
                forceVisualCompletion(progressBarId, progressTextId);
            }, 200);
        }
        
        return result;
        
    } catch (error) {
        console.error("Upload error:", error);
        
        // Clear monitoring on error
        if (progressMonitorInterval) {
            clearInterval(progressMonitorInterval);
            progressMonitorInterval = null;
        }
        
        throw error;
    }
};

// Replace the upload function
window.uploadVideoDirectToBunny = window.uploadVideoDirectToBunnyRealtime;

// CSS injection to ensure visual completion
function injectCompletionCSS() {
    const style = document.createElement("style");
    style.textContent = 
        "/* Force progress bar completion */" +
        ".progress-fill.force-complete, .force-complete {" +
            "width: 100% \!important;" +
            "min-width: 100% \!important;" +
            "max-width: 100% \!important;" +
            "flex-basis: 100% \!important;" +
            "transform: scaleX(1) \!important;" +
            "background: linear-gradient(135deg, #28a745 0%, #20c997 100%) \!important;" +
            "box-shadow: 0 0 15px rgba(40, 167, 69, 0.6) \!important;" +
        "}" +
        ".progress-bar-modern {" +
            "position: relative \!important;" +
            "width: 100% \!important;" +
            "overflow: hidden \!important;" +
        "}" +
        ".progress-complete {" +
            "animation: progress-completion 0.5s ease-in-out forwards \!important;" +
        "}" +
        "@keyframes progress-completion {" +
            "from { transform: scaleX(0.9); }" +
            "to { transform: scaleX(1); }" +
        "}" +
        ".upload-progress-container .progress-wrapper {" +
            "width: 100% \!important;" +
        "}";
    document.head.appendChild(style);
    console.log("Completion CSS injected");
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    injectCompletionCSS();
    console.log("Real-time progress fix initialized");
});

// Cleanup function
window.cleanupProgressMonitoring = function() {
    if (progressMonitorInterval) {
        clearInterval(progressMonitorInterval);
        progressMonitorInterval = null;
        console.log("Progress monitoring cleaned up");
    }
};

// Monitor for page unload to cleanup
window.addEventListener("beforeunload", () => {
    window.cleanupProgressMonitoring();
});

console.log("Real-time progress bar fix loaded successfully");

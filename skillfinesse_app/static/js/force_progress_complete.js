// Force Progress Bar to 100% Completion
console.log("Loading force progress completion...");

// Function to ensure progress bar reaches 100%
function forceProgressComplete(progressBarId) {
    const progressBar = document.getElementById(progressBarId);
    if (progressBar) {
        // Force immediate 100% width
        progressBar.style.width = "100%";
        progressBar.style.minWidth = "100%";
        progressBar.style.maxWidth = "100%";
        progressBar.style.transition = "width 0.5s ease";
        
        // Add completion class
        progressBar.classList.add("progress-complete");
        
        // Force reflow to ensure style is applied
        progressBar.offsetHeight;
        
        console.log("Progress bar forced to 100%:", progressBarId);
    }
}

// Enhanced completion function
function showUploadComplete(message) {
    // Force both progress bars to 100%
    forceProgressComplete("addVideoProgressBar");
    forceProgressComplete("bulkUploadProgressBar");
    
    // Update text to show completion
    const progressTexts = [
        document.getElementById("addVideoProgressText"),
        document.getElementById("bulkUploadProgressText")
    ];
    
    progressTexts.forEach(progressText => {
        if (progressText) {
            progressText.innerHTML = 
                "<div class=\"upload-progress-info\">" +
                    "<div class=\"progress-main\" style=\"color: #28a745; font-weight: 700;\">" +
                        "✅ " + (message || "Video uploaded successfully\!") +
                    "</div>" +
                "</div>";
        }
    });
}

// Override the existing functions to ensure 100% completion
const originalUpdateProgressDisplay = window.updateProgressDisplay;
window.updateProgressDisplay = function(uploadId, progress, uploaded, total, startTime, phase = "uploading") {
    // Call original function first
    if (originalUpdateProgressDisplay) {
        originalUpdateProgressDisplay(uploadId, progress, uploaded, total, startTime, phase);
    }
    
    // Force 100% completion if phase is completed
    if (phase === "completed") {
        setTimeout(() => {
            forceProgressComplete("addVideoProgressBar");
            forceProgressComplete("bulkUploadProgressBar");
            showUploadComplete("Video uploaded successfully\!");
        }, 100);
    }
};

// Monitor for progress bar updates and force completion
function monitorProgressBars() {
    const progressBars = document.querySelectorAll(".progress-fill");
    
    progressBars.forEach(progressBar => {
        // Watch for width changes
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === "attributes" && mutation.attributeName === "style") {
                    const width = progressBar.style.width;
                    
                    // If width is 99% or higher, force to 100%
                    if (width && parseFloat(width) >= 99) {
                        setTimeout(() => {
                            progressBar.style.width = "100%";
                            progressBar.classList.add("progress-complete");
                        }, 100);
                    }
                }
            });
        });
        
        observer.observe(progressBar, { 
            attributes: true, 
            attributeFilter: ["style"] 
        });
    });
}

// Start monitoring when DOM is ready
document.addEventListener("DOMContentLoaded", monitorProgressBars);

// Also monitor when progress containers become visible
const containerObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === "attributes" && mutation.attributeName === "style") {
            const target = mutation.target;
            if (target.id === "addVideoProgress" || target.id === "bulkUploadProgress") {
                if (target.style.display === "block") {
                    setTimeout(monitorProgressBars, 100);
                }
            }
        }
    });
});

// Start observing progress containers
document.addEventListener("DOMContentLoaded", () => {
    const progressContainers = [
        document.getElementById("addVideoProgress"),
        document.getElementById("bulkUploadProgress")
    ];
    
    progressContainers.forEach(container => {
        if (container) {
            containerObserver.observe(container, { 
                attributes: true, 
                attributeFilter: ["style"] 
            });
        }
    });
});

console.log("✅ Force progress completion loaded");

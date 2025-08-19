// Progress Bar Test Function
console.log("Loading progress bar test...");

// Test function to verify 100% completion
window.testProgressCompletion = function() {
    console.log("🧪 Testing progress bar completion...");
    
    // Show progress container
    const progressContainer = document.getElementById("addVideoProgress");
    if (progressContainer) {
        progressContainer.style.display = "block";
    }
    
    // Test progress increments
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        
        if (progress <= 85) {
            updateProgressDisplay("test", progress, progress * 1024 * 1024, 100 * 1024 * 1024, Date.now(), "uploading");
        } else if (progress <= 95) {
            updateProgressDisplay("test", progress - 85, 0, 0, 0, "processing");
        } else {
            updateProgressDisplay("test", 100, 0, 0, 0, "completed");
            clearInterval(interval);
            
            // Verify 100% completion
            setTimeout(() => {
                const progressBar = document.getElementById("addVideoProgressBar");
                if (progressBar) {
                    const width = progressBar.style.width;
                    console.log("📊 Final progress bar width:", width);
                    
                    if (width === "100%") {
                        console.log("✅ Progress bar test PASSED - reached 100%");
                    } else {
                        console.log("❌ Progress bar test FAILED - width is", width);
                    }
                }
            }, 1000);
        }
    }, 500);
};

// Add test button to page (for debugging)
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("admin")) {
        console.log("🔧 Progress test function available: testProgressCompletion()");
    }
});

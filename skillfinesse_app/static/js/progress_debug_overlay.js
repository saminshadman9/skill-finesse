// Progress Debug Overlay for Real-time Monitoring
console.log("Loading progress debug overlay...");

let debugOverlay = null;
let debugUpdateInterval = null;

// Create debug overlay
function createDebugOverlay() {
    if (debugOverlay) return debugOverlay;
    
    debugOverlay = document.createElement("div");
    debugOverlay.id = "progress-debug-overlay";
    debugOverlay.style.cssText = 
        "position: fixed;" +
        "top: 10px;" +
        "left: 10px;" +
        "background: rgba(0,0,0,0.8);" +
        "color: white;" +
        "padding: 10px;" +
        "border-radius: 5px;" +
        "font-family: monospace;" +
        "font-size: 12px;" +
        "z-index: 99999;" +
        "max-width: 300px;" +
        "line-height: 1.4;";
    
    document.body.appendChild(debugOverlay);
    return debugOverlay;
}

// Update debug info
function updateDebugInfo() {
    if (\!debugOverlay) return;
    
    const progressBar = document.getElementById("addVideoProgressBar");
    const bulkProgressBar = document.getElementById("bulkUploadProgressBar");
    const progressText = document.getElementById("addVideoProgressText");
    
    let info = "🔧 PROGRESS DEBUG INFO\\n";
    info += "========================\\n";
    
    if (progressBar) {
        const computedStyle = window.getComputedStyle(progressBar);
        info += "📊 Single Upload Progress:\\n";
        info += "  Style Width: " + (progressBar.style.width || "not set") + "\\n";
        info += "  Computed Width: " + computedStyle.width + "\\n";
        info += "  Classes: " + progressBar.className + "\\n";
        info += "  Visible: " + (progressBar.offsetParent \!== null) + "\\n";
    }
    
    if (bulkProgressBar) {
        const computedStyle = window.getComputedStyle(bulkProgressBar);
        info += "📁 Bulk Upload Progress:\\n";
        info += "  Style Width: " + (bulkProgressBar.style.width || "not set") + "\\n";
        info += "  Computed Width: " + computedStyle.width + "\\n";
    }
    
    if (progressText) {
        const textContent = progressText.textContent.substring(0, 50) + "...";
        info += "📝 Progress Text: " + textContent + "\\n";
    }
    
    info += "\\n⏰ Last Update: " + new Date().toLocaleTimeString();
    
    debugOverlay.innerHTML = info.replace(/\\n/g, "<br>");
}

// Start debug monitoring
function startDebugMonitoring() {
    createDebugOverlay();
    
    if (debugUpdateInterval) {
        clearInterval(debugUpdateInterval);
    }
    
    debugUpdateInterval = setInterval(updateDebugInfo, 500);
    console.log("🐛 Debug monitoring started");
}

// Stop debug monitoring
function stopDebugMonitoring() {
    if (debugUpdateInterval) {
        clearInterval(debugUpdateInterval);
        debugUpdateInterval = null;
    }
    
    if (debugOverlay) {
        debugOverlay.remove();
        debugOverlay = null;
    }
    
    console.log("🐛 Debug monitoring stopped");
}

// Toggle debug monitoring
window.toggleProgressDebug = function() {
    if (debugOverlay) {
        stopDebugMonitoring();
    } else {
        startDebugMonitoring();
    }
};

// Auto-start debug monitoring when progress becomes visible
function autoStartDebugOnProgress() {
    const progressContainers = [
        document.getElementById("addVideoProgress"),
        document.getElementById("bulkUploadProgress")
    ];
    
    progressContainers.forEach(container => {
        if (container) {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.type === "attributes" && mutation.attributeName === "style") {
                        if (container.style.display === "block") {
                            console.log("🎯 Progress container became visible, starting debug");
                            startDebugMonitoring();
                        } else if (container.style.display === "none") {
                            console.log("🎯 Progress container hidden, stopping debug");
                            stopDebugMonitoring();
                        }
                    }
                });
            });
            
            observer.observe(container, { 
                attributes: true, 
                attributeFilter: ["style"] 
            });
        }
    });
}

// Initialize debug monitoring
document.addEventListener("DOMContentLoaded", () => {
    autoStartDebugOnProgress();
    console.log("🔧 Progress debug overlay initialized");
    console.log("💡 Use toggleProgressDebug() to manually toggle debug overlay");
});

console.log("✅ Progress debug overlay loaded");

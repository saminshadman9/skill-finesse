// Test Enhanced Real-Time Progress System
console.log("Loading Enhanced Progress Test...");

// Test enhanced real-time progress display
window.testEnhancedProgress = function() {
    console.log("🧪 Testing Enhanced Real-Time Progress...");
    
    const progressContainer = document.getElementById("addVideoProgress");
    if (progressContainer) {
        progressContainer.style.display = "block";
    }
    
    // Reset progress state
    resetProgressState();
    
    // Simulate realistic upload progress
    let uploaded = 0;
    const total = 750 * 1024 * 1024; // 750MB test file
    const startTime = Date.now();
    const filename = "test_enhanced_video.mp4";
    
    console.log("🎯 Starting enhanced progress simulation...");
    
    const interval = setInterval(() => {
        // Simulate variable upload speed with realistic patterns
        const baseSpeed = 2 * 1024 * 1024; // 2MB/s base
        const variation = Math.random() * 8 * 1024 * 1024; // 0-8MB/s variation
        const stall = Math.random() < 0.1 ? 0.1 : 1; // 10% chance of stall
        
        const increment = (baseSpeed + variation) * stall * 0.2; // 200ms intervals
        uploaded += increment;
        
        if (uploaded >= total) {
            uploaded = total;
            updateEnhancedProgress(uploaded, total, startTime, filename);
            
            setTimeout(() => {
                showEnhancedCompletion(filename, (Date.now() - startTime) / 1000, "courses/test_course/");
            }, 500);
            
            clearInterval(interval);
            
            console.log("✅ Enhanced progress test completed\!");
            
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.display = "none";
                }
            }, 8000);
        } else {
            updateEnhancedProgress(uploaded, total, startTime, filename);
        }
    }, 200); // Update every 200ms for smooth progress
};

// Test enhanced upload with real file
window.testEnhancedUpload = async function(courseId) {
    courseId = courseId || 1;
    
    console.log("🧪 Testing Enhanced Upload for course ID:", courseId);
    
    try {
        // Create test file
        const testContent = "Enhanced test video upload - " + new Date().toISOString();
        const testBlob = new Blob([testContent], { type: "text/plain" });
        const testFile = new File([testBlob], "enhanced_test_video.txt", { type: "text/plain" });
        
        // Create form data
        const formData = new FormData();
        formData.append("course_id", courseId);
        formData.append("title", "Enhanced Test Video");
        formData.append("description", "Testing enhanced upload with detailed progress");
        formData.append("order_index", "0");
        
        console.log("🎯 Starting enhanced upload test...");
        
        // Test enhanced upload
        const result = await enhancedUploadVideoDirectBunny(testFile, formData);
        
        if (result.success) {
            console.log("✅ ENHANCED UPLOAD TEST PASSED\!");
            console.log("📊 Result:", result);
            alert("✅ Enhanced Upload Test PASSED\!\nPeak Speed: " + formatBytesDetailed(progressState.peakSpeed) + "/s\nFolder: " + result.folder);
        } else {
            console.log("❌ ENHANCED UPLOAD TEST FAILED\!");
            console.log("📊 Result:", result);
            alert("❌ Enhanced Upload Test FAILED: " + result.message);
        }
        
    } catch (error) {
        console.error("❌ Enhanced test error:", error);
        alert("❌ Enhanced Test Error: " + error.message);
    }
};

// Performance monitoring test
window.testProgressPerformance = function() {
    console.log("🧪 Testing Progress Performance...");
    
    const iterations = 1000;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        const testUploaded = Math.random() * 1000 * 1024 * 1024;
        const testTotal = 1000 * 1024 * 1024;
        const testStartTime = Date.now() - Math.random() * 60000;
        
        // Test the enhanced progress function
        calculateDetailedStats(testUploaded, testTotal, Date.now());
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Progress Performance Test: ${iterations} calculations in ${duration.toFixed(2)}ms`);
    console.log(`📊 Average: ${(duration / iterations).toFixed(4)}ms per calculation`);
    
    alert(`Progress Performance: ${iterations} calculations in ${duration.toFixed(2)}ms`);
};

// Auto-initialize test functions
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("admin")) {
        console.log("🔧 Enhanced Progress Tests Available:");
        console.log("   - testEnhancedProgress() - Test detailed progress display");
        console.log("   - testEnhancedUpload(courseId) - Test enhanced upload");
        console.log("   - testProgressPerformance() - Test progress calculation performance");
    }
});

console.log("✅ Enhanced progress test loaded");

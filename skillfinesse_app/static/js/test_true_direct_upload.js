// Test TRUE Direct Upload System
console.log("Loading TRUE direct upload test...");

// Test function to verify real direct upload
window.testTrueDirectUpload = function() {
    console.log("🧪 Testing TRUE direct Bunny CDN upload...");
    
    // Create a test file (small text file)
    const testContent = "This is a test video file for Bunny CDN direct upload - " + new Date().toISOString();
    const testBlob = new Blob([testContent], { type: "text/plain" });
    const testFile = new File([testBlob], "test_video.txt", { type: "text/plain" });
    
    // Create test form data
    const testFormData = new FormData();
    testFormData.append("course_id", "1"); // Use course ID 1 for testing
    testFormData.append("title", "Test Direct Upload");
    testFormData.append("description", "Testing TRUE direct upload to Bunny CDN");
    testFormData.append("order_index", "0");
    
    console.log("🎯 Starting test upload...");
    
    // Test the TRUE direct upload
    uploadVideoRealDirect(testFile, testFormData)
        .then(result => {
            if (result.success) {
                console.log("✅ TRUE DIRECT UPLOAD TEST PASSED\!");
                console.log("📊 Result:", result);
                alert("✅ TRUE Direct Upload Test PASSED\! Check console for details.");
            } else {
                console.log("❌ TRUE DIRECT UPLOAD TEST FAILED\!");
                console.log("📊 Result:", result);
                alert("❌ TRUE Direct Upload Test FAILED\! Check console for details.");
            }
        })
        .catch(error => {
            console.error("❌ TEST ERROR:", error);
            alert("❌ Test Error: " + error.message);
        });
};

// Test real-time progress display
window.testRealProgress = function() {
    console.log("🧪 Testing real-time progress display...");
    
    const progressContainer = document.getElementById("addVideoProgress");
    if (progressContainer) {
        progressContainer.style.display = "block";
    }
    
    // Simulate real upload progress
    let uploaded = 0;
    const total = 100 * 1024 * 1024; // 100MB test file
    const startTime = Date.now();
    
    const interval = setInterval(() => {
        uploaded += Math.random() * 5 * 1024 * 1024; // Random progress 0-5MB
        
        if (uploaded >= total) {
            uploaded = total;
            updateRealProgress("test", uploaded, total, startTime);
            showRealCompletion();
            clearInterval(interval);
            
            console.log("✅ Real progress test completed\!");
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.display = "none";
                }
            }, 3000);
        } else {
            updateRealProgress("test", uploaded, total, startTime);
        }
    }, 200);
};

// Add test buttons (for debugging)
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("admin")) {
        console.log("🔧 TRUE Direct Upload Tests Available:");
        console.log("   - testTrueDirectUpload() - Test real upload");
        console.log("   - testRealProgress() - Test progress display");
    }
});

console.log("✅ TRUE direct upload test loaded");

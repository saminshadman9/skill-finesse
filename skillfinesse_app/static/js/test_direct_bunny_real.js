// Test Direct Bunny Real Upload System
console.log("Loading direct Bunny real upload test...");

// Test course title folder creation
window.testCourseFolderUpload = async function(courseId) {
    courseId = courseId || 1; // Default to course ID 1
    
    console.log("🧪 Testing course folder upload for course ID:", courseId);
    
    try {
        // Get course title
        const courseTitle = await getCourseTitle(courseId);
        console.log("📁 Course title:", courseTitle);
        console.log("📂 Sanitized folder:", sanitizeFolderName(courseTitle));
        
        // Create test file
        const testContent = "Test video upload - " + new Date().toISOString();
        const testBlob = new Blob([testContent], { type: "text/plain" });
        const testFile = new File([testBlob], "test_video.txt", { type: "text/plain" });
        
        // Create form data
        const formData = new FormData();
        formData.append("course_id", courseId);
        formData.append("title", "Test Video - " + courseTitle);
        formData.append("description", "Testing direct upload with course folders");
        formData.append("order_index", "0");
        
        console.log("🎯 Starting test upload...");
        
        // Test direct upload
        const result = await uploadVideoDirectBunny(testFile, formData);
        
        if (result.success) {
            console.log("✅ COURSE FOLDER UPLOAD TEST PASSED\!");
            console.log("📊 Result:", result);
            alert("✅ Course Folder Upload Test PASSED\!\nFolder: " + result.folder || "courses/" + sanitizeFolderName(courseTitle) + "/");
        } else {
            console.log("❌ COURSE FOLDER UPLOAD TEST FAILED\!");
            console.log("📊 Result:", result);
            alert("❌ Course Folder Upload Test FAILED: " + result.message);
        }
        
    } catch (error) {
        console.error("❌ TEST ERROR:", error);
        alert("❌ Test Error: " + error.message);
    }
};

// Test real progress display
window.testRealProgressBunny = function() {
    console.log("🧪 Testing real progress display...");
    
    const progressContainer = document.getElementById("addVideoProgress");
    if (progressContainer) {
        progressContainer.style.display = "block";
    }
    
    // Simulate real upload progress
    let uploaded = 0;
    const total = 500 * 1024 * 1024; // 500MB test file
    const startTime = Date.now();
    const filename = "test_video_real_progress.mp4";
    
    const interval = setInterval(() => {
        // Simulate variable upload speed (1-10MB per update)
        const increment = Math.random() * 10 * 1024 * 1024;
        uploaded += increment;
        
        if (uploaded >= total) {
            uploaded = total;
            updateDirectProgress(uploaded, total, startTime, filename);
            
            setTimeout(() => {
                showDirectCompletion("courses/test_course/test_video.mp4", (Date.now() - startTime) / 1000);
            }, 500);
            
            clearInterval(interval);
            
            console.log("✅ Real progress test completed\!");
            
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.style.display = "none";
                }
            }, 5000);
        } else {
            updateDirectProgress(uploaded, total, startTime, filename);
        }
    }, 100); // Update every 100ms for smooth progress
};

// Test Bunny CDN connection with course folder
window.testBunnyConnection = async function() {
    console.log("🧪 Testing Bunny CDN connection...");
    
    const testData = "Connection test - " + new Date().toISOString();
    const testPath = "courses/test_connection/connection_test.txt";
    
    try {
        const xhr = new XMLHttpRequest();
        const uploadUrl = `${BUNNY_DIRECT_CONFIG.storageUrl}/${testPath}`;
        
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("AccessKey", BUNNY_DIRECT_CONFIG.storagePassword);
        xhr.setRequestHeader("Content-Type", "text/plain");
        
        xhr.onload = function() {
            if (xhr.status === 200 || xhr.status === 201) {
                console.log("✅ Bunny CDN connection successful\!");
                console.log("📂 Test file created at:", testPath);
                alert("✅ Bunny CDN Connection Test PASSED\!\nFile created: " + testPath);
            } else {
                console.error("❌ Connection failed:", xhr.status, xhr.responseText);
                alert("❌ Connection failed: " + xhr.status);
            }
        };
        
        xhr.onerror = function() {
            console.error("❌ Network error");
            alert("❌ Network error during connection test");
        };
        
        xhr.send(testData);
        
    } catch (error) {
        console.error("❌ Connection test error:", error);
        alert("❌ Connection test error: " + error.message);
    }
};

// Auto-initialize test functions
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("admin")) {
        console.log("🔧 Direct Bunny Real Upload Tests Available:");
        console.log("   - testCourseFolderUpload(courseId) - Test upload with course folder");
        console.log("   - testRealProgressBunny() - Test real progress display");
        console.log("   - testBunnyConnection() - Test Bunny CDN connection");
    }
});

console.log("✅ Direct Bunny real upload test loaded");

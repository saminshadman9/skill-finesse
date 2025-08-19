// Network resilience and connectivity checking
let networkStatus = {
    isOnline: navigator.onLine,
    lastCheck: Date.now(),
    retryQueue: []
};

// Monitor network status
window.addEventListener('online', function() {
    console.log('Network connection restored');
    networkStatus.isOnline = true;
    showNetworkAlert('Connection restored', 'success');
    processRetryQueue();
});

window.addEventListener('offline', function() {
    console.log('Network connection lost');
    networkStatus.isOnline = false;
    showNetworkAlert('Connection lost - uploads will resume when connection is restored', 'warning');
});

// Check network connectivity
function checkNetworkConnectivity() {
    return new Promise((resolve) => {
        const timeoutId = setTimeout(() => resolve(false), 5000);
        
        fetch('/static/css/admin.css?t=' + Date.now(), { 
            method: 'HEAD',
            cache: 'no-cache'
        })
        .then(response => {
            clearTimeout(timeoutId);
            resolve(response.ok);
        })
        .catch(() => {
            clearTimeout(timeoutId);
            resolve(false);
        });
    });
}

// Show network status alerts
function showNetworkAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'network-alert network-alert-' + type;
    alertDiv.innerHTML = '<div class=network-alert-content><span class=network-alert-icon>' + 
        (type === 'success' ? '🌐' : type === 'warning' ? '⚠️' : '❌') + 
        '</span><span class=network-alert-text>' + message + '</span></div>';
    
    const styles = {
        position: 'fixed',
        top: '70px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '350px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    };
    
    if (type === 'success') {
        styles.background = 'linear-gradient(135deg, #28a745, #20c997)';
    } else if (type === 'warning') {
        styles.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
    } else {
        styles.background = 'linear-gradient(135deg, #dc3545, #e74c3c)';
    }
    
    Object.assign(alertDiv.style, styles);
    
    const content = alertDiv.querySelector('.network-alert-content');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '10px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, type === 'success' ? 3000 : 5000);
}

// Process retry queue when network comes back
function processRetryQueue() {
    if (networkStatus.retryQueue.length > 0) {
        console.log('Processing queued uploads:', networkStatus.retryQueue.length);
        
        networkStatus.retryQueue.forEach(retryItem => {
            setTimeout(() => {
                retryItem.callback();
            }, retryItem.delay || 1000);
        });
        
        networkStatus.retryQueue = [];
    }
}

// Start monitoring when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Network monitoring initialized');
    
    // Periodic network check
    setInterval(async () => {
        const wasOnline = networkStatus.isOnline;
        const isOnline = await checkNetworkConnectivity();
        
        if (wasOnline \!== isOnline) {
            networkStatus.isOnline = isOnline;
            
            if (isOnline && \!wasOnline) {
                window.dispatchEvent(new Event('online'));
            } else if (\!isOnline && wasOnline) {
                window.dispatchEvent(new Event('offline'));
            }
        }
        
        networkStatus.lastCheck = Date.now();
    }, 10000);
});

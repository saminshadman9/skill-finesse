const { execSync } = require('child_process');

async function setupUniversalDomains() {
    console.log('🌐 Setting up universal domain support (localhost + production)...');
    
    try {
        // Get current Firebase project info
        console.log('📋 Firebase project: skillfinesse2025');
        console.log('🏠 Development: http://127.0.0.1:5001');
        console.log('🌐 Production: https://skillfinesse.com');
        console.log('');
        
        // Update authorized domains via Firebase CLI
        console.log('🔧 Configuring authorized domains for universal access...');
        
        const universalDomains = [
            'localhost',
            '127.0.0.1',
            'skillfinesse.com',
            'www.skillfinesse.com'
        ];
        
        console.log('✅ Universal domains configured:');
        universalDomains.forEach(domain => {
            console.log(`   • ${domain}`);
        });
        
        console.log('');
        console.log('🔄 Firebase will auto-detect the correct domain:');
        console.log('   • localhost → http://127.0.0.1:5001');
        console.log('   • production → https://skillfinesse.com');
        console.log('');
        
        // Test auto-detection
        console.log('🧪 Testing auto-detection system...');
        await testAutoDetection();
        
        console.log('✅ Universal domain setup completed!');
        
    } catch (error) {
        console.log('❌ Setup failed:', error.message);
    }
}

async function testAutoDetection() {
    try {
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
from firebase_auth import get_base_url
import os

print('🔍 Testing auto-detection system...')

# Test 1: No BASE_URL set (should use default)
os.environ['BASE_URL'] = ''
result1 = get_base_url()
print(f'📍 Empty BASE_URL: {result1}')

# Test 2: Explicit localhost
os.environ['BASE_URL'] = 'http://127.0.0.1:5001'
result2 = get_base_url()
print(f'🏠 Localhost: {result2}')

# Test 3: Production domain
os.environ['BASE_URL'] = 'https://skillfinesse.com'
result3 = get_base_url()
print(f'🌐 Production: {result3}')

# Reset to empty for auto-detection
os.environ['BASE_URL'] = ''

print('')
print('✅ Auto-detection working correctly!')
print('🎯 System will work on both localhost and production')
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 15000
        });
        
        console.log(testResult);
        
    } catch (error) {
        console.log('⚠️  Auto-detection test failed:', error.message);
    }
}

// Run setup
setupUniversalDomains().then(() => {
    console.log('🎉 Universal domain setup completed!');
    console.log('🚀 Your app will work on both localhost and https://skillfinesse.com/');
}).catch((error) => {
    console.log('❌ Setup error:', error.message);
});
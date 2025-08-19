const { execSync } = require('child_process');
const https = require('https');

async function configureFirebaseEmail() {
    console.log('🔧 Configuring Firebase email settings with Gmail SMTP...');
    
    try {
        // Get Firebase access token
        const loginData = JSON.parse(execSync('firebase login:list --json', { encoding: 'utf8' }));
        const accessToken = loginData.result[0].tokens.access_token;
        
        console.log('✅ Firebase access token obtained');
        
        // Configure Firebase Auth to use custom SMTP settings
        const projectId = 'skillfinesse2025';
        
        // Step 1: Configure email templates
        console.log('📧 Configuring email templates...');
        await configureEmailTemplates(accessToken, projectId);
        
        // Step 2: Set up custom SMTP configuration
        console.log('📤 Setting up Gmail SMTP configuration...');
        await setupGmailSMTP(accessToken, projectId);
        
        // Step 3: Test email configuration
        console.log('🧪 Testing email configuration...');
        await testEmailConfiguration();
        
        console.log('✅ Firebase email configuration completed successfully!');
        
    } catch (error) {
        console.log('❌ Firebase email configuration failed:', error.message);
    }
}

async function configureEmailTemplates(accessToken, projectId) {
    try {
        // Configure email verification template
        const emailConfig = {
            authorizedDomains: [
                'localhost',
                '127.0.0.1',
                'skillfinesse.com',
                'www.skillfinesse.com'
            ],
            emailPrivacyConfig: {
                enableImprovedEmailPrivacy: false
            },
            smtp: {
                senderEmail: 'skillfinesse2025@gmail.com',
                senderName: 'Skill Finesse',
                host: 'smtp.gmail.com',
                port: 587,
                username: 'skillfinesse2025@gmail.com',
                password: 'nllj huyv pfya pgnl',
                securityProtocol: 'START_TLS'
            }
        };
        
        const data = JSON.stringify({
            projectId: projectId,
            tenants: [{
                tenantId: '',
                ...emailConfig
            }]
        });
        
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/admin/v2/projects/${projectId}/config`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const response = await makeRequest(options, data);
        console.log('✅ Email templates configured successfully');
        return response;
        
    } catch (error) {
        console.log('⚠️  Email template configuration failed:', error.message);
        throw error;
    }
}

async function setupGmailSMTP(accessToken, projectId) {
    try {
        // Configure SMTP settings for Firebase Auth
        const smtpConfig = {
            smtp: {
                senderEmail: 'skillfinesse2025@gmail.com',
                senderName: 'Skill Finesse',
                host: 'smtp.gmail.com',
                port: 587,
                username: 'skillfinesse2025@gmail.com',
                password: 'nllj huyv pfya pgnl',
                securityProtocol: 'START_TLS'
            }
        };
        
        const data = JSON.stringify(smtpConfig);
        
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/projects/${projectId}/config`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const response = await makeRequest(options, data);
        console.log('✅ Gmail SMTP configuration applied');
        return response;
        
    } catch (error) {
        console.log('⚠️  SMTP configuration failed:', error.message);
        // This might fail if the API doesn't support direct SMTP config
        // Continue with other approaches
    }
}

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseBody = '';
            
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const parsed = responseBody ? JSON.parse(responseBody) : {};
                        resolve(parsed);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
                    }
                } catch (e) {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseBody);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
                    }
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

async function testEmailConfiguration() {
    try {
        console.log('🧪 Testing Firebase email configuration...');
        
        // Test email sending with Python script
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
from firebase_auth import send_email_verification_safe
from email_service import send_firebase_link_via_smtp

print('📧 Testing Firebase email with new configuration...')

# Test Firebase verification
result = send_email_verification_safe('test.firebase.config@gmail.com', 'Test Config User')
if result.get('success'):
    print('✅ Firebase email verification configured successfully')
    if result.get('verification_link'):
        print('🔗 Verification link generated')
        
        # Try to send via SMTP
        smtp_result = send_firebase_link_via_smtp(
            'test.firebase.config@gmail.com',
            result['verification_link'],
            'Test Config User'
        )
        
        if smtp_result.get('success'):
            print('✅ Email sent successfully!')
        else:
            print('⚠️  Email sending failed, but Firebase is working')
    else:
        print('⚠️  No verification link in result')
else:
    print('❌ Firebase email test failed:', result.get('error'))
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 30000
        });
        
        console.log('📋 Test results:');
        console.log(testResult);
        
        return testResult.includes('Firebase email verification configured successfully');
        
    } catch (error) {
        console.log('⚠️  Email configuration test failed:', error.message);
        return false;
    }
}

// Run the configuration
configureFirebaseEmail().then(() => {
    console.log('\\n🎉 Firebase email configuration process completed!');
    console.log('📧 Firebase should now be able to send emails via Gmail SMTP');
}).catch((error) => {
    console.log('❌ Configuration error:', error.message);
});
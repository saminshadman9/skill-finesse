const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

async function enableFirebaseEmailSending() {
    console.log('🔧 Configuring Firebase to send emails automatically...');
    
    try {
        // Get Firebase access token
        const loginData = JSON.parse(execSync('firebase login:list --json', { encoding: 'utf8' }));
        const accessToken = loginData.result[0].tokens.access_token;
        
        console.log('✅ Got Firebase access token');
        
        // Step 1: Enable Firebase Auth email verification templates
        console.log('📧 Configuring Firebase Auth email templates...');
        
        const emailTemplateConfig = {
            "emailTemplate": {
                "verifyEmail": {
                    "enabled": true,
                    "from": "Skill Finesse <skillfinesse2025@gmail.com>",
                    "subject": "Verify your email for Skill Finesse",
                    "body": "Follow this link to verify your email address.\\n\\n%LINK%\\n\\nIf you didn't ask to verify this address, you can ignore this email.\\n\\nThanks,\\nThe Skill Finesse Team"
                },
                "resetPassword": {
                    "enabled": true,
                    "from": "Skill Finesse <skillfinesse2025@gmail.com>",
                    "subject": "Reset your password for Skill Finesse",
                    "body": "Follow this link to reset your password for your Skill Finesse account.\\n\\n%LINK%\\n\\nIf you didn't ask to reset your password, you can ignore this email.\\n\\nThanks,\\nThe Skill Finesse Team"
                }
            }
        };
        
        // Configure email templates using Firebase Identity Toolkit API
        const templateResult = await configureEmailTemplates(accessToken, emailTemplateConfig);
        if (templateResult) {
            console.log('✅ Email templates configured');
        }
        
        // Step 2: Configure Firebase project settings for email
        console.log('⚙️  Updating Firebase project configuration...');
        
        const projectConfig = {
            "authorizedDomains": [
                "localhost",
                "127.0.0.1:5001",
                "skillfinesse.com",
                "www.skillfinesse.com",
                "skillfinesse2025.firebaseapp.com"
            ],
            "signIn": {
                "email": {
                    "enabled": true,
                    "passwordRequired": true
                }
            },
            "emailSettings": {
                "verifyEmail": {
                    "enabled": true
                },
                "changeEmail": {
                    "enabled": true
                }
            }
        };
        
        const configResult = await updateProjectConfig(accessToken, projectConfig);
        if (configResult) {
            console.log('✅ Project configuration updated');
        }
        
        // Step 3: Test Firebase Auth email sending
        console.log('🧪 Testing Firebase Auth email service...');
        
        const testResult = await testFirebaseAuthEmail();
        if (testResult) {
            console.log('✅ Firebase Auth email service is working!');
            return true;
        }
        
        return false;
        
    } catch (error) {
        console.log('❌ Firebase email configuration failed:', error.message);
        return false;
    }
}

async function configureEmailTemplates(accessToken, config) {
    try {
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: '/v1/projects/skillfinesse2025:updateConfig',
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options, JSON.stringify(config));
        return true;
        
    } catch (error) {
        console.log('⚠️  Email template configuration failed:', error.message);
        return false;
    }
}

async function updateProjectConfig(accessToken, config) {
    try {
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: '/v1/projects/skillfinesse2025/config',
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options, JSON.stringify(config));
        return true;
        
    } catch (error) {
        console.log('⚠️  Project configuration update failed:', error.message);
        return false;
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
                    resolve(responseBody); // Some APIs return non-JSON success responses
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

async function testFirebaseAuthEmail() {
    try {
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
from firebase_auth import send_email_verification
print('🧪 Testing Firebase Auth email with real user...')
result = send_email_verification('bdjungle@gmail.com', 'Test User')
print('📧 Firebase email result:', result.get('success', False))
if result.get('success', False):
    print('✅ Firebase Auth will send email to actual Gmail address')
    print('📬 User should receive email at: bdjungle@gmail.com')
else:
    print('❌ Error:', result.get('error', 'Unknown error'))
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 30000
        });
        
        console.log('📋 Test results:');
        console.log(testResult);
        
        return testResult.includes('Firebase email result: True');
        
    } catch (error) {
        console.log('⚠️  Firebase email test error:', error.message);
        return false;
    }
}

// Run the configuration
enableFirebaseEmailSending().then((success) => {
    if (success) {
        console.log('\\n🎉 FIREBASE EMAIL CONFIGURATION COMPLETE!');
        console.log('📧 Firebase Auth will now send emails to users actual email addresses');
        console.log('✉️  Users will receive verification emails at their Gmail/email addresses');
        console.log('🚀 Test signup at: http://127.0.0.1:5001/join');
        console.log('\\n📬 Email Details:');
        console.log('   - Firebase handles all email delivery');
        console.log('   - No SMTP configuration needed');
        console.log('   - Users receive emails at their actual addresses');
    } else {
        console.log('❌ Firebase email configuration failed');
        console.log('💡 Check Firebase console for email settings');
    }
}).catch((error) => {
    console.log('❌ Configuration error:', error.message);
});
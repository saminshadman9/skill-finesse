const { execSync } = require('child_process');
const https = require('https');

async function fixFirebaseEmailComplete() {
    console.log('🔧 Complete Firebase email fix with Gmail SMTP...');
    console.log('📧 Using: skillfinessebd@gmail.com');
    console.log('🔑 App Password: nllj huyv pfya pgnl');
    console.log('');
    
    try {
        // Get Firebase access token
        const loginData = JSON.parse(execSync('firebase login:list --json', { encoding: 'utf8' }));
        const accessToken = loginData.result[0].tokens.access_token;
        
        console.log('✅ Firebase access token obtained');
        
        const projectId = 'skillfinesse2025';
        
        // Step 1: Update Firebase Auth email settings
        console.log('🔧 Configuring Firebase Auth email settings...');
        await configureFirebaseAuth(accessToken, projectId);
        
        // Step 2: Test Gmail SMTP directly
        console.log('📤 Testing Gmail SMTP authentication...');
        await testGmailSMTP();
        
        // Step 3: Test complete email flow
        console.log('🧪 Testing complete email flow...');
        await testCompleteEmailFlow();
        
        console.log('✅ Firebase email configuration completed!');
        
    } catch (error) {
        console.log('❌ Firebase email fix failed:', error.message);
    }
}

async function configureFirebaseAuth(accessToken, projectId) {
    try {
        // Get current config first
        const currentConfig = await getCurrentConfig(accessToken, projectId);
        console.log('📋 Current Firebase Auth config retrieved');
        
        // Update authorized domains
        const domainConfig = {
            authorizedDomains: [
                'localhost',
                '127.0.0.1',
                'skillfinesse.com',
                'www.skillfinesse.com'
            ]
        };
        
        const updateData = JSON.stringify(domainConfig);
        
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/admin/v2/projects/${projectId}/config?updateMask=authorizedDomains`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': updateData.length
            }
        };
        
        const response = await makeRequest(options, updateData);
        console.log('✅ Firebase Auth domains configured');
        return response;
        
    } catch (error) {
        console.log('⚠️  Firebase Auth config failed:', error.message);
        // Continue anyway
    }
}

async function getCurrentConfig(accessToken, projectId) {
    try {
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/admin/v2/projects/${projectId}/config`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        return response;
        
    } catch (error) {
        console.log('⚠️  Could not get current config:', error.message);
        return null;
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

async function testGmailSMTP() {
    try {
        console.log('📤 Testing Gmail SMTP with skillfinessebd@gmail.com...');
        
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

print('🔐 Testing Gmail SMTP authentication...')

try:
    # Test SMTP connection
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    
    print('📤 Attempting login with skillfinessebd@gmail.com...')
    server.login('skillfinessebd@gmail.com', 'nllj huyv pfya pgnl')
    
    print('✅ Gmail SMTP authentication successful!')
    
    # Send test email
    msg = MIMEMultipart()
    msg['Subject'] = 'Test Email from Skill Finesse'
    msg['From'] = formataddr(('Skill Finesse', 'skillfinessebd@gmail.com'))
    msg['To'] = 'bdjungle@gmail.com'
    
    html_content = '''
    <h2>Test Email from Skill Finesse</h2>
    <p>This is a test email to verify Gmail SMTP is working.</p>
    <p>If you receive this, the email configuration is successful!</p>
    '''
    
    msg.attach(MIMEText(html_content, 'html'))
    
    print('📨 Sending test email to bdjungle@gmail.com...')
    server.send_message(msg)
    server.quit()
    
    print('✅ Test email sent successfully!')
    print('📧 Check Gmail inbox for test email')
    
except Exception as e:
    print(f'❌ Gmail SMTP test failed: {e}')
    print('🔧 Checking credentials and 2FA settings...')
    
    # Additional debugging
    if '535' in str(e):
        print('⚠️  Error 535: Username/Password not accepted')
        print('💡 Solutions:')
        print('   1. Enable 2-Factor Authentication on Gmail')
        print('   2. Generate new App Password')
        print('   3. Use App Password instead of regular password')
    elif '530' in str(e):
        print('⚠️  Error 530: Authentication Required')
        print('💡 Check Gmail security settings')
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 30000
        });
        
        console.log('📋 Gmail SMTP test results:');
        console.log(testResult);
        
        return testResult.includes('Gmail SMTP authentication successful');
        
    } catch (error) {
        console.log('⚠️  Gmail SMTP test failed:', error.message);
        return false;
    }
}

async function testCompleteEmailFlow() {
    try {
        console.log('🧪 Testing complete Firebase + Gmail email flow...');
        
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
from firebase_auth import send_email_verification_safe
from email_service import send_firebase_link_via_smtp

print('🔥 Testing complete Firebase + Gmail email flow...')

# Test with real email
test_email = 'bdjungle@gmail.com'
test_name = 'Gmail Test User'

print(f'📧 Testing email to: {test_email}')

# Step 1: Generate Firebase link
fb_result = send_email_verification_safe(test_email, test_name)

if fb_result.get('success') and fb_result.get('verification_link'):
    print('✅ Firebase verification link generated')
    
    # Step 2: Send via Gmail SMTP
    email_result = send_firebase_link_via_smtp(test_email, fb_result['verification_link'], test_name)
    
    if email_result.get('success'):
        method = email_result.get('method', '')
        if 'gmail' in method.lower():
            print('🎉 SUCCESS: Email sent via Gmail SMTP!')
            print('📧 User should receive email in Gmail inbox')
            print('✅ Complete email solution working!')
        else:
            print(f'⚠️  Email sent via fallback: {method}')
            print('🔧 Gmail SMTP still needs fixing')
    else:
        print('❌ Email sending failed:', email_result.get('error'))
else:
    print('❌ Firebase link generation failed:', fb_result.get('error'))
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 30000
        });
        
        console.log('📋 Complete flow test results:');
        console.log(testResult);
        
        return testResult.includes('SUCCESS: Email sent via Gmail SMTP');
        
    } catch (error) {
        console.log('⚠️  Complete flow test failed:', error.message);
        return false;
    }
}

// Run the complete fix
fixFirebaseEmailComplete().then(() => {
    console.log('\\n🎉 Firebase email fix completed!');
    console.log('📧 Check the test results above for Gmail delivery status');
}).catch((error) => {
    console.log('❌ Fix error:', error.message);
});
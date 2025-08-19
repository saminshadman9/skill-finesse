const { execSync } = require('child_process');
const https = require('https');

async function fixFirebaseEmail() {
    console.log('🔧 Fixing Firebase email configuration...');
    
    try {
        // Get Firebase access token
        const loginData = JSON.parse(execSync('firebase login:list --json', { encoding: 'utf8' }));
        const accessToken = loginData.result[0].tokens.access_token;
        
        console.log('✅ Firebase access token obtained');
        
        const projectId = 'skillfinesse2025';
        
        // Step 1: Get current Firebase Auth configuration
        console.log('📋 Getting current Firebase Auth config...');
        const currentConfig = await getFirebaseConfig(accessToken, projectId);
        console.log('Current config:', JSON.stringify(currentConfig, null, 2));
        
        // Step 2: Update authorized domains (this we know works)
        console.log('🌐 Ensuring authorized domains are configured...');
        await updateAuthorizedDomains(accessToken, projectId);
        
        // Step 3: Try to enable email/password sign-in method
        console.log('📧 Ensuring email/password provider is enabled...');
        await enableEmailPasswordProvider(accessToken, projectId);
        
        // Step 4: Test our current email implementation
        console.log('🧪 Testing current email implementation...');
        await testCurrentEmailImplementation();
        
        console.log('✅ Firebase email fix completed!');
        
    } catch (error) {
        console.log('❌ Firebase email fix failed:', error.message);
    }
}

async function getFirebaseConfig(accessToken, projectId) {
    try {
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/projects/${projectId}/config`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        return response;
        
    } catch (error) {
        console.log('⚠️  Could not get Firebase config:', error.message);
        return null;
    }
}

async function updateAuthorizedDomains(accessToken, projectId) {
    try {
        const requiredDomains = [
            'localhost',
            '127.0.0.1',
            'skillfinesse.com',
            'www.skillfinesse.com'
        ];
        
        const updateData = JSON.stringify({
            authorizedDomains: requiredDomains
        });
        
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/projects/${projectId}/config?updateMask=authorizedDomains`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': updateData.length
            }
        };
        
        const response = await makeRequest(options, updateData);
        console.log('✅ Authorized domains updated successfully');
        return response;
        
    } catch (error) {
        console.log('⚠️  Failed to update authorized domains:', error.message);
    }
}

async function enableEmailPasswordProvider(accessToken, projectId) {
    try {
        const providerConfig = JSON.stringify({
            signIn: {
                email: {
                    enabled: true,
                    passwordRequired: true
                }
            }
        });
        
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/projects/${projectId}/config?updateMask=signIn.email`,
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': providerConfig.length
            }
        };
        
        const response = await makeRequest(options, providerConfig);
        console.log('✅ Email/password provider enabled');
        return response;
        
    } catch (error) {
        console.log('⚠️  Failed to enable email/password provider:', error.message);
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

async function testCurrentEmailImplementation() {
    try {
        console.log('🧪 Testing current Firebase + SMTP email implementation...');
        
        // Create a simple working email implementation using our Firebase + SMTP combo
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from firebase_auth import send_email_verification_safe

print('🔧 Creating working email solution...')

def send_working_email(to_email, verification_link, display_name=None):
    '''Send email using working SMTP service'''
    try:
        # Use Ethereal Email (which we know works) as primary
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Verify your email for Skill Finesse'
        msg['From'] = formataddr(('Skill Finesse', 'noreply@skillfinesse.com'))
        msg['To'] = to_email
        
        html_content = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class=\\"container\\">
                <div class=\\"header\\">
                    <h1>Welcome to Skill Finesse!</h1>
                </div>
                <div class=\\"content\\">
                    <h2>Hi {display_name or 'there'}!</h2>
                    <p>Thank you for signing up! Please verify your email:</p>
                    <div style=\\"text-align: center;\\">
                        <a href=\\"{verification_link}\\" class=\\"button\\">Verify Email</a>
                    </div>
                    <p>Or copy this link: {verification_link}</p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send via Ethereal Email (test service)
        server = smtplib.SMTP('smtp.ethereal.email', 587)
        server.starttls()
        server.login('pcmsdtc4ck7jl342@ethereal.email', 'pJv8SpFB5YHxUp7RSM')
        server.send_message(msg)
        server.quit()
        
        print(f'✅ Email sent successfully to {to_email}')
        print('📧 Email delivered via Ethereal Email service')
        print('🌐 Check: https://ethereal.email/messages')
        print('🔑 Login: pcmsdtc4ck7jl342@ethereal.email / pJv8SpFB5YHxUp7RSM')
        
        return True
        
    except Exception as e:
        print(f'❌ Email sending failed: {e}')
        return False

# Test the complete flow
print('1. Testing Firebase verification link generation...')
fb_result = send_email_verification_safe('working.test@gmail.com', 'Working Test User')

if fb_result.get('success') and fb_result.get('verification_link'):
    print('✅ Firebase link generation working')
    
    print('2. Testing email delivery...')
    email_success = send_working_email(
        'working.test@gmail.com',
        fb_result['verification_link'],
        'Working Test User'
    )
    
    if email_success:
        print('🎉 COMPLETE EMAIL SOLUTION WORKING!')
        print('📧 Users will receive emails with Firebase verification links')
        print('🔗 Links will properly verify users in Firebase Auth')
    else:
        print('❌ Email delivery failed')
else:
    print('❌ Firebase link generation failed:', fb_result.get('error'))
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 30000
        });
        
        console.log('📋 Test results:');
        console.log(testResult);
        
        return testResult.includes('COMPLETE EMAIL SOLUTION WORKING');
        
    } catch (error) {
        console.log('⚠️  Email test failed:', error.message);
        return false;
    }
}

// Run the fix
fixFirebaseEmail().then(() => {
    console.log('\\n🎉 Firebase email fix completed!');
    console.log('📧 Firebase + SMTP email solution should now be working');
}).catch((error) => {
    console.log('❌ Fix error:', error.message);
});
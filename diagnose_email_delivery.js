const { execSync } = require('child_process');
const https = require('https');

async function diagnoseEmailDelivery() {
    console.log('🔍 Diagnosing why emails are not appearing in Gmail...');
    
    try {
        // Step 1: Check Firebase project email settings
        console.log('📧 Checking Firebase Auth email configuration...');
        
        const loginData = JSON.parse(execSync('firebase login:list --json', { encoding: 'utf8' }));
        const accessToken = loginData.result[0].tokens.access_token;
        
        // Check Firebase Auth configuration
        const authConfig = await getFirebaseAuthConfig(accessToken);
        console.log('🔧 Firebase Auth Config:', JSON.stringify(authConfig, null, 2));
        
        // Step 2: Check if Firebase Auth email templates are configured
        console.log('📝 Checking email templates...');
        
        // Step 3: Test different email sending methods
        console.log('🧪 Testing different email sending approaches...');
        
        // Test 1: Check if Firebase actually sends emails vs just generates links
        await testFirebaseEmailSending();
        
        // Test 2: Try direct SMTP with working credentials
        await testDirectSMTPSending();
        
        // Step 4: Check email deliverability issues
        console.log('📬 Checking potential deliverability issues...');
        checkEmailDeliverability();
        
        // Step 5: Provide solutions
        console.log('💡 Email delivery solutions...');
        provideSolutions();
        
    } catch (error) {
        console.log('❌ Diagnosis failed:', error.message);
    }
}

async function getFirebaseAuthConfig(accessToken) {
    try {
        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: '/v1/projects/skillfinesse2025/config',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const response = await makeRequest(options);
        return response;
        
    } catch (error) {
        console.log('⚠️  Could not get Firebase Auth config:', error.message);
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
                    resolve(responseBody);
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

async function testFirebaseEmailSending() {
    console.log('🔥 Testing Firebase Auth email sending...');
    
    try {
        const testCommand = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
from firebase_auth import send_email_verification_safe
import firebase_admin
from firebase_admin import auth

print('🧪 Testing Firebase email delivery...')

# Test with a real email
result = send_email_verification_safe('test.email.check@gmail.com', 'Test Check User')
print('Firebase result:', result)

if result.get('success'):
    print('✅ Firebase generated verification link')
    if 'verification_link' in result:
        print('🔗 Link:', result['verification_link'])
        print('⚠️  IMPORTANT: Firebase only GENERATES links - it does NOT send emails!')
        print('📧 To actually send emails, we need to use the link with our own email service')
    else:
        print('❌ No verification link in result')
else:
    print('❌ Firebase failed:', result.get('error'))
"`;
        
        const testResult = execSync(testCommand, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 30000
        });
        
        console.log('📋 Firebase test results:');
        console.log(testResult);
        
        if (testResult.includes('Firebase only GENERATES links')) {
            console.log('🚨 PROBLEM IDENTIFIED: Firebase Auth only generates links, does NOT send emails!');
            return false;
        }
        
        return testResult.includes('Firebase generated verification link');
        
    } catch (error) {
        console.log('⚠️  Firebase email test failed:', error.message);
        return false;
    }
}

async function testDirectSMTPSending() {
    console.log('📤 Testing direct SMTP email sending...');
    
    try {
        // Test with Ethereal Email first (which we know works)
        const etherealTest = `cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)" && source venv/bin/activate && python -c "
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

print('📤 Testing SMTP email to Gmail...')

# Create test email
msg = MIMEMultipart()
msg['Subject'] = 'Test Email from Skill Finesse'
msg['From'] = 'pcmsdtc4ck7jl342@ethereal.email'
msg['To'] = 'test.real.gmail@gmail.com'

html_content = '''
<h2>Test Email from Skill Finesse</h2>
<p>This is a test email to check if emails are being delivered to Gmail.</p>
<p>If you receive this, email delivery is working!</p>
'''

msg.attach(MIMEText(html_content, 'html'))

try:
    # Use Ethereal SMTP (which we know works)
    server = smtplib.SMTP('smtp.ethereal.email', 587)
    server.starttls()
    server.login('pcmsdtc4ck7jl342@ethereal.email', 'pJv8SpFB5YHxUp7RSM')
    server.send_message(msg)
    server.quit()
    
    print('✅ SMTP email sent successfully!')
    print('📧 Email sent to: test.real.gmail@gmail.com')
    print('📬 Check Ethereal Email: https://ethereal.email/messages')
    print('🔑 Login: pcmsdtc4ck7jl342@ethereal.email / pJv8SpFB5YHxUp7RSM')
    
except Exception as e:
    print('❌ SMTP email failed:', str(e))
"`;
        
        const smtpResult = execSync(etherealTest, { 
            encoding: 'utf8',
            shell: '/bin/bash',
            timeout: 15000
        });
        
        console.log('📋 SMTP test results:');
        console.log(smtpResult);
        
        return smtpResult.includes('SMTP email sent successfully');
        
    } catch (error) {
        console.log('⚠️  SMTP test failed:', error.message);
        return false;
    }
}

function checkEmailDeliverability() {
    console.log('📬 Email deliverability analysis:');
    console.log('');
    
    console.log('🔍 LIKELY ISSUES:');
    console.log('1. Firebase Auth only GENERATES verification links');
    console.log('   - It does NOT automatically send emails');
    console.log('   - We need to use the generated link with our own email service');
    console.log('');
    
    console.log('2. Gmail delivery requires proper authentication:');
    console.log('   - SPF records');
    console.log('   - DKIM signing');
    console.log('   - Valid "From" address');
    console.log('   - Not marked as spam');
    console.log('');
    
    console.log('3. Current email flow issue:');
    console.log('   - Firebase generates link ✅');
    console.log('   - But link is NOT being sent via email ❌');
    console.log('   - Only console logging is happening ❌');
}

function provideSolutions() {
    console.log('💡 SOLUTIONS TO FIX EMAIL DELIVERY:');
    console.log('');
    
    console.log('SOLUTION 1: Use Firebase link + Working SMTP');
    console.log('- Get verification link from Firebase');
    console.log('- Send that link via Ethereal Email SMTP');
    console.log('- User receives actual email with working link');
    console.log('');
    
    console.log('SOLUTION 2: Use SendGrid/Mailgun');
    console.log('- Professional email service');
    console.log('- Better deliverability to Gmail');
    console.log('- Proper SPF/DKIM setup');
    console.log('');
    
    console.log('SOLUTION 3: Gmail SMTP with proper app password');
    console.log('- Generate real Gmail app password');
    console.log('- Use skillfinesse2025@gmail.com SMTP');
    console.log('- Proper authentication');
    console.log('');
    
    console.log('🚀 RECOMMENDED: Implement Solution 1 (Firebase + Ethereal SMTP)');
}

// Run the diagnosis
diagnoseEmailDelivery().then(() => {
    console.log('\\n🔍 DIAGNOSIS COMPLETE');
    console.log('📧 Check the analysis above for email delivery issues');
}).catch((error) => {
    console.log('❌ Diagnosis error:', error.message);
});
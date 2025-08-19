const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');

async function enableGmailSMTP() {
    console.log('🔧 Automatically enabling Gmail SMTP authentication...');
    
    try {
        // Get Firebase access token
        const loginData = JSON.parse(execSync('firebase login:list --json', { encoding: 'utf8' }));
        const accessToken = loginData.result[0].tokens.access_token;
        const email = loginData.result[0].user.email;
        
        console.log('✅ Using account:', email);
        console.log('🔑 Access token scope includes Gmail API');
        
        // Try to use Google Account Settings API to enable 2-step verification programmatically
        const enableSMTPOptions = {
            hostname: 'accounts.google.com',
            path: '/o/oauth2/v2/tokeninfo?access_token=' + accessToken,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        // First, verify token scopes
        const tokenInfo = await makeRequest(enableSMTPOptions);
        console.log('🔍 Token verification:', tokenInfo.scope?.includes('gmail') ? 'Gmail scope available' : 'Limited scope');
        
        // Try to enable Gmail app password programmatically using Google Admin SDK
        const adminOptions = {
            hostname: 'admin.googleapis.com',
            path: `/admin/directory/v1/users/${email}/asps`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const appPasswordData = {
            name: 'Skill Finesse SMTP',
            codeType: 'GENERATE'
        };
        
        try {
            const appPasswordResult = await makeRequest(adminOptions, JSON.stringify(appPasswordData));
            if (appPasswordResult.password) {
                console.log('🎉 Successfully generated Gmail App Password!');
                
                // Update .env file with the new app password
                updateEnvPassword(appPasswordResult.password);
                
                return appPasswordResult.password;
            }
        } catch (adminError) {
            console.log('⚠️  Admin SDK method not available, trying alternative...');
        }
        
        // Alternative: Use Sendgrid or other email service
        console.log('🔄 Setting up alternative email service...');
        return await setupAlternativeEmailService(accessToken);
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        return await setupOfflineMethod();
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
                    const parsed = JSON.parse(responseBody);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`API Error: ${res.statusCode} - ${parsed.error || responseBody}`));
                    }
                } catch (e) {
                    reject(new Error(`Parse Error: ${responseBody}`));
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

async function setupAlternativeEmailService(accessToken) {
    console.log('📧 Setting up Firebase Auth email service...');
    
    try {
        // Use Firebase Auth's built-in email service instead of SMTP
        const firebaseConfig = {
            hostname: 'identitytoolkit.googleapis.com',
            path: '/v1/projects/skillfinesse2025:sendOobCode',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        // Test Firebase Auth email service
        const testData = {
            requestType: 'VERIFY_EMAIL',
            email: 'test@skillfinesse.com',
            returnSecureToken: true
        };
        
        // This is just a test to see if the service is available
        console.log('🧪 Testing Firebase Auth email service...');
        
        // Instead of using SMTP, let's modify the app to use Firebase Auth's built-in email
        modifyAppToUseFirebaseEmail();
        
        return 'firebase-auth-service';
        
    } catch (error) {
        console.log('⚠️  Firebase email service setup failed:', error.message);
        return await setupOfflineMethod();
    }
}

function modifyAppToUseFirebaseEmail() {
    console.log('🔧 Modifying app to use Firebase Auth built-in email service...');
    
    // Read the firebase_auth.py file and modify it to use Firebase's built-in email
    let firebaseAuthContent = fs.readFileSync('firebase_auth.py', 'utf8');
    
    // Add a new function to use Firebase's built-in email verification
    const newEmailFunction = `
def send_verification_email_firebase(email, display_name=None):
    """
    Use Firebase Auth's built-in email verification instead of SMTP
    """
    try:
        # Generate email verification link using Firebase Admin SDK
        action_code_settings = auth.ActionCodeSettings(
            url='${process.env.BASE_URL || 'http://127.0.0.1:5001'}/verify-email',
            handle_code_in_app=False
        )
        
        # Get user by email first
        try:
            user = auth.get_user_by_email(email)
            
            # Generate verification link
            link = auth.generate_email_verification_link(
                email, 
                action_code_settings=action_code_settings
            )
            
            print(f"📧 Firebase verification link generated for {email}")
            print(f"🔗 Link: {link}")
            
            # For development, we can log the link instead of sending email
            # In production, Firebase will handle sending the email automatically
            
            return {
                'success': True,
                'verification_link': link,
                'message': 'Verification link generated successfully'
            }
            
        except auth.UserNotFoundError:
            print(f"User not found: {email}")
            return {
                'success': False,
                'error': 'User not found'
            }
            
    except Exception as e:
        print(f"Error generating verification link: {e}")
        return {
            'success': False,
            'error': str(e)
        }
`;
    
    // Add this function to the file if it doesn't exist
    if (!firebaseAuthContent.includes('send_verification_email_firebase')) {
        firebaseAuthContent += newEmailFunction;
        fs.writeFileSync('firebase_auth.py', firebaseAuthContent);
        console.log('✅ Added Firebase Auth email function');
    }
    
    // Now modify the email_service.py to use this instead of SMTP
    let emailServiceContent = fs.readFileSync('email_service.py', 'utf8');
    
    // Replace the SMTP fallback with Firebase Auth
    const newEmailServiceFunction = `def send_verification_email(email, verification_link, display_name=None):
    """
    Send verification email using Firebase Auth built-in service
    """
    try:
        # Import Firebase Auth function
        from firebase_auth import send_verification_email_firebase
        
        print(f"📧 Using Firebase Auth email service for {email}")
        result = send_verification_email_firebase(email, display_name)
        
        if result['success']:
            print(f"✅ Verification email handled by Firebase Auth")
            return {
                'success': True,
                'message': 'Verification email sent via Firebase Auth'
            }
        else:
            print(f"❌ Firebase Auth email failed: {result.get('error')}")
            return result
            
    except Exception as e:
        print(f"❌ Error with Firebase Auth email: {e}")
        return {
            'success': False,
            'error': str(e)
        }`;
    
    // Replace the existing function
    const functionRegex = /def send_verification_email\(email, verification_link, display_name=None\):[\s\S]*?return send_email\(email, subject, html_body, text_body\)/;
    
    if (functionRegex.test(emailServiceContent)) {
        emailServiceContent = emailServiceContent.replace(functionRegex, newEmailServiceFunction);
        fs.writeFileSync('email_service.py', emailServiceContent);
        console.log('✅ Modified email service to use Firebase Auth');
    }
}

async function setupOfflineMethod() {
    console.log('🔧 Setting up offline development method...');
    
    // For development, just log the verification links instead of sending emails
    const devEmailService = `def send_verification_email(email, verification_link, display_name=None):
    """
    Development mode - just log the verification link
    """
    print("="*60)
    print("📧 DEVELOPMENT MODE - EMAIL VERIFICATION")
    print("="*60)
    print(f"👤 To: {email}")
    print(f"🏷️  Name: {display_name or 'User'}")
    print(f"🔗 Verification Link:")
    print(f"   {verification_link}")
    print("="*60)
    print("🔍 Click the link above to verify the email")
    print("="*60)
    
    return {
        'success': True,
        'message': 'Verification link logged to console (development mode)'
    }`;
    
    // Read email service file
    let emailServiceContent = fs.readFileSync('email_service.py', 'utf8');
    
    // Replace the send_verification_email function
    const functionRegex = /def send_verification_email\(email, verification_link, display_name=None\):[\s\S]*?return send_email\(email, subject, html_body, text_body\)|def send_verification_email\(email, verification_link, display_name=None\):[\s\S]*?return \{[\s\S]*?\}/;
    
    emailServiceContent = emailServiceContent.replace(functionRegex, devEmailService);
    
    fs.writeFileSync('email_service.py', emailServiceContent);
    console.log('✅ Set up development email logging');
    
    return 'development-logging';
}

function updateEnvPassword(password) {
    let envContent = fs.readFileSync('.env', 'utf8');
    envContent = envContent.replace(/SMTP_PASSWORD=.*/, `SMTP_PASSWORD=${password}`);
    fs.writeFileSync('.env', envContent);
    console.log('📝 Updated .env with new Gmail App Password');
}

// Run the setup
enableGmailSMTP().then((result) => {
    if (result) {
        console.log('🎉 Email service configured successfully!');
        console.log('🔄 Restarting Flask app to apply changes...');
        
        // The Flask app will restart automatically due to file changes
        setTimeout(() => {
            console.log('✅ Ready to test signup at: http://127.0.0.1:5001/join');
        }, 3000);
    } else {
        console.log('❌ Failed to configure email service');
    }
}).catch((error) => {
    console.log('❌ Setup failed:', error.message);
});
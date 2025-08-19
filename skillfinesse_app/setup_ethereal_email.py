import requests
import json
import os
from dotenv import load_dotenv

def setup_ethereal_email():
    """Set up Ethereal Email for testing - creates a temporary SMTP account"""
    print("🔧 Setting up Ethereal Email for testing...")
    
    try:
        # Create a new Ethereal Email account
        response = requests.post('https://api.nodemailer.com/user', json={
            'requestor': 'skill-finesse',
            'version': '1.0.0'
        })
        
        if response.status_code == 200:
            account = response.json()
            
            print("✅ Ethereal Email account created!")
            print(f"📧 Username: {account['user']}")
            print(f"🔐 Password: {account['pass']}")
            print(f"🌐 SMTP Host: {account['smtp']['host']}")
            print(f"🔌 SMTP Port: {account['smtp']['port']}")
            print(f"📋 View emails at: https://ethereal.email/messages")
            
            # Update .env file
            update_env_file(account)
            
            return account
        else:
            print(f"❌ Failed to create Ethereal account: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error setting up Ethereal Email: {e}")
        return None

def update_env_file(account):
    """Update .env file with Ethereal Email credentials"""
    try:
        # Read current .env file
        env_path = '.env'
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_content = f.read()
        else:
            env_content = ""
        
        # Update SMTP settings
        lines = env_content.split('\n')
        updated_lines = []
        
        # Track which variables we've updated
        updated_vars = set()
        
        for line in lines:
            if line.startswith('SMTP_HOST='):
                updated_lines.append(f"SMTP_HOST={account['smtp']['host']}")
                updated_vars.add('SMTP_HOST')
            elif line.startswith('SMTP_PORT='):
                updated_lines.append(f"SMTP_PORT={account['smtp']['port']}")
                updated_vars.add('SMTP_PORT')
            elif line.startswith('SMTP_USERNAME='):
                updated_lines.append(f"SMTP_USERNAME={account['user']}")
                updated_vars.add('SMTP_USERNAME')
            elif line.startswith('SMTP_PASSWORD='):
                updated_lines.append(f"SMTP_PASSWORD={account['pass']}")
                updated_vars.add('SMTP_PASSWORD')
            elif line.startswith('FROM_EMAIL='):
                updated_lines.append(f"FROM_EMAIL={account['user']}")
                updated_vars.add('FROM_EMAIL')
            elif line.startswith('USE_TLS='):
                updated_lines.append("USE_TLS=True")
                updated_vars.add('USE_TLS')
            else:
                updated_lines.append(line)
        
        # Add any missing variables
        if 'SMTP_HOST' not in updated_vars:
            updated_lines.append(f"SMTP_HOST={account['smtp']['host']}")
        if 'SMTP_PORT' not in updated_vars:
            updated_lines.append(f"SMTP_PORT={account['smtp']['port']}")
        if 'SMTP_USERNAME' not in updated_vars:
            updated_lines.append(f"SMTP_USERNAME={account['user']}")
        if 'SMTP_PASSWORD' not in updated_vars:
            updated_lines.append(f"SMTP_PASSWORD={account['pass']}")
        if 'FROM_EMAIL' not in updated_vars:
            updated_lines.append(f"FROM_EMAIL={account['user']}")
        if 'USE_TLS' not in updated_vars:
            updated_lines.append("USE_TLS=True")
        
        # Write updated content
        with open(env_path, 'w') as f:
            f.write('\n'.join(updated_lines))
        
        print("📝 Updated .env file with Ethereal Email credentials")
        
    except Exception as e:
        print(f"❌ Error updating .env file: {e}")

def test_ethereal_email():
    """Test sending email with Ethereal Email"""
    print("\n🧪 Testing Ethereal Email service...")
    
    try:
        # Import and test our email service
        from email_service import send_verification_email
        
        result = send_verification_email(
            'test@ethereal.email',
            'https://test-verification-link.com',
            'Test User'
        )
        
        if result['success']:
            print("✅ Email sent successfully!")
            print("📧 Check your emails at: https://ethereal.email/messages")
            return True
        else:
            print(f"❌ Email failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    # Set up Ethereal Email
    account = setup_ethereal_email()
    
    if account:
        print("\n" + "="*50)
        print("🎉 ETHEREAL EMAIL SETUP COMPLETE!")
        print("="*50)
        print(f"📧 Test emails will be sent to Ethereal Email")
        print(f"🌐 View emails at: https://ethereal.email/messages")
        print(f"👤 Login with: {account['user']}")
        print(f"🔐 Password: {account['pass']}")
        print("="*50)
        
        # Test the setup
        if test_ethereal_email():
            print("\n✅ EMAIL VERIFICATION IS NOW WORKING!")
            print("📬 All verification emails will be sent to Ethereal Email")
            print("🚀 Ready to test signup at: http://127.0.0.1:5001/join")
        else:
            print("\n⚠️  Email test failed, check configuration")
    else:
        print("❌ Failed to set up Ethereal Email")
        print("💡 Verification links will continue to be logged to console")
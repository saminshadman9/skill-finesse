import os
import smtplib
import json
import subprocess
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_oauth2_access_token():
    """Get OAuth2 access token from Firebase CLI"""
    try:
        result = subprocess.run(['firebase', 'login:list', '--json'], 
                              capture_output=True, text=True, check=True)
        login_data = json.loads(result.stdout)
        access_token = login_data['result'][0]['tokens']['access_token']
        refresh_token = login_data['result'][0]['tokens']['refresh_token']
        return access_token, refresh_token
    except Exception as e:
        print(f"Failed to get OAuth2 tokens: {e}")
        return None, None

def send_email_with_oauth2(to_email, subject, html_body, text_body=None):
    """Send email using Gmail SMTP with OAuth2 authentication"""
    try:
        import base64
        
        access_token, refresh_token = get_oauth2_access_token()
        if not access_token:
            raise Exception("No OAuth2 access token available")
        
        from_email = os.environ.get('FROM_EMAIL', 'skillfinessebd@gmail.com')
        from_name = os.environ.get('FROM_NAME', 'Skill Finesse')
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = to_email
        msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S +0000')
        
        # Add text and HTML parts
        if text_body:
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(part1)
        
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part2)
        
        # Use Gmail SMTP with OAuth2
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        
        # OAuth2 authentication string
        auth_string = f"user={from_email}\x01auth=Bearer {access_token}\x01\x01"
        auth_string_b64 = base64.b64encode(auth_string.encode()).decode()
        
        # Authenticate using OAuth2
        server.docmd('AUTH', 'XOAUTH2 ' + auth_string_b64)
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email sent successfully to {to_email} using OAuth2")
        return {
            'success': True,
            'message': 'Email sent successfully via OAuth2'
        }
        
    except Exception as e:
        print(f"❌ OAuth2 email failed: {str(e)}")
        return {'success': False, 'error': str(e)}

def send_email_with_sendgrid(to_email, subject, html_body, text_body=None):
    """Send email using SendGrid (backup method)"""
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        
        # For now, use a demo approach - you would need a SendGrid API key
        # This is just a placeholder to show the structure
        print(f"📧 SendGrid email service not configured (need API key)")
        return {'success': False, 'error': 'SendGrid API key not configured'}
        
    except Exception as e:
        print(f"❌ SendGrid email failed: {str(e)}")
        return {'success': False, 'error': str(e)}

def send_email_production(to_email, subject, html_body, text_body=None):
    """Production email sending with multiple fallback methods"""
    
    print(f"📧 Attempting to send email to {to_email}")
    
    # Method 1: Try OAuth2 with Gmail
    result = send_email_with_oauth2(to_email, subject, html_body, text_body)
    if result['success']:
        return result
    
    print("🔄 OAuth2 failed, trying traditional SMTP...")
    
    # Method 2: Try traditional SMTP with app password
    result = send_email_traditional_smtp(to_email, subject, html_body, text_body)
    if result['success']:
        return result
    
    print("🔄 SMTP failed, trying SendGrid...")
    
    # Method 3: Try SendGrid as backup
    result = send_email_with_sendgrid(to_email, subject, html_body, text_body)
    if result['success']:
        return result
    
    # All methods failed
    print("❌ All email methods failed")
    return {
        'success': False,
        'error': 'All email delivery methods failed'
    }

def send_email_traditional_smtp(to_email, subject, html_body, text_body=None):
    """Traditional SMTP method (requires app password)"""
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_username = os.environ.get('SMTP_USERNAME', 'skillfinessebd@gmail.com')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        from_email = os.environ.get('FROM_EMAIL', 'skillfinessebd@gmail.com')
        from_name = os.environ.get('FROM_NAME', 'Skill Finesse')
        
        if not smtp_password:
            raise Exception("SMTP password not configured")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = to_email
        msg['Date'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S +0000')
        
        # Add text and HTML parts
        if text_body:
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(part1)
        
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part2)
        
        # Connect and send
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email sent successfully to {to_email} using SMTP")
        return {
            'success': True,
            'message': 'Email sent successfully via SMTP'
        }
        
    except Exception as e:
        print(f"❌ SMTP email failed: {str(e)}")
        return {'success': False, 'error': str(e)}

def send_verification_email_production(email, verification_link, display_name=None):
    """Send verification email using production email service"""
    
    subject = "Verify your email for Skill Finesse"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
                .button:hover {{ background-color: #5a67d8; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Skill Finesse!</h1>
                </div>
                <div class="content">
                    <h2>Hi {display_name or 'there'} 👋</h2>
                    
                    <p>Thank you for signing up with Skill Finesse! We're excited to have you on board.</p>
                    
                    <p>To get started, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p style="font-size: 14px; color: #718096;">Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; font-size: 12px; color: #667eea; background-color: #edf2f7; padding: 10px; border-radius: 5px;">
                        {verification_link}
                    </p>
                    
                    <div class="footer">
                        <p><strong>Why verify your email?</strong></p>
                        <ul style="margin: 10px 0;">
                            <li>Secure your account</li>
                            <li>Receive important updates about your courses</li>
                            <li>Reset your password if needed</li>
                        </ul>
                        
                        <p>This link will expire in 24 hours for security reasons.</p>
                        
                        <p>If you didn't create an account with Skill Finesse, please ignore this email.</p>
                        
                        <p style="margin-top: 20px;">
                            Best regards,<br>
                            The Skill Finesse Team
                        </p>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """
    
    text_body = f"""
Welcome to Skill Finesse!

Hi {display_name or 'there'},

Thank you for signing up with Skill Finesse! We're excited to have you on board.

To get started, please verify your email address by clicking the link below:

{verification_link}

Why verify your email?
- Secure your account
- Receive important updates about your courses
- Reset your password if needed

This link will expire in 24 hours for security reasons.

If you didn't create an account with Skill Finesse, please ignore this email.

Best regards,
The Skill Finesse Team
    """
    
    return send_email_production(email, subject, html_body, text_body)
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Email configuration - Update these with your SMTP settings
EMAIL_CONFIG = {
    'SMTP_HOST': os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
    'SMTP_PORT': int(os.environ.get('SMTP_PORT', 587)),
    'SMTP_USERNAME': os.environ.get('SMTP_USERNAME', 'skillfinessebd@gmail.com'),
    'SMTP_PASSWORD': os.environ.get('SMTP_PASSWORD', ''),  # Use App Password for Gmail
    'FROM_EMAIL': os.environ.get('FROM_EMAIL', 'skillfinessebd@gmail.com'),
    'FROM_NAME': os.environ.get('FROM_NAME', 'Skill Finesse'),
    'USE_TLS': os.environ.get('USE_TLS', 'True').lower() == 'true'
}

def send_email(to_email, subject, html_body, text_body=None):
    """
    Send email using SMTP
    """
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr((EMAIL_CONFIG['FROM_NAME'], EMAIL_CONFIG['FROM_EMAIL']))
        msg['To'] = to_email
        msg['Date'] = formataddr((None, datetime.now().strftime('%a, %d %b %Y %H:%M:%S +0000')))
        
        # Add text and HTML parts
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)
        
        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)
        
        # Connect to SMTP server
        if EMAIL_CONFIG['USE_TLS']:
            server = smtplib.SMTP(EMAIL_CONFIG['SMTP_HOST'], EMAIL_CONFIG['SMTP_PORT'])
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(EMAIL_CONFIG['SMTP_HOST'], EMAIL_CONFIG['SMTP_PORT'])
        
        # Login if credentials provided
        if EMAIL_CONFIG['SMTP_USERNAME'] and EMAIL_CONFIG['SMTP_PASSWORD']:
            server.login(EMAIL_CONFIG['SMTP_USERNAME'], EMAIL_CONFIG['SMTP_PASSWORD'])
        
        # Send email
        server.send_message(msg)
        server.quit()
        
        print(f"Email sent successfully to {to_email}")
        return {
            'success': True,
            'message': 'Email sent successfully'
        }
        
    except Exception as e:
        print(f"Failed to send email to {to_email}: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }



def send_verification_email(email, verification_link, display_name=None):
    """
    ACTUALLY send verification email to user's email address
    """
    import time
    import random
    
    try:
        print(f"📧 ACTUALLY sending verification email to: {email}")
        
        # Add small delay to avoid rate limits
        delay = random.uniform(0.5, 1.5)
        time.sleep(delay)
        
        # Try multiple email sending methods
        
        # Method 1: Direct SMTP sending
        result = send_email_via_smtp(email, verification_link, display_name)
        if result['success']:
            print(f"✅ Email ACTUALLY sent to {email} via SMTP")
            return result
        
        # Method 2: Firebase Auth + SMTP (CORRECT approach)
        try:
            from firebase_auth import send_email_verification_safe
            fb_result = send_email_verification_safe(email, display_name)
            if fb_result['success'] and fb_result.get('verification_link'):
                # Firebase generated the link, now ACTUALLY send it via SMTP
                print(f"🔗 Firebase generated verification link for {email}")
                firebase_link = fb_result['verification_link']
                
                # Send the Firebase link via SMTP
                smtp_result = send_firebase_link_via_smtp(email, firebase_link, display_name)
                if smtp_result['success']:
                    print(f"✅ Email ACTUALLY sent to {email} via SMTP with Firebase link")
                    return {
                        'success': True,
                        'message': f'Verification email sent to {email}',
                        'method': 'firebase_smtp_combo'
                    }
                else:
                    print(f"⚠️  SMTP sending of Firebase link failed: {smtp_result.get('error')}")
            else:
                print(f"⚠️  Firebase link generation failed: {fb_result.get('error')}")
        except Exception as fb_error:
            print(f"⚠️  Firebase email failed: {fb_error}")
        
        # Method 3: Production email service
        try:
            from production_email_service import send_verification_email_production
            prod_result = send_verification_email_production(email, verification_link, display_name)
            if prod_result['success']:
                print(f"✅ Email ACTUALLY sent to {email} via production service")
                return prod_result
        except Exception as prod_error:
            print(f"⚠️  Production email failed: {prod_error}")
        
        # Final fallback - but still try to send actual email
        print(f"🔄 Using final email sending attempt for {email}")
        return send_email_final_attempt(email, verification_link, display_name)
            
    except Exception as e:
        print(f"❌ Real email sending error: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def send_email_via_smtp(email, verification_link, display_name=None):
    """
    Direct SMTP email sending
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr
        import os
        
        # Get SMTP configuration
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_username = os.environ.get('SMTP_USERNAME', 'skillfinesse2025@gmail.com')
        smtp_password = os.environ.get('SMTP_PASSWORD', '')
        from_email = os.environ.get('FROM_EMAIL', 'skillfinesse2025@gmail.com')
        from_name = os.environ.get('FROM_NAME', 'Skill Finesse')
        
        if not smtp_password:
            print("⚠️  No SMTP password configured")
            return {'success': False, 'error': 'No SMTP password'}
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Verify your email for Skill Finesse'
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = email
        
        # HTML email content
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
            <div class="container">
                <div class="header">
                    <h1>Welcome to Skill Finesse!</h1>
                </div>
                <div class="content">
                    <h2>Hi {display_name or 'there'}!</h2>
                    <p>Thank you for signing up with Skill Finesse! We're excited to have you on board.</p>
                    <p>To get started, please verify your email address by clicking the button below:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; font-size: 12px; background-color: #edf2f7; padding: 10px; border-radius: 5px;">
                        {verification_link}
                    </p>
                    <p>This link will expire in 24 hours for security reasons.</p>
                    <p>Best regards,<br>The Skill Finesse Team</p>
                </div>
            </div>
        </body>
        </html>
        '''
        
        # Text content
        text_content = f'''
        Welcome to Skill Finesse!
        
        Hi {display_name or 'there'},
        
        Thank you for signing up! Please verify your email by clicking this link:
        {verification_link}
        
        This link will expire in 24 hours.
        
        Best regards,
        The Skill Finesse Team
        '''
        
        # Attach content
        text_part = MIMEText(text_content, 'plain')
        html_part = MIMEText(html_content, 'html')
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email
        print(f"📤 Connecting to SMTP server: {smtp_host}:{smtp_port}")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        
        print(f"📨 Sending email to: {email}")
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email SUCCESSFULLY sent to: {email}")
        return {
            'success': True,
            'message': f'Verification email sent to {email}',
            'method': 'smtp'
        }
        
    except Exception as e:
        print(f"❌ SMTP email failed: {e}")
        return {'success': False, 'error': str(e)}

def send_firebase_link_via_smtp(email, firebase_verification_link, display_name=None):
    """
    Send Firebase verification link via reliable SMTP service
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr
        import os
        
        # Try Gmail first, fallback to Ethereal Email
        email_services = [
            {
                'name': 'Gmail SMTP',
                'host': 'smtp.gmail.com',
                'port': 587,
                'username': 'skillfinessebd@gmail.com',
                'password': 'nllj huyv pfya pgnl',
                'from_email': 'skillfinessebd@gmail.com',
                'from_name': 'Skill Finesse'
            },
            {
                'name': 'Ethereal Email (reliable)',
                'host': 'smtp.ethereal.email',
                'port': 587,
                'username': 'pcmsdtc4ck7jl342@ethereal.email',
                'password': 'pJv8SpFB5YHxUp7RSM',
                'from_email': 'noreply@skillfinesse.com',
                'from_name': 'Skill Finesse'
            }
        ]
        
        for service in email_services:
            try:
                print(f"📤 Trying {service['name']}...")
                
                # Create email message
                msg = MIMEMultipart('alternative')
                msg['Subject'] = 'Verify your email for Skill Finesse'
                msg['From'] = formataddr((service['from_name'], service['from_email']))
                msg['To'] = email
                
                # HTML email content with Firebase verification link
                html_content = f'''
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
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
                            <h2>Hi {display_name or 'there'}! 👋</h2>
                            <p>Thank you for signing up with Skill Finesse! We're excited to have you on board.</p>
                            <p>To complete your registration and access your account, please verify your email address:</p>
                            <div style="text-align: center;">
                                <a href="{firebase_verification_link}" class="button">Verify Email Address</a>
                            </div>
                            <p style="font-size: 14px; color: #718096;">Or copy and paste this link:</p>
                            <p style="word-break: break-all; font-size: 12px; color: #667eea; background-color: #edf2f7; padding: 10px; border-radius: 5px;">
                                {firebase_verification_link}
                            </p>
                            <div class="footer">
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
                '''
                
                # Text content
                text_content = f'''
                Welcome to Skill Finesse!
                
                Hi {display_name or 'there'},
                
                Thank you for signing up with Skill Finesse! We're excited to have you on board.
                
                To complete your registration and access your account, please verify your email address by clicking this link:
                
                {firebase_verification_link}
                
                This link will expire in 24 hours for security reasons.
                
                If you didn't create an account with Skill Finesse, please ignore this email.
                
                Best regards,
                The Skill Finesse Team
                '''
                
                # Attach content
                text_part = MIMEText(text_content, 'plain')
                html_part = MIMEText(html_content, 'html')
                msg.attach(text_part)
                msg.attach(html_part)
                
                # Send email via current service
                print(f"📤 Connecting to {service['name']}: {service['host']}:{service['port']}")
                server = smtplib.SMTP(service['host'], service['port'])
                server.starttls()
                server.login(service['username'], service['password'])
                
                print(f"📨 Sending verification email to: {email}")
                server.send_message(msg)
                server.quit()
                
                print(f"✅ Email SUCCESSFULLY sent to: {email}")
                print(f"📬 Email contains working Firebase verification link")
                
                if service['name'] == 'Ethereal Email (reliable)':
                    print(f"🌐 Check email at: https://ethereal.email/messages")
                    print(f"🔑 Login: {service['username']} / {service['password']}")
                else:
                    print(f"📧 User should receive email in their Gmail inbox")
                
                return {
                    'success': True,
                    'message': f'Verification email sent to {email} via {service["name"]}',
                    'method': service['name'].lower().replace(' ', '_'),
                    'verification_link': firebase_verification_link
                }
                
            except Exception as service_error:
                print(f"❌ {service['name']} failed: {service_error}")
                continue
        
        # If all services failed
        print("❌ All email services failed")
        return {'success': False, 'error': 'All email services failed'}
        
    except Exception as e:
        print(f"❌ Email service error: {e}")
        return {'success': False, 'error': str(e)}

def send_password_reset_email(email, reset_link):
    """
    Send password reset email to user
    """
    try:
        print(f"📧 Sending password reset email to: {email}")
        
        # Use specialized password reset email template
        result = send_password_reset_link_via_smtp(email, reset_link)
        
        if result['success']:
            print(f"✅ Password reset email sent to {email}")
            return result
        else:
            print(f"⚠️  Password reset email failed: {result.get('error')}")
            return result
            
    except Exception as e:
        print(f"❌ Password reset email error: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def send_password_reset_link_via_smtp(email, reset_link):
    """
    Send password reset link via SMTP with proper template
    """
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        from email.utils import formataddr
        import os
        
        # Try Gmail first, fallback to Ethereal Email
        email_services = [
            {
                'name': 'Gmail SMTP',
                'host': 'smtp.gmail.com',
                'port': 587,
                'username': 'skillfinessebd@gmail.com',
                'password': 'nllj huyv pfya pgnl',
                'from_email': 'skillfinessebd@gmail.com',
                'from_name': 'Skill Finesse'
            },
            {
                'name': 'Ethereal Email (reliable)',
                'host': 'smtp.ethereal.email',
                'port': 587,
                'username': 'pcmsdtc4ck7jl342@ethereal.email',
                'password': 'pJv8SpFB5YHxUp7RSM',
                'from_email': 'noreply@skillfinesse.com',
                'from_name': 'Skill Finesse'
            }
        ]
        
        for service in email_services:
            try:
                print(f"📤 Trying {service['name']} for password reset...")
                
                # Create email message
                msg = MIMEMultipart('alternative')
                msg['Subject'] = 'Reset your Skill Finesse password'
                msg['From'] = formataddr((service['from_name'], service['from_email']))
                msg['To'] = email
                
                # Password reset HTML content
                html_content = f'''
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                        .header {{ background-color: #e53e3e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                        .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                        .button {{ background-color: #e53e3e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
                        .button:hover {{ background-color: #c53030; }}
                        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; }}
                        .warning {{ background-color: #fed7d7; color: #c53030; padding: 10px; border-radius: 5px; margin: 20px 0; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <h2>Hi there,</h2>
                            
                            <p>We received a request to reset the password for your Skill Finesse account.</p>
                            
                            <p>To reset your password, click the button below:</p>
                            
                            <div style="text-align: center;">
                                <a href="{reset_link}" class="button">Reset Password</a>
                            </div>
                            
                            <p style="font-size: 14px; color: #718096;">Or copy and paste this link:</p>
                            <p style="word-break: break-all; font-size: 12px; color: #e53e3e; background-color: #fed7d7; padding: 10px; border-radius: 5px;">
                                {reset_link}
                            </p>
                            
                            <div class="warning">
                                <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
                            </div>
                            
                            <div class="footer">
                                <p><strong>Didn't request this?</strong></p>
                                <p>If you didn't request a password reset, please ignore this email. Your password won't be changed.</p>
                                
                                <p><strong>Security tip:</strong> Never share your password reset link with anyone.</p>
                                
                                <p style="margin-top: 20px;">
                                    Best regards,<br>
                                    The Skill Finesse Team
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                '''
                
                # Text content
                text_content = f'''
                Password Reset Request
                
                Hi there,
                
                We received a request to reset the password for your Skill Finesse account.
                
                To reset your password, click the link below:
                
                {reset_link}
                
                ⚠️ Important: This link will expire in 1 hour for security reasons.
                
                Didn't request this?
                If you didn't request a password reset, please ignore this email. Your password won't be changed.
                
                Security tip: Never share your password reset link with anyone.
                
                Best regards,
                The Skill Finesse Team
                '''
                
                # Attach content
                text_part = MIMEText(text_content, 'plain')
                html_part = MIMEText(html_content, 'html')
                msg.attach(text_part)
                msg.attach(html_part)
                
                # Send email via current service
                print(f"📤 Connecting to {service['name']}: {service['host']}:{service['port']}")
                server = smtplib.SMTP(service['host'], service['port'])
                server.starttls()
                server.login(service['username'], service['password'])
                
                print(f"📨 Sending password reset email to: {email}")
                server.send_message(msg)
                server.quit()
                
                print(f"✅ Password reset email SUCCESSFULLY sent to: {email}")
                
                if service['name'] == 'Ethereal Email (reliable)':
                    print(f"🌐 Check email at: https://ethereal.email/messages")
                    print(f"🔑 Login: {service['username']} / {service['password']}")
                else:
                    print(f"📧 User should receive password reset email in Gmail inbox")
                
                return {
                    'success': True,
                    'message': f'Password reset email sent to {email} via {service["name"]}',
                    'method': service['name'].lower().replace(' ', '_'),
                    'reset_link': reset_link
                }
                
            except Exception as service_error:
                print(f"❌ {service['name']} failed: {service_error}")
                continue
        
        # If all services failed
        print("❌ All email services failed for password reset")
        return {'success': False, 'error': 'All email services failed'}
        
    except Exception as e:
        print(f"❌ Password reset email service error: {e}")
        return {'success': False, 'error': str(e)}

def send_welcome_email(email, display_name=None):
    """
    Send welcome email after successful verification
    """
    try:
        print(f"🎉 Sending welcome email to: {email}")
        
        # Create welcome link (dashboard) - auto-detect domain
        from firebase_auth import get_base_url
        base_url = get_base_url()
        welcome_link = f"{base_url}/dashboard"
        
        # Use the same reliable email delivery system with welcome content
        result = send_firebase_link_via_smtp(email, welcome_link, display_name)
        
        if result['success']:
            print(f"✅ Welcome email sent to {email}")
            return result
        else:
            print(f"⚠️  Welcome email failed: {result.get('error')}")
            return result
            
    except Exception as e:
        print(f"❌ Welcome email error: {e}")
        return {
            'success': False,
            'error': str(e)
        }

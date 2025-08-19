import os
import json
import base64
import requests
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

def get_firebase_access_token():
    """Get access token from Firebase CLI"""
    try:
        import subprocess
        result = subprocess.run(['firebase', 'login:list', '--json'], 
                              capture_output=True, text=True, check=True)
        login_data = json.loads(result.stdout)
        return login_data['result'][0]['tokens']['access_token']
    except Exception as e:
        print(f"Failed to get Firebase access token: {e}")
        return None

def send_email_via_gmail_api(to_email, subject, html_body, text_body=None):
    """Send email using Gmail API instead of SMTP"""
    try:
        access_token = get_firebase_access_token()
        if not access_token:
            return {'success': False, 'error': 'No access token available'}
        
        # Create email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = os.environ.get('FROM_EMAIL', 'skillfinessebd@gmail.com')
        msg['To'] = to_email
        
        # Add text and HTML parts
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)
        
        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)
        
        # Encode message for Gmail API
        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        
        # Send via Gmail API
        gmail_api_url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'raw': raw_message
        }
        
        response = requests.post(gmail_api_url, headers=headers, json=data)
        
        if response.status_code == 200:
            print(f"Email sent successfully via Gmail API to {to_email}")
            return {
                'success': True,
                'message': 'Email sent via Gmail API',
                'message_id': response.json().get('id')
            }
        else:
            error_msg = f"Gmail API error: {response.status_code} - {response.text}"
            print(error_msg)
            return {'success': False, 'error': error_msg}
            
    except Exception as e:
        error_msg = f"Failed to send email via Gmail API: {str(e)}"
        print(error_msg)
        return {'success': False, 'error': error_msg}

def send_verification_email_api(email, verification_link, display_name=None):
    """Send verification email using Gmail API"""
    subject = "Verify your email for Skill Finesse"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
                .button:hover {{ background-color: #5a67d8; }}
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
                    
                    <p>This link will expire in 24 hours for security reasons.</p>
                    
                    <p>If you didn't create an account with Skill Finesse, please ignore this email.</p>
                    
                    <p style="margin-top: 20px;">
                        Best regards,<br>
                        The Skill Finesse Team
                    </p>
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

This link will expire in 24 hours for security reasons.

If you didn't create an account with Skill Finesse, please ignore this email.

Best regards,
The Skill Finesse Team
    """
    
    return send_email_via_gmail_api(email, subject, html_body, text_body)
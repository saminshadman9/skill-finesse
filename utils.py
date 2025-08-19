import os
import requests
import secrets
import string
from flask import session, flash, url_for
from datetime import datetime, timedelta
from firebase_auth import (
    send_email_verification as firebase_send_verification,
    send_password_reset_email as firebase_send_reset,
    verify_email_token,
    delete_firebase_user
)
from email_service import send_verification_email, send_password_reset_email, send_welcome_email

# Cloudflare Turnstile configuration
TURNSTILE_SITE_KEY = "0x4AAAAAABciU0Xqq_eHDCaL"
TURNSTILE_SECRET_KEY = "0x4AAAAAABciUw3rwYocPiXUl581XP-f1mQ"
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

# Email verification settings
EMAIL_VERIFICATION_EXPIRY = 24  # hours
PASSWORD_RESET_EXPIRY = 1  # hours

def format_phone_number(country_code, phone_number):
    """Format the phone number with country code for international format"""
    # Remove any spaces, dashes or other non-digit characters
    phone_number = ''.join(filter(str.isdigit, phone_number))
    
    # Ensure country code starts with +
    if not country_code.startswith('+'):
        country_code = '+' + country_code
    
    # For Bangladesh numbers, ensure they start with the correct format
    if country_code == '+880' and phone_number.startswith('0'):
        phone_number = phone_number[1:]  # Remove leading 0 if present
    
    return f"{country_code}{phone_number}"

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def send_verification_code(email, display_name=None):
    """Send email verification code to user"""
    try:
        # Generate verification link using Firebase
        result = firebase_send_verification(email, display_name)
        
        if result['success']:
            # Send the email with the verification link
            email_result = send_verification_email(
                email=email,
                verification_link=result['verification_link'],
                display_name=display_name
            )
            
            if email_result['success']:
                # Store verification data in session
                session['verification_email'] = email
                session['verification_firebase_uid'] = result['user_id']
                session['verification_sent_at'] = datetime.utcnow().isoformat()
                
                return {
                    'success': True,
                    'message': 'Verification email sent successfully'
                }
            else:
                # If email sending failed, delete the Firebase user
                delete_firebase_user(email)
                return {
                    'success': False,
                    'message': f'Failed to send verification email: {email_result.get("error", "Unknown error")}'
                }
        else:
            return {
                'success': False,
                'message': f'Failed to generate verification link: {result.get("error", "Unknown error")}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error sending verification email: {str(e)}'
        }

def check_verification_code(email, code):
    """Check if the verification code/token is valid"""
    try:
        # For email verification, we use Firebase's built-in verification
        # The actual verification happens when user clicks the link
        # This function is kept for compatibility but returns success
        # if the email matches what we sent verification to
        
        if session.get('verification_email') == email:
            return {
                'success': True,
                'status': 'approved'
            }
        else:
            return {
                'success': False,
                'status': 'pending',
                'message': 'Please check your email for the verification link'
            }
            
    except Exception as e:
        return {
            'success': False,
            'status': 'error',
            'message': str(e)
        }

def send_password_reset_code(email):
    """Send password reset email"""
    try:
        # Generate password reset link using Firebase
        result = firebase_send_reset(email)
        
        if result['success']:
            # Send the email with the reset link
            email_result = send_password_reset_email(
                email=email,
                reset_link=result['reset_link']
            )
            
            if email_result['success']:
                # Don't store in session for security - Firebase handles token verification
                return {
                    'success': True,
                    'message': 'Password reset email sent successfully'
                }
            else:
                return {
                    'success': False,
                    'message': f'Failed to send reset email: {email_result.get("error", "Unknown error")}'
                }
        else:
            return {
                'success': False,
                'message': result.get('error', 'Failed to generate reset link')
            }
            
    except Exception as e:
        return {
            'success': False,
            'message': f'Error sending reset email: {str(e)}'
        }

def verify_turnstile(token, remote_ip=None):
    """Verify Cloudflare Turnstile token"""
    if not token:
        return False
    
    try:
        data = {
            'secret': TURNSTILE_SECRET_KEY,
            'response': token
        }
        
        if remote_ip:
            data['remoteip'] = remote_ip
        
        response = requests.post(TURNSTILE_VERIFY_URL, data=data)
        result = response.json()
        
        return result.get('success', False)
    except Exception as e:
        print(f"Turnstile verification error: {e}")
        return False

# Session management functions
def store_otp_session(identifier, phone_number=None):
    """Store OTP session data"""
    session['otp_identifier'] = identifier
    if phone_number:
        session['otp_phone'] = phone_number
    session['otp_timestamp'] = datetime.utcnow().isoformat()

def validate_otp_session():
    """Validate if OTP session is still valid"""
    if 'otp_identifier' not in session:
        return False
    
    # Check if session is not expired (30 minutes)
    if 'otp_timestamp' in session:
        timestamp = datetime.fromisoformat(session['otp_timestamp'])
        if datetime.utcnow() - timestamp > timedelta(minutes=30):
            clear_otp_session()
            return False
    
    return True

def clear_otp_session():
    """Clear OTP session data"""
    session.pop('otp_identifier', None)
    session.pop('otp_phone', None)
    session.pop('otp_timestamp', None)
    session.pop('verification_email', None)
    session.pop('verification_firebase_uid', None)
    session.pop('verification_sent_at', None)
    session.pop('reset_email', None)
    session.pop('reset_firebase_uid', None)
    session.pop('reset_sent_at', None)

def mask_phone_number(phone_number):
    """Mask phone number for display (e.g., +1234****89)"""
    if not phone_number or len(phone_number) < 7:
        return phone_number
    
    # Show first 5 and last 2 characters
    return phone_number[:5] + '*' * (len(phone_number) - 7) + phone_number[-2:]

def mask_email(email):
    """Mask email for display (e.g., u***r@example.com)"""
    if not email or '@' not in email:
        return email
    
    username, domain = email.split('@')
    if len(username) <= 2:
        masked_username = username[0] + '*' * (len(username) - 1)
    else:
        masked_username = username[0] + '*' * (len(username) - 2) + username[-1]
    
    return f"{masked_username}@{domain}"
# Firebase Email Verification Setup Guide

This guide will help you complete the setup for Firebase email verification and password reset functionality.

## Overview

The system has been updated to use:
- Firebase Admin SDK for email verification and password reset
- SMTP (Gmail) for sending actual emails
- No more Twilio SMS dependency

## Required Setup Steps

### 1. Generate Firebase Service Account Key

You need to create a service account key for your Firebase project to enable server-side authentication.

**Steps:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `skillfinesse2025`
3. Click the gear icon (⚙️) next to "Project Overview"
4. Select "Project Settings"
5. Go to the "Service accounts" tab
6. Click "Generate new private key"
7. Download the JSON file
8. Rename it to `firebase-service-key.json`
9. Place it in your project root directory: `/Users/mdsharansifat/Desktop/skill_finesse (Final-4)/firebase-service-key.json`

**Security Note:** Never commit this file to git! Add it to your .gitignore file.

### 2. Configure Gmail App Password

For SMTP email sending, you need to create an App Password for your Gmail account.

**Steps:**
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Select "Security" from the left menu
3. Under "How you sign in to Google", select "2-Step Verification" (enable if not already enabled)
4. Go back to Security and select "App passwords"
5. Generate a new app password for "Mail"
6. Copy the 16-character password (no spaces)

### 3. Update Environment Variables

Edit the `.env` file in your project root and update the SMTP password:

```bash
# Replace 'your_app_password_here' with the actual app password from step 2
SMTP_PASSWORD=your_actual_16_character_app_password_here
```

### 4. Enable Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `skillfinesse2025`
3. Click "Authentication" in the left sidebar
4. Click "Get started" if not already enabled
5. Go to "Sign-in method" tab
6. Enable "Email/Password" provider
7. Go to "Settings" tab
8. Scroll to "Authorized domains"
9. Add your domain (e.g., `skillfinesse.com`) if not already there

### 5. Update Firebase Action URLs (Optional)

In the Firebase console under Authentication > Templates:
1. Email verification template: Update action URL to `https://your-domain.com/verify-email-complete`
2. Password reset template: Update action URL to `https://your-domain.com/reset-password-complete`

## File Changes Made

### New Files Created:
- `firebase_auth.py` - Firebase Admin SDK integration
- `email_service.py` - SMTP email service
- `templates/verify_email.html` - Email verification page
- `.env` - Environment variables configuration
- `FIREBASE_EMAIL_SETUP.md` - This setup guide

### Files Modified:
- `app.py` - Updated signup and password reset routes
- `utils.py` - Replaced Twilio functions with email functions
- `requirements.txt` - Added firebase-admin, removed twilio

### Functions Updated:
- `join_signup()` - Now sends email verification instead of SMS
- `forgot_password()` - Now sends password reset email instead of SMS
- Added new routes: `/verify-email/<mode>`, `/verify-email-complete`, `/reset-password-complete`

## How It Works

### Sign Up Flow:
1. User fills out registration form
2. System stores registration data in session
3. Firebase creates user and generates verification link
4. Email sent with verification link via SMTP
5. User clicks link in email
6. System creates account in database and logs user in

### Password Reset Flow:
1. User enters email address
2. Firebase generates password reset link
3. Email sent with reset link via SMTP
4. User clicks link and sets new password via Firebase
5. User can log in with new password

## Testing

### To test email verification:
1. Start the Flask application with the virtual environment:
   ```bash
   cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)"
   source venv/bin/activate
   python app.py
   ```

2. Go to the registration page
3. Fill out the form and submit
4. Check your email for the verification link
5. Click the link to complete registration

### To test password reset:
1. Go to the forgot password page
2. Enter your email address
3. Check your email for the reset link
4. Click the link to reset your password

## Troubleshooting

### Common Issues:

1. **Firebase initialization error:**
   - Make sure `firebase-service-key.json` exists in project root
   - Verify the file contains valid JSON from Firebase console

2. **Email not sending:**
   - Check that SMTP_PASSWORD in `.env` is correct (16-character app password)
   - Verify Gmail 2FA is enabled and app password is generated
   - Check spam folder

3. **Email verification link not working:**
   - Make sure Authentication is enabled in Firebase console
   - Verify the action URLs are set correctly in Firebase templates

4. **Database errors:**
   - The `phone_verified` field is kept for backward compatibility
   - Email verification is handled by Firebase, not stored in database

## Security Notes

- The `firebase-service-key.json` file contains sensitive credentials
- Never commit it to version control
- Keep your Gmail app password secure
- Firebase handles email verification securely with time-limited links
- Password reset links expire after 1 hour
- Email verification links expire after 24 hours

## Support

If you encounter issues:
1. Check the Flask application logs for error messages
2. Verify all environment variables are set correctly
3. Test with a simple email address first
4. Make sure Firebase project is properly configured
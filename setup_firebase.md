# Quick Firebase Setup Guide

## The Issue
You're getting this error: `"Your default credentials were not found"`

This means Firebase Admin SDK needs proper authentication credentials to generate email verification links.

## Quick Fix (2 minutes)

### Step 1: Generate Service Account Key
1. **Open Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `skillfinesse2025`
3. **Go to Project Settings**: Click the gear icon ⚙️ next to "Project Overview"
4. **Service Accounts tab**: Click "Service accounts" at the top
5. **Generate key**: Click "Generate new private key" button
6. **Download**: A JSON file will download
7. **Rename**: Rename the downloaded file to `firebase-service-key.json`
8. **Move**: Place it in your project folder: `/Users/mdsharansifat/Desktop/skill_finesse (Final-4)/firebase-service-key.json`

### Step 2: Restart the App
```bash
# Stop the current app (Ctrl+C in the terminal where it's running)
# Then restart:
cd "/Users/mdsharansifat/Desktop/skill_finesse (Final-4)"
source venv/bin/activate
python app.py
```

## Alternative Method (Environment Variable)

If you prefer not to use a file, you can set an environment variable:

1. Download the service account key as above
2. Copy the entire content of the JSON file
3. Add it to your `.env` file:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"skillfinesse2025",...}'
```

## What This Fixes

Once you complete either method above:
- ✅ Email verification will work for new signups
- ✅ Password reset emails will be sent properly
- ✅ Firebase Admin SDK will have proper authentication

## Test It

After setting up the service account key:
1. Go to http://127.0.0.1:5001/join
2. Fill out the signup form
3. You should see: "Please check your email for a verification link"
4. Check your email for the verification link

The error will be gone and email verification will work properly!
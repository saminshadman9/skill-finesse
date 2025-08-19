# Firebase Authorized Domains Setup

## Complete Domain List for Firebase Console

Add **ALL** of these domains to Firebase Authentication > Settings > Authorized domains:

### Development Domains:
- `localhost`
- `127.0.0.1`
- `localhost:5001`
- `127.0.0.1:5001`

### Production Domains:
- `skillfinesse.com`
- `www.skillfinesse.com`

## Steps to Add Domains:

1. **Open Firebase Console**: https://console.firebase.google.com/project/skillfinesse2025/authentication/settings
2. **Scroll down to "Authorized domains"**
3. **Click "Add domain"** for each domain above
4. **Click "Save"**

## Environment Configuration:

### For Development (.env file):
```bash
BASE_URL=http://127.0.0.1:5001
```

### For Production (.env file):
```bash
BASE_URL=https://skillfinesse.com
```

## How It Works:

- **Development**: Email verification links will go to `http://127.0.0.1:5001/verify-email-complete`
- **Production**: Email verification links will go to `https://skillfinesse.com/verify-email-complete`

The system automatically detects the environment based on the `BASE_URL` environment variable.

## Testing:

After adding all domains to Firebase console, test by:
1. Going to http://127.0.0.1:5001/join
2. Creating a new account
3. Should see "Please check your email for a verification link" (no errors)

## Deployment Note:

When deploying to production:
1. Update `.env` file: `BASE_URL=https://skillfinesse.com`
2. Make sure `skillfinesse.com` is added to Firebase authorized domains
3. Email verification links will automatically use the production domain
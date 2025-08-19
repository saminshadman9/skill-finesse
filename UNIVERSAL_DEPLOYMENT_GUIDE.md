# 🌐 UNIVERSAL DEPLOYMENT GUIDE

## Auto-Domain Detection System

Your Skill Finesse application now automatically works on **both localhost and production** without any manual configuration changes!

### ✅ How It Works:

**🔍 Auto-Detection:**
- System automatically detects if running on localhost or production domain
- Email verification links point to the correct domain automatically
- Password reset links point to the correct domain automatically
- No environment switching required!

**🏠 Localhost (Development):**
- Domain: `http://127.0.0.1:5001`
- Email links: `http://127.0.0.1:5001/verify-email-complete`
- Password reset: `http://127.0.0.1:5001/reset-password-complete`

**🌐 Production:**
- Domain: `https://skillfinesse.com`
- Email links: `https://skillfinesse.com/verify-email-complete`
- Password reset: `https://skillfinesse.com/reset-password-complete`

### 🚀 Deployment Instructions:

**For Development:**
```bash
# Just run your app normally
python app.py
# ✅ Automatically uses http://127.0.0.1:5001
```

**For Production:**
```bash
# Deploy to https://skillfinesse.com/
# ✅ Automatically uses https://skillfinesse.com
```

### 📧 Email System:

**Gmail SMTP Configuration:**
- ✅ Email: `skillfinessebd@gmail.com`
- ✅ App Password: `nllj huyv pfya pgnl`
- ✅ Works on both localhost and production
- ✅ Professional email templates

**Email Flow:**
1. **Sign Up** → Verification email sent
2. **User clicks link** → Auto-redirects to correct domain
3. **Email verified** → Account activated
4. **Password reset** → Reset email sent
5. **User clicks reset link** → Auto-redirects to correct domain
6. **Password updated** → User can login

### 🔧 Firebase Configuration:

**Authorized Domains:**
- ✅ `localhost`
- ✅ `127.0.0.1`
- ✅ `skillfinesse.com`
- ✅ `www.skillfinesse.com`

**Firebase Features:**
- ✅ Email verification with oobCode
- ✅ Password reset with oobCode
- ✅ User authentication
- ✅ Rate limiting protection

### 🛡️ Security Features:

- ✅ Cloudflare Turnstile protection
- ✅ Firebase secure authentication
- ✅ HTTPS enforcement on production
- ✅ Rate limiting on email sending
- ✅ Secure session handling

### 🧪 Testing:

**Localhost Testing:**
1. Run `python app.py`
2. Go to `http://127.0.0.1:5001/join`
3. Sign up with email → Check Gmail for verification
4. Click verification link → Redirects to localhost
5. Test password reset → Links point to localhost

**Production Testing:**
1. Deploy to `https://skillfinesse.com`
2. Go to `https://skillfinesse.com/join`
3. Sign up with email → Check Gmail for verification
4. Click verification link → Redirects to production domain
5. Test password reset → Links point to production domain

### 📋 Features Included:

**User Authentication:**
- ✅ Email/phone signup with verification
- ✅ Email/phone login
- ✅ Password reset (email or phone lookup)
- ✅ Cloudflare Turnstile security

**Email System:**
- ✅ Email verification emails
- ✅ Password reset emails
- ✅ Welcome emails
- ✅ Professional HTML templates

**Firebase Integration:**
- ✅ User management
- ✅ Email verification
- ✅ Password reset
- ✅ Secure authentication

### 🎯 Ready for Deployment!

Your application is now **100% ready** for deployment to `https://skillfinesse.com/` and will continue working perfectly on localhost for development. No configuration changes needed!

**Just deploy and everything will work automatically! 🚀**
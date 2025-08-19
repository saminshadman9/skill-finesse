import os
import uuid
import datetime
import hashlib
import json
from functools import wraps
from flask import session, request, redirect, url_for, flash

# Maximum age of a trusted device token (30 days)
DEVICE_TOKEN_MAX_AGE = 30 * 24 * 60 * 60  # 30 days in seconds

class AuthManager:
    """Manages authentication and security decisions for the application"""
    
    @staticmethod
    def generate_device_token():
        """Generate a unique device token"""
        return str(uuid.uuid4())
    
    @staticmethod
    def hash_token(token, salt=None):
        """Hash a token with optional salt for storage"""
        if not salt:
            salt = os.urandom(16).hex()
        token_hash = hashlib.sha256((token + salt).encode()).hexdigest()
        return token_hash, salt
    
    @staticmethod
    def verify_token(token, token_hash, salt):
        """Verify a token against its hash"""
        return hashlib.sha256((token + salt).encode()).hexdigest() == token_hash
    
    @staticmethod
    def get_device_fingerprint():
        """Create a fingerprint for the current device based on available data"""
        user_agent = request.user_agent.string
        ip_address = request.remote_addr
        
        # We don't use the IP address directly in the fingerprint as it might change
        # but we use it to create a more unique identifier
        fingerprint_base = f"{user_agent}"
        return hashlib.md5(fingerprint_base.encode()).hexdigest()
    
    @staticmethod
    def should_require_otp(user, is_signup=False):
        """
        Determine if OTP verification should be required based on:
        1. Is this a signup? (always require OTP)
        2. Is this a trusted device?
        3. Has there been suspicious activity?
        4. Has it been too long since the last verification?
        
        NOTE: As of current implementation, OTP is only required for signup.
        Login does not require OTP verification regardless of device status.
        """
        # Always require OTP for signup
        if is_signup:
            return True
            
        # Check if we have a device token cookie
        device_token = request.cookies.get('device_token')
        if not device_token:
            # No device token means this is a new device/browser
            return True
            
        # Check if this device is associated with this user
        import models
        trusted_device = models.TrustedDevice.query.filter_by(
            user_id=user.id,
            fingerprint=AuthManager.get_device_fingerprint()
        ).first()
        
        if not trusted_device:
            # Device not recognized for this user
            return True
            
        # Verify the device token
        if not AuthManager.verify_token(device_token, trusted_device.token_hash, trusted_device.token_salt):
            # Token doesn't match what we have stored
            return True
            
        # Check if the token has expired
        if (datetime.datetime.utcnow() - trusted_device.last_used).total_seconds() > DEVICE_TOKEN_MAX_AGE:
            # Token has expired
            return True
            
        # Check for suspicious activity (different IP from usual pattern)
        if trusted_device.last_ip and trusted_device.last_ip != request.remote_addr:
            # IP has changed, might be suspicious
            # Could implement more advanced logic here based on geo-location, etc.
            # For now, we'll be cautious and require OTP
            if not AuthManager.is_ip_in_same_network(trusted_device.last_ip, request.remote_addr):
                return True
        
        # Device is trusted and recently verified, no need for OTP
        return False
    
    @staticmethod
    def is_ip_in_same_network(ip1, ip2, subnet_size=24):
        """
        Check if two IPs are in the same network
        This is a simple implementation and could be improved
        """
        try:
            # For IPv4 addresses
            if '.' in ip1 and '.' in ip2:
                ip1_parts = ip1.split('.')
                ip2_parts = ip2.split('.')
                
                # Compare the first subnet_size/8 octets
                octets_to_compare = subnet_size // 8
                return ip1_parts[:octets_to_compare] == ip2_parts[:octets_to_compare]
            
            return False
        except:
            # If any error occurs, assume different networks
            return False
    
    @staticmethod
    def register_trusted_device(user_id):
        """Register the current device as trusted for this user"""
        import models
        
        # Generate a new device token
        device_token = AuthManager.generate_device_token()
        token_hash, token_salt = AuthManager.hash_token(device_token)
        
        # Get device fingerprint
        fingerprint = AuthManager.get_device_fingerprint()
        
        # Check if this device is already registered
        existing_device = models.TrustedDevice.query.filter_by(
            user_id=user_id,
            fingerprint=fingerprint
        ).first()
        
        if existing_device:
            # Update the existing device
            existing_device.token_hash = token_hash
            existing_device.token_salt = token_salt
            existing_device.last_used = datetime.datetime.utcnow()
            existing_device.last_ip = request.remote_addr
            models.db.session.commit()
        else:
            # Create a new trusted device record
            new_device = models.TrustedDevice(
                user_id=user_id,
                token_hash=token_hash,
                token_salt=token_salt,
                fingerprint=fingerprint,
                device_name=request.user_agent.browser,
                last_ip=request.remote_addr,
                last_used=datetime.datetime.utcnow()
            )
            models.db.session.add(new_device)
            models.db.session.commit()
        
        return device_token
    
    @staticmethod
    def update_device_usage(user_id):
        """Update the last used timestamp for the current device"""
        import models
        
        fingerprint = AuthManager.get_device_fingerprint()
        
        device = models.TrustedDevice.query.filter_by(
            user_id=user_id,
            fingerprint=fingerprint
        ).first()
        
        if device:
            device.last_used = datetime.datetime.utcnow()
            device.last_ip = request.remote_addr
            models.db.session.commit()
    
    @staticmethod
    def revoke_all_devices(user_id):
        """Revoke all trusted devices for a user"""
        import models
        
        models.TrustedDevice.query.filter_by(user_id=user_id).delete()
        models.db.session.commit()

def login_required(f):
    """Decorator to require login for views"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            flash('Please log in to access this page', 'danger')
            return redirect(url_for('join'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin rights for views"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Debug logging for upload routes
        if request.path.startswith('/admin/upload'):
            print(f"Admin check - user_id: {session.get('user_id')}, is_admin: {session.get('is_admin')}")
            print(f"Admin check - content_type: {request.content_type}")
            print(f"Admin check - path: {request.path}")
        
        if not session.get('user_id') or not session.get('is_admin'):
            # Check if this is an AJAX request or file upload
            if (request.headers.get('X-Requested-With') == 'XMLHttpRequest' or 
                request.content_type == 'application/json' or 
                (request.content_type and request.content_type.startswith('multipart/form-data')) or
                request.path.startswith('/admin/upload')):
                from flask import jsonify
                return jsonify({
                    'success': False,
                    'message': 'You do not have permission to access this resource'
                }), 403
            flash('You do not have permission to access this page', 'danger')
            return redirect(url_for('join'))
        return f(*args, **kwargs)
    return decorated_function

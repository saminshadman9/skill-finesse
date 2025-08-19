# Fix for send_password_reset_email function in firebase_auth.py
# This function will create users in Firebase if they don't exist

def send_password_reset_email(email):
    """
    Send password reset email to user
    Creates user in Firebase if they don't exist
    """
    try:
        # Check if user exists, create if not
        try:
            user = auth.get_user_by_email(email)
            print(f"🔍 Found existing Firebase user: {email}")
        except auth.UserNotFoundError:
            print(f"🔍 User not found in Firebase, creating: {email}")
            # Create user in Firebase with a temporary password
            # The user will reset the password anyway
            try:
                user = auth.create_user(
                    email=email,
                    password=f"TempPass123_{int(__import__('time').time())}"  # Temporary password
                )
                print(f"✅ Created Firebase user: {email}")
            except Exception as create_error:
                print(f"❌ Failed to create Firebase user: {create_error}")
                return {
                    'success': False,
                    'error': f'Failed to create user in Firebase: {str(create_error)}'
                }
        
        # Generate password reset link
        # Auto-detect domain (works for both localhost and production)
        base_url = get_base_url()
        action_code_settings = auth.ActionCodeSettings(
            url=f'{base_url}/reset-password-complete',
            handle_code_in_app=False,
        )
        
        link = auth.generate_password_reset_link(email, action_code_settings)
        
        # Extract the oobCode from the Firebase link and create our own direct link
        import urllib.parse as urlparse
        parsed_url = urlparse.urlparse(link)
        query_params = urlparse.parse_qs(parsed_url.query)
        oob_code = query_params.get('oobCode', [None])[0]
        
        if oob_code:
            # Create direct link to our password reset endpoint with the oobCode
            direct_link = f'{base_url}/reset-password-complete?oobCode={oob_code}&mode=resetPassword'
            print(f"🔗 Direct password reset link: {direct_link}")
            link = direct_link  # Use our direct link instead of Firebase's
        
        return {
            'success': True,
            'reset_link': link,
            'user_id': user.uid,
            'message': 'Password reset link generated'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

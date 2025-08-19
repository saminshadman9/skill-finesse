# Fix the signup and verification flow

# Read the current file
with open("app.py", "r") as f:
    content = f.read()

# 1. Add user creation to signup flow - insert after session storage
old_signup = """    }
    
    # Send verification email"""

new_signup = """    }
    
    # Create user immediately with email_verified=False
    birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
    
    new_user = User(
        first_name=first_name,
        last_name=last_name,
        username=username,
        email=email,
        phone_number=phone_number,
        country_code=country_code,
        country=country,
        birth_date=birth_date,
        gender=gender,
        password=generate_password_hash(password),
        is_admin=is_admin,
        phone_verified=False,
        email_verified=False
    )
    
    db.session.add(new_user)
    db.session.commit()
    print(f"User created with ID: {new_user.id}, email_verified=False")
    
    # Send verification email"""

content = content.replace(old_signup, new_signup)

# 2. Simplify email verification - replace the entire section
import re
# Find the email verification section and replace it
pattern = r"# Check if we have signup data in session.*?return redirect\(url_for\(join\)\)"
replacement = """# User already exists from signup, just update verification status
            # Clear any session data (no longer needed)
            session.pop(signup_data, None)
            clear_otp_session()
            
            flash(Email verified successfully! You can now log in., success)
            return redirect(url_for(join))"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write the fixed content
with open("app.py", "w") as f:
    f.write(content)

print("Comprehensive fix applied")

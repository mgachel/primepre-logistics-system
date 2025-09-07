#!/usr/bin/env python
"""
Simple script to create a superadmin user
Run this script locally or on Heroku
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from users.models import CustomerUser

def create_superadmin():
    print("Creating Superadmin User...")
    
    # Superadmin credentials
    phone = input("Enter phone number (e.g., +1234567890): ")
    email = input("Enter email: ")
    password = input("Enter password: ")
    first_name = input("Enter first name (default: Super): ") or "Super"
    last_name = input("Enter last name (default: Admin): ") or "Admin"
    
    # Check if user already exists
    if CustomerUser.objects.filter(phone=phone).exists():
        print(f"❌ User with phone {phone} already exists!")
        return
        
    if CustomerUser.objects.filter(email=email).exists():
        print(f"❌ User with email {email} already exists!")
        return
    
    try:
        # Create superadmin
        user = CustomerUser.objects.create_superuser(
            phone=phone,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            user_type='INDIVIDUAL',
            is_active=True
        )
        
        print("✅ Superadmin created successfully!")
        print(f"📱 Phone: {user.phone}")
        print(f"📧 Email: {user.email}")
        print(f"👤 Name: {user.get_full_name()}")
        print(f"🔑 Role: {user.user_role}")
        print(f"⚡ Is Staff: {user.is_staff}")
        print(f"🚀 Is Superuser: {user.is_superuser}")
        print(f"🆔 User ID: {user.id}")
        
        print("\n🎉 You can now login with these credentials!")
        
    except Exception as e:
        print(f"❌ Error creating superadmin: {e}")

if __name__ == '__main__':
    create_superadmin()

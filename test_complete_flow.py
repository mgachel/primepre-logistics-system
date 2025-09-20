#!/usr/bin/env python
"""
Test complete signup flow with SMS PIN console output
"""
import os
import sys
import django
from django.conf import settings

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from users.models import CustomerUser, VerificationPin
from users.views import *
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
import json

def test_complete_signup_flow():
    """Test the complete signup flow with console PIN output"""
    print("=== Testing Complete Signup Flow ===")
    
    factory = APIRequestFactory()
    
    # Test data
    test_data = {
        'phone': '+233501234567',
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@example.com',
        'password': 'SecurePass123!',
        'region': 'Greater Accra Region',
        'city': 'Accra',
        'address': '123 Test Street',
        'business_name': 'John Doe Logistics',
        'business_type': 'individual',
        'shipping_marks': ['PM-JD-001', 'PM-JD-002']
    }
    
    print(f"\n1. Starting signup for: {test_data['phone']}")
    print(f"   Business: {test_data['business_name']}")
    print(f"   Region: {test_data['region']}")
    
    # Step 1: Phone verification
    print(f"\n2. Step 1 - Phone Registration")
    step1_view = PhoneSignupStep1View()
    request = factory.post('/auth/signup/step1/', 
                          json.dumps({'phone': test_data['phone']}),
                          content_type='application/json')
    response = step1_view.post(Request(request))
    
    if response.status_code == 201:
        step1_data = response.data
        user_id = step1_data['user_id']
        print(f"   ✓ Phone registered successfully")
        print(f"   ✓ User ID: {user_id}")
        print(f"   ✓ Verification PIN sent to console (check above)")
        
        # Step 2: Get the generated PIN from database for testing
        user = CustomerUser.objects.get(id=user_id)
        verification_pin = VerificationPin.objects.filter(user=user, is_used=False).first()
        
        if verification_pin:
            print(f"   ✓ PIN from database: {verification_pin.pin}")
            
            # Step 3: Verify PIN
            print(f"\n3. Step 2 - PIN Verification")
            verification_view = PhoneVerificationView()
            verify_request = factory.post('/auth/verify/', 
                                        json.dumps({
                                            'user_id': user_id,
                                            'pin': verification_pin.pin
                                        }),
                                        content_type='application/json')
            verify_response = verification_view.post(Request(verify_request))
            
            if verify_response.status_code == 200:
                print(f"   ✓ PIN verified successfully")
                print(f"   ✓ User is now verified")
                
                # Step 4: Complete profile
                print(f"\n4. Step 3 - Complete Profile")
                complete_view = PhoneSignupCompleteView()
                complete_request = factory.post('/auth/signup/complete/', 
                                               json.dumps({
                                                   'user_id': user_id,
                                                   'first_name': test_data['first_name'],
                                                   'last_name': test_data['last_name'],
                                                   'email': test_data['email'],
                                                   'password': test_data['password'],
                                                   'region': test_data['region'],
                                                   'city': test_data['city'],
                                                   'address': test_data['address'],
                                                   'business_name': test_data['business_name'],
                                                   'business_type': test_data['business_type'],
                                                   'shipping_marks': test_data['shipping_marks']
                                               }),
                                               content_type='application/json')
                complete_response = complete_view.post(Request(complete_request))
                
                if complete_response.status_code == 201:
                    complete_data = complete_response.data
                    print(f"   ✓ Profile completed successfully")
                    print(f"   ✓ User: {complete_data['user']['first_name']} {complete_data['user']['last_name']}")
                    print(f"   ✓ Business: {complete_data['user']['business_name']}")
                    print(f"   ✓ Shipping marks assigned: {complete_data['user']['shipping_marks']}")
                    print(f"   ✓ JWT tokens generated")
                else:
                    print(f"   ✗ Profile completion failed: {complete_response.data}")
            else:
                print(f"   ✗ PIN verification failed: {verify_response.data}")
        else:
            print(f"   ✗ No verification PIN found")
    else:
        print(f"   ✗ Phone registration failed: {response.data}")
    
    # Cleanup
    print(f"\n5. Cleanup")
    try:
        user = CustomerUser.objects.get(phone=test_data['phone'])
        user.delete()
        print(f"   ✓ Test user deleted")
    except CustomerUser.DoesNotExist:
        print(f"   ✓ No test user to delete")
    
    print(f"\n=== Signup Flow Test Complete ===")

if __name__ == "__main__":
    test_complete_signup_flow()
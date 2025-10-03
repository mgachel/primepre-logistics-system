"""
Test script to verify the shipping mark verification endpoint
"""
import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from users.models import CustomerUser
from cargo.models import CargoItem
import requests
import json

def test_verification_endpoint():
    """Test the verification endpoint with sample data"""
    
    # Check if we have any unverified users
    unverified_users = CustomerUser.objects.filter(is_verified=False)
    print(f"\n=== UNVERIFIED USERS ({unverified_users.count()}) ===")
    
    for user in unverified_users[:5]:
        print(f"\nPhone: {user.phone}")
        print(f"Name: {user.get_full_name()}")
        print(f"Email: {user.email}")
        print(f"Shipping Mark: {user.shipping_mark}")
        print(f"Verified: {user.is_verified}")
        
        # Check if they have cargo items
        if user.shipping_mark:
            cargo_count = CargoItem.objects.filter(
                client__shipping_mark__iexact=user.shipping_mark
            ).count()
            print(f"Cargo Items with this mark: {cargo_count}")
    
    # Test the endpoint with a sample request
    if unverified_users.exists():
        test_user = unverified_users.first()
        
        print(f"\n=== TESTING ENDPOINT WITH USER: {test_user.phone} ===")
        
        # Test 1: User doesn't have shipping mark
        payload1 = {
            'phone': test_user.phone,
            'has_shipping_mark': False,
            'shipping_mark': ''
        }
        
        print(f"\nTest 1: No shipping mark")
        print(f"Payload: {json.dumps(payload1, indent=2)}")
        
        response1 = requests.post(
            'http://localhost:8000/api/auth/verify/shipping-mark/',
            json=payload1
        )
        
        print(f"Status Code: {response1.status_code}")
        print(f"Response: {json.dumps(response1.json(), indent=2)}")
        
        # Test 2: User has shipping mark (if they have one)
        if test_user.shipping_mark:
            payload2 = {
                'phone': test_user.phone,
                'has_shipping_mark': True,
                'shipping_mark': test_user.shipping_mark
            }
            
            print(f"\nTest 2: With shipping mark '{test_user.shipping_mark}'")
            print(f"Payload: {json.dumps(payload2, indent=2)}")
            
            response2 = requests.post(
                'http://localhost:8000/api/auth/verify/shipping-mark/',
                json=payload2
            )
            
            print(f"Status Code: {response2.status_code}")
            print(f"Response: {json.dumps(response2.json(), indent=2)}")

if __name__ == '__main__':
    test_verification_endpoint()

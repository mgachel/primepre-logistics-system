"""
Test script for shipping mark verification system

This script tests the new verification endpoints:
1. Shipping mark verification
2. Account confirmation with password

Usage:
    python test_verification_system.py
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/auth"

def test_verification_with_shipping_mark():
    """Test verification flow when customer has a shipping mark"""
    print("\n" + "="*60)
    print("TEST 1: Verification with Shipping Mark")
    print("="*60)
    
    # Step 1: Verify shipping mark
    print("\n1. Verifying shipping mark...")
    url = f"{BASE_URL}/verify/shipping-mark/"
    payload = {
        "phone": "+233123456789",  # Replace with actual test phone
        "has_shipping_mark": True,
        "shipping_mark": "PM 001"  # Replace with actual shipping mark
    }
    
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            print("\n✅ Shipping mark verified successfully!")
            
            # Step 2: Confirm and set password
            print("\n2. Confirming and setting password...")
            confirm_url = f"{BASE_URL}/verify/shipping-mark/confirm/"
            confirm_payload = {
                "phone": payload["phone"],
                "shipping_mark": payload["shipping_mark"],
                "password": "TestPassword123",
                "confirm_password": "TestPassword123"
            }
            
            confirm_response = requests.post(confirm_url, json=confirm_payload)
            print(f"Status Code: {confirm_response.status_code}")
            print(f"Response: {json.dumps(confirm_response.json(), indent=2)}")
            
            if confirm_response.status_code == 200:
                confirm_data = confirm_response.json()
                if confirm_data.get('success'):
                    print("\n✅ Account verified successfully!")
                    print(f"Access Token: {confirm_data['tokens']['access'][:50]}...")
                else:
                    print(f"\n❌ Confirmation failed: {confirm_data.get('error')}")
            else:
                print(f"\n❌ Confirmation request failed")
        else:
            print(f"\n❌ Verification failed: {data.get('error')}")
    else:
        print(f"\n❌ Verification request failed")


def test_verification_without_shipping_mark():
    """Test verification flow when customer doesn't have a shipping mark"""
    print("\n" + "="*60)
    print("TEST 2: Verification without Shipping Mark")
    print("="*60)
    
    # Step 1: Indicate no shipping mark
    print("\n1. Verifying without shipping mark...")
    url = f"{BASE_URL}/verify/shipping-mark/"
    payload = {
        "phone": "+233987654321",  # Replace with actual test phone
        "has_shipping_mark": False,
        "shipping_mark": ""
    }
    
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            print("\n✅ User can proceed without shipping mark!")
            
            # Step 2: Confirm and set password
            print("\n2. Setting password...")
            confirm_url = f"{BASE_URL}/verify/shipping-mark/confirm/"
            confirm_payload = {
                "phone": payload["phone"],
                "shipping_mark": data['user']['shipping_mark'],  # Use system-generated mark
                "password": "TestPassword123",
                "confirm_password": "TestPassword123"
            }
            
            confirm_response = requests.post(confirm_url, json=confirm_payload)
            print(f"Status Code: {confirm_response.status_code}")
            print(f"Response: {json.dumps(confirm_response.json(), indent=2)}")


def test_invalid_shipping_mark():
    """Test with invalid shipping mark"""
    print("\n" + "="*60)
    print("TEST 3: Invalid Shipping Mark")
    print("="*60)
    
    url = f"{BASE_URL}/verify/shipping-mark/"
    payload = {
        "phone": "+233123456789",
        "has_shipping_mark": True,
        "shipping_mark": "INVALID999"
    }
    
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_already_verified():
    """Test with already verified account"""
    print("\n" + "="*60)
    print("TEST 4: Already Verified Account")
    print("="*60)
    
    url = f"{BASE_URL}/verify/shipping-mark/"
    payload = {
        "phone": "+233111222333",  # Use a verified account
        "has_shipping_mark": True,
        "shipping_mark": "PM 001"
    }
    
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def main():
    print("\n" + "="*60)
    print("SHIPPING MARK VERIFICATION SYSTEM TESTS")
    print("="*60)
    print("\nMake sure Django server is running on localhost:8000")
    print("Update phone numbers and shipping marks with actual test data")
    
    try:
        # Run tests
        test_verification_with_shipping_mark()
        # test_verification_without_shipping_mark()
        # test_invalid_shipping_mark()
        # test_already_verified()
        
        print("\n" + "="*60)
        print("TESTS COMPLETED")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to Django server")
        print("Make sure the server is running: python manage.py runserver")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")


if __name__ == "__main__":
    main()

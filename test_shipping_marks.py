"""
Test script to check shipping marks endpoint
"""
import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from users.models import CustomerUser

# Get all unique shipping marks
shipping_marks = CustomerUser.objects.filter(
    cargo_items__isnull=False
).values_list('shipping_mark', flat=True).distinct().order_by('shipping_mark')

# Filter out None and empty values
shipping_marks = [mark for mark in shipping_marks if mark and mark.strip()]

print(f"Total shipping marks: {len(shipping_marks)}")
print(f"\nFirst 20 shipping marks:")
for mark in list(shipping_marks)[:20]:
    print(f"  - {mark}")

# Test the API endpoint
print("\n\n=== Testing API Endpoint ===")
import requests
try:
    response = requests.get('http://localhost:8000/api/auth/shipping-marks/')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

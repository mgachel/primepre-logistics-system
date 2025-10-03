import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from django.test import RequestFactory
from cargo.container_excel_views import CustomerSearchView
from django.contrib.auth import get_user_model

User = get_user_model()

# Create a test request
factory = RequestFactory()
user = User.objects.filter(is_staff=True).first()

# Test 1: Search with no query (should return all)
print("=" * 80)
print("TEST 1: Empty query (limit=500)")
print("=" * 80)
request = factory.get('/api/cargo/customers/search/?limit=500&page=1')
request.user = user
view = CustomerSearchView()
response = view.get(request)
data = response.data
print(f"Status: {response.status_code}")
print(f"Total customers returned: {len(data.get('customers', []))}")
print(f"Pagination: {data.get('pagination')}")

# Test 2: Search for "BOAZ"
print("\n" + "=" * 80)
print("TEST 2: Search for 'BOAZ'")
print("=" * 80)
request = factory.get('/api/cargo/customers/search/?q=BOAZ&limit=100&page=1')
request.user = user
view = CustomerSearchView()
response = view.get(request)
data = response.data
print(f"Status: {response.status_code}")
print(f"Customers found: {len(data.get('customers', []))}")
for customer in data.get('customers', [])[:5]:
    print(f"  - {customer.get('shipping_mark')} | {customer.get('name')}")

# Test 3: Search for "BENNYBOAZ"
print("\n" + "=" * 80)
print("TEST 3: Search for 'BENNYBOAZ'")
print("=" * 80)
request = factory.get('/api/cargo/customers/search/?q=BENNYBOAZ&limit=100&page=1')
request.user = user
view = CustomerSearchView()
response = view.get(request)
data = response.data
print(f"Status: {response.status_code}")
print(f"Customers found: {len(data.get('customers', []))}")
for customer in data.get('customers', []):
    print(f"  - {customer.get('shipping_mark')} | {customer.get('name')}")

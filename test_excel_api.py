#!/usr/bin/env python
"""
Simple test for Excel upload API endpoint
"""
import os
import sys
import django
import pandas as pd
import io
import requests
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient
from users.models import CustomerUser

User = get_user_model()

def create_test_excel():
    """Create a test Excel file"""
    data = {
        'Shipping Mark': ['PMAPI01', 'PMAPI02'],
        'Date of Receipt': ['2024-12-30', '2024-12-31'],
        'Date of Loading': ['2025-01-05', ''],
        'Description': ['API Test Electronics', 'API Test Furniture'],
        'Quantity': [10, 5],
        'Specifications': ['N/A', 'N/A'],
        'CBM': [2.5, 1.8],
        'Supplier Tracking Number': ['API123456789', 'API987654321']
    }
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Sheet1', index=False)
    output.seek(0)
    
    file_obj = io.BytesIO(output.read())
    file_obj.name = 'api_test_upload.xlsx'
    return file_obj

def test_excel_api():
    """Test Excel upload via API"""
    print("🚀 Testing Excel Upload API...")
    
    # Create or get test user
    try:
        user = User.objects.get(phone='+233123456789')
        print(f"✅ Using existing user: {user.phone}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            phone='+233123456789',
            email='api@test.com',
            password='testpass123',
            first_name='API',
            last_name='Tester',
            user_role='ADMIN'
        )
        print(f"✅ Created test user: {user.phone}")
    
    # Create API client
    client = APIClient()
    client.force_authenticate(user=user)
    
    # Create test Excel file
    excel_file = create_test_excel()
    print(f"✅ Created test Excel file: {excel_file.name}")
    
    # Test the new Excel upload endpoint
    print("\n📤 Testing /cargo/excel/upload/ endpoint...")
    
    response = client.post('/cargo/excel/upload/', {
        'file': excel_file,
        'upload_type': 'goods_received',
        'warehouse_location': 'China'
    }, format='multipart')
    
    print(f"Response Status: {response.status_code}")
    
    # Handle different response types
    if hasattr(response, 'data'):
        print(f"Response Data: {response.data}")
        response_data = response.data
    else:
        # For HttpResponse objects
        import json
        try:
            response_data = json.loads(response.content.decode())
            print(f"Response Data: {response_data}")
        except:
            print(f"Response Content: {response.content.decode()}")
            response_data = {}
    
    if response.status_code == 200:
        print("✅ Excel upload successful!")
        print(f"   Summary: {response_data.get('summary', {})}")
        
        # Verify data was created
        from GoodsRecieved.models import GoodsReceivedChina
        china_records = GoodsReceivedChina.objects.filter(shipping_mark__in=['PMAPI01', 'PMAPI02'])
        print(f"✅ Created {china_records.count()} records in database")
        
        customers = CustomerUser.objects.filter(shipping_mark__in=['PMAPI01', 'PMAPI02'])
        print(f"✅ Created {customers.count()} customers")
        
    else:
        print(f"❌ Upload failed: {response_data}")
    
    # Test template download
    print("\n📥 Testing template download...")
    template_response = client.get('/cargo/excel/template/?type=goods_received&warehouse=China')
    print(f"Template Response Status: {template_response.status_code}")
    
    if template_response.status_code == 200:
        print("✅ Template download successful!")
        print(f"   Content-Type: {template_response.get('Content-Type', 'Unknown')}")
    else:
        if hasattr(template_response, 'data'):
            print(f"❌ Template download failed: {template_response.data}")
        else:
            print(f"❌ Template download failed: {template_response.content.decode()}")
    
    # Test Customer Shipments integration
    print("\n🔗 Testing Customer Shipments integration...")
    
    if CustomerUser.objects.filter(shipping_mark='PMAPI01').exists():
        shipments_response = client.get('/cargo/customer/shipments/?shipping_mark=PMAPI01')
        print(f"Customer Shipments Status: {shipments_response.status_code}")
        
        if shipments_response.status_code == 200:
            print("✅ Customer Shipments integration working!")
            if hasattr(shipments_response, 'data'):
                shipment_data = shipments_response.data
            else:
                import json
                shipment_data = json.loads(shipments_response.content.decode())
            
            china_goods = shipment_data.get('goods_received_china', {})
            print(f"   China Goods: {china_goods.get('total_quantity', 0)} qty, {china_goods.get('total_cbm', 0)} CBM")
        else:
            if hasattr(shipments_response, 'data'):
                print(f"❌ Customer Shipments failed: {shipments_response.data}")
            else:
                print(f"❌ Customer Shipments failed: {shipments_response.content.decode()}")
    
    print("\n✅ API Test Complete!")

if __name__ == '__main__':
    test_excel_api()

#!/usr/bin/env python
"""
Quick test script for Excel upload functionality
"""
import os
import sys
import django
import pandas as pd
import io
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from django.contrib.auth import get_user_model
from cargo.excel_upload_views import ExcelUploadProcessor
from users.models import CustomerUser
from GoodsRecieved.models import GoodsReceivedChina

User = get_user_model()

def create_test_excel():
    """Create a test Excel file"""
    data = {
        'Shipping Mark': ['PMTEST01', 'PMTEST02'],
        'Date of Receipt': ['2024-12-30', '2024-12-31'],
        'Date of Loading': ['2025-01-05', ''],
        'Description': ['Test Electronics', 'Test Furniture'],
        'Quantity': [10, 5],
        'Specifications': ['N/A', 'N/A'],
        'CBM': [2.5, 1.8],
        'Supplier Tracking Number': ['TRK123456789', 'TRK987654321']
    }
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Sheet1', index=False)
    output.seek(0)
    
    file_obj = io.BytesIO(output.read())
    file_obj.name = 'test_upload.xlsx'
    return file_obj

def test_excel_upload():
    """Test Excel upload functionality"""
    print("🧪 Testing Excel Upload Functionality...")
    
    # Create test user
    try:
        user = User.objects.get(phone='+233123456789')
        print(f"✅ Using existing user: {user.phone}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            phone='+233123456789',
            email='admin@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Admin',
            user_role='ADMIN'
        )
        print(f"✅ Created test user: {user.phone}")
    
    # Create test Excel file
    excel_file = create_test_excel()
    print(f"✅ Created test Excel file: {excel_file.name}")
    
    # Process with ExcelUploadProcessor
    processor = ExcelUploadProcessor(
        file=excel_file,
        upload_type='goods_received',
        warehouse_location='China',
        uploader_user_id=user.id
    )
    
    result = processor.process()
    
    print(f"\n📊 Upload Results:")
    print(f"Success: {result['success']}")
    print(f"Summary: {result['summary']}")
    
    if result['success']:
        print(f"✅ Successfully processed {result['summary']['total_rows']} rows")
        print(f"   - Created: {result['summary']['created']}")
        print(f"   - Updated: {result['summary']['updated']}")
        print(f"   - Errors: {result['summary']['errors']}")
        
        # Check database records
        china_records = GoodsReceivedChina.objects.all()
        print(f"✅ Database has {china_records.count()} Goods Received China records")
        
        customers = CustomerUser.objects.filter(shipping_mark__in=['PMTEST01', 'PMTEST02'])
        print(f"✅ Database has {customers.count()} customers with test shipping marks")
        
        for customer in customers:
            print(f"   - {customer.shipping_mark}: {customer.get_full_name()}")
    
    else:
        print(f"❌ Upload failed: {result.get('error', 'Unknown error')}")
        if 'results' in result:
            for res in result['results']:
                if res['status'] == 'error':
                    print(f"   Row {res['row_number']}: {res['message']}")
    
    print("\n🔗 Testing Customer Shipments Integration...")
    
    # Test customer shipments integration
    try:
        from cargo.customer_shipments_views import CustomerShipmentsView
        print("✅ CustomerShipmentsView imported successfully")
        
        # Manually test aggregation logic
        customer = customers.first() if customers.exists() else None
        if customer:
            china_items = GoodsReceivedChina.objects.filter(shipping_mark=customer.shipping_mark)
            total_quantity = sum(item.quantity for item in china_items)
            total_cbm = sum(item.cbm for item in china_items)
            
            print(f"✅ Customer {customer.shipping_mark} aggregation:")
            print(f"   - China Goods: {china_items.count()} items, {total_quantity} qty, {total_cbm} CBM")
        
    except Exception as e:
        print(f"❌ Customer Shipments integration error: {e}")
    
    print("\n✅ Excel Upload Test Complete!")

if __name__ == '__main__':
    test_excel_upload()

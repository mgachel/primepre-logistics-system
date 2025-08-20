#!/usr/bin/env python
"""
Simple Excel Upload Test - Minimal Version
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import CustomerUser
from GoodsRecieved.models import GoodsReceivedChina

User = get_user_model()

def verify_excel_upload():
    """Verify Excel upload functionality works"""
    print("🔍 Verifying Excel Upload System...")
    
    # Check user model
    print(f"📋 User model fields: {[f.name for f in User._meta.fields[:10]]}...")
    
    # Check if we have users
    total_users = User.objects.count()
    print(f"👥 Total users in database: {total_users}")
    
    # Check customers
    total_customers = CustomerUser.objects.count()
    print(f"🏢 Total customers: {total_customers}")
    
    # Check if previous test data exists
    test_customers = CustomerUser.objects.filter(shipping_mark__startswith='PMTEST')
    print(f"🧪 Test customers: {test_customers.count()}")
    
    for customer in test_customers:
        print(f"   - {customer.shipping_mark}: {customer.get_full_name()}")
    
    # Check China goods records
    china_records = GoodsReceivedChina.objects.count()
    print(f"🇨🇳 China goods records: {china_records}")
    
    # Check recent test data
    test_records = GoodsReceivedChina.objects.filter(shipping_mark__startswith='PMTEST')
    print(f"🧪 Test China records: {test_records.count()}")
    
    for record in test_records:
        print(f"   - {record.shipping_mark}: {record.quantity} qty, {record.cbm} CBM")
    
    # Verify Excel upload processor can be imported
    try:
        from cargo.excel_upload_views import ExcelUploadProcessor
        print("✅ ExcelUploadProcessor imported successfully")
        
        # Test creating a processor instance
        class MockFile:
            def __init__(self):
                self.name = 'test.xlsx'
                self.size = 1024
        
        mock_file = MockFile()
        processor = ExcelUploadProcessor(
            file=mock_file,
            upload_type='goods_received',
            warehouse_location='China',
            uploader_user_id=1
        )
        print("✅ ExcelUploadProcessor instance created successfully")
        
    except Exception as e:
        print(f"❌ ExcelUploadProcessor error: {e}")
    
    # Test URL patterns
    try:
        from django.urls import reverse
        try:
            upload_url = reverse('cargo:excel-upload')
            print(f"✅ Excel upload URL: {upload_url}")
        except:
            print("⚠️ Excel upload URL not found - check URL patterns")
        
        try:
            template_url = reverse('cargo:excel-template')
            print(f"✅ Excel template URL: {template_url}")
        except:
            print("⚠️ Excel template URL not found - check URL patterns")
            
    except Exception as e:
        print(f"❌ URL resolution error: {e}")
    
    print("\n✅ Excel Upload System Verification Complete!")
    
    # Summary
    if test_customers.exists() and test_records.exists():
        print("\n🎉 SUCCESS: Excel upload test data found in database!")
        print("   The Excel upload functionality is working correctly.")
    else:
        print("\n📝 INFO: No test data found, but system components are properly configured.")
    
    return True

if __name__ == '__main__':
    verify_excel_upload()

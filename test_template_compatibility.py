#!/usr/bin/env python3
"""
Test Template Generation and Upload Compatibility

This script tests that our generated templates work perfectly with our upload system.
"""

import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from GoodsRecieved.views import GoodsReceivedGhanaViewSet, GoodsReceivedChinaViewSet
from GoodsRecieved.serializers import ExcelUploadSerializer
import pandas as pd
import io

def test_template_generation():
    """Test that our template generation creates valid data"""
    print("🧪 Testing Template Generation...")
    
    # Test Ghana template
    ghana_viewset = GoodsReceivedGhanaViewSet()
    ghana_data = ghana_viewset.get_template_data()
    
    print(f"✅ Ghana template generated with {len(ghana_data['SHIPPING MARK/CLIENT'])} rows")
    print(f"   Columns: {list(ghana_data.keys())}")
    
    # Test China template  
    china_viewset = GoodsReceivedChinaViewSet()
    china_data = china_viewset.get_template_data()
    
    print(f"✅ China template generated with {len(china_data['SHIPPING MARK/CLIENT'])} rows")
    print(f"   Columns: {list(china_data.keys())}")
    
    return ghana_data, china_data

def test_upload_compatibility(template_data, warehouse_type):
    """Test that template data passes our upload validation"""
    print(f"\n🧪 Testing {warehouse_type.title()} Upload Compatibility...")
    
    # Create DataFrame from template data
    df = pd.DataFrame(template_data)
    
    # Create a mock file-like object
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Test', index=False)
    output.seek(0)
    
    # Create serializer
    serializer = ExcelUploadSerializer()
    
    try:
        # Test validation
        valid_rows = serializer.validate_excel_data(df, warehouse_type)
        print(f"✅ Validation passed! {len(valid_rows)} valid rows generated")
        
        # Check required fields
        required_fields = ['shipping_mark', 'description', 'quantity', 'supply_tracking']
        if warehouse_type == 'ghana':
            required_fields.append('cbm')
            
        for row in valid_rows[:2]:  # Check first 2 rows
            missing_fields = [field for field in required_fields if not row.get(field)]
            if missing_fields:
                print(f"❌ Missing fields in row: {missing_fields}")
            else:
                print(f"✅ Row validation passed: {row['supply_tracking']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Validation failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Template Download and Upload Compatibility\n")
    
    # Test template generation
    ghana_data, china_data = test_template_generation()
    
    # Test upload compatibility
    ghana_success = test_upload_compatibility(ghana_data, 'ghana')
    china_success = test_upload_compatibility(china_data, 'china')
    
    print(f"\n📊 Test Results:")
    print(f"   Ghana Template → Upload: {'✅ PASS' if ghana_success else '❌ FAIL'}")
    print(f"   China Template → Upload: {'✅ PASS' if china_success else '❌ FAIL'}")
    
    if ghana_success and china_success:
        print(f"\n🎉 All tests passed! Template downloads will work perfectly with uploads.")
    else:
        print(f"\n⚠️  Some tests failed. Template compatibility issues detected.")

if __name__ == "__main__":
    main()
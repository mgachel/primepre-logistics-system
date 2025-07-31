#!/usr/bin/env python3
"""
Test script for the robust Excel processor.
This script tests the excel_processor with the sample Excel files in the backend directory.
"""

import sys
import os
from pathlib import Path

# Add the project path to Python path
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

from GoodsRecieved.excel_processor import (
    extract_target_columns, 
    process_goods_received_excel,
    process_cargo_excel,
    CHINA_WAREHOUSE_COLUMNS,
    CARGO_COLUMNS
)


def test_sample_files():
    """Test the robust Excel processor with sample files"""
    
    # Sample files in the backend directory
    sample_files = [
        'sample_cargo_upload.xlsx',
        'test_bulk_upload.xlsx'
    ]
    
    print("🧪 Testing Robust Excel Processor")
    print("=" * 50)
    
    for filename in sample_files:
        filepath = backend_path / filename
        
        if not filepath.exists():
            print(f"❌ File not found: {filename}")
            continue
            
        print(f"\n📁 Testing file: {filename}")
        print("-" * 30)
        
        try:
            # Test with goods received columns
            print("🏢 Testing as Goods Received (China warehouse):")
            result = extract_target_columns(
                str(filepath), 
                CHINA_WAREHOUSE_COLUMNS,
                max_header_search_rows=20,
                min_column_match_threshold=0.3
            )
            
            if result:
                print(f"  ✅ Found {len(result)} records")
                print(f"  📊 Columns found: {list(result[0].keys()) if result else 'None'}")
                
                # Show first record as sample
                if result:
                    print(f"  📋 Sample record: {result[0]}")
            else:
                print("  ❌ No matching data found")
            
            # Test with cargo columns
            print("\n🚛 Testing as Cargo items:")
            result = extract_target_columns(
                str(filepath),
                CARGO_COLUMNS,
                max_header_search_rows=20,
                min_column_match_threshold=0.3
            )
            
            if result:
                print(f"  ✅ Found {len(result)} records")
                print(f"  📊 Columns found: {list(result[0].keys()) if result else 'None'}")
                
                # Show first record as sample
                if result:
                    print(f"  📋 Sample record: {result[0]}")
            else:
                print("  ❌ No matching data found")
                
        except Exception as e:
            print(f"  ❌ Error processing {filename}: {str(e)}")
    
    print("\n" + "=" * 50)
    print("✨ Testing completed!")


def test_with_custom_columns():
    """Test with custom column sets"""
    print("\n🔧 Testing with custom column detection")
    print("=" * 50)
    
    # Test various column name variations
    test_columns = [
        ['shipping mark', 'client', 'cbm', 'quantity', 'description'],
        ['mark', 'tracking', 'volume', 'qty', 'details'],
        ['shipping_mark', 'supply_tracking', 'cbm', 'ctns'],
    ]
    
    sample_file = backend_path / 'sample_cargo_upload.xlsx'
    
    if sample_file.exists():
        for i, columns in enumerate(test_columns, 1):
            print(f"\n🧪 Test {i}: Looking for columns: {columns}")
            
            result = extract_target_columns(
                str(sample_file),
                columns,
                max_header_search_rows=25,
                min_column_match_threshold=0.2  # Lower threshold for testing
            )
            
            if result:
                print(f"  ✅ Found {len(result)} records")
                print(f"  📊 Matched columns: {list(result[0].keys())}")
            else:
                print("  ❌ No matches found")


if __name__ == "__main__":
    print("🚀 Starting Robust Excel Processor Tests")
    print("=" * 60)
    
    test_sample_files()
    test_with_custom_columns()
    
    print("\n🎉 All tests completed!")
    print("=" * 60)

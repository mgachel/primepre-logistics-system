#!/usr/bin/env python3
"""
Sample Excel file generator for Goods Received Upload
Creates a properly formatted Excel file that matches the A,B,C,D,E,G,H structure
"""

import pandas as pd
from datetime import datetime, timedelta
import random

def create_sample_excel():
    """Create a sample Excel file with proper format for goods received upload"""
    
    # Sample data following the exact column structure
    sample_data = {
        # Column A: Shipping Mark/Client (Required)
        'SHIPPING MARK/CLIENT': [
            'PM001',
            'PM002', 
            'PM003',
            'PM004',
            'PM005',
            'PM006',
            'PM007',
            'PM008',
            'PM009',
            'PM010'
        ],
        
        # Column B: Date of Receipt (Required) - DD/MM/YYYY format
        'DATE OF RECEIPT': [
            '15/09/2025',
            '16/09/2025',
            '17/09/2025',
            '18/09/2025',
            '19/09/2025',
            '20/09/2025',
            '21/09/2025',
            '22/09/2025',
            '23/09/2025',
            '24/09/2025'
        ],
        
        # Column C: Date of Loading (Optional) - DD/MM/YYYY format
        'DATE OF LOADING': [
            '20/09/2025',
            '',  # Optional - can be empty
            '22/09/2025',
            '23/09/2025',
            '',  # Optional - can be empty
            '25/09/2025',
            '26/09/2025',
            '',  # Optional - can be empty
            '28/09/2025',
            '29/09/2025'
        ],
        
        # Column D: Description (Required)
        'DESCRIPTION': [
            'Electronics - Mobile phones and accessories',
            'Textiles - Cotton fabrics and garments',
            'Machinery - Industrial equipment parts',
            'Home appliances - Kitchen equipment',
            'Automotive parts - Car accessories',
            'Furniture - Office chairs and desks',
            'Medical supplies - Surgical instruments',
            'Sports equipment - Fitness gear',
            'Books and stationery - Educational materials',
            'Cosmetics - Beauty products'
        ],
        
        # Column E: CTNS (Quantity) - Required
        'CTNS': [
            25,
            15,
            8,
            12,
            30,
            20,
            5,
            18,
            22,
            10
        ],
        
        # Column F: Specifications (This column is IGNORED by the system)
        'SPECIFICATIONS': [
            'Class A',
            'Standard',
            'Premium',
            'Basic',
            'Deluxe',
            'Standard',
            'Medical Grade',
            'Professional',
            'Educational',
            'Commercial'
        ],
        
        # Column G: CBM (Required for Ghana, Optional for China)
        'CBM': [
            5.25,
            3.80,
            12.50,
            7.20,
            4.15,
            9.75,
            2.30,
            6.40,
            3.95,
            8.60
        ],
        
        # Column H: Suppliers Tracking No (Required)
        'SUPPLIERS TRACKING NO': [
            'TRK2025090001',
            'TRK2025090002',
            'TRK2025090003',
            'TRK2025090004',
            'TRK2025090005',
            'TRK2025090006',
            'TRK2025090007',
            'TRK2025090008',
            'TRK2025090009',
            'TRK2025090010'
        ]
    }
    
    # Create DataFrame
    df = pd.DataFrame(sample_data)
    
    # Create Excel file
    filename = 'Sample_Goods_Received_Template.xlsx'
    
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Goods Received', index=False, startrow=0, startcol=0)
        
        # Get the workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets['Goods Received']
        
        # Adjust column widths for better readability
        column_widths = {
            'A': 20,  # Shipping Mark
            'B': 15,  # Date of Receipt
            'C': 15,  # Date of Loading
            'D': 40,  # Description
            'E': 10,  # CTNS
            'F': 15,  # Specifications
            'G': 10,  # CBM
            'H': 20   # Suppliers Tracking No
        }
        
        for col, width in column_widths.items():
            worksheet.column_dimensions[col].width = width
    
    print(f"✅ Sample Excel file created: {filename}")
    print("\n📋 Column Structure:")
    print("A: Shipping Mark/Client (Required)")
    print("B: Date of Receipt (Required) - DD/MM/YYYY")
    print("C: Date of Loading (Optional) - DD/MM/YYYY")
    print("D: Description (Required)")
    print("E: CTNS/Quantity (Required)")
    print("F: Specifications (IGNORED)")
    print("G: CBM (Required for Ghana)")
    print("H: Suppliers Tracking No (Required)")
    print("\n🎯 This file is ready for upload testing!")
    
    return filename

def create_error_prone_sample():
    """Create a sample with common errors to test validation"""
    
    error_data = {
        'SHIPPING MARK/CLIENT': [
            '',  # Missing required field
            'PM002',
            'PM003'
        ],
        'DATE OF RECEIPT': [
            '15/09/2025',
            'invalid-date',  # Invalid date format
            ''  # Missing required field
        ],
        'DATE OF LOADING': [
            '20/09/2025',
            '16/09/2025',
            '22/09/2025'
        ],
        'DESCRIPTION': [
            'Valid description',
            '',  # Missing required field
            'Another valid description'
        ],
        'CTNS': [
            25,
            -5,  # Invalid negative quantity
            'abc'  # Invalid data type
        ],
        'SPECIFICATIONS': [
            'Class A',
            'Standard',
            'Premium'
        ],
        'CBM': [
            5.25,
            -2.5,  # Invalid negative CBM
            8.60
        ],
        'SUPPLIERS TRACKING NO': [
            'TRK2025090001',
            '',  # Missing required field
            'TRK2025090003'
        ]
    }
    
    df = pd.DataFrame(error_data)
    filename = 'Sample_With_Errors.xlsx'
    
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Goods Received', index=False)
    
    print(f"⚠️  Error sample created: {filename}")
    print("This file contains validation errors for testing purposes")
    
    return filename

if __name__ == "__main__":
    # Create both samples
    good_file = create_sample_excel()
    error_file = create_error_prone_sample()
    
    print(f"\n📁 Files created in current directory:")
    print(f"  ✅ {good_file} - Valid data for successful upload")
    print(f"  ⚠️  {error_file} - Contains errors for validation testing")
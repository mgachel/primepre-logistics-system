#!/usr/bin/env python3
"""
Sample Excel File Generator for Goods Received Upload

This script creates sample Excel files that match the exact column structure
required for the goods received upload functionality:

Column A: Shipping Mark/Client (Required)
Column B: Date of Receipt (Required) 
Column C: Date of Loading (Optional)
Column D: Description (Required)
Column E: CTNS/Quantity (Required)
Column F: Specifications (Ignored)
Column G: CBM (Required for Ghana)
Column H: Suppliers Tracking No (Required)
"""

import pandas as pd
from datetime import datetime, timedelta
import random
import os

def create_sample_data(num_rows=20, warehouse='Ghana'):
    """Create sample data for goods received upload"""
    
    # Sample shipping marks
    shipping_marks = ['PM001', 'PM002', 'PM003', 'PM004', 'PM005', 'PM006', 'PM007', 'PM008']
    
    # Sample descriptions
    descriptions = [
        'Electronics - Mobile phones and accessories',
        'Textiles - Cotton fabrics and clothing',
        'Household items - Kitchen appliances',
        'Automotive parts - Engine components',
        'Furniture - Office chairs and tables',
        'Cosmetics - Beauty products and skincare',
        'Sports equipment - Soccer balls and gear',
        'Books and stationery - Educational materials',
        'Food items - Canned goods and spices',
        'Medical supplies - First aid kits'
    ]
    
    # Sample suppliers tracking numbers
    def generate_tracking():
        return f"TRK{random.randint(100000000, 999999999)}"
    
    data = []
    base_date = datetime.now()
    
    for i in range(num_rows):
        # Generate dates
        date_receipt = base_date - timedelta(days=random.randint(1, 30))
        date_loading = date_receipt + timedelta(days=random.randint(1, 7)) if random.choice([True, False]) else None
        
        row = {
            'A_SHIPPING_MARK': random.choice(shipping_marks),
            'B_DATE_RECEIPT': date_receipt.strftime('%d/%m/%Y'),
            'C_DATE_LOADING': date_loading.strftime('%d/%m/%Y') if date_loading else '',
            'D_DESCRIPTION': random.choice(descriptions),
            'E_QUANTITY': random.randint(1, 50),
            'F_SPECIFICATIONS': 'N/A',  # This column is ignored
            'G_CBM': round(random.uniform(0.5, 10.0), 3),
            'H_TRACKING_NO': generate_tracking()
        }
        data.append(row)
    
    return data

def create_excel_file(filename, data, include_headers=True):
    """Create Excel file with the sample data"""
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    if not include_headers:
        # Remove column names to create data-only file
        df.columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    
    # Create Excel writer with formatting
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Goods Received', index=False)
        
        # Get the workbook and worksheet
        workbook = writer.book
        worksheet = writer.sheets['Goods Received']
        
        # Format columns
        from openpyxl.styles import Font, PatternFill, Alignment
        
        # Header formatting (if headers exist)
        if include_headers:
            header_font = Font(bold=True, color='FFFFFF')
            header_fill = PatternFill(start_color='366092', end_color='366092', fill_type='solid')
            
            for cell in worksheet[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = Alignment(horizontal='center')
        
        # Adjust column widths
        column_widths = {
            'A': 15,  # Shipping Mark
            'B': 12,  # Date Receipt
            'C': 12,  # Date Loading
            'D': 40,  # Description
            'E': 10,  # Quantity
            'F': 15,  # Specifications
            'G': 10,  # CBM
            'H': 20   # Tracking No
        }
        
        for col_letter, width in column_widths.items():
            worksheet.column_dimensions[col_letter].width = width

def create_error_prone_file(filename):
    """Create a file with common errors for testing validation"""
    
    error_data = [
        {
            'A_SHIPPING_MARK': 'PM001',
            'B_DATE_RECEIPT': '25/12/2024',
            'C_DATE_LOADING': '',
            'D_DESCRIPTION': 'Valid row - should work',
            'E_QUANTITY': 5,
            'F_SPECIFICATIONS': 'N/A',
            'G_CBM': 2.5,
            'H_TRACKING_NO': 'TRK123456789'
        },
        {
            'A_SHIPPING_MARK': '',  # Missing shipping mark
            'B_DATE_RECEIPT': '26/12/2024',
            'C_DATE_LOADING': '',
            'D_DESCRIPTION': 'Missing shipping mark',
            'E_QUANTITY': 3,
            'F_SPECIFICATIONS': 'N/A',
            'G_CBM': 1.8,
            'H_TRACKING_NO': 'TRK987654321'
        },
        {
            'A_SHIPPING_MARK': 'PM002',
            'B_DATE_RECEIPT': 'invalid-date',  # Invalid date format
            'C_DATE_LOADING': '',
            'D_DESCRIPTION': 'Invalid date format',
            'E_QUANTITY': 7,
            'F_SPECIFICATIONS': 'N/A',
            'G_CBM': 3.2,
            'H_TRACKING_NO': 'TRK555666777'
        },
        {
            'A_SHIPPING_MARK': 'PM003',
            'B_DATE_RECEIPT': '27/12/2024',
            'C_DATE_LOADING': '',
            'D_DESCRIPTION': '',  # Missing description
            'E_QUANTITY': 2,
            'F_SPECIFICATIONS': 'N/A',
            'G_CBM': 1.1,
            'H_TRACKING_NO': 'TRK888999000'
        },
        {
            'A_SHIPPING_MARK': 'PM004',
            'B_DATE_RECEIPT': '28/12/2024',
            'C_DATE_LOADING': '',
            'D_DESCRIPTION': 'Missing tracking number',
            'E_QUANTITY': 12,
            'F_SPECIFICATIONS': 'N/A',
            'G_CBM': 4.5,
            'H_TRACKING_NO': ''  # Missing tracking number
        }
    ]
    
    create_excel_file(filename, error_data, include_headers=True)

def main():
    """Create all sample files"""
    
    print("Creating sample Excel files for goods received upload...")
    
    # Create output directory
    output_dir = "sample_excel_files"
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Perfect Ghana warehouse file (with headers)
    print("1. Creating Ghana warehouse sample (with headers)...")
    ghana_data = create_sample_data(num_rows=15, warehouse='Ghana')
    create_excel_file(
        os.path.join(output_dir, "ghana_goods_sample_with_headers.xlsx"), 
        ghana_data, 
        include_headers=True
    )
    
    # 2. Perfect Ghana warehouse file (without headers - production style)
    print("2. Creating Ghana warehouse sample (data only)...")
    create_excel_file(
        os.path.join(output_dir, "ghana_goods_sample_data_only.xlsx"), 
        ghana_data, 
        include_headers=False
    )
    
    # 3. Perfect China warehouse file
    print("3. Creating China warehouse sample...")
    china_data = create_sample_data(num_rows=12, warehouse='China')
    create_excel_file(
        os.path.join(output_dir, "china_goods_sample.xlsx"), 
        china_data, 
        include_headers=True
    )
    
    # 4. Small test file (5 rows)
    print("4. Creating small test file...")
    small_data = create_sample_data(num_rows=5, warehouse='Ghana')
    create_excel_file(
        os.path.join(output_dir, "small_test_file.xlsx"), 
        small_data, 
        include_headers=True
    )
    
    # 5. Error-prone file for testing validation
    print("5. Creating error-prone file for validation testing...")
    create_error_prone_file(os.path.join(output_dir, "test_validation_errors.xlsx"))
    
    # 6. Large file for performance testing
    print("6. Creating large file for performance testing...")
    large_data = create_sample_data(num_rows=100, warehouse='Ghana')
    create_excel_file(
        os.path.join(output_dir, "large_performance_test.xlsx"), 
        large_data, 
        include_headers=True
    )
    
    print(f"\n✅ All sample files created in '{output_dir}' directory!")
    print("\nFiles created:")
    print("📁 ghana_goods_sample_with_headers.xlsx - Perfect Ghana file with column headers")
    print("📁 ghana_goods_sample_data_only.xlsx - Ghana file without headers (like production data)")
    print("📁 china_goods_sample.xlsx - Perfect China warehouse file")
    print("📁 small_test_file.xlsx - Small 5-row test file")
    print("📁 test_validation_errors.xlsx - File with validation errors for testing")
    print("📁 large_performance_test.xlsx - Large 100-row file for performance testing")
    
    print("\n📋 Column Structure (A,B,C,D,E,G,H):")
    print("A: Shipping Mark/Client (Required)")
    print("B: Date of Receipt (Required, DD/MM/YYYY)")
    print("C: Date of Loading (Optional, DD/MM/YYYY)")
    print("D: Description (Required)")
    print("E: CTNS/Quantity (Required)")
    print("F: Specifications (Ignored)")
    print("G: CBM (Required)")
    print("H: Suppliers Tracking No (Required)")
    
    print("\n🚀 Ready to test! Use 'ghana_goods_sample_with_headers.xlsx' for your first test.")

if __name__ == "__main__":
    main()
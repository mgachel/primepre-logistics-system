#!/usr/bin/env python3
"""
Test script for container Excel upload functionality
"""
import os
import sys
import django
import pandas as pd
import io
from django.test import Client
from django.contrib.auth import get_user_model

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from cargo.models import CargoContainer, CargoItem
from users.models import CustomerUser

def create_test_container():
    """Create a test container"""
    container, created = CargoContainer.objects.get_or_create(
        container_id='TEST123',
        defaults={
            'cargo_type': 'sea',
            'load_date': '2025-01-01',
            'eta': '2025-01-15',
            'route': 'China to Ghana',
            'status': 'pending'
        }
    )
    return container

def create_test_excel():
    """Create a test Excel file in memory"""
    data = {
        'Shipping Mark': ['PMTEST01', 'PMTEST02'],
        'Description': ['Test Item 1', 'Test Item 2'],
        'Quantity': [5, 10],
        'CBM': [1.5, 2.5],
        'Weight (kg)': [50.0, 75.0],
        'Supplier Tracking Number': ['TRK001', 'TRK002']
    }
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Test Data', index=False)
    
    output.seek(0)
    return output

def test_container_excel_upload():
    """Test the container Excel upload functionality"""
    print("Testing Container Excel Upload...")
    
    # Create test container
    container = create_test_container()
    print(f"Created test container: {container.container_id}")
    
    # Create test Excel file
    excel_file = create_test_excel()
    print("Created test Excel file")
    
    # Create test user
    User = get_user_model()
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'user_role': 'ADMIN'
        }
    )
    print(f"Test user: {user.username}")
    
    # Test the upload using Django test client
    client = Client()
    client.force_login(user)
    
    # Prepare file for upload
    excel_file.seek(0)
    response = client.post(
        f'/api/cargo/containers/{container.container_id}/excel/upload/',
        {
            'file': excel_file
        },
        format='multipart'
    )
    
    print(f"Response status: {response.status_code}")
    print(f"Response content: {response.content.decode()}")
    
    # Check if cargo items were created
    cargo_items = CargoItem.objects.filter(container=container)
    print(f"Cargo items created: {cargo_items.count()}")
    
    for item in cargo_items:
        print(f"  - {item.client.shipping_mark}: {item.item_description} (CBM: {item.cbm})")
    
    return response.status_code == 200

if __name__ == '__main__':
    try:
        success = test_container_excel_upload()
        if success:
            print("\n Container Excel upload test PASSED")
        else:
            print("\n Container Excel upload test FAILED")
    except Exception as e:
        print(f"\n Test failed with error: {e}")
        import traceback
        traceback.print_exc()

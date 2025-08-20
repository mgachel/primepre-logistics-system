import tempfile
import pandas as pd
import io
from datetime import date, datetime
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from cargo.models import CargoContainer, CargoItem
from cargo.excel_upload_views import ExcelUploadProcessor
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from users.models import CustomerUser

User = get_user_model()


class ExcelUploadTestCase(APITestCase):
    """Test Excel upload functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            phone='+233123456789',
            email='admin@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Admin',
            user_role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create test customer
        self.customer = CustomerUser.objects.create(
            phone='+233123456789',
            first_name='John',
            last_name='Doe',
            shipping_mark='PMJOHN01',
            user_role='CUSTOMER'
        )
        
        # Create test container
        self.container = CargoContainer.objects.create(
            container_id='SEA001',
            cargo_type='sea',
            load_date=date.today(),
            eta=date.today(),
            route='Test Route',
            status='pending'
        )
    
    def create_excel_file(self, data, filename='test.xlsx'):
        """Create Excel file for testing"""
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sheet1', index=False)
        output.seek(0)
        
        # Create a file-like object that mimics uploaded file
        file_obj = io.BytesIO(output.read())
        file_obj.name = filename
        return file_obj
    
    def test_goods_received_china_upload(self):
        """Test Goods Received China Excel upload"""
        # Create test data
        data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02'],
            'Date of Receipt': ['2024-12-30', '2024-12-31'],
            'Date of Loading': ['2025-01-05', ''],
            'Description': ['Electronics components', 'Furniture items'],
            'Quantity': [10, 5],
            'Specifications': ['N/A', 'N/A'],
            'CBM': [2.5, 1.8],
            'Supplier Tracking Number': ['TRK123456789', 'TRK987654321']
        }
        
        excel_file = self.create_excel_file(data)
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('summary', response.data)
        self.assertIn('results', response.data)
        
        # Check that records were created
        china_records = GoodsReceivedChina.objects.all()
        self.assertEqual(china_records.count(), 2)
        
        # Check customer creation
        customers = CustomerUser.objects.filter(shipping_mark__in=['PMJOHN01', 'PMJANE02'])
        self.assertEqual(customers.count(), 2)
    
    def test_goods_received_ghana_upload(self):
        """Test Goods Received Ghana Excel upload"""
        data = {
            'Shipping Mark': ['PMTEST01'],
            'Date of Receipt': ['2024-12-30'],
            'Date of Loading': [''],
            'Description': ['Test items'],
            'Quantity': [3],
            'Specifications': ['N/A'],
            'CBM': [1.2],
            'Supplier Tracking Number': ['TRK999888777']
        }
        
        excel_file = self.create_excel_file(data)
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'Ghana'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that record was created in Ghana warehouse
        ghana_records = GoodsReceivedGhana.objects.all()
        self.assertEqual(ghana_records.count(), 1)
        
        record = ghana_records.first()
        self.assertEqual(record.shipping_mark, 'PMTEST01')
        self.assertEqual(record.quantity, 3)
        self.assertEqual(record.cbm, Decimal('1.2'))
    
    def test_sea_cargo_upload(self):
        """Test Sea Cargo Excel upload"""
        data = {
            'Container Ref/Number': ['SEA001', 'SEA002'],
            'Shipping Mark': ['PMJOHN01', 'PMJANE02'],
            'Date of Loading': ['2025-01-05', '2025-01-06'],
            'Description': ['Mixed electronics', 'Furniture set'],
            'Quantity': [15, 8],
            'CBM': [5.2, 3.8],
            'Supplier Tracking Number': ['TRK555666777', 'TRK888999000']
        }
        
        excel_file = self.create_excel_file(data)
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'sea_cargo'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that cargo items were created
        cargo_items = CargoItem.objects.all()
        self.assertEqual(cargo_items.count(), 2)
        
        # Check that containers were created
        containers = CargoContainer.objects.all()
        self.assertGreaterEqual(containers.count(), 2)  # At least 2 (including test setup)
    
    def test_invalid_file_type(self):
        """Test upload with invalid file type"""
        # Create a text file instead of Excel
        text_file = io.BytesIO(b"This is not an Excel file")
        text_file.name = 'test.txt'
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': text_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_missing_warehouse_location(self):
        """Test goods received upload without warehouse location"""
        data = {'Shipping Mark': ['PMTEST01']}
        excel_file = self.create_excel_file(data)
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'goods_received'
            # Missing warehouse_location
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Warehouse location is required', response.data['error'])
    
    def test_empty_file(self):
        """Test upload with empty Excel file"""
        # Create empty Excel file
        df = pd.DataFrame()
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sheet1', index=False)
        output.seek(0)
        
        file_obj = io.BytesIO(output.read())
        file_obj.name = 'empty.xlsx'
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': file_obj,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No data rows found', response.data['error'])
    
    def test_idempotency(self):
        """Test that re-uploading same file updates instead of duplicates"""
        data = {
            'Shipping Mark': ['PMTEST01'],
            'Date of Receipt': ['2024-12-30'],
            'Date of Loading': [''],
            'Description': ['Test items'],
            'Quantity': [5],
            'Specifications': ['N/A'],
            'CBM': [1.0],
            'Supplier Tracking Number': ['TRK123456']
        }
        
        excel_file = self.create_excel_file(data, 'test_idempotency.xlsx')
        
        url = reverse('cargo:excel-upload')
        
        # First upload
        response1 = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data['summary']['created'], 1)
        
        # Second upload with same data
        excel_file2 = self.create_excel_file(data, 'test_idempotency.xlsx')
        response2 = self.client.post(url, {
            'file': excel_file2,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        # Should update existing record, not create new one
        
        # Verify only one record exists
        records = GoodsReceivedChina.objects.filter(shipping_mark='PMTEST01')
        self.assertEqual(records.count(), 1)
    
    def test_invalid_dates(self):
        """Test handling of invalid date formats"""
        data = {
            'Shipping Mark': ['PMTEST01'],
            'Date of Receipt': ['invalid-date'],
            'Date of Loading': [''],
            'Description': ['Test items'],
            'Quantity': [5],
            'Specifications': ['N/A'],
            'CBM': [1.0],
            'Supplier Tracking Number': ['TRK123456']
        }
        
        excel_file = self.create_excel_file(data)
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['errors'], 1)
        
        # Check error message
        error_result = next((r for r in response.data['results'] if r['status'] == 'error'), None)
        self.assertIsNotNone(error_result)
        self.assertIn('date', error_result['message'].lower())
    
    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        data = {
            'Shipping Mark': [''],  # Empty shipping mark
            'Date of Receipt': ['2024-12-30'],
            'Date of Loading': [''],
            'Description': ['Test items'],
            'Quantity': [5],
            'Specifications': ['N/A'],
            'CBM': [1.0],
            'Supplier Tracking Number': ['TRK123456']
        }
        
        excel_file = self.create_excel_file(data)
        
        url = reverse('cargo:excel-upload')
        response = self.client.post(url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['errors'], 1)
        
        # Check error message
        error_result = next((r for r in response.data['results'] if r['status'] == 'error'), None)
        self.assertIsNotNone(error_result)
        self.assertIn('Shipping mark is required', error_result['message'])


class ExcelTemplateTestCase(APITestCase):
    """Test Excel template generation"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            phone='+233987654321',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_goods_received_template(self):
        """Test Goods Received template generation"""
        url = reverse('cargo:excel-template')
        response = self.client.get(url, {'type': 'goods_received', 'warehouse': 'China'})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertIn('goods_received_china_template.xlsx', response['Content-Disposition'])
    
    def test_sea_cargo_template(self):
        """Test Sea Cargo template generation"""
        url = reverse('cargo:excel-template')
        response = self.client.get(url, {'type': 'sea_cargo'})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        self.assertIn('sea_cargo_template.xlsx', response['Content-Disposition'])
    
    def test_invalid_template_type(self):
        """Test invalid template type"""
        url = reverse('cargo:excel-template')
        response = self.client.get(url, {'type': 'invalid_type'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid template type', response.data['error'])


class ExcelUploadProcessorTestCase(TestCase):
    """Test ExcelUploadProcessor utility class"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            phone='+233111222333',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Processor',
            user_role='ADMIN'
        )
    
    def create_mock_file(self, filename='test.xlsx'):
        """Create mock file object"""
        mock_file = MagicMock()
        mock_file.name = filename
        mock_file.size = 1024  # 1KB
        return mock_file
    
    def test_get_or_create_customer(self):
        """Test customer creation logic"""
        mock_file = self.create_mock_file()
        processor = ExcelUploadProcessor(
            file=mock_file,
            upload_type='goods_received',
            warehouse_location='China',
            uploader_user_id=self.user.id
        )
        
        # Test creating new customer
        customer = processor._get_or_create_customer('PMTEST99')
        self.assertEqual(customer.shipping_mark, 'PMTEST99')
        self.assertEqual(customer.first_name, 'TEST99')
        self.assertEqual(customer.last_name, 'Imported')
        
        # Test getting existing customer
        existing_customer = processor._get_or_create_customer('PMTEST99')
        self.assertEqual(existing_customer.id, customer.id)
    
    def test_get_or_create_container(self):
        """Test container creation logic"""
        mock_file = self.create_mock_file()
        processor = ExcelUploadProcessor(
            file=mock_file,
            upload_type='sea_cargo',
            uploader_user_id=self.user.id
        )
        
        # Test creating new container
        container = processor._get_or_create_container('TEST001')
        self.assertEqual(container.container_id, 'TEST001')
        self.assertEqual(container.cargo_type, 'sea')
        
        # Test getting existing container
        existing_container = processor._get_or_create_container('TEST001')
        self.assertEqual(existing_container.id, container.id)
    
    def test_generate_unique_key(self):
        """Test unique key generation"""
        mock_file = self.create_mock_file()
        processor = ExcelUploadProcessor(
            file=mock_file,
            upload_type='goods_received',
            warehouse_location='China',
            uploader_user_id=self.user.id
        )
        
        key1 = processor._generate_unique_key('arg1', 'arg2', 'arg3')
        key2 = processor._generate_unique_key('arg1', 'arg2', 'arg3')
        key3 = processor._generate_unique_key('arg1', 'arg2', 'different')
        
        # Same arguments should generate same key
        self.assertEqual(key1, key2)
        
        # Different arguments should generate different key
        self.assertNotEqual(key1, key3)
    
    def test_column_value_extraction(self):
        """Test column value extraction and validation"""
        mock_file = self.create_mock_file()
        processor = ExcelUploadProcessor(
            file=mock_file,
            upload_type='goods_received',
            warehouse_location='China',
            uploader_user_id=self.user.id
        )
        
        # Create mock row with sample data
        row_data = ['PMTEST01', '2024-12-30', '', 'Test description', '10', 'N/A', '2.5', 'TRK123']
        mock_row = pd.Series(row_data)
        
        # Test string extraction
        shipping_mark = processor._get_column_value(mock_row, 0, str, required=True)
        self.assertEqual(shipping_mark, 'PMTEST01')
        
        # Test date extraction
        date_receipt = processor._get_column_value(mock_row, 1, 'date', required=True)
        self.assertEqual(date_receipt, date(2024, 12, 30))
        
        # Test optional empty field
        date_loading = processor._get_column_value(mock_row, 2, 'date', required=False)
        self.assertIsNone(date_loading)
        
        # Test integer extraction
        quantity = processor._get_column_value(mock_row, 4, int, required=False, default=0)
        self.assertEqual(quantity, 10)
        
        # Test decimal extraction
        cbm = processor._get_column_value(mock_row, 6, Decimal, required=False, default=Decimal('0'))
        self.assertEqual(cbm, Decimal('2.5'))

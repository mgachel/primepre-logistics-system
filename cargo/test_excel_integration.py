"""
Integration tests for Excel upload with Customer Shipments auto-sync
"""
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

from cargo.models import CargoContainer, CargoItem
from cargo.excel_upload_views import ExcelUploadProcessor
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from users.models import CustomerUser

User = get_user_model()


class ExcelUploadIntegrationTestCase(APITestCase):
    """Test Excel upload integration with Customer Shipments"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            phone='+233123456789',
            email='admin@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Admin',
            user_role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
    
    def create_excel_file(self, data, filename='test.xlsx'):
        """Create Excel file for testing"""
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sheet1', index=False)
        output.seek(0)
        
        file_obj = io.BytesIO(output.read())
        file_obj.name = filename
        return file_obj
    
    def test_complete_workflow_goods_received_to_customer_shipments(self):
        """Test complete workflow: Excel upload → Goods Received → Customer Shipments sync"""
        
        # Step 1: Upload Goods Received (China) via Excel
        goods_data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMJOHN01'],  # Note: PMJOHN01 appears twice
            'Date of Receipt': ['2024-12-30', '2024-12-31', '2025-01-02'],
            'Date of Loading': ['2025-01-05', '', '2025-01-06'],
            'Description': ['Electronics batch 1', 'Furniture items', 'Electronics batch 2'],
            'Quantity': [10, 5, 8],
            'Specifications': ['N/A', 'N/A', 'N/A'],
            'CBM': [2.5, 1.8, 1.2],
            'Supplier Tracking Number': ['TRK123456789', 'TRK987654321', 'TRK555666777']
        }
        
        excel_file = self.create_excel_file(goods_data, 'goods_china_test.xlsx')
        
        upload_url = reverse('cargo:excel-upload')
        response = self.client.post(upload_url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['created'], 3)
        
        # Verify Goods Received records created
        china_records = GoodsReceivedChina.objects.all()
        self.assertEqual(china_records.count(), 3)
        
        # Verify customers created
        customers = CustomerUser.objects.filter(shipping_mark__in=['PMJOHN01', 'PMJANE02'])
        self.assertEqual(customers.count(), 2)
        
        # Step 2: Upload Goods Received (Ghana) for same customers
        ghana_data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02'],
            'Date of Receipt': ['2025-01-10', '2025-01-11'],
            'Date of Loading': ['', '2025-01-12'],
            'Description': ['Ghana warehouse items', 'Additional furniture'],
            'Quantity': [3, 2],
            'Specifications': ['N/A', 'N/A'],
            'CBM': [0.8, 0.6],
            'Supplier Tracking Number': ['GH001', 'GH002']
        }
        
        ghana_file = self.create_excel_file(ghana_data, 'goods_ghana_test.xlsx')
        
        response = self.client.post(upload_url, {
            'file': ghana_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'Ghana'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['created'], 2)
        
        # Verify Ghana records created
        ghana_records = GoodsReceivedGhana.objects.all()
        self.assertEqual(ghana_records.count(), 2)
        
        # Step 3: Upload Sea Cargo for same customers
        sea_cargo_data = {
            'Container Ref/Number': ['SEA001', 'SEA002', 'SEA001'],  # Note: SEA001 appears twice
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMJOHN01'],
            'Date of Loading': ['2025-01-15', '2025-01-16', '2025-01-17'],
            'Description': ['Sea freight batch 1', 'Sea furniture', 'Sea freight batch 2'],
            'Quantity': [12, 7, 5],
            'CBM': [3.0, 2.1, 1.5],
            'Supplier Tracking Number': ['SEA_TRK001', 'SEA_TRK002', 'SEA_TRK003']
        }
        
        sea_file = self.create_excel_file(sea_cargo_data, 'sea_cargo_test.xlsx')
        
        response = self.client.post(upload_url, {
            'file': sea_file,
            'upload_type': 'sea_cargo'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['created'], 3)
        
        # Verify Sea Cargo records created
        cargo_items = CargoItem.objects.all()
        self.assertEqual(cargo_items.count(), 3)
        
        # Verify containers created
        containers = CargoContainer.objects.all()
        self.assertEqual(containers.count(), 2)  # SEA001, SEA002
        
        # Step 4: Test Customer Shipments aggregation
        shipments_url = reverse('cargo:customer-shipments')
        
        # Test for PMJOHN01
        response = self.client.get(shipments_url, {'shipping_mark': 'PMJOHN01'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        shipment_data = response.data
        self.assertIn('goods_received_china', shipment_data)
        self.assertIn('goods_received_ghana', shipment_data)
        self.assertIn('sea_cargo', shipment_data)
        self.assertIn('air_cargo', shipment_data)
        
        # Verify aggregated totals for PMJOHN01
        china_total = shipment_data['goods_received_china']
        self.assertEqual(china_total['total_quantity'], 18)  # 10 + 8
        self.assertEqual(float(china_total['total_cbm']), 3.7)  # 2.5 + 1.2
        
        ghana_total = shipment_data['goods_received_ghana']
        self.assertEqual(ghana_total['total_quantity'], 3)
        self.assertEqual(float(ghana_total['total_cbm']), 0.8)
        
        sea_cargo_total = shipment_data['sea_cargo']
        self.assertEqual(sea_cargo_total['total_quantity'], 17)  # 12 + 5
        self.assertEqual(float(sea_cargo_total['total_cbm']), 4.5)  # 3.0 + 1.5
        
        # Test for PMJANE02
        response = self.client.get(shipments_url, {'shipping_mark': 'PMJANE02'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        shipment_data = response.data
        china_total = shipment_data['goods_received_china']
        self.assertEqual(china_total['total_quantity'], 5)
        self.assertEqual(float(china_total['total_cbm']), 1.8)
        
        ghana_total = shipment_data['goods_received_ghana']
        self.assertEqual(ghana_total['total_quantity'], 2)
        self.assertEqual(float(ghana_total['total_cbm']), 0.6)
        
        sea_cargo_total = shipment_data['sea_cargo']
        self.assertEqual(sea_cargo_total['total_quantity'], 7)
        self.assertEqual(float(sea_cargo_total['total_cbm']), 2.1)
    
    def test_unknown_shipping_mark_creates_customer_stub(self):
        """Test that unknown shipping marks create customer stubs automatically"""
        
        # Upload with completely new shipping marks
        data = {
            'Shipping Mark': ['PMNEW99', 'PMTEST88'],
            'Date of Receipt': ['2024-12-30', '2024-12-31'],
            'Date of Loading': ['', ''],
            'Description': ['New customer items', 'Test customer items'],
            'Quantity': [1, 2],
            'Specifications': ['N/A', 'N/A'],
            'CBM': [0.5, 0.8],
            'Supplier Tracking Number': ['NEW001', 'TEST001']
        }
        
        excel_file = self.create_excel_file(data)
        
        upload_url = reverse('cargo:excel-upload')
        response = self.client.post(upload_url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['created'], 2)
        
        # Verify customer stubs were created
        new_customer = CustomerUser.objects.get(shipping_mark='PMNEW99')
        self.assertEqual(new_customer.first_name, 'NEW99')
        self.assertEqual(new_customer.last_name, 'Imported')
        self.assertEqual(new_customer.user_role, 'CUSTOMER')
        self.assertTrue(new_customer.is_active)
        
        test_customer = CustomerUser.objects.get(shipping_mark='PMTEST88')
        self.assertEqual(test_customer.first_name, 'TEST88')
        self.assertEqual(test_customer.last_name, 'Imported')
        
        # Verify they appear in Customer Shipments
        shipments_url = reverse('cargo:customer-shipments')
        response = self.client.get(shipments_url, {'shipping_mark': 'PMNEW99'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        shipment_data = response.data
        self.assertGreater(shipment_data['goods_received_china']['total_quantity'], 0)
    
    def test_idempotent_re_upload(self):
        """Test that re-uploading same file doesn't create duplicates"""
        
        data = {
            'Shipping Mark': ['PMDUP01'],
            'Date of Receipt': ['2024-12-30'],
            'Date of Loading': [''],
            'Description': ['Duplicate test'],
            'Quantity': [5],
            'Specifications': ['N/A'],
            'CBM': [1.0],
            'Supplier Tracking Number': ['DUP001']
        }
        
        excel_file = self.create_excel_file(data, 'duplicate_test.xlsx')
        
        upload_url = reverse('cargo:excel-upload')
        
        # First upload
        response1 = self.client.post(upload_url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data['summary']['created'], 1)
        
        # Count records after first upload
        initial_count = GoodsReceivedChina.objects.count()
        
        # Second upload with same file name and data
        excel_file2 = self.create_excel_file(data, 'duplicate_test.xlsx')
        response2 = self.client.post(upload_url, {
            'file': excel_file2,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Should update existing record, not create new one
        final_count = GoodsReceivedChina.objects.count()
        self.assertEqual(final_count, initial_count)  # No increase in count
        
        # Verify Customer Shipments shows updated data
        shipments_url = reverse('cargo:customer-shipments')
        response = self.client.get(shipments_url, {'shipping_mark': 'PMDUP01'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should still show correct totals
        shipment_data = response.data
        self.assertEqual(shipment_data['goods_received_china']['total_quantity'], 5)
    
    def test_cross_module_integration(self):
        """Test that Excel uploads properly integrate with existing GoodsReceived module"""
        
        # Create some existing data in GoodsReceived manually
        existing_customer = CustomerUser.objects.create(
            phone='+233111222333',
            first_name='Existing',
            last_name='Customer',
            shipping_mark='PMEXIST01',
            user_role='CUSTOMER'
        )
        
        # Create existing record in China warehouse
        existing_record = GoodsReceivedChina.objects.create(
            customer=existing_customer,
            shipping_mark='PMEXIST01',
            supply_tracking='EXISTING001',
            cbm=Decimal('2.0'),
            quantity=10,
            description='Existing items',
            location='GUANGZHOU',
            status='PENDING'
        )
        
        # Upload Excel with same customer and additional items
        data = {
            'Shipping Mark': ['PMEXIST01', 'PMEXIST01'],
            'Date of Receipt': ['2024-12-30', '2024-12-31'],
            'Date of Loading': ['', ''],
            'Description': ['Additional items 1', 'Additional items 2'],
            'Quantity': [5, 3],
            'Specifications': ['N/A', 'N/A'],
            'CBM': [1.5, 0.8],
            'Supplier Tracking Number': ['ADD001', 'ADD002']
        }
        
        excel_file = self.create_excel_file(data)
        
        upload_url = reverse('cargo:excel-upload')
        response = self.client.post(upload_url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['created'], 2)
        
        # Verify total records for this customer
        customer_records = GoodsReceivedChina.objects.filter(shipping_mark='PMEXIST01')
        self.assertEqual(customer_records.count(), 3)  # 1 existing + 2 new
        
        # Test Customer Shipments aggregation includes all records
        shipments_url = reverse('cargo:customer-shipments')
        response = self.client.get(shipments_url, {'shipping_mark': 'PMEXIST01'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        shipment_data = response.data
        china_total = shipment_data['goods_received_china']
        self.assertEqual(china_total['total_quantity'], 18)  # 10 + 5 + 3
        self.assertEqual(float(china_total['total_cbm']), 4.3)  # 2.0 + 1.5 + 0.8


class ExcelErrorHandlingTestCase(APITestCase):
    """Test error handling in Excel uploads"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            phone='+233987654321',
            email='test@example.com',
            password='testpass123',
            first_name='Error',
            last_name='Handler',
            user_role='ADMIN'
        )
        self.client.force_authenticate(user=self.user)
    
    def create_excel_file(self, data, filename='test.xlsx'):
        """Create Excel file for testing"""
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sheet1', index=False)
        output.seek(0)
        
        file_obj = io.BytesIO(output.read())
        file_obj.name = filename
        return file_obj
    
    def test_malformed_data_handling(self):
        """Test handling of malformed data in Excel"""
        
        # Create data with various errors
        data = {
            'Shipping Mark': ['PMTEST01', '', 'PMTEST03'],  # Missing shipping mark in row 2
            'Date of Receipt': ['2024-12-30', 'invalid-date', '2024-12-31'],  # Invalid date in row 2
            'Date of Loading': ['', '', ''],
            'Description': ['Good item', 'Bad item', 'Another item'],
            'Quantity': ['10', 'not-a-number', '5'],  # Invalid quantity in row 2
            'Specifications': ['N/A', 'N/A', 'N/A'],
            'CBM': ['2.5', 'invalid-cbm', '1.8'],  # Invalid CBM in row 2
            'Supplier Tracking Number': ['TRK001', 'TRK002', 'TRK003']
        }
        
        excel_file = self.create_excel_file(data)
        
        upload_url = reverse('cargo:excel-upload')
        response = self.client.post(upload_url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should have 1 success (row 1 and 3) and 1 error (row 2)
        self.assertEqual(response.data['summary']['created'], 2)
        self.assertEqual(response.data['summary']['errors'], 1)
        
        # Check that valid rows were processed
        records = GoodsReceivedChina.objects.filter(shipping_mark__in=['PMTEST01', 'PMTEST03'])
        self.assertEqual(records.count(), 2)
        
        # Check error details
        error_results = [r for r in response.data['results'] if r['status'] == 'error']
        self.assertEqual(len(error_results), 1)
        
    def test_insufficient_columns(self):
        """Test handling of files with insufficient columns"""
        
        # Create data with only 3 columns instead of required 8
        data = {
            'Shipping Mark': ['PMTEST01'],
            'Date of Receipt': ['2024-12-30'],
            'Description': ['Test item']
            # Missing other required columns
        }
        
        excel_file = self.create_excel_file(data)
        
        upload_url = reverse('cargo:excel-upload')
        response = self.client.post(upload_url, {
            'file': excel_file,
            'upload_type': 'goods_received',
            'warehouse_location': 'China'
        }, format='multipart')
        
        # Should still process successfully using defaults for missing columns
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['created'], 1)
        
        # Verify record was created with defaults
        record = GoodsReceivedChina.objects.get(shipping_mark='PMTEST01')
        self.assertEqual(record.quantity, 0)  # Default value
        self.assertEqual(record.cbm, Decimal('0'))  # Default value

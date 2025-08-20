from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from cargo.models import CargoContainer, CargoItem, ClientShipmentSummary
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from decimal import Decimal
from datetime import date
import json
import uuid


User = get_user_model()


class CargoModuleTestCase(APITestCase):
    """Test cases for Cargo Module functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create test customer
        self.customer = User.objects.create_user(
            phone='+1234567890',
            first_name='John',
            last_name='Doe',
            user_role='CUSTOMER',
            password='testpass123'
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            phone='+1234567891',
            first_name='Admin',
            last_name='User',
            user_role='ADMIN',
            password='adminpass123'
        )
        
        # Create test containers
        self.sea_container = CargoContainer.objects.create(
            container_id='SEA001',
            cargo_type='sea',
            load_date=date.today(),
            eta=date.today(),
            route='China to Ghana',
            cbm=20.0,
            weight=1000.0
        )
        
        self.air_container = CargoContainer.objects.create(
            container_id='AIR001',
            cargo_type='air',
            load_date=date.today(),
            eta=date.today(),
            route='China to Ghana',
            cbm=5.0,
            weight=200.0
        )
    
    def test_shipping_mark_generation(self):
        """Test automatic shipping mark generation"""
        # Check that shipping mark was generated
        self.assertIsNotNone(self.customer.shipping_mark)
        self.assertTrue(self.customer.shipping_mark.startswith('PM'))
        self.assertTrue('JOHN' in self.customer.shipping_mark.upper())
        
        # Create another customer with same first name
        customer2 = User.objects.create_user(
            phone='+1234567892',
            first_name='John',
            last_name='Smith',
            user_role='CUSTOMER'
        )
        
        # Shipping marks should be unique
        self.assertNotEqual(self.customer.shipping_mark, customer2.shipping_mark)
    
    def test_container_creation(self):
        """Test container creation via API"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'container_id': 'TEST001',
            'cargo_type': 'sea',
            'load_date': '2024-12-30',
            'eta': '2025-01-15',
            'route': 'Test Route',
            'cbm': 25.0,
            'weight': 1200.0
        }
        
        response = self.client.post('/api/cargo/containers/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['container_id'], 'TEST001')
    
    def test_cargo_item_creation_with_shipping_mark(self):
        """Test adding cargo item to container using shipping mark"""
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
           'container': self.sea_container.pk,  
           'client': self.customer.pk,   
            'tracking_id': str(uuid.uuid4()),                   
           'item_description': 'Test Electronics',
           'quantity': 5,
           'cbm': 2.5,
           'weight': 100.0,
           'unit_value': 50.00,
           'total_value': 250.00,
        }
        
        response = self.client.post('/api/cargo/cargo-items/', data)
        print("Status code:", response.status_code)
        print("Response content:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that item was linked to correct customer
        item = CargoItem.objects.get(tracking_id=response.data['tracking_id'])
        self.assertEqual(item.client, self.customer)
        self.assertEqual(item.client.shipping_mark, self.customer.shipping_mark)
    
    def test_customer_shipments_view(self):
        """Test Customer Shipments Page functionality"""
        # Create test data across all categories
        
        # 1. Create cargo items
        sea_item = CargoItem.objects.create(
            container=self.sea_container,
            client=self.customer,
            item_description='Sea Electronics',
            quantity=10,
            cbm=Decimal('2.5'),
            weight=150.0
        )
        
        air_item = CargoItem.objects.create(
            container=self.air_container,
            client=self.customer,
            item_description='Air Documents',
            quantity=1,
            cbm=Decimal('0.1'),
            weight=2.0
        )
        
        # 2. Create warehouse goods
        china_goods = GoodsReceivedChina.objects.create(
            shipping_mark=self.customer.shipping_mark,
            supply_tracking='CHN123456',
            cbm=Decimal('3.0'),
            quantity=5,
            description='China Items'
        )
        
        ghana_goods = GoodsReceivedGhana.objects.create(
            shipping_mark=self.customer.shipping_mark,
            supply_tracking='GHA123456',
            cbm=Decimal('1.5'),
            quantity=3,
            description='Ghana Items'
        )
        
        # 3. Test Customer Shipments API
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/cargo/customer/shipments/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that all categories are present
        data = response.data
        self.assertIn('goods_received_china', data)
        self.assertIn('goods_received_ghana', data)
        self.assertIn('sea_cargo', data)
        self.assertIn('air_cargo', data)
        
        # Check counts
        self.assertEqual(data['goods_received_china']['count'], 1)
        self.assertEqual(data['goods_received_ghana']['count'], 1)
        self.assertEqual(data['sea_cargo']['count'], 1)
        self.assertEqual(data['air_cargo']['count'], 1)
        
        # Check customer info
        self.assertEqual(data['customer_info']['shipping_mark'], self.customer.shipping_mark)


class CargoIntegrationTestCase(TestCase):
    """Integration tests with other modules"""
    
    def setUp(self):
        self.customer = User.objects.create_user(
            phone='+1234567893',
            first_name='Jane',
            last_name='Doe',
            user_role='CUSTOMER'
        )
    
    def test_goods_to_cargo_flow(self):
        """Test flow from warehouse goods to cargo containers"""
        # 1. Goods arrive in China warehouse
        china_goods = GoodsReceivedChina.objects.create(
            shipping_mark=self.customer.shipping_mark,
            supply_tracking='FLOW123456',
            cbm=Decimal('5.0'),
            quantity=10,
            description='Flow Test Items',
            status='READY_FOR_SHIPPING'
        )
        
        # 2. Create container for shipping
        container = CargoContainer.objects.create(
            container_id='FLOW001',
            cargo_type='sea',
            load_date=date.today(),
            eta=date.today(),
            route='China to Ghana'
        )
        
        # 3. Add cargo item representing shipped goods
        cargo_item = CargoItem.objects.create(
            container=container,
            client=self.customer,
            item_description=china_goods.description,
            quantity=china_goods.quantity,
            cbm=china_goods.cbm,
            weight=200.0
        )
        
        # 4. Update warehouse goods status
        china_goods.status = 'SHIPPED'
        china_goods.save()
        
        # Verify the flow
        self.assertEqual(china_goods.status, 'SHIPPED')
        self.assertEqual(cargo_item.client.shipping_mark, self.customer.shipping_mark)
        self.assertEqual(cargo_item.quantity, china_goods.quantity)
        self.assertEqual(cargo_item.cbm, china_goods.cbm)

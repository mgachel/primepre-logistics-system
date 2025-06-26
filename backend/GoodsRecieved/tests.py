from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import GoodsReceivedChina, GoodsReceivedGhana
from .serializers import GoodsReceivedChinaSerializer, GoodsReceivedGhanaSerializer

User = get_user_model()


class GoodsReceivedChinaModelTest(TestCase):
    """Test cases for GoodsReceivedChina model"""
    
    def setUp(self):
        self.goods_data = {
            'shipping_mark': 'PMTEST01',
            'supply_tracking': 'TRK123456789',
            'cbm': Decimal('2.500'),
            'weight': Decimal('150.75'),
            'quantity': 5,
            'description': 'Test electronics',
            'location': 'GUANGZHOU',
            'supplier_name': 'Test Supplier',
            'estimated_value': Decimal('1500.00')
        }
    
    def test_create_goods(self):
        """Test creating goods entry"""
        goods = GoodsReceivedChina.objects.create(**self.goods_data)
        self.assertTrue(goods.item_id.startswith('CHN'))
        self.assertEqual(goods.status, 'PENDING')
        self.assertEqual(goods.shipping_mark, 'PMTEST01')
    
    def test_auto_generated_item_id(self):
        """Test that item_id is auto-generated"""
        goods = GoodsReceivedChina.objects.create(**self.goods_data)
        self.assertIsNotNone(goods.item_id)
        self.assertTrue(len(goods.item_id) > 10)
    
    def test_status_transitions(self):
        """Test status transition methods"""
        goods = GoodsReceivedChina.objects.create(**self.goods_data)
        
        # Test mark ready for shipping
        goods.mark_ready_for_shipping()
        self.assertEqual(goods.status, 'READY_FOR_SHIPPING')
        self.assertTrue(goods.is_ready_for_shipping)
        
        # Test flag goods
        goods.flag_goods('Missing documentation')
        self.assertEqual(goods.status, 'FLAGGED')
        self.assertTrue(goods.is_flagged)
        self.assertIn('Missing documentation', goods.notes)
        
        # Test mark shipped
        goods.mark_shipped()
        self.assertEqual(goods.status, 'SHIPPED')
    
    def test_days_in_warehouse_property(self):
        """Test days_in_warehouse calculated property"""
        goods = GoodsReceivedChina.objects.create(**self.goods_data)
        days = goods.days_in_warehouse
        self.assertIsInstance(days, int)
        self.assertGreaterEqual(days, 0)


class GoodsReceivedGhanaModelTest(TestCase):
    """Test cases for GoodsReceivedGhana model"""
    
    def setUp(self):
        self.goods_data = {
            'shipping_mark': 'PMTEST02',
            'supply_tracking': 'TRK987654321',
            'cbm': Decimal('1.200'),
            'weight': Decimal('80.50'),
            'quantity': 3,
            'description': 'Test furniture',
            'location': 'ACCRA',
            'supplier_name': 'Ghana Supplier',
            'estimated_value': Decimal('800.00')
        }
    
    def test_create_goods(self):
        """Test creating Ghana goods entry"""
        goods = GoodsReceivedGhana.objects.create(**self.goods_data)
        self.assertTrue(goods.item_id.startswith('GHA'))
        self.assertEqual(goods.status, 'PENDING')
        self.assertEqual(goods.location, 'ACCRA')


class GoodsAPITestCase(APITestCase):
    """Test cases for Goods API endpoints"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            phone='1234567890',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.client.force_authenticate(user=self.user)
        
        # Test data
        self.china_goods_data = {
            'shipping_mark': 'PMAPI01',
            'supply_tracking': 'API123456789',
            'cbm': '2.500',
            'weight': '150.75',
            'quantity': 5,
            'description': 'API test electronics',
            'location': 'GUANGZHOU',
            'supplier_name': 'API Test Supplier',
            'estimated_value': '1500.00'
        }
        
        self.ghana_goods_data = {
            'shipping_mark': 'PMAPI02',
            'supply_tracking': 'API987654321',
            'cbm': '1.200',
            'weight': '80.50',
            'quantity': 3,
            'description': 'API test furniture',
            'location': 'ACCRA',
            'supplier_name': 'Ghana API Supplier',
            'estimated_value': '800.00'
        }
    
    def test_create_china_goods(self):
        """Test creating China goods via API"""
        response = self.client.post('/api/goods/china/', self.china_goods_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['item_id'].startswith('CHN'))
        self.assertEqual(response.data['shipping_mark'], 'PMAPI01')
    
    def test_create_ghana_goods(self):
        """Test creating Ghana goods via API"""
        response = self.client.post('/api/goods/ghana/', self.ghana_goods_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['item_id'].startswith('GHA'))
        self.assertEqual(response.data['location'], 'ACCRA')
    
    def test_list_china_goods(self):
        """Test listing China goods"""
        # Create test goods
        GoodsReceivedChina.objects.create(**{
            'shipping_mark': 'PMLIST01',
            'supply_tracking': 'LIST123456789',
            'cbm': Decimal('1.000'),
            'quantity': 1,
            'location': 'GUANGZHOU'
        })
        
        response = self.client.get('/api/goods/china/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['results']), 0)
    
    def test_update_status(self):
        """Test updating goods status"""
        # Create test goods
        goods = GoodsReceivedChina.objects.create(**{
            'shipping_mark': 'PMSTATUS01',
            'supply_tracking': 'STATUS123456789',
            'cbm': Decimal('1.000'),
            'quantity': 1,
            'location': 'GUANGZHOU'
        })
        
        # Update status
        response = self.client.post(
            f'/api/goods/china/{goods.id}/update_status/',
            {'status': 'READY_FOR_SHIPPING'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status was updated
        goods.refresh_from_db()
        self.assertEqual(goods.status, 'READY_FOR_SHIPPING')
    
    def test_statistics_endpoint(self):
        """Test statistics endpoint"""
        # Create test goods with different statuses
        GoodsReceivedChina.objects.create(**{
            'shipping_mark': 'PMSTAT01',
            'supply_tracking': 'STAT123456789',
            'cbm': Decimal('1.000'),
            'quantity': 1,
            'location': 'GUANGZHOU',
            'status': 'PENDING'
        })
        
        GoodsReceivedChina.objects.create(**{
            'shipping_mark': 'PMSTAT02',
            'supply_tracking': 'STAT987654321',
            'cbm': Decimal('2.000'),
            'quantity': 2,
            'location': 'GUANGZHOU',
            'status': 'SHIPPED'
        })
        
        response = self.client.get('/api/goods/china/statistics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_items', response.data)
        self.assertIn('pending_count', response.data)
        self.assertIn('shipped_count', response.data)
    
    def test_filtering_and_search(self):
        """Test filtering and search functionality"""
        # Create test goods
        GoodsReceivedChina.objects.create(**{
            'shipping_mark': 'PMFILTER01',
            'supply_tracking': 'FILTER123456789',
            'cbm': Decimal('1.000'),
            'quantity': 1,
            'location': 'GUANGZHOU',
            'status': 'PENDING',
            'description': 'Electronics for testing'
        })
        
        # Test status filtering
        response = self.client.get('/api/goods/china/?status=PENDING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test search
        response = self.client.get('/api/goods/china/?search=electronics')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test location filtering
        response = self.client.get('/api/goods/china/?location=GUANGZHOU')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/goods/china/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SerializerTestCase(TestCase):
    """Test cases for serializers"""
    
    def test_china_goods_serializer_validation(self):
        """Test GoodsReceivedChinaSerializer validation"""
        # Valid data
        valid_data = {
            'shipping_mark': 'PMVALID01',
            'supply_tracking': 'VALID123456789',
            'cbm': '2.500',
            'quantity': 5,
            'location': 'GUANGZHOU'
        }
        
        serializer = GoodsReceivedChinaSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())
        
        # Invalid CBM (too large)
        invalid_data = valid_data.copy()
        invalid_data['cbm'] = '2000.000'
        
        serializer = GoodsReceivedChinaSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('cbm', serializer.errors)
    
    def test_weight_validation(self):
        """Test weight field validation"""
        data = {
            'shipping_mark': 'PMWEIGHT01',
            'supply_tracking': 'WEIGHT123456789',
            'cbm': '1.000',
            'quantity': 1,
            'location': 'GUANGZHOU',
            'weight': '100000.00'  # Too heavy
        }
        
        serializer = GoodsReceivedChinaSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('weight', serializer.errors)

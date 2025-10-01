from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta
from .models import DailyUpdate
from .serializer import DailyUpdateSerializer

class DailyUpdateModelTests(TestCase):
    """Test cases for DailyUpdate model"""
    
    def setUp(self):
        self.valid_data = {
            'title': 'Test Update',
            'content': 'This is a test update content',
            'priority': 'medium'
        }
    
    def test_create_daily_update(self):
        """Test creating a valid daily update"""
        update = DailyUpdate.objects.create(**self.valid_data)
        self.assertEqual(update.title, 'Test Update')
        self.assertEqual(update.priority, 'medium')
        self.assertIsNotNone(update.created_at)
        self.assertIsNotNone(update.updated_at)
    
    def test_str_representation(self):
        """Test string representation of model"""
        update = DailyUpdate.objects.create(**self.valid_data)
        expected_str = f"{update.title} ({update.get_priority_display()})"
        self.assertEqual(str(update), expected_str)
    
    def test_title_validation(self):
        """Test title length validation"""
        invalid_data = self.valid_data.copy()
        invalid_data['title'] = 'AB'  # Too short
        
        update = DailyUpdate(**invalid_data)
        with self.assertRaises(ValidationError):
            update.full_clean()
    
    def test_expires_at_validation(self):
        """Test expires_at validation"""
        invalid_data = self.valid_data.copy()
        invalid_data['expires_at'] = timezone.now() - timedelta(days=1)  # Past date
        
        update = DailyUpdate(**invalid_data)
        with self.assertRaises(ValidationError):
            update.full_clean()
    
    def test_is_expired_property(self):
        """Test is_expired property"""
        # Test non-expired update
        future_date = timezone.now() + timedelta(days=1)
        update = DailyUpdate.objects.create(expires_at=future_date, **self.valid_data)
        self.assertFalse(update.is_expired)
        
        # Test expired update
        past_date = timezone.now() - timedelta(days=1)
        expired_update = DailyUpdate.objects.create(expires_at=past_date, **self.valid_data)
        self.assertTrue(expired_update.is_expired)
        
        # Test update without expiry
        no_expiry_update = DailyUpdate.objects.create(**self.valid_data)
        self.assertFalse(no_expiry_update.is_expired)
    
    def test_days_until_expiry_property(self):
        """Test days_until_expiry property"""
        future_date = timezone.now() + timedelta(days=5)
        update = DailyUpdate.objects.create(expires_at=future_date, **self.valid_data)
        self.assertEqual(update.days_until_expiry, 5)
        
        # Test update without expiry
        no_expiry_update = DailyUpdate.objects.create(**self.valid_data)
        self.assertIsNone(no_expiry_update.days_until_expiry)

class DailyUpdateSerializerTests(TestCase):
    """Test cases for DailyUpdateSerializer"""
    
    def setUp(self):
        self.valid_data = {
            'title': 'Test Update',
            'content': 'This is a test update content',
            'priority': 'medium'
        }
    
    def test_valid_serializer(self):
        """Test serializer with valid data"""
        serializer = DailyUpdateSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
    
    def test_expires_at_validation(self):
        """Test expires_at field validation in serializer"""
        invalid_data = self.valid_data.copy()
        invalid_data['expires_at'] = timezone.now() - timedelta(days=1)
        
        serializer = DailyUpdateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('expires_at', serializer.errors)
    
    def test_default_expires_at(self):
        """Test default expires_at creation"""
        serializer = DailyUpdateSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        
        update = serializer.save()
        self.assertIsNotNone(update.expires_at)
        expected_expiry = timezone.now() + timedelta(days=7)
        self.assertAlmostEqual(
            update.expires_at, 
            expected_expiry, 
            delta=timedelta(minutes=1)
        )

class DailyUpdateAPITests(APITestCase):
    """Test cases for DailyUpdate API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.valid_data = {
            'title': 'Test Update',
            'content': 'This is a test update content',
            'priority': 'medium'
        }
        
        # Create test updates
        self.active_update = DailyUpdate.objects.create(
            title='Active Update',
            content='Active content',
            priority='high',
            expires_at=timezone.now() + timedelta(days=5)
        )
        
        self.expired_update = DailyUpdate.objects.create(
            title='Expired Update',
            content='Expired content',
            priority='low',
            expires_at=timezone.now() - timedelta(days=1)
        )
    
    def test_create_daily_update(self):
        """Test creating a daily update via API"""
        url = reverse('dailyupdate-list')
        response = self.client.post(url, self.valid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DailyUpdate.objects.count(), 3)  # 2 from setUp + 1 new
        
        created_update = DailyUpdate.objects.get(title='Test Update')
        self.assertEqual(created_update.content, 'This is a test update content')
    
    def test_list_daily_updates(self):
        """Test listing daily updates"""
        url = reverse('dailyupdate-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_daily_update(self):
        """Test retrieving a specific daily update"""
        url = reverse('dailyupdate-detail', kwargs={'pk': self.active_update.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Active Update')
    
    def test_update_daily_update(self):
        """Test updating a daily update"""
        url = reverse('dailyupdate-detail', kwargs={'pk': self.active_update.pk})
        updated_data = {'title': 'Updated Title'}
        
        response = self.client.patch(url, updated_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.active_update.refresh_from_db()
        self.assertEqual(self.active_update.title, 'Updated Title')
    
    def test_delete_daily_update(self):
        """Test deleting a daily update"""
        url = reverse('dailyupdate-detail', kwargs={'pk': self.active_update.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(DailyUpdate.objects.count(), 1)
    
    def test_search_functionality(self):
        """Test search functionality"""
        url = reverse('dailyupdate-list')
        response = self.client.get(url, {'search': 'Active'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Active Update')
    
    def test_priority_filtering(self):
        """Test filtering by priority"""
        url = reverse('dailyupdate-list')
        response = self.client.get(url, {'priority': 'high'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['priority'], 'high')
    
    def test_expired_filtering(self):
        """Test filtering by expired status"""
        url = reverse('dailyupdate-list')
        response = self.client.get(url, {'expired': 'true'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Expired Update')
    
    def test_active_endpoint(self):
        """Test active updates endpoint"""
        url = reverse('dailyupdate-active')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Active Update')
    
    def test_expired_endpoint(self):
        """Test expired updates endpoint"""
        url = reverse('dailyupdate-expired')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Expired Update')
    
    def test_by_priority_endpoint(self):
        """Test by priority endpoint"""
        url = reverse('dailyupdate-by-priority')
        response = self.client.get(url, {'priority': 'high'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_extend_expiry_endpoint(self):
        """Test extend expiry endpoint"""
        url = reverse('dailyupdate-extend-expiry', kwargs={'pk': self.active_update.pk})
        response = self.client.post(url, {'days': 3}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.active_update.refresh_from_db()
        
        # Check that expiry was extended
        expected_expiry = timezone.now() + timedelta(days=8)  # 5 original + 3 extension
        self.assertAlmostEqual(
            self.active_update.expires_at,
            expected_expiry,
            delta=timedelta(minutes=1)
        )
    
    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access the API"""
        self.client.force_authenticate(user=None)
        url = reverse('dailyupdate-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_pagination(self):
        """Test pagination functionality"""
        # Create more updates to test pagination
        for i in range(25):
            DailyUpdate.objects.create(
                title=f'Update {i}',
                content=f'Content {i}',
                priority='medium'
            )
        
        url = reverse('dailyupdate-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertEqual(len(response.data['results']), 20)  # Default page size

from django.urls import path
from .views import DailyUpdateViewSet

# Create ViewSet instance
daily_update_viewset = DailyUpdateViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

daily_update_detail = DailyUpdateViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

daily_update_active = DailyUpdateViewSet.as_view({
    'get': 'active'
})

daily_update_expired = DailyUpdateViewSet.as_view({
    'get': 'expired'
})

daily_update_extend_expiry = DailyUpdateViewSet.as_view({
    'post': 'extend_expiry'
})

urlpatterns = [
    path('', daily_update_viewset, name='daily-update-list'),
    path('<int:pk>/', daily_update_detail, name='daily-update-detail'),
    path('active/', daily_update_active, name='daily-update-active'),
    path('expired/', daily_update_expired, name='daily-update-expired'),
    path('<int:pk>/extend_expiry/', daily_update_extend_expiry, name='daily-update-extend-expiry'),
]

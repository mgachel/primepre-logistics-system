from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ShipmentsViewSet

router = DefaultRouter()
router.register(r'shipments', ShipmentsViewSet, basename='shipments')

urlpatterns = router.urls

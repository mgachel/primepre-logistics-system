from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminGeneralSettingsViewSet, InvoiceMetaSettingsViewSet, CompanyOfficeViewSet,
    WarehouseAddressViewSet, ShippingMarkFormattingRuleViewSet, ShippingMarkFormatSettingsViewSet,
    SystemSettingsViewSet, CompanySettingsViewSet, NotificationSettingsViewSet,
    DashboardSettingsView, DashboardSummaryView, InitializeSettingsView,
    AdminMessageViewSet, ClientNotificationViewSet
)

# Create router and register viewsets
router = DefaultRouter()

# New dashboard-specific settings
router.register(r'admin-general', AdminGeneralSettingsViewSet, basename='admin-general-settings')
router.register(r'invoice-meta', InvoiceMetaSettingsViewSet, basename='invoice-meta-settings')
router.register(r'company-offices', CompanyOfficeViewSet, basename='company-office')
router.register(r'warehouse-addresses', WarehouseAddressViewSet, basename='warehouse-address')
router.register(r'shipping-mark-rules', ShippingMarkFormattingRuleViewSet, basename='shipping-mark-rule')
router.register(r'shipping-mark-format', ShippingMarkFormatSettingsViewSet, basename='shipping-mark-format')

# Original system settings
router.register(r'system', SystemSettingsViewSet, basename='system-settings')
router.register(r'company', CompanySettingsViewSet, basename='company-settings')
router.register(r'notifications', NotificationSettingsViewSet, basename='notification-settings')

# Admin messaging system
router.register(r'admin-messages', AdminMessageViewSet, basename='admin-messages')
router.register(r'client-notifications', ClientNotificationViewSet, basename='client-notifications')

urlpatterns = [
    # Router URLs (direct routing without extra 'api/' prefix)
    path('', include(router.urls)),
    
    # Dashboard endpoints
    path('dashboard/', DashboardSettingsView.as_view(), name='dashboard-settings'),
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    
    # Utility endpoints
    path('initialize/', InitializeSettingsView.as_view(), name='initialize-settings'),
]
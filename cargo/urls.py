from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .customer_shipments_views import CustomerShipmentsView, CustomerShipmentStatsView, customer_shipment_tracking
from .excel_upload_views import ExcelUploadView, ExcelTemplateView, ContainerExcelUploadView, ContainerExcelTemplateView
from .container_excel_views import (
    ContainerExcelUploadView as NewContainerExcelUploadView,
    ContainerItemsCreateView,
    CustomerSearchView,
    ExpandUnmatchedGroupView,
)

# Create router for ViewSets (Admin/Staff)
router = DefaultRouter()
router.register(r'containers', views.CargoContainerViewSet, basename='container')
router.register(r'cargo-items', views.CargoItemViewSet, basename='cargo-item')
router.register(r'customers', views.CustomerUserViewSet, basename='customer')
router.register(r'client-summaries', views.ClientShipmentSummaryViewSet, basename='client-summary')

# Customer-specific router
customer_router = DefaultRouter()
customer_router.register(r'containers', views.CustomerCargoContainerViewSet, basename='customer-container')
customer_router.register(r'cargo-items', views.CustomerCargoItemViewSet, basename='customer-cargo-item')

app_name = 'cargo'

urlpatterns = [
    path('customers/search/', CustomerSearchView.as_view(), name='customer-search'),
    # Admin/Staff API routes (no api/ prefix since it's already in main urls)
    path('', include(router.urls)),
    path('dashboard/', views.CargoDashboardView.as_view(), name='dashboard'),
    path('statistics/', views.cargo_statistics, name='statistics'),
    path('bulk-upload/', views.BulkCargoItemUploadView.as_view(), name='bulk-upload'),
    
    # Customer-specific API routes
    path('customer/', include(customer_router.urls)),
    path('customer/dashboard/', views.CustomerCargoDashboardView.as_view(), name='customer-cargo-dashboard'),
    
    # Customer Shipments Page - Main feature
    path('customer/shipments/', CustomerShipmentsView.as_view(), name='customer-shipments'),
    path('customer/shipments/stats/', CustomerShipmentStatsView.as_view(), name='customer-shipments-stats'),
    path('customer/shipments/track/<str:tracking_id>/', customer_shipment_tracking, name='customer-shipment-tracking'),
    
    # Utility endpoints for shipping marks
    path('shipping-marks/', views.CustomerShippingMarkListView.as_view(), name='shipping-marks'),
    
    # Excel upload endpoints
    path('excel/upload/', ExcelUploadView.as_view(), name='excel-upload'),
    path('excel/template/', ExcelTemplateView.as_view(), name='excel-template'),
    path('excel/enhanced-upload/', views.EnhancedExcelUploadView.as_view(), name='enhanced-excel-upload'),
    path('excel/download-template/', views.ExcelTemplateDownloadView.as_view(), name='excel-download-template'),
    
    # Container-specific excel upload endpoints (NEW)
    path('containers/<str:container_id>/excel/upload-new/', NewContainerExcelUploadView.as_view(), name='container-excel-upload-new'),
    path('containers/items/create/', ContainerItemsCreateView.as_view(), name='container-items-create'),
    path('containers/unmatched-group/expand/', ExpandUnmatchedGroupView.as_view(), name='expand-unmatched-group'),
    
    # Container-specific excel upload endpoints (EXISTING)
    path('containers/<str:container_id>/excel/upload/', ContainerExcelUploadView.as_view(), name='container-excel-upload'),
    path('containers/<str:container_id>/excel/template/', ContainerExcelTemplateView.as_view(), name='container-excel-template'),
    path('excel/container-template/', ContainerExcelTemplateView.as_view(), name='container-excel-template-general'),
    
    # Template views (if needed for frontend)
    path('dashboard-template/', views.cargo_dashboard, name='cargo-dashboard-template'),
    path('sea/', views.sea_cargo_view, name='sea-cargo'),
    path('air/', views.air_cargo_view, name='air-cargo'),
]

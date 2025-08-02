from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets (Admin/Staff)
router = DefaultRouter()
router.register(r'containers', views.CargoContainerViewSet, basename='container')
router.register(r'cargo-items', views.CargoItemViewSet, basename='cargo-item')
router.register(r'customers', views.CustomerUserViewSet, basename='customer')
router.register(r'client-summaries', views.ClientShipmentSummaryViewSet, basename='client-summary')

app_name = 'cargo'

urlpatterns = [
    # Admin/Staff API routes
    path('api/', include(router.urls)),
    path('api/dashboard/', views.CargoDashboardView.as_view(), name='dashboard'),
    path('api/statistics/', views.cargo_statistics, name='statistics'),
    path('api/bulk-upload/', views.BulkCargoItemUploadView.as_view(), name='bulk-upload'),
    
    # Template views (if needed for frontend)
    path('dashboard/', views.cargo_dashboard, name='cargo-dashboard'),
    path('sea/', views.sea_cargo_view, name='sea-cargo'),
    path('air/', views.air_cargo_view, name='air-cargo'),
]

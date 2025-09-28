from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GoodsReceivedChinaViewSet, 
    GoodsReceivedGhanaViewSet,
    CustomerGoodsReceivedChinaViewSet,
    CustomerGoodsReceivedGhanaViewSet,
    CustomerDashboardView,
    GoodsReceivedContainerViewSet,
    GoodsReceivedItemViewSet,
    GhanaAirContainerViewSet,
    GhanaSeaContainerViewSet,
    ChinaAirContainerViewSet,
    ChinaSeaContainerViewSet
)

# Create router and register viewsets - UPDATED TO USE CONTAINER ARCHITECTURE
router = DefaultRouter()

# NEW: Replace old individual item endpoints with container-based endpoints
# These now return containers instead of individual items!
router.register(r'ghana/air_cargo', GhanaAirContainerViewSet, basename='ghana-air-containers')
router.register(r'ghana/sea_cargo', GhanaSeaContainerViewSet, basename='ghana-sea-containers')  
router.register(r'china/air_cargo', ChinaAirContainerViewSet, basename='china-air-containers')
router.register(r'china/sea_cargo', ChinaSeaContainerViewSet, basename='china-sea-containers')

# Legacy individual item endpoints (keep for backward compatibility)
router.register(r'china', GoodsReceivedChinaViewSet, basename='goodsreceived-china')
router.register(r'ghana', GoodsReceivedGhanaViewSet, basename='goodsreceived-ghana')

# Container and item management endpoints
container_router = DefaultRouter()
container_router.register(r'containers', GoodsReceivedContainerViewSet, basename='goodsreceived-containers')
container_router.register(r'items', GoodsReceivedItemViewSet, basename='goodsreceived-items')

# Customer-specific router
customer_router = DefaultRouter()
customer_router.register(r'china', CustomerGoodsReceivedChinaViewSet, basename='customer-china')
customer_router.register(r'ghana', CustomerGoodsReceivedGhanaViewSet, basename='customer-ghana')

# URL patterns
urlpatterns = [
    # Admin/Staff endpoints (existing individual items)
    path('', include(router.urls)),
    
    # New container-based endpoints
    path('containers/', include(container_router.urls)),
    
    # Customer-specific endpoints (new)
    path('customer/', include(customer_router.urls)),
    
    # Customer dashboard
    path('customer/dashboard/', CustomerDashboardView.as_view(), name='customer-dashboard'),
]

# This creates the following endpoints:
# 
# ========================================
# 🔥 NEW CONTAINER-BASED ENDPOINTS (REPLACING INDIVIDUAL ITEMS):
# ========================================
# Ghana Air Cargo -> NOW RETURNS CONTAINERS:
# GET    /api/goods/ghana/air_cargo/          - List Ghana air CONTAINERS (not individual items)
# POST   /api/goods/ghana/air_cargo/          - Create new Ghana air CONTAINER
# GET    /api/goods/ghana/air_cargo/{id}/     - Get specific container details + items
# GET    /api/goods/ghana/air_cargo/statistics/ - Container statistics
#
# Ghana Sea Cargo -> NOW RETURNS CONTAINERS:  
# GET    /api/goods/ghana/sea_cargo/          - List Ghana sea CONTAINERS
# POST   /api/goods/ghana/sea_cargo/          - Create new Ghana sea CONTAINER
#
# China Air Cargo -> NOW RETURNS CONTAINERS:
# GET    /api/goods/china/air_cargo/          - List China air CONTAINERS  
# POST   /api/goods/china/air_cargo/          - Create new China air CONTAINER
#
# China Sea Cargo -> NOW RETURNS CONTAINERS:
# GET    /api/goods/china/sea_cargo/          - List China sea CONTAINERS
# POST   /api/goods/china/sea_cargo/          - Create new China sea CONTAINER
#
# ========================================
# LEGACY INDIVIDUAL ITEM ENDPOINTS (backward compatibility):
# ========================================
# China Goods Endpoints:
# GET    /api/goods/china/                    - List all China goods (individual items)
# POST   /api/goods/china/                    - Create new China goods entry
# GET    /api/goods/china/{id}/               - Retrieve specific China goods
# PUT    /api/goods/china/{id}/               - Update specific China goods
# PATCH  /api/goods/china/{id}/               - Partial update China goods
# DELETE /api/goods/china/{id}/               - Delete China goods
# POST   /api/goods/china/{id}/update_status/ - Update status of specific item
# POST   /api/goods/china/bulk_status_update/ - Bulk status update
# POST   /api/goods/china/upload_excel/       - Upload Excel file for bulk create
# GET    /api/goods/china/download_template/  - Download Excel template
# GET    /api/goods/china/statistics/         - Get China warehouse statistics
# GET    /api/goods/china/flagged_items/      - Get flagged items
#
# ========================================
# NEW CONTAINER-BASED ENDPOINTS:
# ========================================
# Goods Received Container Endpoints:
# GET    /api/goods/containers/containers/                    - List all goods received containers
# POST   /api/goods/containers/containers/                    - Create new goods received container
# GET    /api/goods/containers/containers/{id}/               - Retrieve specific container
# PUT    /api/goods/containers/containers/{id}/               - Update container
# DELETE /api/goods/containers/containers/{id}/               - Delete container
# GET    /api/goods/containers/containers/{id}/items/         - Get all items in container (grouped by shipping mark)
# POST   /api/goods/containers/containers/{id}/add_item/      - Add item to container
# GET    /api/goods/containers/containers/statistics/         - Get container statistics
#
# Goods Received Item Endpoints:
# GET    /api/goods/containers/items/                         - List all goods received items
# POST   /api/goods/containers/items/                         - Create new goods received item
# GET    /api/goods/containers/items/{id}/                    - Retrieve specific item
# PUT    /api/goods/containers/items/{id}/                    - Update item
# DELETE /api/goods/containers/items/{id}/                    - Delete item
# POST   /api/goods/containers/items/{id}/update_status/      - Update item status
# POST   /api/goods/containers/items/bulk_status_update/      - Bulk status update for items
# GET    /api/goods/china/ready_for_shipping/ - Get ready for shipping items
# GET    /api/goods/china/overdue_items/      - Get overdue items
#
# Ghana Goods Endpoints:
# GET    /api/goods/ghana/                    - List all Ghana goods
# POST   /api/goods/ghana/                    - Create new Ghana goods entry
# GET    /api/goods/ghana/{id}/               - Retrieve specific Ghana goods
# PUT    /api/goods/ghana/{id}/               - Update specific Ghana goods
# PATCH  /api/goods/ghana/{id}/               - Partial update Ghana goods
# DELETE /api/goods/ghana/{id}/               - Delete Ghana goods
# POST   /api/goods/ghana/{id}/update_status/ - Update status of specific item
# POST   /api/goods/ghana/bulk_status_update/ - Bulk status update
# POST   /api/goods/ghana/upload_excel/       - Upload Excel file for bulk create
# GET    /api/goods/ghana/download_template/  - Download Excel template
# GET    /api/goods/ghana/statistics/         - Get Ghana warehouse statistics
# GET    /api/goods/ghana/flagged_items/      - Get flagged items
# GET    /api/goods/ghana/ready_for_shipping/ - Get ready for shipping items
# GET    /api/goods/ghana/overdue_items/      - Get overdue items
#
# ========================================
# CUSTOMER-SPECIFIC ENDPOINTS (new):
# ========================================
# Customer China Goods (only their own):
# GET    /api/customer/goods/china/                    - List customer's China goods only
# GET    /api/customer/goods/china/{id}/               - Get customer's specific China goods
# GET    /api/customer/goods/china/my_statistics/      - Get customer's China warehouse stats
# GET    /api/customer/goods/china/my_flagged_items/   - Get customer's flagged items
# GET    /api/customer/goods/china/ready_for_shipping/ - Get customer's ready items
# GET    /api/customer/goods/china/overdue_items/      - Get customer's overdue items
# GET    /api/customer/goods/china/tracking/{tracking_id}/ - Track by supply tracking ID
#
# Customer Ghana Goods (only their own):
# GET    /api/customer/goods/ghana/                    - List customer's Ghana goods only
# GET    /api/customer/goods/ghana/{id}/               - Get customer's specific Ghana goods
# GET    /api/customer/goods/ghana/my_statistics/      - Get customer's Ghana warehouse stats
# GET    /api/customer/goods/ghana/my_flagged_items/   - Get customer's flagged items
# GET    /api/customer/goods/ghana/ready_for_shipping/ - Get customer's ready items
# GET    /api/customer/goods/ghana/overdue_items/      - Get customer's overdue items
# GET    /api/customer/goods/ghana/tracking/{tracking_id}/ - Track by supply tracking ID
#
# Customer Dashboard:
# GET    /api/customer/dashboard/                      - Customer's unified dashboard
#
# Customer Query Parameters (filtered to their data only):
# - status: Filter by status (PENDING, READY_FOR_SHIPPING, FLAGGED, SHIPPED, CANCELLED)
# - location: Filter by warehouse location
# - supplier_name: Filter by supplier name
# - search: Search in shipping_mark, supply_tracking, item_id, description
# - ordering: Order by date_received, created_at, status, cbm, weight
# - date_from: Filter items received from this date (ISO format)
# - date_to: Filter items received until this date (ISO format)
# - days: For overdue_items endpoint, specify threshold days (default: 30)

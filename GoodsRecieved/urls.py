from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GoodsReceivedChinaViewSet, 
    GoodsReceivedGhanaViewSet,
    CustomerGoodsReceivedChinaViewSet,
    CustomerGoodsReceivedGhanaViewSet,
    CustomerDashboardView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'china', GoodsReceivedChinaViewSet, basename='goodsreceived-china')
router.register(r'ghana', GoodsReceivedGhanaViewSet, basename='goodsreceived-ghana')

# Customer-specific router
customer_router = DefaultRouter()
customer_router.register(r'china', CustomerGoodsReceivedChinaViewSet, basename='customer-china')
customer_router.register(r'ghana', CustomerGoodsReceivedGhanaViewSet, basename='customer-ghana')

# URL patterns
urlpatterns = [
    # Admin/Staff endpoints (existing)
    path('api/goods/', include(router.urls)),
    
    # Customer-specific endpoints (new)
    path('api/customer/goods/', include(customer_router.urls)),
    
    # Customer dashboard
    path('api/customer/dashboard/', CustomerDashboardView.as_view(), name='customer-dashboard'),
]

# This creates the following endpoints:
# 
# ========================================
# ADMIN/STAFF ENDPOINTS (existing):
# ========================================
# China Goods Endpoints:
# GET    /api/goods/china/                    - List all China goods
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

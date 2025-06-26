from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GoodsReceivedChinaViewSet, GoodsReceivedGhanaViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'china', GoodsReceivedChinaViewSet, basename='goodsreceived-china')
router.register(r'ghana', GoodsReceivedGhanaViewSet, basename='goodsreceived-ghana')

# URL patterns
urlpatterns = [
    path('api/goods/', include(router.urls)),
]

# This creates the following endpoints:
# 
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
# Query Parameters for filtering and searching:
# - status: Filter by status (PENDING, READY_FOR_SHIPPING, FLAGGED, SHIPPED, CANCELLED)
# - location: Filter by warehouse location
# - supplier_name: Filter by supplier name
# - search: Search in shipping_mark, supply_tracking, item_id, description
# - ordering: Order by date_received, created_at, status, cbm, weight
# - date_from: Filter items received from this date (ISO format)
# - date_to: Filter items received until this date (ISO format)
# - days: For overdue_items endpoint, specify threshold days (default: 30)

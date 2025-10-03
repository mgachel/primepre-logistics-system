from django.urls import path
from .views import (
    DailyUpdateViewSet,
    CustomerAirContainersView,
    CustomerAirGoodsReceivedView,
    CustomerSeaContainersView,
    CustomerSeaGoodsReceivedView,
    CustomerContainerDetailView,
)

daily_update_list = DailyUpdateViewSet.as_view({
    "get": "list",
    "post": "create"
})

daily_update_detail = DailyUpdateViewSet.as_view({
    "get": "retrieve", 
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy"
})

daily_update_active = DailyUpdateViewSet.as_view({
    "get": "active"
})

daily_update_expired = DailyUpdateViewSet.as_view({
    "get": "expired"
})

urlpatterns = [
    # Admin daily updates (original functionality)
    path("", daily_update_list, name="daily-update-list"),
    path("<int:pk>/", daily_update_detail, name="daily-update-detail"),
    path("active/", daily_update_active, name="daily-update-active"),
    path("expired/", daily_update_expired, name="daily-update-expired"),
    
    # Customer daily updates - Air
    path("customer/air/containers/", CustomerAirContainersView.as_view(), name="customer-air-containers"),
    path("customer/air/goods-received/", CustomerAirGoodsReceivedView.as_view(), name="customer-air-goods-received"),
    
    # Customer daily updates - Sea
    path("customer/sea/containers/", CustomerSeaContainersView.as_view(), name="customer-sea-containers"),
    path("customer/sea/goods-received/", CustomerSeaGoodsReceivedView.as_view(), name="customer-sea-goods-received"),
    
    # Customer container details with cargo items
    path("customer/container/<str:container_id>/", CustomerContainerDetailView.as_view(), name="customer-container-detail"),
]

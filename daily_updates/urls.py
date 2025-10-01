from django.urls import path
from .views import DailyUpdateViewSet

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
    path("", daily_update_list, name="daily-update-list"),
    path("<int:pk>/", daily_update_detail, name="daily-update-detail"),
    path("active/", daily_update_active, name="daily-update-active"),
    path("expired/", daily_update_expired, name="daily-update-expired"),
]

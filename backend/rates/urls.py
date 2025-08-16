from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RateViewSet

app_name = "rates"

router = DefaultRouter()
router.register(r"rates", RateViewSet, basename="rate")

urlpatterns = [
    path("", include(router.urls)),
]

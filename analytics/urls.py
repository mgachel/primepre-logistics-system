from django.urls import path
from .views import (
    TopShippersAPIView, DashboardStatsAPIView, ShippingTrendsAPIView,
    RouteAnalyticsAPIView, AnalyticsSummaryAPIView, CustomerAnalyticsAPIView
)

urlpatterns = [
    path('top-shippers/', TopShippersAPIView.as_view(), name='top_shippers'),
    path('dashboard-stats/', DashboardStatsAPIView.as_view(), name='dashboard_stats'),
    path('shipping-trends/', ShippingTrendsAPIView.as_view(), name='shipping_trends'),
    path('route-analytics/', RouteAnalyticsAPIView.as_view(), name='route_analytics'),
    path('summary/', AnalyticsSummaryAPIView.as_view(), name='analytics_summary'),
    path('customer/<int:customer_id>/', CustomerAnalyticsAPIView.as_view(), name='customer_analytics'),
    path('customer/', CustomerAnalyticsAPIView.as_view(), name='my_analytics'),
]

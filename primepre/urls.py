"""
URL configuration for primepre project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from .views import home_view
from django.http import JsonResponse

def api_test_view(request):
    return JsonResponse({"status": "API working", "endpoint": "test"})

urlpatterns = [
    path('', home_view, name='home'),  # Root URL now has a proper handler
    path('api/test/', api_test_view, name='api_test'),  # Test endpoint
    path('api/auth/', include('users.urls')),
    path('api/cargo/', include('cargo.urls')),
    path('api/shipments/', include('Shipments.urls')),
    path('api/goods/', include('GoodsRecieved.urls')),  # This will handle all /api/goods/ paths
    path('api/rates/', include('rates.urls')),  # Rates endpoints
    path('api/notes/', include('notes.urls')),
    path('api/claims/', include('claims.urls')),  # Claims endpoints
    path('api/settings/', include('settings.urls')),  # Settings endpoints
]

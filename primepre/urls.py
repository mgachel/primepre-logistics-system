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
from django.views.decorators.csrf import csrf_exempt
import traceback

def api_test_view(request):
    return JsonResponse({"status": "API working", "endpoint": "test"})

@csrf_exempt
def debug_signup_view(request):
    """Debug endpoint to test signup without full logic"""
    try:
        if request.method == 'GET':
            return JsonResponse({"status": "GET request successful", "endpoint": "debug_signup"})
        elif request.method == 'POST':
            # Try to import and test the SimplifiedSignupView
            from users.views import SimplifiedSignupView
            
            # Test data
            test_data = {
                'first_name': 'Test',
                'last_name': 'User', 
                'email': 'test@example.com',
                'phone': '+1234567890',
                'region': 'Upper West',
                'password': 'testpass123',
                'confirm_password': 'testpass123'
            }
            
            # Try to create the view and call it
            view = SimplifiedSignupView()
            
            # Import necessary modules for request simulation
            from django.test import RequestFactory
            factory = RequestFactory()
            mock_request = factory.post('/api/auth/signup/simplified/', test_data, content_type='application/json')
            
            # Try calling the view
            response = view.post(mock_request)
            
            return JsonResponse({
                "status": "POST test successful", 
                "view_response_status": response.status_code,
                "view_response_data": response.data if hasattr(response, 'data') else str(response.content)
            })
    except Exception as e:
        return JsonResponse({"error": str(e), "traceback": traceback.format_exc()}, status=200)  # Return 200 so we can see the error

urlpatterns = [
    path('', home_view, name='home'),  # Root URL now has a proper handler
    path('api/test/', api_test_view, name='api_test'),  # Test endpoint
    path('api/debug/signup/', debug_signup_view, name='debug_signup'),  # Debug signup
    path('api/auth/', include('users.urls')),
    path('api/cargo/', include('cargo.urls')),
    path('api/shipments/', include('Shipments.urls')),
    path('api/goods/', include('GoodsRecieved.urls')),  # This will handle all /api/goods/ paths
    path('api/rates/', include('rates.urls')),  # Rates endpoints
    path('api/notes/', include('notes.urls')),
    path('api/claims/', include('claims.urls')),  # Claims endpoints
    path('api/settings/', include('settings.urls')),  # Settings endpoints
]

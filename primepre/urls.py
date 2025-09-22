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
            # Test basic imports first
            try:
                from users.views import SimplifiedSignupView
                from users.models import CustomerUser
                return JsonResponse({"status": "Imports successful", "models_accessible": True})
            except Exception as import_error:
                return JsonResponse({"error": f"Import error: {str(import_error)}"})
    except Exception as e:
        return JsonResponse({"error": str(e), "traceback": traceback.format_exc()}, status=200)

@csrf_exempt
def create_superuser_view(request):
    """Temporary endpoint to create superuser - REMOVE AFTER USE"""
    try:
        if request.method == 'POST':
            from users.models import CustomerUser
            import json
            
            data = json.loads(request.body)
            username = data.get('username', 'admin')
            email = data.get('email', 'admin@primepre.com')
            password = data.get('password', 'admin123')
            
            # Check if superuser already exists
            if CustomerUser.objects.filter(email=email).exists():
                return JsonResponse({"error": "User with this email already exists"})
            
            # Create superuser
            user = CustomerUser.objects.create_user(
                email=email,
                first_name="Admin",
                last_name="User", 
                phone="+233000000000",
                region="GREATER_ACCRA",
                password=password,
                user_role="ADMIN",
                is_staff=True,
                is_superuser=True,
                is_verified=True
            )
            
            return JsonResponse({
                "success": True,
                "message": "Superuser created successfully",
                "user_id": user.id,
                "email": user.email,
                "username": username
            })
        else:
            return JsonResponse({"error": "POST method required"})
    except Exception as e:
        return JsonResponse({"error": str(e), "traceback": traceback.format_exc()}, status=500)

urlpatterns = [
    path('', home_view, name='home'),  # Root URL now has a proper handler
    path('api/test/', api_test_view, name='api_test'),  # Test endpoint
    path('api/debug/signup/', debug_signup_view, name='debug_signup'),  # Debug signup
    path('api/create-superuser/', create_superuser_view, name='create_superuser'),  # TEMPORARY - Remove after use
    path('api/auth/', include('users.urls')),
    path('api/cargo/', include('cargo.urls')),
    path('api/shipments/', include('Shipments.urls')),
    path('api/goods/', include('GoodsRecieved.urls')),  # This will handle all /api/goods/ paths
    path('api/rates/', include('rates.urls')),  # Rates endpoints
    path('api/notes/', include('notes.urls')),
    path('api/claims/', include('claims.urls')),  # Claims endpoints
    path('api/settings/', include('settings.urls')),  # Settings endpoints
]

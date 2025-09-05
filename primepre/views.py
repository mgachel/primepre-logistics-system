from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET"])
def home_view(request):
    """
    Simple home view that returns API information
    """
    return JsonResponse({
        "message": "Welcome to PrimePre Logistics API",
        "version": "1.0",
        "status": "active",
        "endpoints": {
            "admin": "/admin/",
            "django_admin": "/django-admin/",
            "auth": "/api/auth/",
            "cargo": "/api/cargo/",
            "analytics": "/api/analytics/", 
            "goods": "/api/goods/",
            "rates": "/api/rates/",
            "notes": "/api/notes/",
            "claims": "/api/claims/",
            "customer_goods": "/api/customer/goods/",
            "customer_dashboard": "/api/customer/dashboard/"
        }
    })

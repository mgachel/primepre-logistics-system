from django.urls import path
from . import views
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    # User registration endpoint
    path('register/', views.RegisterView.as_view(), name='register'),
    
    # Account verification endpoints
    path('verify/', views.verify_account, name='verify-account'),
    path('resend-verification/', views.resend_verification_code, name='resend-verification'),
    
    # Login endpoint
    path('login/', views.LoginView.as_view(), name='login'),
]
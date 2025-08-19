from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    RegisterView, LoginView, PasswordResetView, ProfileView,
    PasswordResetRequestView, PasswordResetVerifyView, PasswordResetConfirmView,
    UserViewSet, PasswordChangeView
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    
    # JWT token management
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Secure Password Reset Flow
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Deprecated endpoint (kept for backward compatibility)
    path('password-reset/', PasswordResetView.as_view(), name='password_reset_deprecated'),
    
    # Password change for authenticated users
    path('password-change/', PasswordChangeView.as_view(), name='password_change'),
    
    # Profile endpoints
    path('profile/', ProfileView.as_view(), name='profile'),
    
    # Admin endpoints (includes ViewSet routes)
    path('admin/', include(router.urls)),
]

# This creates the following admin endpoints:
# 
# User Management:
# GET    /api/auth/admin/users/                    - List all users (filtered by role)
# POST   /api/auth/admin/users/                    - Create new user/admin
# GET    /api/auth/admin/users/{id}/               - Get specific user
# PUT    /api/auth/admin/users/{id}/               - Update user
# PATCH  /api/auth/admin/users/{id}/               - Partial update user
# DELETE /api/auth/admin/users/{id}/               - Delete user
# 
# Admin Actions:
# GET    /api/auth/admin/users/statistics/         - Get user statistics
# GET    /api/auth/admin/users/admin_users/        - Get all admin users
# POST   /api/auth/admin/users/{id}/toggle_active/ - Toggle user active status
# POST   /api/auth/admin/users/{id}/reset_password/ - Reset user password
# 
# Authentication:
# POST   /api/auth/register/                       - Register new customer
# POST   /api/auth/login/                          - Login
# POST   /api/auth/password-reset/                 - Reset password (public)
# POST   /api/auth/password-change/                - Change password (authenticated)
# 
# Profile:
# GET    /api/auth/profile/                        - Get current user profile
# PUT    /api/auth/profile/                        - Update current user profile
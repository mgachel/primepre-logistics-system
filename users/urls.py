# users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)
from .views import (
    # Existing API views
    RegisterView, LoginView, PasswordResetView, ProfileView,
    PasswordResetRequestView, PasswordResetVerifyView, PasswordResetConfirmView,
    UserViewSet, PasswordChangeView, TestView,
    
    # New phone-based authentication API views
    PhoneSignupStep1View, PhoneSignupStep2View, PhoneSignupStep3View,
    PhoneSignupCompleteView, PhoneVerificationView, ResendVerificationPinView,
    PhoneForgotPasswordView, PhonePasswordResetView,
    
    # New simplified signup
    SimplifiedSignupView,
    
    # Single endpoint versions for frontend compatibility
    SingleSignupView, SinglePhoneVerificationView, SingleResendVerificationView,
    
    # Development helpers
    DevelopmentPinsView
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # ============================================================================
    # SIMPLIFIED SIGNUP (NEW - NO SMS, AUTO SHIPPING MARKS)
    # ============================================================================
    
    # New simplified signup endpoint
    path('signup/simplified/', SimplifiedSignupView.as_view(), name='simplified_signup'),

    # ============================================================================
    # SINGLE ENDPOINT AUTHENTICATION (FRONTEND COMPATIBILITY)
    # ============================================================================
    
    # Single endpoint signup and verification
    path('signup/', SingleSignupView.as_view(), name='single_signup'),
    path('verify-phone/', SinglePhoneVerificationView.as_view(), name='single_phone_verification'),
    path('resend-verification/', SingleResendVerificationView.as_view(), name='single_resend_verification'),
    
    # Development helpers (only works when DEBUG=True)
    path('dev/pins/', DevelopmentPinsView.as_view(), name='development_pins'),
    
    # ============================================================================
    # PHONE-BASED AUTHENTICATION API ENDPOINTS (MULTI-STEP)
    # ============================================================================
    
    # Multi-step signup process
    path('signup/step1/', PhoneSignupStep1View.as_view(), name='phone_signup_step1'),
    path('signup/step2/', PhoneSignupStep2View.as_view(), name='phone_signup_step2'),
    path('signup/step3/', PhoneSignupStep3View.as_view(), name='phone_signup_step3'),
    path('signup/complete/', PhoneSignupCompleteView.as_view(), name='phone_signup_complete'),
    
    # Shipping mark management
    path('shipping-marks/suggestions/', PhoneSignupStep2View.as_view(), name='shipping_mark_suggestions'),
    
    # Phone verification
    path('verify/', PhoneVerificationView.as_view(), name='phone_verification'),
    path('verify/resend/', ResendVerificationPinView.as_view(), name='resend_verification_pin'),
    
    # Phone-based password reset
    path('forgot-password/', PhoneForgotPasswordView.as_view(), name='phone_forgot_password'),
    path('reset-password/', PhonePasswordResetView.as_view(), name='phone_reset_password'),
    
    # ============================================================================
    # EXISTING API ENDPOINTS (PRESERVED)
    # ============================================================================
    
    # Legacy authentication endpoints (keep for backward compatibility)
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('test/', TestView.as_view(), name='test'),
    
    # JWT token management
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Email-based password reset flow (existing)
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

# ============================================================================
# API ENDPOINT DOCUMENTATION
# ============================================================================

# NEW PHONE-BASED AUTHENTICATION ENDPOINTS:
# 
# Multi-step Signup:
# POST   /api/auth/signup/step1/           - Basic info (name, email) + get shipping mark suggestions
# POST   /api/auth/signup/step2/           - Validate selected shipping mark
# POST   /api/auth/signup/step3/           - Validate phone & region
# POST   /api/auth/signup/complete/        - Complete signup with password + send SMS verification
# 
# Phone Verification:
# POST   /api/auth/verify/                 - Verify phone with PIN + get JWT tokens
# POST   /api/auth/verify/resend/          - Resend verification PIN
# 
# Phone Password Reset:
# POST   /api/auth/forgot-password/        - Send reset PIN to phone
# POST   /api/auth/reset-password/         - Reset password with PIN
# 
# EXISTING ENDPOINTS (PRESERVED):
# 
# Authentication:
# POST   /api/auth/register/               - Register new customer (legacy)
# POST   /api/auth/login/                  - Login with phone/password
# POST   /api/auth/test/                   - Test endpoint
# 
# JWT Management:
# POST   /api/auth/token/refresh/          - Refresh JWT token
# POST   /api/auth/token/verify/           - Verify JWT token
# 
# Email Password Reset:
# POST   /api/auth/password-reset/request/ - Request reset via email
# POST   /api/auth/password-reset/verify/  - Verify email reset code
# POST   /api/auth/password-reset/confirm/ - Confirm email reset
# 
# User Management:
# POST   /api/auth/password-change/        - Change password (authenticated)
# GET    /api/auth/profile/                - Get current user profile
# PUT    /api/auth/profile/                - Update current user profile
# 
# Admin Management:
# GET    /api/auth/admin/users/            - List all users (filtered by role)
# POST   /api/auth/admin/users/            - Create new user/admin
# GET    /api/auth/admin/users/{id}/       - Get specific user
# PUT    /api/auth/admin/users/{id}/       - Update user
# PATCH  /api/auth/admin/users/{id}/       - Partial update user
# DELETE /api/auth/admin/users/{id}/       - Delete user
# GET    /api/auth/admin/users/statistics/ - Get user statistics
# GET    /api/auth/admin/users/admin_users/ - Get all admin users
# POST   /api/auth/admin/users/{id}/toggle_active/ - Toggle user active status
# POST   /api/auth/admin/users/{id}/reset_password/ - Reset user password
# 
# Profile:
# GET    /api/auth/profile/                      - Get current user profile
# PUT    /api/auth/profile/                      - Update current user profile
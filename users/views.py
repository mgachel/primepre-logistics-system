# users/views.py
from django.shortcuts import get_object_or_404
from django.contrib.auth import authenticate
from django.contrib import messages
from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import timedelta
import logging

# Import API components
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from django.core.mail import send_mail

# Import models
from .models import CustomerUser, VerificationPin, ResetPin
from .sms_sender import send_verification_pin, send_password_reset_pin, send_welcome_message

# Import existing serializers and permissions (keep existing API functionality)
try:
    from .serializers import (
        RegisterSerializer, UserSerializer, PasswordResetRequestSerializer,
        PasswordResetCodeVerifySerializer, PasswordResetConfirmSerializer,
        AdminUserCreateSerializer, AdminUserUpdateSerializer, 
        UserStatsSerializer, PasswordResetSerializer, PasswordChangeSerializer,
        # New phone-based authentication serializers
        PhoneSignupStep1Serializer, PhoneSignupStep2Serializer, PhoneSignupStep3Serializer,
        PhoneSignupCompleteSerializer, PhoneVerificationSerializer, PhoneForgotPasswordSerializer,
        PhonePasswordResetSerializer, ResendPinSerializer,
        # New simplified signup serializer
        SimplifiedSignupSerializer
    )
    from .permissions import IsAdminUser, IsSuperAdminUser, CanManageUsers
except ImportError:
    # If serializers don't exist yet, we'll define minimal ones
    pass

logger = logging.getLogger(__name__)


# ============================================================================
# NEW API VIEWS FOR PHONE-BASED AUTHENTICATION WITH SMS
# ============================================================================

class PhoneSignupStep1View(APIView):
    """
    API Step 1: Basic Information (First name, Last name, Nickname/Company, Email)
    Generates shipping mark suggestions based on user details.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Save basic information and generate shipping mark suggestions."""
        serializer = PhoneSignupStep1Serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get validated data
        validated_data = serializer.validated_data
        
        # Generate shipping mark suggestions using all available user details
        suggestions = CustomerUser.generate_shipping_mark_suggestions(
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            company_name=validated_data.get('company_name') or validated_data.get('nickname')
        )
        
        return Response({
            'success': True,
            'message': 'Step 1 completed successfully',
            'data': {
                'user_info': {
                    'first_name': validated_data['first_name'],
                    'last_name': validated_data['last_name'],
                    'nickname': validated_data.get('nickname', ''),
                    'company_name': validated_data.get('company_name', ''),
                    'email': validated_data['email']
                },
                'shipping_mark_suggestions': suggestions
            },
            'next_step': 'step2',
            'instructions': 'Select one of the suggested shipping marks. Each shipping mark is unique and will be permanently assigned to your account.'
        }, status=status.HTTP_200_OK)


class PhoneSignupStep2View(APIView):
    """
    API Step 2: Shipping Mark Selection and Validation
    Ensures selected shipping mark is unique and reserves it for the user.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Validate and confirm shipping mark selection."""
        shipping_mark = request.data.get('shipping_mark', '').strip()
        action = request.data.get('action', 'select')  # 'select' or 'refresh'
        
        # Handle refresh suggestions request
        if action == 'refresh':
            user_info = request.data.get('user_info', {})
            first_name = user_info.get('first_name', '')
            last_name = user_info.get('last_name', '')
            company_name = user_info.get('company_name') or user_info.get('nickname', '')
            exclude_taken = request.data.get('exclude_taken', [])
            
            if not first_name or not last_name:
                return Response({
                    'success': False,
                    'error': 'User information required to generate fresh suggestions'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate fresh suggestions
            fresh_suggestions = CustomerUser.refresh_shipping_mark_suggestions(
                first_name=first_name,
                last_name=last_name, 
                company_name=company_name,
                exclude_taken=exclude_taken
            )
            
            return Response({
                'success': True,
                'message': 'Fresh shipping mark suggestions generated',
                'shipping_mark_suggestions': fresh_suggestions,
                'action': 'choose_again'
            }, status=status.HTTP_200_OK)
        
        # Handle shipping mark selection
        if not shipping_mark:
            return Response({
                'success': False,
                'error': 'Shipping mark is required',
                'message': 'Please select one of the suggested shipping marks.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate shipping mark format (must start with PM followed by space or dash)
        if not (shipping_mark.startswith('PM ') or shipping_mark.startswith('PM-')):
            return Response({
                'success': False,
                'error': 'Invalid shipping mark format',
                'message': 'Shipping mark must start with "PM " or "PM-" prefix.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for real-time uniqueness (critical for concurrency)
        if CustomerUser.objects.filter(shipping_mark=shipping_mark).exists():
            return Response({
                'success': False,
                'error': 'Shipping mark no longer available',
                'message': 'This shipping mark has been taken by another user. Please select a different one.',
                'shipping_mark_taken': shipping_mark,
                'action': 'refresh_suggestions'
            }, status=status.HTTP_409_CONFLICT)
        
        # Shipping mark is available - confirm selection
        return Response({
            'success': True,
            'message': 'Shipping mark confirmed and reserved',
            'data': {
                'shipping_mark': shipping_mark,
                'status': 'reserved',
                'note': 'This shipping mark will be permanently assigned to your account upon signup completion.'
            },
            'next_step': 'step3'
        }, status=status.HTTP_200_OK)
    
    def get(self, request):
        """Get fresh shipping mark suggestions (alternative endpoint)."""
        first_name = request.query_params.get('first_name', '')
        last_name = request.query_params.get('last_name', '')
        company_name = request.query_params.get('company_name', '')
        
        if not first_name or not last_name:
            return Response({
                'success': False,
                'error': 'First name and last name are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        suggestions = CustomerUser.generate_shipping_mark_suggestions(
            first_name=first_name,
            last_name=last_name,
            company_name=company_name
        )
        
        return Response({
            'success': True,
            'shipping_mark_suggestions': suggestions,
            'generated_at': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


class PhoneSignupStep3View(APIView):
    """
    API Step 3: Phone & Region validation
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Validate phone number and region."""
        phone = request.data.get('phone')
        region = request.data.get('region')
        
        if not phone or not region:
            return Response({
                'error': 'Phone and region are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Clean phone number
        import re
        phone_clean = re.sub(r'[^\d+]', '', phone)
        
        # Check phone uniqueness
        if CustomerUser.objects.filter(phone=phone_clean).exists():
            return Response({
                'error': 'Phone number already exists',
                'message': 'An account with this phone number already exists.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate region
        valid_regions = [choice[0] for choice in CustomerUser.REGION_CHOICES]
        if region not in valid_regions:
            return Response({
                'error': 'Invalid region',
                'valid_regions': valid_regions
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'message': 'Phone and region validated',
            'phone': phone_clean,
            'region': region,
            'next_step': 'step4'
        }, status=status.HTTP_200_OK)


class PhoneSignupCompleteView(APIView):
    """
    API Step 4: Complete signup with password and send SMS verification
    Final step ensures shipping mark uniqueness before user creation.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Create user with unique shipping mark and send verification SMS."""
        data = request.data
        
        # Validate all required fields
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'region', 'shipping_mark', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response({
                'success': False,
                'error': 'Missing required fields',
                'missing_fields': missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean and validate inputs
            import re
            phone_clean = re.sub(r'[^\d+]', '', data['phone'])
            shipping_mark = data['shipping_mark'].strip()
            
            # Critical: Use database transaction for atomicity
            from django.db import transaction
            
            with transaction.atomic():
                # Final uniqueness checks (within transaction to prevent race conditions)
                if CustomerUser.objects.filter(email=data['email']).exists():
                    return Response({
                        'success': False,
                        'error': 'Email already exists',
                        'message': 'An account with this email address already exists.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if CustomerUser.objects.filter(phone=phone_clean).exists():
                    return Response({
                        'success': False,
                        'error': 'Phone number already exists',
                        'message': 'An account with this phone number already exists.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # CRITICAL: Final shipping mark uniqueness check
                if CustomerUser.objects.filter(shipping_mark=shipping_mark).exists():
                    return Response({
                        'success': False,
                        'error': 'Shipping mark no longer available',
                        'message': 'This shipping mark has been taken by another user during signup. Please go back and select a different one.',
                        'action': 'restart_step2',
                        'shipping_mark_taken': shipping_mark
                    }, status=status.HTTP_409_CONFLICT)
                
                # Validate shipping mark format
                if not shipping_mark.startswith('PM-'):
                    return Response({
                        'success': False,
                        'error': 'Invalid shipping mark format',
                        'message': 'Shipping mark must start with "PM-" prefix.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create user with verified unique shipping mark
                user = CustomerUser.objects.create_user(
                    phone=phone_clean,
                    password=data['password'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    nickname=data.get('nickname', ''),
                    company_name=data.get('company_name', ''),
                    email=data['email'],
                    region=data['region'],
                    shipping_mark=shipping_mark,  # This is now guaranteed unique
                    is_active=True,  # Keep active but not verified
                    is_verified=False
                )
                
                # Create verification PIN
                verification_pin = VerificationPin.create_for_user(user)
                
                logger.info(f"User created successfully with unique shipping mark: {user.phone} - {shipping_mark}")
            
            # Send SMS (outside transaction - if this fails, user still exists)
            sms_result = send_verification_pin(user.phone, verification_pin.pin)
            
            response_data = {
                'success': True,
                'message': 'Account created successfully! Please verify your phone number.',
                'data': {
                    'user_id': user.id,
                    'phone': user.phone,
                    'shipping_mark': shipping_mark,
                    'shipping_mark_confirmed': True,
                    'email': user.email,
                    'full_name': user.get_full_name()
                },
                'verification': {
                    'required': True,
                    'method': 'sms',
                    'phone': user.phone,
                    'pin_expires_minutes': 10
                },
                'next_step': 'verification'
            }
            
            if sms_result['success']:
                response_data['verification']['sms_sent'] = True
                response_data['verification']['message'] = sms_result['message']
                logger.info(f"Verification PIN sent successfully to: {user.phone}")
            else:
                response_data['verification']['sms_sent'] = False
                response_data['verification']['sms_error'] = sms_result['message']
                response_data['verification']['manual_resend_available'] = True
                logger.error(f"SMS failed for user {user.phone}: {sms_result['message']}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Signup error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Signup failed',
                'message': 'An unexpected error occurred during account creation. Please try again.',
                'technical_details': str(e) if settings.DEBUG else None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PhoneVerificationView(APIView):
    """
    API: Verify phone number with PIN
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Verify PIN and activate user."""
        user_id = request.data.get('user_id')
        pin = request.data.get('pin')
        
        if not user_id or not pin:
            return Response({
                'error': 'User ID and PIN are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = CustomerUser.objects.get(id=user_id)
            verification_pin = VerificationPin.objects.filter(
                user=user, pin=pin, is_used=False
            ).first()
            
            if not verification_pin:
                return Response({
                    'error': 'Invalid verification code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not verification_pin.is_valid():
                return Response({
                    'error': 'Verification code has expired or exceeded maximum attempts'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark PIN as used and verify user
            verification_pin.mark_used()
            user.is_verified = True
            user.save(update_fields=['is_verified'])
            
            # Send welcome SMS
            send_welcome_message(user.phone, user.get_full_name())
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"User verified: {user.phone}")
            
            return Response({
                'message': 'Phone verified successfully',
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_200_OK)
            
        except CustomerUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Verification error: {str(e)}")
            return Response({
                'error': 'Verification failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResendVerificationPinView(APIView):
    """
    API: Resend verification PIN
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Resend verification PIN with rate limiting."""
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({
                'error': 'User ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = CustomerUser.objects.get(id=user_id, is_verified=False)
            
            # Check rate limiting (allow resend only every 60 seconds)
            last_pin = VerificationPin.objects.filter(user=user).order_by('-created_at').first()
            if last_pin and (timezone.now() - last_pin.created_at).seconds < 60:
                return Response({
                    'error': 'Rate limited',
                    'message': 'Please wait before requesting another code'
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Create new PIN
            verification_pin = VerificationPin.create_for_user(user)
            
            # Send SMS
            sms_result = send_verification_pin(user.phone, verification_pin.pin)
            
            if sms_result['success']:
                logger.info(f"Verification PIN resent to: {user.phone}")
                return Response({
                    'message': 'Verification code sent successfully'
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Failed to resend PIN to {user.phone}: {sms_result['message']}")
                return Response({
                    'error': 'SMS failed',
                    'message': sms_result['message']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except CustomerUser.DoesNotExist:
            return Response({
                'error': 'User not found or already verified'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Resend PIN error: {str(e)}")
            return Response({
                'error': 'Resend failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PhoneForgotPasswordView(APIView):
    """
    API: Reset password to default "PrimeMade" for any verified customer
    No SMS needed - instant password reset for simplicity
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Reset password to 'PrimeMade' immediately."""
        phone = request.data.get('phone')
        
        if not phone:
            return Response({
                'error': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean phone number
            import re
            phone_clean = re.sub(r'[^\d+]', '', phone)
            
            # Find user - must be verified
            user = CustomerUser.objects.get(phone=phone_clean, is_verified=True)
            
            # Reset password to "PrimeMade" immediately
            user.set_password('PrimeMade')
            user.save()
            
            logger.info(f"Password reset to 'PrimeMade' for user: {user.phone}")
            
            return Response({
                'success': True,
                'message': 'Your password has been reset to "PrimeMade". You can now login and change it.',
                'phone': user.phone
            }, status=status.HTTP_200_OK)
            
        except CustomerUser.DoesNotExist:
            # Don't reveal if phone exists - always return success for security
            return Response({
                'success': True,
                'message': 'If this phone number exists and is verified, the password has been reset to "PrimeMade".'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Forgot password error: {str(e)}")
            return Response({
                'error': 'Request failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PhonePasswordResetView(APIView):
    """
    API: Complete password reset with PIN and new password
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Reset password with PIN verification."""
        user_id = request.data.get('user_id')
        pin = request.data.get('pin')
        new_password = request.data.get('new_password')
        
        if not all([user_id, pin, new_password]):
            return Response({
                'error': 'User ID, PIN, and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = CustomerUser.objects.get(id=user_id)
            reset_pin = ResetPin.objects.filter(
                user=user, pin=pin, is_used=False
            ).first()
            
            if not reset_pin:
                return Response({
                    'error': 'Invalid reset code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not reset_pin.is_valid():
                return Response({
                    'error': 'Reset code has expired or exceeded maximum attempts'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate password strength (basic validation)
            if len(new_password) < 8:
                return Response({
                    'error': 'Password must be at least 8 characters long'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark PIN as used and reset password
            reset_pin.mark_used()
            user.set_password(new_password)
            user.save(update_fields=['password'])
            
            logger.info(f"Password reset completed for user: {user.phone}")
            
            return Response({
                'message': 'Password reset successfully'
            }, status=status.HTTP_200_OK)
            
        except CustomerUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            return Response({
                'error': 'Password reset failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# SIMPLIFIED SIGNUP API (NO SMS VERIFICATION, AUTO-GENERATED SHIPPING MARKS)
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class SimplifiedSignupView(APIView):
    """
    New simplified signup endpoint that:
    1. Collects basic user info + region selection
    2. Auto-generates shipping mark based on settings
    3. Creates user immediately (no SMS verification)
    4. Returns login tokens
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable all authentication including session auth
    
    def post(self, request):
        """Create user with auto-generated shipping mark."""
        data = request.data
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'region', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response({
                'success': False,
                'error': 'Missing required fields',
                'missing_fields': missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean and validate inputs
            import re
            phone_clean = re.sub(r'[^\d+]', '', data['phone'])
            
            # Use database transaction for atomicity
            from django.db import transaction
            
            with transaction.atomic():
                # Check for existing email and phone
                if CustomerUser.objects.filter(email=data['email']).exists():
                    return Response({
                        'success': False,
                        'error': 'Email already exists',
                        'message': 'An account with this email address already exists.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if CustomerUser.objects.filter(phone=phone_clean).exists():
                    return Response({
                        'success': False,
                        'error': 'Phone number already exists',
                        'message': 'An account with this phone number already exists.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate region
                valid_regions = [choice[0] for choice in CustomerUser.REGION_CHOICES]
                if data['region'] not in valid_regions:
                    return Response({
                        'success': False,
                        'error': 'Invalid region',
                        'valid_regions': valid_regions
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create user with auto-generated shipping mark
                user = CustomerUser.objects.create_user(
                    phone=phone_clean,
                    password=data['password'],
                    first_name=data['first_name'].strip(),
                    last_name=data['last_name'].strip(),
                    email=data['email'].strip().lower(),
                    region=data['region'],
                    nickname=data.get('nickname', '').strip(),
                    company_name=data.get('company_name', '').strip(),
                    user_type=data.get('user_type', 'INDIVIDUAL'),
                    is_verified=True  # Auto-verify without SMS
                )
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                access_token = refresh.access_token
                
                return Response({
                    'success': True,
                    'message': 'Account created successfully',
                    'data': {
                        'user': {
                            'id': user.id,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'email': user.email,
                            'phone': user.phone,
                            'region': user.region,
                            'shipping_mark': user.shipping_mark,  # Auto-generated
                            'user_role': user.user_role,
                            'user_type': user.user_type,
                            'is_verified': user.is_verified
                        },
                        'tokens': {
                            'access': str(access_token),
                            'refresh': str(refresh)
                        }
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Simplified signup error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Account creation failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# SHIPPING MARK GENERATION AND SELECTION API
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class GenerateShippingMarksView(APIView):
    """
    Generate 4 unique shipping mark suggestions based on user's name and region.
    Uses regional prefix rules set by admin and enforces length constraints (10-20 chars).
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        """Generate shipping mark suggestions."""
        data = request.data
        
        logger.info("=" * 80)
        logger.info("GENERATING SHIPPING MARKS WITH 10-20 CHARACTER LENGTH REQUIREMENT")
        logger.info("=" * 80)
        
        # Validate required fields
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        region = data.get('region', '').strip()
        
        if not first_name or not last_name:
            return Response({
                'success': False,
                'error': 'First name and last name are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from settings.models import ShippingMarkFormattingRule, ShippingMarkFormatSettings
            import random
            import hashlib
            
            company_name = data.get('company_name', '').strip()
            
            # Use hardcoded length constraints (10-20 characters)
            # These override any database settings to ensure consistency
            min_length = 10
            max_length = 20
            
            logger.info(f"Length constraints: MIN={min_length}, MAX={max_length}")
            
            # Get applicable rule for region (Ghana regions)
            rule = ShippingMarkFormattingRule.get_rule_for_client(country='Ghana', region=region)
            logger.info(f"Using rule: {rule.rule_name if rule else 'No rule (default format)'}")
            
            # Get additional identifiers
            company_name = data.get('company_name', '').strip()
            nickname = data.get('nickname', '').strip()
            email = data.get('email', '').strip()
            
            # Extract email username if email provided
            email_username = email.split('@')[0] if email and '@' in email else ''
            
            # Generate name combinations
            seed = f"{first_name}{last_name}{company_name}{nickname}"
            random.seed(hashlib.md5(seed.encode()).hexdigest())
            
            first_upper = first_name.upper()
            last_upper = last_name.upper()
            
            # Clean and prepare additional identifiers
            company_clean = ''.join(c.upper() for c in company_name if c.isalnum()) if company_name else ''
            nickname_clean = ''.join(c.upper() for c in nickname if c.isalnum()) if nickname else ''
            email_clean = ''.join(c.upper() for c in email_username if c.isalnum()) if email_username else ''
            
            # Generate various combinations with different sources
            name_combinations = []
            
            # Primary: First + Last name combinations (various lengths)
            if len(first_upper) >= 2 and len(last_upper) >= 2:
                name_combinations.extend([
                    f"{first_upper[:3]}{last_upper[:3]}",      # JOHDOE (6 chars)
                    f"{first_upper[:4]}{last_upper[:3]}",      # JOHNDOE (7 chars)
                    f"{first_upper[:4]}{last_upper[:4]}",      # JOHNDOES (8 chars)
                    f"{first_upper[:5]}{last_upper[:3]}",      # JOHNDOE (8 chars)
                    f"{first_upper}{last_upper[:4]}",          # JOHNDOES (full first + 4 last)
                ])
            
            # Add company-based combinations (use company to extend name)
            if company_clean and len(company_clean) >= 3:
                name_combinations.extend([
                    f"{first_upper[:3]}{company_clean[:4]}",   # JOHABC (7 chars)
                    f"{last_upper[:3]}{company_clean[:4]}",    # DOEABC (7 chars)
                    f"{first_upper[:2]}{last_upper[:2]}{company_clean[:3]}",  # JODOABC (7 chars)
                    f"{company_clean[:5]}{first_upper[:2]}",   # ABCORJO (7 chars)
                    f"{company_clean}",                         # Full company name
                ])
            
            # Add nickname-based combinations
            if nickname_clean and len(nickname_clean) >= 2:
                name_combinations.extend([
                    f"{nickname_clean[:4]}{last_upper[:3]}",   # NICKDOE (7 chars)
                    f"{nickname_clean}{last_upper[:3]}",       # NICKNAMEDOE
                    f"{first_upper[:3]}{nickname_clean[:4]}",  # JOHNICK (7 chars)
                ])
            
            # Add email-based combinations (if no company/nickname)
            if email_clean and len(email_clean) >= 3 and not company_clean and not nickname_clean:
                name_combinations.extend([
                    f"{first_upper[:3]}{email_clean[:4]}",     # JOHJDOE (7 chars)
                    f"{last_upper[:3]}{email_clean[:4]}",      # DOEJDOE (7 chars)
                    f"{email_clean[:5]}{last_upper[:2]}",      # JDOE9DO (7 chars)
                ])
            
            # Ensure we have at least some combinations
            if not name_combinations:
                name_combinations = [
                    f"{first_upper}{last_upper}",
                    f"{first_upper[:4]}{last_upper[:4]}",
                    'USER'
                ]
            
            suggestions = []
            attempted = set()
            
            logger.info(f"Name combinations to try: {name_combinations}")
            
            # Generate suggestions using rule or default format
            for name_combo in name_combinations:
                if len(suggestions) >= 4:
                    break
                
                if rule:
                    # Use the explicit rule prefix and name to avoid cases where the
                    # format_template concatenates prefix and name without a separator.
                    # This ensures we always produce: PM{prefix} <name>
                    try:
                        prefix_val = str(rule.prefix_value).upper()
                    except Exception:
                        prefix_val = str(getattr(rule, 'prefix_value', '')).upper()
                    base_mark = f"PM{prefix_val} {name_combo}".strip()
                else:
                    # Default format
                    base_mark = f"PM {name_combo}"
                
                # Normalize whitespace and ensure the format PM{prefix} + space + rest.
                # We must not consume the entire name when extracting the prefix, so use
                # a regex that captures PM, an optional alphanumeric prefix, then the rest.
                import re
                base_mark = ' '.join(base_mark.split())
                m = re.match(r'^(PM)([A-Z0-9]*)(?:\s*)(.*)$', base_mark, re.IGNORECASE)
                if m:
                    pm = m.group(1).upper()
                    prefix = (m.group(2) or '').upper()
                    rest = (m.group(3) or '').strip()
                    if prefix:
                        base_mark = f"{pm}{prefix} {rest}" if rest else f"{pm}{prefix}"
                    else:
                        base_mark = f"{pm} {rest}" if rest else pm
                original_mark = base_mark
                
                # Ensure length constraints (10-20 characters)
                current_length = len(base_mark)
                logger.info(f"Processing: '{base_mark}' (length: {current_length})")
                
                if current_length < min_length:
                    # Extend with meaningful text instead of random numbers
                    padding_needed = min_length - current_length
                    
                    # Try to use company, nickname, email, or last name as extension
                    extension_sources = []
                    if company_clean and len(company_clean) >= padding_needed:
                        extension_sources.append(company_clean)
                    if nickname_clean and len(nickname_clean) >= padding_needed:
                        extension_sources.append(nickname_clean)
                    if email_clean and len(email_clean) >= padding_needed:
                        extension_sources.append(email_clean)
                    if len(last_upper) >= padding_needed:
                        extension_sources.append(last_upper)
                    if len(first_upper) >= padding_needed:
                        extension_sources.append(first_upper)
                    
                    if extension_sources:
                        # Use the first available source
                        extension = extension_sources[0][:padding_needed]
                        base_mark = base_mark + extension
                        logger.info(f"  -> Extended to '{base_mark}' (added '{extension}')")
                    else:
                        # Last resort: use combination of available text
                        available_text = (company_clean + nickname_clean + email_clean + last_upper + first_upper)
                        if len(available_text) >= padding_needed:
                            extension = available_text[:padding_needed]
                            base_mark = base_mark + extension
                            logger.info(f"  -> Extended to '{base_mark}' (added '{extension}')")
                        else:
                            # If still not enough, repeat the name
                            extension = (first_upper + last_upper) * 2
                            base_mark = base_mark + extension[:padding_needed]
                            logger.info(f"  -> Extended to '{base_mark}' (repeated name)")
                
                elif current_length > max_length:
                    # Truncate to maximum length
                    base_mark = base_mark[:max_length]
                    logger.info(f"  -> Truncated to '{base_mark}' (max {max_length})")
                
                # Final validation: must be between min_length and max_length
                final_length = len(base_mark)
                logger.info(f"  -> Final: '{base_mark}' (length: {final_length}, valid: {min_length <= final_length <= max_length})")
                
                if min_length <= len(base_mark) <= max_length:
                    # Check uniqueness (case-insensitive)
                    if base_mark not in attempted:
                        # Check database for exact match (case-insensitive)
                        is_unique = not CustomerUser.objects.filter(
                            shipping_mark__iexact=base_mark
                        ).exists()
                        
                        if is_unique:
                            # Also check if the name portion (after PM prefix) already exists
                            # Extract the name portion (everything after "PM" + optional digits + space)
                            import re
                            name_match = re.search(r'^PM\d*\s*(.+)$', base_mark)
                            if name_match:
                                name_portion = name_match.group(1).strip()
                                
                                # Check if any shipping mark ends with this name portion
                                # This prevents "PM1 JOHDOE" and "PM6 JOHDOE" both being suggested
                                similar_exists = CustomerUser.objects.filter(
                                    shipping_mark__iregex=r'PM\d*\s*' + re.escape(name_portion) + r'$'
                                ).exists()
                                
                                if similar_exists:
                                    logger.info(f"  -> Skipped (name portion '{name_portion}' already exists with different prefix)")
                                    is_unique = False
                        
                        if is_unique:
                            suggestions.append(base_mark)
                            attempted.add(base_mark)
                            logger.info(f"  -> ✓ ADDED to suggestions")
                        elif not is_unique:
                            logger.info(f"  -> Skipped (already exists in database)")
            
            # If we don't have 4 suggestions, create variations with extensions
            variation_index = 0
            extension_pool = [company_clean, nickname_clean, email_clean, first_upper, last_upper]
            extension_pool = [e for e in extension_pool if e and len(e) >= 2]  # Filter valid extensions
            
            while len(suggestions) < 4 and variation_index < 100:
                random_combo = random.choice(name_combinations) if name_combinations else "USER"
                
                # Add an extension from the pool
                if extension_pool:
                    extension_source = extension_pool[variation_index % len(extension_pool)]
                    extended_combo = f"{random_combo}{extension_source[:3]}"
                else:
                    extended_combo = random_combo
                
                if rule:
                    # Use explicit prefix value to ensure 'PM{prefix} <rest>' formatting
                    try:
                        prefix_val = str(rule.prefix_value).upper()
                    except Exception:
                        prefix_val = str(getattr(rule, 'prefix_value', '')).upper()
                    base_mark = f"PM{prefix_val} {extended_combo}".strip()
                else:
                    base_mark = f"PM {extended_combo}"
                
                # Normalize whitespace and ensure the format PM{prefix} + space + rest.
                import re
                base_mark = ' '.join(base_mark.split())
                m = re.match(r'^(PM)([A-Z0-9]*)(?:\s*)(.*)$', base_mark, re.IGNORECASE)
                if m:
                    pm = m.group(1).upper()
                    prefix = (m.group(2) or '').upper()
                    rest = (m.group(3) or '').strip()
                    if prefix:
                        base_mark = f"{pm}{prefix} {rest}" if rest else f"{pm}{prefix}"
                    else:
                        base_mark = f"{pm} {rest}" if rest else pm
                
                # Apply length constraints (10-20 characters)
                current_len = len(base_mark)
                if current_len < min_length:
                    # Extend with meaningful text
                    padding_needed = min_length - current_len
                    if extension_pool:
                        ext = extension_pool[variation_index % len(extension_pool)]
                        base_mark += ext[:padding_needed]
                    else:
                        base_mark += (first_upper + last_upper)[:padding_needed]
                elif current_len > max_length:
                    base_mark = base_mark[:max_length]
                
                # Validate length and uniqueness (case-insensitive check)
                if min_length <= len(base_mark) <= max_length:
                    # Check if not already in our attempted list
                    if base_mark not in attempted:
                        # Double-check uniqueness in database (case-insensitive)
                        is_unique = not CustomerUser.objects.filter(
                            shipping_mark__iexact=base_mark
                        ).exists()
                        
                        if is_unique:
                            # Check name portion uniqueness
                            import re
                            name_match = re.search(r'^PM\d*\s*(.+)$', base_mark)
                            if name_match:
                                name_portion = name_match.group(1).strip()
                                similar_exists = CustomerUser.objects.filter(
                                    shipping_mark__iregex=r'PM\d*\s*' + re.escape(name_portion) + r'$'
                                ).exists()
                                
                                if similar_exists:
                                    logger.info(f"  -> Skipped (name portion '{name_portion}' exists): '{base_mark}'")
                                    is_unique = False
                        
                        if is_unique:
                            suggestions.append(base_mark)
                            attempted.add(base_mark)
                            logger.info(f"  -> Added unique variation: '{base_mark}'")
                        else:
                            logger.info(f"  -> Skipped (exists in DB): '{base_mark}'")
                
                variation_index += 1
            
            # Final verification: Ensure all suggestions are truly unique in database
            verified_suggestions = []
            for mark in suggestions[:4]:
                if not CustomerUser.objects.filter(shipping_mark__iexact=mark).exists():
                    verified_suggestions.append(mark)
                else:
                    logger.warning(f"Final check: Removed duplicate '{mark}' from suggestions")
            
            # If we lost suggestions due to duplicates, log it
            if len(verified_suggestions) < 4:
                logger.warning(f"Only {len(verified_suggestions)} unique suggestions generated (needed 4)")
            
            return Response({
                'success': True,
                'suggestions': verified_suggestions,
                'message': 'Shipping mark suggestions generated successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating shipping marks: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'error': 'Failed to generate shipping marks',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class SignupWithShippingMarkView(APIView):
    """
    Complete signup with user-selected shipping mark.
    This is the final step after user selects their shipping mark.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        """Create user with selected shipping mark."""
        data = request.data
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'region', 'password', 'shipping_mark']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response({
                'success': False,
                'error': 'Missing required fields',
                'missing_fields': missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean and validate inputs
            import re
            phone_clean = re.sub(r'[^\d+]', '', data['phone'])
            shipping_mark = data['shipping_mark'].strip()
            
            # Use database transaction for atomicity
            from django.db import transaction
            
            with transaction.atomic():
                # Check for existing email and phone
                if CustomerUser.objects.filter(email=data['email']).exists():
                    return Response({
                        'success': False,
                        'error': 'Email already exists',
                        'message': 'An account with this email address already exists.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if CustomerUser.objects.filter(phone=phone_clean).exists():
                    return Response({
                        'success': False,
                        'error': 'Phone number already exists',
                        'message': 'An account with this phone number already exists.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if shipping mark is still available
                if CustomerUser.objects.filter(shipping_mark=shipping_mark).exists():
                    return Response({
                        'success': False,
                        'error': 'shipping_mark_taken',
                        'message': 'This shipping mark was just taken. Please select another one.'
                    }, status=status.HTTP_409_CONFLICT)
                
                # Validate region
                valid_regions = [choice[0] for choice in CustomerUser.REGION_CHOICES]
                if data['region'] not in valid_regions:
                    return Response({
                        'success': False,
                        'error': 'Invalid region',
                        'valid_regions': valid_regions
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate shipping mark format (must start with PM followed by optional alphanumeric prefix)
                # Accept formats: "PM ", "PM-", "PM 1 ", "PM GA ", "PM NR ", "PMX4E ", "PM16 ", etc.
                import re
                # Pattern: PM followed by optional alphanumeric prefix, then space and name
                if not re.match(r'^PM\s*[A-Z0-9]*\s+[A-Z]', shipping_mark):
                    return Response({
                        'success': False,
                        'error': 'Invalid shipping mark format',
                        'message': f'Shipping mark must start with "PM" optionally followed by a regional prefix (letters or numbers), then a space and name. Got: {shipping_mark}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create user with selected shipping mark
                user = CustomerUser.objects.create_user(
                    phone=phone_clean,
                    password=data['password'],
                    first_name=data['first_name'].strip(),
                    last_name=data['last_name'].strip(),
                    email=data['email'].strip().lower(),
                    region=data['region'],
                    nickname=data.get('nickname', '').strip(),
                    company_name=data.get('company_name', '').strip(),
                    user_type=data.get('user_type', 'INDIVIDUAL'),
                    shipping_mark=shipping_mark,  # Use user-selected shipping mark
                    is_verified=True  # Auto-verify without SMS
                )
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                access_token = refresh.access_token
                
                logger.info(f"User created with selected shipping mark: {user.phone} - {shipping_mark}")
                
                return Response({
                    'success': True,
                    'message': 'Account created successfully',
                    'data': {
                        'user': {
                            'id': user.id,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'email': user.email,
                            'phone': user.phone,
                            'region': user.region,
                            'shipping_mark': user.shipping_mark,
                            'user_role': user.user_role,
                            'user_type': user.user_type,
                            'is_verified': user.is_verified
                        },
                        'tokens': {
                            'access': str(access_token),
                            'refresh': str(refresh)
                        }
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Signup with shipping mark error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Account creation failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# EXISTING API VIEWS (PRESERVED AND UPDATED)
# ============================================================================

class TestView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"message": "Test endpoint is working!"}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            logger.info(f"User registered: {user.phone}")
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """
    Login endpoint that accepts phone number/username and password.
    Supports both regular users and Django superusers.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # Disable all authentication including session auth

    def post(self, request):
        phone_or_username = request.data.get('phone')  # Can be phone or username
        password = request.data.get('password')
        
        if not phone_or_username or not password:
            return Response({
                'success': False,
                'error': 'Phone number/username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = None
        
        # Try phone-based authentication first
        user = authenticate(request, phone=phone_or_username, password=password)
        
        # If phone auth fails, try username authentication for superusers
        if user is None:
            from django.contrib.auth import authenticate as django_authenticate
            user = django_authenticate(request, username=phone_or_username, password=password)
        
        if user is None:
            logger.warning(f"Failed login attempt for: {phone_or_username}")
            return Response({
                'success': False,
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Check if account is active
        if not user.is_active:
            return Response({
                'success': False,
                'error': 'Your account has been disabled. Please contact support.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Enforce that this endpoint is for customer logins only.
        # Allow all users (both admin and customer) to log in through this endpoint
        # Role-based routing is handled on the frontend
        
        # For regular customer users, check verification status
        if hasattr(user, 'is_verified') and not user.is_verified and not user.is_superuser:
            return Response({
                'success': False,
                'error': 'Please verify your phone number before logging in.',
                'verification_required': True,
                'phone': getattr(user, 'phone', '')
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Update last login IP if field exists
        if hasattr(user, 'last_login_ip'):
            user.last_login_ip = self.get_client_ip(request)
            user.save(update_fields=['last_login_ip'])
        
        # Log successful authentication (for debugging password changes)
        logger.info(f"User logged in successfully with password check: {phone_or_username}")
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Prepare user data with safe field access
        user_data = {
            'id': user.id,
            'username': getattr(user, 'username', ''),
            'email': getattr(user, 'email', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'is_staff': getattr(user, 'is_staff', False),
            'is_superuser': getattr(user, 'is_superuser', False),
            'is_active': getattr(user, 'is_active', True),
            'date_joined': getattr(user, 'date_joined', timezone.now()).isoformat(),
        }
        
        # Add custom fields if they exist (for CustomerUser)
        if hasattr(user, 'phone'):
            # Include legacy `user_role` for compatibility, and canonical `roles` list
            roles = getattr(user, 'roles', None)
            if not roles:
                roles = [getattr(user, 'user_role', 'CUSTOMER')]

            user_data.update({
                'phone': user.phone,
                'company_name': getattr(user, 'company_name', ''),
                'shipping_mark': getattr(user, 'shipping_mark', ''),
                'region': getattr(user, 'region', ''),
                'user_role': getattr(user, 'user_role', 'CUSTOMER'),
                'roles': roles,
                'user_type': getattr(user, 'user_type', 'INDIVIDUAL'),
                'is_verified': getattr(user, 'is_verified', True),
            })
        
        # Prepare response with dashboard redirect info
        full_name = f"{user_data['first_name']} {user_data['last_name']}".strip()
        if not full_name:
            full_name = user_data.get('username', 'User')
        
        # Determine dashboard redirect URL based on user role
        user_role = user_data.get('user_role', 'CUSTOMER')
        is_admin_user = user.is_superuser or user_role in ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN']
        
        # Set appropriate dashboard URL and welcome message
        if is_admin_user:
            dashboard_url = '/'  # Admin dashboard (handled by RoleBasedRoute)
            welcome_message = f'Welcome to your admin dashboard, {user_data["first_name"] or "Admin"}!'
        else:
            dashboard_url = '/'  # Customer dashboard (handled by RoleBasedRoute)
            welcome_message = f'Welcome to your customer dashboard, {user_data["first_name"] or "Customer"}!'
        
        response_data = {
            'success': True,
            'message': f'Welcome back, {full_name}!',
            'user': user_data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            },
            'dashboard': {
                'redirect_url': dashboard_url,
                'user_role': user_role,
                'is_admin_user': is_admin_user,
                'welcome_message': welcome_message,
                'quick_access': {
                    'shipments': '/my-shipments' if not is_admin_user else '/cargos/sea',
                    'claims': '/my-claims' if not is_admin_user else '/cargos/claims',
                    'profile': '/my-profile' if not is_admin_user else '/profile'
                }
            }
        }
        
        # Add admin-specific dashboard info for admin users
        if is_admin_user:
            response_data['dashboard']['admin_panel'] = {
                'can_access': True,
                'is_superuser': user.is_superuser,
                'admin_url': '/admin'
            }
            response_data['dashboard']['quick_access'].update({
                'user_management': '/clients',
                'settings': '/settings',
                'analytics': '/',
                'warehouse': '/goods/china'
            })
        
        logger.info(f"User logged in successfully: {phone_or_username} ({full_name})")
        return Response(response_data, status=status.HTTP_200_OK)
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@method_decorator(csrf_exempt, name='dispatch')
class AdminLoginView(APIView):
    """
    DEPRECATED: This endpoint is deprecated. Use /api/auth/login/ instead.
    Role-based redirects now happen on the frontend after successful login.
    
    This endpoint remains for backwards compatibility but may be removed in a future version.
    
    Admin-only login endpoint. Uses same credentials as regular login but only
    permits users with admin roles (is_staff / is_admin_user / is_superuser).
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # Log deprecation warning
        logger.warning("DEPRECATED: AdminLoginView is deprecated. Please use LoginView instead. Role-based redirects should happen on the frontend.")
        
        phone_or_username = request.data.get('phone')
        password = request.data.get('password')

        if not phone_or_username or not password:
            return Response({'success': False, 'error': 'Phone/username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Reuse existing authenticate logic
        user = authenticate(request, phone=phone_or_username, password=password)
        if user is None:
            from django.contrib.auth import authenticate as django_authenticate
            user = django_authenticate(request, username=phone_or_username, password=password)

        if user is None:
            return Response({'success': False, 'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check admin permissions strictly: prefer `has_role` helper for multi-role users
        is_admin = False
        try:
            if hasattr(user, 'has_role'):
                is_admin = user.has_role('ADMIN') or user.has_role('MANAGER') or user.has_role('SUPER_ADMIN')
            else:
                is_admin = getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False) or getattr(user, 'is_admin_user', False)
        except Exception:
            # Fall back to legacy checks if any unexpected error occurs
            is_admin = getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False) or getattr(user, 'is_admin_user', False)

        if not is_admin:
            logger.warning(f"Admin login attempt rejected for non-admin user: {getattr(user, 'phone', getattr(user, 'username', 'unknown'))}")
            return Response({'success': False, 'error': 'Admin access required. This login endpoint only accepts admin accounts.'}, status=status.HTTP_403_FORBIDDEN)

        # Check active
        if not user.is_active:
            return Response({'success': False, 'error': 'Account disabled'}, status=status.HTTP_403_FORBIDDEN)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        user_data = {
            'id': user.id,
            'phone': getattr(user, 'phone', ''),
            'email': getattr(user, 'email', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'is_staff': getattr(user, 'is_staff', False),
            'is_superuser': getattr(user, 'is_superuser', False),
            'user_role': getattr(user, 'user_role', 'CUSTOMER'),
            'roles': getattr(user, 'roles', [getattr(user, 'user_role', 'CUSTOMER')]),
        }

        return Response({
            'success': True,
            'message': 'Admin login successful',
            'user': user_data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users - admin only"""
    queryset = CustomerUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user_role', 'is_active', 'user_type', 'region']
    search_fields = ['first_name', 'last_name', 'email', 'phone', 'shipping_mark', 'company_name']
    ordering_fields = ['first_name', 'last_name', 'date_joined', 'email', 'phone']
    ordering = ['-date_joined']  # Default ordering
    
    def get_queryset(self):
        """Filter users based on requesting user's permissions and query parameters"""
        user = self.request.user
        queryset = CustomerUser.objects.all()
        
        # Apply role-based filtering first
        if user.is_super_admin:
            # Super admins can see all users
            pass
        elif user.user_role == 'MANAGER':
            # Managers can see all non-super-admin users
            queryset = queryset.exclude(user_role='SUPER_ADMIN')
        elif user.user_role == 'ADMIN':
            # Admins can only see customers and staff
            queryset = queryset.filter(user_role__in=['CUSTOMER', 'STAFF'])
        else:
            # Other roles can only see their own profile
            queryset = queryset.filter(id=user.id)
        
        # Apply additional filtering based on query parameters
        user_role = self.request.query_params.get('user_role', None)
        if user_role:
            queryset = queryset.filter(user_role=user_role)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers based on action"""
        if self.action == 'create':
            return AdminUserCreateSerializer if self.request.user.is_admin_user else RegisterSerializer
        elif self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer if self.request.user.is_admin_user else UserSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get user statistics - admin only"""
        if not request.user.can_view_analytics:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate date ranges
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        
        # Base queryset
        base_queryset = self.get_queryset()
        
        stats = {
            'total_users': base_queryset.count(),
            'active_users': base_queryset.filter(is_active=True).count(),
            'admin_users': base_queryset.filter(
                user_role__in=['ADMIN', 'MANAGER', 'SUPER_ADMIN']
            ).count(),
            'customer_users': base_queryset.filter(user_role='CUSTOMER').count(),
            'business_users': base_queryset.filter(user_type='BUSINESS').count(),
            'individual_users': base_queryset.filter(user_type='INDIVIDUAL').count(),
            'recent_registrations': base_queryset.filter(
                date_joined__gte=last_30_days
            ).count(),
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def admin_users(self, request):
        """Get all admin users - super admin only"""
        if not request.user.can_manage_admins:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        admin_users = self.get_queryset().filter(
            user_role__in=['ADMIN', 'MANAGER', 'SUPER_ADMIN']
        ).order_by('-date_joined')
        
        serializer = self.get_serializer(admin_users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle user active status - admin only"""
        if not request.user.can_create_users:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Prevent users from deactivating themselves
        if user == request.user:
            return Response(
                {'detail': 'Cannot deactivate your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent lower-level admins from affecting higher-level ones
        if (user.user_role == 'SUPER_ADMIN' and 
            request.user.user_role != 'SUPER_ADMIN'):
            return Response(
                {'detail': 'Cannot modify Super Admin accounts'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        
        logger.info(f"User {user.phone} {'activated' if user.is_active else 'deactivated'} by {request.user.phone}")
        
        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'user': UserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password - admin only"""
        if not request.user.can_create_users:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'detail': 'new_password is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password
        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password)
        except Exception as e:
            return Response(
                {'detail': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        logger.info(f"Password reset for user {user.phone} by admin {request.user.phone}")
        
        return Response({'message': 'Password reset successfully'})


class PasswordChangeView(APIView):
    """Allow users to change their own password"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            logger.info(f"Password changed for user {user.phone or user.email}")
            
            return Response({
                'message': 'Password changed successfully',
                'note': 'Please log in again with your new password'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """Request password reset - sends 6-digit code to email"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            
            try:
                user = CustomerUser.objects.get(email=email)
                if not user.is_active:
                    return Response(
                        {'detail': 'Account is inactive'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create reset PIN
                reset_pin = ResetPin.create_for_user(user)
                
                # Send email
                self.send_reset_email(user, reset_pin.pin)
                
                logger.info(f"Password reset code sent to {email}")
                return Response({
                    'message': 'If this email exists, a verification code has been sent.',
                    'detail': 'Please check your email for the 6-digit verification code.'
                })
                
            except CustomerUser.DoesNotExist:
                # Don't reveal if email exists - always return success
                logger.warning(f"Password reset attempted for non-existent email: {email}")
                return Response({
                    'message': 'If this email exists, a verification code has been sent.',
                    'detail': 'Please check your email for the 6-digit verification code.'
                })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def send_reset_email(self, user, code):
        """Send password reset email with 6-digit code"""
        subject = 'Primepre Password Reset - Verification Code'
        message = f"""
Hello {user.get_full_name()},

You requested a password reset for your Primepre account.

Your verification code is: {code}

This code will expire in 15 minutes.

If you didn't request this password reset, please ignore this email.

Best regards,
Primepre Team
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send reset email to {user.email}: {str(e)}")
            raise


class PasswordResetVerifyView(APIView):
    """Verify the 6-digit code"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetCodeVerifySerializer(data=request.data)
        if serializer.is_valid():
            return Response({
                'message': 'Verification code is valid. You can now reset your password.',
                'valid': True
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """Confirm password reset with code and new password"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            code = serializer.validated_data['code']
            new_password = serializer.validated_data['new_password']
            
            try:
                user = CustomerUser.objects.get(email=email)
                reset_pin = ResetPin.objects.filter(
                    user=user,
                    pin=code,
                    is_used=False
                ).first()
                
                if not reset_pin or not reset_pin.is_valid():
                    return Response(
                        {'detail': 'Invalid or expired verification code.'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Reset password
                user.set_password(new_password)
                user.save()
                
                # Mark PIN as used
                reset_pin.mark_used()
                
                # Send confirmation email
                self.send_confirmation_email(user)
                
                logger.info(f"Password reset successful for user {email}")
                return Response({
                    'message': 'Password has been reset successfully. You can now login with your new password.'
                })
                
            except CustomerUser.DoesNotExist:
                return Response(
                    {'detail': 'Invalid email address.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def send_confirmation_email(self, user):
        """Send password reset confirmation email"""
        subject = 'Primepre Password Reset - Successful'
        message = f"""
Hello {user.get_full_name()},

Your password has been successfully reset for your Primepre account.

If you didn't make this change, please contact our support team immediately.

Best regards,
Primepre Team
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,  # Don't fail if confirmation email fails
            )
        except Exception as e:
            logger.error(f"Failed to send confirmation email to {user.email}: {str(e)}")


# DEPRECATED - Keep for backward compatibility but mark as insecure
class PasswordResetView(APIView):
    """DEPRECATED: This method is insecure. Use PasswordResetRequestView instead."""
    permission_classes = [AllowAny]
    
    def post(self, request):
        return Response(
            {
                'error': 'This endpoint is deprecated for security reasons.',
                'message': 'Please use the new secure password reset flow.',
                'endpoints': {
                    'request_reset': '/api/auth/password-reset/request/',
                    'verify_code': '/api/auth/password-reset/verify/',
                    'confirm_reset': '/api/auth/password-reset/confirm/'
                }
            },
            status=status.HTTP_410_GONE
        )


class ProfileView(APIView):
    """User profile management"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update current user profile"""
        serializer = UserSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # Prevent users from changing their own role/permissions
            restricted_fields = [
                'user_role', 'is_active', 'is_staff', 'is_superuser',
                'can_create_users', 'can_manage_inventory', 'can_view_analytics',
                'can_manage_admins', 'can_access_admin_panel', 'accessible_warehouses'
            ]
            
            for field in restricted_fields:
                if field in serializer.validated_data:
                    del serializer.validated_data[field]
            
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# SINGLE ENDPOINT SIGNUP (FOR FRONTEND COMPATIBILITY)
# ============================================================================

class SingleSignupView(APIView):
    """
    Single API endpoint for creating user account and sending verification
    Expected data: { name, company_name, shipping_mark, phone, region, password }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Create user account and send verification SMS."""
        data = request.data
        
        # Validate required fields
        required_fields = ['name', 'phone', 'region', 'shipping_mark', 'password']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return Response({
                'error': 'Missing required fields',
                'missing_fields': missing_fields
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean phone number
            import re
            phone_clean = re.sub(r'[^\d+]', '', data['phone'])
            
            # Split name into first and last name
            name_parts = data['name'].strip().split(' ', 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Final validations
            if CustomerUser.objects.filter(phone=phone_clean).exists():
                return Response({
                    'error': 'Phone number already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if CustomerUser.objects.filter(shipping_mark=data['shipping_mark']).exists():
                return Response({
                    'error': 'Shipping mark already taken'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create user (active but not verified)
            user = CustomerUser.objects.create_user(
                phone=phone_clean,
                password=data['password'],
                first_name=first_name,
                last_name=last_name,
                company_name=data.get('company_name', ''),
                email='',  # No email required in new flow
                region=data['region'],
                shipping_mark=data['shipping_mark'],
                is_active=True,
                is_verified=False
            )
            
            # Create verification PIN
            verification_pin = VerificationPin.create_for_user(user)
            
            # Send SMS
            sms_result = send_verification_pin(user.phone, verification_pin.pin)
            
            if sms_result['success']:
                logger.info(f"User created and verification PIN sent: {user.phone}")
                return Response({
                    'message': 'Account created successfully',
                    'user_id': user.id,
                    'phone': user.phone,
                    'verification_sent': True
                }, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"SMS failed for user {user.phone}: {sms_result['message']}")
                return Response({
                    'message': 'Account created but SMS failed',
                    'user_id': user.id,
                    'phone': user.phone,
                    'verification_sent': False,
                    'sms_error': sms_result['message']
                }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Signup error: {str(e)}")
            return Response({
                'error': 'Signup failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SinglePhoneVerificationView(APIView):
    """
    Single API endpoint for phone verification
    Expected data: { phone, pin }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Verify PIN and activate user."""
        phone = request.data.get('phone')
        pin = request.data.get('pin')
        
        if not phone or not pin:
            return Response({
                'error': 'Phone number and PIN are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean phone number
            import re
            phone_clean = re.sub(r'[^\d+]', '', phone)
            
            # Find user by phone
            user = CustomerUser.objects.get(phone=phone_clean)
            
            # Find valid verification PIN
            verification_pin = VerificationPin.objects.filter(
                user=user,
                pin=pin,
                is_used=False
            ).first()
            
            if not verification_pin or not verification_pin.is_valid():
                return Response({
                    'error': 'Invalid or expired verification code'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark user as verified
            user.is_verified = True
            user.save()
            
            # Mark PIN as used
            verification_pin.mark_used()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Send welcome SMS
            send_welcome_message(user.phone, user.first_name)
            
            logger.info(f"Phone verification successful for user {user.phone}")
            
            return Response({
                'message': 'Phone verified successfully',
                'user': {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.get_full_name(),
                    'company_name': user.company_name,
                    'email': user.email,
                    'phone': user.phone,
                    'region': user.region,
                    'shipping_mark': user.shipping_mark,
                    'user_role': user.user_role,
                    'user_type': user.user_type,
                    'is_active': user.is_active,
                    'is_verified': user.is_verified,
                    'date_joined': user.date_joined.isoformat(),
                },
                'access': str(access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_200_OK)
            
        except CustomerUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Phone verification error: {str(e)}")
            return Response({
                'error': 'Verification failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SingleResendVerificationView(APIView):
    """
    Single API endpoint for resending verification code
    Expected data: { phone }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Resend verification PIN to phone."""
        phone = request.data.get('phone')
        
        if not phone:
            return Response({
                'error': 'Phone number is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Clean phone number
            import re
            phone_clean = re.sub(r'[^\d+]', '', phone)
            
            # Find user by phone
            user = CustomerUser.objects.get(phone=phone_clean)
            
            if user.is_verified:
                return Response({
                    'error': 'User is already verified'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create new verification PIN (invalidates old ones)
            verification_pin = VerificationPin.create_for_user(user)
            
            # Send SMS
            sms_result = send_verification_pin(user.phone, verification_pin.pin)
            
            if sms_result['success']:
                logger.info(f"Verification PIN resent to: {user.phone}")
                return Response({
                    'message': 'Verification code sent successfully'
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"SMS failed for user {user.phone}: {sms_result['message']}")
                return Response({
                    'error': 'Failed to send verification code',
                    'sms_error': sms_result['message']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except CustomerUser.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Resend verification error: {str(e)}")
            return Response({
                'error': 'Failed to resend verification code',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DevelopmentPinsView(APIView):
    """
    Development-only endpoint to view recent verification PINs
    Only works when DEBUG=True
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get recent verification PINs for development."""
        from django.conf import settings
        
        if not settings.DEBUG:
            return Response({
                'error': 'This endpoint is only available in development mode'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Get recent verification PINs (last 10)
            recent_pins = VerificationPin.objects.select_related('user').order_by('-created_at')[:10]
            
            pins_data = []
            for pin_obj in recent_pins:
                pins_data.append({
                    'phone': pin_obj.user.phone,
                    'pin': pin_obj.pin,
                    'user_name': pin_obj.user.get_full_name(),
                    'created_at': pin_obj.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'is_used': pin_obj.is_used,
                    'is_valid': pin_obj.is_valid()
                })
            
            return Response({
                'message': 'Recent verification PINs (Development mode only)',
                'pins': pins_data,
                'total': len(pins_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve PINs',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# SHIPPING MARK VERIFICATION VIEWS (NEW)
# ============================================================================

class ShippingMarkVerificationView(APIView):
    """
    API endpoint to verify customer account using shipping mark
    Step 1: Customer provides phone and indicates if they have a shipping mark
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Verify shipping mark and return matching cargo items"""
        from .serializers import ShippingMarkVerificationSerializer
        from cargo.models import CargoItem
        
        serializer = ShippingMarkVerificationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        phone = validated_data['phone']
        has_shipping_mark = validated_data['has_shipping_mark']
        shipping_mark = validated_data.get('shipping_mark', '').strip()
        
        try:
            # Get the unverified user
            user = CustomerUser.objects.get(phone=phone, is_verified=False)
            
            # Case 1: User doesn't have a shipping mark
            if not has_shipping_mark:
                return Response({
                    'success': True,
                    'has_shipping_mark': False,
                    'message': 'No shipping mark verification needed',
                    'user': {
                        'phone': user.phone,
                        'name': user.get_full_name(),
                        'email': user.email,
                        'shipping_mark': user.shipping_mark
                    },
                    'instructions': 'You can proceed to set your password and verify your account.',
                    'verification_required': True
                }, status=status.HTTP_200_OK)
            
            # Case 2: User has a shipping mark - verify it matches their account
            if not shipping_mark:
                return Response({
                    'success': False,
                    'error': 'Please provide your shipping mark'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if the provided shipping mark matches the user's registered mark
            if not user.shipping_mark or user.shipping_mark.strip().lower() != shipping_mark.lower():
                return Response({
                    'success': False,
                    'error': 'Shipping mark does not match',
                    'message': f'The shipping mark you provided does not match the one registered with your phone number. Please check and try again.',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Shipping mark matches! User can proceed to set password
            return Response({
                'success': True,
                'has_shipping_mark': True,
                'shipping_mark_verified': True,
                'message': 'Shipping mark verified successfully!',
                'user': {
                    'phone': user.phone,
                    'name': user.get_full_name(),
                    'email': user.email,
                    'shipping_mark': user.shipping_mark
                },
                'instructions': 'Please set your password to complete account verification.'
            }, status=status.HTTP_200_OK)
            
        except CustomerUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found or already verified'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Shipping mark verification error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Verification failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShippingMarkConfirmationView(APIView):
    """
    API endpoint to confirm shipping mark match and verify account
    Step 2: Customer confirms the shipping mark and sets password
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """Confirm shipping mark and verify account"""
        from .serializers import ShippingMarkConfirmationSerializer
        
        serializer = ShippingMarkConfirmationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'error': 'Validation failed',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        phone = validated_data['phone']
        shipping_mark = validated_data.get('shipping_mark', '').strip()
        password = validated_data['password']
        
        try:
            # Get the unverified user
            user = CustomerUser.objects.get(phone=phone, is_verified=False)
            
            # Verify the shipping mark matches (if user has one)
            if shipping_mark and user.shipping_mark:
                if user.shipping_mark.lower() != shipping_mark.lower():
                    return Response({
                        'success': False,
                        'error': 'Shipping mark does not match your account'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set password and verify account
            user.set_password(password)
            user.is_verified = True
            user.save()
            
            logger.info(f"Account verified via shipping mark: {user.phone}")
            
            # Generate JWT tokens for auto-login
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'success': True,
                'message': 'Account verified successfully!',
                'user': {
                    'id': user.id,
                    'phone': user.phone,
                    'email': user.email,
                    'name': user.get_full_name(),
                    'shipping_mark': user.shipping_mark,
                    'is_verified': user.is_verified,
                    'user_role': user.user_role
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                },
                'instructions': 'Your account is now active. You can login and track your shipments.'
            }, status=status.HTTP_200_OK)
            
        except CustomerUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found or already verified'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Confirmation error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Confirmation failed',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShippingMarksListView(APIView):
    """
    API endpoint to get all unique shipping marks from the database
    Used for dropdown selection in verification flow
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return all unique shipping marks"""
        try:
            # Get all unique shipping marks from customers that have cargo items
            shipping_marks = CustomerUser.objects.filter(
                cargo_items__isnull=False
            ).values_list('shipping_mark', flat=True).distinct().order_by('shipping_mark')
            
            # Filter out None and empty values
            shipping_marks = [mark for mark in shipping_marks if mark and mark.strip()]
            
            return Response({
                'success': True,
                'shipping_marks': shipping_marks,
                'total': len(shipping_marks)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching shipping marks: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to fetch shipping marks',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteUnverifiedUsersView(APIView):
    """
    Admin-only endpoint to delete all unverified users
    Can be called from browser or admin panel
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def post(self, request):
        """Delete all unverified users"""
        try:
            # Get count before deletion
            unverified_users = CustomerUser.objects.filter(is_verified=False)
            count = unverified_users.count()
            
            if count == 0:
                return Response({
                    'success': True,
                    'message': 'No unverified users found',
                    'deleted_count': 0
                }, status=status.HTTP_200_OK)
            
            # Delete unverified users
            deleted_count, _ = unverified_users.delete()
            
            logger.info(f"Admin {request.user.email or request.user.phone} deleted {deleted_count} unverified users")
            
            return Response({
                'success': True,
                'message': f'Successfully deleted {deleted_count} unverified users',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting unverified users: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to delete unverified users',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """Get count of unverified users (for preview)"""
        try:
            count = CustomerUser.objects.filter(is_verified=False).count()
            
            return Response({
                'success': True,
                'unverified_count': count,
                'message': f'Found {count} unverified users'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error counting unverified users: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to count unverified users',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# ONE-TIME SETUP ENDPOINT FOR CREATING SUPERUSER (RENDER FREE TIER)
# ============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class InitialSetupView(APIView):
    """
    One-time setup endpoint to create initial superuser.
    Requires SETUP_SECRET_KEY from environment variables.
    This is useful for Render free tier where you don't have shell access.
    
    Usage:
    POST /api/auth/initial-setup/
    {
        "secret_key": "your-secret-key-from-env",
        "phone": "1234567890",
        "password": "secure-password",
        "email": "admin@example.com",
        "first_name": "Super",
        "last_name": "Admin"
    }
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import os
        
        # Get the secret key from environment
        setup_secret = os.environ.get('SETUP_SECRET_KEY')
        
        if not setup_secret:
            logger.warning("Initial setup attempted but SETUP_SECRET_KEY is not set in environment")
            return Response({
                'success': False,
                'error': 'Setup endpoint is not configured. Set SETUP_SECRET_KEY environment variable.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Verify the secret key
        provided_secret = request.data.get('secret_key')
        if not provided_secret or provided_secret != setup_secret:
            logger.warning(f"Invalid setup secret key attempt from IP: {request.META.get('REMOTE_ADDR')}")
            return Response({
                'success': False,
                'error': 'Invalid secret key'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get superuser details
        phone = request.data.get('phone')
        password = request.data.get('password')
        email = request.data.get('email', '')
        first_name = request.data.get('first_name', 'Super')
        last_name = request.data.get('last_name', 'Admin')
        
        if not phone or not password:
            return Response({
                'success': False,
                'error': 'Phone and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if superuser already exists
        if CustomerUser.objects.filter(phone=phone).exists():
            user = CustomerUser.objects.get(phone=phone)
            
            # If user exists but is not a superuser, upgrade them
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.user_role = 'SUPER_ADMIN'
                user.set_password(password)
                if email:
                    user.email = email
                if first_name:
                    user.first_name = first_name
                if last_name:
                    user.last_name = last_name
                user.is_active = True
                user.is_verified = True
                user.save()
                
                logger.info(f"Upgraded existing user {phone} to superuser via initial setup")
                return Response({
                    'success': True,
                    'message': f'User {phone} upgraded to superuser',
                    'user': {
                        'phone': user.phone,
                        'email': user.email,
                        'name': f'{user.first_name} {user.last_name}',
                        'role': user.user_role
                    }
                }, status=status.HTTP_200_OK)
            else:
                logger.info(f"Superuser {phone} already exists - setup skipped")
                return Response({
                    'success': True,
                    'message': f'Superuser {phone} already exists',
                    'user': {
                        'phone': user.phone,
                        'email': user.email,
                        'name': f'{user.first_name} {user.last_name}',
                        'role': user.user_role
                    }
                }, status=status.HTTP_200_OK)
        
        # Create new superuser
        try:
            user = CustomerUser.objects.create_superuser(
                phone=phone,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_verified=True
            )
            
            logger.info(f"Created initial superuser: {phone} via setup endpoint")
            
            return Response({
                'success': True,
                'message': 'Superuser created successfully',
                'user': {
                    'phone': user.phone,
                    'email': user.email,
                    'name': f'{user.first_name} {user.last_name}',
                    'role': user.user_role
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating superuser via setup: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to create superuser',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

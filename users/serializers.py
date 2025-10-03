from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomerUser

class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomerUser
        fields = [
            'first_name', 'last_name', 'company_name', 'email', 'phone', 
            'region', 'user_type', 'password', 'confirm_password'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data): 
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    def validate_password(self, value):
        validate_password(value)
        return value
    
    def validate_phone(self, value):
        # Remove common phone number characters for validation
        clean_phone = value.replace('+', '').replace('-', '').replace(' ', '')
        if not clean_phone.isdigit() or len(clean_phone) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        return value

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return CustomerUser.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    permissions_summary = serializers.CharField(source='get_permissions_summary', read_only=True)
    is_admin_user = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = CustomerUser
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'nickname', 'company_name', 
            'email', 'phone', 'region', 'shipping_mark', 'user_role', 
            'user_type', 'is_active', 'is_verified', 'is_admin_user', 'date_joined',
            'accessible_warehouses', 'permissions_summary'
        ]


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating admin users"""
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomerUser
        fields = [
            'first_name', 'last_name', 'company_name', 'email', 'phone', 
            'region', 'user_role', 'user_type', 'accessible_warehouses',
            'can_create_users', 'can_manage_inventory', 'can_view_analytics',
            'can_manage_admins', 'password', 'confirm_password'
        ]
        extra_kwargs = {'password': {'write_only': True}}
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        
        # Validate role permissions
        requesting_user = self.context['request'].user
        requested_role = data.get('user_role', 'CUSTOMER')
        
        if not requesting_user.can_create_admin_user():
            raise serializers.ValidationError("You don't have permission to create admin users.")
        
        # Super admins can create anyone, managers can create admins and below
        if requesting_user.user_role == 'MANAGER' and requested_role == 'SUPER_ADMIN':
            raise serializers.ValidationError("Managers cannot create Super Admins.")
        
        if requesting_user.user_role == 'ADMIN' and requested_role in ['SUPER_ADMIN', 'MANAGER']:
            raise serializers.ValidationError("Admins cannot create Managers or Super Admins.")
        
        return data
    
    def validate_password(self, value):
        validate_password(value)
        return value
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        validated_data['created_by'] = self.context['request'].user
        
        # Auto-verify admin users (they don't need phone verification)
        if validated_data.get('user_role') in ['ADMIN', 'STAFF', 'MANAGER', 'SUPER_ADMIN']:
            validated_data['is_verified'] = True
            
        return CustomerUser.objects.create_user(**validated_data)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating admin users"""
    
    class Meta:
        model = CustomerUser
        fields = [
            'first_name', 'last_name', 'company_name', 'email', 'region', 
            'user_role', 'is_active', 'accessible_warehouses',
            'can_create_users', 'can_manage_inventory', 'can_view_analytics',
            'can_manage_admins'
        ]
    
    def validate(self, data):
        requesting_user = self.context['request'].user
        target_user = self.instance
        new_role = data.get('user_role', target_user.user_role)
        
        # Prevent users from modifying themselves inappropriately
        if target_user == requesting_user and new_role != target_user.user_role:
            raise serializers.ValidationError("You cannot change your own role.")
        
        # Role change validation
        if new_role != target_user.user_role:
            if not requesting_user.can_create_admin_user():
                raise serializers.ValidationError("You don't have permission to change user roles.")
            
            if requesting_user.user_role == 'MANAGER' and new_role == 'SUPER_ADMIN':
                raise serializers.ValidationError("Managers cannot promote users to Super Admin.")
        
        return data


class UserStatsSerializer(serializers.Serializer):
    """Serializer for user statistics"""
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    admin_users = serializers.IntegerField()
    customer_users = serializers.IntegerField()
    business_users = serializers.IntegerField()
    individual_users = serializers.IntegerField()
    recent_registrations = serializers.IntegerField()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset via email"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """Verify that user exists with this email"""
        try:
            from .models import CustomerUser
            user = CustomerUser.objects.get(email=value)
            if not user.is_active:
                raise serializers.ValidationError("This account is inactive.")
            return value
        except CustomerUser.DoesNotExist:
            # Don't reveal if email exists for security
            # But we'll still validate the format
            return value


class PasswordResetCodeVerifySerializer(serializers.Serializer):
    """Serializer for verifying 6-digit reset code"""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    
    def validate_code(self, value):
        """Validate that code is 6 digits"""
        if not value.isdigit():
            raise serializers.ValidationError("Code must be 6 digits.")
        return value
    
    def validate(self, data):
        """Validate the reset code"""
        try:
            from .models import PasswordResetToken, CustomerUser
            user = CustomerUser.objects.get(email=data['email'])
            reset_token = PasswordResetToken.objects.filter(
                user=user, 
                token=data['code'],
                is_used=False
            ).first()
            
            if not reset_token or not reset_token.is_valid():
                raise serializers.ValidationError("Invalid or expired verification code.")
            
            return data
        except CustomerUser.DoesNotExist:
            raise serializers.ValidationError("Invalid email address.")


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset with verified code"""
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    def validate_new_password(self, value):
        validate_password(value)
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    def validate_code(self, value):
        """Validate that code is 6 digits"""
        if not value.isdigit():
            raise serializers.ValidationError("Code must be 6 digits.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change by authenticated user"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("New passwords do not match.")
        return data
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
    
    def validate_new_password(self, value):
        validate_password(value)
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value


class PasswordResetSerializer(serializers.Serializer):
    """DEPRECATED: Use PasswordResetRequestSerializer and PasswordResetConfirmSerializer instead"""
    phone = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    def validate_new_password(self, value):
        validate_password(value)
        return value


# ============================================================================
# PHONE-BASED AUTHENTICATION SERIALIZERS
# ============================================================================

class PhoneSignupStep1Serializer(serializers.Serializer):
    """Serializer for Step 1: Basic Information"""
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    nickname = serializers.CharField(max_length=50, required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField()

    def validate_first_name(self, value):
        if not value.replace(' ', '').isalpha():
            raise serializers.ValidationError("First name should only contain letters and spaces.")
        return value.strip().title()

    def validate_last_name(self, value):
        if not value.replace(' ', '').isalpha():
            raise serializers.ValidationError("Last name should only contain letters and spaces.")
        return value.strip().title()

    def validate_nickname(self, value):
        if value:
            return value.strip()
        return value

    def validate_company_name(self, value):
        if value:
            return value.strip()
        return value

    def validate_email(self, value):
        if CustomerUser.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()


class PhoneSignupStep2Serializer(serializers.Serializer):
    """Serializer for Step 2: Shipping Mark Selection"""
    shipping_mark = serializers.CharField(max_length=20)

    def validate_shipping_mark(self, value):
        if CustomerUser.objects.filter(shipping_mark=value).exists():
            raise serializers.ValidationError("This shipping mark is already taken.")
        return value


class PhoneSignupStep3Serializer(serializers.Serializer):
    """Serializer for Step 3: Phone & Region"""
    phone = serializers.CharField(max_length=15)
    region = serializers.ChoiceField(choices=CustomerUser.REGION_CHOICES)

    def validate_phone(self, value):
        # Clean phone number
        import re
        phone_clean = re.sub(r'[^\d+]', '', value)
        
        if not phone_clean:
            raise serializers.ValidationError("Please enter a valid phone number.")
        
        # Check uniqueness
        if CustomerUser.objects.filter(phone=phone_clean).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        
        # Basic format validation
        if not re.match(r'^\+?[\d\s\-\(\)]{10,15}$', value):
            raise serializers.ValidationError("Please enter a valid phone number format.")
        
        return phone_clean


class PhoneSignupCompleteSerializer(serializers.Serializer):
    """Serializer for Step 4: Password Setup and Account Creation"""
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password(value)
        
        # Additional custom validation
        import re
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data


class ShippingMarkVerificationSerializer(serializers.Serializer):
    """Serializer for verifying customer account using shipping mark"""
    phone = serializers.CharField(required=True)
    shipping_mark = serializers.CharField(required=False, allow_blank=True)
    has_shipping_mark = serializers.BooleanField(required=True)
    
    def validate_phone(self, value):
        """Validate phone exists and is unverified"""
        from django.db.models import Q
        
        # Clean the phone number
        clean_phone = value.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '')
        
        try:
            # Try to find user with various phone formats
            user = CustomerUser.objects.filter(
                Q(phone=value) | 
                Q(phone=clean_phone) |
                Q(phone__endswith=clean_phone[-10:]) if len(clean_phone) >= 10 else Q(phone=clean_phone)
            ).first()
            
            if not user:
                raise serializers.ValidationError("No account found with this phone number.")
            
            if user.is_verified:
                raise serializers.ValidationError("This account is already verified.")
            
            return user.phone  # Return the phone as stored in the database
        except CustomerUser.DoesNotExist:
            raise serializers.ValidationError("No account found with this phone number.")
    
    def validate(self, data):
        """Validate shipping mark if user claims to have one"""
        if data['has_shipping_mark']:
            if not data.get('shipping_mark') or not data['shipping_mark'].strip():
                raise serializers.ValidationError({
                    "shipping_mark": "Shipping mark is required when you select 'Yes'."
                })
        return data


class ShippingMarkConfirmationSerializer(serializers.Serializer):
    """Serializer for confirming shipping mark match"""
    phone = serializers.CharField(required=True)
    shipping_mark = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        """Validate passwords match"""
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        
        # Validate password strength
        password = data['password']
        if len(password) < 8:
            raise serializers.ValidationError({
                "password": "Password must be at least 8 characters long."
            })
        
        return data


class PhoneVerificationSerializer(serializers.Serializer):
    """Serializer for phone verification PIN"""
    pin = serializers.CharField(max_length=6, min_length=6)

    def validate_pin(self, value):
        import re
        if not re.match(r'^\d{6}$', value):
            raise serializers.ValidationError("Verification code must be exactly 6 digits.")
        return value


class PhoneForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password - phone number entry"""
    phone = serializers.CharField(max_length=15)

    def validate_phone(self, value):
        import re
        phone_clean = re.sub(r'[^\d+]', '', value)
        
        # Check if phone number exists
        if not CustomerUser.objects.filter(phone=phone_clean).exists():
            raise serializers.ValidationError("No account found with this phone number.")
        
        return phone_clean


class PhonePasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset with PIN"""
    pin = serializers.CharField(max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_pin(self, value):
        import re
        if not re.match(r'^\d{6}$', value):
            raise serializers.ValidationError("Reset code must be exactly 6 digits.")
        return value

    def validate_new_password(self, value):
        validate_password(value)
        
        # Additional custom validation
        import re
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data


class ResendPinSerializer(serializers.Serializer):
    """Serializer for PIN resend requests (for rate limiting)"""
    pass  # Empty serializer, just for validation


class SimplifiedSignupSerializer(serializers.Serializer):
    """
    Simplified signup serializer for auto-generated shipping marks.
    No shipping mark selection, no SMS verification required.
    """
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    nickname = serializers.CharField(max_length=50, required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=15)
    region = serializers.ChoiceField(choices=CustomerUser.REGION_CHOICES)
    user_type = serializers.ChoiceField(
        choices=CustomerUser.USER_TYPE_CHOICES,
        default='INDIVIDUAL'
    )
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password(value)
        
        # Additional custom validation
        import re
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        
        return value

    def validate_phone(self, value):
        # Clean phone number
        import re
        clean_phone = re.sub(r'[^\d+]', '', value)
        
        if len(clean_phone) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        
        # Check if phone already exists
        if CustomerUser.objects.filter(phone=clean_phone).exists():
            raise serializers.ValidationError("Phone number already registered.")
        
        return clean_phone

    def validate_email(self, value):
        if CustomerUser.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email address already registered.")
        return value.lower()

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data


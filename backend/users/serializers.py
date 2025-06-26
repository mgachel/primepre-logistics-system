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
            'id', 'first_name', 'last_name', 'full_name', 'company_name', 
            'email', 'phone', 'region', 'shipping_mark', 'user_role', 
            'user_type', 'is_active', 'is_admin_user', 'date_joined',
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


class PasswordResetSerializer(serializers.Serializer):
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
        return value
    
    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    
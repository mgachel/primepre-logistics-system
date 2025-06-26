from rest_framework import serializers
from .models import CustomerUser

class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomerUser
        fields = ['first_name', 'last_name', 'nickname', 'email', 'phone', 'region', 'password', 'confirm_password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate(self, data): 
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    def validate_phone(self, value):
        if not value.isdigit() or len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        return value
    
    def validate_email(self, value):
        if value and '@' not in value:
            raise serializers.ValidationError("Invalid email format.")
        return value

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return CustomerUser.objects.create_user(**validated_data)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerUser
        fields = ['id', 'first_name', 'last_name', 'nickname', 'email', 'phone', 'region', 'shipping_mark']

class PasswordResetSerializer(serializers.Serializer):
    phone = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match.")
        return data
    
    def validate_new_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value
    
    
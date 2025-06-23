from rest_framework import serializers
from django.contrib.auth import get_user_model 
from rest_framework.validators import UniqueValidator 
from django.core.mail import send_mail 
from django.contrib.auth.password_validation import validate_password
import random  
from .utils import generate_shipping_mark

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta: 
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'password2', 'role', 'phone', 'company_name', 'region']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        shipping_mark = generate_shipping_mark(
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            region=validated_data['region']
        )
        
        validated_data['shipping_mark'] = shipping_mark 
        
        user = User.objects.create_user(**validated_data)
        user.is_active = False
        user.verification_code = str(random.randint(100000, 999999))
        user.save()
        
        send_mail(
            subject='Primepre Account Verification',
            message=f'Your verification code is: {user.verification_code}',
            from_email='Primepre <no-reply@primepre.com>',
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return user
    
    
class LoginSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True) 
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'password']
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        user = User.objects.filter(email=email).first()
        if not user:
            raise serializers.ValidationError("No account with this email exists")

        if not user.is_verified:
            raise serializers.ValidationError("Account not verified")

        if not user.is_active:
            raise serializers.ValidationError("Account not active")

        if not user.check_password(password):
            raise serializers.ValidationError("Incorrect password")
        
        return {'user': user}



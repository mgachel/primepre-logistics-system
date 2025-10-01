from rest_framework import serializers
from .models import DailyUpdate
from django.utils import timezone

class DailyUpdateSerializer(serializers.ModelSerializer):
    # Add computed fields
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = DailyUpdate
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def validate_expires_at(self, value):
        """Validate expires_at field"""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future.")
        return value

    def validate_title(self, value):
        """Validate title field"""
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long.")
        return value.strip()

    def validate_content(self, value):
        """Validate content field"""
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Content must be at least 5 characters long.")
        return value.strip()

    def to_representation(self, instance):
        """Customize the serialized output"""
        data = super().to_representation(instance)
        
        # Add formatted dates
        if instance.created_at:
            data['created_at_formatted'] = instance.created_at.strftime('%Y-%m-%d %H:%M:%S')
        
        if instance.expires_at:
            data['expires_at_formatted'] = instance.expires_at.strftime('%Y-%m-%d %H:%M:%S')
        
        return data
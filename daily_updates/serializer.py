from rest_framework import serializers
from .models import DailyUpdate
from django.utils import timezone
from datetime import timedelta


class DailyUpdateSerializer(serializers.ModelSerializer):
    # Add computed fields
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    
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
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Content must be at least 10 characters long.")
        return value.strip()

    def validate_priority(self, value):
        """Validate priority field"""
        valid_priorities = [choice[0] for choice in DailyUpdate.PRIORITY_CHOICES]
        if value not in valid_priorities:
            raise serializers.ValidationError(f"Priority must be one of: {', '.join(valid_priorities)}")
        return value

    def create(self, validated_data):
        """Custom create method"""
        if 'expires_at' not in validated_data or validated_data['expires_at'] is None:
            validated_data['expires_at'] = timezone.now() + timedelta(days=7)
        return super().create(validated_data)

    def to_representation(self, instance):
        """Customize the serialized output"""
        data = super().to_representation(instance)
        
        # Add human-readable priority
        data['priority_display'] = instance.get_priority_display()
        
        # Add formatted dates
        if instance.created_at:
            data['created_at_formatted'] = instance.created_at.strftime('%Y-%m-%d %H:%M:%S')
        
        if instance.expires_at:
            data['expires_at_formatted'] = instance.expires_at.strftime('%Y-%m-%d %H:%M:%S')
        
        return data


class DailyUpdateCreateSerializer(DailyUpdateSerializer):
    """Serializer for creating daily updates with minimal required fields"""
    
    class Meta(DailyUpdateSerializer.Meta):
        fields = ['title', 'content', 'priority', 'expires_at']


class DailyUpdateListSerializer(DailyUpdateSerializer):
    """Serializer for listing daily updates with minimal fields"""
    
    class Meta(DailyUpdateSerializer.Meta):
        fields = ['id', 'title', 'priority', 'priority_display', 'created_at', 'expires_at', 'is_expired']
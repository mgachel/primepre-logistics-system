from rest_framework import serializers
from .models import DailyUpdate
from django.utils import timezone

class DailyUpdateSerializer(serializers.ModelSerializer):
    # Add computed fields
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    # Add attachment-related computed fields
    attachment_file_extension = serializers.ReadOnlyField()
    attachment_size_display = serializers.ReadOnlyField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyUpdate
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'attachment_name', 'attachment_size')
    
    def get_attachment_url(self, obj):
        """Get the full URL for the attachment"""
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None

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
        if len(value.strip()) > 20000:
            raise serializers.ValidationError(
                f"Content must not exceed 20,000 characters. Current length: {len(value.strip())} characters."
            )
        return value.strip()

    def validate_attachment(self, value):
        """Validate attachment file"""
        if value:
            # Check file size (limit to 10MB)
            max_size = 10 * 1024 * 1024  # 10MB in bytes
            if value.size > max_size:
                raise serializers.ValidationError(
                    f"File size must not exceed 10MB. Current size: {value.size / (1024*1024):.2f}MB"
                )
            
            # Check file extension
            allowed_extensions = [
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 
                'txt', 'jpg', 'jpeg', 'png', 'zip', 'rar'
            ]
            ext = value.name.split('.')[-1].lower()
            if ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"File type '.{ext}' is not allowed. Allowed types: {', '.join(allowed_extensions)}"
                )
        
        return value

    def to_representation(self, instance):
        """Customize the serialized output"""
        data = super().to_representation(instance)
        
        # Add formatted dates
        if instance.created_at:
            data['created_at_formatted'] = instance.created_at.strftime('%Y-%m-%d %H:%M:%S')
        
        if instance.expires_at:
            data['expires_at_formatted'] = instance.expires_at.strftime('%Y-%m-%d %H:%M:%S')
        
        return data
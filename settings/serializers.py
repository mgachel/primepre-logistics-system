from rest_framework import serializers
from .models import (
    AdminGeneralSettings, InvoiceMetaSettings, CompanyOffice, WarehouseAddress,
    ShippingMarkFormattingRule, ShippingMarkFormatSettings,
    SystemSettings, CompanySettings, NotificationSettings,
    AdminMessage, ClientNotification
)
from users.models import CustomerUser


class AdminGeneralSettingsSerializer(serializers.ModelSerializer):
    """Serializer for AdminGeneralSettings model"""
    
    admin_user_name = serializers.CharField(source='admin_user.get_full_name', read_only=True)
    
    class Meta:
        model = AdminGeneralSettings
        fields = [
            'id', 'admin_user', 'admin_user_name', 'full_name', 'email', 'phone', 
            'role', 'department', 'account_status', 'profile_image', 'bio',
            'last_login_display', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'admin_user_name', 
                           'full_name', 'email', 'phone', 'role', 'last_login_display']


class InvoiceMetaSettingsSerializer(serializers.ModelSerializer):
    """Serializer for InvoiceMetaSettings model"""
    
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = InvoiceMetaSettings
        fields = [
            'id', 'company_logo', 'theme_color', 'secondary_color', 'invoice_notes',
            'invoice_number_format', 'invoice_counter', 'selected_template',
            'show_company_address', 'show_payment_terms', 'show_due_date',
            'invoice_footer_text', 'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by_name', 'invoice_counter']
    
    def validate_theme_color(self, value):
        """Validate hex color format"""
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
            raise serializers.ValidationError("Color must be in hex format (#RRGGBB)")
        return value
    
    def validate_secondary_color(self, value):
        """Validate hex color format"""
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
            raise serializers.ValidationError("Color must be in hex format (#RRGGBB)")
        return value


class CompanyOfficeSerializer(serializers.ModelSerializer):
    """Serializer for CompanyOffice model"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    warehouse_count = serializers.IntegerField(source='warehouses.count', read_only=True)
    
    class Meta:
        model = CompanyOffice
        fields = [
            'id', 'office_image', 'office_name', 'phone_number', 'country',
            'physical_address', 'digital_address', 'latitude', 'longitude',
            'map_link', 'is_active', 'is_headquarters', 'operating_hours',
            'timezone', 'has_coordinates', 'warehouse_count',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name', 
                           'has_coordinates', 'warehouse_count']
    
    def validate(self, data):
        """Validate coordinates if provided"""
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if (latitude is not None and longitude is None) or (latitude is None and longitude is not None):
            raise serializers.ValidationError(
                "Both latitude and longitude must be provided together or both left empty"
            )
        
        if latitude is not None:
            if not (-90 <= latitude <= 90):
                raise serializers.ValidationError("Latitude must be between -90 and 90")
        
        if longitude is not None:
            if not (-180 <= longitude <= 180):
                raise serializers.ValidationError("Longitude must be between -180 and 180")
        
        return data


class WarehouseAddressSerializer(serializers.ModelSerializer):
    """Serializer for WarehouseAddress model"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = WarehouseAddress
        fields = [
            'id', 'name', 'location', 'address', 'description',
            'is_active', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']


class ShippingMarkFormattingRuleSerializer(serializers.ModelSerializer):
    """Serializer for ShippingMarkFormattingRule model"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ShippingMarkFormattingRule
        fields = [
            'id', 'rule_name', 'description', 'country', 'region', 'prefix_value',
            'format_template', 'priority', 'is_active', 'is_default',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']
    
    def validate(self, data):
        """Validate rule uniqueness"""
        instance = getattr(self, 'instance', None)
        
        # Check for existing rule with same country, region, prefix_value
        existing = ShippingMarkFormattingRule.objects.filter(
            country=data.get('country'),
            region=data.get('region'),
            prefix_value=data.get('prefix_value')
        )
        
        if instance:
            existing = existing.exclude(pk=instance.pk)
        
        if existing.exists():
            raise serializers.ValidationError(
                "A rule with this country, region, and prefix value already exists"
            )
        
        return data


class ShippingMarkFormatSettingsSerializer(serializers.ModelSerializer):
    """Serializer for ShippingMarkFormatSettings model"""
    
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = ShippingMarkFormatSettings
        fields = [
            'id', 'base_prefix', 'default_format_template', 'auto_generate_enabled',
            'allow_duplicates', 'append_counter_on_duplicate', 'max_name_length',
            'use_nickname_if_available', 'min_shipping_mark_length', 'max_shipping_mark_length',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by_name']


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for SystemSettings model"""
    
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'app_name', 'app_version', 'maintenance_mode', 'maintenance_message',
            'jwt_expiry_minutes', 'max_login_attempts', 'password_reset_expiry_hours',
            'api_rate_limit_per_minute', 'sms_rate_limit_per_hour',
            'max_file_size_mb', 'allowed_file_extensions',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by_name']
    
    def validate_allowed_file_extensions(self, value):
        """Validate file extensions format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of file extensions")
        
        for ext in value:
            if not isinstance(ext, str) or not ext.startswith('.'):
                raise serializers.ValidationError("Extensions must start with '.' (e.g., '.pdf')")
        
        return value


class CompanySettingsSerializer(serializers.ModelSerializer):
    """Serializer for CompanySettings model"""
    
    default_client_name = serializers.CharField(source='default_client_assignment.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = CompanySettings
        fields = [
            'id', 'company_name', 'company_email', 'company_phone', 'company_address',
            'company_website', 'default_currency', 'fiscal_year_start_month',
            'business_hours_start', 'business_hours_end', 'business_days',
            'shipping_mark_prefix', 'auto_generate_shipping_marks', 'shipping_mark_format',
            'default_client_assignment', 'default_client_name',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'default_client_name', 'updated_by_name']
    
    def validate_business_days(self, value):
        """Validate business days format"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of day numbers")
        
        for day in value:
            if not isinstance(day, int) or day < 0 or day > 6:
                raise serializers.ValidationError("Days must be integers between 0-6 (0=Monday, 6=Sunday)")
        
        return value
    
    def validate_default_client_assignment(self, value):
        """Validate default client is a customer"""
        if value and value.user_role not in ['CUSTOMER']:
            raise serializers.ValidationError("Default client must be a customer user")
        return value


class NotificationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for NotificationSettings model"""
    
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = NotificationSettings
        fields = [
            'id', 'email_notifications_enabled', 'email_host', 'email_port', 'email_use_tls',
            'email_from_address', 'sms_notifications_enabled', 'twilio_account_sid',
            'twilio_auth_token', 'twilio_phone_number', 'sms_console_mode',
            'welcome_email_template', 'shipment_arrival_template', 'delivery_ready_template',
            'admin_alert_email', 'system_error_notifications', 'low_capacity_threshold',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'updated_by_name']
    
    def validate_email_port(self, value):
        """Validate email port range"""
        if value < 1 or value > 65535:
            raise serializers.ValidationError("Port must be between 1 and 65535")
        return value
    
    def validate_low_capacity_threshold(self, value):
        """Validate capacity threshold range"""
        if value < 50 or value > 99:
            raise serializers.ValidationError("Threshold must be between 50 and 99 percent")
        return value


# New Dashboard-specific serializers
class DashboardSettingsSerializer(serializers.Serializer):
    """Serializer to return all dashboard settings in one response"""
    
    admin_general = AdminGeneralSettingsSerializer(read_only=True)
    invoice_meta = InvoiceMetaSettingsSerializer(read_only=True)
    shipping_mark_format = ShippingMarkFormatSettingsSerializer(read_only=True)
    system_settings = SystemSettingsSerializer(read_only=True)
    company_settings = CompanySettingsSerializer(read_only=True)
    notification_settings = NotificationSettingsSerializer(read_only=True)
    company_offices = CompanyOfficeSerializer(many=True, read_only=True)
    warehouse_addresses = WarehouseAddressSerializer(many=True, read_only=True)
    shipping_mark_rules = ShippingMarkFormattingRuleSerializer(many=True, read_only=True)


class ShippingMarkPreviewSerializer(serializers.Serializer):
    """Serializer for shipping mark preview"""
    
    client_name = serializers.CharField()
    nickname = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    region = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Generate shipping mark preview"""
        settings_obj = ShippingMarkFormatSettings.objects.first()
        if not settings_obj:
            raise serializers.ValidationError("Shipping mark settings not configured")
        
        # Generate preview
        shipping_mark = settings_obj.generate_shipping_mark(data)
        data['preview'] = shipping_mark
        
        # Find applicable rule
        rule = ShippingMarkFormattingRule.get_rule_for_client(
            data.get('country'), data.get('region')
        )
        data['applied_rule'] = rule.rule_name if rule else 'Default'
        
        return data


# Summary serializers for dashboard
class SettingsSummarySerializer(serializers.Serializer):
    """Summary of settings for dashboard"""
    
    total_offices = serializers.IntegerField()
    active_offices = serializers.IntegerField()
    total_warehouses = serializers.IntegerField()
    active_warehouses = serializers.IntegerField()
    admin_general_configured = serializers.BooleanField()
    invoice_meta_configured = serializers.BooleanField()
    shipping_marks_configured = serializers.BooleanField()
    system_maintenance_mode = serializers.BooleanField()
    notifications_enabled = serializers.BooleanField()
    last_updated = serializers.DateTimeField()


class AdminMessageSerializer(serializers.ModelSerializer):
    """Serializer for AdminMessage model"""
    
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    target_client_names = serializers.SerializerMethodField()
    
    class Meta:
        model = AdminMessage
        fields = [
            'id', 'title', 'message', 'priority', 'sender', 'sender_name',
            'is_broadcast', 'target_shipping_marks', 'target_clients',
            'target_client_names', 'created_at', 'sent_at', 'total_recipients', 'read_count'
        ]
        read_only_fields = ['id', 'created_at', 'sent_at', 'total_recipients', 'read_count', 'sender_name']
    
    def get_target_client_names(self, obj):
        """Get names of target clients"""
        if obj.is_broadcast:
            return ["All Clients"]
        
        names = []
        if obj.target_clients.exists():
            names.extend([client.get_full_name() for client in obj.target_clients.all()])
        
        if obj.target_shipping_marks:
            from users.models import CustomerUser
            shipping_clients = CustomerUser.objects.filter(
                shipping_mark__in=obj.target_shipping_marks
            ).values_list('first_name', 'last_name', 'shipping_mark')
            names.extend([f"{first} {last} ({mark})" for first, last, mark in shipping_clients])
        
        return names if names else ["No recipients"]
    
    def validate(self, data):
        """Validate that either broadcast is True or recipients are specified"""
        if not data.get('is_broadcast', False):
            if not data.get('target_shipping_marks') and not data.get('target_clients'):
                raise serializers.ValidationError(
                    "Either set is_broadcast=True or specify target_shipping_marks/target_clients"
                )
        return data


class CreateAdminMessageSerializer(serializers.Serializer):
    """Serializer for creating admin messages with simplified input"""
    
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'], default='medium')
    recipients = serializers.CharField(allow_blank=True, required=False)  # "all" or comma-separated client IDs
    shipping_marks = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True
    )
    
    def validate_recipients(self, value):
        """Validate recipients format"""
        if value and value != "all":
            try:
                # Try to parse as comma-separated integers
                client_ids = [int(id.strip()) for id in value.split(',') if id.strip()]
                return client_ids
            except ValueError:
                raise serializers.ValidationError("Recipients must be 'all' or comma-separated client IDs")
        return value
    
    def create(self, validated_data):
        """Create AdminMessage from simplified data"""
        recipients = validated_data.pop('recipients', None)
        shipping_marks = validated_data.pop('shipping_marks', [])
        
        # Create the admin message
        admin_message = AdminMessage.objects.create(
            **validated_data,
            sender=self.context['request'].user,
            is_broadcast=(recipients == "all"),
            target_shipping_marks=shipping_marks
        )
        
        # Add target clients if specific IDs provided
        if recipients and recipients != "all":
            from users.models import CustomerUser
            target_clients = CustomerUser.objects.filter(
                id__in=recipients,
                user_role='CUSTOMER'
            )
            admin_message.target_clients.set(target_clients)
        
        return admin_message


class ClientNotificationSerializer(serializers.ModelSerializer):
    """Serializer for ClientNotification model"""
    
    admin_message_title = serializers.CharField(source='admin_message.title', read_only=True)
    sender_name = serializers.CharField(source='admin_message.sender.get_full_name', read_only=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    read = serializers.BooleanField(source='is_read', read_only=True)
    
    class Meta:
        model = ClientNotification
        fields = [
            'id', 'title', 'message', 'priority', 'notification_type', 'warehouse', 
            'metadata', 'is_read', 'read', 'action_required', 'read_at', 'created_at',
            'timestamp', 'admin_message_title', 'sender_name'
        ]
        read_only_fields = [
            'id', 'created_at', 'timestamp', 'admin_message_title', 'sender_name', 'read'
        ]


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    
    total_notifications = serializers.IntegerField()
    unread_notifications = serializers.IntegerField()
    high_priority_unread = serializers.IntegerField()
    recent_messages = serializers.IntegerField()
    last_notification = serializers.DateTimeField()
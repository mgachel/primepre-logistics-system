from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    AdminGeneralSettings, InvoiceMetaSettings, CompanyOffice, WarehouseAddress,
    ShippingMarkFormattingRule, ShippingMarkFormatSettings,
    SystemSettings, CompanySettings, NotificationSettings,
    AdminMessage, ClientNotification
)


@admin.register(AdminGeneralSettings)
class AdminGeneralSettingsAdmin(admin.ModelAdmin):
    """Admin interface for AdminGeneralSettings"""
    
    list_display = [
        'admin_user', 'full_name', 'role', 'account_status', 'updated_at'
    ]
    list_filter = ['account_status', 'role', 'updated_at']
    search_fields = ['full_name', 'email', 'phone']
    readonly_fields = ['full_name', 'email', 'phone', 'role', 'last_login_display', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Admin User', {
            'fields': ('admin_user',)
        }),
        ('Profile Information (Auto-populated)', {
            'fields': ('full_name', 'email', 'phone', 'role', 'last_login_display'),
            'classes': ('collapse',)
        }),
        ('Additional Settings', {
            'fields': ('department', 'account_status', 'profile_image', 'bio')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(InvoiceMetaSettings)
class InvoiceMetaSettingsAdmin(admin.ModelAdmin):
    """Admin interface for InvoiceMetaSettings"""
    
    list_display = [
        'selected_template', 'theme_color_display', 'invoice_counter', 'updated_at'
    ]
    readonly_fields = ['created_at', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Visual Settings', {
            'fields': ('company_logo', 'theme_color', 'secondary_color', 'selected_template')
        }),
        ('Invoice Configuration', {
            'fields': ('invoice_number_format', 'invoice_counter', 'invoice_notes', 'invoice_footer_text')
        }),
        ('Display Options', {
            'fields': ('show_company_address', 'show_payment_terms', 'show_due_date')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def theme_color_display(self, obj):
        """Display theme color with visual indicator"""
        return format_html(
            '<span style="background-color: {}; padding: 2px 8px; color: white; border-radius: 3px;">{}</span>',
            obj.theme_color, obj.theme_color
        )
    theme_color_display.short_description = 'Theme Color'
    
    def has_add_permission(self, request):
        return not InvoiceMetaSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CompanyOffice)
class CompanyOfficeAdmin(admin.ModelAdmin):
    """Admin interface for CompanyOffice"""
    
    list_display = [
        'office_name', 'country', 'phone_number', 'is_active', 'is_headquarters',
        'coordinates_status', 'warehouse_count_display', 'created_at'
    ]
    list_filter = ['country', 'is_active', 'is_headquarters']
    search_fields = ['office_name', 'country', 'physical_address']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'has_coordinates']
    
    fieldsets = (
        ('Office Information', {
            'fields': ('office_image', 'office_name', 'phone_number', 'country')
        }),
        ('Address Details', {
            'fields': ('physical_address', 'digital_address')
        }),
        ('Location Coordinates', {
            'fields': ('latitude', 'longitude', 'map_link', 'has_coordinates')
        }),
        ('Status & Operations', {
            'fields': ('is_active', 'is_headquarters', 'operating_hours', 'timezone')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    def coordinates_status(self, obj):
        """Display coordinates status"""
        if obj.has_coordinates:
            return format_html(
                '<span style="color: green;">✓ Available</span>'
            )
        return format_html('<span style="color: orange;">○ Not set</span>')
    coordinates_status.short_description = 'Coordinates'
    
    def warehouse_count_display(self, obj):
        """Display associated warehouse count"""
        count = obj.warehouses.count()
        if count > 0:
            url = reverse('admin:settings_warehouseaddress_changelist')
            return format_html(
                '<a href="{}?linked_office__id__exact={}">{} warehouse{}</a>',
                url, obj.id, count, 's' if count != 1 else ''
            )
        return '0 warehouses'
    warehouse_count_display.short_description = 'Warehouses'


@admin.register(WarehouseAddress)
class WarehouseAddressAdmin(admin.ModelAdmin):
    """Admin interface for WarehouseAddress"""
    
    list_display = [
        'name', 'location', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'location']
    search_fields = ['name', 'location', 'address']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Warehouse Information', {
            'fields': ('name', 'location', 'description')
        }),
        ('Address', {
            'fields': ('address',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ShippingMarkFormattingRule)
class ShippingMarkFormattingRuleAdmin(admin.ModelAdmin):
    """Admin interface for ShippingMarkFormattingRule"""
    
    list_display = [
        'rule_name', 'country', 'region', 'prefix_value', 'format_preview',
        'priority', 'is_active', 'is_default'
    ]
    list_filter = ['country', 'is_active', 'is_default', 'priority']
    search_fields = ['rule_name', 'country', 'region', 'prefix_value']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Rule Information', {
            'fields': ('rule_name', 'description', 'priority')
        }),
        ('Geographic Criteria', {
            'fields': ('country', 'region')
        }),
        ('Format Configuration', {
            'fields': ('prefix_value', 'format_template')
        }),
        ('Status', {
            'fields': ('is_active', 'is_default')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    def format_preview(self, obj):
        """Show preview of format"""
        preview = obj.generate_shipping_mark('TestClient')
        return format_html('<code>{}</code>', preview)
    format_preview.short_description = 'Format Preview'


@admin.register(ShippingMarkFormatSettings)
class ShippingMarkFormatSettingsAdmin(admin.ModelAdmin):
    """Admin interface for ShippingMarkFormatSettings"""
    
    list_display = [
        'base_prefix', 'auto_generate_enabled', 'max_name_length', 
        'allow_duplicates', 'updated_at'
    ]
    readonly_fields = ['created_at', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Base Configuration', {
            'fields': ('base_prefix', 'default_format_template')
        }),
        ('Auto-generation Settings', {
            'fields': ('auto_generate_enabled', 'allow_duplicates', 'append_counter_on_duplicate')
        }),
        ('Name Processing', {
            'fields': ('max_name_length', 'use_nickname_if_available')
        }),
        ('Validation Rules', {
            'fields': ('min_shipping_mark_length', 'max_shipping_mark_length')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not ShippingMarkFormatSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    """Admin interface for SystemSettings"""
    
    list_display = [
        'app_name', 'app_version', 'maintenance_mode', 'jwt_expiry_minutes',
        'max_login_attempts', 'updated_at'
    ]
    list_filter = ['maintenance_mode', 'updated_at']
    readonly_fields = ['created_at', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Application Settings', {
            'fields': ('app_name', 'app_version', 'maintenance_mode', 'maintenance_message')
        }),
        ('Authentication Settings', {
            'fields': ('jwt_expiry_minutes', 'max_login_attempts', 'password_reset_expiry_hours')
        }),
        ('Rate Limiting', {
            'fields': ('api_rate_limit_per_minute', 'sms_rate_limit_per_hour')
        }),
        ('File Upload Settings', {
            'fields': ('max_file_size_mb', 'allowed_file_extensions')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not SystemSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    """Admin interface for CompanySettings"""
    
    list_display = [
        'company_name', 'company_email', 'company_phone', 'default_currency',
        'auto_generate_shipping_marks', 'updated_at'
    ]
    readonly_fields = ['created_at', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Company Information', {
            'fields': ('company_logo', 'company_name', 'registration_number', 'tax_id')
        }),
        ('Contact Information', {
            'fields': ('company_email', 'company_phone', 'company_address')
        }),
        ('Business Settings', {
            'fields': ('default_currency', 'business_hours_start', 'business_hours_end', 'business_timezone')
        }),
        ('Shipping Configuration', {
            'fields': ('auto_generate_shipping_marks', 'shipping_mark_prefix', 'default_warehouse_location')
        }),
        ('Invoice Settings', {
            'fields': ('invoice_terms_and_conditions', 'default_payment_terms_days')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not CompanySettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    """Admin interface for NotificationSettings"""
    
    list_display = [
        'email_notifications_enabled', 'sms_notifications_enabled', 'system_error_notifications', 
        'low_capacity_threshold', 'updated_at'
    ]
    readonly_fields = ['created_at', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Notification Types', {
            'fields': ('email_notifications', 'sms_notifications', 'push_notifications')
        }),
        ('Email Configuration', {
            'fields': ('email_on_shipment_updates', 'email_on_claims_updates', 
                      'email_on_invoice_generation', 'email_daily_summary')
        }),
        ('SMS Configuration', {
            'fields': ('sms_on_critical_updates', 'sms_on_delivery_confirmation',
                      'sms_provider_config')
        }),
        ('General Settings', {
            'fields': ('notification_frequency', 'quiet_hours_start', 'quiet_hours_end')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        return not NotificationSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False


# Customize admin site header and title
admin.site.site_header = "PrimePre Logistics - Settings Administration"
admin.site.site_title = "Settings Admin"
admin.site.index_title = "Settings Management"


@admin.register(AdminMessage)
class AdminMessageAdmin(admin.ModelAdmin):
    """Admin interface for AdminMessage model"""
    
    list_display = [
        'title', 'sender', 'priority', 'is_broadcast', 'total_recipients',
        'read_count', 'read_rate', 'created_at'
    ]
    list_filter = ['priority', 'is_broadcast', 'created_at', 'sender']
    search_fields = ['title', 'message', 'sender__first_name', 'sender__last_name']
    readonly_fields = ['created_at', 'sent_at', 'total_recipients', 'read_count']
    filter_horizontal = ['target_clients']
    
    fieldsets = (
        ('Message Content', {
            'fields': ('title', 'message', 'priority')
        }),
        ('Sender Information', {
            'fields': ('sender',)
        }),
        ('Recipients', {
            'fields': ('is_broadcast', 'target_shipping_marks', 'target_clients')
        }),
        ('Statistics', {
            'fields': ('total_recipients', 'read_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'sent_at'),
            'classes': ('collapse',)
        }),
    )
    
    def read_rate(self, obj):
        """Calculate read rate percentage"""
        if obj.total_recipients > 0:
            rate = (obj.read_count / obj.total_recipients) * 100
            return f"{rate:.1f}%"
        return "0%"
    read_rate.short_description = "Read Rate"
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('sender')
    
    def has_delete_permission(self, request, obj=None):
        """Only super admins can delete messages"""
        return request.user.user_role == 'SUPER_ADMIN'
    
    def save_model(self, request, obj, form, change):
        """Set sender to current user if not set"""
        if not change:  # Creating new message
            obj.sender = request.user
        super().save_model(request, obj, form, change)


@admin.register(ClientNotification)
class ClientNotificationAdmin(admin.ModelAdmin):
    """Admin interface for ClientNotification model"""
    
    list_display = [
        'title', 'recipient', 'notification_type', 'priority', 'is_read',
        'action_required', 'created_at'
    ]
    list_filter = [
        'notification_type', 'priority', 'is_read', 'action_required', 
        'created_at', 'warehouse'
    ]
    search_fields = [
        'title', 'message', 'recipient__first_name', 'recipient__last_name',
        'recipient__shipping_mark'
    ]
    readonly_fields = ['created_at', 'read_at', 'admin_message']
    
    fieldsets = (
        ('Notification Content', {
            'fields': ('title', 'message', 'priority', 'notification_type')
        }),
        ('Recipient Information', {
            'fields': ('recipient', 'admin_message')
        }),
        ('Context & Metadata', {
            'fields': ('warehouse', 'metadata', 'action_required')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related(
            'recipient', 'admin_message'
        )
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        """Mark selected notifications as read"""
        updated = 0
        for notification in queryset:
            if not notification.is_read:
                notification.mark_as_read()
                updated += 1
        self.message_user(request, f'{updated} notifications marked as read.')
    mark_as_read.short_description = "Mark selected notifications as read"
    
    def mark_as_unread(self, request, queryset):
        """Mark selected notifications as unread"""
        updated = 0
        for notification in queryset:
            if notification.is_read:
                notification.mark_as_unread()
                updated += 1
        self.message_user(request, f'{updated} notifications marked as unread.')
    mark_as_unread.short_description = "Mark selected notifications as unread"
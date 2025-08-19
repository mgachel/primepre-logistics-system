from django.contrib import admin
from .models import Claim


@admin.register(Claim)
class ClaimAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'tracking_id', 'item_name', 'customer_name', 
        'shipping_mark', 'status', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'updated_at']
    search_fields = [
        'tracking_id', 'item_name', 'item_description', 
        'shipping_mark', 'customer__first_name', 'customer__last_name'
    ]
    readonly_fields = ['created_at', 'updated_at', 'shipping_mark', 'days_since_submission']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Claim Information', {
            'fields': ('customer', 'tracking_id', 'item_name', 'item_description')
        }),
        ('Status & Review', {
            'fields': ('status', 'admin_notes')
        }),
        ('Metadata', {
            'fields': ('shipping_mark', 'created_at', 'updated_at', 'days_since_submission'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        return obj.customer_name
    customer_name.short_description = 'Customer Name'
    
    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete claims
        return request.user.is_superuser
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('customer')

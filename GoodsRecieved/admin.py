from django.contrib import admin
from .models import GoodsReceivedChina, GoodsReceivedGhana

@admin.register(GoodsReceivedChina)
class GoodsReceivedChinaAdmin(admin.ModelAdmin):
    list_display = [
        'item_id', 
        'shipping_mark', 
        'status', 
        'location',
        'quantity', 
        'weight', 
        'cbm',
        'days_in_warehouse',
        'date_received'
    ]
    
    list_filter = [
        'status', 
        'location', 
        'date_received',
        'created_at'
    ]
    
    search_fields = [
        'item_id',
        'shipping_mark', 
        'supply_tracking',
        'supplier_name',
        'description'
    ]
    
    readonly_fields = [
        'item_id', 
        'date_received', 
        'created_at', 
        'updated_at',
        'days_in_warehouse'
    ]
    
    fieldsets = (
        ('Identification', {
            'fields': ('item_id', 'shipping_mark', 'supply_tracking')
        }),
        ('Physical Properties', {
            'fields': ('quantity', 'weight', 'cbm', 'description')
        }),
        ('Location & Status', {
            'fields': ('location', 'status')
        }),
        ('Supplier Information', {
            'fields': ('supplier_name', 'estimated_value'),
            'classes': ('collapse',)
        }),
        ('Notes & Tracking', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('date_received', 'created_at', 'updated_at', 'days_in_warehouse'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ['-date_received']
    
    actions = ['mark_ready_for_shipping', 'flag_selected_goods', 'mark_as_shipped']
    
    def mark_ready_for_shipping(self, request, queryset):
        updated = queryset.update(status='READY_FOR_SHIPPING')
        self.message_user(request, f'{updated} goods marked as ready for shipping.')
    mark_ready_for_shipping.short_description = "Mark selected goods as ready for shipping"
    
    def flag_selected_goods(self, request, queryset):
        updated = queryset.update(status='FLAGGED')
        self.message_user(request, f'{updated} goods flagged.')
    flag_selected_goods.short_description = "Flag selected goods"
    
    def mark_as_shipped(self, request, queryset):
        updated = queryset.update(status='SHIPPED')
        self.message_user(request, f'{updated} goods marked as shipped.')
    mark_as_shipped.short_description = "Mark selected goods as shipped"
    
    def days_in_warehouse(self, obj):
        return obj.days_in_warehouse
    days_in_warehouse.short_description = "Days in Warehouse"
    days_in_warehouse.admin_order_field = 'date_received'

@admin.register(GoodsReceivedGhana)
class GoodsReceivedGhanaAdmin(admin.ModelAdmin):
    list_display = [
        'item_id', 
        'shipping_mark', 
        'status', 
        'location',
        'quantity', 
        'weight', 
        'cbm',
        'days_in_warehouse',
        'date_received'
    ]
    
    list_filter = [
        'status', 
        'location', 
        'date_received',
        'created_at'
    ]
    
    search_fields = [
        'item_id',
        'shipping_mark', 
        'supply_tracking',
        'supplier_name',
        'description'
    ]
    
    readonly_fields = [
        'item_id', 
        'date_received', 
        'created_at', 
        'updated_at',
        'days_in_warehouse'
    ]
    
    fieldsets = (
        ('Identification', {
            'fields': ('item_id', 'shipping_mark', 'supply_tracking')
        }),
        ('Physical Properties', {
            'fields': ('quantity', 'weight', 'cbm', 'description')
        }),
        ('Location & Status', {
            'fields': ('location', 'status')
        }),
        ('Supplier Information', {
            'fields': ('supplier_name', 'estimated_value'),
            'classes': ('collapse',)
        }),
        ('Notes & Tracking', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('date_received', 'created_at', 'updated_at', 'days_in_warehouse'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ['-date_received']
    
    actions = ['mark_ready_for_shipping', 'flag_selected_goods', 'mark_as_shipped']
    
    def mark_ready_for_shipping(self, request, queryset):
        updated = queryset.update(status='READY_FOR_SHIPPING')
        self.message_user(request, f'{updated} goods marked as ready for shipping.')
    mark_ready_for_shipping.short_description = "Mark selected goods as ready for shipping"
    
    def flag_selected_goods(self, request, queryset):
        updated = queryset.update(status='FLAGGED')
        self.message_user(request, f'{updated} goods flagged.')
    flag_selected_goods.short_description = "Flag selected goods"
    
    def mark_as_shipped(self, request, queryset):
        updated = queryset.update(status='SHIPPED')
        self.message_user(request, f'{updated} goods marked as shipped.')
    mark_as_shipped.short_description = "Mark selected goods as shipped"
    
    def days_in_warehouse(self, obj):
        return obj.days_in_warehouse
    days_in_warehouse.short_description = "Days in Warehouse"
    days_in_warehouse.admin_order_field = 'date_received'

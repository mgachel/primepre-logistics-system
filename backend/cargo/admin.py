from django.contrib import admin
from .models import CargoContainer, CargoItem, ClientShipmentSummary


@admin.register(CargoContainer)
class CargoContainerAdmin(admin.ModelAdmin):
    list_display = [
        'container_id', 'cargo_type', 'status', 'load_date', 'eta', 
        'route', 'total_cargo_items', 'total_clients', 'is_demurrage'
    ]
    list_filter = ['cargo_type', 'status', 'load_date', 'eta']
    search_fields = ['container_id', 'route']
    readonly_fields = ['total_cargo_items', 'total_clients', 'is_demurrage', 'created_at', 'updated_at']
    date_hierarchy = 'load_date'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('container_id', 'cargo_type', 'status')
        }),
        ('Cargo Details', {
            'fields': ('weight', 'cbm', 'route', 'rates')
        }),
        ('Schedule', {
            'fields': ('load_date', 'eta', 'unloading_date', 'stay_days', 'delay_days')
        }),
        ('Statistics', {
            'fields': ('total_cargo_items', 'total_clients', 'is_demurrage'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


class CargoItemInline(admin.TabularInline):
    model = CargoItem
    extra = 0
    readonly_fields = ['tracking_id', 'created_at']
    fields = [
        'client', 'item_description', 'quantity', 'cbm', 'status', 'tracking_id'
    ]


@admin.register(CargoItem)
class CargoItemAdmin(admin.ModelAdmin):
    list_display = [
        'tracking_id', 'container', 'client', 'item_description', 
        'quantity', 'cbm', 'status', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'container__cargo_type']
    search_fields = ['tracking_id', 'item_description', 'client__shipping_mark', 'client__first_name', 'client__last_name']
    readonly_fields = ['id', 'tracking_id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('container', 'client', 'tracking_id', 'status')
        }),
        ('Item Details', {
            'fields': ('item_description', 'quantity', 'weight', 'cbm')
        }),
        
        ('Financial', {
            'fields': ('unit_value', 'total_value')
        }),
        ('Delivery', {
            'fields': ('delivered_date',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(ClientShipmentSummary)
class ClientShipmentSummaryAdmin(admin.ModelAdmin):
    list_display = [
        'assigned_tracking', 'container', 'client', 'total_cbm', 
        'total_quantity', 'status'
    ]
    list_filter = ['status', 'container__cargo_type', 'created_at']
    search_fields = ['assigned_tracking', 'client__shipping_mark', 'client__first_name', 'client__last_name', 'container__container_id']
    readonly_fields = [
        'assigned_tracking', 'total_cbm', 'total_quantity', 'created_at'
    ]
    
    actions = ['update_totals']
    
    def update_totals(self, request, queryset):
        updated = 0
        for summary in queryset:
            summary.update_totals()
            updated += 1
        self.message_user(request, f'Updated totals for {updated} client summaries.')
    update_totals.short_description = "Update totals for selected summaries"

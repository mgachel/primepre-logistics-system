from django.contrib import admin
from django.shortcuts import render, redirect
from django.contrib import messages
from django.urls import path, reverse
from django.utils.html import format_html
from django.http import HttpResponseRedirect
from django.conf import settings
import pandas as pd
import os
from datetime import datetime
from .models import CargoContainer, CargoItem, ClientShipmentSummary
from users.models import CustomerUser


@admin.register(CargoContainer)
class CargoContainerAdmin(admin.ModelAdmin):
    list_display = [
        'container_id', 'cargo_type', 'status', 'load_date', 'eta', 
        'route', 'total_cargo_items', 'total_clients', 'is_demurrage', 'upload_excel_button'
    ]
    list_filter = ['cargo_type', 'status', 'load_date', 'eta']
    search_fields = ['container_id', 'route']
    readonly_fields = ['total_cargo_items', 'total_clients', 'is_demurrage', 'created_at', 'updated_at']
    date_hierarchy = 'load_date'
    actions = ['bulk_upload_excel']
    
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

    def upload_excel_button(self, obj):
        """Add Excel upload button for each container"""
        if obj.pk:
            url = reverse('admin:cargo_upload_excel', args=[obj.pk])
            return format_html('<a class="button" href="{}">Upload Excel</a>', url)
        return "Save container first"
    upload_excel_button.short_description = "Excel Upload"
    upload_excel_button.allow_tags = True

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('upload-excel/<int:container_id>/', 
                 self.admin_site.admin_view(self.upload_excel_view), 
                 name='cargo_upload_excel'),
            path('bulk-upload-excel/', 
                 self.admin_site.admin_view(self.bulk_upload_excel_view), 
                 name='cargo_bulk_upload_excel'),
        ]
        return custom_urls + urls

    def upload_excel_view(self, request, container_id):
        """Handle Excel upload for a specific container"""
        container = CargoContainer.objects.get(pk=container_id)
        
        if request.method == 'POST':
            if 'excel_file' not in request.FILES:
                messages.error(request, 'No Excel file uploaded.')
                return redirect('admin:cargo_cargocontainer_change', container_id)
            
            excel_file = request.FILES['excel_file']
            
            try:
                # Read Excel file
                df = pd.read_excel(excel_file)
                
                # Expected columns
                required_columns = [
                    'shipping_mark', 'item_description', 'quantity', 'cbm'
                ]
                
                # Check if required columns exist
                missing_columns = [col for col in required_columns if col not in df.columns]
                if missing_columns:
                    messages.error(request, f'Missing required columns: {", ".join(missing_columns)}')
                    return redirect('admin:cargo_cargocontainer_change', container_id)
                
                created_items = 0
                errors = []
                
                for index, row in df.iterrows():
                    try:
                        # Get customer by shipping mark
                        try:
                            client = CustomerUser.objects.get(shipping_mark=row['shipping_mark'])
                        except CustomerUser.DoesNotExist:
                            errors.append(f"Row {index + 2}: Customer with shipping mark '{row['shipping_mark']}' not found")
                            continue
                        
                        # Create cargo item
                        cargo_item = CargoItem.objects.create(
                            container=container,
                            client=client,
                            item_description=row['item_description'],
                            quantity=int(row['quantity']),
                            cbm=float(row['cbm']),
                            weight=float(row.get('weight', 0)) if pd.notna(row.get('weight')) and row.get('weight') else None,
                            unit_value=float(row.get('unit_value', 0)) if pd.notna(row.get('unit_value')) and row.get('unit_value') else None,
                            total_value=float(row.get('total_value', 0)) if pd.notna(row.get('total_value')) and row.get('total_value') else None,
                            package_type=row.get('package_type', 'Carton'),
                            package_count=int(row.get('package_count', 1)) if pd.notna(row.get('package_count')) else 1,
                            status=row.get('status', 'pending')
                        )
                        
                        created_items += 1
                        
                        # Update client shipment summary
                        from .models import ClientShipmentSummary
                        summary, created = ClientShipmentSummary.objects.get_or_create(
                            container=container,
                            client=client
                        )
                        summary.update_totals()
                        
                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                
                if created_items > 0:
                    messages.success(request, f'Successfully created {created_items} cargo items.')
                
                if errors:
                    for error in errors[:5]:  # Show first 5 errors
                        messages.error(request, error)
                    if len(errors) > 5:
                        messages.error(request, f'...and {len(errors) - 5} more errors.')
                
                return redirect('admin:cargo_cargocontainer_change', container_id)
                
            except Exception as e:
                messages.error(request, f'Failed to process Excel file: {str(e)}')
                return redirect('admin:cargo_cargocontainer_change', container_id)
        
        context = {
            'container': container,
            'title': f'Upload Excel for Container {container.container_id}',
            'opts': self.model._meta,
            'has_file_field': True,
        }
        
        return render(request, 'admin/cargo/upload_excel.html', context)

    def bulk_upload_excel_view(self, request):
        """Handle bulk Excel upload for multiple containers"""
        if request.method == 'POST':
            if 'excel_file' not in request.FILES:
                messages.error(request, 'No Excel file uploaded.')
                return redirect('admin:cargo_cargocontainer_changelist')
            
            excel_file = request.FILES['excel_file']
            
            try:
                # Read Excel file
                df = pd.read_excel(excel_file)
                
                # Expected columns for bulk upload
                required_columns = [
                    'container_id', 'shipping_mark', 'item_description', 'quantity', 'cbm'
                ]
                
                # Check if required columns exist
                missing_columns = [col for col in required_columns if col not in df.columns]
                if missing_columns:
                    messages.error(request, f'Missing required columns: {", ".join(missing_columns)}')
                    return redirect('admin:cargo_cargocontainer_changelist')
                
                created_items = 0
                errors = []
                
                for index, row in df.iterrows():
                    try:
                        # Get container
                        try:
                            container = CargoContainer.objects.get(container_id=row['container_id'])
                        except CargoContainer.DoesNotExist:
                            errors.append(f"Row {index + 2}: Container '{row['container_id']}' not found")
                            continue
                        
                        # Get customer by shipping mark
                        try:
                            client = CustomerUser.objects.get(shipping_mark=row['shipping_mark'])
                        except CustomerUser.DoesNotExist:
                            errors.append(f"Row {index + 2}: Customer with shipping mark '{row['shipping_mark']}' not found")
                            continue
                        
                        # Create cargo item
                        cargo_item = CargoItem.objects.create(
                            container=container,
                            client=client,
                            item_description=row['item_description'],
                            quantity=int(row['quantity']),
                            cbm=float(row['cbm']),
                            weight=float(row.get('weight', 0)) if pd.notna(row.get('weight')) and row.get('weight') else None,
                            unit_value=float(row.get('unit_value', 0)) if pd.notna(row.get('unit_value')) and row.get('unit_value') else None,
                            total_value=float(row.get('total_value', 0)) if pd.notna(row.get('total_value')) and row.get('total_value') else None,
                            package_type=row.get('package_type', 'Carton'),
                            package_count=int(row.get('package_count', 1)) if pd.notna(row.get('package_count')) else 1,
                            status=row.get('status', 'pending')
                        )
                        
                        created_items += 1
                        
                        # Update client shipment summary
                        summary, created = ClientShipmentSummary.objects.get_or_create(
                            container=container,
                            client=client
                        )
                        summary.update_totals()
                        
                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                
                if created_items > 0:
                    messages.success(request, f'Successfully created {created_items} cargo items across multiple containers.')
                
                if errors:
                    for error in errors[:10]:  # Show first 10 errors
                        messages.error(request, error)
                    if len(errors) > 10:
                        messages.error(request, f'...and {len(errors) - 10} more errors.')
                
                return redirect('admin:cargo_cargocontainer_changelist')
                
            except Exception as e:
                messages.error(request, f'Failed to process Excel file: {str(e)}')
                return redirect('admin:cargo_cargocontainer_changelist')
        
        context = {
            'title': 'Bulk Upload Excel for Multiple Containers',
            'opts': self.model._meta,
            'has_file_field': True,
        }
        
        return render(request, 'admin/cargo/bulk_upload_excel.html', context)

    def bulk_upload_excel(self, request, queryset):
        """Admin action to redirect to bulk upload"""
        return HttpResponseRedirect(reverse('admin:cargo_bulk_upload_excel'))
    bulk_upload_excel.short_description = "Bulk upload Excel for selected containers"


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
    actions = ['export_to_excel', 'bulk_upload_excel']
    
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

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('bulk-upload/', 
                 self.admin_site.admin_view(self.bulk_upload_view), 
                 name='cargoitem_bulk_upload'),
            path('export-template/', 
                 self.admin_site.admin_view(self.export_template_view), 
                 name='cargoitem_export_template'),
        ]
        return custom_urls + urls

    def bulk_upload_view(self, request):
        """Handle bulk Excel upload for cargo items"""
        if request.method == 'POST':
            if 'excel_file' not in request.FILES:
                messages.error(request, 'No Excel file uploaded.')
                return redirect('admin:cargo_cargoitem_changelist')
            
            excel_file = request.FILES['excel_file']
            
            try:
                # Read Excel file
                df = pd.read_excel(excel_file)
                
                # Expected columns
                required_columns = [
                    'container_id', 'shipping_mark', 'item_description', 'quantity', 'cbm'
                ]
                
                # Check if required columns exist
                missing_columns = [col for col in required_columns if col not in df.columns]
                if missing_columns:
                    messages.error(request, f'Missing required columns: {", ".join(missing_columns)}')
                    return redirect('admin:cargo_cargoitem_changelist')
                
                created_items = 0
                errors = []
                
                for index, row in df.iterrows():
                    try:
                        # Get container
                        try:
                            container = CargoContainer.objects.get(container_id=row['container_id'])
                        except CargoContainer.DoesNotExist:
                            errors.append(f"Row {index + 2}: Container '{row['container_id']}' not found")
                            continue
                        
                        # Get customer by shipping mark
                        try:
                            client = CustomerUser.objects.get(shipping_mark=row['shipping_mark'])
                        except CustomerUser.DoesNotExist:
                            errors.append(f"Row {index + 2}: Customer with shipping mark '{row['shipping_mark']}' not found")
                            continue
                        
                        # Create cargo item
                        cargo_item = CargoItem.objects.create(
                            container=container,
                            client=client,
                            item_description=row['item_description'],
                            quantity=int(row['quantity']),
                            cbm=float(row['cbm']),
                            weight=float(row.get('weight', 0)) if pd.notna(row.get('weight')) and row.get('weight') else None,
                            unit_value=float(row.get('unit_value', 0)) if pd.notna(row.get('unit_value')) and row.get('unit_value') else None,
                            total_value=float(row.get('total_value', 0)) if pd.notna(row.get('total_value')) and row.get('total_value') else None,
                            package_type=row.get('package_type', 'Carton'),
                            package_count=int(row.get('package_count', 1)) if pd.notna(row.get('package_count')) else 1,
                            status=row.get('status', 'pending')
                        )
                        
                        created_items += 1
                        
                        # Update client shipment summary
                        summary, created = ClientShipmentSummary.objects.get_or_create(
                            container=container,
                            client=client
                        )
                        summary.update_totals()
                        
                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                
                if created_items > 0:
                    messages.success(request, f'Successfully created {created_items} cargo items.')
                
                if errors:
                    for error in errors[:10]:  # Show first 10 errors
                        messages.error(request, error)
                    if len(errors) > 10:
                        messages.error(request, f'...and {len(errors) - 10} more errors.')
                
                return redirect('admin:cargo_cargoitem_changelist')
                
            except Exception as e:
                messages.error(request, f'Failed to process Excel file: {str(e)}')
                return redirect('admin:cargo_cargoitem_changelist')
        
        context = {
            'title': 'Bulk Upload Cargo Items from Excel',
            'opts': self.model._meta,
            'has_file_field': True,
        }
        
        return render(request, 'admin/cargo/bulk_upload_cargoitems.html', context)

    def export_template_view(self, request):
        """Export Excel template for bulk upload"""
        import pandas as pd
        from django.http import HttpResponse
        import io
        
        # Create sample data
        sample_data = {
            'container_id': ['CONT001', 'CONT001', 'CONT002'],
            'shipping_mark': ['SM001', 'SM002', 'SM001'],
            'item_description': ['Electronics', 'Textiles', 'Furniture'],
            'quantity': [10, 25, 5],
            'cbm': [2.5, 1.8, 4.2],
            'weight': [150.5, 80.0, 300.0],
            'unit_value': [100.0, 25.0, 200.0],
            'total_value': [1000.0, 625.0, 1000.0],
            'package_type': ['Carton', 'Box', 'Pallet'],
            'package_count': [5, 10, 2],
            'status': ['pending', 'pending', 'pending']
        }
        
        df = pd.DataFrame(sample_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='CargoItems')
        
        output.seek(0)
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="cargo_items_template.xlsx"'
        
        return response

    def export_to_excel(self, request, queryset):
        """Export selected cargo items to Excel"""
        import pandas as pd
        from django.http import HttpResponse
        import io
        
        # Prepare data
        data = []
        for item in queryset:
            data.append({
                'tracking_id': item.tracking_id,
                'container_id': item.container.container_id,
                'shipping_mark': item.client.shipping_mark,
                'client_name': f"{item.client.first_name} {item.client.last_name}",
                'item_description': item.item_description,
                'quantity': item.quantity,
                'cbm': item.cbm,
                'weight': item.weight,
                'unit_value': item.unit_value,
                'total_value': item.total_value,
                'package_type': item.package_type,
                'package_count': item.package_count,
                'status': item.status,
                'created_at': item.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            })
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='CargoItems')
        
        output.seek(0)
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="cargo_items_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
        
        return response
    export_to_excel.short_description = "Export selected items to Excel"

    def bulk_upload_excel(self, request, queryset):
        """Admin action to redirect to bulk upload"""
        return HttpResponseRedirect(reverse('admin:cargoitem_bulk_upload'))
    bulk_upload_excel.short_description = "Bulk upload from Excel"


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

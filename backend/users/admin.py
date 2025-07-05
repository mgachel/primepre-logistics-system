from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.shortcuts import render, redirect
from django.contrib import messages
from django.urls import path, reverse
from django.utils.html import format_html
from django.http import HttpResponseRedirect, HttpResponse
from django.conf import settings
from django import forms
import pandas as pd
import io
from datetime import datetime
from .models import CustomerUser

class CustomUserCreationForm(UserCreationForm):
    """Custom form for creating users in admin"""
    class Meta:
        model = CustomerUser
        fields = ('phone', 'first_name', 'last_name', 'email', 'company_name', 
                 'region', 'shipping_mark', 'user_role', 'user_type')

class CustomUserChangeForm(UserChangeForm):
    """Custom form for editing users in admin"""
    class Meta:
        model = CustomerUser
        fields = '__all__'

@admin.register(CustomerUser)
class CustomerUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomerUser
    
    # List display in admin
    list_display = [
        'phone', 'get_full_name', 'shipping_mark', 'company_name',
        'user_role', 'user_type', 'region', 'warehouse_count', 
        'is_active', 'date_joined'
    ]
    
    # Filters in sidebar
    list_filter = [
        'user_role', 'user_type', 'region', 'is_active', 'is_staff', 
        'date_joined', 'can_create_users', 'can_manage_inventory',
    ]
    
    # Search fields
    search_fields = [
        'phone', 'first_name', 'last_name', 'email', 'company_name', 
        'shipping_mark', 'region'
    ]
    
    # Ordering
    ordering = ('-date_joined',)
    
    # Fields to display in detail view
    fieldsets = (
        ('Personal Information', {
            'fields': ('phone', 'password', 'first_name', 'last_name', 'email')
        }),
        ('Business Information', {
            'fields': ('company_name', 'shipping_mark', 'region', 'user_type')
        }),
        ('Permissions & Role', {
            'fields': (
                'user_role', 'is_active', 'is_staff', 'is_superuser',
                'groups', 'user_permissions'
            )
        }),
        ('Admin Permissions', {
            'fields': (
                'can_create_users', 'can_manage_inventory', 'can_view_analytics',
                'can_manage_admins', 'can_access_admin_panel'
            ),
            'classes': ('collapse',)
        }),
        ('Warehouse Access', {
            'fields': ('accessible_warehouses',),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined', 'last_login_ip'),
            'classes': ('collapse',)
        }),
        ('Created By', {
            'fields': ('created_by',),
            'classes': ('collapse',)
        })
    )
    
    # Fields for add user form
    add_fieldsets = (
        ('Required Information', {
            'fields': ('phone', 'password1', 'password2', 'first_name', 'last_name')
        }),
        ('Business Information', {
            'fields': ('company_name', 'shipping_mark', 'region', 'user_type')
        }),
        ('Role & Permissions', {
            'fields': ('user_role', 'is_active', 'is_staff')
        })
    )
    
    # Actions
    actions = ['activate_users', 'deactivate_users', 'make_customers', 'make_staff', 'export_users_csv', 'bulk_upload_excel']
    
    def activate_users(self, request, queryset):
        """Activate selected users"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user(s) were successfully activated.')
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        """Deactivate selected users"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user(s) were successfully deactivated.')
    deactivate_users.short_description = "Deactivate selected users"
    
    def make_customers(self, request, queryset):
        """Change role to customer"""
        updated = queryset.update(user_role='CUSTOMER')
        self.message_user(request, f'{updated} user(s) role changed to Customer.')
    make_customers.short_description = "Change role to Customer"
    
    def make_staff(self, request, queryset):
        """Change role to staff"""
        updated = queryset.update(user_role='STAFF', is_staff=True)
        self.message_user(request, f'{updated} user(s) role changed to Staff.')
    make_staff.short_description = "Change role to Staff"
    
    # Custom methods for list display
    def get_full_name(self, obj):
        """Display full name"""
        return obj.get_full_name()
    get_full_name.short_description = 'Full Name'
    
    def warehouse_count(self, obj):
        """Count accessible warehouses"""
        return len(obj.accessible_warehouses) if obj.accessible_warehouses else 0
    warehouse_count.short_description = 'Warehouses'
    
    # Override get_queryset for performance
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by')
    
    # Additional admin configurations and inline models
    class UserStatsInline(admin.TabularInline):
        """Inline to show user statistics"""
        model = CustomerUser
        fields = ('last_login', 'date_joined', 'is_active')
        readonly_fields = ('last_login', 'date_joined')
        extra = 0
        can_delete = False

    class CustomerUserFilter(admin.SimpleListFilter):
        """Custom filter for customer users"""
        title = 'Customer Type'
        parameter_name = 'customer_type'
        
        def lookups(self, request, model_admin):
            return (
                ('business_active', 'Active Business Users'),
                ('individual_active', 'Active Individual Users'),
                ('new_users', 'New Users (Last 30 days)'),
                ('admins', 'Admin Users'),
            )
        
        def queryset(self, request, queryset):
            from datetime import datetime, timedelta
            
            if self.value() == 'business_active':
                return queryset.filter(user_type='BUSINESS', is_active=True)
            elif self.value() == 'individual_active':
                return queryset.filter(user_type='INDIVIDUAL', is_active=True)
            elif self.value() == 'new_users':
                thirty_days_ago = datetime.now() - timedelta(days=30)
                return queryset.filter(date_joined__gte=thirty_days_ago)
            elif self.value() == 'admins':
                return queryset.filter(user_role__in=['ADMIN', 'MANAGER', 'SUPER_ADMIN'])

    def export_users_csv(modeladmin, request, queryset):
        """Export selected users to CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="users_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Phone', 'First Name', 'Last Name', 'Email', 'Company', 
            'Shipping Mark', 'User Role', 'User Type', 'Region', 
            'Date Joined', 'Is Active'
        ])
        
        for user in queryset:
            writer.writerow([
                user.phone, user.first_name, user.last_name, user.email,
                user.company_name, user.shipping_mark, user.user_role,
                user.user_type, user.region, user.date_joined, user.is_active
            ])
        
        return response

    export_users_csv.short_description = "Export selected users to CSV"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('bulk-upload-excel/', 
                 self.admin_site.admin_view(self.bulk_upload_excel_view), 
                 name='users_bulk_upload_excel'),
            path('export-template/', 
                 self.admin_site.admin_view(self.export_template_view), 
                 name='users_export_template'),
        ]
        return custom_urls + urls

    def bulk_upload_excel_view(self, request):
        """Handle bulk Excel upload for users"""
        if request.method == 'POST':
            if 'excel_file' not in request.FILES:
                messages.error(request, 'No Excel file uploaded.')
                return redirect('admin:users_customeruser_changelist')
            
            excel_file = request.FILES['excel_file']
            
            try:
                # Read Excel file
                df = pd.read_excel(excel_file)
                
                # Expected columns
                required_columns = [
                    'phone', 'first_name', 'last_name', 'email', 'company_name', 
                    'shipping_mark', 'user_role', 'user_type', 'region'
                ]
                
                # Check if required columns exist
                missing_columns = [col for col in required_columns if col not in df.columns]
                if missing_columns:
                    messages.error(request, f'Missing required columns: {", ".join(missing_columns)}')
                    return redirect('admin:users_customeruser_changelist')
                
                created_users = 0
                errors = []
                
                for index, row in df.iterrows():
                    try:
                        # Check if user already exists
                        if CustomerUser.objects.filter(phone=row['phone']).exists():
                            errors.append(f"Row {index + 2}: User with phone '{row['phone']}' already exists")
                            continue
                        
                        if CustomerUser.objects.filter(shipping_mark=row['shipping_mark']).exists():
                            errors.append(f"Row {index + 2}: User with shipping mark '{row['shipping_mark']}' already exists")
                            continue
                        
                        # Create user
                        user = CustomerUser.objects.create_user(
                            phone=row['phone'],
                            password='defaultpassword123',  # Default password
                            first_name=row['first_name'],
                            last_name=row['last_name'],
                            email=row.get('email', ''),
                            company_name=row.get('company_name', ''),
                            shipping_mark=row['shipping_mark'],
                            user_role=row.get('user_role', 'CUSTOMER'),
                            user_type=row.get('user_type', 'INDIVIDUAL'),
                            region=row.get('region', ''),
                        )
                        
                        created_users += 1
                        
                    except Exception as e:
                        errors.append(f"Row {index + 2}: {str(e)}")
                
                if created_users > 0:
                    messages.success(request, f'Successfully created {created_users} users.')
                
                if errors:
                    for error in errors[:10]:  # Show first 10 errors
                        messages.error(request, error)
                    if len(errors) > 10:
                        messages.error(request, f'...and {len(errors) - 10} more errors.')
                
                return redirect('admin:users_customeruser_changelist')
                
            except Exception as e:
                messages.error(request, f'Failed to process Excel file: {str(e)}')
                return redirect('admin:users_customeruser_changelist')
        
        context = {
            'title': 'Bulk Upload Users from Excel',
            'opts': self.model._meta,
            'has_file_field': True,
        }
        
        return render(request, 'admin/users/bulk_upload_users.html', context)

    def export_template_view(self, request):
        """Export Excel template for bulk user upload"""
        import pandas as pd
        from django.http import HttpResponse
        import io
        
        # Create sample data
        sample_data = {
            'phone': ['+1234567890', '+0987654321', '+1122334455'],
            'first_name': ['John', 'Jane', 'Michael'],
            'last_name': ['Doe', 'Smith', 'Johnson'],
            'email': ['john@example.com', 'jane@example.com', 'michael@example.com'],
            'company_name': ['ABC Corp', 'XYZ Ltd', 'Global Trade'],
            'shipping_mark': ['SM001', 'SM002', 'SM003'],
            'user_role': ['CUSTOMER', 'CUSTOMER', 'CUSTOMER'],
            'user_type': ['BUSINESS', 'INDIVIDUAL', 'BUSINESS'],
            'region': ['North', 'South', 'East']
        }
        
        df = pd.DataFrame(sample_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Users')
        
        output.seek(0)
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="users_template.xlsx"'
        
        return response

    def bulk_upload_excel(self, request, queryset):
        """Admin action to redirect to bulk upload"""
        return HttpResponseRedirect(reverse('admin:users_bulk_upload_excel'))
    bulk_upload_excel.short_description = "Bulk upload from Excel"

# Custom admin site configuration
admin.site.site_header = "Prime Pre Logistics Admin"
admin.site.site_title = "Prime Pre Admin"
admin.site.index_title = "Welcome to Prime Pre Logistics Administration"

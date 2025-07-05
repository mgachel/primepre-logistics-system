from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from django.db.models import Count, Sum, Q
from django.utils.safestring import mark_safe
from django.contrib.admin import AdminSite
from cargo.models import CargoContainer, CargoItem, ClientShipmentSummary
from users.models import CustomerUser
from GoodsRecieved.models import *
import json
from datetime import datetime, timedelta


class PrimePreAdminSite(AdminSite):
    """Custom admin site with enhanced dashboard"""
    
    site_header = 'PrimePre Cargo Management'
    site_title = 'PrimePre Admin'
    index_title = 'Welcome to PrimePre Administration'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.dashboard_view), name='dashboard'),
            path('cargo/analytics/', self.admin_view(self.cargo_analytics_view), name='cargo_analytics'),
            path('users/analytics/', self.admin_view(self.users_analytics_view), name='users_analytics'),
        ]
        return custom_urls + urls
    
    def dashboard_view(self, request):
        """Enhanced dashboard with statistics"""
        # Get current date and last 30 days
        today = datetime.now().date()
        last_30_days = today - timedelta(days=30)
        
        # Container statistics
        total_containers = CargoContainer.objects.count()
        active_containers = CargoContainer.objects.filter(status='in_transit').count()
        completed_containers = CargoContainer.objects.filter(status='delivered').count()
        recent_containers = CargoContainer.objects.filter(created_at__gte=last_30_days).count()
        
        # User statistics
        total_users = CustomerUser.objects.count()
        active_users = CustomerUser.objects.filter(is_active=True).count()
        recent_users = CustomerUser.objects.filter(date_joined__gte=last_30_days).count()
        
        # Cargo statistics
        total_items = CargoItem.objects.count()
        total_weight = CargoItem.objects.aggregate(total=Sum('weight'))['total'] or 0
        total_value = CargoItem.objects.aggregate(total=Sum('value'))['total'] or 0
        
        # Container status breakdown
        status_breakdown = list(CargoContainer.objects.values('status').annotate(count=Count('id')))
        
        # Recent activities
        recent_containers_list = CargoContainer.objects.select_related('customer').order_by('-created_at')[:10]
        
        context = {
            'title': 'Dashboard',
            'total_containers': total_containers,
            'active_containers': active_containers,
            'completed_containers': completed_containers,
            'recent_containers': recent_containers,
            'total_users': total_users,
            'active_users': active_users,
            'recent_users': recent_users,
            'total_items': total_items,
            'total_weight': round(total_weight, 2),
            'total_value': round(total_value, 2),
            'status_breakdown': json.dumps(status_breakdown),
            'recent_containers_list': recent_containers_list,
        }
        
        return render(request, 'admin/dashboard.html', context)
    
    def cargo_analytics_view(self, request):
        """Cargo analytics page"""
        # Monthly container creation trend
        containers_by_month = []
        for i in range(6):
            month_start = datetime.now().replace(day=1) - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            count = CargoContainer.objects.filter(
                created_at__range=[month_start, month_end]
            ).count()
            containers_by_month.append({
                'month': month_start.strftime('%B %Y'),
                'count': count
            })
        
        # Cargo type distribution
        cargo_types = list(CargoItem.objects.values('cargo_type').annotate(count=Count('id')))
        
        # Top customers by container count
        top_customers = list(
            CustomerUser.objects.annotate(
                container_count=Count('cargocontainer')
            ).order_by('-container_count')[:10]
        )
        
        context = {
            'title': 'Cargo Analytics',
            'containers_by_month': json.dumps(containers_by_month),
            'cargo_types': json.dumps(cargo_types),
            'top_customers': top_customers,
        }
        
        return render(request, 'admin/cargo_analytics.html', context)
    
    def users_analytics_view(self, request):
        """Users analytics page"""
        # User registration trend
        users_by_month = []
        for i in range(6):
            month_start = datetime.now().replace(day=1) - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            count = CustomerUser.objects.filter(
                date_joined__range=[month_start, month_end]
            ).count()
            users_by_month.append({
                'month': month_start.strftime('%B %Y'),
                'count': count
            })
        
        # User activity statistics
        active_users = CustomerUser.objects.filter(is_active=True).count()
        inactive_users = CustomerUser.objects.filter(is_active=False).count()
        
        # Users by role/type if you have different user types
        users_by_type = list(
            CustomerUser.objects.values('user_type').annotate(count=Count('id'))
        ) if hasattr(CustomerUser, 'user_type') else []
        
        context = {
            'title': 'User Analytics',
            'users_by_month': json.dumps(users_by_month),
            'active_users': active_users,
            'inactive_users': inactive_users,
            'users_by_type': json.dumps(users_by_type),
        }
        
        return render(request, 'admin/users_analytics.html', context)


# Create an instance of our custom admin site
admin_site = PrimePreAdminSite(name='primepre_admin')

# Register all your models with the custom admin site
from cargo.admin import CargoContainerAdmin, CargoItemAdmin, ClientShipmentSummaryAdmin
from users.admin import CustomerUserAdmin

admin_site.register(CargoContainer, CargoContainerAdmin)
admin_site.register(CargoItem, CargoItemAdmin)
admin_site.register(ClientShipmentSummary, ClientShipmentSummaryAdmin)
admin_site.register(CustomerUser, CustomerUserAdmin)

# Also register with default admin for backward compatibility
from django.contrib.auth.models import User, Group
admin_site.register(User)
admin_site.register(Group)

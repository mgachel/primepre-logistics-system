from django.contrib import admin
from django.shortcuts import render
from django.urls import path
from django.http import JsonResponse
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

# Analytics doesn't have models, but we can provide admin views for reports

class AnalyticsAdminSite(admin.ModelAdmin):
    """Custom admin views for analytics reporting"""
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('reports/', self.admin_site.admin_view(self.analytics_reports_view), name='analytics_reports'),
        ]
        return custom_urls + urls
    
    def analytics_reports_view(self, request):
        """Analytics reports dashboard"""
        from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
        from users.models import CustomerUser
        from cargo.models import CargoContainer, CargoItem
        
        # Get current date and last 30 days
        today = timezone.now().date()
        last_30_days = today - timedelta(days=30)
        
        # Calculate key metrics
        context = {
            'title': 'Analytics Dashboard',
            'china_goods_total': GoodsReceivedChina.objects.count(),
            'ghana_goods_total': GoodsReceivedGhana.objects.count(),
            'active_customers': CustomerUser.objects.filter(is_active=True, user_role='CUSTOMER').count(),
            'containers_total': CargoContainer.objects.count(),
            'recent_goods': GoodsReceivedChina.objects.filter(date_received__gte=last_30_days).count(),
            'pending_china': GoodsReceivedChina.objects.filter(status='PENDING').count(),
            'pending_ghana': GoodsReceivedGhana.objects.filter(status='PENDING').count(),
        }
        
        return render(request, 'admin/analytics/reports.html', context)

# Since we don't have actual models, we'll register this in the main admin site

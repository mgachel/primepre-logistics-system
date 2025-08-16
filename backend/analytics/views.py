from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from django.db import models
from datetime import datetime, timedelta
from django.utils.dateparse import parse_date

from .models import ShippingAnalytics
from users.permissions import IsAdminUser


class TopShippersAPIView(views.APIView):
    """
    API to get top shippers based on volume or weight.
    
    GET /api/analytics/top-shippers/?limit=10&start_date=2023-01-01&end_date=2023-12-31&metric=volume
    """
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get top shippers with filtering options"""
        # Parse query parameters
        limit = int(request.GET.get('limit', 10))
        metric = request.GET.get('metric', 'volume')  # 'volume' or 'weight'
        period = request.GET.get('period')  # 'today', 'week', 'month', 'quarter', 'year'
        
        # Parse dates
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        start_date = None
        end_date = None
        
        if period:
            # Use predefined period
            now = timezone.now()
            if period == 'today':
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == 'week':
                start_date = now - timedelta(days=7)
            elif period == 'month':
                start_date = now - timedelta(days=30)
            elif period == 'quarter':
                start_date = now - timedelta(days=90)
            elif period == 'year':
                start_date = now - timedelta(days=365)
        else:
            # Use custom date range
            if start_date_str:
                start_date = parse_date(start_date_str)
                if start_date:
                    start_date = timezone.make_aware(
                        datetime.combine(start_date, datetime.min.time())
                    )
            
            if end_date_str:
                end_date = parse_date(end_date_str)
                if end_date:
                    end_date = timezone.make_aware(
                        datetime.combine(end_date, datetime.max.time())
                    )
        
        # Validate parameters
        if metric not in ['volume', 'weight']:
            return Response({
                'success': False,
                'error': 'Invalid metric. Use "volume" or "weight"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if limit < 1 or limit > 100:
            return Response({
                'success': False,
                'error': 'Limit must be between 1 and 100'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get top shippers data
            data = ShippingAnalytics.get_top_shippers(
                limit=limit,
                start_date=start_date,
                end_date=end_date,
                metric=metric
            )
            
            return Response({
                'success': True,
                'data': data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error retrieving top shippers: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardStatsAPIView(views.APIView):
    """
    API to get dashboard statistics.
    
    GET /api/analytics/dashboard-stats/?period=month
    """
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get dashboard statistics"""
        # Parse query parameters
        period = request.GET.get('period')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        start_date = None
        end_date = None
        
        if period:
            # Use predefined period
            now = timezone.now()
            if period == 'today':
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == 'week':
                start_date = now - timedelta(days=7)
            elif period == 'month':
                start_date = now - timedelta(days=30)
            elif period == 'quarter':
                start_date = now - timedelta(days=90)
            elif period == 'year':
                start_date = now - timedelta(days=365)
        else:
            # Use custom date range
            if start_date_str:
                start_date = parse_date(start_date_str)
                if start_date:
                    start_date = timezone.make_aware(
                        datetime.combine(start_date, datetime.min.time())
                    )
            
            if end_date_str:
                end_date = parse_date(end_date_str)
                if end_date:
                    end_date = timezone.make_aware(
                        datetime.combine(end_date, datetime.max.time())
                    )
        
        try:
            # Get dashboard statistics
            data = ShippingAnalytics.get_dashboard_stats(
                start_date=start_date,
                end_date=end_date
            )
            
            return Response({
                'success': True,
                'data': data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error retrieving dashboard stats: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShippingTrendsAPIView(views.APIView):
    """
    API to get shipping trends over time.
    
    GET /api/analytics/shipping-trends/?period=month&metric=volume
    """
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get shipping trends"""
        # Parse query parameters
        period = request.GET.get('period', 'month')  # 'day', 'week', 'month'
        metric = request.GET.get('metric', 'volume')  # 'volume', 'weight', 'count'
        
        # Validate parameters
        if period not in ['day', 'week', 'month']:
            return Response({
                'success': False,
                'error': 'Invalid period. Use "day", "week", or "month"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if metric not in ['volume', 'weight', 'count']:
            return Response({
                'success': False,
                'error': 'Invalid metric. Use "volume", "weight", or "count"'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get trends data
            data = ShippingAnalytics.get_shipping_trends(
                period=period,
                metric=metric
            )
            
            return Response({
                'success': True,
                'data': data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error retrieving shipping trends: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RouteAnalyticsAPIView(views.APIView):
    """
    API to get route analytics.
    
    GET /api/analytics/route-analytics/?start_date=2023-01-01&end_date=2023-12-31
    """
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get route analytics"""
        # Parse query parameters
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        
        start_date = None
        end_date = None
        
        if start_date_str:
            start_date = parse_date(start_date_str)
            if start_date:
                start_date = timezone.make_aware(
                    datetime.combine(start_date, datetime.min.time())
                )
        
        if end_date_str:
            end_date = parse_date(end_date_str)
            if end_date:
                end_date = timezone.make_aware(
                    datetime.combine(end_date, datetime.max.time())
                )
        
        try:
            # Get route analytics
            data = ShippingAnalytics.get_route_analytics(
                start_date=start_date,
                end_date=end_date
            )
            
            return Response({
                'success': True,
                'data': data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error retrieving route analytics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyticsSummaryAPIView(views.APIView):
    """
    API to get a comprehensive analytics summary.
    
    GET /api/analytics/summary/?period=month
    """
    
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get comprehensive analytics summary"""
        # Parse query parameters
        period = request.GET.get('period', 'month')
        
        # Determine date range
        now = timezone.now()
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        elif period == 'quarter':
            start_date = now - timedelta(days=90)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)  # Default to month
        
        try:
            # Get all analytics data
            dashboard_stats = ShippingAnalytics.get_dashboard_stats(
                start_date=start_date
            )
            
            top_shippers_volume = ShippingAnalytics.get_top_shippers(
                limit=5,
                start_date=start_date,
                metric='volume'
            )
            
            top_shippers_weight = ShippingAnalytics.get_top_shippers(
                limit=5,
                start_date=start_date,
                metric='weight'
            )
            
            shipping_trends = ShippingAnalytics.get_shipping_trends(
                period='week' if period in ['today', 'week'] else 'month',
                metric='volume'
            )
            
            route_analytics = ShippingAnalytics.get_route_analytics(
                start_date=start_date
            )
            
            return Response({
                'success': True,
                'data': {
                    'dashboard_stats': dashboard_stats,
                    'top_shippers': {
                        'by_volume': top_shippers_volume['top_shippers'][:5],
                        'by_weight': top_shippers_weight['top_shippers'][:5]
                    },
                    'shipping_trends': shipping_trends,
                    'route_analytics': route_analytics,
                    'period': period,
                    'generated_at': now.isoformat()
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error generating analytics summary: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CustomerAnalyticsAPIView(views.APIView):
    """
    API to get analytics for a specific customer.
    Available to both admins and the customer themselves.
    
    GET /api/analytics/customer/{customer_id}/?period=month
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, customer_id=None):
        """Get analytics for a specific customer"""
        from users.models import CustomerUser
        from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
        from rates.models import RateQuote
        
        # If no customer_id provided, use current user
        if not customer_id:
            customer_id = request.user.id
        
        # Check permissions
        if not request.user.is_admin_user and str(request.user.id) != str(customer_id):
            return Response({
                'success': False,
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            customer = CustomerUser.objects.get(id=customer_id)
        except CustomerUser.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Customer not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Parse period
        period = request.GET.get('period', 'month')
        now = timezone.now()
        
        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        elif period == 'quarter':
            start_date = now - timedelta(days=90)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)
        
        try:
            # Get customer's goods data
            china_goods = GoodsReceivedChina.objects.filter(
                customer=customer,
                created_at__gte=start_date
            )
            
            ghana_goods = GoodsReceivedGhana.objects.filter(
                customer=customer,
                created_at__gte=start_date
            )
            
            # Aggregate statistics
            china_stats = china_goods.aggregate(
                count=models.Count('id'),
                total_weight=models.Sum('total_weight_kg'),
                total_volume=models.Sum('total_cbm')
            )
            
            ghana_stats = ghana_goods.aggregate(
                count=models.Count('id'),
                total_weight=models.Sum('weight_kg'),
                total_volume=models.Sum('cbm')
            )
            
            # Get quotes
            quotes = RateQuote.objects.filter(
                customer=customer,
                created_at__gte=start_date
            )
            
            quote_stats = quotes.aggregate(
                count=models.Count('id'),
                total_quoted=models.Sum('quoted_amount')
            )
            
            quotes_by_status = dict(
                quotes.values_list('status').annotate(count=models.Count('status'))
            )
            
            return Response({
                'success': True,
                'data': {
                    'customer': {
                        'id': customer.id,
                        'name': customer.get_full_name(),
                        'company_name': customer.company_name,
                        'shipping_mark': customer.shipping_mark
                    },
                    'shipments': {
                        'china': {
                            'count': china_stats['count'] or 0,
                            'total_weight': float(china_stats['total_weight'] or 0),
                            'total_volume': float(china_stats['total_volume'] or 0)
                        },
                        'ghana': {
                            'count': ghana_stats['count'] or 0,
                            'total_weight': float(ghana_stats['total_weight'] or 0),
                            'total_volume': float(ghana_stats['total_volume'] or 0)
                        },
                        'total': {
                            'count': (china_stats['count'] or 0) + (ghana_stats['count'] or 0),
                            'total_weight': float(china_stats['total_weight'] or 0) + float(ghana_stats['total_weight'] or 0),
                            'total_volume': float(china_stats['total_volume'] or 0) + float(ghana_stats['total_volume'] or 0)
                        }
                    },
                    'quotes': {
                        'count': quote_stats['count'] or 0,
                        'total_quoted': float(quote_stats['total_quoted'] or 0),
                        'by_status': quotes_by_status
                    },
                    'period': period,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': now.isoformat()
                    }
                }
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error retrieving customer analytics: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from django.db import models
from django.utils import timezone
from django.db.models import Sum, Count, Q
from decimal import Decimal
from datetime import datetime, timedelta


class AnalyticsQuerySet(models.QuerySet):
    """
    Custom QuerySet for analytics with common filtering methods.
    """
    
    def in_date_range(self, start_date=None, end_date=None):
        """Filter by date range"""
        queryset = self
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset
    
    def for_period(self, period='month'):
        """Filter for specific time period"""
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
            return self
        
        return self.filter(created_at__gte=start_date)


class ShippingAnalytics:
    """
    Analytics service for shipping-related metrics.
    """
    
    @staticmethod
    def get_top_shippers(limit=10, start_date=None, end_date=None, metric='volume'):
        """
        Get top shippers based on volume or weight.
        
        Args:
            limit (int): Number of top shippers to return
            start_date (datetime): Start date for filtering
            end_date (datetime): End date for filtering
            metric (str): 'volume' (CBM) or 'weight' (KG)
        
        Returns:
            dict: Top shippers data with statistics
        """
        from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
        from users.models import CustomerUser
        
        # Build date filter
        date_filter = Q()
        if start_date:
            date_filter &= Q(created_at__gte=start_date)
        if end_date:
            date_filter &= Q(created_at__lte=end_date)
        
        # Aggregate data from both China and Ghana warehouses
        china_data = GoodsReceivedChina.objects.filter(date_filter).values(
            'customer__id',
            'customer__first_name',
            'customer__last_name',
            'customer__company_name',
            'customer__shipping_mark'
        ).annotate(
            total_weight=Sum('total_weight_kg'),
            total_volume=Sum('total_cbm'),
            shipment_count=Count('id')
        )
        
        ghana_data = GoodsReceivedGhana.objects.filter(date_filter).values(
            'customer__id',
            'customer__first_name',
            'customer__last_name',
            'customer__company_name',
            'customer__shipping_mark'
        ).annotate(
            total_weight=Sum('weight_kg'),
            total_volume=Sum('cbm'),
            shipment_count=Count('id')
        )
        
        # Combine data from both warehouses
        customer_stats = {}
        
        for data in china_data:
            customer_id = data['customer__id']
            customer_stats[customer_id] = {
                'customer_id': customer_id,
                'name': f"{data['customer__first_name']} {data['customer__last_name']}".strip(),
                'company_name': data['customer__company_name'] or '',
                'shipping_mark': data['customer__shipping_mark'],
                'total_weight': data['total_weight'] or Decimal('0'),
                'total_volume': data['total_volume'] or Decimal('0'),
                'shipment_count': data['shipment_count'],
                'china_shipments': data['shipment_count'],
                'ghana_shipments': 0
            }
        
        for data in ghana_data:
            customer_id = data['customer__id']
            if customer_id in customer_stats:
                customer_stats[customer_id]['total_weight'] += data['total_weight'] or Decimal('0')
                customer_stats[customer_id]['total_volume'] += data['total_volume'] or Decimal('0')
                customer_stats[customer_id]['shipment_count'] += data['shipment_count']
                customer_stats[customer_id]['ghana_shipments'] = data['shipment_count']
            else:
                customer_stats[customer_id] = {
                    'customer_id': customer_id,
                    'name': f"{data['customer__first_name']} {data['customer__last_name']}".strip(),
                    'company_name': data['customer__company_name'] or '',
                    'shipping_mark': data['customer__shipping_mark'],
                    'total_weight': data['total_weight'] or Decimal('0'),
                    'total_volume': data['total_volume'] or Decimal('0'),
                    'shipment_count': data['shipment_count'],
                    'china_shipments': 0,
                    'ghana_shipments': data['shipment_count']
                }
        
        # Sort by specified metric
        sort_key = 'total_volume' if metric == 'volume' else 'total_weight'
        top_shippers = sorted(
            customer_stats.values(),
            key=lambda x: float(x[sort_key]),
            reverse=True
        )[:limit]
        
        return {
            'top_shippers': top_shippers,
            'metric': metric,
            'period': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            },
            'total_customers': len(customer_stats),
            'summary': {
                'total_weight': sum(float(s['total_weight']) for s in customer_stats.values()),
                'total_volume': sum(float(s['total_volume']) for s in customer_stats.values()),
                'total_shipments': sum(s['shipment_count'] for s in customer_stats.values())
            }
        }
    
    @staticmethod
    def get_dashboard_stats(start_date=None, end_date=None):
        """
        Get dashboard statistics for the specified period.
        
        Returns:
            dict: Dashboard statistics
        """
        from users.models import CustomerUser
        from cargo.models import CargoContainer
        from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
        from rates.models import RateQuote
        
        # Build date filter
        date_filter = Q()
        if start_date:
            date_filter &= Q(created_at__gte=start_date)
        if end_date:
            date_filter &= Q(created_at__lte=end_date)
        
        # Get basic counts
        total_customers = CustomerUser.objects.filter(user_role='CUSTOMER').count()
        
        # Containers
        containers = CargoContainer.objects.filter(date_filter)
        total_containers = containers.count()
        containers_by_status = dict(containers.values_list('status').annotate(count=Count('status')))
        containers_by_type = dict(containers.values_list('cargo_type').annotate(count=Count('cargo_type')))
        
        # Goods received
        china_goods = GoodsReceivedChina.objects.filter(date_filter)
        ghana_goods = GoodsReceivedGhana.objects.filter(date_filter)
        
        total_goods_china = china_goods.count()
        total_goods_ghana = ghana_goods.count()
        total_goods_received = total_goods_china + total_goods_ghana
        
        # Aggregated weights and volumes
        china_aggregates = china_goods.aggregate(
            total_weight=Sum('total_weight_kg'),
            total_volume=Sum('total_cbm')
        )
        ghana_aggregates = ghana_goods.aggregate(
            total_weight=Sum('weight_kg'),
            total_volume=Sum('cbm')
        )
        
        total_weight = (china_aggregates['total_weight'] or Decimal('0')) + \
                      (ghana_aggregates['total_weight'] or Decimal('0'))
        total_volume = (china_aggregates['total_volume'] or Decimal('0')) + \
                      (ghana_aggregates['total_volume'] or Decimal('0'))
        
        # Rate quotes
        quotes = RateQuote.objects.filter(date_filter)
        total_quotes = quotes.count()
        quotes_by_status = dict(quotes.values_list('status').annotate(count=Count('status')))
        
        # Revenue (stub - as requested, no real financial tracking)
        # This can be expanded when financial features are added
        estimated_revenue = float(total_weight) * 2.5  # Stub calculation
        
        return {
            'overview': {
                'total_customers': total_customers,
                'total_containers': total_containers,
                'total_goods_received': total_goods_received,
                'total_quotes': total_quotes,
                'estimated_revenue': estimated_revenue  # Stub value
            },
            'containers': {
                'total': total_containers,
                'by_status': containers_by_status,
                'by_type': containers_by_type
            },
            'goods_received': {
                'total': total_goods_received,
                'china': total_goods_china,
                'ghana': total_goods_ghana,
                'total_weight_kg': float(total_weight),
                'total_volume_cbm': float(total_volume)
            },
            'quotes': {
                'total': total_quotes,
                'by_status': quotes_by_status
            },
            'period': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            }
        }
    
    @staticmethod
    def get_shipping_trends(period='month', metric='volume'):
        """
        Get shipping trends over time.
        
        Args:
            period (str): 'day', 'week', 'month'
            metric (str): 'volume', 'weight', 'count'
        
        Returns:
            dict: Trend data
        """
        from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
        from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
        
        # Determine truncation function
        trunc_func = {
            'day': TruncDate,
            'week': TruncWeek,
            'month': TruncMonth
        }.get(period, TruncDate)
        
        # Determine aggregation field
        if metric == 'volume':
            china_field = 'total_cbm'
            ghana_field = 'cbm'
            agg_func = Sum
        elif metric == 'weight':
            china_field = 'total_weight_kg'
            ghana_field = 'weight_kg'
            agg_func = Sum
        else:  # count
            china_field = 'id'
            ghana_field = 'id'
            agg_func = Count
        
        # Get data for last 30 periods
        end_date = timezone.now()
        if period == 'day':
            start_date = end_date - timedelta(days=30)
        elif period == 'week':
            start_date = end_date - timedelta(weeks=30)
        else:  # month
            start_date = end_date - timedelta(days=365)
        
        # Query China data
        china_trends = GoodsReceivedChina.objects.filter(
            created_at__gte=start_date
        ).annotate(
            period=trunc_func('created_at')
        ).values('period').annotate(
            value=agg_func(china_field)
        ).order_by('period')
        
        # Query Ghana data
        ghana_trends = GoodsReceivedGhana.objects.filter(
            created_at__gte=start_date
        ).annotate(
            period=trunc_func('created_at')
        ).values('period').annotate(
            value=agg_func(ghana_field)
        ).order_by('period')
        
        # Combine data
        trend_data = {}
        
        for item in china_trends:
            period_key = item['period'].isoformat()
            trend_data[period_key] = {
                'period': period_key,
                'china': float(item['value'] or 0),
                'ghana': 0,
                'total': float(item['value'] or 0)
            }
        
        for item in ghana_trends:
            period_key = item['period'].isoformat()
            if period_key in trend_data:
                trend_data[period_key]['ghana'] = float(item['value'] or 0)
                trend_data[period_key]['total'] += float(item['value'] or 0)
            else:
                trend_data[period_key] = {
                    'period': period_key,
                    'china': 0,
                    'ghana': float(item['value'] or 0),
                    'total': float(item['value'] or 0)
                }
        
        return {
            'trends': sorted(trend_data.values(), key=lambda x: x['period']),
            'period': period,
            'metric': metric,
            'summary': {
                'total_periods': len(trend_data),
                'max_value': max([t['total'] for t in trend_data.values()] + [0]),
                'avg_value': sum(t['total'] for t in trend_data.values()) / len(trend_data) if trend_data else 0
            }
        }
    
    @staticmethod
    def get_route_analytics(start_date=None, end_date=None):
        """
        Get analytics for shipping routes.
        
        Returns:
            dict: Route analytics data
        """
        from cargo.models import CargoContainer
        from system_settings.models import ShippingRoute
        
        # Build date filter
        date_filter = Q()
        if start_date:
            date_filter &= Q(created_at__gte=start_date)
        if end_date:
            date_filter &= Q(created_at__lte=end_date)
        
        # Get container data by route
        containers = CargoContainer.objects.filter(date_filter)
        
        route_stats = containers.values('route').annotate(
            container_count=Count('container_id'),
            total_weight=Sum('weight'),
            total_cbm=Sum('cbm'),
            avg_stay_days=models.Avg('stay_days'),
            delay_rate=models.Avg('delay_days')
        ).order_by('-container_count')
        
        # Get active routes
        active_routes = ShippingRoute.objects.filter(is_active=True)
        route_lookup = {route.name: route for route in active_routes}
        
        # Enhance with route details
        enhanced_stats = []
        for stat in route_stats:
            route_name = stat['route']
            route_obj = route_lookup.get(route_name)
            
            enhanced_stats.append({
                'route_name': route_name,
                'route_code': route_obj.code if route_obj else 'N/A',
                'transport_type': route_obj.transport_type if route_obj else 'N/A',
                'container_count': stat['container_count'],
                'total_weight': float(stat['total_weight'] or 0),
                'total_volume': float(stat['total_cbm'] or 0),
                'avg_stay_days': float(stat['avg_stay_days'] or 0),
                'avg_delay_days': float(stat['delay_rate'] or 0),
                'efficiency_score': max(0, 100 - float(stat['delay_rate'] or 0) * 10)  # Simple efficiency metric
            })
        
        return {
            'route_stats': enhanced_stats,
            'summary': {
                'total_routes_used': len(enhanced_stats),
                'total_containers': sum(s['container_count'] for s in enhanced_stats),
                'avg_efficiency': sum(s['efficiency_score'] for s in enhanced_stats) / len(enhanced_stats) if enhanced_stats else 0
            },
            'period': {
                'start_date': start_date.isoformat() if start_date else None,
                'end_date': end_date.isoformat() if end_date else None
            }
        }

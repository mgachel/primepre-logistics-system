"""
Advanced mixins for enhanced logistics functionality
"""
from django.db.models import Q, Count, Sum, Avg, F, Case, When, Value
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class AdvancedAnalyticsMixin:
    """
    Mixin providing advanced analytics and insights for goods management
    """
    
    @action(detail=False, methods=['get'])
    def advanced_analytics(self, request):
        """
        Get comprehensive analytics with predictive insights
        """
        cache_key = f"analytics_{self.warehouse_type}_{timezone.now().date()}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        queryset = self.get_queryset()
        
        # Advanced aggregations
        analytics = queryset.aggregate(
            # Basic metrics
            total_items=Count('id'),
            total_cbm=Sum('cbm'),
            total_weight=Sum('weight'),
            total_value=Sum('estimated_value'),
            
            # Status distribution
            pending_count=Count('id', filter=Q(status='PENDING')),
            ready_count=Count('id', filter=Q(status__in=['READY_FOR_SHIPPING', 'READY_FOR_DELIVERY'])),
            flagged_count=Count('id', filter=Q(status='FLAGGED')),
            shipped_count=Count('id', filter=Q(status__in=['SHIPPED', 'DELIVERED'])),
            
            # Performance metrics
            avg_processing_time=Avg('days_in_warehouse', filter=~Q(status='PENDING')),
            
            # Risk metrics
            overdue_items=Count('id', filter=Q(
                date_received__lt=timezone.now() - timedelta(days=30),
                status__in=['PENDING', 'READY_FOR_SHIPPING', 'FLAGGED']
            )),
            
            # Efficiency metrics
            fast_processing=Count('id', filter=Q(
                days_in_warehouse__lt=7,
                status__in=['SHIPPED', 'DELIVERED']
            )),
            slow_processing=Count('id', filter=Q(
                days_in_warehouse__gt=30,
                status__in=['PENDING', 'FLAGGED']
            ))
        )
        
        # Calculate derived metrics
        total_items = analytics['total_items'] or 1  # Avoid division by zero
        
        analytics.update({
            'efficiency_rate': round((analytics['fast_processing'] / total_items) * 100, 2),
            'overdue_rate': round((analytics['overdue_items'] / total_items) * 100, 2),
            'flagged_rate': round((analytics['flagged_count'] / total_items) * 100, 2),
            'avg_cbm_per_item': round((analytics['total_cbm'] or 0) / total_items, 3),
            'avg_weight_per_item': round((analytics['total_weight'] or 0) / total_items, 2),
            'warehouse_utilization': self._calculate_warehouse_utilization(analytics['total_cbm']),
            'trends': self._calculate_trends(),
            'recommendations': self._generate_recommendations(analytics)
        })
        
        # Cache for 1 hour
        cache.set(cache_key, analytics, 3600)
        
        return Response(analytics)
    
    @action(detail=False, methods=['get'])
    def performance_trends(self, request):
        """
        Get performance trends over time
        """
        days = int(request.query_params.get('days', 30))
        
        # Get daily performance metrics
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        daily_stats = []
        current_date = start_date
        
        while current_date <= end_date:
            day_start = timezone.make_aware(timezone.datetime.combine(current_date, timezone.datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            
            day_queryset = self.get_queryset().filter(
                date_received__gte=day_start,
                date_received__lt=day_end
            )
            
            day_stats = day_queryset.aggregate(
                date=Value(current_date.isoformat()),
                items_received=Count('id'),
                total_cbm=Sum('cbm') or 0,
                avg_processing_time=Avg('days_in_warehouse') or 0,
                flagged_items=Count('id', filter=Q(status='FLAGGED'))
            )
            
            daily_stats.append(day_stats)
            current_date += timedelta(days=1)
        
        return Response({
            'period': f'{start_date} to {end_date}',
            'daily_trends': daily_stats,
            'summary': self._calculate_trend_summary(daily_stats)
        })
    
    def _calculate_warehouse_utilization(self, total_cbm):
        """Calculate warehouse utilization percentage"""
        # These should be configurable in settings
        max_capacity = {
            'china': 10000,  # CBM
            'ghana': 8000    # CBM
        }
        
        capacity = max_capacity.get(self.warehouse_type, 5000)
        utilization = (total_cbm or 0) / capacity * 100
        return min(round(utilization, 2), 100)
    
    def _calculate_trends(self):
        """Calculate trends for the last 7 days vs previous 7 days"""
        now = timezone.now()
        
        # Current week
        current_week = self.get_queryset().filter(
            date_received__gte=now - timedelta(days=7)
        ).aggregate(
            items=Count('id'),
            cbm=Sum('cbm') or 0,
            flagged=Count('id', filter=Q(status='FLAGGED'))
        )
        
        # Previous week
        previous_week = self.get_queryset().filter(
            date_received__gte=now - timedelta(days=14),
            date_received__lt=now - timedelta(days=7)
        ).aggregate(
            items=Count('id'),
            cbm=Sum('cbm') or 0,
            flagged=Count('id', filter=Q(status='FLAGGED'))
        )
        
        def calculate_change(current, previous):
            if previous == 0:
                return 100 if current > 0 else 0
            return round(((current - previous) / previous) * 100, 2)
        
        return {
            'items_change': calculate_change(current_week['items'], previous_week['items']),
            'cbm_change': calculate_change(current_week['cbm'], previous_week['cbm']),
            'flagged_change': calculate_change(current_week['flagged'], previous_week['flagged'])
        }
    
    def _generate_recommendations(self, analytics):
        """Generate AI-like recommendations based on analytics"""
        recommendations = []
        
        if analytics['overdue_rate'] > 20:
            recommendations.append({
                'type': 'warning',
                'message': f"High overdue rate ({analytics['overdue_rate']}%). Consider reviewing processing workflows.",
                'action': 'Review overdue items and prioritize processing'
            })
        
        if analytics['flagged_rate'] > 10:
            recommendations.append({
                'type': 'alert',
                'message': f"Elevated flagged items ({analytics['flagged_rate']}%). Quality control attention needed.",
                'action': 'Investigate common flagging reasons'
            })
        
        if analytics['efficiency_rate'] > 80:
            recommendations.append({
                'type': 'success',
                'message': f"Excellent efficiency rate ({analytics['efficiency_rate']}%). Maintain current processes.",
                'action': 'Document and share best practices'
            })
        
        utilization = analytics.get('warehouse_utilization', 0)
        if utilization > 85:
            recommendations.append({
                'type': 'warning',
                'message': f"High warehouse utilization ({utilization}%). Consider capacity planning.",
                'action': 'Plan for additional storage or expedite shipping'
            })
        
        return recommendations
    
    def _calculate_trend_summary(self, daily_stats):
        """Calculate summary of trends"""
        if not daily_stats:
            return {}
        
        total_items = sum(day['items_received'] for day in daily_stats)
        avg_daily_items = total_items / len(daily_stats)
        
        return {
            'total_items_period': total_items,
            'avg_daily_items': round(avg_daily_items, 2),
            'peak_day': max(daily_stats, key=lambda x: x['items_received'])['date'],
            'total_cbm_period': sum(day['total_cbm'] for day in daily_stats)
        }


class SmartNotificationMixin:
    """
    Mixin for intelligent notifications and alerts
    """
    
    @action(detail=False, methods=['get'])
    def smart_alerts(self, request):
        """
        Get intelligent alerts and notifications
        """
        alerts = []
        queryset = self.get_queryset()
        
        # Critical alerts
        critical_overdue = queryset.filter(
            date_received__lt=timezone.now() - timedelta(days=60),
            status__in=['PENDING', 'FLAGGED']
        ).count()
        
        if critical_overdue > 0:
            alerts.append({
                'level': 'critical',
                'type': 'overdue',
                'message': f'{critical_overdue} items overdue for 60+ days',
                'action_required': True,
                'endpoint': f'/api/goods/{self.warehouse_type}/overdue_items/?days=60'
            })
        
        # Capacity warnings
        today_received = queryset.filter(
            date_received__date=timezone.now().date()
        ).aggregate(total_cbm=Sum('cbm'))['total_cbm'] or 0
        
        if today_received > 500:  # Configurable threshold
            alerts.append({
                'level': 'warning',
                'type': 'capacity',
                'message': f'High volume day: {today_received} CBM received today',
                'action_required': False
            })
        
        # Quality alerts
        recent_flagged = queryset.filter(
            date_received__gte=timezone.now() - timedelta(days=7),
            status='FLAGGED'
        ).count()
        
        if recent_flagged > 10:
            alerts.append({
                'level': 'warning',
                'type': 'quality',
                'message': f'{recent_flagged} items flagged this week',
                'action_required': True,
                'endpoint': f'/api/goods/{self.warehouse_type}/flagged_items/'
            })
        
        # Efficiency insights
        avg_processing = queryset.filter(
            status__in=['SHIPPED', 'DELIVERED'],
            date_received__gte=timezone.now() - timedelta(days=30)
        ).aggregate(avg_days=Avg('days_in_warehouse'))['avg_days']
        
        if avg_processing and avg_processing > 21:
            alerts.append({
                'level': 'info',
                'type': 'efficiency',
                'message': f'Average processing time: {avg_processing:.1f} days',
                'action_required': False
            })
        
        return Response({
            'alerts': alerts,
            'summary': {
                'critical': len([a for a in alerts if a['level'] == 'critical']),
                'warnings': len([a for a in alerts if a['level'] == 'warning']),
                'info': len([a for a in alerts if a['level'] == 'info'])
            },
            'last_updated': timezone.now().isoformat()
        })


class PredictiveAnalyticsMixin:
    """
    Mixin for predictive analytics and forecasting
    """
    
    @action(detail=False, methods=['get'])
    def capacity_forecast(self, request):
        """
        Predict future capacity needs based on trends
        """
        days_ahead = int(request.query_params.get('days', 7))
        
        # Analyze historical patterns
        historical_data = self._get_historical_volume_data(30)
        
        # Simple trend-based prediction
        predictions = self._predict_volume(historical_data, days_ahead)
        
        return Response({
            'forecast_period': f'Next {days_ahead} days',
            'predictions': predictions,
            'confidence': 'medium',  # Could be calculated based on data variance
            'recommendations': self._generate_capacity_recommendations(predictions)
        })
    
    @action(detail=False, methods=['get'])
    def shipping_optimization(self, request):
        """
        Suggest optimal shipping strategies
        """
        ready_items = self.get_queryset().filter(
            status__in=['READY_FOR_SHIPPING', 'READY_FOR_DELIVERY']
        )
        
        # Group by destination/customer for optimization
        optimization_data = ready_items.values('location', 'customer').annotate(
            total_items=Count('id'),
            total_cbm=Sum('cbm'),
            total_weight=Sum('weight'),
            avg_days_waiting=Avg('days_in_warehouse')
        ).order_by('-total_cbm')
        
        recommendations = []
        for group in optimization_data:
            if group['total_cbm'] > 20:  # Full container load threshold
                recommendations.append({
                    'type': 'consolidation',
                    'location': group['location'],
                    'items': group['total_items'],
                    'cbm': group['total_cbm'],
                    'recommendation': 'Consider full container shipment',
                    'priority': 'high' if group['avg_days_waiting'] > 14 else 'medium'
                })
        
        return Response({
            'ready_for_shipping': ready_items.count(),
            'total_ready_cbm': ready_items.aggregate(Sum('cbm'))['cbm__sum'] or 0,
            'optimization_opportunities': recommendations,
            'cost_savings_potential': len(recommendations) * 500  # Estimated savings
        })
    
    def _get_historical_volume_data(self, days):
        """Get historical volume data for analysis"""
        data = []
        for i in range(days, 0, -1):
            date = timezone.now().date() - timedelta(days=i)
            day_start = timezone.make_aware(timezone.datetime.combine(date, timezone.datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            
            volume = self.get_queryset().filter(
                date_received__gte=day_start,
                date_received__lt=day_end
            ).aggregate(
                items=Count('id'),
                cbm=Sum('cbm') or 0
            )
            
            data.append({
                'date': date.isoformat(),
                'items': volume['items'],
                'cbm': volume['cbm']
            })
        
        return data
    
    def _predict_volume(self, historical_data, days_ahead):
        """Simple trend-based volume prediction"""
        if len(historical_data) < 7:
            return []
        
        # Calculate moving average
        recent_avg_items = sum(d['items'] for d in historical_data[-7:]) / 7
        recent_avg_cbm = sum(d['cbm'] for d in historical_data[-7:]) / 7
        
        predictions = []
        for i in range(1, days_ahead + 1):
            future_date = timezone.now().date() + timedelta(days=i)
            
            # Apply some variance based on day of week
            day_multiplier = 1.2 if future_date.weekday() < 5 else 0.3  # Weekday vs weekend
            
            predictions.append({
                'date': future_date.isoformat(),
                'predicted_items': round(recent_avg_items * day_multiplier),
                'predicted_cbm': round(recent_avg_cbm * day_multiplier, 2),
                'confidence': 0.75  # Static confidence for now
            })
        
        return predictions
    
    def _generate_capacity_recommendations(self, predictions):
        """Generate recommendations based on predictions"""
        recommendations = []
        
        peak_day = max(predictions, key=lambda x: x['predicted_cbm'])
        total_predicted_cbm = sum(p['predicted_cbm'] for p in predictions)
        
        if peak_day['predicted_cbm'] > 800:
            recommendations.append({
                'type': 'capacity_warning',
                'message': f"High volume predicted on {peak_day['date']} ({peak_day['predicted_cbm']} CBM)",
                'action': 'Consider additional staffing and pre-positioning of equipment'
            })
        
        if total_predicted_cbm > 3000:
            recommendations.append({
                'type': 'resource_planning',
                'message': f"High total volume predicted ({total_predicted_cbm} CBM)",
                'action': 'Review storage capacity and processing capabilities'
            })
        
        return recommendations

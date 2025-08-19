"""
Advanced analytics and reporting management command
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q, Count, Sum, Avg, F
from datetime import timedelta
import json
import csv
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana


class Command(BaseCommand):
    help = 'Generate advanced analytics reports for goods management'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--warehouse',
            choices=['china', 'ghana', 'all'],
            default='all',
            help='Warehouse to analyze'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to analyze'
        )
        parser.add_argument(
            '--output',
            choices=['json', 'csv', 'console'],
            default='console',
            help='Output format'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Output file path'
        )
        parser.add_argument(
            '--report-type',
            choices=['summary', 'detailed', 'predictive', 'optimization'],
            default='summary',
            help='Type of report to generate'
        )
    
    def handle(self, *args, **options):
        warehouse = options['warehouse']
        days = options['days']
        output_format = options['output']
        file_path = options['file']
        report_type = options['report_type']
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Generating {report_type} report for {warehouse} warehouse(s) '
                f'for the last {days} days...'
            )
        )
        
        # Get data based on warehouse selection
        if warehouse == 'all':
            china_data = self.analyze_warehouse(GoodsReceivedChina, days)
            ghana_data = self.analyze_warehouse(GoodsReceivedGhana, days)
            report_data = {
                'china': china_data,
                'ghana': ghana_data,
                'combined': self.combine_analytics(china_data, ghana_data)
            }
        elif warehouse == 'china':
            report_data = self.analyze_warehouse(GoodsReceivedChina, days)
        else:  # ghana
            report_data = self.analyze_warehouse(GoodsReceivedGhana, days)
        
        # Generate specific report type
        if report_type == 'detailed':
            report_data = self.generate_detailed_report(report_data, warehouse, days)
        elif report_type == 'predictive':
            report_data = self.generate_predictive_report(report_data, warehouse)
        elif report_type == 'optimization':
            report_data = self.generate_optimization_report(report_data, warehouse)
        
        # Output the report
        self.output_report(report_data, output_format, file_path)
        
        self.stdout.write(
            self.style.SUCCESS('Report generated successfully!')
        )
    
    def analyze_warehouse(self, model, days):
        """Analyze a specific warehouse"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        queryset = model.objects.filter(date_received__gte=start_date)
        
        # Basic metrics
        basic_stats = queryset.aggregate(
            total_items=Count('id'),
            total_cbm=Sum('cbm'),
            total_weight=Sum('weight'),
            total_value=Sum('estimated_value'),
            avg_processing_time=Avg('days_in_warehouse'),
            
            # Status distribution
            pending_count=Count('id', filter=Q(status='PENDING')),
            ready_count=Count('id', filter=Q(status__in=['READY_FOR_SHIPPING', 'READY_FOR_DELIVERY'])),
            flagged_count=Count('id', filter=Q(status='FLAGGED')),
            shipped_count=Count('id', filter=Q(status__in=['SHIPPED', 'DELIVERED'])),
            cancelled_count=Count('id', filter=Q(status='CANCELLED'))
        )
        
        # Daily trends
        daily_trends = self.get_daily_trends(queryset, days)
        
        # Top suppliers
        top_suppliers = queryset.exclude(supplier_name__isnull=True).values(
            'supplier_name'
        ).annotate(
            total_items=Count('id'),
            total_cbm=Sum('cbm'),
            avg_processing_time=Avg('days_in_warehouse')
        ).order_by('-total_items')[:10]
        
        # Location analysis
        location_stats = queryset.values('location').annotate(
            total_items=Count('id'),
            total_cbm=Sum('cbm'),
            avg_processing_time=Avg('days_in_warehouse')
        ).order_by('-total_items')
        
        # Performance metrics
        performance = self.calculate_performance_metrics(queryset)
        
        return {
            'period': f'{start_date.date()} to {end_date.date()}',
            'basic_stats': basic_stats,
            'daily_trends': daily_trends,
            'top_suppliers': list(top_suppliers),
            'location_stats': list(location_stats),
            'performance': performance,
            'warehouse_type': model._meta.model_name
        }
    
    def get_daily_trends(self, queryset, days):
        """Get daily trends for the period"""
        trends = []
        
        for i in range(days):
            date = timezone.now().date() - timedelta(days=i)
            day_start = timezone.make_aware(
                timezone.datetime.combine(date, timezone.datetime.min.time())
            )
            day_end = day_start + timedelta(days=1)
            
            day_stats = queryset.filter(
                date_received__gte=day_start,
                date_received__lt=day_end
            ).aggregate(
                items_received=Count('id'),
                cbm_received=Sum('cbm') or 0,
                items_shipped=Count('id', filter=Q(status__in=['SHIPPED', 'DELIVERED'])),
                items_flagged=Count('id', filter=Q(status='FLAGGED'))
            )
            
            trends.append({
                'date': date.isoformat(),
                **day_stats
            })
        
        return sorted(trends, key=lambda x: x['date'])
    
    def calculate_performance_metrics(self, queryset):
        """Calculate advanced performance metrics"""
        total_items = queryset.count()
        
        if total_items == 0:
            return {}
        
        # Efficiency metrics
        fast_processing = queryset.filter(
            days_in_warehouse__lt=7,
            status__in=['SHIPPED', 'DELIVERED']
        ).count()
        
        slow_processing = queryset.filter(
            days_in_warehouse__gt=21
        ).count()
        
        # Quality metrics
        flagged_rate = (queryset.filter(status='FLAGGED').count() / total_items) * 100
        
        # On-time performance
        on_time_items = queryset.filter(
            days_in_warehouse__lte=14,
            status__in=['SHIPPED', 'DELIVERED']
        ).count()
        
        return {
            'efficiency_rate': round((fast_processing / total_items) * 100, 2),
            'slow_processing_rate': round((slow_processing / total_items) * 100, 2),
            'flagged_rate': round(flagged_rate, 2),
            'on_time_rate': round((on_time_items / total_items) * 100, 2),
            'avg_throughput': round(total_items / 30, 2),  # items per day
        }
    
    def combine_analytics(self, china_data, ghana_data):
        """Combine analytics from both warehouses"""
        combined = {
            'total_items': (china_data['basic_stats']['total_items'] + 
                           ghana_data['basic_stats']['total_items']),
            'total_cbm': (china_data['basic_stats']['total_cbm'] or 0) + 
                        (ghana_data['basic_stats']['total_cbm'] or 0),
            'total_value': (china_data['basic_stats']['total_value'] or 0) + 
                          (ghana_data['basic_stats']['total_value'] or 0),
            'combined_efficiency': (
                china_data['performance'].get('efficiency_rate', 0) + 
                ghana_data['performance'].get('efficiency_rate', 0)
            ) / 2
        }
        
        return combined
    
    def generate_detailed_report(self, data, warehouse, days):
        """Generate detailed analytical report"""
        detailed = data.copy()
        
        # Add insights
        insights = []
        
        if warehouse in ['all', 'china'] and 'china' in data:
            china_stats = data.get('china', data)
            if china_stats['performance']['flagged_rate'] > 10:
                insights.append("High flagged rate in China warehouse requires attention")
            
            if china_stats['performance']['efficiency_rate'] > 80:
                insights.append("China warehouse showing excellent efficiency")
        
        if warehouse in ['all', 'ghana'] and 'ghana' in data:
            ghana_stats = data.get('ghana', data)
            if ghana_stats['performance']['slow_processing_rate'] > 20:
                insights.append("Ghana warehouse has high slow processing rate")
        
        detailed['insights'] = insights
        detailed['report_type'] = 'detailed'
        detailed['generated_at'] = timezone.now().isoformat()
        
        return detailed
    
    def generate_predictive_report(self, data, warehouse):
        """Generate predictive analytics report"""
        # Simple trend-based predictions
        predictions = {}
        
        if warehouse == 'all':
            for wh in ['china', 'ghana']:
                if wh in data:
                    predictions[wh] = self.predict_trends(data[wh])
        else:
            predictions[warehouse] = self.predict_trends(data)
        
        return {
            'current_data': data,
            'predictions': predictions,
            'report_type': 'predictive',
            'generated_at': timezone.now().isoformat()
        }
    
    def predict_trends(self, warehouse_data):
        """Simple trend prediction"""
        daily_trends = warehouse_data['daily_trends']
        
        if len(daily_trends) < 7:
            return {'error': 'Insufficient data for prediction'}
        
        # Calculate recent averages
        recent_avg_items = sum(d['items_received'] for d in daily_trends[-7:]) / 7
        recent_avg_cbm = sum(d['cbm_received'] for d in daily_trends[-7:]) / 7
        
        return {
            'predicted_daily_items': round(recent_avg_items, 1),
            'predicted_daily_cbm': round(recent_avg_cbm, 2),
            'confidence': 'medium',
            'next_week_total_items': round(recent_avg_items * 7),
            'capacity_alert': recent_avg_cbm > 500
        }
    
    def generate_optimization_report(self, data, warehouse):
        """Generate optimization recommendations"""
        optimizations = []
        
        if warehouse == 'all':
            for wh in ['china', 'ghana']:
                if wh in data:
                    optimizations.extend(self.get_optimization_suggestions(data[wh], wh))
        else:
            optimizations = self.get_optimization_suggestions(data, warehouse)
        
        return {
            'current_data': data,
            'optimizations': optimizations,
            'report_type': 'optimization',
            'generated_at': timezone.now().isoformat()
        }
    
    def get_optimization_suggestions(self, warehouse_data, warehouse_name):
        """Generate optimization suggestions"""
        suggestions = []
        performance = warehouse_data['performance']
        
        if performance['flagged_rate'] > 15:
            suggestions.append({
                'type': 'quality_improvement',
                'warehouse': warehouse_name,
                'issue': f"High flagged rate: {performance['flagged_rate']}%",
                'recommendation': 'Implement additional quality checks and staff training',
                'priority': 'high',
                'estimated_impact': 'Reduce flagged items by 30-50%'
            })
        
        if performance['slow_processing_rate'] > 25:
            suggestions.append({
                'type': 'process_improvement',
                'warehouse': warehouse_name,
                'issue': f"High slow processing rate: {performance['slow_processing_rate']}%",
                'recommendation': 'Review workflow processes and consider automation',
                'priority': 'medium',
                'estimated_impact': 'Improve processing speed by 20-40%'
            })
        
        if performance['efficiency_rate'] < 60:
            suggestions.append({
                'type': 'efficiency_improvement',
                'warehouse': warehouse_name,
                'issue': f"Low efficiency rate: {performance['efficiency_rate']}%",
                'recommendation': 'Analyze bottlenecks and optimize resource allocation',
                'priority': 'high',
                'estimated_impact': 'Increase efficiency by 25-35%'
            })
        
        # Location-based optimizations
        location_stats = warehouse_data['location_stats']
        if location_stats:
            slowest_location = max(location_stats, key=lambda x: x['avg_processing_time'] or 0)
            if slowest_location['avg_processing_time'] and slowest_location['avg_processing_time'] > 20:
                suggestions.append({
                    'type': 'location_optimization',
                    'warehouse': warehouse_name,
                    'issue': f"Slow processing in {slowest_location['location']}: {slowest_location['avg_processing_time']:.1f} days",
                    'recommendation': 'Focus improvement efforts on this location',
                    'priority': 'medium',
                    'estimated_impact': 'Reduce location processing time by 30%'
                })
        
        return suggestions
    
    def output_report(self, data, output_format, file_path):
        """Output the report in the specified format"""
        if output_format == 'json':
            json_data = json.dumps(data, indent=2, default=str)
            if file_path:
                with open(file_path, 'w') as f:
                    f.write(json_data)
                self.stdout.write(f'JSON report saved to {file_path}')
            else:
                self.stdout.write(json_data)
        
        elif output_format == 'csv':
            if file_path:
                self.export_to_csv(data, file_path)
                self.stdout.write(f'CSV report saved to {file_path}')
            else:
                self.stdout.write('CSV format requires --file parameter')
        
        else:  # console
            self.print_console_report(data)
    
    def export_to_csv(self, data, file_path):
        """Export data to CSV format"""
        with open(file_path, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write summary data
            if 'basic_stats' in data:
                writer.writerow(['Metric', 'Value'])
                for key, value in data['basic_stats'].items():
                    writer.writerow([key.replace('_', ' ').title(), value])
                writer.writerow([])  # Empty row
            
            # Write daily trends if available
            if 'daily_trends' in data:
                writer.writerow(['Daily Trends'])
                trends = data['daily_trends']
                if trends:
                    writer.writerow(trends[0].keys())
                    for trend in trends:
                        writer.writerow(trend.values())
    
    def print_console_report(self, data):
        """Print report to console"""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('WAREHOUSE ANALYTICS REPORT'))
        self.stdout.write('='*60)
        
        if 'china' in data and 'ghana' in data:
            # Multi-warehouse report
            self.stdout.write('\nCHINA WAREHOUSE:')
            self.print_warehouse_summary(data['china'])
            
            self.stdout.write('\nGHANA WAREHOUSE:')
            self.print_warehouse_summary(data['ghana'])
            
            self.stdout.write('\nCOMBINED METRICS:')
            combined = data['combined']
            self.stdout.write(f"Total Items: {combined['total_items']}")
            self.stdout.write(f"Total CBM: {combined['total_cbm']:.2f}")
            self.stdout.write(f"Total Value: ${combined['total_value']:,.2f}")
            
        else:
            # Single warehouse report
            self.print_warehouse_summary(data)
        
        # Print insights if available
        if 'insights' in data:
            self.stdout.write('\nKEY INSIGHTS:')
            for insight in data['insights']:
                self.stdout.write(f"• {insight}")
        
        # Print optimizations if available
        if 'optimizations' in data:
            self.stdout.write('\nOPTIMIZATION RECOMMENDATIONS:')
            for opt in data['optimizations']:
                self.stdout.write(f"• {opt['recommendation']} (Priority: {opt['priority']})")
    
    def print_warehouse_summary(self, warehouse_data):
        """Print summary for a single warehouse"""
        stats = warehouse_data['basic_stats']
        performance = warehouse_data['performance']
        
        self.stdout.write(f"Period: {warehouse_data['period']}")
        self.stdout.write(f"Total Items: {stats['total_items']}")
        self.stdout.write(f"Total CBM: {stats['total_cbm']:.2f}")
        self.stdout.write(f"Efficiency Rate: {performance['efficiency_rate']:.1f}%")
        self.stdout.write(f"Flagged Rate: {performance['flagged_rate']:.1f}%")
        self.stdout.write(f"On-time Rate: {performance['on_time_rate']:.1f}%")

"""
Advanced serializers for enhanced logistics functionality
"""
from rest_framework import serializers
from .models import GoodsReceivedChina, GoodsReceivedGhana
from django.utils import timezone
from decimal import Decimal
import uuid


class SmartRecommendationSerializer(serializers.Serializer):
    """Serializer for AI-generated recommendations"""
    type = serializers.CharField()
    message = serializers.CharField()
    action = serializers.CharField()
    priority = serializers.ChoiceField(choices=['low', 'medium', 'high', 'critical'])
    estimated_impact = serializers.CharField(required=False)


class CapacityForecastSerializer(serializers.Serializer):
    """Serializer for capacity forecasting data"""
    date = serializers.DateField()
    predicted_items = serializers.IntegerField()
    predicted_cbm = serializers.DecimalField(max_digits=10, decimal_places=2)
    confidence = serializers.FloatField()
    risk_level = serializers.ChoiceField(choices=['low', 'medium', 'high'])


class OptimizationSuggestionSerializer(serializers.Serializer):
    """Serializer for shipping optimization suggestions"""
    type = serializers.CharField()
    location = serializers.CharField()
    items = serializers.IntegerField()
    cbm = serializers.DecimalField(max_digits=10, decimal_places=3)
    recommendation = serializers.CharField()
    priority = serializers.CharField()
    cost_savings = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class RealTimeMetricsSerializer(serializers.Serializer):
    """Serializer for real-time warehouse metrics"""
    timestamp = serializers.DateTimeField()
    active_items = serializers.IntegerField()
    processing_rate = serializers.FloatField()
    efficiency_score = serializers.FloatField()
    alerts_count = serializers.IntegerField()
    utilization_percentage = serializers.FloatField()


class BulkOperationSerializer(serializers.Serializer):
    """Enhanced bulk operations serializer"""
    item_ids = serializers.ListField(
        child=serializers.CharField(max_length=50),
        min_length=1,
        max_length=500  # Increased limit for enterprise use
    )
    operation = serializers.ChoiceField(choices=[
        ('status_update', 'Update Status'),
        ('location_update', 'Update Location'),
        ('bulk_export', 'Export Data'),
        ('priority_flag', 'Set Priority'),
        ('batch_ship', 'Batch Ship')
    ])
    parameters = serializers.JSONField()
    notify_customers = serializers.BooleanField(default=False)
    scheduled_execution = serializers.DateTimeField(required=False)


class SmartSearchSerializer(serializers.Serializer):
    """Advanced search with AI-powered suggestions"""
    query = serializers.CharField(max_length=500)
    search_type = serializers.ChoiceField(
        choices=[
            ('basic', 'Basic Search'),
            ('semantic', 'Semantic Search'),
            ('pattern', 'Pattern Matching'),
            ('predictive', 'Predictive Search')
        ],
        default='basic'
    )
    filters = serializers.JSONField(required=False)
    sort_by_relevance = serializers.BooleanField(default=True)
    include_suggestions = serializers.BooleanField(default=True)


class EnhancedGoodsSerializer(serializers.ModelSerializer):
    """Enhanced goods serializer with additional computed fields"""
    
    # Computed fields
    risk_score = serializers.SerializerMethodField()
    processing_status = serializers.SerializerMethodField()
    optimization_suggestions = serializers.SerializerMethodField()
    customer_priority = serializers.SerializerMethodField()
    estimated_ship_date = serializers.SerializerMethodField()
    storage_cost = serializers.SerializerMethodField()
    
    class Meta:
        fields = '__all__'
        
    def get_risk_score(self, obj):
        """Calculate risk score based on multiple factors"""
        score = 0
        
        # Age factor
        if obj.days_in_warehouse > 30:
            score += 30
        elif obj.days_in_warehouse > 14:
            score += 15
        
        # Status factor
        if obj.status == 'FLAGGED':
            score += 25
        elif obj.status == 'PENDING':
            score += 10
        
        # Size factor (unusual size might indicate issues)
        if obj.cbm > 50 or obj.cbm < 0.1:
            score += 10
        
        # Value factor
        if obj.estimated_value and obj.estimated_value > 10000:
            score += 15
        
        return min(score, 100)
    
    def get_processing_status(self, obj):
        """Get detailed processing status"""
        if obj.days_in_warehouse <= 3:
            return 'on_track'
        elif obj.days_in_warehouse <= 7:
            return 'monitoring'
        elif obj.days_in_warehouse <= 14:
            return 'attention_needed'
        else:
            return 'overdue'
    
    def get_optimization_suggestions(self, obj):
        """Get optimization suggestions for this item"""
        suggestions = []
        
        if obj.days_in_warehouse > 21:
            suggestions.append('Consider expedited processing')
        
        if obj.status == 'READY_FOR_SHIPPING':
            # Check if there are other items for same customer/location
            same_customer_count = obj.__class__.objects.filter(
                customer=obj.customer,
                status='READY_FOR_SHIPPING'
            ).count()
            
            if same_customer_count > 1:
                suggestions.append('Consolidation opportunity available')
        
        if obj.cbm > 20:
            suggestions.append('Consider dedicated container')
        
        return suggestions
    
    def get_customer_priority(self, obj):
        """Determine customer priority level"""
        if obj.customer and hasattr(obj.customer, 'priority_level'):
            return obj.customer.priority_level
        
        # Default priority based on value and urgency
        if obj.estimated_value and obj.estimated_value > 50000:
            return 'high'
        elif obj.days_in_warehouse > 30:
            return 'urgent'
        else:
            return 'standard'
    
    def get_estimated_ship_date(self, obj):
        """Predict shipping date based on current status and patterns"""
        if obj.status in ['SHIPPED', 'DELIVERED']:
            return None
        
        # Simple prediction based on status
        base_date = timezone.now().date()
        
        if obj.status == 'READY_FOR_SHIPPING':
            return base_date + timezone.timedelta(days=2)
        elif obj.status == 'PENDING':
            return base_date + timezone.timedelta(days=7)
        elif obj.status == 'FLAGGED':
            return base_date + timezone.timedelta(days=14)
        
        return base_date + timezone.timedelta(days=5)
    
    def get_storage_cost(self, obj):
        """Calculate storage cost based on time and space"""
        daily_rate_per_cbm = Decimal('2.50')  # Configurable rate
        storage_cost = obj.days_in_warehouse * obj.cbm * daily_rate_per_cbm
        return round(storage_cost, 2)


class EnhancedGoodsReceivedChinaSerializer(EnhancedGoodsSerializer):
    """Enhanced China goods serializer"""
    
    class Meta:
        model = GoodsReceivedChina
        fields = [
            'id', 'item_id', 'customer', 'shipping_mark', 'supply_tracking',
            'cbm', 'weight', 'quantity', 'description', 'location',
            'status', 'method_of_shipping', 'supplier_name', 'estimated_value', 'notes',
            'date_received', 'created_at', 'updated_at',
            'days_in_warehouse', 'is_ready_for_shipping', 'is_flagged',
            # Enhanced fields
            'risk_score', 'processing_status', 'optimization_suggestions',
            'customer_priority', 'estimated_ship_date', 'storage_cost'
        ]
        read_only_fields = [
            'item_id', 'date_received', 'created_at', 'updated_at',
            'risk_score', 'processing_status', 'optimization_suggestions',
            'customer_priority', 'estimated_ship_date', 'storage_cost'
        ]


class EnhancedGoodsReceivedGhanaSerializer(EnhancedGoodsSerializer):
    """Enhanced Ghana goods serializer"""
    
    class Meta:
        model = GoodsReceivedGhana
        fields = [
            'id', 'item_id', 'customer', 'shipping_mark', 'supply_tracking',
            'cbm', 'weight', 'quantity', 'description', 'location',
            'status', 'method_of_shipping', 'supplier_name', 'estimated_value', 'notes',
            'date_received', 'created_at', 'updated_at',
            'days_in_warehouse', 'is_ready_for_delivery', 'is_flagged',
            # Enhanced fields
            'risk_score', 'processing_status', 'optimization_suggestions',
            'customer_priority', 'estimated_ship_date', 'storage_cost'
        ]
        read_only_fields = [
            'item_id', 'date_received', 'created_at', 'updated_at',
            'risk_score', 'processing_status', 'optimization_suggestions',
            'customer_priority', 'estimated_ship_date', 'storage_cost'
        ]


class WorkflowAutomationSerializer(serializers.Serializer):
    """Serializer for workflow automation rules"""
    name = serializers.CharField(max_length=100)
    trigger_condition = serializers.JSONField()
    actions = serializers.ListField(child=serializers.JSONField())
    is_active = serializers.BooleanField(default=True)
    priority = serializers.IntegerField(min_value=1, max_value=10)
    
    def validate_trigger_condition(self, value):
        """Validate trigger condition structure"""
        required_fields = ['field', 'operator', 'value']
        if not all(field in value for field in required_fields):
            raise serializers.ValidationError(
                "Trigger condition must include field, operator, and value"
            )
        return value


class QualityMetricsSerializer(serializers.Serializer):
    """Serializer for quality metrics and KPIs"""
    accuracy_rate = serializers.FloatField()
    processing_speed = serializers.FloatField()
    customer_satisfaction = serializers.FloatField()
    error_rate = serializers.FloatField()
    on_time_delivery = serializers.FloatField()
    cost_efficiency = serializers.FloatField()
    timestamp = serializers.DateTimeField()
    
    def validate(self, data):
        """Ensure all rates are between 0 and 100"""
        rate_fields = ['accuracy_rate', 'customer_satisfaction', 'error_rate', 'on_time_delivery', 'cost_efficiency']
        for field in rate_fields:
            if field in data and not (0 <= data[field] <= 100):
                raise serializers.ValidationError(f"{field} must be between 0 and 100")
        return data

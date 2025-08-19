"""
Advanced configuration system for goods management
"""
from django.conf import settings
from django.core.cache import cache
import json


class GoodsConfig:
    """Configuration manager for goods management system"""
    
    # Default configuration values
    DEFAULT_CONFIG = {
        'WAREHOUSE_SETTINGS': {
            'china': {
                'max_capacity_cbm': 10000,
                'max_daily_intake': 200,
                'processing_sla_days': 14,
                'high_priority_threshold_value': 25000,
                'auto_flag_threshold_days': 30,
                'locations': ['GUANGZHOU', 'SHENZHEN', 'SHANGHAI', 'YIWU', 'OTHER']
            },
            'ghana': {
                'max_capacity_cbm': 8000,
                'max_daily_intake': 150,
                'processing_sla_days': 21,
                'high_priority_threshold_value': 20000,
                'auto_flag_threshold_days': 35,
                'locations': ['ACCRA', 'KUMASI', 'TAKORADI', 'OTHER']
            }
        },
        'VALIDATION_LIMITS': {
            'max_cbm_per_item': 1000,
            'max_weight_per_item': 50000,
            'max_quantity_per_item': 100000,
            'max_estimated_value': 1000000,
            'min_cbm_per_item': 0.001,
            'min_weight_per_item': 0.01
        },
        'NOTIFICATION_SETTINGS': {
            'email_notifications': True,
            'sms_notifications': False,
            'slack_notifications': False,
            'critical_alert_recipients': ['admin@primepre.com'],
            'notification_frequency': {
                'overdue_check': 'daily',
                'capacity_check': 'hourly',
                'quality_check': 'daily'
            }
        },
        'WORKFLOW_SETTINGS': {
            'auto_workflows_enabled': True,
            'max_processing_time_days': 45,
            'auto_flag_enabled': True,
            'priority_processing_enabled': True,
            'batch_processing_enabled': True
        },
        'ANALYTICS_SETTINGS': {
            'cache_duration_hours': 6,
            'trend_analysis_days': 30,
            'performance_benchmark_days': 90,
            'predictive_forecast_days': 7
        },
        'EXCEL_SETTINGS': {
            'max_file_size_mb': 10,
            'max_rows_per_upload': 1000,
            'allowed_extensions': ['.xlsx', '.xls', '.csv'],
            'template_auto_date': True
        },
        'SECURITY_SETTINGS': {
            'max_bulk_operation_items': 500,
            'api_rate_limit_per_minute': 100,
            'require_reason_for_status_change': True,
            'audit_all_changes': True
        }
    }
    
    @classmethod
    def get(cls, key, default=None):
        """Get configuration value with fallback to default"""
        # Try to get from Django settings first
        config = getattr(settings, 'GOODS_CONFIG', {})
        
        # Navigate through nested keys
        keys = key.split('.')
        value = config
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            # Fall back to default configuration
            value = cls.DEFAULT_CONFIG
            try:
                for k in keys:
                    value = value[k]
                return value
            except (KeyError, TypeError):
                return default
    
    @classmethod
    def get_warehouse_config(cls, warehouse_type):
        """Get configuration for specific warehouse"""
        return cls.get(f'WAREHOUSE_SETTINGS.{warehouse_type}', {})
    
    @classmethod
    def get_validation_limits(cls):
        """Get validation limits"""
        return cls.get('VALIDATION_LIMITS', {})
    
    @classmethod
    def get_notification_settings(cls):
        """Get notification settings"""
        return cls.get('NOTIFICATION_SETTINGS', {})
    
    @classmethod
    def is_feature_enabled(cls, feature_key):
        """Check if a feature is enabled"""
        return cls.get(feature_key, False)
    
    @classmethod
    def get_cache_key(cls, prefix, warehouse=None, date=None):
        """Generate cache key for analytics data"""
        key_parts = [prefix]
        
        if warehouse:
            key_parts.append(warehouse)
        
        if date:
            key_parts.append(date.strftime('%Y-%m-%d'))
        
        return '_'.join(key_parts)
    
    @classmethod
    def should_cache_analytics(cls):
        """Check if analytics should be cached"""
        return cls.get('ANALYTICS_SETTINGS.cache_duration_hours', 0) > 0
    
    @classmethod
    def get_cache_duration(cls):
        """Get cache duration in seconds"""
        hours = cls.get('ANALYTICS_SETTINGS.cache_duration_hours', 6)
        return hours * 3600


class ThresholdManager:
    """Manager for dynamic threshold calculations"""
    
    @staticmethod
    def get_overdue_threshold(warehouse_type):
        """Get overdue threshold for warehouse"""
        config = GoodsConfig.get_warehouse_config(warehouse_type)
        return config.get('auto_flag_threshold_days', 30)
    
    @staticmethod
    def get_high_priority_threshold(warehouse_type):
        """Get high priority value threshold"""
        config = GoodsConfig.get_warehouse_config(warehouse_type)
        return config.get('high_priority_threshold_value', 25000)
    
    @staticmethod
    def get_capacity_threshold(warehouse_type):
        """Get capacity threshold for alerts"""
        config = GoodsConfig.get_warehouse_config(warehouse_type)
        max_capacity = config.get('max_capacity_cbm', 10000)
        return max_capacity * 0.85  # Alert at 85% capacity
    
    @staticmethod
    def get_daily_intake_threshold(warehouse_type):
        """Get daily intake threshold for alerts"""
        config = GoodsConfig.get_warehouse_config(warehouse_type)
        return config.get('max_daily_intake', 200)
    
    @staticmethod
    def get_processing_sla(warehouse_type):
        """Get processing SLA in days"""
        config = GoodsConfig.get_warehouse_config(warehouse_type)
        return config.get('processing_sla_days', 14)


class FeatureFlags:
    """Feature flag manager for gradual rollout of new features"""
    
    AVAILABLE_FLAGS = {
        'advanced_analytics': 'Enable advanced analytics dashboard',
        'predictive_alerts': 'Enable predictive alerting system',
        'workflow_automation': 'Enable workflow automation',
        'smart_search': 'Enable AI-powered smart search',
        'real_time_notifications': 'Enable real-time notifications',
        'bulk_operations_v2': 'Enable enhanced bulk operations',
        'mobile_app_api': 'Enable mobile app API endpoints',
        'blockchain_tracking': 'Enable blockchain tracking (future)',
        'iot_integration': 'Enable IoT sensor integration (future)',
        'ml_predictions': 'Enable machine learning predictions (future)'
    }
    
    @classmethod
    def is_enabled(cls, flag_name, default=False):
        """Check if a feature flag is enabled"""
        # Check in cache first
        cache_key = f'feature_flag_{flag_name}'
        cached_value = cache.get(cache_key)
        
        if cached_value is not None:
            return cached_value
        
        # Check in Django settings
        feature_flags = getattr(settings, 'FEATURE_FLAGS', {})
        enabled = feature_flags.get(flag_name, default)
        
        # Cache for 1 hour
        cache.set(cache_key, enabled, 3600)
        
        return enabled
    
    @classmethod
    def get_all_flags(cls):
        """Get all available feature flags with their status"""
        flags = {}
        for flag_name, description in cls.AVAILABLE_FLAGS.items():
            flags[flag_name] = {
                'description': description,
                'enabled': cls.is_enabled(flag_name)
            }
        return flags
    
    @classmethod
    def enable_flag(cls, flag_name):
        """Enable a feature flag (for admin use)"""
        cache_key = f'feature_flag_{flag_name}'
        cache.set(cache_key, True, 3600)
        return True
    
    @classmethod
    def disable_flag(cls, flag_name):
        """Disable a feature flag (for admin use)"""
        cache_key = f'feature_flag_{flag_name}'
        cache.set(cache_key, False, 3600)
        return True


class PerformanceConfig:
    """Configuration for performance optimization"""
    
    @staticmethod
    def get_query_timeout():
        """Get database query timeout in seconds"""
        return GoodsConfig.get('PERFORMANCE_SETTINGS.query_timeout_seconds', 30)
    
    @staticmethod
    def get_bulk_size():
        """Get optimal bulk operation size"""
        return GoodsConfig.get('PERFORMANCE_SETTINGS.bulk_operation_size', 100)
    
    @staticmethod
    def should_use_select_related():
        """Check if select_related optimization should be used"""
        return GoodsConfig.get('PERFORMANCE_SETTINGS.use_select_related', True)
    
    @staticmethod
    def get_pagination_size():
        """Get default pagination size"""
        return GoodsConfig.get('PERFORMANCE_SETTINGS.pagination_size', 25)
    
    @staticmethod
    def get_cache_prefix():
        """Get cache key prefix"""
        return GoodsConfig.get('PERFORMANCE_SETTINGS.cache_prefix', 'goods_')


# Convenience functions for common configuration access
def get_warehouse_capacity(warehouse_type):
    """Get warehouse capacity"""
    return GoodsConfig.get(f'WAREHOUSE_SETTINGS.{warehouse_type}.max_capacity_cbm', 10000)


def get_validation_limit(limit_type):
    """Get validation limit"""
    return GoodsConfig.get(f'VALIDATION_LIMITS.{limit_type}')


def is_workflow_enabled():
    """Check if workflow automation is enabled"""
    return (GoodsConfig.get('WORKFLOW_SETTINGS.auto_workflows_enabled', True) and 
            FeatureFlags.is_enabled('workflow_automation', True))


def should_send_notifications():
    """Check if notifications should be sent"""
    return GoodsConfig.get('NOTIFICATION_SETTINGS.email_notifications', True)

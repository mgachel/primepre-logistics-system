"""
Advanced workflow automation system for goods management
"""
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import json
import logging
from .models import GoodsReceivedChina, GoodsReceivedGhana
from .notifications import NotificationService

logger = logging.getLogger(__name__)


class WorkflowRule:
    """Represents a workflow automation rule"""
    
    def __init__(self, name, trigger_condition, actions, priority=5, is_active=True):
        self.name = name
        self.trigger_condition = trigger_condition
        self.actions = actions
        self.priority = priority
        self.is_active = is_active
    
    def matches(self, goods_item):
        """Check if this rule matches the goods item"""
        if not self.is_active:
            return False
        
        return self._evaluate_condition(goods_item, self.trigger_condition)
    
    def _evaluate_condition(self, goods_item, condition):
        """Evaluate a condition against a goods item"""
        field = condition.get('field')
        operator = condition.get('operator')
        value = condition.get('value')
        
        if not all([field, operator, value]):
            return False
        
        item_value = getattr(goods_item, field, None)
        
        if operator == 'equals':
            return item_value == value
        elif operator == 'greater_than':
            return item_value and item_value > value
        elif operator == 'less_than':
            return item_value and item_value < value
        elif operator == 'contains':
            return item_value and str(value).lower() in str(item_value).lower()
        elif operator == 'in':
            return item_value in value
        elif operator == 'days_since':
            if field == 'date_received':
                days_since = (timezone.now() - goods_item.date_received).days
                return days_since >= value
        
        return False
    
    def execute(self, goods_item):
        """Execute the actions for this rule"""
        for action in self.actions:
            try:
                self._execute_action(goods_item, action)
            except Exception as e:
                logger.error(f"Failed to execute action {action} for rule {self.name}: {e}")
    
    def _execute_action(self, goods_item, action):
        """Execute a single action"""
        action_type = action.get('type')
        parameters = action.get('parameters', {})
        
        if action_type == 'update_status':
            new_status = parameters.get('status')
            reason = parameters.get('reason', f'Automated by rule: {self.name}')
            
            if new_status == 'FLAGGED':
                goods_item.flag_goods(reason)
            elif new_status == 'READY_FOR_SHIPPING':
                goods_item.mark_ready_for_shipping()
            elif new_status == 'SHIPPED':
                goods_item.mark_shipped()
            else:
                goods_item.status = new_status
                if reason:
                    current_notes = goods_item.notes or ""
                    goods_item.notes = f"{current_notes}\n{reason}".strip()
                goods_item.save(update_fields=['status', 'notes', 'updated_at'])
        
        elif action_type == 'send_notification':
            message = parameters.get('message', '').format(
                shipping_mark=goods_item.shipping_mark,
                days_in_warehouse=goods_item.days_in_warehouse,
                status=goods_item.status
            )
            level = parameters.get('level', 'info')
            
            NotificationService.send_notification(
                f'WORKFLOW_{self.name.upper()}',
                message,
                level=level
            )
        
        elif action_type == 'add_note':
            note = parameters.get('note', '').format(
                shipping_mark=goods_item.shipping_mark,
                days_in_warehouse=goods_item.days_in_warehouse,
                rule_name=self.name
            )
            
            current_notes = goods_item.notes or ""
            goods_item.notes = f"{current_notes}\n{note}".strip()
            goods_item.save(update_fields=['notes', 'updated_at'])
        
        elif action_type == 'priority_flag':
            priority_level = parameters.get('priority', 'high')
            note = f"Priority flagged as {priority_level} by rule: {self.name}"
            
            current_notes = goods_item.notes or ""
            goods_item.notes = f"{current_notes}\n[PRIORITY-{priority_level.upper()}] {note}".strip()
            goods_item.save(update_fields=['notes', 'updated_at'])


class WorkflowEngine:
    """Main workflow automation engine"""
    
    def __init__(self):
        self.rules = self._load_default_rules()
    
    def _load_default_rules(self):
        """Load default workflow rules"""
        return [
            # Auto-flag items that are pending too long
            WorkflowRule(
                name="auto_flag_overdue",
                trigger_condition={
                    'field': 'date_received',
                    'operator': 'days_since',
                    'value': 30
                },
                actions=[
                    {
                        'type': 'update_status',
                        'parameters': {
                            'status': 'FLAGGED',
                            'reason': 'Automatically flagged: Item pending for 30+ days'
                        }
                    },
                    {
                        'type': 'send_notification',
                        'parameters': {
                            'message': 'Item {shipping_mark} auto-flagged for being pending {days_in_warehouse} days',
                            'level': 'warning'
                        }
                    }
                ],
                priority=8
            ),
            
            # Priority handling for high-value items
            WorkflowRule(
                name="high_value_priority",
                trigger_condition={
                    'field': 'estimated_value',
                    'operator': 'greater_than',
                    'value': 25000
                },
                actions=[
                    {
                        'type': 'priority_flag',
                        'parameters': {
                            'priority': 'high'
                        }
                    },
                    {
                        'type': 'send_notification',
                        'parameters': {
                            'message': 'High-value item received: {shipping_mark} - prioritized for processing',
                            'level': 'info'
                        }
                    }
                ],
                priority=9
            ),
            
            # Auto-ready items that meet certain criteria
            WorkflowRule(
                name="auto_ready_small_items",
                trigger_condition={
                    'field': 'cbm',
                    'operator': 'less_than',
                    'value': 1.0
                },
                actions=[
                    {
                        'type': 'add_note',
                        'parameters': {
                            'note': 'Small item (< 1 CBM) - expedited for processing'
                        }
                    }
                ],
                priority=3
            ),
            
            # Alert for unusual patterns
            WorkflowRule(
                name="large_volume_alert",
                trigger_condition={
                    'field': 'cbm',
                    'operator': 'greater_than',
                    'value': 50
                },
                actions=[
                    {
                        'type': 'send_notification',
                        'parameters': {
                            'message': 'Large volume item received: {shipping_mark} ({cbm} CBM) - requires special handling',
                            'level': 'warning'
                        }
                    },
                    {
                        'type': 'priority_flag',
                        'parameters': {
                            'priority': 'high'
                        }
                    }
                ],
                priority=7
            ),
            
            # Customer VIP handling
            WorkflowRule(
                name="vip_customer_priority",
                trigger_condition={
                    'field': 'shipping_mark',
                    'operator': 'contains',
                    'value': 'VIP'
                },
                actions=[
                    {
                        'type': 'priority_flag',
                        'parameters': {
                            'priority': 'urgent'
                        }
                    },
                    {
                        'type': 'send_notification',
                        'parameters': {
                            'message': 'VIP customer item received: {shipping_mark} - urgent processing required',
                            'level': 'info'
                        }
                    }
                ],
                priority=10
            )
        ]
    
    def add_rule(self, rule):
        """Add a new workflow rule"""
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority, reverse=True)
    
    def remove_rule(self, rule_name):
        """Remove a workflow rule"""
        self.rules = [r for r in self.rules if r.name != rule_name]
    
    def process_item(self, goods_item):
        """Process a goods item through all applicable rules"""
        applied_rules = []
        
        for rule in self.rules:
            if rule.matches(goods_item):
                rule.execute(goods_item)
                applied_rules.append(rule.name)
        
        return applied_rules
    
    def process_all_pending(self):
        """Process all pending items through workflow rules"""
        processed_count = 0
        
        # Process China warehouse
        china_items = GoodsReceivedChina.objects.filter(
            status__in=['PENDING', 'READY_FOR_SHIPPING']
        )
        
        for item in china_items:
            rules_applied = self.process_item(item)
            if rules_applied:
                processed_count += 1
                logger.info(f"Applied workflow rules {rules_applied} to item {item.shipping_mark}")
        
        # Process Ghana warehouse
        ghana_items = GoodsReceivedGhana.objects.filter(
            status__in=['PENDING', 'READY_FOR_DELIVERY']
        )
        
        for item in ghana_items:
            rules_applied = self.process_item(item)
            if rules_applied:
                processed_count += 1
                logger.info(f"Applied workflow rules {rules_applied} to item {item.shipping_mark}")
        
        return processed_count
    
    def get_rule_statistics(self):
        """Get statistics about rule applications"""
        stats = {}
        
        for rule in self.rules:
            # Count how many items would match this rule
            china_matches = 0
            ghana_matches = 0
            
            china_items = GoodsReceivedChina.objects.all()[:100]  # Sample
            for item in china_items:
                if rule.matches(item):
                    china_matches += 1
            
            ghana_items = GoodsReceivedGhana.objects.all()[:100]  # Sample
            for item in ghana_items:
                if rule.matches(item):
                    ghana_matches += 1
            
            stats[rule.name] = {
                'is_active': rule.is_active,
                'priority': rule.priority,
                'china_matches': china_matches,
                'ghana_matches': ghana_matches,
                'total_matches': china_matches + ghana_matches
            }
        
        return stats


class SmartWorkflowBuilder:
    """Builder for creating intelligent workflow rules"""
    
    @staticmethod
    def create_time_based_rule(name, days_threshold, action_type, action_params):
        """Create a time-based workflow rule"""
        return WorkflowRule(
            name=name,
            trigger_condition={
                'field': 'date_received',
                'operator': 'days_since',
                'value': days_threshold
            },
            actions=[{
                'type': action_type,
                'parameters': action_params
            }]
        )
    
    @staticmethod
    def create_value_based_rule(name, field, threshold, comparison, action_type, action_params):
        """Create a value-based workflow rule"""
        return WorkflowRule(
            name=name,
            trigger_condition={
                'field': field,
                'operator': comparison,
                'value': threshold
            },
            actions=[{
                'type': action_type,
                'parameters': action_params
            }]
        )
    
    @staticmethod
    def create_pattern_based_rule(name, field, pattern, action_type, action_params):
        """Create a pattern-based workflow rule"""
        return WorkflowRule(
            name=name,
            trigger_condition={
                'field': field,
                'operator': 'contains',
                'value': pattern
            },
            actions=[{
                'type': action_type,
                'parameters': action_params
            }]
        )


# Global workflow engine instance
workflow_engine = WorkflowEngine()


def apply_workflows_to_item(goods_item):
    """Apply workflow rules to a single item"""
    return workflow_engine.process_item(goods_item)


def run_daily_workflows():
    """Run daily workflow processing"""
    logger.info("Starting daily workflow processing...")
    processed_count = workflow_engine.process_all_pending()
    logger.info(f"Daily workflow processing completed. Processed {processed_count} items.")
    return processed_count

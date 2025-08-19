"""
Real-time notification system for goods management
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import logging
from .models import GoodsReceivedChina, GoodsReceivedGhana

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications"""
    
    @staticmethod
    def send_notification(notification_type, message, recipients=None, level='info'):
        """Send notification via multiple channels"""
        
        # Log notification
        if level == 'critical':
            logger.critical(f"[{notification_type}] {message}")
        elif level == 'warning':
            logger.warning(f"[{notification_type}] {message}")
        else:
            logger.info(f"[{notification_type}] {message}")
        
        # Email notification for critical alerts
        if level == 'critical' and recipients:
            try:
                send_mail(
                    subject=f'Critical Alert: {notification_type}',
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=recipients,
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Failed to send email notification: {e}")
        
        # Could add more notification channels here:
        # - SMS via Twilio
        # - Slack notifications
        # - Push notifications
        # - WebSocket real-time updates
    
    @staticmethod
    def check_overdue_items():
        """Check for overdue items and send alerts"""
        threshold_date = timezone.now() - timedelta(days=30)
        
        # Check China warehouse
        china_overdue = GoodsReceivedChina.objects.filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'FLAGGED']
        )
        
        if china_overdue.exists():
            count = china_overdue.count()
            NotificationService.send_notification(
                'OVERDUE_ITEMS',
                f'{count} items in China warehouse are overdue (30+ days)',
                level='warning'
            )
        
        # Check Ghana warehouse
        ghana_overdue = GoodsReceivedGhana.objects.filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'FLAGGED']
        )
        
        if ghana_overdue.exists():
            count = ghana_overdue.count()
            NotificationService.send_notification(
                'OVERDUE_ITEMS',
                f'{count} items in Ghana warehouse are overdue (30+ days)',
                level='warning'
            )
    
    @staticmethod
    def check_capacity_alerts():
        """Check for capacity alerts"""
        today = timezone.now().date()
        
        # Check daily volume for China
        china_today = GoodsReceivedChina.objects.filter(
            date_received__date=today
        ).count()
        
        if china_today > 100:  # Configurable threshold
            NotificationService.send_notification(
                'HIGH_VOLUME',
                f'High volume day in China: {china_today} items received',
                level='info'
            )
        
        # Check daily volume for Ghana
        ghana_today = GoodsReceivedGhana.objects.filter(
            date_received__date=today
        ).count()
        
        if ghana_today > 80:  # Configurable threshold
            NotificationService.send_notification(
                'HIGH_VOLUME',
                f'High volume day in Ghana: {ghana_today} items received',
                level='info'
            )


@receiver(post_save, sender=GoodsReceivedChina)
@receiver(post_save, sender=GoodsReceivedGhana)
def goods_status_notification(sender, instance, created, **kwargs):
    """Send notifications when goods status changes"""
    
    if created:
        # New item received
        NotificationService.send_notification(
            'NEW_GOODS',
            f'New item received: {instance.shipping_mark} ({instance.cbm} CBM)',
            level='info'
        )
    
    # Check for items that have been pending too long
    if instance.status == 'PENDING' and instance.days_in_warehouse > 14:
        NotificationService.send_notification(
            'LONG_PENDING',
            f'Item {instance.shipping_mark} has been pending for {instance.days_in_warehouse} days',
            level='warning'
        )
    
    # Alert when items are flagged
    if instance.status == 'FLAGGED':
        NotificationService.send_notification(
            'ITEM_FLAGGED',
            f'Item flagged: {instance.shipping_mark} - requires attention',
            level='warning'
        )
    
    # Celebration when items are shipped
    if instance.status in ['SHIPPED', 'DELIVERED']:
        days = instance.days_in_warehouse
        efficiency = 'excellent' if days <= 7 else 'good' if days <= 14 else 'needs improvement'
        
        NotificationService.send_notification(
            'ITEM_SHIPPED',
            f'Item shipped: {instance.shipping_mark} (processed in {days} days - {efficiency})',
            level='info'
        )


@receiver(pre_save, sender=GoodsReceivedChina)
@receiver(pre_save, sender=GoodsReceivedGhana)
def goods_validation_alerts(sender, instance, **kwargs):
    """Send alerts for data validation issues"""
    
    # Check for unusually large CBM
    if instance.cbm > 100:
        NotificationService.send_notification(
            'LARGE_CBM',
            f'Unusually large CBM detected: {instance.shipping_mark} ({instance.cbm} CBM)',
            level='warning'
        )
    
    # Check for high value items
    if instance.estimated_value and instance.estimated_value > 50000:
        NotificationService.send_notification(
            'HIGH_VALUE',
            f'High value item: {instance.shipping_mark} (${instance.estimated_value:,.2f})',
            level='info'
        )


class SmartAlertEngine:
    """Advanced alert engine with pattern recognition"""
    
    @staticmethod
    def analyze_patterns():
        """Analyze patterns and generate intelligent alerts"""
        
        # Detect unusual spikes in flagged items
        last_7_days = timezone.now() - timedelta(days=7)
        
        china_flagged_rate = GoodsReceivedChina.objects.filter(
            date_received__gte=last_7_days,
            status='FLAGGED'
        ).count()
        
        china_total = GoodsReceivedChina.objects.filter(
            date_received__gte=last_7_days
        ).count()
        
        if china_total > 0:
            flagged_percentage = (china_flagged_rate / china_total) * 100
            
            if flagged_percentage > 20:  # Threshold
                NotificationService.send_notification(
                    'QUALITY_SPIKE',
                    f'Quality issue spike detected in China: {flagged_percentage:.1f}% flagged in last 7 days',
                    level='critical'
                )
        
        # Detect processing bottlenecks
        slow_items = GoodsReceivedChina.objects.filter(
            status='PENDING',
            days_in_warehouse__gt=21
        ).count()
        
        if slow_items > 20:
            NotificationService.send_notification(
                'PROCESSING_BOTTLENECK',
                f'Processing bottleneck detected: {slow_items} items pending for 21+ days',
                level='warning'
            )
    
    @staticmethod
    def predictive_alerts():
        """Generate predictive alerts based on trends"""
        
        # Predict capacity issues
        last_3_days_avg = GoodsReceivedChina.objects.filter(
            date_received__gte=timezone.now() - timedelta(days=3)
        ).count() / 3
        
        if last_3_days_avg > 80:  # High intake rate
            NotificationService.send_notification(
                'CAPACITY_PREDICTION',
                f'High intake rate detected: {last_3_days_avg:.1f} items/day. Consider capacity planning.',
                level='info'
            )
        
        # Predict delivery delays
        pending_with_urgency = GoodsReceivedChina.objects.filter(
            status='PENDING',
            days_in_warehouse__gt=10
        ).count()
        
        if pending_with_urgency > 30:
            NotificationService.send_notification(
                'DELAY_PREDICTION',
                f'Potential delivery delays: {pending_with_urgency} items at risk',
                level='warning'
            )


# Celery task for periodic notifications (if Celery is configured)
try:
    from celery import shared_task
    
    @shared_task
    def send_daily_summary():
        """Send daily summary notifications"""
        NotificationService.check_overdue_items()
        NotificationService.check_capacity_alerts()
        SmartAlertEngine.analyze_patterns()
        SmartAlertEngine.predictive_alerts()
    
    @shared_task
    def send_weekly_analytics():
        """Send weekly analytics report"""
        # This would generate and send comprehensive weekly reports
        pass
        
except ImportError:
    # Celery not available, notifications will be synchronous
    logger.info("Celery not available. Notifications will be synchronous.")

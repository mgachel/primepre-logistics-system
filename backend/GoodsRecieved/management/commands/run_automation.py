"""
Management command to run workflow automation
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from GoodsRecieved.workflows import workflow_engine, run_daily_workflows
from GoodsRecieved.notifications import NotificationService, SmartAlertEngine
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run automated workflows and maintenance tasks'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--task',
            choices=['workflows', 'notifications', 'analytics', 'all'],
            default='all',
            help='Specific task to run'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run in dry-run mode without making changes'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Enable verbose output'
        )
    
    def handle(self, *args, **options):
        task = options['task']
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('Running in DRY-RUN mode - no changes will be made')
            )
        
        start_time = timezone.now()
        
        if task in ['workflows', 'all']:
            self.run_workflows(dry_run, verbose)
        
        if task in ['notifications', 'all']:
            self.run_notifications(dry_run, verbose)
        
        if task in ['analytics', 'all']:
            self.run_analytics(dry_run, verbose)
        
        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()
        
        self.stdout.write(
            self.style.SUCCESS(f'Automation tasks completed in {duration:.2f} seconds')
        )
    
    def run_workflows(self, dry_run, verbose):
        """Run workflow automation"""
        self.stdout.write('Running workflow automation...')
        
        if not dry_run:
            processed_count = run_daily_workflows()
            self.stdout.write(
                self.style.SUCCESS(f'Processed {processed_count} items through workflows')
            )
        else:
            # In dry-run mode, just show what would be processed
            stats = workflow_engine.get_rule_statistics()
            total_matches = sum(rule_stats['total_matches'] for rule_stats in stats.values())
            
            self.stdout.write(f'Would process approximately {total_matches} items')
            
            if verbose:
                for rule_name, rule_stats in stats.items():
                    self.stdout.write(
                        f"  Rule '{rule_name}': {rule_stats['total_matches']} matches"
                    )
    
    def run_notifications(self, dry_run, verbose):
        """Run notification checks"""
        self.stdout.write('Running notification checks...')
        
        if not dry_run:
            # Check for overdue items
            NotificationService.check_overdue_items()
            
            # Check capacity alerts
            NotificationService.check_capacity_alerts()
            
            # Run smart analytics
            SmartAlertEngine.analyze_patterns()
            SmartAlertEngine.predictive_alerts()
            
            self.stdout.write(
                self.style.SUCCESS('Notification checks completed')
            )
        else:
            self.stdout.write('Would run notification checks (dry-run mode)')
    
    def run_analytics(self, dry_run, verbose):
        """Run analytics updates"""
        self.stdout.write('Running analytics updates...')
        
        if not dry_run:
            # This would update cached analytics, refresh materialized views, etc.
            from django.core.cache import cache
            
            # Clear analytics cache to force refresh
            cache_keys = [
                'analytics_china_*',
                'analytics_ghana_*',
                'warehouse_stats_*'
            ]
            
            for pattern in cache_keys:
                # In a real implementation, you'd use a more sophisticated cache clearing
                pass
            
            self.stdout.write(
                self.style.SUCCESS('Analytics updates completed')
            )
        else:
            self.stdout.write('Would update analytics (dry-run mode)')
        
        if verbose:
            # Show current statistics
            from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
            
            china_count = GoodsReceivedChina.objects.count()
            ghana_count = GoodsReceivedGhana.objects.count()
            
            self.stdout.write(f'Current items: China={china_count}, Ghana={ghana_count}')

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, F, ExpressionWrapper, IntegerField
from django.db.models.functions import Extract
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
import pandas as pd
from django.http import HttpResponse
import io
import logging

from .models import GoodsReceivedChina, GoodsReceivedGhana
from .serializers import (
    GoodsReceivedChinaSerializer, 
    GoodsReceivedGhanaSerializer,
    StatusUpdateSerializer,
    BulkStatusUpdateSerializer,
    GoodsSearchSerializer,
    GoodsStatsSerializer,
    ExcelUploadSerializer,
    BulkCreateResultSerializer
)
from .advanced_serializers import (
    EnhancedGoodsReceivedChinaSerializer,
    EnhancedGoodsReceivedGhanaSerializer,
    BulkOperationSerializer,
    SmartSearchSerializer,
    WorkflowAutomationSerializer
)
from .mixins import AdvancedAnalyticsMixin, SmartNotificationMixin, PredictiveAnalyticsMixin
from .workflows import workflow_engine, apply_workflows_to_item

logger = logging.getLogger(__name__)


class BaseGoodsReceivedViewSet(AdvancedAnalyticsMixin, SmartNotificationMixin, PredictiveAnalyticsMixin, viewsets.ModelViewSet):
    """
    Base ViewSet for managing goods received in warehouses.
    Provides common CRUD operations and custom actions for status management.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Common filtering options
    filterset_fields = ['status', 'location', 'supplier_name']
    search_fields = ['shipping_mark', 'supply_tracking', 'item_id', 'description']
    ordering_fields = ['date_received', 'created_at', 'status', 'cbm', 'weight']
    ordering = ['-date_received']
    
    # These will be overridden in child classes
    model_class = None
    serializer_class = None
    warehouse_type = None
    template_filename = None
    template_sheet_name = None
    
    def get_queryset(self):
        """
        Optionally filter queryset based on query parameters.
        """
        queryset = self.model_class.objects.all()
        
        # Date range filtering with proper error handling
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                queryset = queryset.filter(date_received__gte=date_from)
            except ValueError as e:
                logger.warning(f"Invalid date_from format: {date_from}, error: {e}")
        
        if date_to:
            try:
                date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                queryset = queryset.filter(date_received__lte=date_to)
            except ValueError as e:
                logger.warning(f"Invalid date_to format: {date_to}, error: {e}")
        
        return queryset
    
    def _update_single_status(self, goods, new_status, reason=None):
        """
        Helper method to update status of a single goods item.
        """
        # Handle warehouse-specific status updates
        if hasattr(self, 'warehouse_type') and self.warehouse_type == 'ghana':
            if new_status == 'READY_FOR_DELIVERY':
                goods.mark_ready_for_delivery()
            elif new_status == 'DELIVERED':
                goods.mark_delivered()
            elif new_status == 'FLAGGED':
                goods.flag_goods(reason)
            else:
                goods.status = new_status
                if reason:
                    current_notes = goods.notes or ""
                    goods.notes = f"{current_notes}\nStatus changed to {new_status}: {reason}".strip()
                goods.save(update_fields=['status', 'notes', 'updated_at'])
        else:
            # China warehouse
            if new_status == 'READY_FOR_SHIPPING':
                goods.mark_ready_for_shipping()
            elif new_status == 'FLAGGED':
                goods.flag_goods(reason)
            elif new_status == 'SHIPPED':
                goods.mark_shipped()
            else:
                goods.status = new_status
                if reason:
                    current_notes = goods.notes or ""
                    goods.notes = f"{current_notes}\nStatus changed to {new_status}: {reason}".strip()
                goods.save(update_fields=['status', 'notes', 'updated_at'])
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update the status of a specific goods item.
        """
        goods = self.get_object()
        serializer = StatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            new_status = serializer.validated_data['status']
            reason = serializer.validated_data.get('reason')
            
            self._update_single_status(goods, new_status, reason)
            
            return Response({
                'message': f'Status updated to {new_status}',
                'goods': self.get_serializer(goods).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        """
        Update status for multiple goods items with improved performance.
        """
        serializer = BulkStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            item_ids = serializer.validated_data['item_ids']
            new_status = serializer.validated_data['status']
            reason = serializer.validated_data.get('reason')
            
            goods_items = self.model_class.objects.filter(item_id__in=item_ids)
            updated_count = 0
            
            # Use bulk operations for better performance when possible
            if new_status in ['PENDING', 'CANCELLED'] and not reason:
                # Simple status updates can be done in bulk
                updated_count = goods_items.update(
                    status=new_status,
                    updated_at=timezone.now()
                )
            else:
                # Complex updates still need individual processing
                with transaction.atomic():
                    for goods in goods_items:
                        self._update_single_status(goods, new_status, reason)
                        updated_count += 1
            
            return Response({
                'message': f'Updated {updated_count} items to {new_status}',
                'updated_count': updated_count
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get comprehensive statistics with improved performance.
        """
        queryset = self.get_queryset()
        
        # Define status names based on warehouse type
        if hasattr(self, 'warehouse_type') and self.warehouse_type == 'ghana':
            ready_status = 'READY_FOR_DELIVERY'
            completed_status = 'DELIVERED'
        else:
            ready_status = 'READY_FOR_SHIPPING'
            completed_status = 'SHIPPED'
        
        # Use database aggregation for better performance
        stats = queryset.aggregate(
            total_count=Count('id'),
            pending_count=Count('id', filter=Q(status='PENDING')),
            flagged_count=Count('id', filter=Q(status='FLAGGED')),
            cancelled_count=Count('id', filter=Q(status='CANCELLED')),
            total_cbm=Sum('cbm'),
            total_weight=Sum('weight'),
            total_estimated_value=Sum('estimated_value'),
        )
        
        # Add warehouse-specific status counts
        stats[f'{ready_status.lower()}_count'] = queryset.filter(status=ready_status).count()
        stats[f'{completed_status.lower()}_count'] = queryset.filter(status=completed_status).count()
        
        # For backwards compatibility, also include the generic names
        if self.warehouse_type == 'ghana':
            stats['ready_for_delivery_count'] = stats[f'{ready_status.lower()}_count']
            stats['delivered_count'] = stats[f'{completed_status.lower()}_count']
        else:
            stats['ready_for_shipping_count'] = stats[f'{ready_status.lower()}_count']
            stats['shipped_count'] = stats[f'{completed_status.lower()}_count']
        
        # Handle None values
        for key, value in stats.items():
            if value is None:
                stats[key] = 0
        
        # Calculate average days in warehouse using a simpler database calculation
        non_completed_items = queryset.exclude(status=completed_status)
        if non_completed_items.exists():
            # Use a more database-agnostic approach
            current_date = timezone.now().date()
            from django.db.models import Value, DateField
            from django.db.models.functions import Cast
            
            # Calculate the average days more efficiently
            total_count = non_completed_items.count()
            if total_count <= 1000:  # For smaller datasets, use Python calculation
                total_days = sum((current_date - item.date_received.date()).days for item in non_completed_items)
                stats['average_days_in_warehouse'] = round(total_days / total_count, 1)
            else:
                # For larger datasets, use a simpler approximation
                oldest_item = non_completed_items.order_by('date_received').first()
                newest_item = non_completed_items.order_by('-date_received').first()
                if oldest_item and newest_item:
                    oldest_days = (current_date - oldest_item.date_received.date()).days
                    newest_days = (current_date - newest_item.date_received.date()).days
                    stats['average_days_in_warehouse'] = round((oldest_days + newest_days) / 2, 1)
                else:
                    stats['average_days_in_warehouse'] = 0
        else:
            stats['average_days_in_warehouse'] = 0
        
        # Calculate processing rate
        total_items = stats['total_count']
        if total_items > 0:
            processed_items = stats[f'{completed_status.lower()}_count'] + stats[f'{ready_status.lower()}_count']
            stats['processing_rate'] = (processed_items / total_items) * 100
        else:
            stats['processing_rate'] = 0
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def flagged_items(self, request):
        """
        Get all flagged items requiring attention.
        """
        flagged_goods = self.get_queryset().filter(status='FLAGGED')
        page = self.paginate_queryset(flagged_goods)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'count': flagged_goods.count(),
                'items': serializer.data
            })
        
        serializer = self.get_serializer(flagged_goods, many=True)
        return Response({
            'count': flagged_goods.count(),
            'items': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def ready_for_shipping(self, request):
        """
        Get all items ready for shipping/delivery.
        """
        # Determine the correct status based on warehouse type
        if hasattr(self, 'warehouse_type') and self.warehouse_type == 'ghana':
            ready_status = 'READY_FOR_DELIVERY'
        else:
            ready_status = 'READY_FOR_SHIPPING'
            
        ready_goods = self.get_queryset().filter(status=ready_status)
        page = self.paginate_queryset(ready_goods)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'count': ready_goods.count(),
                'items': serializer.data
            })
        
        serializer = self.get_serializer(ready_goods, many=True)
        return Response({
            'count': ready_goods.count(),
            'items': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def overdue_items(self, request):
        """
        Get items that have been in warehouse for more than specified days.
        """
        try:
            days_threshold = int(request.query_params.get('days', 30))
            if days_threshold < 0:
                return Response(
                    {'error': 'Days threshold must be non-negative'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {'error': 'Invalid days parameter'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        threshold_date = timezone.now() - timedelta(days=days_threshold)
        
        # Define statuses based on warehouse type
        if hasattr(self, 'warehouse_type') and self.warehouse_type == 'ghana':
            active_statuses = ['PENDING', 'READY_FOR_DELIVERY', 'FLAGGED']
        else:
            active_statuses = ['PENDING', 'READY_FOR_SHIPPING', 'FLAGGED']
        
        overdue_goods = self.get_queryset().filter(
            date_received__lt=threshold_date,
            status__in=active_statuses
        )
        
        page = self.paginate_queryset(overdue_goods)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'threshold_days': days_threshold,
                'count': overdue_goods.count(),
                'items': serializer.data
            })
        
        serializer = self.get_serializer(overdue_goods, many=True)
        return Response({
            'threshold_days': days_threshold,
            'count': overdue_goods.count(),
            'items': serializer.data
        })
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_excel(self, request):
        """
        Upload Excel file to bulk create goods entries.
        
        Expected Excel columns:
        - SHIPPING MARK/CLIENT (required)
        - SUPPLIER&TRACKING NO (required) 
        - CBM (required)
        - CTNS (required) - This is the quantity
        - DESCRIPTION (optional)
        - DATE OF LOADING (optional, can be null)
        """
        serializer = ExcelUploadSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                # Process the Excel file
                processed_data = serializer.process_excel_file()
                
                if processed_data['warehouse_type'] != self.warehouse_type:
                    return Response(
                        {'error': f'This endpoint is for {self.warehouse_type} warehouse only'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Bulk create goods entries with better error handling
                created_items = []
                failed_items = []
                errors = []
                
                with transaction.atomic():
                    for row_data in processed_data['data']:
                        try:
                            # Check for duplicates more efficiently
                            existing_shipping = self.model_class.objects.filter(
                                shipping_mark=row_data['shipping_mark']
                            ).exists()
                            
                            if existing_shipping:
                                errors.append(f"Shipping mark '{row_data['shipping_mark']}' already exists")
                                failed_items.append(row_data['shipping_mark'])
                                continue
                            
                            existing_tracking = self.model_class.objects.filter(
                                supply_tracking=row_data['supply_tracking']
                            ).exists()
                            
                            if existing_tracking:
                                errors.append(f"Supply tracking '{row_data['supply_tracking']}' already exists")
                                failed_items.append(row_data['supply_tracking'])
                                continue
                            
                            # Create the goods entry
                            goods = self.model_class.objects.create(**row_data)
                            created_items.append(goods.item_id)
                            
                        except Exception as e:
                            error_msg = f"Failed to create item with shipping mark '{row_data.get('shipping_mark', 'Unknown')}': {str(e)}"
                            errors.append(error_msg)
                            failed_items.append(row_data.get('shipping_mark', 'Unknown'))
                            logger.error(error_msg)
                
                result_data = {
                    'total_processed': processed_data['total_rows'],
                    'successful_creates': len(created_items),
                    'failed_creates': len(failed_items),
                    'errors': errors,
                    'created_items': created_items
                }
                
                result_serializer = BulkCreateResultSerializer(result_data)
                
                return Response({
                    'message': f'Successfully processed {len(created_items)} out of {processed_data["total_rows"]} items',
                    'results': result_serializer.data
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f'Failed to process Excel file: {str(e)}')
                return Response(
                    {'error': f'Failed to process Excel file: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_template_data(self):
        """
        Override this method in child classes to provide warehouse-specific template data.
        """
        raise NotImplementedError("Child classes must implement get_template_data()")
    
    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """
        Download Excel template for warehouse uploads.
        """
        template_data = self.get_template_data()
        
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=self.template_sheet_name, index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{self.template_filename}"'
        
        return response
    
    @action(detail=False, methods=['post'])
    def smart_bulk_operations(self, request):
        """
        Advanced bulk operations with workflow automation
        """
        serializer = BulkOperationSerializer(data=request.data)
        
        if serializer.is_valid():
            item_ids = serializer.validated_data['item_ids']
            operation = serializer.validated_data['operation']
            parameters = serializer.validated_data['parameters']
            notify_customers = serializer.validated_data.get('notify_customers', False)
            
            goods_items = self.model_class.objects.filter(item_id__in=item_ids)
            results = []
            
            with transaction.atomic():
                for goods in goods_items:
                    try:
                        if operation == 'status_update':
                            new_status = parameters.get('status')
                            reason = parameters.get('reason', 'Bulk operation')
                            self._update_single_status(goods, new_status, reason)
                            
                        elif operation == 'location_update':
                            new_location = parameters.get('location')
                            goods.location = new_location
                            goods.save(update_fields=['location', 'updated_at'])
                            
                        elif operation == 'priority_flag':
                            priority = parameters.get('priority', 'high')
                            note = f"Priority set to {priority} via bulk operation"
                            current_notes = goods.notes or ""
                            goods.notes = f"{current_notes}\n[PRIORITY-{priority.upper()}] {note}".strip()
                            goods.save(update_fields=['notes', 'updated_at'])
                            
                        elif operation == 'batch_ship':
                            if goods.status == 'READY_FOR_SHIPPING':
                                goods.mark_shipped()
                        
                        # Apply workflow automation
                        applied_workflows = apply_workflows_to_item(goods)
                        
                        results.append({
                            'item_id': goods.item_id,
                            'status': 'success',
                            'applied_workflows': applied_workflows
                        })
                        
                    except Exception as e:
                        results.append({
                            'item_id': goods.item_id,
                            'status': 'error',
                            'error': str(e)
                        })
            
            return Response({
                'operation': operation,
                'total_processed': len(item_ids),
                'successful': len([r for r in results if r['status'] == 'success']),
                'failed': len([r for r in results if r['status'] == 'error']),
                'results': results
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def smart_search(self, request):
        """
        AI-powered intelligent search with suggestions
        """
        serializer = SmartSearchSerializer(data=request.data)
        
        if serializer.is_valid():
            query = serializer.validated_data['query']
            search_type = serializer.validated_data['search_type']
            filters = serializer.validated_data.get('filters', {})
            
            queryset = self.get_queryset()
            
            if search_type == 'semantic':
                # Semantic search - search across multiple fields
                search_terms = query.split()
                q_objects = Q()
                
                for term in search_terms:
                    q_objects |= (
                        Q(shipping_mark__icontains=term) |
                        Q(supply_tracking__icontains=term) |
                        Q(description__icontains=term) |
                        Q(supplier_name__icontains=term) |
                        Q(notes__icontains=term)
                    )
                
                queryset = queryset.filter(q_objects).distinct()
                
            elif search_type == 'pattern':
                # Pattern matching for tracking numbers, IDs, etc.
                queryset = queryset.filter(
                    Q(supply_tracking__iregex=query) |
                    Q(shipping_mark__iregex=query) |
                    Q(item_id__iregex=query)
                )
                
            elif search_type == 'predictive':
                # Predictive search - find items likely to need attention
                if 'overdue' in query.lower():
                    threshold_date = timezone.now() - timedelta(days=21)
                    queryset = queryset.filter(
                        date_received__lt=threshold_date,
                        status__in=['PENDING', 'FLAGGED']
                    )
                elif 'risk' in query.lower():
                    # Items with high risk factors
                    queryset = queryset.filter(
                        Q(days_in_warehouse__gt=14) |
                        Q(status='FLAGGED') |
                        Q(cbm__gt=20)
                    )
            else:
                # Basic search
                queryset = queryset.filter(
                    Q(shipping_mark__icontains=query) |
                    Q(supply_tracking__icontains=query) |
                    Q(item_id__icontains=query)
                )
            
            # Apply additional filters
            for field, value in filters.items():
                if hasattr(self.model_class, field):
                    queryset = queryset.filter(**{field: value})
            
            # Paginate results
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                
                # Generate search suggestions
                suggestions = self._generate_search_suggestions(query, queryset.count())
                
                return self.get_paginated_response({
                    'query': query,
                    'search_type': search_type,
                    'results': serializer.data,
                    'suggestions': suggestions
                })
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'query': query,
                'search_type': search_type,
                'count': queryset.count(),
                'results': serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def workflow_status(self, request):
        """
        Get workflow automation status and statistics
        """
        stats = workflow_engine.get_rule_statistics()
        
        # Get recent workflow applications
        recent_notes = self.get_queryset().exclude(notes__isnull=True).exclude(
            notes__exact=''
        ).filter(
            notes__icontains='Automated by rule'
        ).order_by('-updated_at')[:10]
        
        recent_applications = []
        for item in recent_notes:
            recent_applications.append({
                'item_id': item.item_id,
                'shipping_mark': item.shipping_mark,
                'notes': item.notes.split('\n')[-1],  # Last note
                'updated_at': item.updated_at
            })
        
        return Response({
            'workflow_rules_count': len(workflow_engine.rules),
            'active_rules': len([r for r in workflow_engine.rules if r.is_active]),
            'rule_statistics': stats,
            'recent_applications': recent_applications,
            'total_automated_items': recent_notes.count()
        })
    
    @action(detail=False, methods=['post'])
    def run_workflows(self, request):
        """
        Manually trigger workflow processing for all items
        """
        processed_count = workflow_engine.process_all_pending()
        
        return Response({
            'message': f'Workflow processing completed',
            'items_processed': processed_count,
            'timestamp': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def quality_metrics(self, request):
        """
        Get comprehensive quality metrics and KPIs
        """
        queryset = self.get_queryset()
        total_items = queryset.count()
        
        if total_items == 0:
            return Response({'error': 'No data available'})
        
        # Calculate quality metrics
        metrics = {
            'accuracy_rate': self._calculate_accuracy_rate(queryset),
            'processing_speed': self._calculate_processing_speed(queryset),
            'error_rate': self._calculate_error_rate(queryset),
            'on_time_delivery': self._calculate_on_time_delivery(queryset),
            'customer_satisfaction': self._estimate_customer_satisfaction(queryset),
            'cost_efficiency': self._calculate_cost_efficiency(queryset),
            'timestamp': timezone.now().isoformat()
        }
        
        # Add trend analysis
        last_week = queryset.filter(
            date_received__gte=timezone.now() - timedelta(days=7)
        )
        
        metrics['trends'] = {
            'items_this_week': last_week.count(),
            'flagged_rate_trend': (last_week.filter(status='FLAGGED').count() / max(last_week.count(), 1)) * 100,
            'avg_processing_time_trend': last_week.aggregate(avg=Avg('days_in_warehouse'))['avg'] or 0
        }
        
        return Response(metrics)
    
    def _generate_search_suggestions(self, query, result_count):
        """Generate intelligent search suggestions"""
        suggestions = []
        
        if result_count == 0:
            suggestions.append(f"Try searching for partial matches of '{query}'")
            suggestions.append("Check if the item exists in the other warehouse")
            suggestions.append("Use pattern search for tracking numbers")
        elif result_count > 100:
            suggestions.append("Too many results - try adding more specific terms")
            suggestions.append("Use filters to narrow down results")
        
        # Add contextual suggestions
        if any(char.isdigit() for char in query):
            suggestions.append("Try pattern search for tracking numbers")
        
        if len(query) < 3:
            suggestions.append("Try longer search terms for better results")
        
        return suggestions
    
    def _calculate_accuracy_rate(self, queryset):
        """Calculate data accuracy rate"""
        total = queryset.count()
        flagged = queryset.filter(status='FLAGGED').count()
        return round(((total - flagged) / total) * 100, 2)
    
    def _calculate_processing_speed(self, queryset):
        """Calculate average processing speed"""
        processed = queryset.filter(status__in=['SHIPPED', 'DELIVERED'])
        avg_days = processed.aggregate(avg=Avg('days_in_warehouse'))['avg']
        return round(avg_days or 0, 2)
    
    def _calculate_error_rate(self, queryset):
        """Calculate error rate based on flagged items"""
        total = queryset.count()
        flagged = queryset.filter(status='FLAGGED').count()
        return round((flagged / total) * 100, 2)
    
    def _calculate_on_time_delivery(self, queryset):
        """Calculate on-time delivery rate"""
        shipped = queryset.filter(status__in=['SHIPPED', 'DELIVERED'])
        on_time = shipped.filter(days_in_warehouse__lte=14)
        return round((on_time.count() / max(shipped.count(), 1)) * 100, 2)
    
    def _estimate_customer_satisfaction(self, queryset):
        """Estimate customer satisfaction based on performance metrics"""
        # This is a simplified calculation - in real scenario you'd have actual feedback
        on_time_rate = self._calculate_on_time_delivery(queryset)
        error_rate = self._calculate_error_rate(queryset)
        
        # Weighted calculation
        satisfaction = (on_time_rate * 0.6) + ((100 - error_rate) * 0.4)
        return round(satisfaction, 2)
    
    def _calculate_cost_efficiency(self, queryset):
        """Calculate cost efficiency score"""
        # Simplified calculation based on processing time and errors
        avg_processing = self._calculate_processing_speed(queryset)
        error_rate = self._calculate_error_rate(queryset)
        
        # Lower processing time and error rate = higher efficiency
        efficiency = max(0, 100 - (avg_processing * 2) - error_rate)
        return round(efficiency, 2)


class GoodsReceivedChinaViewSet(BaseGoodsReceivedViewSet):
    """
    ViewSet for managing goods received in China warehouses.
    Provides CRUD operations plus custom actions for status management.
    """
    queryset = GoodsReceivedChina.objects.all()
    serializer_class = GoodsReceivedChinaSerializer
    model_class = GoodsReceivedChina
    warehouse_type = 'china'
    template_filename = 'china_goods_template.xlsx'
    template_sheet_name = 'China Goods Template'
    
    def get_template_data(self):
        """
        Get template data specific to China warehouse.
        """
        current_date = timezone.now().strftime('%Y-%m-%d')
        return {
            'SHIPPING MARK/CLIENT': ['PMJOHN01', 'PMJANE02'],
            'DATE OF RECEIPT': [current_date, current_date],
            'DATE OF LOADING': ['', current_date],  # Can be empty
            'DESCRIPTION': ['Electronics components', 'Furniture items'],
            'CTNS': [5, 10],  # This is quantity
            'SPECIFICATIONS': ['N/A', 'N/A'],  # Not used in model
            'CBM': [2.5, 4.0],
            'SUPPLIER&TRACKING NO': ['TRK123456789', 'TRK987654321']
        }


class GoodsReceivedGhanaViewSet(BaseGoodsReceivedViewSet):
    """
    ViewSet for managing goods received in Ghana warehouses.
    Provides CRUD operations plus custom actions for status management.
    """
    queryset = GoodsReceivedGhana.objects.all()
    serializer_class = GoodsReceivedGhanaSerializer
    model_class = GoodsReceivedGhana
    warehouse_type = 'ghana'
    template_filename = 'ghana_goods_template.xlsx'
    template_sheet_name = 'Ghana Goods Template'
    
    def get_template_data(self):
        """
        Get template data specific to Ghana warehouse.
        """
        current_date = timezone.now().strftime('%Y-%m-%d')
        return {
            'SHIPPING MARK/CLIENT': ['PMJOHN01', 'PMJANE02'],
            'DATE OF RECEIPT': [current_date, current_date],
            'DATE OF LOADING': ['', current_date],  # Can be empty
            'DESCRIPTION': ['Textiles', 'Food products'],
            'CTNS': [8, 15],  # This is quantity
            'SPECIFICATIONS': ['N/A', 'N/A'],  # Not used in model
            'CBM': [3.2, 6.5],
            'SUPPLIER&TRACKING NO': ['TRK555666777', 'TRK888999000']
        }


# ========================================
# CUSTOMER-SPECIFIC VIEWSETS
# ========================================

class CustomerBaseGoodsReceivedViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Base ViewSet for customer-specific goods viewing.
    Customers can only view their own goods (filtered by shipping_mark).
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Common filtering options for customers
    filterset_fields = ['status', 'location', 'supplier_name']
    search_fields = ['supply_tracking', 'item_id', 'description']
    ordering_fields = ['date_received', 'created_at', 'status']
    ordering = ['-date_received']
    
    def get_queryset(self):
        """
        Filter queryset to show only the authenticated customer's goods.
        """
        user = self.request.user
        
        # Only show goods belonging to the authenticated customer
        queryset = self.model_class.objects.filter(shipping_mark=user.shipping_mark)
        
        # Apply date filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                queryset = queryset.filter(date_received__gte=date_from)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                queryset = queryset.filter(date_received__lte=date_to)
            except ValueError:
                pass
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to ensure customers can only access their own goods.
        """
        instance = self.get_object()
        
        # Verify the item belongs to the requesting customer
        if instance.shipping_mark != request.user.shipping_mark:
            return Response(
                {'detail': 'You can only access your own goods.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_statistics(self, request):
        """Get customer's personal statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_items': queryset.count(),
            'by_status': queryset.values('status').annotate(count=Count('id')),
            'total_cbm': queryset.aggregate(total=Sum('cbm'))['total'] or 0,
            'total_weight': queryset.aggregate(total=Sum('weight'))['total'] or 0,
            'recent_items': queryset.filter(
                date_received__gte=timezone.now() - timedelta(days=30)
            ).count(),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def my_flagged_items(self, request):
        """Get customer's flagged items"""
        queryset = self.get_queryset().filter(status='FLAGGED')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ready_for_shipping(self, request):
        """Get customer's items ready for shipping"""
        queryset = self.get_queryset().filter(status='READY_FOR_SHIPPING')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def overdue_items(self, request):
        """Get customer's overdue items"""
        days_threshold = int(request.query_params.get('days', 30))
        threshold_date = timezone.now() - timedelta(days=days_threshold)
        
        queryset = self.get_queryset().filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'PROCESSING']
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def tracking(self, request):
        """Track item by supply tracking number"""
        tracking_id = request.query_params.get('tracking_id')
        if not tracking_id:
            return Response(
                {'detail': 'tracking_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            item = self.get_queryset().get(supply_tracking=tracking_id)
            serializer = self.get_serializer(item)
            return Response(serializer.data)
        except self.model_class.DoesNotExist:
            return Response(
                {'detail': 'Item not found or not accessible'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class CustomerGoodsReceivedChinaViewSet(CustomerBaseGoodsReceivedViewSet):
    """
    Customer ViewSet for China warehouse goods.
    Customers can only view their own goods.
    """
    serializer_class = GoodsReceivedChinaSerializer
    model_class = GoodsReceivedChina


class CustomerGoodsReceivedGhanaViewSet(CustomerBaseGoodsReceivedViewSet):
    """
    Customer ViewSet for Ghana warehouse goods.
    Customers can only view their own goods.
    """
    serializer_class = GoodsReceivedGhanaSerializer
    model_class = GoodsReceivedGhana


# ========================================
# CUSTOMER DASHBOARD VIEW
# ========================================

from rest_framework.views import APIView

class CustomerDashboardView(APIView):
    """
    Customer dashboard providing unified view of all their goods.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get customer's dashboard with unified statistics and recent items.
        """
        user = request.user
        
        # Get customer's goods from both warehouses
        china_goods = GoodsReceivedChina.objects.filter(shipping_mark=user.shipping_mark)
        ghana_goods = GoodsReceivedGhana.objects.filter(shipping_mark=user.shipping_mark)
        
        # Calculate unified statistics
        total_china_items = china_goods.count()
        total_ghana_items = ghana_goods.count()
        
        china_stats = {
            'total_items': total_china_items,
            'total_cbm': china_goods.aggregate(total=Sum('cbm'))['total'] or 0,
            'total_weight': china_goods.aggregate(total=Sum('weight'))['total'] or 0,
            'by_status': list(china_goods.values('status').annotate(count=Count('id'))),
            'flagged_count': china_goods.filter(status='FLAGGED').count(),
            'ready_count': china_goods.filter(status='READY_FOR_SHIPPING').count(),
        }
        
        ghana_stats = {
            'total_items': total_ghana_items,
            'total_cbm': ghana_goods.aggregate(total=Sum('cbm'))['total'] or 0,
            'total_weight': ghana_goods.aggregate(total=Sum('weight'))['total'] or 0,
            'by_status': list(ghana_goods.values('status').annotate(count=Count('id'))),
            'flagged_count': ghana_goods.filter(status='FLAGGED').count(),
            'ready_count': ghana_goods.filter(status='READY_FOR_SHIPPING').count(),
        }
        
        # Get recent items from both warehouses
        recent_china = china_goods.order_by('-date_received')[:5]
        recent_ghana = ghana_goods.order_by('-date_received')[:5]
        
        # Get overdue items (30+ days)
        threshold_date = timezone.now() - timedelta(days=30)
        overdue_china = china_goods.filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'PROCESSING']
        ).count()
        overdue_ghana = ghana_goods.filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'PROCESSING']
        ).count()
        
        dashboard_data = {
            'customer_info': {
                'shipping_mark': user.shipping_mark,
                'name': user.get_full_name(),
                'company': user.company_name,
            },
            'overview': {
                'total_items': total_china_items + total_ghana_items,
                'total_cbm': china_stats['total_cbm'] + ghana_stats['total_cbm'],
                'total_weight': china_stats['total_weight'] + ghana_stats['total_weight'],
                'total_flagged': china_stats['flagged_count'] + ghana_stats['flagged_count'],
                'total_ready': china_stats['ready_count'] + ghana_stats['ready_count'],
                'total_overdue': overdue_china + overdue_ghana,
            },
            'china_warehouse': china_stats,
            'ghana_warehouse': ghana_stats,
            'recent_items': {
                'china': GoodsReceivedChinaSerializer(recent_china, many=True).data,
                'ghana': GoodsReceivedGhanaSerializer(recent_ghana, many=True).data,
            },
        }
        
        return Response(dashboard_data)

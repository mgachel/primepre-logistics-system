from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
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

logger = logging.getLogger(__name__)


class BaseGoodsReceivedViewSet(viewsets.ModelViewSet):
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
        
        # Use database aggregation for better performance
        stats = queryset.aggregate(
            total_items=Count('id'),
            pending_count=Count('id', filter=Q(status='PENDING')),
            ready_for_shipping_count=Count('id', filter=Q(status='READY_FOR_SHIPPING')),
            flagged_count=Count('id', filter=Q(status='FLAGGED')),
            shipped_count=Count('id', filter=Q(status='SHIPPED')),
            cancelled_count=Count('id', filter=Q(status='CANCELLED')),
            total_cbm=Sum('cbm'),
            total_weight=Sum('weight'),
            total_estimated_value=Sum('estimated_value'),
            # Calculate average days in warehouse using database aggregation
            average_days_in_warehouse=Avg('days_in_warehouse', filter=~Q(status='SHIPPED'))
        )
        
        # Handle None values
        for key, value in stats.items():
            if value is None:
                stats[key] = 0
        
        serializer = GoodsStatsSerializer(stats)
        return Response(serializer.data)
    
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
        Get all items ready for shipping.
        """
        ready_goods = self.get_queryset().filter(status='READY_FOR_SHIPPING')
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
        
        overdue_goods = self.get_queryset().filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'READY_FOR_SHIPPING', 'FLAGGED']
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
    
    @action(detail=False, methods=['post'], parser_classes=['rest_framework.parsers.MultiPartParser'])
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

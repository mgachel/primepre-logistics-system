from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
import pandas as pd
from django.http import HttpResponse
import io

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


class GoodsReceivedChinaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing goods received in China warehouses.
    Provides CRUD operations plus custom actions for status management.
    """
    queryset = GoodsReceivedChina.objects.all()
    serializer_class = GoodsReceivedChinaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtering options
    filterset_fields = ['status', 'location', 'supplier_name']
    search_fields = ['shipping_mark', 'supply_tracking', 'item_id', 'description']
    ordering_fields = ['date_received', 'created_at', 'status', 'cbm', 'weight']
    ordering = ['-date_received']
    
    def get_queryset(self):
        """
        Optionally filter queryset based on query parameters.
        """
        queryset = GoodsReceivedChina.objects.all()
        
        # Date range filtering
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
            
            return Response({
                'message': f'Status updated to {new_status}',
                'goods': GoodsReceivedChinaSerializer(goods).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        """
        Update status for multiple goods items.
        """
        serializer = BulkStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            item_ids = serializer.validated_data['item_ids']
            new_status = serializer.validated_data['status']
            reason = serializer.validated_data.get('reason')
            
            goods_items = GoodsReceivedChina.objects.filter(item_id__in=item_ids)
            updated_count = 0
            
            for goods in goods_items:
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
                        goods.notes = f"{current_notes}\nBulk status change to {new_status}: {reason}".strip()
                    goods.save(update_fields=['status', 'notes', 'updated_at'])
                
                updated_count += 1
            
            return Response({
                'message': f'Updated {updated_count} items to {new_status}',
                'updated_count': updated_count
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get comprehensive statistics for China warehouse.
        """
        queryset = self.get_queryset()
        
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
        )
        
        # Calculate average days in warehouse for non-shipped items
        non_shipped = queryset.exclude(status='SHIPPED')
        if non_shipped.exists():
            total_days = sum(item.days_in_warehouse for item in non_shipped)
            stats['average_days_in_warehouse'] = total_days / non_shipped.count()
        else:
            stats['average_days_in_warehouse'] = 0
        
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
        days_threshold = int(request.query_params.get('days', 30))
        threshold_date = timezone.now() - timedelta(days=days_threshold)
        
        overdue_goods = self.get_queryset().filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'READY_FOR_SHIPPING', 'FLAGGED']
        )
        
        serializer = self.get_serializer(overdue_goods, many=True)
        return Response({
            'threshold_days': days_threshold,
            'count': overdue_goods.count(),
            'items': serializer.data
        })
    
    @action(detail=False, methods=['post'], parser_classes=['rest_framework.parsers.MultiPartParser'])
    def upload_excel(self, request):
        """
        Upload Excel file to bulk create goods entries for China warehouse.
        
        Expected Excel columns:
        - SHIPPIN MARK/CLIENT (required)
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
                
                if processed_data['warehouse_type'] != 'china':
                    return Response(
                        {'error': 'This endpoint is for China warehouse only'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Bulk create goods entries
                created_items = []
                failed_items = []
                errors = []
                
                with transaction.atomic():
                    for row_data in processed_data['data']:
                        try:
                            # Check for duplicate shipping_mark and supply_tracking
                            if GoodsReceivedChina.objects.filter(shipping_mark=row_data['shipping_mark']).exists():
                                errors.append(f"Shipping mark '{row_data['shipping_mark']}' already exists")
                                failed_items.append(row_data['shipping_mark'])
                                continue
                            
                            if GoodsReceivedChina.objects.filter(supply_tracking=row_data['supply_tracking']).exists():
                                errors.append(f"Supply tracking '{row_data['supply_tracking']}' already exists")
                                failed_items.append(row_data['supply_tracking'])
                                continue
                            
                            # Create the goods entry
                            goods = GoodsReceivedChina.objects.create(**row_data)
                            created_items.append(goods.item_id)
                            
                        except Exception as e:
                            error_msg = f"Failed to create item with shipping mark '{row_data.get('shipping_mark', 'Unknown')}': {str(e)}"
                            errors.append(error_msg)
                            failed_items.append(row_data.get('shipping_mark', 'Unknown'))
                
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
                return Response(
                    {'error': f'Failed to process Excel file: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """
        Download Excel template for China warehouse uploads.
        """
        # Create sample data with correct column names
        template_data = {
            'SHIPPIN MARK/CLIENT': ['PMJOHN01', 'PMJANE02'],
            'DATE OF RECEIPT': ['2024-12-26', '2024-12-27'],
            'DATE OF LOADING': ['', '2024-12-28'],  # Can be empty
            'DESCRIPTION': ['Electronics components', 'Furniture items'],
            'CTNS': [5, 10],  # This is quantity
            'SPECIFICATIONS': ['N/A', 'N/A'],  # Not used in model
            'CBM': [2.5, 4.0],
            'SUPPLIER&TRACKING NO': ['TRK123456789', 'TRK987654321']
        }
        
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='China Goods Template', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="china_goods_template.xlsx"'
        
        return response

class GoodsReceivedGhanaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing goods received in Ghana warehouses.
    Provides CRUD operations plus custom actions for status management.
    """
    queryset = GoodsReceivedGhana.objects.all()
    serializer_class = GoodsReceivedGhanaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtering options
    filterset_fields = ['status', 'location', 'supplier_name']
    search_fields = ['shipping_mark', 'supply_tracking', 'item_id', 'description']
    ordering_fields = ['date_received', 'created_at', 'status', 'cbm', 'weight']
    ordering = ['-date_received']
    
    def get_queryset(self):
        """
        Optionally filter queryset based on query parameters.
        """
        queryset = GoodsReceivedGhana.objects.all()
        
        # Date range filtering
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
            
            return Response({
                'message': f'Status updated to {new_status}',
                'goods': GoodsReceivedGhanaSerializer(goods).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        """
        Update status for multiple goods items.
        """
        serializer = BulkStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            item_ids = serializer.validated_data['item_ids']
            new_status = serializer.validated_data['status']
            reason = serializer.validated_data.get('reason')
            
            goods_items = GoodsReceivedGhana.objects.filter(item_id__in=item_ids)
            updated_count = 0
            
            for goods in goods_items:
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
                        goods.notes = f"{current_notes}\nBulk status change to {new_status}: {reason}".strip()
                    goods.save(update_fields=['status', 'notes', 'updated_at'])
                
                updated_count += 1
            
            return Response({
                'message': f'Updated {updated_count} items to {new_status}',
                'updated_count': updated_count
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get comprehensive statistics for Ghana warehouse.
        """
        queryset = self.get_queryset()
        
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
        )
        
        # Calculate average days in warehouse for non-shipped items
        non_shipped = queryset.exclude(status='SHIPPED')
        if non_shipped.exists():
            total_days = sum(item.days_in_warehouse for item in non_shipped)
            stats['average_days_in_warehouse'] = total_days / non_shipped.count()
        else:
            stats['average_days_in_warehouse'] = 0
        
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
        days_threshold = int(request.query_params.get('days', 30))
        threshold_date = timezone.now() - timedelta(days=days_threshold)
        
        overdue_goods = self.get_queryset().filter(
            date_received__lt=threshold_date,
            status__in=['PENDING', 'READY_FOR_SHIPPING', 'FLAGGED']
        )
        
        serializer = self.get_serializer(overdue_goods, many=True)
        return Response({
            'threshold_days': days_threshold,
            'count': overdue_goods.count(),
            'items': serializer.data
        })
    
    @action(detail=False, methods=['post'], parser_classes=['rest_framework.parsers.MultiPartParser'])
    def upload_excel(self, request):
        """
        Upload Excel file to bulk create goods entries for Ghana warehouse.
        
        Expected Excel columns:
        - SHIPPIN MARK/CLIENT (required)
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
                
                if processed_data['warehouse_type'] != 'ghana':
                    return Response(
                        {'error': 'This endpoint is for Ghana warehouse only'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Bulk create goods entries
                created_items = []
                failed_items = []
                errors = []
                
                with transaction.atomic():
                    for row_data in processed_data['data']:
                        try:
                            # Check for duplicate shipping_mark and supply_tracking
                            if GoodsReceivedGhana.objects.filter(shipping_mark=row_data['shipping_mark']).exists():
                                errors.append(f"Shipping mark '{row_data['shipping_mark']}' already exists")
                                failed_items.append(row_data['shipping_mark'])
                                continue
                            
                            if GoodsReceivedGhana.objects.filter(supply_tracking=row_data['supply_tracking']).exists():
                                errors.append(f"Supply tracking '{row_data['supply_tracking']}' already exists")
                                failed_items.append(row_data['supply_tracking'])
                                continue
                            
                            # Create the goods entry
                            goods = GoodsReceivedGhana.objects.create(**row_data)
                            created_items.append(goods.item_id)
                            
                        except Exception as e:
                            error_msg = f"Failed to create item with shipping mark '{row_data.get('shipping_mark', 'Unknown')}': {str(e)}"
                            errors.append(error_msg)
                            failed_items.append(row_data.get('shipping_mark', 'Unknown'))
                
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
                return Response(
                    {'error': f'Failed to process Excel file: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """
        Download Excel template for Ghana warehouse uploads.
        """
        # Create sample data with correct column names
        template_data = {
            'SHIPPIN MARK/CLIENT': ['PMJOHN01', 'PMJANE02'],
            'DATE OF RECEIPT': ['2024-12-26', '2024-12-27'],
            'DATE OF LOADING': ['', '2024-12-28'],  # Can be empty
            'DESCRIPTION': ['Textiles', 'Food products'],
            'CTNS': [8, 15],  # This is quantity
            'SPECIFICATIONS': ['N/A', 'N/A'],  # Not used in model
            'CBM': [3.2, 6.5],
            'SUPPLIER&TRACKING NO': ['TRK555666777', 'TRK888999000']
        }
        
        df = pd.DataFrame(template_data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Ghana Goods Template', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="ghana_goods_template.xlsx"'
        
        return response

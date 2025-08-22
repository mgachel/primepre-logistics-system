from django.shortcuts import render, get_object_or_404
from django.db.models import Q, Count, Sum
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
import pandas as pd
import uuid
from datetime import datetime, timedelta

from .models import CargoContainer, CargoItem, ClientShipmentSummary
from users.models import CustomerUser
from .serializers import (
    CargoContainerSerializer, CargoContainerDetailSerializer, CargoContainerCreateSerializer,
    CargoItemSerializer, CargoItemCreateSerializer, CustomerUserSerializer,
    ClientShipmentSummarySerializer, CargoDashboardSerializer, BulkCargoItemSerializer
)


class CargoDashboardView(APIView):
    """Dashboard view for both sea and air cargo statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        cargo_type = request.query_params.get('cargo_type', 'sea')  # Default to sea
        
        # Filter containers by cargo type
        containers = CargoContainer.objects.filter(cargo_type=cargo_type)
        
        # Calculate statistics
        total_containers = containers.count()
        containers_in_transit = containers.filter(status='in_transit').count()
        demurrage_containers = containers.filter(status='demurrage').count()
        delivered_containers = containers.filter(status='delivered').count()
        pending_containers = containers.filter(status='pending').count()
        
        # Total cargo items for this cargo type
        total_cargo_items = CargoItem.objects.filter(container__cargo_type=cargo_type).count()
        
        # Recent containers (last 10)
        recent_containers = containers.order_by('-created_at')[:10]
        
        data = {
            'total_containers': total_containers,
            'containers_in_transit': containers_in_transit,
            'demurrage_containers': demurrage_containers,
            'delivered_containers': delivered_containers,
            'pending_containers': pending_containers,
            'total_cargo_items': total_cargo_items,
            'recent_containers': CargoContainerSerializer(recent_containers, many=True).data
        }
        
        serializer = CargoDashboardSerializer(data)
        return Response(serializer.data)


class CargoContainerViewSet(viewsets.ModelViewSet):
    """ViewSet for managing cargo containers"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = CargoContainer.objects.all().order_by('-created_at')
        cargo_type = self.request.query_params.get('cargo_type')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        
        if cargo_type:
            queryset = queryset.filter(cargo_type=cargo_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(container_id__icontains=search) |
                Q(route__icontains=search)
            )
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CargoContainerDetailSerializer
        elif self.action == 'create':
            return CargoContainerCreateSerializer
        return CargoContainerSerializer
    
    @action(detail=True, methods=['get'])
    def client_summaries(self, request, pk=None):
        """Get client summaries for a specific container"""
        container = self.get_object()
        summaries = ClientShipmentSummary.objects.filter(container=container)
        serializer = ClientShipmentSummarySerializer(summaries, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def cargo_items(self, request, pk=None):
        """Get all cargo items for a specific container"""
        container = self.get_object()
        shipping_mark = request.query_params.get('shipping_mark')
        
        items = CargoItem.objects.filter(container=container)
        if shipping_mark:
            items = items.filter(client__shipping_mark=shipping_mark)
        
        serializer = CargoItemSerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_cargo_item(self, request, pk=None):
        """Add a cargo item to this container using shipping mark"""
        container = self.get_object()
        
        # Create a copy of the data and add the container
        data = request.data.copy()
        data['container'] = container.container_id
        
        serializer = CargoItemCreateSerializer(data=data)
        if serializer.is_valid():
            cargo_item = serializer.save()
            
            # Update or create client shipment summary
            summary, created = ClientShipmentSummary.objects.get_or_create(
                container=container,
                client=cargo_item.client
            )
            summary.update_totals()
            
            return Response(CargoItemSerializer(cargo_item).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CargoItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing cargo items"""
    queryset = CargoItem.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CargoItemCreateSerializer
        return CargoItemSerializer
    
    def get_queryset(self):
        queryset = CargoItem.objects.all()
        container_id = self.request.query_params.get('container_id')
        shipping_mark = self.request.query_params.get('shipping_mark')
        status_filter = self.request.query_params.get('status')
        client_id = self.request.query_params.get('client')
        
        if container_id:
            queryset = queryset.filter(container__container_id=container_id)
        if shipping_mark:
            queryset = queryset.filter(client__shipping_mark=shipping_mark)
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create cargo item and update client summary"""
        cargo_item = serializer.save()
        
        # Get or create client shipment summary
        summary, created = ClientShipmentSummary.objects.get_or_create(
            container=cargo_item.container,
            client=cargo_item.client
        )
        
        # Update totals
        summary.update_totals()


class CustomerUserViewSet(viewsets.ModelViewSet):
    """ViewSet for accessing customer/client information"""
    queryset = CustomerUser.objects.filter(user_role='CUSTOMER')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['list', 'retrieve']:
            # For cargo item selection, use simplified serializer showing only shipping mark
            from .serializers import CustomerShippingMarkSerializer
            return CustomerShippingMarkSerializer
        return CustomerUserSerializer
    
    def get_queryset(self):
        queryset = CustomerUser.objects.filter(user_role='CUSTOMER')
        search = self.request.query_params.get('search')
        
        if search:
            queryset = queryset.filter(
                Q(shipping_mark__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_name__icontains=search)
            )
        
        return queryset


class ClientShipmentSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for client shipment summaries"""
    queryset = ClientShipmentSummary.objects.all()
    serializer_class = ClientShipmentSummarySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ClientShipmentSummary.objects.all()
        container_id = self.request.query_params.get('container_id')
        cargo_type = self.request.query_params.get('cargo_type')
        
        if container_id:
            queryset = queryset.filter(container__container_id=container_id)
        if cargo_type:
            queryset = queryset.filter(container__cargo_type=cargo_type)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def cargo_items(self, request, pk=None):
        """Get cargo items for this client shipment summary"""
        summary = self.get_object()
        items = CargoItem.objects.filter(
            container=summary.container,
            shipping_mark=summary.shipping_mark
        )
        serializer = CargoItemSerializer(items, many=True)
        return Response(serializer.data)


class BulkCargoItemUploadView(APIView):
    """Bulk upload cargo items via Excel - Enhanced version"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle bulk upload via Excel file - Routes to enhanced Excel processor"""
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Check if this is a legacy format upload (with container_id) or new format
        container_id = request.data.get('container_id')
        upload_type = request.data.get('upload_type', 'sea_cargo')
        warehouse_location = request.data.get('warehouse_location')
        
        # Validate file type
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({'error': 'Only Excel files are allowed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # If container_id is provided, this is legacy sea cargo upload
        if container_id:
            upload_type = 'sea_cargo'
        
        # Import and use the ExcelUploadProcessor
        from .excel_upload_views import ExcelUploadProcessor
        
        try:
            processor = ExcelUploadProcessor(
                file=file,
                upload_type=upload_type,
                warehouse_location=warehouse_location,
                uploader_user_id=request.user.id
            )
            
            result = processor.process()
            
            if result['success']:
                return Response({
                    'message': 'File processed successfully',
                    'summary': result['summary'],
                    'results': result['results']
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['error'],
                    'summary': result['summary'],
                    'results': result['results']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            # Fallback to legacy processing if new processor fails
            return self._legacy_bulk_upload(request, file, container_id)
    
    def _legacy_bulk_upload(self, request, file, container_id):
        """Legacy bulk upload method for backward compatibility"""
        serializer = BulkCargoItemSerializer(data={'excel_file': file, 'container_id': container_id})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        excel_file = file
        
        try:
            # Get container
            container = get_object_or_404(CargoContainer, container_id=container_id)
            
            # Read Excel file with enhanced error handling
            try:
                if excel_file.name.endswith('.csv'):
                    df = pd.read_csv(excel_file, encoding='utf-8')
                else:
                    df = pd.read_excel(excel_file, engine='openpyxl')
                    
            except Exception as e:
                return Response({
                    'error': f'Failed to read file: {str(e)}',
                    'suggestion': 'Please ensure your file is a valid Excel format and try again'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # If file doesn't have expected columns, try position-based mapping
            required_columns = ['shipping_mark', 'item_description', 'quantity', 'cbm']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                # Try position-based mapping as fallback
                return self._position_based_processing(df, container, request.user)
            
            # Process with column names (legacy method)
            return self._column_based_processing(df, container, request.user)
            
        except Exception as e:
            return Response({
                'error': f'Failed to process Excel file: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _position_based_processing(self, df, container, user):
        """Process Excel using position-based mapping"""
        created_items = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Position-based mapping
                shipping_mark = str(row.iloc[0]).strip() if len(row) > 0 and pd.notna(row.iloc[0]) else None
                description = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else 'Imported item'
                quantity = int(float(row.iloc[2])) if len(row) > 2 and pd.notna(row.iloc[2]) else 1
                cbm = float(row.iloc[3]) if len(row) > 3 and pd.notna(row.iloc[3]) else 0.0
                
                if not shipping_mark:
                    errors.append(f"Row {index + 2}: Shipping mark is required")
                    continue
                
                # Get or create customer
                customer, created = CustomerUser.objects.get_or_create(
                    shipping_mark=shipping_mark,
                    defaults={
                        'phone': f'+000{shipping_mark}',
                        'first_name': shipping_mark.replace('PM', ''),
                        'last_name': 'Imported',
                        'user_role': 'CUSTOMER'
                    }
                )
                
                # Create cargo item
                cargo_item = CargoItem.objects.create(
                    container=container,
                    client=customer,
                    item_description=description,
                    quantity=quantity,
                    cbm=cbm,
                    status='pending'
                )
                
                created_items.append(cargo_item)
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return Response({
            'message': f'Position-based processing: Successfully created {len(created_items)} cargo items',
            'created_items': len(created_items),
            'errors': errors,
            'items': CargoItemSerializer(created_items, many=True).data
        }, status=status.HTTP_201_CREATED)
    
    def _column_based_processing(self, df, container, user):
        """Process Excel using column names (legacy method)"""
        created_items = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Get customer by shipping mark
                try:
                    client = CustomerUser.objects.get(shipping_mark=row['shipping_mark'])
                except CustomerUser.DoesNotExist:
                    errors.append({
                        'row': index + 1,
                        'error': f"Customer with shipping mark '{row['shipping_mark']}' not found. Please create the customer first."
                    })
                    continue
                
                # Create cargo item
                cargo_item = CargoItem.objects.create(
                    container=container,
                    client=client,
                    item_description=row['item_description'],
                    quantity=int(row['quantity']),
                    cbm=float(row['cbm']),
                    weight=float(row.get('weight', 0)) if pd.notna(row.get('weight')) else None,
                    unit_value=float(row.get('unit_value', 0)) if pd.notna(row.get('unit_value')) else None,
                    total_value=float(row.get('total_value', 0)) if pd.notna(row.get('total_value')) else None,
                    status=row.get('status', 'pending')
                )
                
                created_items.append(cargo_item)
                
                # Update client shipment summary
                summary, created = ClientShipmentSummary.objects.get_or_create(
                    container=container,
                    client=client
                )
                summary.update_totals()
                
            except Exception as e:
                errors.append(f"Row {index + 2}: {str(e)}")
        
        return Response({
            'message': f'Successfully created {len(created_items)} cargo items',
            'created_items': len(created_items),
            'errors': errors,
            'items': CargoItemSerializer(created_items, many=True).data
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def cargo_statistics(request):
    """Get overall cargo statistics"""
    sea_containers = CargoContainer.objects.filter(cargo_type='sea').count()
    air_containers = CargoContainer.objects.filter(cargo_type='air').count()
    total_demurrage = CargoContainer.objects.filter(status='demurrage').count()
    total_in_transit = CargoContainer.objects.filter(status='in_transit').count()
    
    return Response({
        'sea_containers': sea_containers,
        'air_containers': air_containers,
        'total_demurrage': total_demurrage,
        'total_in_transit': total_in_transit,
        'total_containers': sea_containers + air_containers
    })


class EnhancedExcelUploadView(APIView):
    """Enhanced Excel upload that supports both Goods Received and Sea Cargo"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle Excel file upload with enhanced processing"""
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        upload_type = request.data.get('upload_type', 'sea_cargo')
        warehouse_location = request.data.get('warehouse_location')
        
        # Validate file type
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({
                'error': 'Only Excel files (.xlsx, .xls) are allowed',
                'file_received': file.name
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Import and use the ExcelUploadProcessor
        from .excel_upload_views import ExcelUploadProcessor
        
        try:
            processor = ExcelUploadProcessor(
                file=file,
                upload_type=upload_type,
                warehouse_location=warehouse_location,
                uploader_user_id=request.user.id
            )
            
            result = processor.process()
            
            if result['success']:
                return Response({
                    'message': 'File processed successfully',
                    'summary': result['summary'],
                    'results': result['results'],
                    'upload_info': {
                        'file_name': file.name,
                        'upload_type': upload_type,
                        'warehouse_location': warehouse_location,
                        'processed_by': getattr(request.user, 'phone', str(request.user)),
                        'processed_at': datetime.now().isoformat()
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['error'],
                    'summary': result['summary'],
                    'results': result['results'],
                    'upload_info': {
                        'file_name': file.name,
                        'upload_type': upload_type,
                        'warehouse_location': warehouse_location
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': f'Failed to process file: {str(e)}',
                'file_name': file.name,
                'suggestions': [
                    'Check if the file is corrupted',
                    'Ensure the file follows the template format',
                    'Try downloading a fresh template',
                    'Verify all required columns are present'
                ]
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExcelTemplateDownloadView(APIView):
    """Download Excel templates for uploads"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Generate and download Excel template"""
        upload_type = request.query_params.get('type', 'goods_received')
        warehouse_location = request.query_params.get('warehouse', 'China')
        
        # Import and use the ExcelTemplateView
        from .excel_upload_views import ExcelTemplateView
        
        try:
            template_view = ExcelTemplateView()
            template_view.request = request
            
            if upload_type == 'goods_received':
                return template_view._generate_goods_received_template(warehouse_location)
            elif upload_type == 'sea_cargo':
                return template_view._generate_sea_cargo_template()
            else:
                return Response({
                    'error': 'Invalid template type',
                    'available_types': ['goods_received', 'sea_cargo']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': f'Failed to generate template: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Template views for frontend (if needed)
def cargo_dashboard(request):
    """Template view for cargo dashboard"""
    return render(request, 'cargo/dashboard.html')


def sea_cargo_view(request):
    """Template view for sea cargo"""
    return render(request, 'cargo/sea_cargo.html')


def air_cargo_view(request):
    """Template view for air cargo"""
    return render(request, 'cargo/air_cargo.html')


# Customer-specific ViewSets
class CustomerCargoContainerViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer view for their containers only"""
    serializer_class = CargoContainerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only return containers that have cargo items for this customer
        if self.request.user.user_role != 'CUSTOMER':
            return CargoContainer.objects.none()
        
        queryset = CargoContainer.objects.filter(
            cargo_items__client=self.request.user
        ).distinct()
        
        # Apply filters
        cargo_type = self.request.query_params.get('cargo_type')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        
        if cargo_type:
            queryset = queryset.filter(cargo_type=cargo_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(container_id__icontains=search) |
                Q(route__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def my_cargo_items(self, request, pk=None):
        """Get customer's cargo items in this container"""
        container = self.get_object()
        items = CargoItem.objects.filter(
            container=container,
            client=request.user
        )
        serializer = CargoItemSerializer(items, many=True)
        return Response(serializer.data)


class CustomerCargoItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer view for their cargo items only"""
    serializer_class = CargoItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.user_role != 'CUSTOMER':
            return CargoItem.objects.none()
        
        queryset = CargoItem.objects.filter(client=self.request.user)
        
        # Apply filters
        cargo_type = self.request.query_params.get('cargo_type')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        
        if cargo_type:
            queryset = queryset.filter(container__cargo_type=cargo_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(tracking_id__icontains=search) |
                Q(item_description__icontains=search) |
                Q(container__container_id__icontains=search)
            )
        
        return queryset.select_related('container').order_by('-created_at')


class CustomerCargoDashboardView(APIView):
    """Customer-specific cargo dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_role != 'CUSTOMER':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get optional cargo type filter
        cargo_type = request.query_params.get('cargo_type')
        
        # Base queryset for customer's cargo items
        items_queryset = CargoItem.objects.filter(client=request.user)
        containers_queryset = CargoContainer.objects.filter(cargo_items__client=request.user).distinct()
        
        # Apply cargo type filter if specified
        if cargo_type:
            items_queryset = items_queryset.filter(container__cargo_type=cargo_type)
            containers_queryset = containers_queryset.filter(cargo_type=cargo_type)
        
        # Get customer's cargo statistics
        total_cargo_items = items_queryset.count()
        pending_items = items_queryset.filter(status='pending').count()
        in_transit_items = items_queryset.filter(status='in_transit').count()
        delivered_items = items_queryset.filter(status='delivered').count()
        
        # Recent cargo items
        recent_items = items_queryset.order_by('-created_at')[:5]
        
        data = {
            'total_cargo_items': total_cargo_items,
            'pending_items': pending_items,
            'in_transit_items': in_transit_items,
            'delivered_items': delivered_items,
            'total_containers': containers_queryset.count(),
            'recent_items': CargoItemSerializer(recent_items, many=True).data,
            'containers': CargoContainerSerializer(containers_queryset, many=True).data
        }
        
        return Response(data)


class CustomerShippingMarkListView(APIView):
    """Simple view to list customer shipping marks for dropdowns"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        customers = CustomerUser.objects.filter(user_role='CUSTOMER').values('id', 'shipping_mark')
        return Response(list(customers))


# Template views for frontend (if needed)
def cargo_dashboard(request):
    """Template view for cargo dashboard"""
    return render(request, 'cargo/dashboard.html')


def sea_cargo_view(request):
    """Template view for sea cargo"""
    return render(request, 'cargo/sea_cargo.html')


def air_cargo_view(request):
    """Template view for air cargo"""
    return render(request, 'cargo/air_cargo.html')

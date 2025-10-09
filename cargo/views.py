from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
import pandas as pd
from datetime import datetime, timedelta
from django.utils import timezone

from .models import CargoContainer, CargoItem, ClientShipmentSummary
from users.models import CustomerUser
from .serializers import (
    CargoContainerSerializer, CargoContainerDetailSerializer, CargoContainerCreateSerializer,
    CargoItemSerializer, CargoItemCreateSerializer, CustomerUserSerializer,
    ClientShipmentSummarySerializer, CargoDashboardSerializer, BulkCargoItemSerializer
)

# ================================================================
# DASHBOARDS
# ================================================================

class CargoDashboardView(APIView):
    """Admin dashboard for cargo statistics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cargo_type = request.query_params.get('cargo_type', 'sea')
        location = request.query_params.get('location')
        warehouse_type = request.query_params.get('warehouse_type')
        
        containers = CargoContainer.objects.filter(cargo_type=cargo_type)
        
        # Apply location filter if specified
        if location:
            containers = containers.filter(location=location)
            
        # Apply warehouse_type filter if specified  
        if warehouse_type:
            containers = containers.filter(warehouse_type=warehouse_type)

        cargo_items_query = CargoItem.objects.filter(container__cargo_type=cargo_type)
        if location:
            cargo_items_query = cargo_items_query.filter(container__location=location)
        if warehouse_type:
            cargo_items_query = cargo_items_query.filter(container__warehouse_type=warehouse_type)

        data = {
            'total_containers': containers.count(),
            'containers_in_transit': containers.filter(status='in_transit').count(),
            'demurrage_containers': containers.filter(status='demurrage').count(),
            'delivered_containers': containers.filter(status='delivered').count(),
            'pending_containers': containers.filter(status='pending').count(),
            'total_cargo_items': cargo_items_query.count(),
            'recent_containers': CargoContainerSerializer(
                containers.order_by('-created_at')[:10], many=True
            ).data,
        }
        return Response(CargoDashboardSerializer(data).data)


class CustomerCargoDashboardView(APIView):
    """Customer-specific dashboard showing Ghana warehouse goods"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.user_role != 'CUSTOMER':
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # Import here to avoid circular imports
        from GoodsRecieved.models import GoodsReceivedGhana
        from GoodsRecieved.serializers import GoodsReceivedGhanaSerializer
        from claims.models import Claim

        # Get ALL Ghana warehouse goods (since customers can see all Ghana goods)
        ghana_goods = GoodsReceivedGhana.objects.all().order_by('-date_received')
        
        # Get customer's own cargo items for cargo-specific stats
        cargo_type = request.GET.get('cargo_type')  # Use request.GET instead of request.query_params
        items_qs = CargoItem.objects.filter(client=request.user)
        containers_qs = CargoContainer.objects.filter(cargo_items__client=request.user).distinct()

        if cargo_type:
            items_qs = items_qs.filter(container__cargo_type=cargo_type)
            containers_qs = containers_qs.filter(cargo_type=cargo_type)

        # Get customer's claims
        customer_claims = Claim.objects.filter(customer=request.user).order_by('-created_at')
        pending_claims_count = customer_claims.filter(status='PENDING').count()

        data = {
            # Ghana warehouse stats (all goods) - use this for "Total Shipments" 
            'ghana_total_items': ghana_goods.count(),
            'total_shipments': ghana_goods.count(),  # Add this for dashboard Total Shipments card
            'ghana_pending': ghana_goods.filter(status='PENDING').count(),
            'ghana_ready_for_delivery': ghana_goods.filter(status='READY_FOR_DELIVERY').count(),
            'ghana_delivered': ghana_goods.filter(status='DELIVERED').count(),
            'recent_ghana_items': GoodsReceivedGhanaSerializer(ghana_goods[:5], many=True).data,
            
            # Claims data (customer-specific)
            'pending_claims_count': pending_claims_count,
            'total_claims': customer_claims.count(),
            'recent_claims': [{
                'id': claim.id,
                'tracking_id': claim.tracking_id,
                'item_name': claim.item_name,
                'status': claim.status.lower() if claim.status else 'pending',
                'created_at': claim.created_at.isoformat(),
                'item_description': claim.item_description,
                'shipping_mark': claim.shipping_mark,
            } for claim in customer_claims[:5]],
            
            # Cargo items (customer-specific - for backward compatibility)
            'total_cargo_items': items_qs.count(),
            'cargo_items_count': items_qs.count(),  # Add this field for dashboard compatibility
            'pending_items': items_qs.filter(status='pending').count(),
            'in_transit_items': items_qs.filter(status='in_transit').count(),
            'delivered_items': items_qs.filter(status='delivered').count(),
            'total_containers': containers_qs.count(),
            'containers': CargoContainerSerializer(containers_qs, many=True).data,
            
            # Transform Ghana goods to look like cargo items for dashboard compatibility
            'recent_items': [{
                'id': str(item.id),
                'shipping_mark': item.shipping_mark,
                'tracking_number': item.supply_tracking,
                'status': 'delivered' if item.status == 'DELIVERED' else 'in_transit' if item.status == 'READY_FOR_DELIVERY' else 'pending',
                'quantity': item.quantity,
                'created_at': item.date_received.isoformat() if item.date_received else item.created_at.isoformat(),
                'type': 'warehouse_item',  # Distinguish from actual cargo items
            } for item in ghana_goods[:5]],
        }
        return Response(data)

# ================================================================
# CONTAINERS
# ================================================================

class CargoContainerViewSet(viewsets.ModelViewSet):
    """Admin management of cargo containers"""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CargoContainer.objects.all().order_by('-created_at')
        cargo_type = self.request.query_params.get('cargo_type')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        location = self.request.query_params.get('location')
        warehouse_type = self.request.query_params.get('warehouse_type')

        if cargo_type:
            qs = qs.filter(cargo_type=cargo_type)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if location:
            qs = qs.filter(location=location)
        if warehouse_type:
            qs = qs.filter(warehouse_type=warehouse_type)
        if search:
            qs = qs.filter(Q(container_id__icontains=search) | Q(route__icontains=search))
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CargoContainerDetailSerializer
        elif self.action == 'create':
            return CargoContainerCreateSerializer
        return CargoContainerSerializer

    @action(detail=True, methods=['get'])
    def client_summaries(self, request, pk=None):
        summaries = ClientShipmentSummary.objects.filter(container=self.get_object())
        return Response(ClientShipmentSummarySerializer(summaries, many=True).data)

    @action(detail=True, methods=['get'])
    def cargo_items(self, request, pk=None):
        items = CargoItem.objects.filter(container=self.get_object())
        shipping_mark = request.query_params.get('shipping_mark')
        if shipping_mark:
            items = items.filter(client__shipping_mark=shipping_mark)
        return Response(CargoItemSerializer(items, many=True).data)

    @action(detail=True, methods=['post'])
    def add_cargo_item(self, request, pk=None):
        container = self.get_object()
        data = request.data.copy()
        data['container'] = container.container_id

        serializer = CargoItemCreateSerializer(data=data)
        if serializer.is_valid():
            cargo_item = serializer.save()
            summary, _ = ClientShipmentSummary.objects.get_or_create(
                container=container, client=cargo_item.client
            )
            summary.update_totals()
            # Update container totals
            if container.cargo_type == 'sea':
                container.update_total_cbm()
            elif container.cargo_type == 'air':
                container.update_total_weight()
            return Response(CargoItemSerializer(cargo_item).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ================================================================
# ITEMS
# ================================================================

class CargoItemViewSet(viewsets.ModelViewSet):
    queryset = CargoItem.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CargoItemCreateSerializer if self.action == 'create' else CargoItemSerializer

    def get_queryset(self):
        qs = CargoItem.objects.all()
        container_id = self.request.query_params.get('container_id')
        shipping_mark = self.request.query_params.get('shipping_mark')
        status_filter = self.request.query_params.get('status')
        client_id = self.request.query_params.get('client')

        if container_id:
            qs = qs.filter(container__container_id=container_id)
        if shipping_mark:
            qs = qs.filter(client__shipping_mark=shipping_mark)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def perform_create(self, serializer):
        cargo_item = serializer.save()
        summary, _ = ClientShipmentSummary.objects.get_or_create(
            container=cargo_item.container, client=cargo_item.client
        )
        summary.update_totals()
        # Update container totals
        container = cargo_item.container
        if container.cargo_type == 'sea':
            container.update_total_cbm()
        elif container.cargo_type == 'air':
            container.update_total_weight()

    def perform_update(self, serializer):
        cargo_item = serializer.save()
        summary, _ = ClientShipmentSummary.objects.get_or_create(
            container=cargo_item.container, client=cargo_item.client
        )
        summary.update_totals()
        # Update container totals
        container = cargo_item.container
        if container.cargo_type == 'sea':
            container.update_total_cbm()
        elif container.cargo_type == 'air':
            container.update_total_weight()

    def perform_destroy(self, instance):
        container = instance.container
        client = instance.client
        instance.delete()
        # Update summary
        try:
            summary = ClientShipmentSummary.objects.get(container=container, client=client)
            summary.update_totals()
        except ClientShipmentSummary.DoesNotExist:
            pass
        # Update container totals
        if container.cargo_type == 'sea':
            container.update_total_cbm()
        elif container.cargo_type == 'air':
            container.update_total_weight()

# ================================================================
# SUMMARIES
# ================================================================

class ClientShipmentSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientShipmentSummarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ClientShipmentSummary.objects.all()
        container_id = self.request.query_params.get('container_id')
        cargo_type = self.request.query_params.get('cargo_type')
        if container_id:
            qs = qs.filter(container__container_id=container_id)
        if cargo_type:
            qs = qs.filter(container__cargo_type=cargo_type)
        return qs

    @action(detail=True, methods=['get'])
    def cargo_items(self, request, pk=None):
        summary = self.get_object()
        items = CargoItem.objects.filter(container=summary.container, client=summary.client)
        return Response(CargoItemSerializer(items, many=True).data)

# ================================================================
# CUSTOMERS
# ================================================================

class CustomerUserViewSet(viewsets.ModelViewSet):
    queryset = CustomerUser.objects.filter(user_role='CUSTOMER')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CustomerShippingMarkSerializer
        return CustomerShippingMarkSerializer if self.action in ['list', 'retrieve'] else CustomerUserSerializer

    def get_queryset(self):
        qs = CustomerUser.objects.filter(user_role='CUSTOMER')
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(shipping_mark__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(company_name__icontains=search)
            )
        return qs

# ================================================================
# EXCEL UPLOADS
# ================================================================

class ExcelUploadProcessor:
    """Central processor for Excel uploads (sea cargo, goods received, etc.)"""

    def __init__(self, file, upload_type, warehouse_location=None, uploader_user_id=None, container_id=None):
        self.file = file
        self.upload_type = upload_type
        self.warehouse_location = warehouse_location
        self.uploader_user_id = uploader_user_id
        self.container_id = container_id

    def _read_file(self):
        if self.file.name.endswith('.csv'):
            return pd.read_csv(self.file, encoding='utf-8')
        return pd.read_excel(self.file, engine='openpyxl')

    def process(self):
        try:
            df = self._read_file()
        except Exception as e:
            return {"success": False, "error": f"Failed to read file: {str(e)}", "summary": {}, "results": []}

        if self.upload_type == "sea_cargo":
            return self._process_sea_cargo(df)
        elif self.upload_type == "goods_received":
            # Future: implement warehouse goods received flow
            return {"success": True, "summary": {"rows": len(df)}, "results": []}
        else:
            return {"success": False, "error": "Invalid upload type", "summary": {}, "results": []}

    def _process_sea_cargo(self, df):
        if not self.container_id:
            return {"success": False, "error": "container_id required for sea cargo", "summary": {}, "results": []}

        container = get_object_or_404(CargoContainer, container_id=self.container_id)
        created_items, errors = [], []

        required_columns = ['shipping_mark', 'item_description', 'quantity', 'cbm']
        missing = [c for c in required_columns if c not in df.columns]

        if missing:
            return {"success": False, "error": f"Missing required columns: {missing}", "summary": {}, "results": []}

        for index, row in df.iterrows():
            try:
                client = CustomerUser.objects.get(shipping_mark=row['shipping_mark'])
            except CustomerUser.DoesNotExist:
                errors.append(f"Row {index+2}: Customer with shipping mark '{row['shipping_mark']}' not found.")
                continue

            try:
                cargo_item = CargoItem.objects.create(
                    container=container,
                    client=client,
                    item_description=row['item_description'],
                    quantity=int(row['quantity']),
                    cbm=float(row['cbm']),
                    weight=float(row.get('weight', 0)) if pd.notna(row.get('weight')) else None,
                    unit_value=float(row.get('unit_value', 0)) if pd.notna(row.get('unit_value')) else None,
                    total_value=float(row.get('total_value', 0)) if pd.notna(row.get('total_value')) else None,
                    status=row.get('status', 'pending'),
                )
                created_items.append(cargo_item)
                summary, _ = ClientShipmentSummary.objects.get_or_create(container=container, client=client)
                summary.update_totals()
            except Exception as e:
                errors.append(f"Row {index+2}: {str(e)}")

        return {
            "success": True if created_items else False,
            "summary": {"created": len(created_items), "errors": len(errors)},
            "results": CargoItemSerializer(created_items, many=True).data,
            "error": errors if errors else None,
        }


class BulkCargoItemUploadView(APIView):
    """Legacy-style bulk upload (sea cargo)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        container_id = request.data.get('container_id')
        if not file or not container_id:
            return Response({'error': 'File and container_id required'}, status=status.HTTP_400_BAD_REQUEST)

        processor = ExcelUploadProcessor(file=file, upload_type='sea_cargo', container_id=container_id)
        result = processor.process()
        return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)


class EnhancedExcelUploadView(APIView):
    """Enhanced upload supporting multiple types"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        upload_type = request.data.get('upload_type', 'sea_cargo')
        container_id = request.data.get('container_id')
        warehouse_location = request.data.get('warehouse_location')

        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        processor = ExcelUploadProcessor(
            file=file, upload_type=upload_type, warehouse_location=warehouse_location,
            uploader_user_id=request.user.id, container_id=container_id
        )
        result = processor.process()

        upload_info = {
            "file_name": file.name,
            "upload_type": upload_type,
            "warehouse_location": warehouse_location,
            "processed_by": getattr(request.user, 'phone', str(request.user)),
            "processed_at": datetime.now().isoformat()
        }
        result['upload_info'] = upload_info

        return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)


class ExcelTemplateDownloadView(APIView):
    """Download Excel templates"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        upload_type = request.query_params.get('type', 'goods_received')
        warehouse_location = request.query_params.get('warehouse', 'China')

        from .excel_upload_views import ExcelTemplateView
        template_view = ExcelTemplateView()
        template_view.request = request

        if upload_type == 'goods_received':
            return template_view._generate_goods_received_template(warehouse_location)
        elif upload_type == 'sea_cargo':
            return template_view._generate_sea_cargo_template()
        return Response({'error': 'Invalid template type'}, status=status.HTTP_400_BAD_REQUEST)

# ================================================================
# CUSTOMER VIEWSETS
# ================================================================

class CustomerCargoContainerViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer-facing viewset that exposes recent cargo containers."""
    permission_classes = [IsAuthenticated]
    serializer_class = CargoContainerSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['cargo_type', 'status', 'location', 'warehouse_type']
    search_fields = ['container_id', 'route']
    ordering_fields = ['load_date', 'eta', 'created_at', 'stay_days', 'delay_days']
    ordering = ['-load_date', '-created_at']

    def _parse_date(self, value):
        if not value:
            return None
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except (TypeError, ValueError):
            return None

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'user_role', None) != 'CUSTOMER':
            return CargoContainer.objects.none()

        # Filter containers to only show those that have the customer's items
        qs = CargoContainer.objects.filter(
            Q(cargo_items__client=user) | Q(cargo_items__client__shipping_mark=user.shipping_mark)
        ).distinct()

        today = timezone.now().date()
        default_start = today - timedelta(days=30)

        requested_start = self._parse_date(self.request.query_params.get('date_from'))
        requested_end = self._parse_date(self.request.query_params.get('date_to'))

        start_date = requested_start or default_start
        qs = qs.filter(load_date__gte=start_date)

        if requested_end:
            qs = qs.filter(load_date__lte=requested_end)

        cargo_type = self.request.query_params.get('type') or self.request.query_params.get('cargo_type')
        if cargo_type:
            mapped_type = {
                'sea': 'sea',
                'air': 'air',
                'SEA': 'sea',
                'AIR': 'air'
            }.get(cargo_type, cargo_type.lower())
            qs = qs.filter(cargo_type=mapped_type)

        status_param = self.request.query_params.get('status')
        if status_param:
            status_map = {
                'PENDING': 'pending',
                'IN_TRANSIT': 'in_transit',
                'DELIVERED': 'delivered',
                'DELAYED': 'demurrage',
                'DEMURRAGE': 'demurrage',
                'pending': 'pending',
                'in_transit': 'in_transit',
                'delivered': 'delivered',
                'delayed': 'demurrage',
                'demurrage': 'demurrage'
            }
            mapped_status = status_map.get(status_param, status_param.lower())
            qs = qs.filter(status=mapped_status)

        location_param = self.request.query_params.get('location')
        if location_param:
            location_map = {
                'china': 'china',
                'ghana': 'ghana',
                'transit': 'transit',
                'CHINA': 'china',
                'GHANA': 'ghana',
                'TRANSIT': 'transit',
                'guangzhou': 'china',
                'accra': 'ghana',
            }
            mapped_location = location_map.get(location_param, location_param.lower())
            qs = qs.filter(location=mapped_location)

        warehouse_type = self.request.query_params.get('warehouse_type')
        if warehouse_type:
            qs = qs.filter(warehouse_type=warehouse_type)

        return qs.order_by('-load_date', '-created_at').distinct()

    @action(detail=True, methods=['get'], url_path='items')
    def items(self, request, pk=None):
        """Get cargo items for a specific container (customer-specific)"""
        container = self.get_object()
        user = request.user
        
        # Filter items to only show customer's items
        items = CargoItem.objects.filter(
            container=container
        ).filter(
            Q(client=user) | Q(client__shipping_mark=user.shipping_mark)
        ).select_related('client', 'container')
        
        serializer = CargoItemSerializer(items, many=True)
        return Response({
            'results': serializer.data,
            'count': items.count(),
            'container_number': container.container_id,
        })


class CustomerCargoItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Customer-specific read-only ViewSet for their cargo items"""
    permission_classes = [IsAuthenticated]
    serializer_class = CargoItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['tracking_id', 'item_description', 'container__container_id']
    ordering_fields = ['created_at', 'updated_at', 'quantity']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'user_role', None) != 'CUSTOMER':
            return CargoItem.objects.none()

        qs = CargoItem.objects.filter(
            Q(client=user) | Q(client__shipping_mark=user.shipping_mark)
        ).select_related('container')

        cargo_type = self.request.query_params.get('type') or self.request.query_params.get('cargo_type')
        if cargo_type:
            cargo_type = cargo_type.lower()
            type_map = {
                'sea': 'sea',
                'air': 'air',
                'SEA': 'sea',
                'AIR': 'air'
            }
            mapped_type = type_map.get(cargo_type, cargo_type)
            qs = qs.filter(container__cargo_type=mapped_type)

        status_param = self.request.query_params.get('status')
        if status_param:
            status_map = {
                'PENDING': 'pending',
                'IN_TRANSIT': 'in_transit',
                'DELIVERED': 'delivered',
                'DELAYED': 'delayed',
                'pending': 'pending',
                'in_transit': 'in_transit',
                'delivered': 'delivered',
                'delayed': 'delayed'
            }
            mapped_status = status_map.get(status_param)
            if mapped_status:
                qs = qs.filter(status=mapped_status)

        return qs.order_by('-created_at')


class CustomerShippingMarkListView(APIView):
    """API view to get list of shipping marks for customers"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.user_role == 'CUSTOMER':
            # Return unique shipping marks associated with this customer
            container_marks = CargoContainer.objects.filter(
                Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
            ).values_list('shipping_mark', flat=True).distinct()
            
            cargo_marks = CargoItem.objects.filter(
                Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
            ).values_list('shipping_mark', flat=True).distinct()
            
            # Combine and deduplicate shipping marks
            all_marks = list(set(list(container_marks) + list(cargo_marks)))
            all_marks = [mark for mark in all_marks if mark]  # Remove None values
            
            return Response({
                'shipping_marks': sorted(all_marks),
                'user_shipping_mark': user.shipping_mark,
            })
        
        return Response({'error': 'Only customers can access shipping marks'}, 
                       status=status.HTTP_403_FORBIDDEN)


# ================================================================
# STATISTICS + SIMPLE VIEWS
# ================================================================

@api_view(['GET'])
def cargo_statistics(request):
    return Response({
        'sea_containers': CargoContainer.objects.filter(cargo_type='sea').count(),
        'air_containers': CargoContainer.objects.filter(cargo_type='air').count(),
        'total_demurrage': CargoContainer.objects.filter(status='demurrage').count(),
        'total_in_transit': CargoContainer.objects.filter(status='in_transit').count(),
        'total_containers': CargoContainer.objects.count()
    })


# Minimal template views for frontend
def cargo_dashboard(request):
    return render(request, 'cargo/dashboard.html')

def sea_cargo_view(request):
    return render(request, 'cargo/sea_cargo.html')

def air_cargo_view(request):
    return render(request, 'cargo/air_cargo.html')

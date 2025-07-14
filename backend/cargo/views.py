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
        queryset = CargoContainer.objects.all()
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
            items = items.filter(shipping_mark__shipping_mark=shipping_mark)
        
        serializer = CargoItemSerializer(items, many=True)
        return Response(serializer.data)


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
        
        if container_id:
            queryset = queryset.filter(container__container_id=container_id)
        if shipping_mark:
            queryset = queryset.filter(shipping_mark__shipping_mark=shipping_mark)
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


class CustomerUserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for accessing customer/client information"""
    queryset = CustomerUser.objects.filter(user_role='CUSTOMER')
    serializer_class = CustomerUserSerializer
    permission_classes = [IsAuthenticated]
    
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
    """View for bulk uploading cargo items from Excel"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = BulkCargoItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        excel_file = serializer.validated_data['excel_file']
        container_id = serializer.validated_data['container_id']
        
        try:
            # Get container
            container = get_object_or_404(CargoContainer, container_id=container_id)
            
            # Read Excel or CSV file
            if excel_file.name.endswith('.csv'):
                df = pd.read_csv(excel_file)
            else:
                df = pd.read_excel(excel_file)
            
            # Expected columns
            required_columns = [
                'shipping_mark', 'item_description', 'quantity', 'cbm'
            ]
            
            # Check if required columns exist
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                return Response({
                    'error': f'Missing required columns: {", ".join(missing_columns)}',
                    'required_columns': required_columns
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
            
        except Exception as e:
            return Response({
                'error': f'Failed to process Excel file: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


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

# cargo/customer_shipments_views.py
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Q, Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

from .models import CargoContainer, CargoItem
from .serializers import CargoContainerSerializer, CargoItemSerializer


class CustomerShipmentsView(APIView):
    """
    API view for customer to view their shipments
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get customer's containers based on their shipping mark
        containers = CargoContainer.objects.filter(
            Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
        ).order_by('-created_at')
        
        # Get customer's cargo items
        cargo_items = CargoItem.objects.filter(
            Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
        ).order_by('-created_at')
        
        # Serialize the data
        container_serializer = CargoContainerSerializer(containers, many=True)
        cargo_serializer = CargoItemSerializer(cargo_items, many=True)
        
        return Response({
            'containers': container_serializer.data,
            'cargo_items': cargo_serializer.data,
            'total_containers': containers.count(),
            'total_cargo_items': cargo_items.count(),
        })


class CustomerShipmentStatsView(APIView):
    """
    API view for customer shipment statistics
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get containers stats
        containers = CargoContainer.objects.filter(
            Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
        )
        
        cargo_items = CargoItem.objects.filter(
            Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
        )
        
        # Calculate statistics
        container_stats = containers.aggregate(
            total_containers=Count('id'),
            pending_containers=Count('id', filter=Q(status='PENDING')),
            in_transit_containers=Count('id', filter=Q(status='IN_TRANSIT')),
            delivered_containers=Count('id', filter=Q(status='DELIVERED')),
        )
        
        cargo_stats = cargo_items.aggregate(
            total_items=Count('id'),
            total_quantity=Sum('quantity'),
            pending_items=Count('id', filter=Q(status='PENDING')),
            in_transit_items=Count('id', filter=Q(status='IN_TRANSIT')),
            delivered_items=Count('id', filter=Q(status='DELIVERED')),
        )
        
        # Status distribution for charts
        container_status_dist = list(
            containers.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        
        cargo_status_dist = list(
            cargo_items.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        
        return Response({
            'container_stats': container_stats,
            'cargo_stats': cargo_stats,
            'container_status_distribution': container_status_dist,
            'cargo_status_distribution': cargo_status_dist,
        })


@login_required
def customer_shipment_tracking(request, tracking_id):
    """
    Function-based view for tracking a specific shipment
    """
    user = request.user
    
    # Try to find the tracking ID in containers first
    try:
        container = CargoContainer.objects.get(
            Q(container_id=tracking_id) | Q(tracking_number=tracking_id),
            Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
        )
        
        # Return container tracking info
        return JsonResponse({
            'type': 'container',
            'tracking_id': tracking_id,
            'status': container.status,
            'shipping_mark': container.shipping_mark,
            'container_type': container.container_type,
            'departure_port': container.departure_port,
            'arrival_port': container.arrival_port,
            'departure_date': container.departure_date,
            'estimated_arrival': container.estimated_arrival,
            'actual_arrival': container.actual_arrival,
            'created_at': container.created_at,
            'updated_at': container.updated_at,
        })
        
    except CargoContainer.DoesNotExist:
        pass
    
    # Try to find the tracking ID in cargo items
    try:
        cargo_item = CargoItem.objects.get(
            Q(item_id=tracking_id) | Q(tracking_number=tracking_id),
            Q(customer_user=user) | Q(shipping_mark=user.shipping_mark)
        )
        
        # Return cargo item tracking info
        return JsonResponse({
            'type': 'cargo_item',
            'tracking_id': tracking_id,
            'status': cargo_item.status,
            'shipping_mark': cargo_item.shipping_mark,
            'item_name': cargo_item.item_name,
            'quantity': cargo_item.quantity,
            'weight': cargo_item.weight,
            'dimensions': cargo_item.dimensions,
            'departure_port': cargo_item.departure_port,
            'arrival_port': cargo_item.arrival_port,
            'departure_date': cargo_item.departure_date,
            'estimated_arrival': cargo_item.estimated_arrival,
            'actual_arrival': cargo_item.actual_arrival,
            'container': cargo_item.container.container_id if cargo_item.container else None,
            'created_at': cargo_item.created_at,
            'updated_at': cargo_item.updated_at,
        })
        
    except CargoItem.DoesNotExist:
        pass
    
    # If not found, return 404
    return JsonResponse({
        'error': 'Tracking ID not found or you do not have permission to view this shipment.'
    }, status=404)
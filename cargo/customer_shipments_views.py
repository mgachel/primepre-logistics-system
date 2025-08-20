from django.db.models import Q, Count, Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CargoItem
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from users.models import CustomerUser
from .serializers import CargoItemSerializer
from GoodsRecieved.serializers import GoodsReceivedChinaSerializer, GoodsReceivedGhanaSerializer


class CustomerShipmentsView(APIView):
    """
    Customer Shipments Page - Shows all items linked to a customer's shipping mark
    Categories: Goods Received (China), Goods Received (Ghana), Sea Cargo, Air Cargo
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get customer's shipping mark
        customer = request.user
        if not hasattr(customer, 'shipping_mark') or not customer.shipping_mark:
            return Response(
                {'error': 'No shipping mark found for this customer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shipping_mark = customer.shipping_mark
        
        # Query parameters for filtering
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search', '')
        
        # 1. Goods Received (China)
        china_goods_query = GoodsReceivedChina.objects.filter(
            shipping_mark=shipping_mark
        )
        if status_filter:
            china_goods_query = china_goods_query.filter(status=status_filter)
        if search:
            china_goods_query = china_goods_query.filter(
                Q(description__icontains=search) |
                Q(supply_tracking__icontains=search) |
                Q(item_id__icontains=search)
            )
        
        # 2. Goods Received (Ghana)
        ghana_goods_query = GoodsReceivedGhana.objects.filter(
            shipping_mark=shipping_mark
        )
        if status_filter:
            ghana_goods_query = ghana_goods_query.filter(status=status_filter)
        if search:
            ghana_goods_query = ghana_goods_query.filter(
                Q(description__icontains=search) |
                Q(supply_tracking__icontains=search) |
                Q(item_id__icontains=search)
            )
        
        # 3. Sea Cargo
        sea_cargo_query = CargoItem.objects.filter(
            client__shipping_mark=shipping_mark,
            container__cargo_type='sea'
        )
        if status_filter:
            sea_cargo_query = sea_cargo_query.filter(status=status_filter)
        if search:
            sea_cargo_query = sea_cargo_query.filter(
                Q(item_description__icontains=search) |
                Q(tracking_id__icontains=search) |
                Q(container__container_id__icontains=search)
            )
        
        # 4. Air Cargo
        air_cargo_query = CargoItem.objects.filter(
            client__shipping_mark=shipping_mark,
            container__cargo_type='air'
        )
        if status_filter:
            air_cargo_query = air_cargo_query.filter(status=status_filter)
        if search:
            air_cargo_query = air_cargo_query.filter(
                Q(item_description__icontains=search) |
                Q(tracking_id__icontains=search) |
                Q(container__container_id__icontains=search)
            )
        
        # Serialize data
        china_goods = GoodsReceivedChinaSerializer(china_goods_query, many=True).data
        ghana_goods = GoodsReceivedGhanaSerializer(ghana_goods_query, many=True).data
        sea_cargo = CargoItemSerializer(sea_cargo_query, many=True).data
        air_cargo = CargoItemSerializer(air_cargo_query, many=True).data
        
        # Calculate summaries
        summary_data = {
            'customer_info': {
                'shipping_mark': shipping_mark,
                'customer_name': customer.get_full_name(),
                'company_name': customer.company_name or '',
            },
            'goods_received_china': {
                'count': china_goods_query.count(),
                'total_cbm': china_goods_query.aggregate(Sum('cbm'))['cbm__sum'] or 0,
                'total_quantity': china_goods_query.aggregate(Sum('quantity'))['quantity__sum'] or 0,
                'items': china_goods
            },
            'goods_received_ghana': {
                'count': ghana_goods_query.count(),
                'total_cbm': ghana_goods_query.aggregate(Sum('cbm'))['cbm__sum'] or 0,
                'total_quantity': ghana_goods_query.aggregate(Sum('quantity'))['quantity__sum'] or 0,
                'items': ghana_goods
            },
            'sea_cargo': {
                'count': sea_cargo_query.count(),
                'total_cbm': sea_cargo_query.aggregate(Sum('cbm'))['cbm__sum'] or 0,
                'total_quantity': sea_cargo_query.aggregate(Sum('quantity'))['quantity__sum'] or 0,
                'items': sea_cargo
            },
            'air_cargo': {
                'count': air_cargo_query.count(),
                'total_cbm': air_cargo_query.aggregate(Sum('cbm'))['cbm__sum'] or 0,
                'total_quantity': air_cargo_query.aggregate(Sum('quantity'))['quantity__sum'] or 0,
                'items': air_cargo
            }
        }
        
        return Response(summary_data)


class CustomerShipmentStatsView(APIView):
    """
    Quick stats for customer shipments dashboard
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        customer = request.user
        if not hasattr(customer, 'shipping_mark') or not customer.shipping_mark:
            return Response(
                {'error': 'No shipping mark found for this customer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shipping_mark = customer.shipping_mark
        
        # Count items by category and status
        china_stats = self._get_warehouse_stats(GoodsReceivedChina, shipping_mark)
        ghana_stats = self._get_warehouse_stats(GoodsReceivedGhana, shipping_mark)
        sea_cargo_stats = self._get_cargo_stats(shipping_mark, 'sea')
        air_cargo_stats = self._get_cargo_stats(shipping_mark, 'air')
        
        return Response({
            'customer_info': {
                'shipping_mark': shipping_mark,
                'customer_name': customer.get_full_name(),
            },
            'categories': {
                'goods_received_china': china_stats,
                'goods_received_ghana': ghana_stats,
                'sea_cargo': sea_cargo_stats,
                'air_cargo': air_cargo_stats
            },
            'totals': {
                'total_items': (
                    china_stats['total'] + 
                    ghana_stats['total'] + 
                    sea_cargo_stats['total'] + 
                    air_cargo_stats['total']
                ),
                'total_pending': (
                    china_stats['pending'] + 
                    ghana_stats['pending'] + 
                    sea_cargo_stats['pending'] + 
                    air_cargo_stats['pending']
                )
            }
        })
    
    def _get_warehouse_stats(self, model, shipping_mark):
        """Get statistics for warehouse goods"""
        queryset = model.objects.filter(shipping_mark=shipping_mark)
        total = queryset.count()
        pending = queryset.filter(status='PENDING').count()
        ready = queryset.filter(status__in=['READY_FOR_SHIPPING', 'READY_FOR_DELIVERY']).count()
        shipped = queryset.filter(status__in=['SHIPPED', 'DELIVERED']).count()
        flagged = queryset.filter(status='FLAGGED').count()
        
        return {
            'total': total,
            'pending': pending,
            'ready': ready,
            'shipped': shipped,
            'flagged': flagged
        }
    
    def _get_cargo_stats(self, shipping_mark, cargo_type):
        """Get statistics for cargo items"""
        queryset = CargoItem.objects.filter(
            client__shipping_mark=shipping_mark,
            container__cargo_type=cargo_type
        )
        total = queryset.count()
        pending = queryset.filter(status='pending').count()
        in_transit = queryset.filter(status='in_transit').count()
        delivered = queryset.filter(status='delivered').count()
        delayed = queryset.filter(status='delayed').count()
        
        return {
            'total': total,
            'pending': pending,
            'in_transit': in_transit,
            'delivered': delivered,
            'delayed': delayed
        }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_shipment_tracking(request, tracking_id):
    """
    Track a specific item by tracking ID across all categories
    """
    customer = request.user
    shipping_mark = customer.shipping_mark if hasattr(customer, 'shipping_mark') else None
    
    if not shipping_mark:
        return Response(
            {'error': 'No shipping mark found for this customer'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Search across all categories
    result = {
        'tracking_id': tracking_id,
        'found': False,
        'category': None,
        'item': None
    }
    
    # Check China goods
    try:
        china_item = GoodsReceivedChina.objects.get(
            Q(supply_tracking=tracking_id) | Q(item_id=tracking_id),
            shipping_mark=shipping_mark
        )
        result.update({
            'found': True,
            'category': 'goods_received_china',
            'item': GoodsReceivedChinaSerializer(china_item).data
        })
        return Response(result)
    except GoodsReceivedChina.DoesNotExist:
        pass
    
    # Check Ghana goods
    try:
        ghana_item = GoodsReceivedGhana.objects.get(
            Q(supply_tracking=tracking_id) | Q(item_id=tracking_id),
            shipping_mark=shipping_mark
        )
        result.update({
            'found': True,
            'category': 'goods_received_ghana',
            'item': GoodsReceivedGhanaSerializer(ghana_item).data
        })
        return Response(result)
    except GoodsReceivedGhana.DoesNotExist:
        pass
    
    # Check Cargo items
    try:
        cargo_item = CargoItem.objects.get(
            tracking_id=tracking_id,
            client__shipping_mark=shipping_mark
        )
        category = f"{cargo_item.container.cargo_type}_cargo"
        result.update({
            'found': True,
            'category': category,
            'item': CargoItemSerializer(cargo_item).data
        })
        return Response(result)
    except CargoItem.DoesNotExist:
        pass
    
    return Response(result)

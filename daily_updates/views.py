from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from django.db import models
from datetime import timedelta
from .models import DailyUpdate
from .serializers import DailyUpdateSerializer
from cargo.models import CargoContainer, CargoItem
from cargo.serializers import CargoContainerSerializer, CargoItemSerializer
from GoodsRecieved.models import GoodsReceivedChina
from GoodsRecieved.serializers import GoodsReceivedChinaSerializer

class DailyUpdatePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class DailyUpdateViewSet(viewsets.ModelViewSet):
    queryset = DailyUpdate.objects.all()
    serializer_class = DailyUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = DailyUpdatePagination
    
    # Add filtering and search capabilities
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_fields = ['priority']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'updated_at', 'priority', 'expires_at']
    ordering = ['-created_at']
    
    def get_serializer_context(self):
        """Add request to serializer context for building absolute URLs"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        """Override to add custom filtering"""
        queryset = DailyUpdate.objects.all()
        
        # Filter by expired status if requested
        expired = self.request.query_params.get('expired')
        if expired is not None:
            now = timezone.now()
            if expired.lower() == 'true':
                queryset = queryset.filter(expires_at__lt=now)
            elif expired.lower() == 'false':
                queryset = queryset.filter(
                    models.Q(expires_at__gte=now) | models.Q(expires_at__isnull=True)
                )
        
        return queryset

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only non-expired updates"""
        now = timezone.now()
        active_updates = DailyUpdate.objects.filter(
            models.Q(expires_at__gte=now) | models.Q(expires_at__isnull=True)
        )
        
        page = self.paginate_queryset(active_updates)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active_updates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get only expired updates"""
        now = timezone.now()
        expired_updates = DailyUpdate.objects.filter(expires_at__lt=now)
        
        page = self.paginate_queryset(expired_updates)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(expired_updates, many=True)
        return Response(serializer.data)


class CustomerDailyUpdatesPagination(PageNumberPagination):
    """Pagination for customer daily updates views"""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class CustomerAirContainersView(APIView):
    """
    Customer view for Air Cargo containers - read-only, last 30 days only
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Ensure user is a customer
        if not hasattr(request.user, 'user_role') or request.user.user_role != 'CUSTOMER':
            return Response({
                'success': False,
                'error': 'Access denied. Customer role required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get date 30 days ago
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get all air containers from last 30 days
        containers = CargoContainer.objects.filter(
            cargo_type='air',
            created_at__gte=thirty_days_ago
        ).prefetch_related('cargo_items')
        
        # Apply search filter if provided (includes tracking ID search)
        search = request.query_params.get('search', '').strip()
        if search:
            containers = containers.filter(
                models.Q(container_id__icontains=search) |
                models.Q(route__icontains=search) |
                models.Q(cargo_items__tracking_id__icontains=search)
            ).distinct()
        
        # Apply status filter if provided
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            containers = containers.filter(status=status_filter)
        
        # Order by created date descending
        containers = containers.order_by('-created_at')
        
        # Paginate results
        paginator = CustomerDailyUpdatesPagination()
        page = paginator.paginate_queryset(containers, request)
        
        if page is not None:
            serializer = CargoContainerSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data = {
                'success': True,
                'data': response.data.get('results', serializer.data),
                'message': 'Air containers retrieved successfully',
                'count': response.data.get('count'),
                'next': response.data.get('next'),
                'previous': response.data.get('previous'),
            }
            return response
        
        serializer = CargoContainerSerializer(containers, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Air containers retrieved successfully'
        })


class CustomerAirGoodsReceivedView(APIView):
    """
    Customer view for Air Goods Received in China - read-only, last 30 days only
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Ensure user is a customer
        if not hasattr(request.user, 'user_role') or request.user.user_role != 'CUSTOMER':
            return Response({
                'success': False,
                'error': 'Access denied. Customer role required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get date 30 days ago
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get air goods received from last 30 days
        goods = GoodsReceivedChina.objects.filter(
            method_of_shipping='AIR',
            created_at__gte=thirty_days_ago
        )
        
        # Apply search filter if provided
        search = request.query_params.get('search', '').strip()
        if search:
            goods = goods.filter(
                models.Q(shipping_mark__icontains=search) |
                models.Q(supply_tracking__icontains=search) |
                models.Q(description__icontains=search)
            )
        
        # Apply status filter if provided
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            goods = goods.filter(status=status_filter)
        
        # Order by date received descending
        goods = goods.order_by('-date_received')
        
        # Paginate results
        paginator = CustomerDailyUpdatesPagination()
        page = paginator.paginate_queryset(goods, request)
        
        if page is not None:
            serializer = GoodsReceivedChinaSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data = {
                'success': True,
                'data': response.data.get('results', serializer.data),
                'message': 'Air goods received retrieved successfully',
                'count': response.data.get('count'),
                'next': response.data.get('next'),
                'previous': response.data.get('previous'),
            }
            return response
        
        serializer = GoodsReceivedChinaSerializer(goods, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Air goods received retrieved successfully'
        })


class CustomerSeaContainersView(APIView):
    """
    Customer view for Sea Cargo containers - read-only, last 30 days only
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Ensure user is a customer
        if not hasattr(request.user, 'user_role') or request.user.user_role != 'CUSTOMER':
            return Response({
                'success': False,
                'error': 'Access denied. Customer role required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get date 30 days ago
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get all sea containers from last 30 days
        containers = CargoContainer.objects.filter(
            cargo_type='sea',
            created_at__gte=thirty_days_ago
        ).prefetch_related('cargo_items')
        
        # Apply search filter if provided (includes tracking ID search)
        search = request.query_params.get('search', '').strip()
        if search:
            containers = containers.filter(
                models.Q(container_id__icontains=search) |
                models.Q(route__icontains=search) |
                models.Q(cargo_items__tracking_id__icontains=search)
            ).distinct()
        
        # Apply status filter if provided
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            containers = containers.filter(status=status_filter)
        
        # Order by created date descending
        containers = containers.order_by('-created_at')
        
        # Paginate results
        paginator = CustomerDailyUpdatesPagination()
        page = paginator.paginate_queryset(containers, request)
        
        if page is not None:
            serializer = CargoContainerSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data = {
                'success': True,
                'data': response.data.get('results', serializer.data),
                'message': 'Sea containers retrieved successfully',
                'count': response.data.get('count'),
                'next': response.data.get('next'),
                'previous': response.data.get('previous'),
            }
            return response
        
        serializer = CargoContainerSerializer(containers, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Sea containers retrieved successfully'
        })


class CustomerSeaGoodsReceivedView(APIView):
    """
    Customer view for Sea Goods Received in China - read-only, last 30 days only
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Ensure user is a customer
        if not hasattr(request.user, 'user_role') or request.user.user_role != 'CUSTOMER':
            return Response({
                'success': False,
                'error': 'Access denied. Customer role required.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get date 30 days ago
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Get sea goods received from last 30 days
        goods = GoodsReceivedChina.objects.filter(
            method_of_shipping='SEA',
            created_at__gte=thirty_days_ago
        )
        
        # Apply search filter if provided
        search = request.query_params.get('search', '').strip()
        if search:
            goods = goods.filter(
                models.Q(shipping_mark__icontains=search) |
                models.Q(supply_tracking__icontains=search) |
                models.Q(description__icontains=search)
            )
        
        # Apply status filter if provided
        status_filter = request.query_params.get('status', '').strip()
        if status_filter:
            goods = goods.filter(status=status_filter)
        
        # Order by date received descending
        goods = goods.order_by('-date_received')
        
        # Paginate results
        paginator = CustomerDailyUpdatesPagination()
        page = paginator.paginate_queryset(goods, request)
        
        if page is not None:
            serializer = GoodsReceivedChinaSerializer(page, many=True)
            response = paginator.get_paginated_response(serializer.data)
            response.data = {
                'success': True,
                'data': response.data.get('results', serializer.data),
                'message': 'Sea goods received retrieved successfully',
                'count': response.data.get('count'),
                'next': response.data.get('next'),
                'previous': response.data.get('previous'),
            }
            return response
        
        serializer = GoodsReceivedChinaSerializer(goods, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Sea goods received retrieved successfully'
        })


class CustomerContainerDetailView(APIView):
    """
    Get detailed container information with cargo items for customer users.
    Only returns containers where the customer has cargo items.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, container_id):
        # Check if user is a customer
        user_role = getattr(request.user, 'user_role', None)
        if not user_role or user_role != 'CUSTOMER':
            return Response({
                'success': False,
                'message': 'Only customer users can access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get the container
            container = CargoContainer.objects.prefetch_related(
                'cargo_items__client'
            ).get(container_id=container_id)
            
            # Get all cargo items in this container
            all_items = container.cargo_items.all()
            
            # Serialize container with all cargo items
            container_data = CargoContainerSerializer(container).data
            cargo_items_data = CargoItemSerializer(all_items, many=True).data
            
            return Response({
                'success': True,
                'data': {
                    **container_data,
                    'cargo_items': cargo_items_data,
                    'total_items': all_items.count()
                },
                'message': 'Container details retrieved successfully'
            })
            
        except CargoContainer.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Container not found'
            }, status=status.HTTP_404_NOT_FOUND)

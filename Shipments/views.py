from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .models import Shipments
from .serializers import ShipmentsSerializer, ClientShipmentsSerializer

class ShipmentsViewSet(viewsets.ModelViewSet):
	queryset = Shipments.objects.all()
	serializer_class = ShipmentsSerializer

	def perform_create(self, serializer):
		serializer.save()

	def perform_update(self, serializer):
		serializer.save()

	@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
	def client_shipments(self, request):
		"""Get all shipments that clients can search through"""
		user = request.user
		
		# Only allow customers to access this endpoint
		if user.user_role != 'CUSTOMER':
			return Response(
				{'error': 'Access denied. Only customers can view client shipments.'},
				status=status.HTTP_403_FORBIDDEN
			)
		
		# Get query parameters
		search = request.query_params.get('search', '').strip()
		status_filter = request.query_params.get('status', '').strip()
		method_filter = request.query_params.get('method_of_shipping', '').strip()
		date_from = request.query_params.get('date_from', '').strip()
		date_to = request.query_params.get('date_to', '').strip()
		page_size = int(request.query_params.get('page_size', 20))
		
		# Start with all shipments (clients can search through all)
		queryset = Shipments.objects.all()
		
		# Apply filters
		if search:
			queryset = queryset.filter(
				Q(supply_tracking__icontains=search) | Q(shipping_mark__icontains=search) | Q(item_id__icontains=search)
			)
		
		if status_filter:
			queryset = queryset.filter(status=status_filter)
		
		if method_filter:
			queryset = queryset.filter(method_of_shipping=method_filter)
		
		if date_from:
			try:
				from_date = timezone.datetime.strptime(date_from, '%Y-%m-%d').date()
				queryset = queryset.filter(date_received__date__gte=from_date)
			except ValueError:
				pass
		
		if date_to:
			try:
				to_date = timezone.datetime.strptime(date_to, '%Y-%m-%d').date()
				queryset = queryset.filter(date_received__date__lte=to_date)
			except ValueError:
				pass
		
		# Default to past 60 days if no date filters
		if not date_from and not date_to:
			sixty_days_ago = timezone.now() - timedelta(days=60)
			queryset = queryset.filter(date_received__gte=sixty_days_ago)
		
		# Order by most recent first
		queryset = queryset.order_by('-date_received')
		
		# Paginate results
		from django.core.paginator import Paginator
		paginator = Paginator(queryset, page_size)
		page_number = request.query_params.get('page', 1)
		page_obj = paginator.get_page(page_number)
		
		# Serialize data
		serializer = ClientShipmentsSerializer(page_obj, many=True)
		
		return Response({
			'count': paginator.count,
			'next': page_obj.next_page_number() if page_obj.has_next() else None,
			'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
			'results': serializer.data
		})
	
	@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
	def client_stats(self, request):
		"""Get shipment statistics for the authenticated customer"""
		user = request.user
		
		# Only allow customers to access this endpoint
		if user.user_role != 'CUSTOMER':
			return Response(
				{'error': 'Access denied. Only customers can view client statistics.'},
				status=status.HTTP_403_FORBIDDEN
			)
		
		# Get all shipments for statistics
		queryset = Shipments.objects.all()
		
		# Calculate statistics
		stats = {
			'total': queryset.count(),
			'pending': queryset.filter(status='pending').count(),
			'in_transit': queryset.filter(status='in_transit').count(),
			'delivered': queryset.filter(status='delivered').count(),
			'demurrage': queryset.filter(status='demurrage').count(),
		}
		
		return Response(stats)

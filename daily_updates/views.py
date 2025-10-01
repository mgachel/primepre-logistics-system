from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import models
from datetime import timedelta
from .models import DailyUpdate
from .serializer import DailyUpdateSerializer

class DailyUpdatePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# Create your views here.
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
    filterset_fields = ['priority', 'created_at', 'expires_at']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'updated_at', 'priority', 'expires_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Override to add custom filtering"""
        queryset = DailyUpdate.objects.all()
        
        # Filter by expired status
        expired = self.request.query_params.get('expired', None)
        if expired is not None:
            now = timezone.now()
            if expired.lower() == 'true':
                queryset = queryset.filter(expires_at__lt=now)
            elif expired.lower() == 'false':
                queryset = queryset.filter(
                    models.Q(expires_at__gte=now) | models.Q(expires_at__isnull=True)
                )
        
        return queryset

    def perform_create(self, serializer):
        """Custom create logic"""
        instance = serializer.save()
        if not instance.expires_at:
            instance.expires_at = timezone.now() + timedelta(days=7)
            instance.save()

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only non-expired updates"""
        now = timezone.now()
        active_updates = self.get_queryset().filter(
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
        expired_updates = self.get_queryset().filter(expires_at__lt=now)
        
        page = self.paginate_queryset(expired_updates)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(expired_updates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_priority(self, request):
        """Get updates grouped by priority"""
        priority = request.query_params.get('priority')
        if not priority:
            return Response(
                {'error': 'Priority parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updates = self.get_queryset().filter(priority=priority)
        page = self.paginate_queryset(updates)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(updates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def extend_expiry(self, request, pk=None):
        """Extend the expiry date of an update"""
        update = self.get_object()
        days = request.data.get('days', 7)
        
        try:
            days = int(days)
            if days <= 0:
                return Response(
                    {'error': 'Days must be a positive integer'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except (ValueError, TypeError):
            return Response(
                {'error': 'Days must be a valid integer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if update.expires_at:
            update.expires_at = update.expires_at + timedelta(days=days)
        else:
            update.expires_at = timezone.now() + timedelta(days=days)
        
        update.save()
        serializer = self.get_serializer(update)
        return Response(serializer.data)
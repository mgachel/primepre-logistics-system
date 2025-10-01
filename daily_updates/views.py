from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from django.db import models
from .models import DailyUpdate
from .serializers import DailyUpdateSerializer

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

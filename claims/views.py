from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction
import logging
from .models import Claim
from .serializers import (
    ClaimSerializer, 
    ClaimCreateSerializer,
    AdminClaimSerializer,
    ClaimStatusUpdateSerializer,
    AdminClaimCreateSerializer
)
from users.permissions import IsCustomer, IsAdminUser

logger = logging.getLogger(__name__)


class CustomerClaimListCreateView(generics.ListCreateAPIView):
    """
    Customer view to list their own claims and create new ones
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return claims for the authenticated customer."""
        queryset = Claim.objects.filter(customer=self.request.user)
        logger.debug(f"Getting claims for user: {self.request.user} (role: {getattr(self.request.user, 'user_role', 'No role')}) - Found: {queryset.count()}")
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClaimCreateSerializer
        return ClaimSerializer
    
    def list(self, request, *args, **kwargs):
        """List claims for the authenticated customer."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        logger.debug(f"Serialized data for user {request.user}: {serializer.data}")
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Create a claim and link to the authenticated customer. Uses atomic transaction."""
        logger.info(f"Creating claim for user: {self.request.user} (role: {getattr(self.request.user, 'user_role', 'No role')})")
        with transaction.atomic():
            claim = serializer.save(customer=self.request.user)
        logger.info(f"Created claim: {claim.id} for customer: {claim.customer}")
        return claim


class CustomerClaimDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Customer view to see details of their own claim, update, and delete
    """
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Customers can only see their own claims
        return Claim.objects.filter(customer=self.request.user)


class AdminClaimListView(generics.ListCreateAPIView):
    """
    Admin view to list and create claims for any customer (admins only)
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """Return all claims, with optional filters for admin users."""
        queryset = Claim.objects.select_related('customer').all()
        logger.debug(f"Admin claims - Total claims in DB: {queryset.count()}")
        # Filter by status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            logger.debug(f"Admin claims - After status filter '{status_filter}': {queryset.count()}")
        # Filter by shipping mark if provided
        shipping_mark = self.request.query_params.get('shipping_mark', None)
        if shipping_mark:
            queryset = queryset.filter(shipping_mark__icontains=shipping_mark)
            logger.debug(f"Admin claims - After shipping_mark filter '{shipping_mark}': {queryset.count()}")
        # Filter by tracking ID if provided
        tracking_id = self.request.query_params.get('tracking_id', None)
        if tracking_id:
            queryset = queryset.filter(tracking_id__icontains=tracking_id)
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(item_name__icontains=search) |
                Q(item_description__icontains=search) |
                Q(tracking_id__icontains=search) |
                Q(shipping_mark__icontains=search)
            )
            logger.debug(f"Admin claims - After search filter '{search}': {queryset.count()}")
        logger.debug(f"Admin claims - Final queryset count: {queryset.count()}")
        for claim in queryset[:5]:  # Show first 5 claims
            logger.debug(f"  - Claim {claim.id}: {claim.tracking_id} by {claim.customer}")
        return queryset

    def get_serializer_class(self):
        # Use admin list serializer for GET, and admin create serializer for POST
        if self.request.method == 'POST':
            return AdminClaimCreateSerializer
        return AdminClaimSerializer

    def create(self, request, *args, **kwargs):
        # Use AdminClaimCreateSerializer to allow admin to create claim for any customer via shipping_mark
        serializer = None
        try:
            serializer = AdminClaimCreateSerializer(data=request.data, context={'request': request})
        except Exception:
            serializer = None

        if serializer is None:
            return Response({'detail': 'Invalid serializer setup'}, status=status.HTTP_400_BAD_REQUEST)

        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            claim = serializer.save()

        output_serializer = AdminClaimSerializer(claim, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class AdminClaimDetailView(generics.RetrieveUpdateAPIView):
    """
    Admin view to see and update any claim
    """
    queryset = Claim.objects.select_related('customer').all()
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
        """Return appropriate serializer for admin claim detail/update."""
        if self.request.method in ['PUT', 'PATCH']:
            return ClaimStatusUpdateSerializer
        return AdminClaimSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def admin_claims_summary(request):
    """
    Admin endpoint to get claims summary statistics
    """
    total_claims = Claim.objects.count()
    pending_claims = Claim.objects.filter(status='PENDING').count()
    under_review = Claim.objects.filter(status='UNDER_REVIEW').count()
    resolved_claims = Claim.objects.filter(status__in=['APPROVED', 'RESOLVED']).count()
    rejected_claims = Claim.objects.filter(status='REJECTED').count()
    
    # Recent claims (last 7 days)
    from django.utils import timezone
    from datetime import timedelta
    seven_days_ago = timezone.now() - timedelta(days=7)
    recent_claims = Claim.objects.filter(created_at__gte=seven_days_ago).count()
    
    return Response({
        'total_claims': total_claims,
        'pending_claims': pending_claims,
        'under_review': under_review,
        'resolved_claims': resolved_claims,
        'rejected_claims': rejected_claims,
        'recent_claims': recent_claims,
        'status_breakdown': {
            'PENDING': pending_claims,
            'UNDER_REVIEW': under_review,
            'APPROVED': Claim.objects.filter(status='APPROVED').count(),
            'REJECTED': rejected_claims,
            'RESOLVED': Claim.objects.filter(status='RESOLVED').count(),
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def customer_claims_by_shipping_mark(request, shipping_mark):
    """
    Get claims by shipping mark (for admin use)
    """
    # Support multi-role users via has_role helper when available
    if not ((hasattr(request.user, 'has_role') and (request.user.has_role('ADMIN') or request.user.has_role('MANAGER') or request.user.has_role('STAFF'))) or getattr(request.user, 'user_role', None) in ['ADMIN', 'MANAGER', 'STAFF']):
        return Response(
            {'error': 'Permission denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    claims = Claim.objects.filter(shipping_mark=shipping_mark).select_related('customer')
    serializer = AdminClaimSerializer(claims, many=True)
    return Response(serializer.data)

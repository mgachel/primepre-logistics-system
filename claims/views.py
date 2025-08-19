from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Claim
from .serializers import (
    ClaimSerializer, 
    ClaimCreateSerializer, 
    AdminClaimSerializer,
    ClaimStatusUpdateSerializer
)
from users.permissions import IsCustomer, IsAdminUser


class CustomerClaimListCreateView(generics.ListCreateAPIView):
    """
    Customer view to list their own claims and create new ones
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Customers can only see their own claims
        queryset = Claim.objects.filter(customer=self.request.user)
        print(f"Getting claims for user: {self.request.user}")
        print(f"User role: {getattr(self.request.user, 'user_role', 'No role')}")
        print(f"Claims found: {queryset.count()}")
        for claim in queryset:
            print(f"  - Claim {claim.id}: {claim.tracking_id} - {claim.status}")
        return queryset
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ClaimCreateSerializer
        return ClaimSerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to add debugging"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        print(f"Serialized data: {serializer.data}")
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        # Automatically link the claim to the authenticated customer
        print(f"Creating claim for user: {self.request.user}")
        print(f"User role: {getattr(self.request.user, 'user_role', 'No role')}")
        claim = serializer.save(customer=self.request.user)
        print(f"Created claim: {claim.id} for customer: {claim.customer}")
        return claim


class CustomerClaimDetailView(generics.RetrieveAPIView):
    """
    Customer view to see details of their own claim
    """
    serializer_class = ClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Customers can only see their own claims
        return Claim.objects.filter(customer=self.request.user)


class AdminClaimListView(generics.ListAPIView):
    """
    Admin view to see all claims from all customers
    """
    serializer_class = AdminClaimSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = Claim.objects.select_related('customer').all()
        print(f"Admin claims - Total claims in DB: {queryset.count()}")
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            print(f"Admin claims - After status filter '{status_filter}': {queryset.count()}")
        
        # Filter by shipping mark if provided
        shipping_mark = self.request.query_params.get('shipping_mark', None)
        if shipping_mark:
            queryset = queryset.filter(shipping_mark__icontains=shipping_mark)
            print(f"Admin claims - After shipping_mark filter '{shipping_mark}': {queryset.count()}")
        
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
            print(f"Admin claims - After search filter '{search}': {queryset.count()}")
        
        print(f"Admin claims - Final queryset count: {queryset.count()}")
        for claim in queryset[:5]:  # Show first 5 claims
            print(f"  - Claim {claim.id}: {claim.tracking_id} by {claim.customer}")
        
        return queryset


class AdminClaimDetailView(generics.RetrieveUpdateAPIView):
    """
    Admin view to see and update any claim
    """
    queryset = Claim.objects.select_related('customer').all()
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
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
    if not request.user.user_role in ['ADMIN', 'MANAGER', 'STAFF']:
        return Response(
            {'error': 'Permission denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    claims = Claim.objects.filter(shipping_mark=shipping_mark).select_related('customer')
    serializer = AdminClaimSerializer(claims, many=True)
    return Response(serializer.data)

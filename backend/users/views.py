from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .serializers import (
    RegisterSerializer, UserSerializer, PasswordResetSerializer,
    AdminUserCreateSerializer, AdminUserUpdateSerializer, 
    UserStatsSerializer, PasswordChangeSerializer
)
from .models import CustomerUser
from .permissions import IsAdminUser, IsSuperAdminUser, CanManageUsers
import logging

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            logger.info(f"User registered: {user.phone}")
            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = request.data.get('phone')
        password = request.data.get('password')
        
        if not phone or not password:
            return Response(
                {'detail': 'Phone and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request, phone=phone, password=password)
        if user is not None:
            if not user.is_active:
                return Response(
                    {'detail': 'Account is disabled'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Update last login IP
            user.last_login_ip = self.get_client_ip(request)
            user.save(update_fields=['last_login_ip'])
            
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
            
            # Add admin info if user is admin
            if user.is_admin_user:
                response_data['admin_info'] = {
                    'can_access_admin_panel': user.can_access_admin_panel,
                    'permissions': user.get_permissions_summary(),
                    'accessible_warehouses': user.accessible_warehouses
                }
            
            logger.info(f"User logged in: {user.phone}")
            return Response(response_data)
        
        logger.warning(f"Failed login attempt for phone: {phone}")
        return Response(
            {'detail': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users - admin only"""
    queryset = CustomerUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        """Filter users based on requesting user's permissions"""
        user = self.request.user
        queryset = CustomerUser.objects.all()
        
        # Super admins can see all users
        if user.is_super_admin:
            return queryset
        
        # Managers can see all non-super-admin users
        if user.user_role == 'MANAGER':
            return queryset.exclude(user_role='SUPER_ADMIN')
        
        # Admins can only see customers and staff
        if user.user_role == 'ADMIN':
            return queryset.filter(user_role__in=['CUSTOMER', 'STAFF'])
        
        # Other roles can only see their own profile
        return queryset.filter(id=user.id)
    
    def get_serializer_class(self):
        """Use different serializers based on action"""
        if self.action == 'create':
            return AdminUserCreateSerializer if self.request.user.is_admin_user else RegisterSerializer
        elif self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer if self.request.user.is_admin_user else UserSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get user statistics - admin only"""
        if not request.user.can_view_analytics:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Calculate date ranges
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        
        # Base queryset
        base_queryset = self.get_queryset()
        
        stats = {
            'total_users': base_queryset.count(),
            'active_users': base_queryset.filter(is_active=True).count(),
            'admin_users': base_queryset.filter(
                user_role__in=['ADMIN', 'MANAGER', 'SUPER_ADMIN']
            ).count(),
            'customer_users': base_queryset.filter(user_role='CUSTOMER').count(),
            'business_users': base_queryset.filter(user_type='BUSINESS').count(),
            'individual_users': base_queryset.filter(user_type='INDIVIDUAL').count(),
            'recent_registrations': base_queryset.filter(
                date_joined__gte=last_30_days
            ).count(),
        }
        
        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def admin_users(self, request):
        """Get all admin users - super admin only"""
        if not request.user.can_manage_admins:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        admin_users = self.get_queryset().filter(
            user_role__in=['ADMIN', 'MANAGER', 'SUPER_ADMIN']
        ).order_by('-date_joined')
        
        serializer = self.get_serializer(admin_users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle user active status - admin only"""
        if not request.user.can_create_users:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        
        # Prevent users from deactivating themselves
        if user == request.user:
            return Response(
                {'detail': 'Cannot deactivate your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent lower-level admins from affecting higher-level ones
        if (user.user_role == 'SUPER_ADMIN' and 
            request.user.user_role != 'SUPER_ADMIN'):
            return Response(
                {'detail': 'Cannot modify Super Admin accounts'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        
        logger.info(f"User {user.phone} {'activated' if user.is_active else 'deactivated'} by {request.user.phone}")
        
        return Response({
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'user': UserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password - admin only"""
        if not request.user.can_create_users:
            return Response(
                {'detail': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response(
                {'detail': 'new_password is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password
        try:
            from django.contrib.auth.password_validation import validate_password
            validate_password(new_password)
        except Exception as e:
            return Response(
                {'detail': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        logger.info(f"Password reset for user {user.phone} by admin {request.user.phone}")
        
        return Response({'message': 'Password reset successfully'})


class PasswordChangeView(APIView):
    """Allow users to change their own password"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            logger.info(f"Password changed for user {user.phone}")
            
            return Response({'message': 'Password changed successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone']
            new_password = serializer.validated_data['new_password']
            
            try:
                user = CustomerUser.objects.get(phone=phone)
                user.set_password(new_password)
                user.save()
                
                logger.info(f"Password reset for user {phone}")
                return Response({'message': 'Password reset successfully'})
            except CustomerUser.DoesNotExist:
                return Response(
                    {'detail': 'User not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """User profile management"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        """Update current user profile"""
        serializer = UserSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # Prevent users from changing their own role/permissions
            restricted_fields = [
                'user_role', 'is_active', 'is_staff', 'is_superuser',
                'can_create_users', 'can_manage_inventory', 'can_view_analytics',
                'can_manage_admins', 'can_access_admin_panel', 'accessible_warehouses'
            ]
            
            for field in restricted_fields:
                if field in serializer.validated_data:
                    del serializer.validated_data[field]
            
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data['phone']
            try:
                user = CustomerUser.objects.get(phone=phone)
                user.set_password(serializer.validated_data['new_password'])
                user.save()
                return Response({"detail": "Password reset successful"})
            except CustomerUser.DoesNotExist:
                return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
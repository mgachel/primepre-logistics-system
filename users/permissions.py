from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Permission class to check if user is an admin (ADMIN, MANAGER, or SUPER_ADMIN)
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'is_admin_user', False) or getattr(request.user, 'is_staff', False))
        )


class IsCustomer(BasePermission):
    """
    Permission class to check if user is a customer
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'has_role', lambda r: False)('CUSTOMER') if hasattr(request.user, 'has_role') else getattr(request.user, 'user_role', None) == 'CUSTOMER')
        )


class IsSuperAdminUser(BasePermission):
    """
    Permission class to check if user is a Super Admin
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (getattr(request.user, 'is_super_admin', False) or (hasattr(request.user, 'has_role') and request.user.has_role('SUPER_ADMIN')))
        )


class IsManagerOrSuperAdmin(BasePermission):
    """
    Permission class to check if user is Manager or Super Admin
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            ( (hasattr(request.user, 'has_role') and (request.user.has_role('MANAGER') or request.user.has_role('SUPER_ADMIN'))) or getattr(request.user, 'user_role', None) in ['MANAGER', 'SUPER_ADMIN'] )
        )


class CanManageUsers(BasePermission):
    """
    Permission class to check if user can manage other users
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_create_users
        )


class CanManageInventory(BasePermission):
    """
    Permission class to check if user can manage inventory
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_manage_inventory
        )


class CanViewAnalytics(BasePermission):
    """
    Permission class to check if user can view analytics
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_view_analytics
        )


class CanAccessAdminPanel(BasePermission):
    """
    Permission class to check if user can access admin panel
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_access_admin_panel
        )


class CanAccessWarehouse(BasePermission):
    """
    Permission class to check if user can access specific warehouse
    Requires 'warehouse' parameter in view kwargs or request data
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Get warehouse from URL kwargs or request data
        warehouse = view.kwargs.get('warehouse') or request.data.get('warehouse')
        
        if not warehouse:
            return True  # No warehouse specified, allow access
        
        return request.user.can_access_warehouse(warehouse)


class IsManagerOrAbove(BasePermission):
    """
    Permission class to check if user is Manager or above (MANAGER or SUPER_ADMIN)
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            ( (hasattr(request.user, 'has_role') and (request.user.has_role('MANAGER') or request.user.has_role('SUPER_ADMIN'))) or getattr(request.user, 'user_role', None) in ['MANAGER', 'SUPER_ADMIN'] )
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Permission class to check if user is owner of object or admin
    """
    def has_object_permission(self, request, view, obj):
        # Super admins can access anything
        if getattr(request.user, 'is_super_admin', False) or (hasattr(request.user, 'has_role') and request.user.has_role('SUPER_ADMIN')):
            return True
        
        # Check if object has a user field and user owns it
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Check if object is the user themselves
        if obj == request.user:
            return True
        
        # Check if user is admin and has appropriate permissions
        if getattr(request.user, 'is_admin_user', False) or getattr(request.user, 'is_staff', False):
            # Managers can modify most things
            if (hasattr(request.user, 'has_role') and request.user.has_role('MANAGER')) or getattr(request.user, 'user_role', None) == 'MANAGER':
                return True
            
            # Admins can modify customer objects
            if ((hasattr(request.user, 'has_role') and request.user.has_role('ADMIN')) or getattr(request.user, 'user_role', None) == 'ADMIN') and \
                hasattr(obj, 'user_role') and obj.user_role == 'CUSTOMER':
                return True
        
        return False

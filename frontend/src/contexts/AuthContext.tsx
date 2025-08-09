import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, User } from '@/services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (phone: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  // Role-based helper functions
  isAdmin: () => boolean;
  isCustomer: () => boolean;
  isStaff: () => boolean;
  isManager: () => boolean;
  isSuperAdmin: () => boolean;
  hasPermission: (permission: string) => boolean;
  canAccessWarehouse: (warehouse: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup automatic token refresh
  const setupTokenRefresh = useCallback(() => {
    const refreshInterval = setInterval(async () => {
      try {
        if (authService.getRefreshToken()) {
          await authService.refreshToken();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        logout();
      }
    }, 10 * 60 * 1000); // Refresh every 10 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setIsAuthenticated(true);
            setUser(storedUser);
            
            // Verify token is still valid by getting current user
            try {
              const response = await authService.getCurrentUser();
              if (response.success) {
                setUser(response.data);
                localStorage.setItem('user', JSON.stringify(response.data));
              } else {
                // Token invalid, clear auth
                authService.logout();
                setIsAuthenticated(false);
                setUser(null);
              }
            } catch (error) {
              console.error('Auth verification failed:', error);
              authService.logout();
              setIsAuthenticated(false);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Setup token refresh interval
    const cleanup = setupTokenRefresh();
    return cleanup;
  }, [setupTokenRefresh]);

  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ phone, password });
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Role-based helper functions using backend user_role format
  const isAdmin = (): boolean => {
    return user?.user_role === 'ADMIN';
  };

  const isCustomer = (): boolean => {
    return user?.user_role === 'CUSTOMER';
  };

  const isStaff = (): boolean => {
    return user?.user_role === 'STAFF';
  };

  const isManager = (): boolean => {
    return user?.user_role === 'MANAGER';
  };

  const isSuperAdmin = (): boolean => {
    return user?.user_role === 'SUPER_ADMIN';
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.user_role === 'SUPER_ADMIN') return true;
    
    // Check specific backend permissions
    switch (permission) {
      case 'create_users':
        return user.can_create_users || false;
      case 'manage_inventory':
        return user.can_manage_inventory || false;
      case 'view_analytics':
        return user.can_view_analytics || false;
      case 'manage_admins':
        return user.can_manage_admins || false;
      case 'admin_panel':
        return user.can_access_admin_panel || false;
      
      // Page-level permissions based on role
      case 'dashboard':
        return ['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'].includes(user.user_role);
      case 'clients':
        return ['ADMIN', 'MANAGER', 'STAFF'].includes(user.user_role);
      case 'cargo':
        return ['ADMIN', 'MANAGER', 'STAFF'].includes(user.user_role);
      case 'warehouse':
        return ['ADMIN', 'MANAGER', 'STAFF'].includes(user.user_role);
      case 'claims':
        return ['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'].includes(user.user_role);
      case 'rates':
        return ['ADMIN', 'MANAGER'].includes(user.user_role);
      case 'settings':
        return ['ADMIN', 'SUPER_ADMIN'].includes(user.user_role);
      case 'profile':
        return true; // All authenticated users can access profile
      case 'notifications':
        return true; // All authenticated users can access notifications
      
      // Customer-specific permissions
      case 'my_shipments':
        return user.user_role === 'CUSTOMER';
      case 'my_claims':
        return user.user_role === 'CUSTOMER';
      
      default:
        return false;
    }
  };

  const canAccessWarehouse = (warehouse: string): boolean => {
    if (!user) return false;
    
    // Super admin can access all warehouses
    if (user.user_role === 'SUPER_ADMIN') return true;
    
    // Check user's accessible warehouses
    return user.accessible_warehouses.includes(warehouse.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout, 
      loading,
      isAdmin,
      isCustomer,
      isStaff,
      isManager,
      isSuperAdmin,
      hasPermission,
      canAccessWarehouse
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User } from '@/services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
  // Role-based helper functions
  isAdmin: () => boolean;
  isCustomer: () => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setIsAuthenticated(true);
            setUser(storedUser);
          } else {
            // Try to get current user from API
            const response = await authService.getCurrentUser();
            if (response.success) {
              setIsAuthenticated(true);
              setUser(response.data);
            } else {
              // Clear invalid auth
              authService.logout();
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
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ username, password });
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

  // Role-based helper functions
  const isAdmin = (): boolean => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  };

  const isCustomer = (): boolean => {
    return user?.role === 'customer';
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.role === 'super_admin') return true;
    
    // Admin has most permissions except super admin specific ones
    if (user.role === 'admin') {
      const adminPermissions = [
        'dashboard', 'clients', 'seaCargo', 'airCargo', 'chinaWarehouse', 
        'ghanaWarehouse', 'claims', 'rates', 'settings'
      ];
      return adminPermissions.includes(permission);
    }
    
    // Customer has limited permissions
    if (user.role === 'customer') {
      const customerPermissions = [
        'dashboard', 'myShipments', 'myClaims', 'profile', 'notifications'
      ];
      return customerPermissions.includes(permission);
    }
    
    return false;
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
      hasPermission
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
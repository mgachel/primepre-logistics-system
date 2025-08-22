import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService, User } from "@/services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (phone: string, password: string) => Promise<boolean>;
  register: (data: {
    first_name: string;
    last_name: string;
    company_name?: string;
    email?: string;
    phone: string;
    region: string;
    user_type: "INDIVIDUAL" | "BUSINESS";
    password: string;
    confirm_password: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  loading: boolean;
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
        console.error("Token refresh failed:", error);
        logout();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setIsAuthenticated(true);
            setUser(storedUser);

            try {
              const response = await authService.getCurrentUser();
              if (response.success) {
                setUser(response.data);
                localStorage.setItem("user", JSON.stringify(response.data));
              } else {
                authService.logout();
                setIsAuthenticated(false);
                setUser(null);
              }
            } catch (error) {
              console.error("Auth verification failed:", error);
              authService.logout();
              setIsAuthenticated(false);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
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
      console.error("Login failed:", error);
      return false;
    }
  };

  const register = async (data: any): Promise<boolean> => {
    try {
      const response = await authService.register(data);
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  // Role helpers
  const isAdmin = () => user?.user_role === "ADMIN";
  const isCustomer = () => user?.user_role === "CUSTOMER";
  const isStaff = () => user?.user_role === "STAFF";
  const isManager = () => user?.user_role === "MANAGER";
  const isSuperAdmin = () => user?.user_role === "SUPER_ADMIN";

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.user_role === "SUPER_ADMIN") return true;
    // your role/permission checks here
    return false;
  };

  const canAccessWarehouse = (warehouse: string) => {
    if (!user) return false;
    if (user.user_role === "SUPER_ADMIN") return true;
    return user.accessible_warehouses?.includes(warehouse.toLowerCase()) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        login,
        register,
        logout,
        updateUser,
        loading,
        isAdmin,
        isCustomer,
        isStaff,
        isManager,
        isSuperAdmin,
        hasPermission,
        canAccessWarehouse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ✅ hook outside, not inside AuthProvider
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

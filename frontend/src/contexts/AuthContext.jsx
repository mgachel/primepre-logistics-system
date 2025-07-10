import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    // Clear automatic refresh interval
    if (window.authRefreshInterval) {
      clearInterval(window.authRefreshInterval);
      delete window.authRefreshInterval;
    }
    
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    
    // Redirect to login page
    window.location.href = '/login';
  }, []);

  const setupTokenRefresh = useCallback(() => {
    // Set up interval to refresh token periodically (every 10 minutes)
    const refreshInterval = setInterval(async () => {
      try {
        if (authService.getRefreshToken()) {
          await authService.refreshToken();
          console.log('Token refreshed automatically');
        }
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        logout();
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Store interval ID to clear it later
    window.authRefreshInterval = refreshInterval;
  }, [logout]);

  useEffect(() => {
    // Check if user is already logged in on app start
    const currentUser = authService.getCurrentUser();
    const token = authService.getToken();
    
    if (currentUser && token) {
      setUser(currentUser);
      setIsAuthenticated(true);
      
      // Set up automatic token refresh
      setupTokenRefresh();
    }
    
    setLoading(false);
  }, [setupTokenRefresh]);

  const login = async (phone, password) => {
    try {
      const response = await authService.login(phone, password);
      setUser(response.user);
      setIsAuthenticated(true);
      
      // Set up automatic token refresh
      setupTokenRefresh();
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    refreshToken: authService.refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

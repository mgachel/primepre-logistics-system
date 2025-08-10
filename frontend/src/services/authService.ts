import { apiClient, ApiResponse } from './api';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone: string;
  region: string;
  shipping_mark: string;
  user_role: 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'MANAGER' | 'SUPER_ADMIN';
  user_type: 'INDIVIDUAL' | 'BUSINESS';
  is_active: boolean;
  is_admin_user: boolean;
  date_joined: string;
  accessible_warehouses: string[];
  permissions_summary: string[];
  // Admin permissions
  can_create_users?: boolean;
  can_manage_inventory?: boolean;
  can_view_analytics?: boolean;
  can_manage_admins?: boolean;
  can_access_admin_panel?: boolean;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access: string;
  refresh: string;
  admin_info?: {
    can_access_admin_panel: boolean;
    permissions: string[];
    accessible_warehouses: string[];
  };
}

export interface RegisterCredentials {
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phone: string;
  region: string;
  user_type: 'INDIVIDUAL' | 'BUSINESS';
  password: string;
  confirm_password: string;
}

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/auth/login/', credentials);
      
      if (response.success && response.data.access) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store admin info if available
        if (response.data.admin_info) {
          localStorage.setItem('admin_info', JSON.stringify(response.data.admin_info));
        }
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        data: {} as LoginResponse,
        message: 'Login failed. Please check your credentials.',
      };
    }
  },

  // Register user
  async register(credentials: RegisterCredentials): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/auth/register/', credentials);
      
      if (response.success && response.data.access) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        data: {} as LoginResponse,
        message: 'Registration failed. Please try again.',
      };
    }
  },

  // Logout user
  async logout(): Promise<ApiResponse<void>> {
    try {
      // Optional: Call logout endpoint if backend supports it
      // await apiClient.post<void>('/api/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin_info');
    }
    
    return { success: true, data: undefined };
  },

  // Get current user profile
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      return await apiClient.get<User>('/api/auth/profile/');
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        data: {} as User,
        message: 'Failed to get user profile',
      };
    }
  },

  // Refresh access token
  async refreshToken(): Promise<ApiResponse<{ access: string }>> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<{ access: string }>('/api/auth/token/refresh/', {
        refresh: refreshToken
      });
      
      if (response.success && response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      
      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens if refresh fails
      this.logout();
      return {
        success: false,
        data: {} as { access: string },
        message: 'Session expired. Please login again.',
      };
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    return !!(accessToken && refreshToken);
  },

  // Get stored user data
  getStoredUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Get stored admin info
  getStoredAdminInfo(): LoginResponse['admin_info'] | null {
    const adminInfo = localStorage.getItem('admin_info');
    return adminInfo ? JSON.parse(adminInfo) : null;
  },

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  },

  // Get refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.put<User>('/api/auth/profile/', userData);
      
      if (response.success) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      
      return response;
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        data: {} as User,
        message: 'Failed to update profile',
      };
    }
  },

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    try {
      return await apiClient.post<void>('/api/auth/password-change/', {
        old_password: oldPassword,
        new_password: newPassword,
      });
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        data: undefined,
        message: 'Failed to change password',
      };
    }
  },

  // Request password reset by email
  async requestPasswordReset(email: string): Promise<ApiResponse<{ detail?: string }>> {
    try {
      return await apiClient.post<{ detail?: string }>('/api/auth/password-reset/request/', { email });
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        data: {} as { detail?: string },
        message: 'Failed to request password reset',
      };
    }
  },

  // Verify password reset code
  async verifyPasswordResetCode(email: string, code: string): Promise<ApiResponse<{ detail?: string }>> {
    try {
      return await apiClient.post<{ detail?: string }>('/api/auth/password-reset/verify/', { email, code });
    } catch (error) {
      console.error('Password reset verify error:', error);
      return {
        success: false,
        data: {} as { detail?: string },
        message: 'Failed to verify code',
      };
    }
  },

  // Confirm password reset with new password
  async confirmPasswordReset(params: { email: string; code: string; new_password: string; confirm_password: string; }): Promise<ApiResponse<{ detail?: string }>> {
    try {
      return await apiClient.post<{ detail?: string }>(
        '/api/auth/password-reset/confirm/',
        params
      );
    } catch (error) {
      console.error('Password reset confirm error:', error);
      return {
        success: false,
        data: {} as { detail?: string },
        message: 'Failed to reset password',
      };
    }
  },
}; 
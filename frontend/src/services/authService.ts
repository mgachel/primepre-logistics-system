import { apiClient, ApiResponse } from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  name: string;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

// Mock users for development
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'password',
    email: 'admin@primepre.com',
    role: 'super_admin',
    name: 'Super Admin',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    username: 'manager',
    password: 'password',
    email: 'manager@primepre.com',
    role: 'admin',
    name: 'Admin Manager',
    createdAt: '2024-01-01',
  },
  {
    id: '3',
    username: 'customer',
    password: 'password',
    email: 'customer@example.com',
    role: 'customer',
    name: 'John Customer',
    createdAt: '2024-01-01',
  },
];

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    // Mock login for development
    const mockUser = mockUsers.find(
      user => user.username === credentials.username && user.password === credentials.password
    );

    if (mockUser) {
      const { password, ...userWithoutPassword } = mockUser;
      const mockResponse: LoginResponse = {
        user: userWithoutPassword,
        token: `mock_token_${mockUser.id}`,
      };

      localStorage.setItem('auth_token', mockResponse.token);
      localStorage.setItem('user', JSON.stringify(mockResponse.user));

      return {
        success: true,
        data: mockResponse,
        message: 'Login successful',
      };
    }

    // Fallback to API call if mock login fails
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      
      if (response.success && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        data: {} as LoginResponse,
        message: 'Invalid credentials',
      };
    }
  },

  // Logout user
  async logout(): Promise<ApiResponse<void>> {
    try {
      await apiClient.post<void>('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
    
    return { success: true, data: undefined };
  },

  // Get current user
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me');
  },

  // Refresh token
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await apiClient.post<{ token: string }>('/auth/refresh');
    
    if (response.success && response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  // Get stored user data
  getStoredUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
}; 
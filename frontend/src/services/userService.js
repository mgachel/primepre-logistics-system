// User service for handling API calls related to user management

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('accessToken');
  return token ? `Bearer ${token}` : null;
};

// Helper function for API requests with authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders.Authorization = token;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
    console.error('API Error:', response.status, errorData);
    throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData) || 'API request failed');
  }

  // Handle empty responses (like 204 No Content for DELETE operations)
  const contentType = response.headers.get('content-type');
  if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
    return {}; // Return empty object for successful operations with no content
  }

  return response.json();
};

export const userService = {
  // Get all users/clients
  getUsers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = queryParams ? `/api/auth/admin/users/?${queryParams}` : '/api/auth/admin/users/';
    return apiRequest(endpoint);
  },

  // Get single user by ID
  getUser: async (userId) => {
    return apiRequest(`/api/auth/admin/users/${userId}/`);
  },

  // Update user
  updateUser: async (userId, userData) => {
    return apiRequest(`/api/auth/admin/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  },

  // Block/Unblock user
  toggleUserStatus: async (userId, isActive) => {
    return apiRequest(`/api/auth/admin/users/${userId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  // Delete user
  deleteUser: async (userId) => {
    await apiRequest(`/api/auth/admin/users/${userId}/`, {
      method: 'DELETE',
    });
    return { success: true };
  },

  // Get user statistics
  getUserStatistics: async () => {
    return apiRequest('/api/auth/admin/users/statistics/');
  },

  // Search users
  searchUsers: async (searchTerm, filters = {}) => {
    const params = new URLSearchParams({
      search: searchTerm,
      ...filters,
    });
    return apiRequest(`/api/auth/admin/users/?${params.toString()}`);
  },

  // Get customers only (users with role 'CUSTOMER')
  getCustomers: async (params = {}) => {
    const queryParams = new URLSearchParams({
      user_role: 'CUSTOMER',
      ...params,
    });
    return apiRequest(`/api/auth/admin/users/?${queryParams.toString()}`);
  },

  // Create new user/client
  createUser: async (userData) => {
    return apiRequest('/api/auth/admin/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

export default userService;

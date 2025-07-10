// Authentication service for handling API calls to the backend

const API_URL = 'http://localhost:8000'; // Change this to your Django server URL

export const authService = {
  // Register a new user
  register: async (userData) => {
    // Rename confirmPassword to confirm_password to match backend expectation
    const apiData = {
      ...userData,
      confirm_password: userData.confirmPassword
    };
    delete apiData.confirmPassword;

    try {
      const response = await fetch(`${API_URL}/api/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.phone || errorData.email || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login user
  login: async (phone, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store the tokens in localStorage
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },
  
  // Get auth token
  getToken: () => {
    return localStorage.getItem('accessToken');
  },

  // Get refresh token
  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  // Refresh access token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        // If refresh fails, clear tokens and redirect to login
        authService.logout();
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Update tokens in localStorage
      localStorage.setItem('accessToken', data.access);
      if (data.refresh) {
        // If a new refresh token is provided (token rotation enabled)
        localStorage.setItem('refreshToken', data.refresh);
      }
      
      return data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      authService.logout();
      throw error;
    }
  },

  // Make authenticated API request with automatic token refresh
  authenticatedFetch: async (url, options = {}) => {
    const makeRequest = async (token) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetch(url, {
        ...options,
        headers,
      });
    };

    let token = authService.getToken();
    let response = await makeRequest(token);

    // If we get a 401, try to refresh the token
    if (response.status === 401 && authService.getRefreshToken()) {
      try {
        token = await authService.refreshToken();
        response = await makeRequest(token);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Auto-refresh failed:', refreshError);
        window.location.href = '/login';
        throw refreshError;
      }
    }

    return response;
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.email || 'Password reset request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  },

  // Verify password reset code
  verifyResetCode: async (email, code) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.code || 'Code verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Code verification error:', error);
      throw error;
    }
  },

  // Confirm password reset with new password
  confirmPasswordReset: async (email, code, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          code, 
          new_password: newPassword,
          confirm_password: newPassword // Adding confirm_password field required by backend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.new_password || 'Password reset failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      throw error;
    }
  }
};

export default authService;

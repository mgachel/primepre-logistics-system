// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Common API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // Only set Content-Type to application/json if body is not FormData
    if (!(config.body instanceof FormData) && !config.headers?.['Content-Type']) {
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
      };
    }

    // helper to safely parse response body
  const parseResponse = async (resp: Response): Promise<unknown> => {
      if (resp.status === 204 || resp.status === 205) return null;
      const contentType = resp.headers.get('content-type') || '';
      // Read text first to gracefully handle empty bodies
      const text = await resp.text();
      if (!text) return null;
      if (contentType.includes('application/json')) {
        try { return JSON.parse(text); } catch { return null; }
      }
      return text;
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 (unauthorized) responses - try to refresh token
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            // Try to refresh the access token
            const refreshResponse = await fetch(`${this.baseURL}/api/auth/token/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh: refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('access_token', refreshData.access);
              
              // Retry the original request with new token
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${refreshData.access}`,
              };
              
              const retryResponse = await fetch(url, config);
              if (retryResponse.ok) {
                const retryData = await parseResponse(retryResponse);
                return {
                  data: retryData as T,
                  success: true,
                  message: 'Success'
                };
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            // Clear tokens and redirect to login
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('admin_info');
            window.location.href = '/login';
          }
        }
        return {
          data: {} as T,
          success: false,
          message: 'Authentication failed'
        };
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
  const data = await parseResponse(response);
      
      // Django REST Framework returns data directly, wrap it in our ApiResponse format
      return {
        data: (data as T),
        success: true,
        message: 'Success'
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        data: {} as T,
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    const options: RequestInit = {
      method: 'POST',
    };

    if (data instanceof FormData) {
      options.body = data;
    } else if (data) {
      options.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, options);
  }

  // PUT request
  async put<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  async patch<T, D = unknown>(endpoint: string, data?: D): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL); 
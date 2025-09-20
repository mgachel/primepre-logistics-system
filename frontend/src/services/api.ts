// =============================
// API Base Configuration
// =============================
import { config } from '@/lib/config';

const API_BASE_URL = config.apiBaseUrl;

// =============================
// Auth Types
// =============================
export interface User {
  id: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  nickname?: string;
  phone?: string;
  company_name?: string;
  shipping_mark?: string;
  region?: string;
  user_role?: string;
  user_type?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_admin_user?: boolean;
  date_joined?: string;
  accessible_warehouses?: string[];
  permissions_summary?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

// =============================
// Common API response types
// =============================
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =============================
// API Client
// =============================
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    // Ensure no trailing slash
    this.baseURL = baseURL.replace(/\/+$/, "");
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseURL}/${endpoint.replace(/^\/+/, "")}`;
  }

  private async parseResponse(resp: Response): Promise<unknown> {
    if (resp.status === 204 || resp.status === 205) return null;

    const contentType = resp.headers.get("content-type") || "";
    const text = await resp.text();

    if (!text) return null;

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    }

    return text;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);

    const config: RequestInit = {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    };

    // Attach access token if available
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // Ensure JSON content-type unless FormData
    if (!(config.body instanceof FormData)) {
      config.headers = {
        ...config.headers,
        "Content-Type": "application/json",
      };
    }

    try {
      let response = await fetch(url, config);

      // Handle 401 → attempt refresh
      if (response.status === 401) {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          try {
            const refreshUrl = this.buildUrl("/api/auth/token/refresh/");
            const refreshResponse = await fetch(refreshUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: refreshToken }),
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem("access_token", refreshData.access);

              // Retry original request
              config.headers = {
                ...config.headers,
                Authorization: `Bearer ${refreshData.access}`,
              };

              response = await fetch(url, config);
            } else {
              this.handleLogout();
            }
          } catch {
            this.handleLogout();
          }
        } else {
          this.handleLogout();
        }
      }

      // If still not OK, throw error
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = this.extractErrorMessage(errorData, response.status);
        throw new Error(message);
      }

      const data = (await this.parseResponse(response)) as T;

      return { data, success: true, message: "Success" };
    } catch (error) {
      console.error("API request failed:", error);
      return {
        data: {} as T,
        success: false,
        message: error instanceof Error ? error.message : "An error occurred",
      };
    }
  }

  private handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("admin_info");
    window.location.href = "/login";
  }

  private extractErrorMessage(errorData: unknown, status: number): string {
    if (errorData && typeof errorData === "object") {
      // Type guard for detail property
      if (
        "detail" in errorData &&
        typeof (errorData as { detail?: unknown }).detail === "string"
      ) {
        return (errorData as { detail: string }).detail;
      }

      const parts: string[] = [];
      for (const [key, val] of Object.entries(errorData as Record<string, unknown>)) {
        if (Array.isArray(val)) parts.push(`${key}: ${val.join(", ")}`);
        else if (typeof val === "string") parts.push(`${key}: ${val}`);
        else if (val && typeof val === "object")
          parts.push(`${key}: ${JSON.stringify(val)}`);
      }
      if (parts.length) return parts.join(" | ");
    }
    return `HTTP error! status: ${status}`;
  }

  // =============================
  // Public HTTP methods
  // =============================
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T, D = unknown>(
    endpoint: string,
    data?: D
  ): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: "POST" };
    if (data instanceof FormData) options.body = data;
    else if (data) options.body = JSON.stringify(data);
    return this.request<T>(endpoint, options);
  }

  async put<T, D = unknown>(
    endpoint: string,
    data?: D
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T, D = unknown>(
    endpoint: string,
    data?: D
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// =============================
// Export instance
// =============================
export const apiClient = new ApiClient(API_BASE_URL);

// =============================
// Authentication API Service
// =============================
class AuthApiService {
  private api = apiClient;

  // Token management
  setTokens(tokens: { access: string; refresh: string }): void {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }

  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Authentication endpoints
  async login(credentials: { phone: string; password: string }): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/api/auth/login/', credentials);
    if (response.success && response.data) {
      this.setTokens({
        access: response.data.tokens.access,
        refresh: response.data.tokens.refresh,
      });
    }
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await this.api.post('/api/auth/logout/', { refresh: refreshToken });
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearTokens();
    }
  }

  // Signup flow - new consolidated method
  async signup(data: {
    name: string;
    company_name?: string;
    shipping_mark: string;
    phone: string;
    region: string;
    password: string;
  }): Promise<{ message: string; user_id?: number }> {
    const response = await this.api.post<{ message: string; user_id?: number }>('/api/auth/signup/', data);
    return response.data;
  }

  // Phone verification
  async verifyPhone(data: { phone: string; pin: string }): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/api/auth/verify-phone/', data);
    if (response.success && response.data) {
      this.setTokens({
        access: response.data.tokens.access,
        refresh: response.data.tokens.refresh,
      });
    }
    return response.data;
  }

  async resendVerificationCode(phone: string): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/api/auth/resend-verification/', { phone });
    return response.data;
  }

  // Signup flow (old multi-step methods - kept for compatibility)
  async signupStep1(data: {
    first_name: string;
    last_name: string;
    company_name?: string;
    email: string;
  }): Promise<{ shipping_mark_suggestions: string[] }> {
    const response = await this.api.post<{ shipping_mark_suggestions: string[] }>('/api/auth/signup/step1/', data);
    return response.data;
  }

  async signupStep2(data: { shipping_mark: string }): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/api/auth/signup/step2/', data);
    return response.data;
  }

  async signupStep3(data: { phone: string; region: string }): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/api/auth/signup/step3/', data);
    return response.data;
  }

  async signupComplete(data: {
    password: string;
    confirm_password: string;
  }): Promise<{ message: string; user_id?: number }> {
    const response = await this.api.post<{ message: string; user_id?: number }>('/api/auth/signup/complete/', data);
    return response.data;
  }

  // Verification
  async verifyPin(data: { pin: string }): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/api/auth/verify/', data);
    if (response.success && response.data) {
      this.setTokens({
        access: response.data.tokens.access,
        refresh: response.data.tokens.refresh,
      });
    }
    return response.data;
  }

  async resendPin(): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/api/auth/resend-pin/');
    return response.data;
  }

  // Password reset
  async forgotPassword(data: { phone: string }): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/api/auth/forgot-password/', data);
    return response.data;
  }

  async resetPassword(data: {
    pin: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/api/auth/reset-password/', data);
    return response.data;
  }

  // Profile
  async getProfile(): Promise<User> {
    const response = await this.api.get<User>('/api/auth/profile/');
    return response.data;
  }
}

export const authService = new AuthApiService();

// Region options (matching backend)
export const REGION_OPTIONS = [
  // US States
  { value: 'US-AL', label: 'Alabama' },
  { value: 'US-AK', label: 'Alaska' },
  { value: 'US-AZ', label: 'Arizona' },
  { value: 'US-AR', label: 'Arkansas' },
  { value: 'US-CA', label: 'California' },
  { value: 'US-CO', label: 'Colorado' },
  { value: 'US-CT', label: 'Connecticut' },
  { value: 'US-DE', label: 'Delaware' },
  { value: 'US-FL', label: 'Florida' },
  { value: 'US-GA', label: 'Georgia' },
  { value: 'US-HI', label: 'Hawaii' },
  { value: 'US-ID', label: 'Idaho' },
  { value: 'US-IL', label: 'Illinois' },
  { value: 'US-IN', label: 'Indiana' },
  { value: 'US-IA', label: 'Iowa' },
  { value: 'US-KS', label: 'Kansas' },
  { value: 'US-KY', label: 'Kentucky' },
  { value: 'US-LA', label: 'Louisiana' },
  { value: 'US-ME', label: 'Maine' },
  { value: 'US-MD', label: 'Maryland' },
  { value: 'US-MA', label: 'Massachusetts' },
  { value: 'US-MI', label: 'Michigan' },
  { value: 'US-MN', label: 'Minnesota' },
  { value: 'US-MS', label: 'Mississippi' },
  { value: 'US-MO', label: 'Missouri' },
  { value: 'US-MT', label: 'Montana' },
  { value: 'US-NE', label: 'Nebraska' },
  { value: 'US-NV', label: 'Nevada' },
  { value: 'US-NH', label: 'New Hampshire' },
  { value: 'US-NJ', label: 'New Jersey' },
  { value: 'US-NM', label: 'New Mexico' },
  { value: 'US-NY', label: 'New York' },
  { value: 'US-NC', label: 'North Carolina' },
  { value: 'US-ND', label: 'North Dakota' },
  { value: 'US-OH', label: 'Ohio' },
  { value: 'US-OK', label: 'Oklahoma' },
  { value: 'US-OR', label: 'Oregon' },
  { value: 'US-PA', label: 'Pennsylvania' },
  { value: 'US-RI', label: 'Rhode Island' },
  { value: 'US-SC', label: 'South Carolina' },
  { value: 'US-SD', label: 'South Dakota' },
  { value: 'US-TN', label: 'Tennessee' },
  { value: 'US-TX', label: 'Texas' },
  { value: 'US-UT', label: 'Utah' },
  { value: 'US-VT', label: 'Vermont' },
  { value: 'US-VA', label: 'Virginia' },
  { value: 'US-WA', label: 'Washington' },
  { value: 'US-WV', label: 'West Virginia' },
  { value: 'US-WI', label: 'Wisconsin' },
  { value: 'US-WY', label: 'Wyoming' },
  // International regions
  { value: 'INTL-CANADA', label: 'Canada' },
  { value: 'INTL-MEXICO', label: 'Mexico' },
  { value: 'INTL-UK', label: 'United Kingdom' },
  { value: 'INTL-GERMANY', label: 'Germany' },
  { value: 'INTL-FRANCE', label: 'France' },
  { value: 'INTL-CHINA', label: 'China' },
  { value: 'INTL-JAPAN', label: 'Japan' },
  { value: 'INTL-SOUTH-KOREA', label: 'South Korea' },
  { value: 'INTL-AUSTRALIA', label: 'Australia' },
  { value: 'INTL-BRAZIL', label: 'Brazil' },
  { value: 'INTL-INDIA', label: 'India' },
  { value: 'INTL-OTHER', label: 'Other International' },
];

// Export customer services
export { customerShipmentsService } from './customerShipmentsService';
export { claimsService } from './claimsService';
export { notesService } from './notesService';
export { notificationsService } from './notificationsService';

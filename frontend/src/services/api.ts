// =============================
// API Base Configuration
// =============================
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

  private extractErrorMessage(errorData: any, status: number): string {
    if (errorData && typeof errorData === "object") {
      if (typeof errorData.detail === "string") return errorData.detail;

      const parts: string[] = [];
      for (const [key, val] of Object.entries(errorData)) {
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

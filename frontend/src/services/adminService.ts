import { apiClient, ApiResponse, PaginatedResponse } from "./api";
import { User } from "./authService";

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  company_name?: string;
  email?: string;
  phone: string;
  region: string;
  user_role: "STAFF" | "ADMIN" | "MANAGER" | "SUPER_ADMIN";
  user_type: "INDIVIDUAL" | "BUSINESS";
  is_active: boolean;
  is_admin_user: boolean;
  accessible_warehouses: string[];
  can_create_users: boolean;
  can_manage_inventory: boolean;
  can_view_analytics: boolean;
  can_manage_admins: boolean;
  can_access_admin_panel: boolean;
  created_by?: number;
  date_joined: string;
  last_login?: string;
  last_login_ip?: string;
}

export interface CreateAdminRequest {
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phone: string;
  region: string;
  user_role: "STAFF" | "ADMIN" | "MANAGER" | "SUPER_ADMIN";
  user_type: "INDIVIDUAL" | "BUSINESS";
  accessible_warehouses: string[];
  can_create_users: boolean;
  can_manage_inventory: boolean;
  can_view_analytics: boolean;
  can_manage_admins: boolean;
  password: string;
  confirm_password: string;
}

export interface UpdateAdminRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  region?: string;
  user_role?: "STAFF" | "ADMIN" | "MANAGER" | "SUPER_ADMIN";
  is_active?: boolean;
  accessible_warehouses?: string[];
  can_create_users?: boolean;
  can_manage_inventory?: boolean;
  can_view_analytics?: boolean;
  can_manage_admins?: boolean;
}

export interface AdminFilters {
  user_role?: string;
  is_active?: boolean;
  region?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  customer_users: number;
  business_users: number;
  individual_users: number;
  recent_registrations: number;
}

export const adminService = {
  // Get all admin users (requires appropriate permissions)
  async getAdminUsers(
    filters: AdminFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<AdminUser>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const endpoint = `/api/auth/admin/users/?user_role=ADMIN&${params.toString()}`;
    return apiClient.get<PaginatedResponse<AdminUser>>(endpoint);
  },

  // Get admin user by ID
  async getAdminUserById(id: number): Promise<ApiResponse<AdminUser>> {
    return apiClient.get<AdminUser>(`/api/auth/admin/users/${id}/`);
  },

  // Create new admin user (requires SUPER_ADMIN or MANAGER permissions)
  async createAdminUser(
    data: CreateAdminRequest
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.post<AdminUser>("/api/auth/admin/users/", data);
  },

  // Update admin user (requires appropriate permissions)
  async updateAdminUser(
    id: number,
    data: UpdateAdminRequest
  ): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/api/auth/admin/users/${id}/`, data);
  },

  // Delete admin user (requires SUPER_ADMIN permissions)
  async deleteAdminUser(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/auth/admin/users/${id}/`);
  },

  // Get user statistics (admin only)
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return apiClient.get<UserStats>("/api/auth/admin/users/statistics/");
  },

  // Get current user profile
  async getCurrentUserProfile(): Promise<ApiResponse<User>> {
    return apiClient.get<User>("/api/auth/profile/");
  },

  // Update current user profile
  async updateCurrentUserProfile(
    data: Partial<User>
  ): Promise<ApiResponse<User>> {
    return apiClient.put<User>("/api/auth/profile/", data);
  },

  // Change password
  async changePassword(data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(
      "/api/auth/password-change/",
      data
    );
  },

  // Get all users (super admin only)
  async getAllUsers(
    filters: AdminFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const endpoint = `/api/auth/admin/users/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<User>>(endpoint);
  },

  // Get users by role
  async getUsersByRole(role: string): Promise<ApiResponse<User[]>> {
    return this.getAllUsers({ user_role: role }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },

  // Get active users
  async getActiveUsers(): Promise<ApiResponse<User[]>> {
    return this.getAllUsers({ is_active: true }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },

  // Toggle user active status using the proper backend endpoint
  async toggleUserStatus(
    id: number
  ): Promise<ApiResponse<{ message: string; user: User }>> {
    return apiClient.post(`/api/auth/admin/users/${id}/toggle_active/`);
  },

  // Send message/email to user
  async sendMessageToUser(
    id: number,
    data: { subject: string; message: string }
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/api/auth/admin/users/${id}/send_message/`, data);
  },

  // Reset user password (admin action)
  async resetUserPassword(
    id: number,
    data: { new_password: string }
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/api/auth/admin/users/${id}/reset_password/`, data);
  },

  // Update client/user status (for regular users, not admin users)
  async updateClientStatus(
    id: number,
    isActive: boolean
  ): Promise<ApiResponse<User>> {
    return apiClient.patch(`/api/auth/admin/users/${id}/`, {
      is_active: isActive,
    });
  },

  // Update client/user profile (for regular users)
  async updateClient(
    id: number,
    data: Partial<User>
  ): Promise<ApiResponse<User>> {
    return apiClient.patch(`/api/auth/admin/users/${id}/`, data);
  },
};

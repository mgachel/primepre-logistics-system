import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  verification: 'verified' | 'not-verified';
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminRequest {
  name: string;
  email: string;
  phone: string;
  role: string;
  password: string;
}

export interface UpdateAdminRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: 'active' | 'inactive';
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface AdminFilters {
  role?: string;
  status?: string;
  verification?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const adminService = {
  // Get all admin users
  async getAdmins(filters: AdminFilters = {}): Promise<ApiResponse<PaginatedResponse<AdminUser>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/admin/users?${params.toString()}`;
    return apiClient.get<PaginatedResponse<AdminUser>>(endpoint);
  },

  // Get admin by ID
  async getAdminById(id: string): Promise<ApiResponse<AdminUser>> {
    return apiClient.get<AdminUser>(`/admin/users/${id}`);
  },

  // Create new admin
  async createAdmin(data: CreateAdminRequest): Promise<ApiResponse<AdminUser>> {
    return apiClient.post<AdminUser>('/admin/users', data);
  },

  // Update admin
  async updateAdmin(id: string, data: UpdateAdminRequest): Promise<ApiResponse<AdminUser>> {
    return apiClient.put<AdminUser>(`/admin/users/${id}`, data);
  },

  // Delete admin
  async deleteAdmin(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/users/${id}`);
  },

  // Get all roles
  async getRoles(): Promise<ApiResponse<Role[]>> {
    return apiClient.get<Role[]>('/admin/roles');
  },

  // Get role by ID
  async getRoleById(id: string): Promise<ApiResponse<Role>> {
    return apiClient.get<Role>(`/admin/roles/${id}`);
  },

  // Create new role
  async createRole(data: CreateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.post<Role>('/admin/roles', data);
  },

  // Update role
  async updateRole(id: string, data: UpdateRoleRequest): Promise<ApiResponse<Role>> {
    return apiClient.put<Role>(`/admin/roles/${id}`, data);
  },

  // Delete role
  async deleteRole(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/admin/roles/${id}`);
  },

  // Get admin statistics
  async getAdminStats(): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    verified: number;
    unverified: number;
    roles: number;
  }>> {
    return apiClient.get('/admin/stats');
  },
}; 
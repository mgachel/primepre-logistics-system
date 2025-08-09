import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { User } from './authService';

export interface Client {
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
  date_joined: string;
  total_shipments?: number;
  active_shipments?: number;
  total_value?: number;
  last_activity?: string;
}

export interface CreateClientRequest {
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

export interface UpdateClientRequest {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  region?: string;
  user_type?: 'INDIVIDUAL' | 'BUSINESS';
  is_active?: boolean;
}

export interface ClientFilters {
  user_role?: string;
  user_type?: string;
  is_active?: boolean;
  region?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ClientStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  customer_users: number;
  business_users: number;
  individual_users: number;
  recent_registrations: number;
}

export const clientService = {
  // Get all clients/customers (admin/staff only)
  async getClients(filters: ClientFilters = {}): Promise<ApiResponse<PaginatedResponse<Client>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/customers/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Client>>(endpoint);
  },

  // Get client by ID (admin/staff only)
  async getClientById(id: number): Promise<ApiResponse<Client>> {
    return apiClient.get<Client>(`/api/cargo/customers/${id}/`);
  },

  // Create new client (admin/staff only) - this uses the user registration endpoint
  async createClient(data: CreateClientRequest): Promise<ApiResponse<Client>> {
    return apiClient.post<Client>('/api/auth/register/', data);
  },

  // Update client (admin/staff only)
  async updateClient(id: number, data: UpdateClientRequest): Promise<ApiResponse<Client>> {
    return apiClient.put<Client>(`/api/cargo/customers/${id}/`, data);
  },

  // Delete client (admin/staff only)
  async deleteClient(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/cargo/customers/${id}/`);
  },

  // Get client statistics (admin/staff only)
  async getClientStats(): Promise<ApiResponse<ClientStats>> {
    return apiClient.get<ClientStats>('/api/auth/user-stats/');
  },

  // Get active clients
  async getActiveClients(): Promise<ApiResponse<Client[]>> {
    return this.getClients({ is_active: true }).then(response => ({
      ...response,
      data: response.data?.results || []
    }));
  },

  // Get business clients
  async getBusinessClients(): Promise<ApiResponse<Client[]>> {
    return this.getClients({ user_type: 'BUSINESS' }).then(response => ({
      ...response,
      data: response.data?.results || []
    }));
  },

  // Get individual clients
  async getIndividualClients(): Promise<ApiResponse<Client[]>> {
    return this.getClients({ user_type: 'INDIVIDUAL' }).then(response => ({
      ...response,
      data: response.data?.results || []
    }));
  },

  // Search clients
  async searchClients(searchTerm: string): Promise<ApiResponse<Client[]>> {
    return this.getClients({ search: searchTerm }).then(response => ({
      ...response,
      data: response.data?.results || []
    }));
  }
}; 
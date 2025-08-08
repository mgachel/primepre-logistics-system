import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalShipments: number;
  activeShipments: number;
  totalValue: string;
  status: 'active' | 'inactive';
  lastActivity: string;
  location: string;
  address?: string;
  contactPerson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  phone: string;
  location: string;
  address?: string;
  contactPerson?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  status?: 'active' | 'inactive';
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  clientId: string;
  type: 'air' | 'sea';
  origin: string;
  destination: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'delayed';
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

export interface ClientFilters {
  status?: string;
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const clientService = {
  // Get all clients with pagination and filters
  async getClients(filters: ClientFilters = {}): Promise<ApiResponse<PaginatedResponse<Client>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/clients?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Client>>(endpoint);
  },

  // Get client by ID
  async getClientById(id: string): Promise<ApiResponse<Client>> {
    return apiClient.get<Client>(`/clients/${id}`);
  },

  // Create new client
  async createClient(data: CreateClientRequest): Promise<ApiResponse<Client>> {
    return apiClient.post<Client>('/clients', data);
  },

  // Update client
  async updateClient(id: string, data: UpdateClientRequest): Promise<ApiResponse<Client>> {
    return apiClient.put<Client>(`/clients/${id}`, data);
  },

  // Delete client
  async deleteClient(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/clients/${id}`);
  },

  // Get client statistics
  async getClientStats(): Promise<ApiResponse<{
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
    totalValue: string;
  }>> {
    return apiClient.get('/clients/stats');
  },

  // Get client shipments
  async getClientShipments(clientId: string): Promise<ApiResponse<Shipment[]>> {
    return apiClient.get(`/clients/${clientId}/shipments`);
  },
}; 
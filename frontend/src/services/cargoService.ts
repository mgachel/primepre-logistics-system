import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface CargoContainer {
  id: number;
  container_number: string;
  vessel: string;
  voyage: string;
  origin_port: string;
  destination_port: string;
  departure_date?: string;
  arrival_date?: string;
  eta?: string;
  etd?: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'DELAYED';
  total_cbm: number;
  total_weight: number;
  customer: number;
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CargoItem {
  id: number;
  container?: number;
  awb_number?: string;
  customer: number;
  customer_name?: string;
  description: string;
  quantity: number;
  weight: number;
  cbm: number;
  status: 'PENDING' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED';
  shipping_mark?: string;
  notes?: string;
  type: 'SEA' | 'AIR';
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCargoContainerRequest {
  container_number: string;
  vessel: string;
  voyage: string;
  origin_port: string;
  destination_port: string;
  departure_date?: string;
  arrival_date?: string;
  eta?: string;
  etd?: string;
}

export interface CreateCargoItemRequest {
  container?: number;
  awb_number?: string;
  description: string;
  quantity: number;
  weight: number;
  cbm: number;
  shipping_mark?: string;
  notes?: string;
  type: 'SEA' | 'AIR';
}

export interface UpdateCargoContainerRequest extends Partial<CreateCargoContainerRequest> {
  status?: 'PENDING' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'DELAYED';
}

export interface UpdateCargoItemRequest extends Partial<CreateCargoItemRequest> {
  status?: 'PENDING' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED';
}

export interface CargoFilters {
  type?: 'SEA' | 'AIR';
  status?: string;
  customer?: string;
  container?: string;
  awb_number?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CargoDashboardStats {
  total_containers: number;
  total_cargo_items: number;
  pending_items: number;
  in_transit_items: number;
  delivered_items: number;
  total_weight: number;
  total_cbm: number;
}

export interface BulkUploadResult {
  success: boolean;
  message: string;
  created_count: number;
  errors: string[];
}

export const cargoService = {
  // ================== CUSTOMER ENDPOINTS ==================
  
  // Get customer's cargo containers
  async getCustomerContainers(filters: CargoFilters = {}): Promise<ApiResponse<PaginatedResponse<CargoContainer>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/customer/containers/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoContainer>>(endpoint);
  },

  // Get customer's cargo items
  async getCustomerCargoItems(filters: CargoFilters = {}): Promise<ApiResponse<PaginatedResponse<CargoItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/customer/cargo-items/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoItem>>(endpoint);
  },

  // Get customer container by ID
  async getCustomerContainerById(id: number): Promise<ApiResponse<CargoContainer>> {
    return apiClient.get<CargoContainer>(`/api/cargo/customer/containers/${id}/`);
  },

  // Get customer cargo item by ID
  async getCustomerCargoItemById(id: number): Promise<ApiResponse<CargoItem>> {
    return apiClient.get<CargoItem>(`/api/cargo/customer/cargo-items/${id}/`);
  },

  // Get customer cargo dashboard
  async getCustomerCargoDashboard(): Promise<ApiResponse<CargoDashboardStats>> {
    return apiClient.get<CargoDashboardStats>('/api/cargo/customer/dashboard/');
  },

  // ================== ADMIN/STAFF ENDPOINTS ==================
  
  // Get all cargo containers (admin/staff)
  async getAllContainers(filters: CargoFilters = {}): Promise<ApiResponse<PaginatedResponse<CargoContainer>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/containers/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoContainer>>(endpoint);
  },

  // Get all cargo items (admin/staff)
  async getAllCargoItems(filters: CargoFilters = {}): Promise<ApiResponse<PaginatedResponse<CargoItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/cargo-items/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoItem>>(endpoint);
  },

  // Get container by ID (admin/staff)
  async getContainerById(id: number): Promise<ApiResponse<CargoContainer>> {
    return apiClient.get<CargoContainer>(`/api/cargo/containers/${id}/`);
  },

  // Get cargo item by ID (admin/staff)
  async getCargoItemById(id: number): Promise<ApiResponse<CargoItem>> {
    return apiClient.get<CargoItem>(`/api/cargo/cargo-items/${id}/`);
  },

  // Create new container (admin/staff)
  async createContainer(data: CreateCargoContainerRequest): Promise<ApiResponse<CargoContainer>> {
    return apiClient.post<CargoContainer>('/api/cargo/containers/', data);
  },

  // Create new cargo item (admin/staff)
  async createCargoItem(data: CreateCargoItemRequest): Promise<ApiResponse<CargoItem>> {
    return apiClient.post<CargoItem>('/api/cargo/cargo-items/', data);
  },

  // Update container (admin/staff)
  async updateContainer(id: number, data: UpdateCargoContainerRequest): Promise<ApiResponse<CargoContainer>> {
    return apiClient.put<CargoContainer>(`/api/cargo/containers/${id}/`, data);
  },

  // Update cargo item (admin/staff)
  async updateCargoItem(id: number, data: UpdateCargoItemRequest): Promise<ApiResponse<CargoItem>> {
    return apiClient.put<CargoItem>(`/api/cargo/cargo-items/${id}/`, data);
  },

  // Delete container (admin/staff)
  async deleteContainer(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/cargo/containers/${id}/`);
  },

  // Delete cargo item (admin/staff)
  async deleteCargoItem(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/cargo/cargo-items/${id}/`);
  },

  // Get cargo dashboard (admin/staff)
  async getCargoDashboard(): Promise<ApiResponse<CargoDashboardStats>> {
    return apiClient.get<CargoDashboardStats>('/api/cargo/dashboard/');
  },

  // Get cargo statistics (admin/staff)
  async getCargoStatistics(): Promise<ApiResponse<CargoDashboardStats>> {
    return apiClient.get<CargoDashboardStats>('/api/cargo/statistics/');
  },

  // Bulk upload cargo items (admin/staff)
  async bulkUploadCargoItems(file: File): Promise<ApiResponse<BulkUploadResult>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<BulkUploadResult>('/api/cargo/bulk-upload/', formData);
  },

  // ================== CONVENIENCE METHODS ==================
  
  // Get sea cargo containers (customer or admin based on role)
  async getSeaContainers(filters: Omit<CargoFilters, 'type'> = {}, isCustomer: boolean = true): Promise<ApiResponse<PaginatedResponse<CargoContainer>>> {
    if (isCustomer) {
      return this.getCustomerContainers({ ...filters, type: 'SEA' });
    } else {
      return this.getAllContainers({ ...filters, type: 'SEA' });
    }
  },

  // Get air cargo items (customer or admin based on role)
  async getAirCargoItems(filters: Omit<CargoFilters, 'type'> = {}, isCustomer: boolean = true): Promise<ApiResponse<PaginatedResponse<CargoItem>>> {
    if (isCustomer) {
      return this.getCustomerCargoItems({ ...filters, type: 'AIR' });
    } else {
      return this.getAllCargoItems({ ...filters, type: 'AIR' });
    }
  },

  // Get all cargo (containers + items) for a user
  async getAllUserCargo(filters: CargoFilters = {}): Promise<{ containers: CargoContainer[], items: CargoItem[] }> {
    try {
      const [containersResponse, itemsResponse] = await Promise.all([
        this.getCustomerContainers(filters),
        this.getCustomerCargoItems(filters)
      ]);
      
      return {
        containers: containersResponse.data?.results || [],
        items: itemsResponse.data?.results || []
      };
    } catch (error) {
      console.error('Error fetching all user cargo:', error);
      return { containers: [], items: [] };
    }
  }
}; 
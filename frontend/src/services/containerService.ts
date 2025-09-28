import { apiClient, ApiResponse, PaginatedResponse } from "./api";

// Container interfaces based on the backend models
export interface CargoContainer {
  id: number;
  container_id: string;
  cargo_type: "AIR" | "SEA";
  location: "GUANGZHOU" | "ACCRA";
  warehouse_type?: string;
  route?: string;
  status: "pending" | "in_transit" | "arrived" | "cleared" | "delivered";
  
  // Dates
  shipped_date?: string;
  arrival_date?: string;
  cleared_date?: string;
  
  // Statistics
  total_items?: number;
  total_cbm?: number;
  total_weight?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CargoItem {
  id: number;
  item_id: string;
  shipping_mark: string;
  supply_tracking?: string;
  
  // Physical properties
  cbm?: number;
  weight?: number;
  quantity: number;
  
  // Ghana specific dimensions
  length?: number;
  breadth?: number;
  height?: number;
  
  // Description
  description?: string;
  supplier_name?: string;
  estimated_value?: number;
  notes?: string;
  
  // Status
  status: "PENDING" | "READY_FOR_SHIPPING" | "SHIPPED" | "READY_FOR_DELIVERY" | "DELIVERED" | "FLAGGED" | "CANCELLED";
  
  // Dates
  date_received: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  container: number; // container ID
  client: {
    id: number;
    shipping_mark: string;
    customer_name?: string;
  };
  
  // Computed fields
  days_in_warehouse?: number;
  is_ready_for_shipping?: boolean;
  is_ready_for_delivery?: boolean;
  is_flagged?: boolean;
}

export interface ClientSummary {
  id: number;
  shipping_mark: string;
  client_name?: string;
  total_items: number;
  total_cbm?: number;
  total_weight?: number;
  container: number;
}

export interface ContainerStats {
  total_containers: number;
  containers_in_transit: number;
  containers_arrived: number;
  containers_cleared: number;
  total_items: number;
  total_cbm: number;
  total_weight: number;
  pending_items: number;
  ready_for_shipping: number;
  shipped_items: number;
  ready_for_delivery: number;
  delivered_items: number;
  flagged_items: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface ContainerFilters extends PaginationParams {
  cargo_type?: "AIR" | "SEA";
  location?: "GUANGZHOU" | "ACCRA";
  status?: string;
  search?: string;
  warehouse_type?: string;
}

export interface ItemFilters extends PaginationParams {
  status?: string;
  search?: string;
  shipping_mark?: string;
  container?: number;
}

class ContainerService {
  // ==================== CONTAINERS ====================
  
  async getContainers(filters: ContainerFilters = {}): Promise<PaginatedResponse<CargoContainer>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/containers/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoContainer>>(endpoint);
  }
  
  async getContainer(id: number): Promise<ApiResponse<CargoContainer>> {
    return apiClient.get<CargoContainer>(`/api/cargo/containers/${id}/`);
  }
  
  async createContainer(data: Partial<CargoContainer>): Promise<ApiResponse<CargoContainer>> {
    return apiClient.post<CargoContainer>(`/api/cargo/containers/`, data);
  }
  
  async updateContainer(id: number, data: Partial<CargoContainer>): Promise<ApiResponse<CargoContainer>> {
    return apiClient.put<CargoContainer>(`/api/cargo/containers/${id}/`, data);
  }
  
  async deleteContainer(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/cargo/containers/${id}/`);
  }
  
  // ==================== CONTAINER ITEMS ====================
  
  async getContainerItems(containerId: number, filters: ItemFilters = {}): Promise<PaginatedResponse<CargoItem>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/containers/${containerId}/cargo_items/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoItem>>(endpoint);
  }
  
  async getContainerClientSummaries(containerId: number): Promise<ApiResponse<ClientSummary[]>> {
    return apiClient.get<ClientSummary[]>(`/api/cargo/containers/${containerId}/client_summaries/`);
  }
  
  // ==================== CARGO ITEMS ====================
  
  async getCargoItems(filters: ItemFilters = {}): Promise<PaginatedResponse<CargoItem>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/cargo-items/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoItem>>(endpoint);
  }
  
  async getCargoItem(id: number): Promise<ApiResponse<CargoItem>> {
    return apiClient.get<CargoItem>(`/api/cargo/cargo-items/${id}/`);
  }
  
  async createCargoItem(data: Partial<CargoItem>): Promise<ApiResponse<CargoItem>> {
    return apiClient.post<CargoItem>(`/api/cargo/cargo-items/`, data);
  }
  
  async updateCargoItem(id: number, data: Partial<CargoItem>): Promise<ApiResponse<CargoItem>> {
    return apiClient.put<CargoItem>(`/api/cargo/cargo-items/${id}/`, data);
  }
  
  async deleteCargoItem(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/cargo/cargo-items/${id}/`);
  }
  
  // ==================== STATISTICS ====================
  
  async getDashboardStats(filters: { cargo_type?: "AIR" | "SEA"; location?: "GUANGZHOU" | "ACCRA"; warehouse_type?: string } = {}): Promise<ApiResponse<ContainerStats>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/dashboard/?${params.toString()}`;
    return apiClient.get<ContainerStats>(endpoint);
  }
  
  async getStatistics(filters: { cargo_type?: "AIR" | "SEA"; location?: "GUANGZHOU" | "ACCRA" } = {}): Promise<ApiResponse<ContainerStats>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/statistics/?${params.toString()}`;
    return apiClient.get<ContainerStats>(endpoint);
  }
  
  // ==================== CUSTOMER ENDPOINTS ====================
  
  async getCustomerContainers(filters: ContainerFilters = {}): Promise<PaginatedResponse<CargoContainer>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/customer/containers/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoContainer>>(endpoint);
  }
  
  async getCustomerCargoItems(filters: ItemFilters = {}): Promise<PaginatedResponse<CargoItem>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/customer/cargo-items/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<CargoItem>>(endpoint);
  }
  
  async getCustomerDashboardStats(filters: { cargo_type?: "AIR" | "SEA"; location?: "GUANGZHOU" | "ACCRA" } = {}): Promise<ApiResponse<ContainerStats>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/cargo/customer/dashboard/?${params.toString()}`;
    return apiClient.get<ContainerStats>(endpoint);
  }

  // ==================== GHANA SPECIFIC METHODS ====================
  
  async getGhanaSeaContainers(filters: Omit<ContainerFilters, 'cargo_type' | 'location'> = {}): Promise<PaginatedResponse<CargoContainer>> {
    return this.getContainers({
      ...filters,
      cargo_type: "SEA",
      location: "ACCRA"
    });
  }
  
  async getGhanaAirContainers(filters: Omit<ContainerFilters, 'cargo_type' | 'location'> = {}): Promise<PaginatedResponse<CargoContainer>> {
    return this.getContainers({
      ...filters,
      cargo_type: "AIR",
      location: "ACCRA"
    });
  }
  
  async getGhanaSeaStats(): Promise<ApiResponse<ContainerStats>> {
    return this.getDashboardStats({
      cargo_type: "SEA",
      location: "ACCRA"
    });
  }
  
  async getGhanaAirStats(): Promise<ApiResponse<ContainerStats>> {
    return this.getDashboardStats({
      cargo_type: "AIR",
      location: "ACCRA"
    });
  }
  
  async getGhanaSeaItems(filters: ItemFilters = {}): Promise<PaginatedResponse<CargoItem>> {
    return this.getCargoItems({
      ...filters,
      // Add container filter for Ghana Sea containers
    });
  }
  
  async getGhanaAirItems(filters: ItemFilters = {}): Promise<PaginatedResponse<CargoItem>> {
    return this.getCargoItems({
      ...filters,
      // Add container filter for Ghana Air containers
    });
  }
}

export const containerService = new ContainerService();
export default containerService;
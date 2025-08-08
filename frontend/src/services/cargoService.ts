import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface Cargo {
  id: string;
  containerNo?: string;
  awbNumber?: string;
  client: string;
  origin: string;
  destination: string;
  loadingDate?: string;
  eta?: string;
  departureDate?: string;
  arrivalDate?: string;
  cbm?: string;
  weight: string;
  status: 'pending' | 'in-transit' | 'delivered' | 'delayed';
  vessel?: string;
  voyage?: string;
  airline?: string;
  flightNumber?: string;
  goods: string;
  notes?: string;
  type: 'sea' | 'air';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCargoRequest {
  type: 'sea' | 'air';
  containerNo?: string;
  awbNumber?: string;
  client: string;
  origin: string;
  destination: string;
  loadingDate: string;
  eta: string;
  cbm?: string;
  weight: string;
  vessel?: string;
  voyage?: string;
  airline?: string;
  flightNumber?: string;
  goods: string;
  notes?: string;
}

export interface UpdateCargoRequest extends Partial<CreateCargoRequest> {
  status?: 'pending' | 'in-transit' | 'delivered' | 'delayed';
}

export interface CargoFilters {
  type?: 'sea' | 'air';
  status?: string;
  client?: string;
  origin?: string;
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const cargoService = {
  // Get all cargo with pagination and filters
  async getCargo(filters: CargoFilters = {}): Promise<ApiResponse<PaginatedResponse<Cargo>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/cargo?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Cargo>>(endpoint);
  },

  // Get cargo by ID
  async getCargoById(id: string): Promise<ApiResponse<Cargo>> {
    return apiClient.get<Cargo>(`/cargo/${id}`);
  },

  // Create new cargo
  async createCargo(data: CreateCargoRequest): Promise<ApiResponse<Cargo>> {
    return apiClient.post<Cargo>('/cargo', data);
  },

  // Update cargo
  async updateCargo(id: string, data: UpdateCargoRequest): Promise<ApiResponse<Cargo>> {
    return apiClient.put<Cargo>(`/cargo/${id}`, data);
  },

  // Delete cargo
  async deleteCargo(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/cargo/${id}`);
  },

  // Get sea cargo specifically
  async getSeaCargo(filters: Omit<CargoFilters, 'type'> = {}): Promise<ApiResponse<PaginatedResponse<Cargo>>> {
    return this.getCargo({ ...filters, type: 'sea' });
  },

  // Get air cargo specifically
  async getAirCargo(filters: Omit<CargoFilters, 'type'> = {}): Promise<ApiResponse<PaginatedResponse<Cargo>>> {
    return this.getCargo({ ...filters, type: 'air' });
  },

  // Get cargo statistics
  async getCargoStats(): Promise<ApiResponse<{
    total: number;
    inTransit: number;
    delivered: number;
    pending: number;
    delayed: number;
    seaCargo: number;
    airCargo: number;
  }>> {
    return apiClient.get('/cargo/stats');
  },
}; 
import { apiClient, ApiResponse, PaginatedResponse } from "./api";

export interface Rate {
  id: number;
  category: "NORMAL_GOODS" | "SPECIAL_GOODS" | "SMALL_GOODS";
  category_display: string;
  rate_type: "SEA_RATES" | "AIR_RATES";
  rate_type_display: string;
  title: string;
  description?: string;
  origin_country: string;
  destination_country: string;
  office_name: string;
  amount: number;
  route: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRateRequest {
  category: "NORMAL_GOODS" | "SPECIAL_GOODS" | "SMALL_GOODS";
  rate_type: "SEA_RATES" | "AIR_RATES";
  title: string;
  description?: string;
  origin_country: string;
  destination_country: string;
  office_name: string;
  amount: number;
}

export interface UpdateRateRequest {
  category?: "NORMAL_GOODS" | "SPECIAL_GOODS" | "SMALL_GOODS";
  rate_type?: "SEA_RATES" | "AIR_RATES";
  title?: string;
  description?: string;
  origin_country?: string;
  destination_country?: string;
  office_name?: string;
  amount?: number;
}

export interface RateFilters {
  category?: string;
  rate_type?: string;
  origin_country?: string;
  destination_country?: string;
  office_name?: string;
  search?: string;
  ordering?: string;
  page?: number;
  limit?: number;
}

export interface RateStats {
  total: number;
  by_category: Array<{
    category: string;
    count: number;
  }>;
  by_type: Array<{
    rate_type: string;
    count: number;
  }>;
  amount: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface RouteInfo {
  origin_country: string;
  destination_country: string;
  count: number;
}

export interface OfficeInfo {
  office_name: string;
  count: number;
}

export const ratesService = {
  // Get all rates with optional filtering
  async getRates(
    filters: RateFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Rate>>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const endpoint = `/api/rates/rates/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Rate>>(endpoint);
  },

  // Get rate by ID
  async getRateById(id: number): Promise<ApiResponse<Rate>> {
    return apiClient.get<Rate>(`/api/rates/rates/${id}/`);
  },

  // Create new rate
  async createRate(data: CreateRateRequest): Promise<ApiResponse<Rate>> {
    return apiClient.post<Rate>("/api/rates/rates/", data);
  },

  // Update rate
  async updateRate(
    id: number,
    data: UpdateRateRequest
  ): Promise<ApiResponse<Rate>> {
    return apiClient.put<Rate>(`/api/rates/rates/${id}/`, data);
  },

  // Partial update rate
  async patchRate(
    id: number,
    data: Partial<UpdateRateRequest>
  ): Promise<ApiResponse<Rate>> {
    return apiClient.patch<Rate>(`/api/rates/rates/${id}/`, data);
  },

  // Delete rate
  async deleteRate(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/rates/rates/${id}/`);
  },

  // Get rate statistics
  async getRateStats(filters: RateFilters = {}): Promise<ApiResponse<RateStats>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const endpoint = `/api/rates/rates/stats/?${params.toString()}`;
    return apiClient.get<RateStats>(endpoint);
  },

  // Get all routes (origin-destination pairs)
  async getRoutes(filters: RateFilters = {}): Promise<ApiResponse<RouteInfo[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const endpoint = `/api/rates/rates/routes/?${params.toString()}`;
    return apiClient.get<RouteInfo[]>(endpoint);
  },

  // Get all offices
  async getOffices(filters: RateFilters = {}): Promise<ApiResponse<OfficeInfo[]>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const endpoint = `/api/rates/rates/offices/?${params.toString()}`;
    return apiClient.get<OfficeInfo[]>(endpoint);
  },

  // Get rates by category
  async getRatesByCategory(category: Rate['category']): Promise<ApiResponse<Rate[]>> {
    return this.getRates({ category }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },

  // Get rates by type
  async getRatesByType(rate_type: Rate['rate_type']): Promise<ApiResponse<Rate[]>> {
    return this.getRates({ rate_type }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },

  // Get rates for specific route
  async getRatesForRoute(
    origin: string,
    destination: string
  ): Promise<ApiResponse<Rate[]>> {
    return this.getRates({ 
      origin_country: origin, 
      destination_country: destination 
    }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },

  // Get rates for specific office
  async getRatesForOffice(office: string): Promise<ApiResponse<Rate[]>> {
    return this.getRates({ office_name: office }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },

  // Search rates
  async searchRates(searchQuery: string): Promise<ApiResponse<Rate[]>> {
    return this.getRates({ search: searchQuery }).then((response) => ({
      ...response,
      data: response.data?.results || [],
    }));
  },
};

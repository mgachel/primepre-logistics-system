import { apiClient, ApiResponse, PaginatedResponse } from "./api";

// GoodsReceivedGhana model interface
export interface GoodsReceivedGhana {
  id: number;
  shipping_mark: string;
  supply_tracking: string;
  quantity: number;
  date_received: string;
  status: "PENDING" | "READY_FOR_DELIVERY" | "FLAGGED" | "DELIVERED" | "CANCELLED";
  location: "ACCRA" | "KUMASI" | "TAKORADI" | "OTHER";
  method_of_shipping: "AIR" | "SEA";
  cbm?: number | null;
  weight?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoodsFilters {
  search?: string; // For tracking number or shipping mark
  status?: string;
  method_of_shipping?: "AIR" | "SEA";
  location?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface GoodsStats {
  total: number;
  pending: number;
  ready_for_delivery: number;
  flagged: number;
  delivered: number;
  cancelled: number;
}

class GoodsReceivedService {
  // Get all goods received in Ghana warehouse
  async getGhanaGoods(filters?: GoodsFilters): Promise<ApiResponse<PaginatedResponse<GoodsReceivedGhana>>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method_of_shipping) params.append('method_of_shipping', filters.method_of_shipping);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.page_size) params.append('page_size', filters.page_size.toString());

      const queryString = params.toString();
      const url = `/api/goods/customer/ghana/${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<PaginatedResponse<GoodsReceivedGhana>>(url);
      return response;
    } catch (error) {
      console.error('Error fetching Ghana goods:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch goods",
        data: {
          count: 0,
          next: null,
          previous: null,
          results: []
        },
      };
    }
  }

  // Get all goods received in China warehouse
  async getChinaGoods(filters?: GoodsFilters): Promise<ApiResponse<PaginatedResponse<GoodsReceivedGhana>>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method_of_shipping) params.append('method_of_shipping', filters.method_of_shipping);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.page_size) params.append('page_size', filters.page_size.toString());

      const queryString = params.toString();
      const url = `/api/goods/customer/china/${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<PaginatedResponse<GoodsReceivedGhana>>(url);
      return response;
    } catch (error) {
      console.error('Error fetching China goods:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch goods",
        data: {
          count: 0,
          next: null,
          previous: null,
          results: []
        },
      };
    }
  }

  // Get goods statistics
  async getGoodsStats(): Promise<ApiResponse<GoodsStats>> {
    try {
      // For now, we'll calculate stats from the main query
      // You could create a separate stats endpoint later if needed
      const response = await this.getGhanaGoods({ page_size: 1000 });
      
      if (response.success && response.data) {
        const goods = response.data.results || [];
        const stats: GoodsStats = {
          total: response.data.count || 0,
          pending: goods.filter(g => g.status === 'PENDING').length,
          ready_for_delivery: goods.filter(g => g.status === 'READY_FOR_DELIVERY').length,
          flagged: goods.filter(g => g.status === 'FLAGGED').length,
          delivered: goods.filter(g => g.status === 'DELIVERED').length,
          cancelled: goods.filter(g => g.status === 'CANCELLED').length,
        };
        
        return {
          success: true,
          message: "Stats retrieved successfully",
          data: stats,
        };
      }
      
      return {
        success: false,
        message: "Failed to calculate stats",
        data: {
          total: 0,
          pending: 0,
          ready_for_delivery: 0,
          flagged: 0,
          delivered: 0,
          cancelled: 0,
        },
      };
    } catch (error) {
      console.error('Error fetching goods stats:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch goods statistics",
        data: {
          total: 0,
          pending: 0,
          ready_for_delivery: 0,
          flagged: 0,
          delivered: 0,
          cancelled: 0,
        },
      };
    }
  }

  // Get single goods details
  async getGoodsDetails(id: string): Promise<ApiResponse<GoodsReceivedGhana>> {
    try {
      const response = await apiClient.get<GoodsReceivedGhana>(`/api/goods/customer/ghana/${id}/`);
      return response;
    } catch (error) {
      console.error('Error fetching goods details:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch goods details",
        data: {} as GoodsReceivedGhana,
      };
    }
  }

  // Helper function to get goods for past N days
  async getRecentGoods(days: number = 60): Promise<ApiResponse<PaginatedResponse<GoodsReceivedGhana>>> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    return this.getGhanaGoods({
      date_from: dateFrom.toISOString().split('T')[0], // YYYY-MM-DD format
      page_size: 50, // Get more results for recent goods
    });
  }
}

export const goodsReceivedService = new GoodsReceivedService();
import { apiClient, ApiResponse, PaginatedResponse } from "./api";

// Shipment model interface based on Django Shipments model
export interface Shipment {
  id: number;
  item_id: string;
  shipping_mark: string;
  supply_tracking: string;
  cbm?: number | null;
  weight?: number | null;
  quantity: number;
  status: "pending" | "in_transit" | "delivered" | "demurrage";
  method_of_shipping: "air" | "sea";
  date_received: string;
  date_shipped?: string | null;
  date_delivered?: string | null;
  created_at: string;
  updated_at: string;
  days_in_warehouse?: number | null;
}

export interface ShipmentFilters {
  search?: string; // For tracking number or shipping mark
  status?: string;
  method_of_shipping?: "air" | "sea";
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ShipmentStats {
  total: number;
  pending: number;
  in_transit: number;
  delivered: number;
  demurrage: number;
}

class ShipmentsService {
  // Get client shipments (filtered for current user)
  async getClientShipments(filters?: ShipmentFilters): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.method_of_shipping) params.append('method_of_shipping', filters.method_of_shipping);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.page_size) params.append('page_size', filters.page_size.toString());

      const queryString = params.toString();
      const url = `/api/shipments/shipments/client_shipments/${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get<PaginatedResponse<Shipment>>(url);
      return response;
    } catch (error) {
      console.error('Error fetching client shipments:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch shipments",
        data: {
          count: 0,
          next: null,
          previous: null,
          results: []
        },
      };
    }
  }

  // Get shipment statistics for current user
  async getClientShipmentStats(): Promise<ApiResponse<ShipmentStats>> {
    try {
      const response = await apiClient.get<ShipmentStats>('/api/shipments/shipments/client_stats/');
      return response;
    } catch (error) {
      console.error('Error fetching shipment stats:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch shipment statistics",
        data: {
          total: 0,
          pending: 0,
          in_transit: 0,
          delivered: 0,
          demurrage: 0,
        },
      };
    }
  }

  // Get single shipment details
  async getShipmentDetails(itemId: string): Promise<ApiResponse<Shipment>> {
    try {
      const response = await apiClient.get<Shipment>(`/api/shipments/shipments/${itemId}/`);
      return response;
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch shipment details",
        data: {} as Shipment,
      };
    }
  }

  // Helper function to get shipments for past N days
  async getRecentShipments(days: number = 60): Promise<ApiResponse<PaginatedResponse<Shipment>>> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    
    return this.getClientShipments({
      date_from: dateFrom.toISOString().split('T')[0], // YYYY-MM-DD format
      page_size: 50, // Get more results for recent shipments
    });
  }
}

export const shipmentsService = new ShipmentsService();
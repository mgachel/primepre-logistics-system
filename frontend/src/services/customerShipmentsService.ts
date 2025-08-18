import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { BackendCargoContainer, BackendCargoItem } from './cargoService';

// Customer Shipment Types (simplified view for customers)
export interface CustomerShipment {
  id: string;
  tracking_id: string;
  type: 'Sea Cargo' | 'Air Cargo';
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'processing';
  origin: string;
  destination: string;
  date: string;
  eta?: string;
  delivered_date?: string | null;
  description: string;
  quantity: number;
  weight?: number | null;
  cbm: number;
  value?: number | null;
  container_id?: string;
  shipping_mark?: string;
  // Derived fields
  container_info?: {
    container_id: string;
    cargo_type: 'sea' | 'air';
    route: string;
    load_date: string;
    eta: string;
    status: string;
  };
}

export interface ShipmentFilters {
  search?: string;
  status?: string;
  cargo_type?: 'sea' | 'air';
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ShipmentStats {
  total_shipments: number;
  pending_shipments: number;
  in_transit_shipments: number;
  delivered_shipments: number;
  delayed_shipments: number;
  total_containers: number;
  total_value: number;
  total_weight: number;
  total_cbm: number;
}

export const customerShipmentsService = {
  // Get customer cargo items (shipments)
  async getShipments(filters: ShipmentFilters = {}): Promise<ApiResponse<PaginatedResponse<CustomerShipment>>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.cargo_type) params.append('cargo_type', filters.cargo_type);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const response = await apiClient.get<any>(`/api/cargo/customer/cargo-items/?${params.toString()}`);
    
    // Get containers data to enrich shipment information
    const containersResponse = await apiClient.get<any>('/api/cargo/customer/containers/');
    
    // Process containers data
    let containersArray: BackendCargoContainer[] = [];
    if (Array.isArray(containersResponse.data)) {
      containersArray = containersResponse.data;
    } else if (containersResponse.data && typeof containersResponse.data === 'object' && 'results' in containersResponse.data) {
      containersArray = (containersResponse.data as { results: BackendCargoContainer[] }).results;
    }

    // Create containers lookup
    const containersMap = new Map<string, BackendCargoContainer>();
    containersArray.forEach(container => {
      containersMap.set(container.container_id, container);
    });

    // Process response data
    let cargoItems: BackendCargoItem[] = [];
    let pagination = {
      count: 0,
      next: null,
      previous: null,
    };

    if (Array.isArray(response.data)) {
      cargoItems = response.data;
      pagination.count = cargoItems.length;
    } else if (response.data && typeof response.data === 'object') {
      if ('results' in response.data) {
        const paginatedData = response.data as PaginatedResponse<BackendCargoItem>;
        cargoItems = paginatedData.results;
        pagination = {
          count: paginatedData.count,
          next: paginatedData.next,
          previous: paginatedData.previous,
        };
      }
    }

    // Transform cargo items to customer shipments
    const shipments: CustomerShipment[] = cargoItems.map((item: BackendCargoItem) => {
      const container = containersMap.get(item.container);
      
      return {
        id: item.id,
        tracking_id: item.tracking_id,
        type: container?.cargo_type === 'air' ? 'Air Cargo' : 'Sea Cargo',
        status: item.status,
        origin: 'China', // Default origin based on business logic
        destination: 'Ghana', // Default destination based on business logic
        date: item.created_at,
        eta: container?.eta,
        delivered_date: item.delivered_date,
        description: item.item_description,
        quantity: item.quantity,
        weight: item.weight,
        cbm: item.cbm,
        value: item.total_value,
        container_id: item.container,
        shipping_mark: item.client_shipping_mark,
        container_info: container ? {
          container_id: container.container_id,
          cargo_type: container.cargo_type,
          route: container.route,
          load_date: container.load_date,
          eta: container.eta,
          status: container.status,
        } : undefined,
      };
    });

    return {
      data: {
        results: shipments,
        count: pagination.count,
        next: pagination.next,
        previous: pagination.previous,
      },
      success: true,
    };
  },

  // Get shipment statistics
  async getShipmentStats(cargo_type?: 'sea' | 'air'): Promise<ApiResponse<ShipmentStats>> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (cargo_type) {
        params.append('cargo_type', cargo_type);
      }
      
      // Get cargo dashboard stats
      const dashboardResponse = await apiClient.get<any>(`/api/cargo/customer/dashboard/?${params.toString()}`);
      
      // Get all cargo items for additional calculations (with same filter)
      const itemsParams = new URLSearchParams();
      if (cargo_type) {
        itemsParams.append('cargo_type', cargo_type);
      }
      const itemsResponse = await apiClient.get<any>(`/api/cargo/customer/cargo-items/?${itemsParams.toString()}`);
      
      let cargoItems: BackendCargoItem[] = [];
      if (Array.isArray(itemsResponse.data)) {
        cargoItems = itemsResponse.data;
      } else if (itemsResponse.data && typeof itemsResponse.data === 'object' && 'results' in itemsResponse.data) {
        cargoItems = (itemsResponse.data as { results: BackendCargoItem[] }).results;
      }

      // Calculate additional stats
      const totalValue = cargoItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
      const totalWeight = cargoItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      const totalCbm = cargoItems.reduce((sum, item) => sum + item.cbm, 0);

      const stats: ShipmentStats = {
        total_shipments: dashboardResponse.data.total_cargo_items || 0,
        pending_shipments: dashboardResponse.data.pending_items || 0,
        in_transit_shipments: dashboardResponse.data.in_transit_items || 0,
        delivered_shipments: dashboardResponse.data.delivered_items || 0,
        delayed_shipments: 0, // TODO: Add delayed status tracking
        total_containers: dashboardResponse.data.total_containers || 0,
        total_value: totalValue,
        total_weight: totalWeight,
        total_cbm: totalCbm,
      };

      return {
        data: stats,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching shipment stats:', error);
      throw error;
    }
  },

  // Get single shipment details
  async getShipmentById(id: string): Promise<ApiResponse<CustomerShipment>> {
    try {
      // Get the specific cargo item
      const itemResponse = await apiClient.get<BackendCargoItem>(`/api/cargo/customer/cargo-items/${id}/`);
      
      // Get container information if available
      let container: BackendCargoContainer | undefined;
      if (itemResponse.data.container) {
        try {
          const containerResponse = await apiClient.get<BackendCargoContainer>(`/api/cargo/customer/containers/${itemResponse.data.container}/`);
          container = containerResponse.data;
        } catch (error) {
          console.warn('Could not fetch container details:', error);
        }
      }

      // Transform to customer shipment format
      const shipment: CustomerShipment = {
        id: itemResponse.data.id,
        tracking_id: itemResponse.data.tracking_id,
        type: container?.cargo_type === 'air' ? 'Air Cargo' : 'Sea Cargo',
        status: itemResponse.data.status,
        origin: 'China',
        destination: 'Ghana',
        date: itemResponse.data.created_at,
        eta: container?.eta,
        delivered_date: itemResponse.data.delivered_date,
        description: itemResponse.data.item_description,
        quantity: itemResponse.data.quantity,
        weight: itemResponse.data.weight,
        cbm: itemResponse.data.cbm,
        value: itemResponse.data.total_value,
        container_id: itemResponse.data.container,
        shipping_mark: itemResponse.data.client_shipping_mark,
        container_info: container ? {
          container_id: container.container_id,
          cargo_type: container.cargo_type,
          route: container.route,
          load_date: container.load_date,
          eta: container.eta,
          status: container.status,
        } : undefined,
      };

      return {
        data: shipment,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      throw error;
    }
  },

  // Search shipments
  async searchShipments(query: string): Promise<ApiResponse<CustomerShipment[]>> {
    const response = await this.getShipments({ search: query, page_size: 50 });
    return {
      data: response.data.results,
      success: response.success,
    };
  },
};

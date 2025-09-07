import { apiClient, ApiResponse } from './api';
import { BackendCargoContainer, BackendCargoItem } from './cargoService';
import { WarehouseItem } from './warehouseService';

// Customer Dashboard Types based on backend APIs
export interface CustomerDashboardStats {
  // Cargo statistics
  total_cargo_items: number;
  pending_items: number;
  in_transit_items: number;
  delivered_items: number;
  total_containers: number;
  
  // Warehouse statistics (China)
  china_total_items?: number;
  china_pending?: number;
  china_ready_for_shipping?: number;
  china_shipped?: number;
  china_flagged?: number;
  china_total_cbm?: number;
  china_total_weight?: number;
  
  // Warehouse statistics (Ghana)  
  ghana_total_items?: number;
  ghana_pending?: number;
  ghana_ready_for_shipping?: number;
  ghana_shipped?: number;
  ghana_flagged?: number;
  ghana_total_cbm?: number;
  ghana_total_weight?: number;
  
  // Financial
  total_spent?: number;
  pending_claims?: number;
}

export interface CustomerShipment {
  id: string;
  type: 'Sea Cargo' | 'Air Cargo';
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'processing';
  origin: string;
  destination: string;
  date: string;
  eta?: string;
  delivered?: string;
  tracking_id?: string;
  description?: string;
}

export interface CustomerClaim {
  id: string;
  shipment_id: string;
  type: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  amount: string;
  date: string;
  description?: string;
}

export interface CustomerDashboardData {
  stats: CustomerDashboardStats;
  recent_shipments: CustomerShipment[];
  recent_claims: CustomerClaim[];
  recent_items: BackendCargoItem[];
  containers: BackendCargoContainer[];
  notifications?: NotificationItem[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  created_at: string;
  read: boolean;
}

export const customerDashboardService = {
  // Get customer cargo dashboard data
  async getCargoDashboard(): Promise<ApiResponse<CustomerDashboardStats & {
    recent_items: BackendCargoItem[];
    containers: BackendCargoContainer[];
  }>> {
    return apiClient.get('/api/cargo/customer/dashboard/');
  },

  // Get customer warehouse data (China)
  async getChinaWarehouseStats(): Promise<ApiResponse<{
    total_items: number;
    pending: number;
    ready_for_shipping: number;
    shipped: number;
    flagged: number;
    total_cbm: number;
    total_weight: number;
  }>> {
    try {
      return await apiClient.get('/api/customer/goods/china/my_statistics/');
    } catch (error) {
      console.warn('China warehouse stats not available:', error);
      return {
        data: {
          total_items: 0,
          pending: 0,
          ready_for_shipping: 0,
          shipped: 0,
          flagged: 0,
          total_cbm: 0,
          total_weight: 0,
        },
        success: true,
      };
    }
  },

  // Get customer warehouse data (Ghana)
  async getGhanaWarehouseStats(): Promise<ApiResponse<{
    total_items: number;
    pending: number;
    ready_for_shipping: number;
    shipped: number;
    flagged: number;
    total_cbm: number;
    total_weight: number;
  }>> {
    try {
      return await apiClient.get('/api/customer/goods/ghana/my_statistics/');
    } catch (error) {
      console.warn('Ghana warehouse stats not available:', error);
      return {
        data: {
          total_items: 0,
          pending: 0,
          ready_for_shipping: 0,
          shipped: 0,
          flagged: 0,
          total_cbm: 0,
          total_weight: 0,
        },
        success: true,
      };
    }
  },

  // Get recent warehouse items (China)
  async getRecentChinaItems(): Promise<ApiResponse<WarehouseItem[]>> {
    try {
      return await apiClient.get('/api/customer/goods/china/');
    } catch (error) {
      console.warn('Recent China items not available:', error);
      return { data: [], success: true };
    }
  },

  // Get recent warehouse items (Ghana)
  async getRecentGhanaItems(): Promise<ApiResponse<WarehouseItem[]>> {
    try {
      return await apiClient.get('/api/customer/goods/ghana/');
    } catch (error) {
      console.warn('Recent Ghana items not available:', error);
      return { data: [], success: true };
    }
  },

  // Get customer containers
  async getCustomerContainers(): Promise<ApiResponse<BackendCargoContainer[]>> {
    return apiClient.get('/api/cargo/customer/containers/');
  },

  // Get customer cargo items
  async getCustomerCargoItems(): Promise<ApiResponse<BackendCargoItem[]>> {
    return apiClient.get('/api/cargo/customer/cargo-items/');
  },

  // Combined customer dashboard data
  async getFullDashboard(): Promise<CustomerDashboardData> {
    try {
      // Fetch all data in parallel
      const [
        cargoData,
        chinaStats,
        ghanaStats,
        containers,
        cargoItems,
      ] = await Promise.all([
        this.getCargoDashboard(),
        this.getChinaWarehouseStats(),
        this.getGhanaWarehouseStats(),
        this.getCustomerContainers(),
        this.getCustomerCargoItems(),
      ]);

      // Debug: Log the response structures
      console.log('Cargo Data Response:', cargoData);
      console.log('Containers Response:', containers);
      console.log('Cargo Items Response:', cargoItems);

      // Safely extract cargo items data - handle both array and paginated responses
      let cargoItemsArray: BackendCargoItem[] = [];
      if (Array.isArray(cargoItems.data)) {
        cargoItemsArray = cargoItems.data;
      } else if (cargoItems.data && typeof cargoItems.data === 'object' && 'results' in cargoItems.data) {
        cargoItemsArray = (cargoItems.data as { results: BackendCargoItem[] }).results;
      }

      // Safely extract containers data - handle both array and paginated responses
      let containersArray: BackendCargoContainer[] = [];
      if (Array.isArray(containers.data)) {
        containersArray = containers.data;
      } else if (containers.data && typeof containers.data === 'object' && 'results' in containers.data) {
        containersArray = (containers.data as { results: BackendCargoContainer[] }).results;
      }

      // Transform cargo items to shipments format
      const recent_shipments: CustomerShipment[] = cargoItemsArray
        .filter((item): item is BackendCargoItem => item != null) // Filter out null items
        .slice(0, 5)
        .map((item: BackendCargoItem) => {
          // Find the container for this item
          const container = containersArray.find((c: BackendCargoContainer) => c && c.container_id === item.container);
          
          return {
            id: item.tracking_id || item.id,
            type: container?.cargo_type === 'air' ? 'Air Cargo' : 'Sea Cargo',
            status: item.status,
            origin: 'China', // Default origin
            destination: 'Ghana', // Default destination
            date: item.created_at,
            eta: container?.eta,
            delivered: item.delivered_date || undefined,
            tracking_id: item.tracking_id,
            description: item.item_description,
          };
        });

      // Combine statistics
      const stats: CustomerDashboardStats = {
        ...cargoData.data,
        china_total_items: chinaStats.data.total_items,
        china_pending: chinaStats.data.pending,
        china_ready_for_shipping: chinaStats.data.ready_for_shipping,
        china_shipped: chinaStats.data.shipped,
        china_flagged: chinaStats.data.flagged,
        china_total_cbm: chinaStats.data.total_cbm,
        china_total_weight: chinaStats.data.total_weight,
        ghana_total_items: ghanaStats.data.total_items,
        ghana_pending: ghanaStats.data.pending,
        ghana_ready_for_shipping: ghanaStats.data.ready_for_shipping,
        ghana_shipped: ghanaStats.data.shipped,
        ghana_flagged: ghanaStats.data.flagged,
        ghana_total_cbm: ghanaStats.data.total_cbm,
        ghana_total_weight: ghanaStats.data.total_weight,
        total_spent: 0, // Calculate from cargo items if needed
        pending_claims: 0, // TODO: Implement claims system
      };

      return {
        stats,
        recent_shipments,
        recent_claims: [], // TODO: Implement claims system
        recent_items: cargoData.data.recent_items || [],
        containers: containersArray,
        notifications: [], // TODO: Implement notifications
      };
    } catch (error) {
      console.error('Error fetching customer dashboard data:', error);
      throw error;
    }
  },
};

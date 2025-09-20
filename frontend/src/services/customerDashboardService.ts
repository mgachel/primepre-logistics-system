import { apiClient, ApiResponse } from './api';
import { WarehouseItem } from './warehouseService';
import { CargoContainer as BackendCargoContainer, CargoItem as BackendCargoItem } from './cargoService';

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
  // Get customer cargo dashboard data directly
  async getCargoDashboard(): Promise<ApiResponse<CustomerDashboardStats & {
    recent_items: BackendCargoItem[];
    containers: BackendCargoContainer[];
  }>> {
    return apiClient.get('/api/cargo/customer/dashboard/');
  },

  // Get customer warehouse data (China) with graceful error handling
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
      const response = await apiClient.get('/api/goods/customer/china/my_statistics/');
      return response as ApiResponse<{
        total_items: number;
        pending: number;
        ready_for_shipping: number;
        shipped: number;
        flagged: number;
        total_cbm: number;
        total_weight: number;
      }>;
    } catch (error) {
      console.warn('China warehouse stats endpoint not available:', error);
      // Return default values instead of throwing
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
        message: 'Using default values - endpoint unavailable'
      };
    }
  },

  // Get customer warehouse data (Ghana) with graceful error handling
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
      const response = await apiClient.get('/api/goods/customer/ghana/my_statistics/');
      return response as ApiResponse<{
        total_items: number;
        pending: number;
        ready_for_shipping: number;
        shipped: number;
        flagged: number;
        total_cbm: number;
        total_weight: number;
      }>;
    } catch (error) {
      console.warn('Ghana warehouse stats endpoint not available:', error);
      // Return default values instead of throwing
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
        message: 'Using default values - endpoint unavailable'
      };
    }
  },

  // Get recent warehouse items (China) with error handling
  async getRecentChinaItems(): Promise<ApiResponse<WarehouseItem[]>> {
    try {
      return await apiClient.get('/api/goods/customer/china/');
    } catch (error) {
      console.warn('Recent China items not available:', error);
      return { 
        data: [], 
        success: true, 
        message: 'No China items available' 
      } as ApiResponse<WarehouseItem[]>;
    }
  },

  // Get recent warehouse items (Ghana) with error handling
  async getRecentGhanaItems(): Promise<ApiResponse<WarehouseItem[]>> {
    try {
      return await apiClient.get('/api/goods/customer/ghana/');
    } catch (error) {
      console.warn('Recent Ghana items not available:', error);
      return { 
        data: [], 
        success: true, 
        message: 'No Ghana items available' 
      } as ApiResponse<WarehouseItem[]>;
    }
  },

  // Get customer containers with caching
  async getCustomerContainers(): Promise<ApiResponse<BackendCargoContainer[]>> {
    return apiClient.get('/api/cargo/customer/containers/');
  },

  // Get customer cargo items with caching
  async getCustomerCargoItems(): Promise<ApiResponse<BackendCargoItem[]>> {
    return apiClient.get('/api/cargo/customer/cargo-items/');
  },

  // Combined customer dashboard data with sequential loading
  async getFullDashboard(): Promise<CustomerDashboardData> {
    try {
      console.log('Loading dashboard data sequentially to avoid rate limits...');
      
      // Initialize with default data that works even if API fails
      let stats: CustomerDashboardStats = {
        total_cargo_items: 0,
        pending_items: 0,
        in_transit_items: 0,
        delivered_items: 0,
        total_containers: 0,
        china_total_items: 0,
        china_pending: 0,
        china_ready_for_shipping: 0,
        china_shipped: 0,
        china_flagged: 0,
        china_total_cbm: 0,
        china_total_weight: 0,
        ghana_total_items: 0,
        ghana_pending: 0,
        ghana_ready_for_shipping: 0,
        ghana_shipped: 0,
        ghana_flagged: 0,
        ghana_total_cbm: 0,
        ghana_total_weight: 0,
        total_spent: 0,
        pending_claims: 0,
      };

      let recent_shipments: CustomerShipment[] = [];
      let containersArray: BackendCargoContainer[] = [];
      let cargoItemsArray: BackendCargoItem[] = [];

      // Load data sequentially using throttled queue (which handles timing automatically)
      try {
        console.log('Loading cargo dashboard...');
        const cargoData = await this.getCargoDashboard();
        
        if (cargoData.success && cargoData.data) {
          stats = { ...stats, ...cargoData.data };
          console.log('✅ Cargo dashboard loaded successfully');
        } else {
          console.warn('⚠️ Cargo dashboard failed, using defaults');
        }
      } catch (error) {
        console.warn('⚠️ Cargo dashboard failed:', error);
      }

      // Load containers and cargo items (queue will handle spacing)
      try {
        console.log('Loading containers...');
        const containersResult = await this.getCustomerContainers();
        if (containersResult.success) {
          if (Array.isArray(containersResult.data)) {
            containersArray = containersResult.data;
          } else if (containersResult.data && typeof containersResult.data === 'object' && 'results' in containersResult.data) {
            containersArray = (containersResult.data as { results: BackendCargoContainer[] }).results;
          }
          console.log('✅ Containers loaded successfully');
        }

        console.log('Loading cargo items...');
        const cargoItemsResult = await this.getCustomerCargoItems();
        if (cargoItemsResult.success) {
          if (Array.isArray(cargoItemsResult.data)) {
            cargoItemsArray = cargoItemsResult.data;
          } else if (cargoItemsResult.data && typeof cargoItemsResult.data === 'object' && 'results' in cargoItemsResult.data) {
            cargoItemsArray = (cargoItemsResult.data as { results: BackendCargoItem[] }).results;
          }
          console.log('✅ Cargo items loaded successfully');
        }
      } catch (error) {
        console.warn('⚠️ Secondary data loading failed:', error);
      }

      // Create shipments from available cargo items
      recent_shipments = cargoItemsArray
        .filter((item): item is BackendCargoItem => item != null)
        .slice(0, 5)
        .map((item: BackendCargoItem) => {
          const container = containersArray.find((c: BackendCargoContainer) => c && c.container_id === item.container);
          
          return {
            id: item.tracking_id || item.id,
            type: container?.cargo_type === 'air' ? 'Air Cargo' : 'Sea Cargo',
            status: item.status,
            origin: 'China',
            destination: 'Ghana',
            date: item.created_at,
            eta: container?.eta,
            delivered: item.delivered_date || undefined,
            tracking_id: item.tracking_id,
            description: item.item_description,
          };
        });

      // Load warehouse stats in background using throttled queue
      this.loadWarehouseStatsBackground(stats);

      console.log('✅ Dashboard loaded with available data');
      return {
        stats,
        recent_shipments,
        recent_claims: [],
        recent_items: cargoItemsArray.slice(0, 10), // Show recent items we loaded
        containers: containersArray,
        notifications: [],
      };
    } catch (error) {
      console.error('❌ Critical error in dashboard loading:', error);
      
      // Return minimal working dashboard
      return {
        stats: {
          total_cargo_items: 0,
          pending_items: 0,
          in_transit_items: 0,
          delivered_items: 0,
          total_containers: 0,
          china_total_items: 0,
          china_pending: 0,
          china_ready_for_shipping: 0,
          china_shipped: 0,
          china_flagged: 0,
          china_total_cbm: 0,
          china_total_weight: 0,
          ghana_total_items: 0,
          ghana_pending: 0,
          ghana_ready_for_shipping: 0,
          ghana_shipped: 0,
          ghana_flagged: 0,
          ghana_total_cbm: 0,
          ghana_total_weight: 0,
          total_spent: 0,
          pending_claims: 0,
        },
        recent_shipments: [],
        recent_claims: [],
        recent_items: [],
        containers: [],
        notifications: [],
      };
    }
  },

  // Load warehouse stats in background without blocking the UI
  async loadWarehouseStatsBackground(stats: CustomerDashboardStats): Promise<void> {
    try {
      console.log('Loading warehouse stats in background...');
      
      // Use throttled queue for warehouse stats (it will handle delays automatically)
      const [chinaStatsResult, ghanaStatsResult] = await Promise.allSettled([
        this.getChinaWarehouseStats(),
        this.getGhanaWarehouseStats(),
      ]);

      if (chinaStatsResult.status === 'fulfilled' && chinaStatsResult.value.success) {
        Object.assign(stats, {
          china_total_items: chinaStatsResult.value.data.total_items,
          china_pending: chinaStatsResult.value.data.pending,
          china_ready_for_shipping: chinaStatsResult.value.data.ready_for_shipping,
          china_shipped: chinaStatsResult.value.data.shipped,
          china_flagged: chinaStatsResult.value.data.flagged,
          china_total_cbm: chinaStatsResult.value.data.total_cbm,
          china_total_weight: chinaStatsResult.value.data.total_weight,
        });
        console.log('✅ China warehouse stats updated');
      }

      if (ghanaStatsResult.status === 'fulfilled' && ghanaStatsResult.value.success) {
        Object.assign(stats, {
          ghana_total_items: ghanaStatsResult.value.data.total_items,
          ghana_pending: ghanaStatsResult.value.data.pending,
          ghana_ready_for_shipping: ghanaStatsResult.value.data.ready_for_shipping,
          ghana_shipped: ghanaStatsResult.value.data.shipped,
          ghana_flagged: ghanaStatsResult.value.data.flagged,
          ghana_total_cbm: ghanaStatsResult.value.data.total_cbm,
          ghana_total_weight: ghanaStatsResult.value.data.total_weight,
        });
        console.log('✅ Ghana warehouse stats updated');
      }
    } catch (error) {
      console.warn('⚠️ Background warehouse stats loading failed:', error);
    }
  },

  // Clear cache method for manual refresh (now handled by React Query)
  clearCache() {
    // Cache clearing is now handled by React Query
    console.log('Cache clearing is handled by React Query queryClient.invalidateQueries()');
  },

  // Clear specific cache entries (now handled by React Query)
  clearCacheEntry(key: string) {
    // Cache clearing is now handled by React Query
    console.log(`Cache clearing for ${key} is handled by React Query queryClient.invalidateQueries()`);
  },
};

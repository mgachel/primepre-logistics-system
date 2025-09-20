import { apiClient, ApiResponse, PaginatedResponse } from './api';
import { WarehouseItem, WarehouseStats } from './warehouseService';
import { CargoContainer, CargoItem } from './cargoService';

export interface CombinedWarehouseStats {
  total_items: number;
  total_cbm: number;
  total_weight: number;
  total_flagged: number;
  total_ready: number;
}

export interface CustomerDashboardStats {
  // China warehouse stats
  china_total_items: number;
  china_pending: number;
  china_ready_for_shipping: number;
  china_shipped: number;
  china_flagged: number;
  china_total_cbm: number;
  china_total_weight: number;
  
  // Ghana warehouse stats
  ghana_total_items: number;
  ghana_pending: number;
  ghana_ready_for_shipping: number;
  ghana_shipped: number;
  ghana_flagged: number;
  ghana_total_cbm: number;
  ghana_total_weight: number;
  
  // Cargo stats
  total_containers: number;
  total_cargo_items: number;
  pending_cargo: number;
  in_transit_cargo: number;
  delivered_cargo: number;
  
  // Recent activity count
  recent_activity_count: number;
}

export interface CustomerDashboardData {
  stats: CustomerDashboardStats;
  recent_china_items: WarehouseItem[];
  recent_ghana_items: WarehouseItem[];
  flagged_items: WarehouseItem[];
  ready_for_shipping: WarehouseItem[];
  recent_containers: CargoContainer[];
  recent_cargo_items: CargoItem[];
  notifications: NotificationItem[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  total_goods_china: number;
  total_goods_ghana: number;
  total_containers: number;
  total_cargo_items: number;
  revenue_this_month: number;
  pending_shipments: number;
}

export const dashboardService = {

  // Get dashboard data based on user role
  async getDashboard(userRole: string): Promise<ApiResponse<CustomerDashboardData | AdminDashboardStats>> {
    if (userRole === 'CUSTOMER') {
      return apiClient.get<CustomerDashboardData>('/api/cargo/customer/dashboard/');
    } else {
      return apiClient.get<AdminDashboardStats>('/api/cargo/dashboard/');
    }
  },

  // Get warehouse summary (combining China and Ghana stats)
  async getWarehouseSummary(): Promise<ApiResponse<{
    china_stats: WarehouseStats;
    ghana_stats: WarehouseStats;
    combined_totals: CombinedWarehouseStats;
  }>> {
    const [chinaStats, ghanaStats] = await Promise.all([
      apiClient.get<WarehouseStats>('/api/customer/goods/china/my_statistics/'),
      apiClient.get<WarehouseStats>('/api/customer/goods/ghana/my_statistics/')
    ]);
    
    return {
      data: {
        china_stats: chinaStats.data || {} as WarehouseStats,
        ghana_stats: ghanaStats.data || {} as WarehouseStats,
        combined_totals: {
          total_items: (chinaStats.data?.total_items || 0) + (ghanaStats.data?.total_items || 0),
          total_cbm: (chinaStats.data?.total_cbm || 0) + (ghanaStats.data?.total_cbm || 0),
          total_weight: (chinaStats.data?.total_weight || 0) + (ghanaStats.data?.total_weight || 0),
          total_flagged: (chinaStats.data?.flagged || 0) + (ghanaStats.data?.flagged || 0),
          total_ready: (chinaStats.data?.ready_for_shipping || 0) + (ghanaStats.data?.ready_for_shipping || 0),
        }
      },
      success: true,
      message: 'Warehouse summary retrieved successfully'
    };
  },

  // Get recent activity across all services
  async getRecentActivity(): Promise<ApiResponse<{
    recent_items: WarehouseItem[];
    recent_cargo: (CargoContainer | CargoItem)[];
    flagged_count: number;
  }>> {
    try {
      const [chinaItemsResult, ghanaItemsResult, containersResult, cargoItemsResult] = await Promise.allSettled([
        apiClient.get<PaginatedResponse<WarehouseItem>>('/api/goods/customer/china/?limit=5&ordering=-created_at'),
        apiClient.get<PaginatedResponse<WarehouseItem>>('/api/goods/customer/ghana/?limit=5&ordering=-created_at'),
        apiClient.get<PaginatedResponse<CargoContainer>>('/api/cargo/customer/containers/?limit=3&ordering=-created_at'),
        apiClient.get<PaginatedResponse<CargoItem>>('/api/cargo/customer/cargo-items/?limit=3&ordering=-created_at')
      ]);
      
      // Safely extract data from settled promises
      const chinaItems = chinaItemsResult.status === 'fulfilled' ? chinaItemsResult.value.data?.results || [] : [];
      const ghanaItems = ghanaItemsResult.status === 'fulfilled' ? ghanaItemsResult.value.data?.results || [] : [];
      const containers = containersResult.status === 'fulfilled' ? containersResult.value.data?.results || [] : [];
      const cargoItems = cargoItemsResult.status === 'fulfilled' ? cargoItemsResult.value.data?.results || [] : [];
      
      const recentItems = [
        ...chinaItems,
        ...ghanaItems
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
    
      const recentCargo = [
        ...containers,
        ...cargoItems
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    
      return {
        data: {
          recent_items: recentItems,
          recent_cargo: recentCargo,
          flagged_count: recentItems.filter(item => item.status === 'FLAGGED').length
        },
        success: true,
        message: 'Recent activity retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return {
        data: {
          recent_items: [],
          recent_cargo: [],
          flagged_count: 0
        },
        success: false,
        message: 'Failed to retrieve recent activity'
      };
    }
  }
};
import { apiClient, ApiResponse } from './api';

export interface DashboardStats {
  cbmInWarehouse: number;
  activeShipments: number;
  revenueThisMonth: string;
  activeClients: number;
  seaCargoCount: number;
  airCargoCount: number;
  openClaims: number;
  pendingDeliveries: number;
}

export interface TransitingCargo {
  id: string;
  type: 'sea' | 'air';
  container: string;
  client: string;
  route: string;
  eta: string;
  status: 'in-transit' | 'delayed' | 'pending';
}

export interface RecentClientActivity {
  name: string;
  activity: string;
  time: string;
  status: 'active' | 'pending' | 'completed';
}

export interface DashboardData {
  stats: DashboardStats;
  transitingCargo: TransitingCargo[];
  recentClientActivity: RecentClientActivity[];
}

export const dashboardService = {
  // Get dashboard data
  async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    return apiClient.get<DashboardData>('/dashboard');
  },

  // Get dashboard statistics
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return apiClient.get<DashboardStats>('/dashboard/stats');
  },

  // Get transiting cargo
  async getTransitingCargo(): Promise<ApiResponse<TransitingCargo[]>> {
    return apiClient.get<TransitingCargo[]>('/dashboard/transiting-cargo');
  },

  // Get recent client activity
  async getRecentClientActivity(): Promise<ApiResponse<RecentClientActivity[]>> {
    return apiClient.get<RecentClientActivity[]>('/dashboard/recent-activity');
  },

  // Get quick stats
  async getQuickStats(): Promise<ApiResponse<{
    seaCargo: { count: number; change: string };
    airCargo: { count: number; change: string };
    claims: { count: number; avgResolution: string };
  }>> {
    return apiClient.get('/dashboard/quick-stats');
  },
}; 
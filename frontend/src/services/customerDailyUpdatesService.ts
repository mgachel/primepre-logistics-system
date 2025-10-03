import { apiClient } from './api';

// Type definitions
export interface CargoItem {
  id: number;
  container: string;
  client: number;
  client_name: string;
  client_shipping_mark: string;
  tracking_id: string;
  item_description: string;
  quantity: number;
  weight?: number;
  cbm?: number;
  length?: number;
  breadth?: number;
  height?: number;
  unit_value?: string;
  total_value?: string;
  status: string;
  delivered_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CargoContainer {
  container_id: string;
  cargo_type: 'air' | 'sea';
  weight?: number;
  cbm?: number;
  load_date: string;
  eta: string;
  unloading_date?: string;
  route: string;
  rates?: string;
  dollar_rate?: string;
  stay_days: number;
  delay_days: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'demurrage';
  location: 'china' | 'ghana' | 'transit';
  warehouse_type: 'cargo' | 'goods_received';
  created_at: string;
  updated_at: string;
  total_cargo_items?: number;
  total_clients?: number;
  cargo_items?: CargoItem[];
  total_items?: number;
}

export interface GoodsReceivedChina {
  id: number;
  customer?: number;
  shipping_mark?: string;
  supply_tracking: string;
  cbm?: number;
  weight?: number;
  quantity: number;
  description?: string;
  status: 'PENDING' | 'READY_FOR_SHIPPING' | 'FLAGGED' | 'SHIPPED' | 'CANCELLED';
  method_of_shipping: 'AIR' | 'SEA';
  date_loading?: string;
  date_received: string;
  created_at: string;
  updated_at: string;
  days_in_warehouse?: number;
  is_ready_for_shipping?: boolean;
  is_flagged?: boolean;
}

export interface CustomerDailyUpdatesParams {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  count?: number;
  next?: string;
  previous?: string;
}

/**
 * Customer Daily Updates Service
 * Provides read-only access to air/sea containers and goods received (last 30 days)
 */
class CustomerDailyUpdatesService {
  private baseUrl = '/api/daily-updates/customer';

  /**
   * Get Air Cargo containers (last 30 days, read-only)
   */
  async getAirContainers(params?: CustomerDailyUpdatesParams): Promise<PaginatedResponse<CargoContainer>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const response = await apiClient.get(`${this.baseUrl}/air/containers/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Air Goods Received in China (last 30 days, read-only)
   */
  async getAirGoodsReceived(params?: CustomerDailyUpdatesParams): Promise<PaginatedResponse<GoodsReceivedChina>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const response = await apiClient.get(`${this.baseUrl}/air/goods-received/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Sea Cargo containers (last 30 days, read-only)
   */
  async getSeaContainers(params?: CustomerDailyUpdatesParams): Promise<PaginatedResponse<CargoContainer>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const response = await apiClient.get(`${this.baseUrl}/sea/containers/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Sea Goods Received in China (last 30 days, read-only)
   */
  async getSeaGoodsReceived(params?: CustomerDailyUpdatesParams): Promise<PaginatedResponse<GoodsReceivedChina>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

    const response = await apiClient.get(`${this.baseUrl}/sea/goods-received/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get detailed container information with cargo items
   */
  async getContainerDetails(containerId: string): Promise<{ success: boolean; data: CargoContainer; message: string }> {
    const response = await apiClient.get(`/api/daily-updates/customer/container/${containerId}/`);
    return response.data;
  }
}

export const customerDailyUpdatesService = new CustomerDailyUpdatesService();
export default customerDailyUpdatesService;

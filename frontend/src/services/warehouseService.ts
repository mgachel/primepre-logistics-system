import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface WarehouseItem {
  id: number;
  primepre_id: string;
  customer: number;
  customer_name?: string;
  shipping_mark: string;
  supply_tracking?: string;
  item_id?: string;
  description?: string;
  quantity: number;
  cbm: number;
  weight: number;
  supplier_name?: string;
  status: 'PENDING' | 'READY_FOR_SHIPPING' | 'SHIPPED' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'FLAGGED' | 'CANCELLED';
  warehouse_location?: string;
  date_received?: string;
  notes?: string;
  flagged_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseItemRequest {
  shipping_mark: string;
  description?: string;
  quantity: number;
  cbm: number;
  weight: number;
  supplier_name?: string;
  warehouse_location?: string;
  supply_tracking?: string;
  item_id?: string;
  notes?: string;
}

export interface UpdateWarehouseItemRequest {
  shipping_mark?: string;
  description?: string;
  quantity?: number;
  cbm?: number;
  weight?: number;
  supplier_name?: string;
  warehouse_location?: string;
  status?: 'PENDING' | 'READY_FOR_SHIPPING' | 'SHIPPED' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'FLAGGED' | 'CANCELLED';
  supply_tracking?: string;
  item_id?: string;
  notes?: string;
  flagged_reason?: string;
}

export interface WarehouseFilters {
  warehouse?: 'china' | 'ghana';
  status?: string;
  supplier_name?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseStats {
  total_items: number;
  pending: number;
  ready_for_shipping: number;
  shipped: number;
  flagged: number;
  cancelled: number;
  total_cbm: number;
  total_weight: number;
}

export const warehouseService = {
  // Get China warehouse items (customer view)
  async getChinaWarehouseItems(filters: Omit<WarehouseFilters, 'warehouse'> = {}): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/customer/goods/china/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<WarehouseItem>>(endpoint);
  },

  // Get Ghana warehouse items (customer view)
  async getGhanaWarehouseItems(filters: Omit<WarehouseFilters, 'warehouse'> = {}): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/api/customer/goods/ghana/?${params.toString()}`;
    return apiClient.get<PaginatedResponse<WarehouseItem>>(endpoint);
  },

  // Get all warehouse items (for staff/admin - using both endpoints)
  async getAllWarehouseItems(filters: WarehouseFilters = {}): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    const { warehouse, ...otherFilters } = filters;
    
    if (warehouse === 'china') {
      return this.getChinaWarehouseItems(otherFilters);
    } else if (warehouse === 'ghana') {
      return this.getGhanaWarehouseItems(otherFilters);
    } else {
      // Default to China if not specified
      return this.getChinaWarehouseItems(otherFilters);
    }
  },

  // Get warehouse item by ID (China)
  async getChinaWarehouseItemById(id: number): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.get<WarehouseItem>(`/api/customer/goods/china/${id}/`);
  },

  // Get warehouse item by ID (Ghana)
  async getGhanaWarehouseItemById(id: number): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.get<WarehouseItem>(`/api/customer/goods/ghana/${id}/`);
  },

  // Get China warehouse statistics
  async getChinaWarehouseStats(): Promise<ApiResponse<WarehouseStats>> {
    return apiClient.get<WarehouseStats>('/api/customer/goods/china/my_statistics/');
  },

  // Get Ghana warehouse statistics  
  async getGhanaWarehouseStats(): Promise<ApiResponse<WarehouseStats>> {
    return apiClient.get<WarehouseStats>('/api/customer/goods/ghana/my_statistics/');
  },

  // Get flagged items (China)
  async getChinaFlaggedItems(): Promise<ApiResponse<WarehouseItem[]>> {
    return apiClient.get<WarehouseItem[]>('/api/customer/goods/china/my_flagged_items/');
  },

  // Get flagged items (Ghana)
  async getGhanaFlaggedItems(): Promise<ApiResponse<WarehouseItem[]>> {
    return apiClient.get<WarehouseItem[]>('/api/customer/goods/ghana/my_flagged_items/');
  },

  // Get ready for shipping items (China)
  async getChinaReadyForShipping(): Promise<ApiResponse<WarehouseItem[]>> {
    return apiClient.get<WarehouseItem[]>('/api/customer/goods/china/ready_for_shipping/');
  },

  // Get ready for shipping items (Ghana)
  async getGhanaReadyForShipping(): Promise<ApiResponse<WarehouseItem[]>> {
    return apiClient.get<WarehouseItem[]>('/api/customer/goods/ghana/ready_for_shipping/');
  },

  // Get overdue items (China)
  async getChinaOverdueItems(days: number = 30): Promise<ApiResponse<WarehouseItem[]>> {
    return apiClient.get<WarehouseItem[]>(`/api/customer/goods/china/overdue_items/?days=${days}`);
  },

  // Get overdue items (Ghana)
  async getGhanaOverdueItems(days: number = 30): Promise<ApiResponse<WarehouseItem[]>> {
    return apiClient.get<WarehouseItem[]>(`/api/customer/goods/ghana/overdue_items/?days=${days}`);
  },

  // Track by supply tracking ID (China)
  async trackChinaBySupplyTracking(trackingId: string): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.get<WarehouseItem>(`/api/customer/goods/china/tracking/${trackingId}/`);
  },

  // Track by supply tracking ID (Ghana)
  async trackGhanaBySupplyTracking(trackingId: string): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.get<WarehouseItem>(`/api/customer/goods/ghana/tracking/${trackingId}/`);
  },

  // Staff/Admin endpoints for creating and updating (these would use different endpoints)
  // Note: These would need role-based endpoint switching between customer and admin endpoints
  
  // Create new China warehouse item (admin/staff only)
  async createChinaWarehouseItem(data: CreateWarehouseItemRequest): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.post<WarehouseItem>('/api/goods/china/', data);
  },

  // Create new Ghana warehouse item (admin/staff only)
  async createGhanaWarehouseItem(data: CreateWarehouseItemRequest): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.post<WarehouseItem>('/api/goods/ghana/', data);
  },

  // Update China warehouse item (admin/staff only)
  async updateChinaWarehouseItem(id: number, data: UpdateWarehouseItemRequest): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.put<WarehouseItem>(`/api/goods/china/${id}/`, data);
  },

  // Update Ghana warehouse item (admin/staff only)
  async updateGhanaWarehouseItem(id: number, data: UpdateWarehouseItemRequest): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.put<WarehouseItem>(`/api/goods/ghana/${id}/`, data);
  },

  // Delete China warehouse item (admin/staff only)
  async deleteChinaWarehouseItem(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/goods/china/${id}/`);
  },

  // Delete Ghana warehouse item (admin/staff only)
  async deleteGhanaWarehouseItem(id: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/goods/ghana/${id}/`);
  },

  // Admin list Ghana warehouse items
  async getAdminGhanaItems(filters: Partial<{ status: string; search: string; ordering: string; page: number; date_from: string; date_to: string; location: string; supplier_name: string; }>): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k,v])=>{ if (v!==undefined && v!==null && v!=='') params.append(k, String(v)); });
    return apiClient.get<PaginatedResponse<WarehouseItem>>(`/api/goods/ghana/?${params.toString()}`);
  },

  // Update Ghana item status via custom action
  async updateGhanaItemStatus(id: number, status: 'PENDING' | 'READY_FOR_DELIVERY' | 'FLAGGED' | 'DELIVERED' | 'CANCELLED', reason?: string): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.post<WarehouseItem>(`/api/goods/ghana/${id}/update_status/`, { status, reason });
  },

  // Bulk status update (admin/staff only)
  async bulkUpdateChinaStatus(ids: number[], status: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/goods/china/bulk_status_update/', { ids, status });
  },

  async bulkUpdateGhanaStatus(ids: number[], status: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/goods/ghana/bulk_status_update/', { ids, status });
  },

  // Excel upload (admin/staff only)
  async uploadChinaExcel(file: File): Promise<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('file', file);
  return apiClient.post<unknown>('/api/goods/china/upload_excel/', formData);
  },

  async uploadGhanaExcel(file: File): Promise<ApiResponse<unknown>> {
    const formData = new FormData();
    formData.append('file', file);
  return apiClient.post<unknown>('/api/goods/ghana/upload_excel/', formData);
  },

  // Download templates (admin/staff only)
  async downloadChinaTemplate(): Promise<Blob> {
    const response = await fetch('/api/goods/china/download_template/', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response.blob();
  },

  async downloadGhanaTemplate(): Promise<Blob> {
    const response = await fetch('/api/goods/ghana/download_template/', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    return response.blob();
  }
};
 
import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface WarehouseItem {
  id: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  warehouseLocation: string;
  status: 'available' | 'reserved' | 'low-stock' | 'out-of-stock';
  lastUpdated: string;
  description?: string;
  supplier?: string;
  minimumStock?: number;
  createdAt: string;
}

export interface CreateWarehouseItemRequest {
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  warehouseLocation: string;
  description?: string;
  supplier?: string;
  minimumStock?: number;
}

export interface UpdateWarehouseItemRequest {
  productName?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  warehouseLocation?: string;
  status?: 'available' | 'reserved' | 'low-stock' | 'out-of-stock';
  description?: string;
  supplier?: string;
  minimumStock?: number;
}

export interface WarehouseFilters {
  warehouse?: 'china' | 'ghana';
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseStats {
  totalItems: number;
  availableStock: number;
  reservedItems: number;
  lowStockAlert: number;
  totalValue: number;
  categories: { name: string; count: number }[];
}

export const warehouseService = {
  // Get all warehouse items
  async getWarehouseItems(filters: WarehouseFilters = {}): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/warehouse/items?${params.toString()}`;
    return apiClient.get<PaginatedResponse<WarehouseItem>>(endpoint);
  },

  // Get warehouse item by ID
  async getWarehouseItemById(id: string): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.get<WarehouseItem>(`/warehouse/items/${id}`);
  },

  // Create new warehouse item
  async createWarehouseItem(data: CreateWarehouseItemRequest): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.post<WarehouseItem>('/warehouse/items', data);
  },

  // Update warehouse item
  async updateWarehouseItem(id: string, data: UpdateWarehouseItemRequest): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.put<WarehouseItem>(`/warehouse/items/${id}`, data);
  },

  // Delete warehouse item
  async deleteWarehouseItem(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/warehouse/items/${id}`);
  },

  // Get China warehouse items
  async getChinaWarehouseItems(filters: Omit<WarehouseFilters, 'warehouse'> = {}): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    return this.getWarehouseItems({ ...filters, warehouse: 'china' });
  },

  // Get Ghana warehouse items
  async getGhanaWarehouseItems(filters: Omit<WarehouseFilters, 'warehouse'> = {}): Promise<ApiResponse<PaginatedResponse<WarehouseItem>>> {
    return this.getWarehouseItems({ ...filters, warehouse: 'ghana' });
  },

  // Get warehouse statistics
  async getWarehouseStats(warehouse?: 'china' | 'ghana'): Promise<ApiResponse<WarehouseStats>> {
    const params = warehouse ? `?warehouse=${warehouse}` : '';
    return apiClient.get<WarehouseStats>(`/warehouse/stats${params}`);
  },

  // Import warehouse data
  async importWarehouseData(file: File, warehouse: 'china' | 'ghana'): Promise<ApiResponse<{ imported: number; errors: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('warehouse', warehouse);
    
    return apiClient.post<{ imported: number; errors: number }>('/warehouse/import', formData);
  },

  // Export warehouse data
  async exportWarehouseData(warehouse: 'china' | 'ghana', format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const response = await fetch(`${apiClient['baseURL']}/warehouse/export?warehouse=${warehouse}&format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    return response.blob();
  },

  // Update stock quantity
  async updateStockQuantity(id: string, quantity: number): Promise<ApiResponse<WarehouseItem>> {
    return apiClient.patch<WarehouseItem>(`/warehouse/items/${id}/stock`, { quantity });
  },

  // Get low stock alerts
  async getLowStockAlerts(warehouse?: 'china' | 'ghana'): Promise<ApiResponse<WarehouseItem[]>> {
    const params = warehouse ? `?warehouse=${warehouse}` : '';
    return apiClient.get<WarehouseItem[]>(`/warehouse/alerts/low-stock${params}`);
  },
}; 
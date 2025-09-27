import { apiClient, ApiResponse } from './api';

// Simplified WarehouseAddress interface
export interface WarehouseAddress {
  id: number;
  name: string;
  location: string;
  address: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  created_by_name?: string;
}

// Create request interface - only the fields needed for creation
export interface CreateWarehouseRequest {
  name: string;
  location: string;
  address: string;
  description: string;
  is_active?: boolean;
}

// Update request interface 
export interface UpdateWarehouseRequest {
  name?: string;
  location?: string;
  address?: string;
  description?: string;
  is_active?: boolean;
}

// Office interface (keeping existing)
export interface Office {
  id: number;
  name: string;
  country: string;
  phone: string;
  address: string;
}

// Shipping Mark Formatting Rule interface
export interface ShippingMarkRule {
  id: number;
  rule_name: string;
  description: string;
  country: string;
  region: string;
  prefix_value: string;
  format_template: string;
  priority: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
}

// Create shipping mark rule request
export interface CreateShippingMarkRuleRequest {
  rule_name?: string;
  description?: string;
  country: string;
  region: string;
  prefix_value: string;
  format_template?: string;
  is_active?: boolean;
  priority?: number;
  is_default?: boolean;
}

// Update shipping mark rule request
export interface UpdateShippingMarkRuleRequest {
  rule_name?: string;
  description?: string;
  country?: string;
  region?: string;
  prefix_value?: string;
  format_template?: string;
  is_active?: boolean;
  priority?: number;
  is_default?: boolean;
}

class SettingsService {
  /**
   * Get warehouse addresses from the settings module database
   */
  async getWarehouseAddresses(): Promise<ApiResponse<WarehouseAddress[]>> {
    try {
      const response = await apiClient.get<WarehouseAddress[]>('/api/settings/warehouse-addresses/');
      
      // Handle DRF format - check if data has results property (paginated) or is direct array
      let warehousesData: WarehouseAddress[] = [];
      
      if (Array.isArray(response.data)) {
        // Direct array response
        warehousesData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Check for DRF paginated format
        if ('results' in response.data && Array.isArray((response.data as any).results)) {
          warehousesData = (response.data as any).results;
        } else {
          // Maybe it's a single object that should be an array
          warehousesData = [response.data as WarehouseAddress];
        }
      }
      
      return {
        success: response.success,
        data: warehousesData,
        message: response.message
      };
    } catch (error) {
      console.error('Error fetching warehouse addresses:', error);
      return {
        success: false,
        data: [],
        message: "Failed to fetch warehouse addresses"
      };
    }
  }

  /**
   * Get personalized warehouse addresses for clients (with placeholder replacement)
   */
  async getPersonalizedWarehouseAddresses(): Promise<ApiResponse<WarehouseAddress[]>> {
    try {
      const response = await apiClient.get<{data: WarehouseAddress[], client_info: any}>('/api/settings/warehouse-addresses/client-personalized/');
      
      return {
        success: response.success,
        data: response.data.data || [],
        message: response.message || 'Personalized warehouses retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching personalized warehouse addresses:', error);
      // Fallback to regular addresses if personalized endpoint fails
      return this.getWarehouseAddresses();
    }
  }

  /**
   * Create a new warehouse address
   */
  async createWarehouseAddress(data: CreateWarehouseRequest): Promise<ApiResponse<WarehouseAddress>> {
    try {
      console.log('Creating warehouse with data:', data);
      console.log('API URL will be:', '/api/settings/warehouse-addresses/');
      const response = await apiClient.post<WarehouseAddress>('/api/settings/warehouse-addresses/', data);
      console.log('Create warehouse response:', response);
      return response;
    } catch (error) {
      console.error('Error creating warehouse address:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error
      });
      return {
        success: false,
        data: {} as WarehouseAddress,
        message: error instanceof Error ? error.message : "Failed to create warehouse address"
      };
    }
  }

  /**
   * Update an existing warehouse address
   */
  async updateWarehouseAddress(id: number, data: UpdateWarehouseRequest): Promise<ApiResponse<WarehouseAddress>> {
    try {
      const response = await apiClient.put<WarehouseAddress>(`/api/settings/warehouse-addresses/${id}/`, data);
      return response;
    } catch (error) {
      console.error('Error updating warehouse address:', error);
      return {
        success: false,
        data: {} as WarehouseAddress,
        message: "Failed to update warehouse address"
      };
    }
  }

  /**
   * Delete a warehouse address
   */
  async deleteWarehouseAddress(id: number): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete<void>(`/api/settings/warehouse-addresses/${id}/`);
      return response;
    } catch (error) {
      console.error('Error deleting warehouse address:', error);
      return {
        success: false,
        data: undefined,
        message: "Failed to delete warehouse address"
      };
    }
  }

  /**
   * Get office addresses from the settings module
   */
  async getOfficeAddresses(): Promise<ApiResponse<Office[]>> {
    try {
      const response = await apiClient.get<Office[]>('/api/settings/company-offices/');
      return response;
    } catch (error) {
      console.error('Error fetching office addresses:', error);
      return {
        success: false,
        data: [],
        message: "Failed to fetch office addresses"
      };
    }
  }

  /**
   * Get shipping mark formatting rules
   */
  async getShippingMarkRules(): Promise<ApiResponse<ShippingMarkRule[]>> {
    try {
      console.log('Making API call to /api/settings/shipping-mark-rules/');
      const response = await apiClient.get<any>('/api/settings/shipping-mark-rules/');
      
      console.log('Raw API response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      
      // Handle DRF paginated response
      let data: ShippingMarkRule[] = [];
      if (response.data && response.data.results && Array.isArray(response.data.results)) {
        // Paginated response
        data = response.data.results;
        console.log('Found paginated results:', data.length, 'items');
      } else if (Array.isArray(response.data)) {
        // Direct array response
        data = response.data;
        console.log('Found direct array:', data.length, 'items');
      } else {
        console.warn('Unexpected response format:', response.data);
      }
      
      console.log('Processed data:', data);
      console.log('Processed data length:', data.length);
      
      return {
        success: true,
        data: data,
        message: "Shipping mark rules retrieved successfully"
      };
    } catch (error: unknown) {
      console.error('Error fetching shipping mark rules:', error);
      return {
        success: false,
        data: [],
        message: error instanceof Error ? error.message : "Failed to fetch shipping mark rules"
      };
    }
  }

  /**
   * Create a new shipping mark formatting rule
   */
  async createShippingMarkRule(data: CreateShippingMarkRuleRequest): Promise<ApiResponse<ShippingMarkRule>> {
    try {
      const response = await apiClient.post<ShippingMarkRule>('/api/settings/shipping-mark-rules/', data);
      return {
        success: true,
        data: response.data,
        message: "Shipping mark rule created successfully"
      };
    } catch (error: any) {
      console.error('Error creating shipping mark rule:', error);
      return {
        success: false,
        data: {} as ShippingMarkRule,
        message: error.response?.data?.message || "Failed to create shipping mark rule"
      };
    }
  }

  /**
   * Update an existing shipping mark formatting rule
   */
  async updateShippingMarkRule(id: number, data: UpdateShippingMarkRuleRequest): Promise<ApiResponse<ShippingMarkRule>> {
    try {
      const response = await apiClient.patch<ShippingMarkRule>(`/api/settings/shipping-mark-rules/${id}/`, data);
      return {
        success: true,
        data: response.data,
        message: "Shipping mark rule updated successfully"
      };
    } catch (error: any) {
      console.error('Error updating shipping mark rule:', error);
      return {
        success: false,
        data: {} as ShippingMarkRule,
        message: error.response?.data?.message || "Failed to update shipping mark rule"
      };
    }
  }

  /**
   * Delete a shipping mark formatting rule
   */
  async deleteShippingMarkRule(id: number): Promise<ApiResponse<null>> {
    try {
      await apiClient.delete(`/api/settings/shipping-mark-rules/${id}/`);
      return {
        success: true,
        data: null,
        message: "Shipping mark rule deleted successfully"
      };
    } catch (error: any) {
      console.error('Error deleting shipping mark rule:', error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || "Failed to delete shipping mark rule"
      };
    }
  }
}

export const settingsService = new SettingsService();
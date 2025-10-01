import { apiClient } from './api';

export interface ContainerExcelUploadResponse {
  success: boolean;
  upload_id: string;
  parsing_results: {
    total_rows: number;
    valid_candidates: number;
    invalid_rows: Array<{
      source_row_number: number;
      reason: string;
      raw_data: any;
    }>;
  };
  matching_results: {
    matched_items: Array<{
      candidate: any;
      customer: any;
    }>;
    unmatched_items: Array<{
      candidate: any;
      suggestions: Array<{
        customer: any;
        similarity_type: string;
        similarity_score?: number;
      }>;
    }>;
    duplicate_tracking_numbers: Array<{
      candidate: any;
      reason: string;
    }>;
    statistics: {
      total_candidates: number;
      matched_count: number;
      unmatched_count: number;
      duplicate_count: number;
    };
  };
}

export interface CreateItemsResponse {
  success: boolean;
  created_items: Array<{
    cargo_item_id: string;
    tracking_id: string;
    source_row_number: number;
    customer_name: string;
    action_taken?: string;
  }>;
  errors: Array<{
    error: string;
    mapping?: any;
    source_row_number?: number;
  }>;
  statistics: {
    total_created: number;
    total_errors: number;
  };
}

export interface CustomerSearchResponse {
  customers: Array<{
    id: number;
    shipping_mark: string;
    name: string;
    email: string;
    phone: string;
  }>;
}

class ContainerExcelService {
  async uploadExcel(containerId: string, file: File): Promise<ContainerExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    // container_id is now in the URL path, not form data

    const response = await apiClient.post(
      `/api/cargo/containers/${containerId}/excel/upload-new/`,
      formData
    );

    // Handle API client response format
    if (response.success && response.data) {
      return response.data as ContainerExcelUploadResponse;
    } else {
      throw new Error(response.message || 'Upload failed');
    }
  }

  async createItems(
    containerId: string, 
    matchedItems: any[], 
    resolvedMappings: any[]
  ): Promise<CreateItemsResponse> {
    const response = await apiClient.post('/api/cargo/containers/items/create/', {
      container_id: containerId,
      matched_items: matchedItems,
      resolved_mappings: resolvedMappings,
    });

    // Handle API client response format
    if (response.success && response.data) {
      return response.data as CreateItemsResponse;
    } else {
      throw new Error(response.message || 'Failed to create items');
    }
  }

  async searchCustomers(query: string, limit: number = 10): Promise<CustomerSearchResponse> {
    const response = await apiClient.get(`/api/cargo/customers/search/?q=${encodeURIComponent(query)}&limit=${limit}`);

    // Handle API client response format
    if (response.success && response.data) {
      return response.data as CustomerSearchResponse;
    } else {
      // Return empty result if API call failed
      return { customers: [] };
    }
  }
}

export const containerExcelService = new ContainerExcelService();
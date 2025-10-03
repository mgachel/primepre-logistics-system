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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

class ContainerExcelService {
  private allCustomersCache: CustomerSearchResponse["customers"] | null = null;
  private allCustomersFetchedAt = 0;
  private static readonly ALL_CUSTOMERS_TTL_MS = 5 * 60 * 1000;
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
    matchedItems: unknown[], 
    resolvedMappings: unknown[]
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

  async searchCustomers(query: string, limit: number = 20, page: number = 1): Promise<CustomerSearchResponse> {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('page', String(page));
    if (query) {
      params.append('q', query);
    }

    const url = `/api/cargo/customers/search/?${params.toString()}`;
    console.log(`[searchCustomers] Fetching: ${url}`);
    const response = await apiClient.get(url);

    console.log(`[searchCustomers] Response:`, response);
    // Handle API client response format
    if (response.success && response.data) {
      return response.data as CustomerSearchResponse;
    } else {
      console.warn(`[searchCustomers] API call failed:`, response.message);
      // Return empty result if API call failed
      return { customers: [] };
    }
  }

  async getAllCustomers(options: { force?: boolean } = {}): Promise<CustomerSearchResponse["customers"]> {
    const { force = false } = options;
    const now = Date.now();
    if (!force && this.allCustomersCache && now - this.allCustomersFetchedAt < ContainerExcelService.ALL_CUSTOMERS_TTL_MS) {
      return this.allCustomersCache;
    }

    const limit = 500;
    let page = 1;
    const aggregated: CustomerSearchResponse["customers"] = [];
    const seen = new Map<number, CustomerSearchResponse["customers"][number]>();

    console.log('[getAllCustomers] Starting full customer directory fetch...');
    try {
      while (true) {
        const response = await this.searchCustomers("", limit, page);
        const customers = response.customers || [];
        console.log(`[getAllCustomers] Page ${page}: received ${customers.length} customers, pagination:`, response.pagination);
        
        for (const customer of customers) {
          if (customer && typeof customer.id === "number") {
            seen.set(customer.id, customer);
          }
        }

        const hasMore = Boolean(response.pagination?.has_more);
        if (!hasMore) {
          console.log(`[getAllCustomers] Fetch complete. Total unique customers: ${seen.size}`);
          break;
        }
        page += 1;
        if (page > 200) {
          console.warn('[getAllCustomers] Safety limit reached (200 pages)');
          break; // safety guard to avoid infinite loops
        }
      }

      aggregated.push(...seen.values());
      this.allCustomersCache = aggregated;
      this.allCustomersFetchedAt = now;
      console.log(`[getAllCustomers] Cached ${aggregated.length} customers for future use`);
      return aggregated;
    } catch (error) {
      console.error("Failed to load full customer list:", error);
      const partial = Array.from(seen.values());
      if (partial.length) {
        this.allCustomersCache = partial;
        this.allCustomersFetchedAt = now;
        return partial;
      }
      if (this.allCustomersCache) {
        return this.allCustomersCache;
      }
      return [];
    }
  }

  clearCustomerCache() {
    this.allCustomersCache = null;
    this.allCustomersFetchedAt = 0;
  }
}

export const containerExcelService = new ContainerExcelService();
import { apiClient, ApiResponse, PaginatedResponse } from "./api";

// =====================================
// GOODS RECEIVED CONTAINER INTERFACES
// =====================================

export interface GoodsReceivedItem {
  id: string;
  container: string;
  customer?: number;
  customer_name?: string;
  shipping_mark: string;
  supply_tracking: string;
  description?: string;
  quantity: number;
  weight?: number;
  cbm?: number;
  length?: number;
  breadth?: number;
  height?: number;
  estimated_value?: number;
  supplier_name?: string;
  location?: string;
  status: "PENDING" | "READY_FOR_DELIVERY" | "FLAGGED" | "DELIVERED" | "CANCELLED";
  date_received: string;
  delivery_date?: string;
  notes?: string;
  days_in_warehouse: number;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceivedContainer {
  container_id: string;
  container_type: "air" | "sea";
  location: "china" | "ghana";
  arrival_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  total_weight?: number;
  total_cbm?: number;
  total_items_count: number;
  selected_rate_id?: string;
  rates?: number | string;
  dollar_rate?: number | string;
  status: "pending" | "processing" | "ready_for_delivery" | "delivered" | "flagged";
  notes?: string;
  created_at: string;
  updated_at: string;
  goods_items: GoodsReceivedItem[];
  items_by_shipping_mark: Record<string, GoodsReceivedItem[]>;
}

export interface CreateGoodsReceivedContainerRequest {
  container_id?: string;
  container_type: "air" | "sea";
  location: "china" | "ghana";
  arrival_date: string;
  expected_delivery_date?: string;
  notes?: string;
  status?: "pending" | "processing" | "ready_for_delivery" | "delivered" | "flagged";
}

export interface UpdateGoodsReceivedContainerRequest {
  container_id?: string;
  container_type?: "air" | "sea";
  location?: "china" | "ghana";
  arrival_date?: string;
  expected_delivery_date?: string;
  notes?: string;
  status?: "pending" | "processing" | "ready_for_delivery" | "delivered" | "flagged";
}

export interface CreateGoodsReceivedItemRequest {
  container: string;
  customer?: number;
  shipping_mark: string;
  supply_tracking: string;
  description?: string;
  quantity: number;
  weight?: number;
  cbm?: number;
  length?: number;
  breadth?: number;
  height?: number;
  estimated_value?: number;
  supplier_name?: string;
  location?: string;
  notes?: string;
}

export interface GoodsReceivedContainerStats {
  total_containers: number;
  pending_containers: number;
  processing_containers: number;
  ready_for_delivery: number;
  delivered_containers: number;
  flagged_containers: number;
  total_items: number;
  total_weight: number;
  total_cbm: number;
  air_containers: number;
  sea_containers: number;
}

export interface ContainerItemsResponse {
  container: GoodsReceivedContainer;
  items_by_shipping_mark: Record<string, GoodsReceivedItem[]>;
  total_items: number;
}

// =====================================
// GOODS RECEIVED CONTAINER SERVICE
// =====================================

class GoodsReceivedContainerService {
  
  // =====================================
  // CONTAINER OPERATIONS
  // =====================================
  
  async getContainers(
    filters: Partial<{
      container_type: "air" | "sea";
      location: "china" | "ghana";
      status: string;
      search: string;
      ordering: string;
      page: number;
      page_size: number;
    }>
  ): Promise<ApiResponse<PaginatedResponse<GoodsReceivedContainer>>> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        params.append(k, String(v));
    });
    return apiClient.get<PaginatedResponse<GoodsReceivedContainer>>(
      `/api/goods/containers/containers/?${params.toString()}`
    );
  }

  async getContainer(containerId: string): Promise<ApiResponse<GoodsReceivedContainer>> {
    return apiClient.get<GoodsReceivedContainer>(
      `/api/goods/containers/containers/${containerId}/`
    );
  }

  async createContainer(
    data: CreateGoodsReceivedContainerRequest
  ): Promise<ApiResponse<GoodsReceivedContainer>> {
    return apiClient.post<GoodsReceivedContainer>(
      "/api/goods/containers/containers/",
      data
    );
  }

  async updateContainer(
    containerId: string,
    data: UpdateGoodsReceivedContainerRequest
  ): Promise<ApiResponse<GoodsReceivedContainer>> {
    return apiClient.patch<GoodsReceivedContainer>(
      `/api/goods/containers/containers/${containerId}/`,
      data
    );
  }

  async deleteContainer(containerId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/goods/containers/containers/${containerId}/`);
  }

  async getContainerById(containerId: string): Promise<ApiResponse<GoodsReceivedContainer>> {
    return apiClient.get<GoodsReceivedContainer>(
      `/api/goods/containers/containers/${containerId}/`
    );
  }

  async getContainerItems(containerId: string): Promise<ApiResponse<ContainerItemsResponse>> {
    return apiClient.get<ContainerItemsResponse>(
      `/api/goods/containers/containers/${containerId}/items/`
    );
  }

  async addItemToContainer(
    containerId: string,
    data: Omit<CreateGoodsReceivedItemRequest, 'container'>
  ): Promise<ApiResponse<GoodsReceivedItem>> {
    return apiClient.post<GoodsReceivedItem>(
      `/api/goods/containers/containers/${containerId}/add_item/`,
      data
    );
  }

  async getContainerStatistics(
    filters?: Partial<{
      location: "china" | "ghana";
      container_type: "air" | "sea";
    }>
  ): Promise<ApiResponse<GoodsReceivedContainerStats>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "")
          params.append(k, String(v));
      });
    }
    return apiClient.get<GoodsReceivedContainerStats>(
      `/api/goods/containers/containers/statistics/?${params.toString()}`
    );
  }

  // =====================================
  // ITEM OPERATIONS
  // =====================================

  async getItems(
    filters: Partial<{
      container: string;
      shipping_mark: string;
      status: string;
      search: string;
      customer: number;
      ordering: string;
      page: number;
      page_size: number;
    }>
  ): Promise<ApiResponse<PaginatedResponse<GoodsReceivedItem>>> {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "")
        params.append(k, String(v));
    });
    return apiClient.get<PaginatedResponse<GoodsReceivedItem>>(
      `/api/goods/containers/items/?${params.toString()}`
    );
  }

  async getItem(itemId: string): Promise<ApiResponse<GoodsReceivedItem>> {
    return apiClient.get<GoodsReceivedItem>(`/api/goods/containers/items/${itemId}/`);
  }

  async createItem(data: CreateGoodsReceivedItemRequest): Promise<ApiResponse<GoodsReceivedItem>> {
    return apiClient.post<GoodsReceivedItem>("/api/goods/containers/items/", data);
  }

  async updateItem(
    itemId: string,
    data: Partial<CreateGoodsReceivedItemRequest>
  ): Promise<ApiResponse<GoodsReceivedItem>> {
    return apiClient.put<GoodsReceivedItem>(
      `/api/goods/containers/items/${itemId}/`,
      data
    );
  }

  async deleteItem(itemId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/goods/containers/items/${itemId}/`);
  }

  async updateItemStatus(
    itemId: string,
    status: string
  ): Promise<ApiResponse<GoodsReceivedItem>> {
    return apiClient.post<GoodsReceivedItem>(
      `/api/goods/containers/items/${itemId}/update_status/`,
      { status }
    );
  }

  async bulkUpdateItemStatus(
    itemIds: string[],
    status: string
  ): Promise<ApiResponse<{ message: string; updated_count: number }>> {
    return apiClient.post<{ message: string; updated_count: number }>(
      "/api/goods/containers/items/bulk_status_update/",
      { item_ids: itemIds, status }
    );
  }

  // =====================================
  // LOCATION-SPECIFIC HELPERS
  // =====================================

  // Ghana Air Containers
  async getGhanaAirContainers(
    filters?: Partial<{
      status: string;
      search: string;
      ordering: string;
      page: number;
      page_size: number;
    }>
  ): Promise<ApiResponse<PaginatedResponse<GoodsReceivedContainer>>> {
    return this.getContainers({
      ...filters,
      location: "ghana",
      container_type: "air"
    });
  }

  // Ghana Sea Containers
  async getGhanaSeaContainers(
    filters?: Partial<{
      status: string;
      search: string;
      ordering: string;
      page: number;
      page_size: number;
    }>
  ): Promise<ApiResponse<PaginatedResponse<GoodsReceivedContainer>>> {
    return this.getContainers({
      ...filters,
      location: "ghana",
      container_type: "sea"
    });
  }

  // China Air Containers
  async getChinaAirContainers(
    filters?: Partial<{
      status: string;
      search: string;
      ordering: string;
      page: number;
      page_size: number;
    }>
  ): Promise<ApiResponse<PaginatedResponse<GoodsReceivedContainer>>> {
    return this.getContainers({
      ...filters,
      location: "china",
      container_type: "air"
    });
  }

  // China Sea Containers
  async getChinaSeaContainers(
    filters?: Partial<{
      status: string;
      search: string;
      ordering: string;
      page: number;
      page_size: number;
    }>
  ): Promise<ApiResponse<PaginatedResponse<GoodsReceivedContainer>>> {
    return this.getContainers({
      ...filters,
      location: "china",
      container_type: "sea"
    });
  }

  // Statistics helpers
  async getGhanaAirStatistics(): Promise<ApiResponse<GoodsReceivedContainerStats>> {
    return this.getContainerStatistics({ location: "ghana", container_type: "air" });
  }

  async getGhanaSeaStatistics(): Promise<ApiResponse<GoodsReceivedContainerStats>> {
    return this.getContainerStatistics({ location: "ghana", container_type: "sea" });
  }

  async getChinaAirStatistics(): Promise<ApiResponse<GoodsReceivedContainerStats>> {
    return this.getContainerStatistics({ location: "china", container_type: "air" });
  }

  async getChinaSeaStatistics(): Promise<ApiResponse<GoodsReceivedContainerStats>> {
    return this.getContainerStatistics({ location: "china", container_type: "sea" });
  }
}

export const goodsReceivedContainerService = new GoodsReceivedContainerService();
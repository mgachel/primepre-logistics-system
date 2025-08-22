import { apiClient, ApiResponse, PaginatedResponse } from "./api";
import { BackendCargoContainer, BackendCargoItem } from "./cargoService";

// Backend response types for customer shipments API
interface CustomerShipmentsResponse {
  customer_info: {
    shipping_mark: string;
    customer_name: string;
  };
  goods_received_china: {
    total: number;
    pending: number;
    shipped: number;
    items: BackendCargoItem[];
  };
  goods_received_ghana: {
    total: number;
    pending: number;
    shipped: number;
    items: BackendCargoItem[];
  };
  sea_cargo: {
    total: number;
    pending: number;
    in_transit: number;
    delivered: number;
    items: BackendCargoItem[];
  };
  air_cargo: {
    total: number;
    pending: number;
    in_transit: number;
    delivered: number;
    items: BackendCargoItem[];
  };
}

interface CustomerShipmentStatsResponse {
  customer_info: {
    shipping_mark: string;
    customer_name: string;
  };
  categories: {
    goods_received_china: {
      total: number;
      pending: number;
      shipped: number;
    };
    goods_received_ghana: {
      total: number;
      pending: number;
      shipped: number;
    };
    sea_cargo: {
      total: number;
      pending: number;
      in_transit: number;
      delivered: number;
    };
    air_cargo: {
      total: number;
      pending: number;
      in_transit: number;
      delivered: number;
    };
  };
  totals: {
    total_items: number;
    total_pending: number;
  };
}

// Customer Shipment Types (simplified view for customers)
export interface CustomerShipment {
  id: string;
  tracking_id: string;
  type: "Sea Cargo" | "Air Cargo";
  status: "pending" | "in_transit" | "delivered" | "delayed" | "processing";
  origin: string;
  destination: string;
  date: string;
  eta?: string;
  delivered_date?: string | null;
  description: string;
  quantity: number;
  weight?: number | null;
  cbm: number;
  value?: number | null;
  container_id?: string;
  shipping_mark?: string;
  // Derived fields
  container_info?: {
    container_id: string;
    cargo_type: "sea" | "air";
    route: string;
    load_date: string;
    eta: string;
    status: string;
  };
}

export interface ShipmentFilters {
  search?: string;
  status?: string;
  cargo_type?: "sea" | "air";
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface ShipmentStats {
  total_shipments: number;
  pending_shipments: number;
  in_transit_shipments: number;
  delivered_shipments: number;
  delayed_shipments: number;
  total_containers: number;
  total_value: number;
  total_weight: number;
  total_cbm: number;
}

export const customerShipmentsService = {
  // Get customer cargo items (shipments) - filtered by current user's shipping mark
  async getShipments(
    filters: ShipmentFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<CustomerShipment>>> {
    const params = new URLSearchParams();

    if (filters.search) params.append("search", filters.search);
    if (filters.status) params.append("status", filters.status);
    if (filters.cargo_type) params.append("cargo_type", filters.cargo_type);
    if (filters.date_from) params.append("date_from", filters.date_from);
    if (filters.date_to) params.append("date_to", filters.date_to);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.page_size)
      params.append("page_size", filters.page_size.toString());

    // Use the customer shipments endpoint that properly filters by shipping mark
    const response = await apiClient.get<CustomerShipmentsResponse>(
      `/api/cargo/customer/shipments/?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error("Failed to fetch customer shipments");
    }

    // Extract cargo items from the appropriate sections based on cargo_type filter
    let allItems: Array<BackendCargoItem & { sourceType: "sea" | "air" }> = [];

    if (!filters.cargo_type || filters.cargo_type === "sea") {
      const seaItems = (response.data.sea_cargo?.items || []).map((item) => ({
        ...item,
        sourceType: "sea" as const,
      }));
      allItems = allItems.concat(seaItems);
    }
    if (!filters.cargo_type || filters.cargo_type === "air") {
      const airItems = (response.data.air_cargo?.items || []).map((item) => ({
        ...item,
        sourceType: "air" as const,
      }));
      allItems = allItems.concat(airItems);
    }

    // Transform cargo items to customer shipments format
    const shipments: CustomerShipment[] = allItems.map((item) => ({
      id: item.id,
      tracking_id: item.tracking_id,
      type: item.sourceType === "air" ? "Air Cargo" : "Sea Cargo",
      status: item.status,
      origin: "China",
      destination: "Ghana",
      date: item.created_at,
      eta: undefined, // Container ETA not available in this response
      delivered_date: item.delivered_date,
      description: item.item_description,
      quantity: item.quantity,
      weight: item.weight,
      cbm: item.cbm,
      value: item.total_value,
      container_id: item.container,
      shipping_mark: item.client_shipping_mark,
    }));

    // Apply pagination (simple client-side for now)
    const page = filters.page || 1;
    const pageSize = filters.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedShipments = shipments.slice(startIndex, endIndex);

    return {
      data: {
        results: paginatedShipments,
        count: shipments.length,
        next: endIndex < shipments.length ? `page=${page + 1}` : null,
        previous: page > 1 ? `page=${page - 1}` : null,
      },
      success: true,
    };
  },

  // Get shipment statistics - filtered by current user's shipping mark
  async getShipmentStats(
    cargo_type?: "sea" | "air"
  ): Promise<ApiResponse<ShipmentStats>> {
    try {
      // Use the customer shipment stats endpoint that filters by shipping mark
      const params = new URLSearchParams();
      if (cargo_type) {
        params.append("cargo_type", cargo_type);
      }

      const response = await apiClient.get<CustomerShipmentStatsResponse>(
        `/api/cargo/customer/shipments/stats/?${params.toString()}`
      );

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch shipment stats");
      }

      // Extract stats based on cargo type filter
      const categories = response.data.categories;
      let totalShipments = 0;
      let inTransitShipments = 0;
      let deliveredShipments = 0;
      let pendingShipments = 0;

      if (!cargo_type || cargo_type === "sea") {
        const seaStats = categories.sea_cargo;
        totalShipments += seaStats.total || 0;
        inTransitShipments += seaStats.in_transit || 0;
        deliveredShipments += seaStats.delivered || 0;
        pendingShipments += seaStats.pending || 0;
      }

      if (!cargo_type || cargo_type === "air") {
        const airStats = categories.air_cargo;
        totalShipments += airStats.total || 0;
        inTransitShipments += airStats.in_transit || 0;
        deliveredShipments += airStats.delivered || 0;
        pendingShipments += airStats.pending || 0;
      }

      const stats: ShipmentStats = {
        total_shipments: totalShipments,
        pending_shipments: pendingShipments,
        in_transit_shipments: inTransitShipments,
        delivered_shipments: deliveredShipments,
        delayed_shipments: 0, // Not provided by backend stats endpoint
        total_containers: 0, // Not provided by backend stats endpoint
        total_value: 0, // Would need to be calculated from items
        total_weight: 0, // Would need to be calculated from items
        total_cbm: 0, // Would need to be calculated from items
      };

      return {
        data: stats,
        success: true,
      };
    } catch (error) {
      console.error("Error fetching shipment stats:", error);
      throw error;
    }
  },

  // Get single shipment details
  async getShipmentById(id: string): Promise<ApiResponse<CustomerShipment>> {
    try {
      // Get the specific cargo item
      const itemResponse = await apiClient.get<BackendCargoItem>(
        `/api/cargo/customer/cargo-items/${id}/`
      );

      // Get container information if available
      let container: BackendCargoContainer | undefined;
      if (itemResponse.data.container) {
        try {
          const containerResponse = await apiClient.get<BackendCargoContainer>(
            `/api/cargo/customer/containers/${itemResponse.data.container}/`
          );
          container = containerResponse.data;
        } catch (error) {
          console.warn("Could not fetch container details:", error);
        }
      }

      // Transform to customer shipment format
      const shipment: CustomerShipment = {
        id: itemResponse.data.id,
        tracking_id: itemResponse.data.tracking_id,
        type: container?.cargo_type === "air" ? "Air Cargo" : "Sea Cargo",
        status: itemResponse.data.status,
        origin: "China",
        destination: "Ghana",
        date: itemResponse.data.created_at,
        eta: container?.eta,
        delivered_date: itemResponse.data.delivered_date,
        description: itemResponse.data.item_description,
        quantity: itemResponse.data.quantity,
        weight: itemResponse.data.weight,
        cbm: itemResponse.data.cbm,
        value: itemResponse.data.total_value,
        container_id: itemResponse.data.container,
        shipping_mark: itemResponse.data.client_shipping_mark,
        container_info: container
          ? {
              container_id: container.container_id,
              cargo_type: container.cargo_type,
              route: container.route,
              load_date: container.load_date,
              eta: container.eta,
              status: container.status,
            }
          : undefined,
      };

      return {
        data: shipment,
        success: true,
      };
    } catch (error) {
      console.error("Error fetching shipment details:", error);
      throw error;
    }
  },

  // Search shipments
  async searchShipments(
    query: string
  ): Promise<ApiResponse<CustomerShipment[]>> {
    const response = await this.getShipments({ search: query, page_size: 50 });
    return {
      data: response.data.results,
      success: response.success,
    };
  },
};

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search,
  Plane,
  Package,
  RefreshCcw,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";

import {
  goodsReceivedContainerService,
  GoodsReceivedContainer,
  GoodsReceivedContainerStats,
} from "@/services/goodsReceivedContainerService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Map status to badge-friendly values
function mapStatus(
  status: GoodsReceivedContainer["status"]
): "pending" | "in-transit" | "delivered" | "delayed" | "error" {
  switch (status) {
    case "pending":
      return "pending";
    case "processing":
      return "in-transit";
    case "ready_for_delivery":
      return "delivered";
    case "delivered":
      return "delivered";
    case "flagged":
      return "error";
    default:
      return "pending";
  }
}

export default function CustomerWarehouseAir() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "processing" | "ready_for_delivery" | "delivered" | "flagged"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<GoodsReceivedContainer[]>([]);
  const [dashboard, setDashboard] = useState<GoodsReceivedContainerStats | null>(null);

  // Load Ghana Air containers and dashboard
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusParam = statusFilter === "all" ? undefined : statusFilter;

        const [listRes, dashRes] = await Promise.all([
          goodsReceivedContainerService.getCustomerGhanaAirContainers({
            search: searchTerm || undefined,
            status: statusParam,
            page_size: 100,
          }),
          goodsReceivedContainerService.getCustomerGhanaAirStatistics(),
        ]);

        if (!ignore) {
          const containersData = listRes.data?.results || listRes.data || [];
          setContainers(Array.isArray(containersData) ? containersData : []);
          setDashboard(dashRes.data || null);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load warehouse containers:", error);
          setError("Failed to load containers");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [statusFilter, searchTerm]);

  const reloadData = async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === "all" ? undefined : statusFilter;

      const filters = {
        search: searchTerm || undefined,
        status: statusParam,
        page_size: 100,
      };
      
      const [listRes, dashRes] = await Promise.all([
        goodsReceivedContainerService.getCustomerGhanaAirContainers(filters),
        goodsReceivedContainerService.getCustomerGhanaAirStatistics(),
      ]);

      const containersData = listRes.data?.results || listRes.data || [];
      setContainers(Array.isArray(containersData) ? containersData : []);
      setDashboard(dashRes.data || null);
      
      toast({
        title: "Data Refreshed",
        description: "Container data has been updated.",
      });
    } catch (error) {
      console.error("Failed to reload data:", error);
      toast({
        variant: "destructive",
        title: "Failed to refresh",
        description: "Could not reload container data.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle row click to view container details
  const handleRowClick = (row: GoodsReceivedContainer) => {
    navigate(`/customer/warehouse/air/container/${row.container_id}`);
  };

  // Filter containers based on search and status
  const filteredContainers = useMemo(() => {
    if (!containers || !Array.isArray(containers)) {
      return [];
    }
    
    let result = containers;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.container_id.toLowerCase().includes(term) ||
          (c.notes && c.notes.toLowerCase().includes(term))
      );
    }

    return result;
  }, [containers, searchTerm, statusFilter]);

  // Table columns - matching admin page structure
  const columns: Column<GoodsReceivedContainer>[] = [
    {
      id: "container",
      header: "Container ID",
      accessor: (row) => (
        <div className="font-mono font-medium text-sky-600">{row.container_id}</div>
      ),
      sort: (a, b) => a.container_id.localeCompare(b.container_id),
      width: "150px",
    },
    {
      id: "type",
      header: "Type",
      accessor: (_row) => (
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-sky-600" />
          <span className="font-medium">Air</span>
        </div>
      ),
      width: "100px",
    },
    {
      id: "arrival_date",
      header: "Arrival Date",
      accessor: (row) => (
        <div className="text-sm">
          {row.arrival_date ? formatDate(row.arrival_date) : <span className="text-muted-foreground">Not set</span>}
        </div>
      ),
      sort: (a, b) => {
        const aDate = a.arrival_date ? new Date(a.arrival_date).getTime() : 0;
        const bDate = b.arrival_date ? new Date(b.arrival_date).getTime() : 0;
        return bDate - aDate;
      },
      width: "120px",
    },
    {
      id: "route",
      header: "Route",
      accessor: (_row) => (
        <div className="text-sm">
          <div className="font-medium">China → Ghana</div>
          <div className="text-xs text-muted-foreground">Air Freight</div>
        </div>
      ),
      width: "140px",
    },
    {
      id: "rates",
      header: "Rates",
      accessor: (row) => (
        <div className="text-sm">
          {row.rates ? (
            <span className="font-medium">¥{Number(row.rates).toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
      sort: (a, b) => (a.rates || 0) - (b.rates || 0),
      width: "100px",
    },
    {
      id: "dollar_rate",
      header: "$ Rate",
      accessor: (row) => (
        <div className="text-sm">
          {row.dollar_rate ? (
            <span className="font-medium">${Number(row.dollar_rate).toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
      sort: (a, b) => (a.dollar_rate || 0) - (b.dollar_rate || 0),
      width: "100px",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => (
        <StatusBadge status={mapStatus(row.status)}>
          {row.status?.replace("_", " ").toUpperCase() || "PENDING"}
        </StatusBadge>
      ),
      sort: (a, b) => (a.status || "").localeCompare(b.status || ""),
      width: "130px",
    },
    {
      id: "items",
      header: "Items",
      accessor: (row) => (
        <div className="text-center font-medium">{row.total_items_count || 0}</div>
      ),
      sort: (a, b) => (a.total_items_count || 0) - (b.total_items_count || 0),
      width: "80px",
    },
  ];

  // Loading state
  if (loading && containers.length === 0) {
    return (
      <div className="logistics-container">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Package className="h-8 w-8 animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your warehouse containers...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && containers.length === 0) {
    return (
      <div className="logistics-container">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={reloadData} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="logistics-container">
      {/* Header */}
      <div className="logistics-header">
        <div className="logistics-title-section">
          <div className="logistics-icon-wrapper bg-sky-100">
            <Plane className="logistics-icon text-sky-600" />
          </div>
          <div>
            <h1 className="logistics-title">Local Warehouse - Air</h1>
            <p className="logistics-subtitle">
              View your air cargo containers and goods in Ghana warehouse
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reloadData}
            disabled={loading}
          >
            <RefreshCcw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Dashboard - matching admin page */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-sky-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Containers</p>
                <p className="text-2xl font-bold">{dashboard.total_containers || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Plane className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Your Items</p>
                <p className="text-2xl font-bold">{dashboard.total_items || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(dashboard.pending_containers || 0) + (dashboard.processing_containers || 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ready</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboard.ready_for_delivery || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="logistics-filters">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by container ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="ready_for_delivery">Ready for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        id="customer-warehouse-air-containers"
        rows={filteredContainers}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        rowActions={(row) => (
          <DropdownMenuItem key="view" onClick={() => handleRowClick(row)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}
        empty={
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No containers found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search or filter"
                : "No air containers with your goods available yet"}
            </p>
          </div>
        }
      />
    </div>
  );
}

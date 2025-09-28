import { useEffect, useState } from "react";
import {
  Package,
  Search,
  Upload,
  Plus,
  Download,
  CheckCircle2,
  Flag,
  Plane,
  Trash2,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewGoodsDialog } from "@/components/dialogs/NewGoodsDialog";
import { ExcelUploadButton } from "@/components/ui/ExcelUploadButton";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  warehouseService,
  WarehouseItem,
  AdminWarehouseStatistics,
} from "@/services/warehouseService";
import { useToast } from "@/hooks/use-toast";

export default function GoodsReceivedChinaAir() {
  const { toast } = useToast();
  const PAGE_SIZE = 20;
  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    | "all"
    | "PENDING"
    | "READY_FOR_SHIPPING"
    | "FLAGGED"
    | "SHIPPED"
    | "CANCELLED"
  >("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<AdminWarehouseStatistics | null>(null);

  // Fetch data
  const fetchData = async (currentPage = 1, isNewSearch = false) => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: status === "all" ? undefined : status,
      };

      // Use AIR cargo specific endpoint
      const response = await warehouseService.getChinaAirGoods(params);
      const newItems = response.data?.results || [];

      if (isNewSearch || currentPage === 1) {
        setItems(Array.isArray(newItems) ? newItems : []);
      } else {
        setItems((prev) => [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(newItems) ? newItems : [])]);
      }

      setHasMore(!!response.data?.next);
      setPage(currentPage);
    } catch (error) {
      console.error("Failed to fetch China air goods:", error);
      setItems([]); // Ensure we always have an array on error
      toast({
        title: "Error",
        description: "Failed to load goods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await warehouseService.getChinaAirStatistics();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch China air statistics:", error);
    }
  };

  useEffect(() => {
    fetchData(1, true);
    fetchStats();
  }, [search, status]);

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchData(page + 1);
    }
  };

  const handleStatusUpdate = async (item: WarehouseItem, newStatus: string) => {
    try {
      await warehouseService.updateChinaGoodsStatus(item.id, newStatus);
      await fetchData(1, true);
      await fetchStats();
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: WarehouseItem) => {
    try {
      await warehouseService.deleteChinaGoods(item.id);
      await fetchData(1, true);
      await fetchStats();
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const columns: Column<WarehouseItem>[] = [
    {
      id: "shipping_mark",
      header: "Shipping Mark",
      accessor: (item) => item.shipping_mark || "-",
      sort: (a, b) => (a.shipping_mark || "").localeCompare(b.shipping_mark || ""),
      sticky: true,
    },
    {
      id: "supply_tracking",
      header: "Supply Tracking",
      accessor: (item) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {item.supply_tracking}
        </code>
      ),
      sort: (a, b) => a.supply_tracking.localeCompare(b.supply_tracking),
    },
    {
      id: "description",
      header: "Description",
      accessor: (item) => (
        <div className="max-w-xs truncate" title={item.description || ""}>
          {item.description || "-"}
        </div>
      ),
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (item) => item.quantity?.toString() || "-",
      sort: (a, b) => (a.quantity || 0) - (b.quantity || 0),
    },
    {
      id: "weight",
      header: "Weight (kg)",
      accessor: (item) => item.weight?.toString() || "-",
      sort: (a, b) => (a.weight || 0) - (b.weight || 0),
    },
    {
      id: "status",
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status} />,
      sort: (a, b) => a.status.localeCompare(b.status),
    },
    {
      id: "date_received",
      header: "Date Received",
      accessor: (item) =>
        new Date(item.date_received).toLocaleDateString(),
      sort: (a, b) =>
        new Date(a.date_received).getTime() -
        new Date(b.date_received).getTime(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
                <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground">
            China Goods Received - Air Shipments
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Manage individual goods received via air shipments in China warehouse
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExcelUploadButton
            uploadUrl="/api/goods/china/upload_excel/"
            templateUrl="/api/goods/china/download_template/"
            onUploadSuccess={() => {
              fetchData(1, true);
              fetchStats();
            }}
          />
          <Button
            onClick={() => setShowNewGoodsDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Goods Received
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={stats?.total_count || 0}
          icon={Package}
          trend="neutral"
        />
        <MetricCard
          title="Pending"
          value={stats?.pending_count || 0}
          icon={Package}
          trend="neutral"
        />
        <MetricCard
          title="Ready for Shipping"
          value={stats?.ready_for_shipping_count || 0}
          icon={CheckCircle2}
          trend="positive"
        />
        <MetricCard
          title="Flagged"
          value={stats?.flagged_count || 0}
          icon={Flag}
          trend={stats?.flagged_count ? "negative" : "neutral"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking, mark, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(value: any) => setStatus(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="READY_FOR_SHIPPING">Ready for Shipping</SelectItem>
            <SelectItem value="FLAGGED">Flagged</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        id="china-air-goods"
        rows={Array.isArray(items) ? items : []}
        columns={columns}
        loading={loading}
        defaultSort={{ column: "date_received", direction: "desc" }}
        empty={
          <div className="text-center py-8">
            <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No air cargo found
            </h3>
            <p className="text-muted-foreground">
              Add air cargo goods or adjust your search filters
            </p>
          </div>
        }
        rowActions={(item) => (
          <>
            <DropdownMenuItem
              onClick={() => handleStatusUpdate(item, "READY_FOR_SHIPPING")}
              disabled={item.status === "READY_FOR_SHIPPING"}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Ready
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusUpdate(item, "FLAGGED")}
              disabled={item.status === "FLAGGED"}
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag Item
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(item)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      />

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}

      {/* New Goods Dialog */}
      <NewGoodsDialog
        open={showNewGoodsDialog}
        onOpenChange={setShowNewGoodsDialog}
        warehouseType="china"
        defaultShippingMethod="AIR"
        onSuccess={() => {
          fetchData(1, true);
          fetchStats();
        }}
      />
    </div>
  );
}
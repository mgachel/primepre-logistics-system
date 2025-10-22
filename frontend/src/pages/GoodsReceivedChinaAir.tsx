// GoodsReceivedChinaAir.tsx
import { useEffect, useState } from "react";
import {
  Package,
  Search,
  Plus,
  CheckCircle2,
  Flag,
  Plane,
  Trash2,
  Edit,
  Save,
  X,
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
  UpdateWarehouseItemRequest,
} from "@/services/warehouseService";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

// role-aware colors are computed inside the component using auth state

// =====================================================
// Component
// =====================================================
export default function GoodsReceivedChinaAir() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = "#00703D";

  const primaryColor = isCustomer ? "#2563eb" : ADMIN_GREEN;

  // Common style helpers
  const buttonStyle = { backgroundColor: primaryColor, color: "#FFFFFF" };
  const outlineButtonStyle = { borderColor: primaryColor, color: primaryColor };
  const iconStyle = { color: primaryColor };
  const PAGE_SIZE = 20;

  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "all" | "PENDING" | "READY_FOR_SHIPPING" | "FLAGGED" | "SHIPPED" | "CANCELLED"
  >("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Partial<UpdateWarehouseItemRequest>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState<AdminWarehouseStatistics | null>(null);

  // =====================================================
  // Data Fetching
  // =====================================================
  const fetchData = async (currentPage = 1, isNewSearch = false) => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: PAGE_SIZE,
        search: search || undefined,
        status: status === "all" ? undefined : status,
      };
      const response = await warehouseService.getChinaAirGoods(params);
      const newItems = response.data?.results || [];

      if (isNewSearch || currentPage === 1) {
        setItems(Array.isArray(newItems) ? newItems : []);
      } else {
        setItems((prev) => [
          ...(Array.isArray(prev) ? prev : []),
          ...(Array.isArray(newItems) ? newItems : []),
        ]);
      }

      setHasMore(!!response.data?.next);
      setPage(currentPage);
    } catch (error) {
      console.error("Failed to fetch China air goods:", error);
      setItems([]);
      toast({
        title: "Error",
        description: "Failed to load goods. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await warehouseService.getChinaAirStatistics();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch China air statistics:", error);
    }
  };

  // =====================================================
  // Edit / Update Handlers
  // =====================================================
  const handleEditStart = (item: WarehouseItem) => {
    setEditingItem(item.id);
    setEditingData({
      shipping_mark: item.shipping_mark || undefined,
      supply_tracking: item.supply_tracking || undefined,
      description: item.description ?? undefined,
      quantity: item.quantity,
      weight: item.weight ?? undefined,
      status: item.status,
    });
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditingData({});
  };

  const handleEditSave = async () => {
    if (!editingItem || !editingData) return;
    try {
      setSaving(true);
      await warehouseService.updateChinaWarehouseItem(editingItem, editingData);
      await fetchData(1, true);
      await fetchStats();
      setEditingItem(null);
      setEditingData({});
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    } catch (error) {
      console.error("Failed to update item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof WarehouseItem, value: any) => {
    setEditingData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

  // =====================================================
  // Table Columns
  // =====================================================
  const columns: Column<WarehouseItem>[] = [
    {
      id: "shipping_mark",
      header: "Shipping Mark",
      accessor: (item) =>
        editingItem === item.id ? (
          <Input
            value={editingData.shipping_mark || ""}
            onChange={(e) => handleFieldChange("shipping_mark", e.target.value)}
            className="w-full"
          />
        ) : (
          item.shipping_mark || "-"
        ),
      sort: (a, b) => (a.shipping_mark || "").localeCompare(b.shipping_mark || ""),
      sticky: true,
    },
    {
      id: "supply_tracking",
      header: "Supply Tracking",
      accessor: (item) =>
        editingItem === item.id ? (
          <Input
            value={editingData.supply_tracking || ""}
            onChange={(e) => handleFieldChange("supply_tracking", e.target.value)}
            className="w-full"
          />
        ) : (
          <code
            className="text-xs bg-muted px-2 py-1 rounded"
            style={{ color: primaryColor }}
          >
            {item.supply_tracking}
          </code>
        ),
      sort: (a, b) => a.supply_tracking.localeCompare(b.supply_tracking),
    },
    {
      id: "description",
      header: "Description",
      accessor: (item) =>
        editingItem === item.id ? (
          <Input
            value={editingData.description || ""}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            className="w-full"
          />
        ) : (
          <div className="max-w-xs truncate" title={item.description || ""}>
            {item.description || "-"}
          </div>
        ),
    },
    {
      id: "quantity",
      header: "Quantity",
      accessor: (item) =>
        editingItem === item.id ? (
          <Input
            type="number"
            value={editingData.quantity || ""}
            onChange={(e) => handleFieldChange("quantity", parseInt(e.target.value) || 0)}
            className="w-full"
          />
        ) : (
          item.quantity?.toString() || "-"
        ),
      sort: (a, b) => (a.quantity || 0) - (b.quantity || 0),
    },
    {
      id: "weight",
      header: "Weight (kg)",
      accessor: (item) =>
        editingItem === item.id ? (
          <Input
            type="number"
            step="0.01"
            value={editingData.weight || ""}
            onChange={(e) => handleFieldChange("weight", parseFloat(e.target.value) || 0)}
            className="w-full"
          />
        ) : (
          item.weight?.toString() || "-"
        ),
      sort: (a, b) => (a.weight || 0) - (b.weight || 0),
    },
    {
      id: "status",
      header: "Status",
      accessor: (item) =>
        editingItem === item.id ? (
          <Select
            value={editingData.status || item.status}
            onValueChange={(value) => handleFieldChange("status", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CLEARED">Cleared</SelectItem>
              <SelectItem value="READY_FOR_DELIVERY">Ready for Delivery</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={item.status} />
        ),
      sort: (a, b) => a.status.localeCompare(b.status),
    },
    {
      id: "date_received",
      header: "Date Received",
      accessor: (item) => new Date(item.date_received).toLocaleDateString(),
      sort: (a, b) =>
        new Date(a.date_received).getTime() - new Date(b.date_received).getTime(),
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (item) =>
        editingItem === item.id ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEditSave} disabled={saving} className="h-8 w-8 p-0" style={buttonStyle}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-8 w-8 p-0" style={outlineButtonStyle}>
              <X className="h-4 w-4" style={iconStyle} />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEditStart(item)}
            className="h-8 w-8 p-0"
            style={outlineButtonStyle}
          >
            <Edit className="h-4 w-4" style={iconStyle} />
          </Button>
        ),
    },
  ];

  // =====================================================
  // Render
  // =====================================================
  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground">
            China Goods Received - Air Shipments
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            Manage individual goods received via air shipments in China warehouse
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExcelUploadButton
            uploadType="goods_received"
            warehouse="China"
            style={buttonStyle}
            onUploadComplete={() => {
              fetchData(1, true);
              fetchStats();
            }}
          />
          <Button
            onClick={() => setShowNewGoodsDialog(true)}
            className="flex items-center gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            style={buttonStyle}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: "#FFFFFF" }} />
            <span className="hidden xs:inline">Add Goods</span>
            <span className="xs:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Items"
          value={stats?.total_count || 0}
          icon={Package}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + "22"}
        />
        <MetricCard
          title="Pending"
          value={stats?.pending_count || 0}
          icon={Package}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + "22"}
        />
        <MetricCard
          title="Ready for Shipping"
          value={stats?.ready_for_shipping_count || 0}
          icon={CheckCircle2}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + "22"}
        />
        <MetricCard
          title="Flagged"
          value={stats?.flagged_count || 0}
          icon={Flag}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + "22"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by tracking, mark, or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No air cargo found</h3>
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
              <CheckCircle2 className="h-4 w-4 mr-2" style={iconStyle} />
              Mark Ready
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusUpdate(item, "FLAGGED")}
              disabled={item.status === "FLAGGED"}
            >
              <Flag className="h-4 w-4 mr-2" style={iconStyle} />
              Flag Item
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      />

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <Button variant="outline" onClick={loadMore} disabled={loading} style={outlineButtonStyle}>
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
 
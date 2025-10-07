import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import {
  Search,
  Plus,
  Plane,
  Calendar,
  Package,
  RefreshCcw,
  Edit,
  Settings,
  Trash2,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewGoodsReceivedContainerDialog } from "@/components/dialogs/NewGoodsReceivedContainerDialog";
import { EditGoodsReceivedContainerDialog } from "@/components/dialogs/EditGoodsReceivedContainerDialog";

import { ExcelUploadButton } from "@/components/ui/ExcelUploadButton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

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
      return "delivered"; // Ready for delivery shows as completed/delivered
    case "delivered":
      return "delivered";
    case "flagged":
      return "error"; // Flagged items show as error
    default:
      return "pending";
  }
}

export default function GoodsReceivedGhanaAir() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Check if user is customer (user_role is CUSTOMER and not an admin)
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;

  const [searchTerm, setSearchTerm] = useState("");
  const [showNewContainerDialog, setShowNewContainerDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "processing" | "ready_for_delivery" | "delivered" | "flagged"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<GoodsReceivedContainer[]>([]);
  const [dashboard, setDashboard] = useState<GoodsReceivedContainerStats | null>(null);


  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatusContainer, setSelectedStatusContainer] = useState<GoodsReceivedContainer | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editContainer, setEditContainer] = useState<GoodsReceivedContainer | null>(null);

  // Load Ghana Air containers and dashboard
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusParam = statusFilter === "all" ? undefined : statusFilter;

        const [listRes, dashRes] = await Promise.all([
          goodsReceivedContainerService.getGhanaAirContainers({
            search: searchTerm || undefined,
            status: statusParam,
            page_size: 100,
          }),
          goodsReceivedContainerService.getGhanaAirStatistics(),
        ]);

        if (!ignore) {
          setContainers(listRes.data?.results || []);
          setDashboard(dashRes.data || null);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load Ghana Air containers:", error);
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
      
      console.log('Fetching Ghana Air containers with filters:', filters);
      
      const [listRes, dashRes] = await Promise.all([
        goodsReceivedContainerService.getGhanaAirContainers(filters),
        goodsReceivedContainerService.getGhanaAirStatistics(),
      ]);

      console.log('Ghana Air containers fetched:', listRes.data?.results?.length, 'containers');
      console.log('Containers data:', listRes.data?.results);
      
      setContainers(listRes.data?.results || []);
      setDashboard(dashRes.data || null);
    } catch (error) {
      console.error("Failed to reload data:", error);
      setError("Failed to reload containers");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatusContainer || !newStatus) return;

    try {
      await goodsReceivedContainerService.updateContainer(
        selectedStatusContainer.container_id,
        { status: newStatus as "pending" | "in_transit" | "arrived" | "cleared" }
      );
      toast({
        title: "Status updated",
        description: `${selectedStatusContainer.container_id} → ${newStatus.replace("_", " ")}`,
      });
      setShowStatusDialog(false);
      setSelectedStatusContainer(null);
      setNewStatus("");
      await reloadData();
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unable to update",
        variant: "destructive",
      });
    }
  };

  const filteredContainers = useMemo(() => {
    return containers.filter(container => {
      const matchesSearch = !searchTerm || 
        container.container_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.created_at?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [containers, searchTerm, statusFilter]);

  // Table columns - different for customers vs admins
  const columns: Column<GoodsReceivedContainer>[] = isCustomer ? [
    // Customer columns: Airline (AWB ID) and Offloading Date
    {
      id: "container",
      header: "Airline",
      accessor: (row) => (
        <div className="font-mono font-medium">{row.container_id}</div>
      ),
      sort: (a, b) => a.container_id.localeCompare(b.container_id),
    },
    {
      id: "offloading_date",
      header: "Offloading Date",
      accessor: (row) => (
        <div className="text-sm">
          <div className="font-medium">
            {row.arrival_date ? formatDate(row.arrival_date) : "Not set"}
          </div>
        </div>
      ),
      sort: (a, b) => {
        const aDate = a.arrival_date ? new Date(a.arrival_date).getTime() : 0;
        const bDate = b.arrival_date ? new Date(b.arrival_date).getTime() : 0;
        return bDate - aDate;
      },
      width: "140px",
    },
  ] : [
    // Admin columns: All columns
    {
      id: "container",
      header: "AWB ID",
      accessor: (row) => (
        <div className="font-mono font-medium">{row.container_id}</div>
      ),
      sort: (a, b) => a.container_id.localeCompare(b.container_id),
    },
    {
      id: "type",
      header: "Shipment Type",
      accessor: (row) => (
        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium uppercase">
          {row.container_type === 'sea' ? 'Sea Cargo' : 'Air Cargo'}
        </div>
      ),
      width: "120px",
    },
    {
      id: "offloading_date",
      header: "Offloading Date",
      accessor: (row) => (
        <div className="text-sm">
          <div className="font-medium">
            {row.arrival_date ? formatDate(row.arrival_date) : "Not set"}
          </div>
        </div>
      ),
      sort: (a, b) => {
        const aDate = a.arrival_date ? new Date(a.arrival_date).getTime() : 0;
        const bDate = b.arrival_date ? new Date(b.arrival_date).getTime() : 0;
        return bDate - aDate;
      },
      width: "140px",
    },
    {
      id: "route",
      header: "Route",
      accessor: (_row) => (
        <div className="text-sm font-medium">
          China to Ghana
        </div>
      ),
      width: "120px",
    },
    {
      id: "rates",
      header: "Rates ($)",
      accessor: (row) => (
        <div className="text-sm font-medium">
          {row.rates ? `$${row.rates}` : "Not set"}
        </div>
      ),
      width: "100px",
    },
    {
      id: "dollar_rate",
      header: "Dollar Rate (₵)",
      accessor: (row) => (
        <div className="text-sm font-medium">
          {row.dollar_rate ? `₵${row.dollar_rate}` : "Not set"}
        </div>
      ),
      width: "110px",
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
      width: "120px",
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
            <p className="text-muted-foreground">Loading Ghana Air containers...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="logistics-container">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <Button onClick={reloadData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="logistics-container">
      {/* Header matching cargo structure */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Plane className="h-8 w-8 text-blue-600" />
            Ghana Air - Goods Received
          </h1>
          <p className="text-muted-foreground">
            Manage air cargo containers received in Ghana warehouse
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isCustomer && (
            <>
              <ExcelUploadButton 
                onUploadSuccess={reloadData}
                uploadType="goods-received-air"
              />
              <Button onClick={() => setShowNewContainerDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Container
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats cards matching cargo structure - Admin Only */}
      {!isCustomer && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Containers</p>
                <p className="text-2xl font-bold">{dashboard?.total_containers || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{dashboard?.total_items || 0}</p>
              </div>
            </div>
          </div>

          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Ready for Delivery</p>
                <p className="text-2xl font-bold">{dashboard?.ready_for_delivery || 0}</p>
              </div>
            </div>
          </div>

          <div className="logistics-card p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{dashboard?.pending || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters matching cargo structure */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by airway bill, customer, or tracking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          {["all", "pending", "processing", "ready_for_delivery", "delivered", "flagged"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s as typeof statusFilter)}
            >
              {s === "all"
                ? "All"
                : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
          >
            <RefreshCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
        </div>
      </div>

      {/* Main DataTable matching cargo structure */}
      <div className="logistics-card">
        <DataTable
          id="goods-received-ghana-air"
          rows={filteredContainers}
          columns={columns}
          loading={loading}
          defaultSort={{ column: "created_at", direction: "desc" }}
          empty={<p className="text-muted-foreground">No air cargo containers yet.</p>}
          rowActions={(row) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  navigate(`/goods-received/${row.container_id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              {!isCustomer && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedStatusContainer(row);
                      setNewStatus(row.status || "pending");
                      setShowStatusDialog(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" /> Update Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditContainer(row);
                      setEditOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Delete container ${row.container_id}? This cannot be undone.`
                        )
                      )
                        return;
                      
                      try {
                        await goodsReceivedContainerService.deleteContainer(row.container_id);
                        await reloadData();
                        toast({
                          title: "Deleted",
                          description: `${row.container_id} removed.`,
                        });
                      } catch (e: unknown) {
                        toast({
                          title: "Delete failed",
                          description: e instanceof Error ? e.message : "Unable to delete",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        />
      </div>

      {/* Status Update Dialog matching cargo structure */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Container Status</DialogTitle>
            <DialogDescription>
              Change the status of the selected container.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Container ID:{" "}
                <span className="font-medium">
                  {selectedStatusContainer?.container_id}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Current Status:{" "}
                <span className="font-medium">
                  {selectedStatusContainer?.status?.replace("_", " ")}
                </span>
              </p>
            </div>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready_for_delivery">Ready for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={
                !newStatus || newStatus === selectedStatusContainer?.status
              }
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs matching cargo structure */}
      <NewGoodsReceivedContainerDialog
        open={showNewContainerDialog}
        onOpenChange={setShowNewContainerDialog}
        defaultType="air"
        location="ghana"
        onCreated={async (containerId) => {
          await reloadData();
          toast({
            title: "Created",
            description: `Air container ${containerId} created.`,
          });
        }}
      />

      <EditGoodsReceivedContainerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        container={editContainer}
        onSaved={async () => {
          await reloadData();
          toast({
            title: "Updated",
            description: "Container updated successfully.",
          });
        }}
      />


    </div>
  );
}
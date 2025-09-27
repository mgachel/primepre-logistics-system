import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Ship,
  Calendar,
  Package,
  RefreshCcw,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewCargoContainerDialog } from "@/components/dialogs/NewCargoContainerDialog";
import { EditCargoContainerDialog } from "@/components/dialogs/EditCargoContainerDialog";
import { ContainerDetailsDialog } from "@/components/dialogs/ContainerDetailsDialog";
import { ExcelUploadButton } from "@/components/ui/ExcelUploadButton";
import {
  cargoService,
  BackendCargoContainer,
  CargoDashboardStats,
} from "@/services/cargoService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";
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

// Map backend status to badge-friendly values
function mapStatus(
  status: BackendCargoContainer["status"]
): "in-transit" | "delivered" | "pending" | "delayed" {
  switch (status) {
    case "in_transit":
      return "in-transit";
    case "delivered":
      return "delivered";
    case "pending":
      return "pending";
    case "demurrage":
      return "delayed";
    default:
      return "pending";
  }
}

export default function GhanaSeaContainers() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const [selectedContainer, setSelectedContainer] =
    useState<BackendCargoContainer | null>(null);
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in-transit" | "pending" | "delivered"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);
  const [dashboard, setDashboard] = useState<CargoDashboardStats | null>(null);

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatusContainer, setSelectedStatusContainer] =
    useState<BackendCargoContainer | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editContainer, setEditContainer] =
    useState<BackendCargoContainer | null>(null);

  // Load Ghana sea containers and dashboard
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusParam =
          statusFilter === "all"
            ? undefined
            : statusFilter === "in-transit"
            ? "in_transit"
            : statusFilter;

        const [listRes, dashRes] = await Promise.all([
          cargoService.getContainers({
            cargo_type: "sea",
            location: "ghana",
            warehouse_type: "goods_received",
            search: searchTerm || undefined,
            status: statusParam,
          }),
          cargoService.getDashboard("sea", "ghana", "goods_received"),
        ]);

        if (!ignore) {
          setContainers(listRes.data?.results || []);
          setDashboard(dashRes.data || null);
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to load Ghana sea containers";
        if (!ignore) setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [searchTerm, statusFilter]);

  // Reload data
  const reloadData = async () => {
    const statusParam =
      statusFilter === "all"
        ? undefined
        : statusFilter === "in-transit"
        ? "in_transit"
        : statusFilter;

    const [listRes, dashRes] = await Promise.all([
      cargoService.getContainers({
        cargo_type: "sea",
        location: "ghana",
        warehouse_type: "goods_received",
        search: searchTerm || undefined,
        status: statusParam,
      }),
      cargoService.getDashboard("sea", "ghana", "goods_received"),
    ]);

    setContainers(listRes.data?.results || []);
    setDashboard(dashRes.data || null);
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatusContainer || !newStatus) return;

    try {
      await cargoService.updateBackendContainer(
        selectedStatusContainer.container_id,
        {
          status: newStatus as
            | "pending"
            | "in_transit"
            | "delivered"
            | "demurrage",
        }
      );
      toast({
        title: "Status updated",
        description: `${selectedStatusContainer.container_id} → ${newStatus}`,
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

  const filteredCargo = useMemo(() => containers, [containers]);

  // Table columns
  const cols: Column<BackendCargoContainer>[] = [
    {
      id: "created_at",
      header: "Created",
      accessor: () => "",
      sort: (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      width: "0px",
    },
    {
      id: "container",
      header: "Container No.",
      accessor: (c) => <span className="font-medium">{c.container_id}</span>,
      sort: (a, b) => a.container_id.localeCompare(b.container_id),
      sticky: true,
      clickable: true,
    },
    {
      id: "offloading_date",
      header: "Offloading Date",
      accessor: (c) =>
        c.unloading_date ? (
          <span className="text-sm">{formatDate(c.unloading_date)}</span>
        ) : c.load_date ? (
          <span className="text-sm">{formatDate(c.load_date)}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
      sort: (a, b) => (a.unloading_date || a.load_date || "").localeCompare(b.unloading_date || b.load_date || ""),
    },
    {
      id: "eta",
      header: "ETA",
      accessor: (c) => (
        <div>
          <div
            className={
              isOverdue(c.eta) ? "text-red-600 font-medium" : undefined
            }
          >
            {formatDate(c.eta)}
          </div>
          <div className="text-xs text-muted-foreground">
            {isOverdue(c.eta)
              ? `${daysLate(c.eta)} days late`
              : formatRelative(c.eta) || ""}
          </div>
        </div>
      ),
      sort: (a, b) => (a.eta || "").localeCompare(b.eta || ""),
    },
    {
      id: "cbm",
      header: "Total CBM",
      accessor: (c) => {
        const totalCbm = c.cbm || 0;
        return totalCbm > 0 ? (
          <span className="text-sm">{totalCbm.toFixed(3)} m³</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
      sort: (a, b) => {
        const cbmA = a.cbm || 0;
        const cbmB = b.cbm || 0;
        return cbmA - cbmB;
      },
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      accessor: (c) => <StatusBadge status={mapStatus(c.status)} />,
    },
    {
      id: "clients",
      header: "Clients",
      accessor: (c) => `${c.total_clients}`,
      sort: (a, b) => a.total_clients - b.total_clients,
      align: "right",
      width: "80px",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground flex items-center">
            <Ship className="h-5 w-5 lg:h-6 lg:w-6 mr-3 text-primary" />
            Ghana Goods Received - Sea Cargo
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base mt-1">
            Manage sea cargo containers and goods received in Ghana warehouse
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewCargoDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sea Container
          </Button>
          <ExcelUploadButton
            uploadType="sea_cargo"
            variant="outline"
            onUploadComplete={(response) => {
              toast({
                title: "Excel upload completed",
                description: `Processed ${response.summary.created || 0} sea cargo items`,
              });
              window.location.reload();
            }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">
                Ghana Sea Containers
              </div>
              <div className="text-2xl font-semibold mt-1">
                {dashboard?.total_containers ?? 0}
              </div>
            </div>
            <Package className="h-8 w-8 text-primary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-semibold mt-1">
                {dashboard?.pending_containers ?? 0}
              </div>
            </div>
            <Package className="h-8 w-8 text-orange-500/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">In Transit</div>
              <div className="text-2xl font-semibold mt-1">
                {dashboard?.containers_in_transit ?? 0}
              </div>
            </div>
            <Ship className="h-8 w-8 text-blue-500/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Delivered</div>
              <div className="text-2xl font-semibold mt-1">
                {dashboard?.delivered_containers ?? 0}
              </div>
            </div>
            <Calendar className="h-8 w-8 text-green-500/60" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by container number or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: string) => setStatusFilter(value as "all" | "in-transit" | "pending" | "delivered")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Containers Table */}
      <DataTable
        id="ghana-sea-containers"
        columns={cols}
        rows={filteredCargo}
        loading={loading}
        onRowClick={(container) => {
          navigate(`/ghana-container/${container.container_id}`);
        }}
        rowActions={(container) => (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/ghana-container/${container.container_id}`);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditContainer(container);
                setEditOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStatusContainer(container);
                setNewStatus(container.status);
                setShowStatusDialog(true);
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                // Handle delete
                toast({
                  title: "Delete container",
                  description: "Delete functionality will be implemented",
                });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
        empty={
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No containers found</h3>
            <p className="text-muted-foreground mb-4">
              Add your first Ghana sea container or adjust your search filters
            </p>
            <Button onClick={() => setShowNewCargoDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sea Container
            </Button>
          </div>
        }
      />

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Container Status</DialogTitle>
            <DialogDescription>
              Change the status of container {selectedStatusContainer?.container_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="demurrage">Demurrage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
            >
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

      {/* Dialogs */}
      <NewCargoContainerDialog
        open={showNewCargoDialog}
        onOpenChange={setShowNewCargoDialog}
        defaultType="sea"
        location="ghana"
        warehouse_type="goods_received"
        onCreated={async (containerId) => {
          await reloadData();
          toast({
            title: "Created",
            description: `Ghana sea container ${containerId} created.`,
          });
        }}
      />

      <EditCargoContainerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        container={editContainer}
        onSaved={async () => {
          await reloadData();
        }}
      />

      <ContainerDetailsDialog
        open={showContainerDetails}
        onOpenChange={setShowContainerDetails}
        container={selectedContainer}
      />
    </div>
  );
}
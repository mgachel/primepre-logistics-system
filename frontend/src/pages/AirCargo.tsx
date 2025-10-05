import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuthStore } from "@/stores/authStore";
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

// ✅ Map backend status to badge-friendly values
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
      return "delayed"; // closest match
    default:
      return "pending";
  }
}

export default function AirCargo() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === "CUSTOMER";

  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const [selectedContainer, _setSelectedContainer] =
    useState<BackendCargoContainer | null>(null);
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in-transit" | "pending" | "delivered"
  >("all");
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);
  const [dashboard, setDashboard] = useState<CargoDashboardStats | null>(null);

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatusContainer, setSelectedStatusContainer] =
    useState<BackendCargoContainer | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [editContainer, setEditContainer] =
    useState<BackendCargoContainer | null>(null);

  // ✅ Load air containers and dashboard
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

        // Use customer endpoints if user is a customer
        if (isCustomer) {
          const [listRes, dashRes] = await Promise.all([
            cargoService.getCustomerAirCargoContainers({
              search: searchTerm || undefined,
              status: statusParam,
              page_size: 100,
            }),
            cargoService.getCustomerAirCargoDashboard(),
          ]);
          if (!ignore) {
            setContainers(Array.isArray(listRes?.results) ? listRes.results : []);
            setDashboard(dashRes || null);
          }
        } else {
          // Use admin endpoints
          const [listRes, dashRes] = await Promise.all([
            cargoService.getContainers({
              cargo_type: "air",
              search: searchTerm || undefined,
              status: statusParam,
            }),
            cargoService.getDashboard("air"),
          ]);
          if (!ignore) {
            setContainers(listRes.data?.results || []);
            setDashboard(dashRes.data || null);
          }
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to load air cargo";
        if (!ignore) setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [searchTerm, statusFilter, isCustomer]);

  // ✅ Reload data
  const reloadData = async () => {
    const statusParam =
      statusFilter === "all"
        ? undefined
        : statusFilter === "in-transit"
        ? "in_transit"
        : statusFilter;

    if (isCustomer) {
      const [listRes, dashRes] = await Promise.all([
        cargoService.getCustomerAirCargoContainers({
          search: searchTerm || undefined,
          status: statusParam,
          page_size: 100,
        }),
        cargoService.getCustomerAirCargoDashboard(),
      ]);
      setContainers(Array.isArray(listRes?.results) ? listRes.results : []);
      setDashboard(dashRes || null);
    } else {
      const [listRes, dashRes] = await Promise.all([
        cargoService.getContainers({
          cargo_type: "air",
          search: searchTerm || undefined,
          status: statusParam,
        }),
        cargoService.getDashboard("air"),
      ]);
      setContainers(listRes.data?.results || []);
      setDashboard(dashRes.data || null);
    }
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

  // ✅ Table columns - Filter for customers
  const cols = useMemo(() => {
    const allCols: Column<BackendCargoContainer>[] = [
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
        header: "Airway Bill No.",
        accessor: (c) => <span className="font-medium">{c.container_id}</span>,
        sort: (a, b) => a.container_id.localeCompare(b.container_id),
        sticky: true,
        clickable: true,
      },
      {
        id: "loading_date",
        header: "Flight Date",
        accessor: (c) =>
          c.load_date ? (
            <span className="text-sm">{formatDate(c.load_date)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
        sort: (a, b) => (a.load_date || "").localeCompare(b.load_date || ""),
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
        id: "weight",
        header: "Total Weight",
        accessor: (c) => {
          const totalWeight = c.total_weight || c.weight || 0;
          return totalWeight > 0 ? (
            <span className="text-sm">{totalWeight.toFixed(1)} kg</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          );
        },
        sort: (a, b) => {
          const weightA = a.total_weight || a.weight || 0;
          const weightB = b.total_weight || b.weight || 0;
          return weightA - weightB;
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
    
    if (isCustomer) {
      // Customers only see: Airway Bill No., Flight Date, and ETA
      return allCols.filter(col => 
        col.id === "container" || 
        col.id === "loading_date" || 
        col.id === "eta"
      );
    }
    return allCols;
  }, [isCustomer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground flex items-center">
            <Plane className="h-5 w-5 lg:h-6 lg:w-6 mr-3 text-primary" />
            {isCustomer ? "My Air Cargo" : "Air Cargo"}
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base mt-1">
            {isCustomer
              ? "View containers where your goods are located"
              : "Manage air freight shipments • All times shown in your local time zone"}
          </p>
        </div>
        {!isCustomer && (
          <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
            <Button onClick={() => setShowNewCargoDialog(true)} className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Air Container
            </Button>
            <ExcelUploadButton
              uploadType="air_cargo"
              variant="outline"
              onUploadComplete={(response) => {
                toast({
                  title: "Excel upload completed",
                  description: `Processed ${response.summary.created || 0} air cargo items`,
                });
                window.location.reload();
              }}
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">
                Total Shipments
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
              <div className="text-sm text-muted-foreground">In Transit</div>
              <div className="text-2xl font-semibold mt-1">
                {dashboard?.containers_in_transit ?? 0}
              </div>
            </div>
            <Plane className="h-8 w-8 text-secondary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Weight</div>
              <div className="text-2xl font-semibold mt-1">
                {filteredCargo
                  .reduce(
                    (sum, c) => sum + (c.total_weight || c.weight || 0),
                    0
                  )
                  .toFixed(1)}{" "}
                kg
              </div>
            </div>
            <Package className="h-8 w-8 text-accent/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">This Month</div>
              <div className="text-2xl font-semibold mt-1">8</div>
            </div>
            <Calendar className="h-8 w-8 text-warning/60" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by airway bill, client, or tracking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          {["all", "in-transit", "pending", "delivered"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s as "all" | "in-transit" | "pending" | "delivered")}
            >
              {s === "all"
                ? "All"
                : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
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
            <RefreshCcw className="h-4 w-4 mr-1" /> Reset filters
          </Button>
        </div>
      </div>

      {/* Cargo Table */}
      <div className="logistics-card p-4">
        <DataTable
          id="air-cargo"
          rows={filteredCargo}
          columns={cols}
          loading={loading}
          defaultSort={{ column: "created_at", direction: "desc" }}
          empty={<p className="text-muted-foreground">No air cargo yet.</p>}
          rowActions={(row) =>
            isCustomer ? (
              <DropdownMenuItem
                onClick={() => {
                  navigate(`/customer/cargo/air/container/${row.container_id}`);
                }}
              >
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    navigate(`/containers/${row.container_id}`);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedStatusContainer(row);
                    setNewStatus(row.status);
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
                        `Delete air container ${row.container_id}? This cannot be undone.`
                      )
                    )
                      return;
                    try {
                      await cargoService.deleteBackendContainer(row.container_id);
                      await reloadData();
                      toast({
                        title: "Deleted",
                        description: `${row.container_id} removed.`,
                      });
                    } catch (e: unknown) {
                      toast({
                        title: "Delete failed",
                        description:
                          e instanceof Error ? e.message : "Unable to delete",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )
          }
        />
      </div>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Air Container Status</DialogTitle>
            <DialogDescription>
              Change the status of the selected air container.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Airway Bill:{" "}
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
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="demurrage">Demurrage</SelectItem>
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

      {/* Dialogs */}
      <NewCargoContainerDialog
        open={showNewCargoDialog}
        onOpenChange={setShowNewCargoDialog}
        defaultType="air"
        onCreated={async (containerId) => {
          await reloadData();
          toast({
            title: "Created",
            description: `Air container ${containerId} created.`,
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

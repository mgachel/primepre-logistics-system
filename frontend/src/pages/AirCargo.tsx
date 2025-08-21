import { useEffect, useMemo, useState } from "react";
import {
  Ship,
  Plane,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  Upload,
  MapPin,
  RefreshCcw,
  Edit,
  Eye,
  Trash2,
  FileDown,
  Settings,
} from "lucide-react";
import { EditCargoContainerDialog } from "@/components/dialogs/EditCargoContainerDialog";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewCargoContainerDialog } from "@/components/dialogs/NewCargoContainerDialog";
import { ContainerDetailsDialog } from "@/components/dialogs/ContainerDetailsDialog";
import { useNavigate } from "react-router-dom";
import {
  cargoService,
  BackendCargoContainer,
  BackendCargoItem,
  CargoDashboardStats,
} from "@/services/cargoService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatDate, formatRelative } from "@/lib/date";
// If "@/lib/persist" does not exist, add a fallback implementation here:
export function persistGet<T = string>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const value = window.localStorage.getItem(key);
    return value !== null ? (JSON.parse(value) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}
export function persistSet<T = string>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
import { useToast } from "@/hooks/use-toast";

interface AirCargoItem {
  id: string;
  awbNumber: string;
  client: string;
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  departureDate: string;
  arrivalDate: string;
  weight: string;
  volume: string;
  goods: string;
  status: "in-transit" | "delivered" | "pending" | "delayed";
  notes: string;
}

export default function AirCargo() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("air-cargos");
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BackendCargoItem[]>([]);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);
  const [dashboard, setDashboard] = useState<CargoDashboardStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "in_transit" | "delivered" | "pending" | "delayed"
  >(persistGet("air:filterStatus", "all"));

  // View dialog state
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewContainer, setViewContainer] =
    useState<BackendCargoContainer | null>(null);

  // Status dialog state
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedStatusContainer, setSelectedStatusContainer] =
    useState<BackendCargoContainer | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [editOpen, setEditOpen] = useState(false);
  const [editContainer, setEditContainer] =
    useState<BackendCargoContainer | null>(null);

  // Container details state
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [selectedContainer, setSelectedContainer] =
    useState<AirCargoItem | null>(null);

  // Load air cargo data (containers) + dashboard
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [containersRes, dashRes] = await Promise.all([
          cargoService.getContainers({ cargo_type: "air" }),
          cargoService.getDashboard("air"),
        ]);
        if (!ignore) {
          const airContainers = containersRes.data?.results || [];
          setContainers(airContainers);
          setDashboard(dashRes.data || null);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load air cargo";
        if (!ignore) setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Reload data function
  const reloadData = async () => {
    try {
      const [containersRes, dashRes] = await Promise.all([
        cargoService.getContainers({ cargo_type: "air" }),
        cargoService.getDashboard("air"),
      ]);
      setContainers(containersRes.data?.results || []);
      setDashboard(dashRes.data || null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reload air cargo";
      setError(msg);
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
        description: `${
          selectedStatusContainer.container_id
        } → ${newStatus.replace("_", " ")}`,
      });
      setShowStatusDialog(false);
      setSelectedStatusContainer(null);
      setNewStatus("");
      // Reload data to get fresh state
      await reloadData();
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unable to update",
        variant: "destructive",
      });
    }
  };

  const filtered = useMemo(() => {
    let list = containers;
    if (filterStatus !== "all") {
      const statusMap = {
        in_transit: "in_transit",
        delivered: "delivered",
        pending: "pending",
        delayed: "demurrage", // map delayed to demurrage status
      };
      list = list.filter(
        (c) => c.status === statusMap[filterStatus as keyof typeof statusMap]
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.container_id.toLowerCase().includes(q) ||
          (c.route || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [containers, filterStatus, searchTerm]);

  const counts = useMemo(
    () => ({
      all: containers.length,
      in_transit: containers.filter((c) => c.status === "in_transit").length,
      delivered: containers.filter((c) => c.status === "delivered").length,
      pending: containers.filter((c) => c.status === "pending").length,
      delayed: containers.filter((c) => c.status === "demurrage").length,
    }),
    [containers]
  );

  type Row = {
    id: string;
    tracking: string;
    awb: string;
    client: string;
    route: string;
    airline: string;
    flight: string;
    departure: string;
    arrival: string;
    eta: string | null;
    status: "in-transit" | "delivered" | "pending" | "delayed";
    _raw: BackendCargoContainer;
  };

  const rows: Row[] = useMemo(
    () =>
      filtered.map((container) => {
        const status: Row["status"] =
          container.status === "in_transit"
            ? "in-transit"
            : container.status === "demurrage"
            ? "delayed"
            : (container.status as Row["status"]);
        return {
          id: container.container_id,
          tracking: container.container_id,
          awb: container.container_id,
          client: `${container.total_clients} clients`,
          route: container.route ?? "-",
          airline: "-",
          flight: "-",
          departure: container.load_date
            ? formatDate(new Date(container.load_date))
            : "-",
          arrival: container.unloading_date
            ? formatDate(new Date(container.unloading_date))
            : "-",
          eta: container.eta ?? null,
          status,
          _raw: container,
        };
      }),
    [filtered]
  );

  // Helper function to check if a date is overdue (in the past)
  function isOverdue(date: Date): boolean {
    return date.getTime() < new Date().getTime();
  }
  
    const columns: Column<Row>[] = [
    {
      id: "select",
      header: (
        <input type="checkbox" className="rounded" aria-label="Select all" />
      ),
      accessor: () => (
        <input type="checkbox" className="rounded" aria-label="Select row" />
      ),
      width: "48px",
      sticky: true,
    },
    {
      id: "tracking",
      header: "Container/AWB",
      accessor: (r) => <span className="font-medium">{r.tracking}</span>,
      sort: (a, b) => a.tracking.localeCompare(b.tracking),
      sticky: true,
    },
    {
      id: "awb",
      header: "AWB Number",
      accessor: (r) => <span className="font-mono text-sm">{r.awb}</span>,
      sort: (a, b) => a.awb.localeCompare(b.awb),
    },
    {
      id: "client",
      header: "Client",
      accessor: (r) => r.client,
      sort: (a, b) => a.client.localeCompare(b.client),
    },
    {
      id: "route",
      header: "Route",
      accessor: (r) => (
        <div className="flex items-center text-sm">
          <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
          {r.route}
        </div>
      ),
    },
    {
      id: "departure",
      header: "Departure",
      accessor: (r) => (
        <span className="text-sm text-muted-foreground">{r.departure}</span>
      ),
      sort: (a, b) => (a.departure || "").localeCompare(b.departure || ""),
    },
    {
      id: "arrival",
      header: "Arrival",
      accessor: (r) => (
        <span className="text-sm text-muted-foreground">{r.arrival}</span>
      ),
      sort: (a, b) => (a.arrival || "").localeCompare(b.arrival || ""),
    },
    {
      id: "eta",
      header: "ETA",
      accessor: (r) => {
        const d = r.eta ? new Date(r.eta) : null;
        if (!d) return <span className="text-sm text-muted-foreground">-</span>;
        const overdue = isOverdue(d);
        return (
          <div className="text-sm">
            <div className={overdue ? "text-destructive font-medium" : ""}>
              {formatDate(d)}
            </div>
            <div
              className={
                "text-xs " +
                (overdue ? "text-destructive" : "text-muted-foreground")
              }
            >
              {overdue
                ? `${Math.max(
                    Math.ceil(
                      (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
                    ),
                    1
                  )} days late`
                : formatRelative(d)}
            </div>
          </div>
        );
      },
      sort: (a, b) => (a.eta || "").localeCompare(b.eta || ""),
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Air Cargo</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all air cargo shipments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".xlsx,.xls,.csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  // Handle file upload
                  console.log("Uploading file:", file.name);
                }
              };
              input.click();
            }}
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button size="sm" onClick={() => setShowNewCargoDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Cargo
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-muted">
          <TabsTrigger
            value="sea-cargos"
            className="flex items-center gap-2"
            onClick={() => navigate("/cargos/sea")}
          >
            <Ship className="h-4 w-4" />
            Sea Cargos
          </TabsTrigger>
          <TabsTrigger value="air-cargos" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Air Cargos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="air-cargos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Air Cargo Management
              </h2>
              <p className="text-muted-foreground">
                Track and manage all air cargo shipments and their current
                status
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Containers"
              value={(
                dashboard?.total_containers ?? containers.length
              ).toString()}
              icon={Plane}
              className="border-primary/20 bg-primary/5"
            />
            <MetricCard
              title="Demurraged"
              value={(dashboard?.demurrage_containers ?? 0).toString()}
              icon={AlertTriangle}
              className="border-destructive/20 bg-destructive/5"
            />
            <MetricCard
              title="In Transit"
              value={(dashboard?.containers_in_transit ?? 0).toString()}
              icon={Clock}
              className="border-blue-500/20 bg-blue-500/5"
            />
          </div>

          {/* Air Cargo Management Section */}
          <div className="logistics-card p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Air Cargo Management
              </h3>
              <p className="text-muted-foreground">
                Track and manage all air cargo shipments and their current
                status
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tracking ID or client"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => {
                    setFilterStatus("all");
                    persistSet("air:filterStatus", "all");
                  }}
                >
                  All ({counts.all})
                </Button>
                <Button
                  size="sm"
                  variant={
                    filterStatus === "in_transit" ? "default" : "outline"
                  }
                  onClick={() => {
                    setFilterStatus("in_transit");
                    persistSet("air:filterStatus", "in_transit");
                  }}
                >
                  In Transit ({counts.in_transit})
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  onClick={() => {
                    setFilterStatus("pending");
                    persistSet("air:filterStatus", "pending");
                  }}
                >
                  Pending ({counts.pending})
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "delivered" ? "default" : "outline"}
                  onClick={() => {
                    setFilterStatus("delivered");
                    persistSet("air:filterStatus", "delivered");
                  }}
                >
                  Delivered ({counts.delivered})
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "delayed" ? "default" : "outline"}
                  onClick={() => {
                    setFilterStatus("delayed");
                    persistSet("air:filterStatus", "delayed");
                  }}
                >
                  Delayed ({counts.delayed})
                </Button>
                {(filterStatus !== "all" || searchTerm) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFilterStatus("all");
                      setSearchTerm("");
                      persistSet("air:filterStatus", "all");
                    }}
                  >
                    <RefreshCcw className="h-4 w-4 mr-1" /> Reset filters
                  </Button>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".xlsx,.xls,.csv";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        console.log("Uploading file:", file.name);
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Import Excel
                </Button>
                <Button size="sm" onClick={() => setShowNewCargoDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add Cargo
                </Button>
              </div>
            </div>

            <DataTable
              id="air-cargo"
              rows={rows}
              columns={columns}
              loading={loading}
              empty={
                <div className="text-center space-y-2 py-6">
                  <div className="text-muted-foreground">
                    No air cargo yet. Add Cargo or Import from Excel.
                  </div>
                  <a
                    className="text-primary underline text-sm"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const csv =
                        "AWB Number,Airline,Route,Flight,Departure,Arrival,ETA\n000-12345678,SampleAir,PVG-ACC,SA123,2025-08-01,2025-08-02,2025-08-03";
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "air-cargo-template.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download sample CSV
                  </a>
                </div>
              }
              renderBulkBar={(rows) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-1" />
                    Update Status
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileDown className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
              rowActions={(row) => (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      navigate(`/containers/${row._raw.container_id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedStatusContainer(row._raw);
                      setNewStatus(row._raw.status);
                      setShowStatusDialog(true);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Update Status
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setEditContainer(row._raw);
                      setEditOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      if (!confirm(`Delete cargo container ${row.tracking}?`))
                        return;
                      try {
                        await cargoService.deleteBackendContainer(
                          row._raw.container_id
                        );
                        await reloadData(); // Reload data instead of local state update
                        toast({
                          title: "Deleted",
                          description: `${row.tracking} removed.`,
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
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="sea-cargos" className="space-y-6">
          <div className="logistics-card p-6">
            <div className="text-center py-8">
              <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sea Cargo Management
              </h3>
              <p className="text-muted-foreground">
                Sea cargo management will be implemented here
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <NewCargoContainerDialog
        open={showNewCargoDialog}
        onOpenChange={setShowNewCargoDialog}
        defaultType="air"
      />

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Container Status</DialogTitle>
            <DialogDescription>
              Change the status of the selected container to reflect its current
              state.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Container:{" "}
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
            <div>
              <label className="text-sm font-medium">New Status</label>
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

      {/* View Container Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Container Details - {viewContainer?.container_id}
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected air cargo container.
            </DialogDescription>
          </DialogHeader>
          {viewContainer && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Container ID
                  </label>
                  <p className="text-sm font-mono">
                    {viewContainer.container_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Type
                  </label>
                  <p className="text-sm capitalize">
                    {viewContainer.cargo_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <StatusBadge
                    status={
                      viewContainer.status === "in_transit"
                        ? "in-transit"
                        : viewContainer.status
                    }
                  />
                </div>
              </div>

              {/* Route Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Route
                  </label>
                  <p className="text-sm">{viewContainer.route}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Load Date
                  </label>
                  <p className="text-sm">
                    {viewContainer.load_date
                      ? formatDate(new Date(viewContainer.load_date))
                      : "Not set"}
                  </p>
                </div>
              </div>

              {/* Capacity & Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Weight (kg)
                  </label>
                  <p className="text-sm">
                    {viewContainer.weight
                      ? `${viewContainer.weight.toLocaleString()} kg`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    CBM
                  </label>
                  <p className="text-sm">
                    {viewContainer.cbm ? `${viewContainer.cbm} m³` : "Not set"}
                  </p>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ETA
                  </label>
                  <p className="text-sm">
                    {viewContainer.eta
                      ? formatDate(new Date(viewContainer.eta))
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Rates
                  </label>
                  <p className="text-sm">
                    {viewContainer.rates ? viewContainer.rates : "Not set"}
                  </p>
                </div>
              </div>

              {/* Days tracking */}
              {(viewContainer.stay_days > 0 ||
                viewContainer.delay_days > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Stay Days
                    </label>
                    <p className="text-sm">{viewContainer.stay_days}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Delay Days
                    </label>
                    <p className="text-sm">{viewContainer.delay_days}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="text-sm">
                    {formatDate(new Date(viewContainer.created_at))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="text-sm">
                    {formatDate(new Date(viewContainer.updated_at))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ContainerDetailsDialog
        open={showContainerDetails}
        onOpenChange={setShowContainerDetails}
        container={selectedContainer}
      />

      <EditCargoContainerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        container={editContainer}
        onSaved={async () => {
          await reloadData();
        }}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Filter, Ship, MapPin, Calendar, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewSeaCargoDialog } from "@/components/dialogs/NewSeaCargoDialog";
import { ContainerDetailsDialog } from "@/components/dialogs/ContainerDetailsDialog";
import { cargoService, BackendCargoContainer, CargoDashboardStats } from "@/services/cargoService";

interface SeaCargoItem {
  id: string;
  containerNo: string;
  client: string;
  origin: string;
  destination: string;
  loadingDate: string;
  eta: string;
  cbm: string;
  weight: string;
  status: "in-transit" | "delivered" | "pending" | "delayed";
  vessel: string;
  voyage: string;
  goods: string;
  notes: string;
}

function mapStatus(status: BackendCargoContainer["status"]): "in-transit" | "delivered" | "pending" | "delayed" {
  switch (status) {
    case "in_transit":
      return "in-transit";
    case "delivered":
      return "delivered";
    case "pending":
      return "pending";
    case "demurrage":
      return "delayed"; // closest visual
    default:
      return "pending";
  }
}

export default function SeaCargo() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewSeaCargoDialog, setShowNewSeaCargoDialog] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<SeaCargoItem | null>(null);
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "in-transit" | "pending" | "delivered">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);
  const [dashboard, setDashboard] = useState<CargoDashboardStats | null>(null);

  // Load containers and dashboard
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusParam = statusFilter === "all" ? undefined : (statusFilter === "in-transit" ? "in_transit" : statusFilter);
        const [listRes, dashRes] = await Promise.all([
          cargoService.getContainers({ cargo_type: "sea", search: searchTerm || undefined, status: statusParam }),
          cargoService.getDashboard("sea"),
        ]);
        if (!ignore) {
          setContainers(listRes.data?.results || []);
          setDashboard(dashRes.data || null);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load sea cargo';
        if (!ignore) setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [searchTerm, statusFilter]);

  const filteredCargo = useMemo(() => containers, [containers]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center">
            <Ship className="h-6 w-6 mr-3 text-primary" />
            Sea Cargo
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all sea freight shipments
          </p>
        </div>
        <Button onClick={() => setShowNewSeaCargoDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sea Cargo
        </Button>
      </div>

  {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Containers</div>
      <div className="text-2xl font-semibold mt-1">{dashboard?.total_containers ?? 0}</div>
            </div>
            <Package className="h-8 w-8 text-primary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">In Transit</div>
      <div className="text-2xl font-semibold mt-1">{dashboard?.containers_in_transit ?? 0}</div>
            </div>
            <Ship className="h-8 w-8 text-secondary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total CBM</div>
      <div className="text-2xl font-semibold mt-1">{filteredCargo.reduce((sum, c) => sum + (c.cbm || 0), 0).toFixed(1)}</div>
            </div>
            <Package className="h-8 w-8 text-accent/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">This Month</div>
              <div className="text-2xl font-semibold mt-1">12</div>
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
            placeholder="Search by container, client, or tracking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "in-transit" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("in-transit")}
          >
            In Transit
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "delivered" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("delivered")}
          >
            Delivered
          </Button>
        </div>
      </div>

      {/* Cargo Table */}
      <div className="logistics-card">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold">Sea Cargo Management</h3>
          <p className="text-muted-foreground">Track and manage all sea cargo shipments and their current status</p>
        </div>
        <div className="overflow-x-auto">
          <table className="logistics-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input 
                    type="checkbox" 
                    className="rounded"
                    aria-label="Select all sea cargo"
                    title="Select all sea cargo"
                  />
                </th>
                <th>Tracking ID</th>
                <th>Container No.</th>
                <th>Client</th>
                <th>Route</th>
                <th>Vessel</th>
                <th>Voyage</th>
                <th>Loading Date</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 inline animate-spin mr-2" /> Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-destructive">
                    {error}
                  </td>
                </tr>
              ) : filteredCargo.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    No sea cargo data available. Start by adding your first cargo shipment.
                  </td>
                </tr>
              ) : (
                filteredCargo.map((cargo) => (
                  <tr 
                    key={cargo.container_id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      // Map backend container to dialog shape minimally
                      const mapped: SeaCargoItem = {
                        id: cargo.container_id,
                        containerNo: cargo.container_id,
                        client: `${cargo.total_clients} clients`,
                        origin: cargo.route?.split(" to ")[0] || "-",
                        destination: cargo.route?.split(" to ")[1] || "-",
                        loadingDate: cargo.load_date,
                        eta: cargo.eta,
                        cbm: String(cargo.cbm ?? 0),
                        weight: cargo.weight ? `${cargo.weight} kg` : "-",
                        status: mapStatus(cargo.status),
                        vessel: "-",
                        voyage: "-",
                        goods: "-",
                        notes: "",
                      };
                      setSelectedContainer(mapped);
                      setShowContainerDetails(true);
                    }}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        aria-label={`Select ${cargo.container_id}`}
                        title={`Select cargo ${cargo.container_id}`}
                      />
                    </td>
                    <td className="font-medium">{cargo.container_id}</td>
                    <td className="font-mono text-sm">{cargo.container_id}</td>
                    <td>{cargo.total_clients} clients</td>
                    <td>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {(cargo.route?.split(' to ')[0] || '-')} → {(cargo.route?.split(' to ')[1] || '-')}
                      </div>
                    </td>
                    <td className="text-sm">-</td>
                    <td className="text-sm">-</td>
                    <td className="text-sm">{cargo.load_date}</td>
                    <td className="text-sm">{cargo.eta}</td>
                    <td>
                      <StatusBadge status={mapStatus(cargo.status)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewSeaCargoDialog 
        open={showNewSeaCargoDialog} 
        onOpenChange={setShowNewSeaCargoDialog} 
      />

      <ContainerDetailsDialog 
        open={showContainerDetails} 
        onOpenChange={setShowContainerDetails}
        container={selectedContainer}
      />
    </div>
  );
}
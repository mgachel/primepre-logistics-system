import { useState } from "react";
import { Search, Plus, Filter, Ship, MapPin, Calendar, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { NewSeaCargoDialog } from "@/components/dialogs/NewSeaCargoDialog";
import { ContainerDetailsDialog } from "@/components/dialogs/ContainerDetailsDialog";

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

export default function SeaCargo() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewSeaCargoDialog, setShowNewSeaCargoDialog] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<SeaCargoItem | null>(null);
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "in-transit" | "pending" | "delivered">("all");

  // Static sea cargo data
  const seaCargo = [
    {
      id: "SC001",
      containerNo: "MSKU7823456",
      client: "Global Traders Ltd",
      origin: "Shanghai Port",
      destination: "Tema Port",
      loadingDate: "2024-07-15",
      eta: "2024-08-15",
      cbm: "67.5",
      weight: "12,400 kg",
      status: "in-transit" as const,
      vessel: "MSC MEDITERRANEAN",
      voyage: "24W28",
      goods: "Electronics & Machinery",
      notes: "Priority shipment for urgent delivery"
    },
    {
      id: "SC002",
      containerNo: "COSCO8901234",
      client: "West African Supplies",
      origin: "Shenzhen Port",
      destination: "Tema Port",
      loadingDate: "2024-07-20",
      eta: "2024-08-20",
      cbm: "45.2",
      weight: "8,900 kg",
      status: "in-transit" as const,
      vessel: "COSCO SHIPPING",
      voyage: "24W29",
      goods: "Textiles & Furniture",
      notes: "Samples for trade show"
    }
  ];

  const filteredCargo = seaCargo.filter((cargo) => {
    const matchesSearch = cargo.containerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cargo.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cargo.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cargo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
              <div className="text-2xl font-semibold mt-1">{seaCargo.length}</div>
            </div>
            <Package className="h-8 w-8 text-primary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">In Transit</div>
              <div className="text-2xl font-semibold mt-1">{seaCargo.filter(c => c.status === "in-transit").length}</div>
            </div>
            <Ship className="h-8 w-8 text-secondary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total CBM</div>
              <div className="text-2xl font-semibold mt-1">{seaCargo.reduce((sum, c) => sum + parseFloat(c.cbm), 0).toFixed(1)}</div>
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
              {filteredCargo.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    No sea cargo data available. Start by adding your first cargo shipment.
                  </td>
                </tr>
              ) : (
                filteredCargo.map((cargo) => (
                  <tr 
                    key={cargo.id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedContainer(cargo);
                      setShowContainerDetails(true);
                    }}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        aria-label={`Select ${cargo.id}`}
                        title={`Select cargo ${cargo.id}`}
                      />
                    </td>
                    <td className="font-medium">{cargo.id}</td>
                    <td className="font-mono text-sm">{cargo.containerNo}</td>
                    <td>{cargo.client}</td>
                    <td>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                        {cargo.origin.split(' ')[0]} → {cargo.destination.split(' ')[0]}
                      </div>
                    </td>
                    <td className="text-sm">{cargo.vessel}</td>
                    <td className="text-sm">{cargo.voyage}</td>
                    <td className="text-sm">{cargo.loadingDate}</td>
                    <td className="text-sm">{cargo.eta}</td>
                    <td>
                      <StatusBadge status={cargo.status} />
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
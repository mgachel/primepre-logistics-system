import { useEffect, useMemo, useState } from "react";
import { Search, Ship, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContainerDetailsDialog } from "@/components/dialogs/ContainerDetailsDialog";
import {
  cargoService,
  BackendCargoContainer,
} from "@/services/cargoService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function CargoTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in-transit" | "pending" | "delivered"
  >("all");
  const [loading, setLoading] = useState(true);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await cargoService.listSeaContainers();
      if (response.success && response.data) {
        setContainers(response.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load containers",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching containers:", error);
      toast({
        title: "Error",
        description: "Failed to load containers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const filteredData = useMemo(() => {
    let filtered = containers;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (container) => mapStatus(container.status) === statusFilter
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (container) =>
          container.container_id?.toLowerCase().includes(term) ||
          container.id?.toString().includes(term)
      );
    }

    return filtered;
  }, [containers, statusFilter, searchTerm]);

  const handleRowClick = (container: BackendCargoContainer) => {
    setSelectedContainerId(container.id.toString());
    setShowContainerDetails(true);
  };

  const cols: Column<BackendCargoContainer>[] = [
    {
      id: "created_at",
      header: "Created",
      accessor: () => "",
      sort: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      width: "0px",
    },
    {
      id: "select",
      header: "",
      accessor: () => null,
      width: "48px",
      sticky: true,
    },
    {
      id: "container",
      header: "Container ID",
      accessor: (c) => <span className="font-medium">{c.container_id}</span>,
      sort: (a, b) => a.container_id.localeCompare(b.container_id),
      sticky: true,
      clickable: true,
    },
    {
      id: "loading_date",
      header: "Loading Date",
      accessor: (c) => {
        if (!c.load_date) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }
        try {
          return <span className="text-sm">{formatDate(c.load_date)}</span>;
        } catch {
          return <span className="text-sm text-muted-foreground">-</span>;
        }
      },
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
      id: "rate",
      header: "Rate",
      accessor: (c) => {
        if (!c.rates || c.rates === null) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }
        return <span className="text-sm font-medium">${Number(c.rates).toLocaleString()}</span>;
      },
      sort: (a, b) => (Number(a.rates) || 0) - (Number(b.rates) || 0),
      align: "right",
    },
    {
      id: "total_cbm",
      header: "Total CBM",
      accessor: (c) => {
        if (!c.cbm || c.cbm === null) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }
        return <span className="text-sm">{c.cbm} m³</span>;
      },
      sort: (a, b) => (a.cbm || 0) - (b.cbm || 0),
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Ship className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Cargo Containers</h2>
        </div>
        <Button onClick={fetchContainers} variant="outline" size="sm">
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search containers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={cols}
        data={filteredData}
        loading={loading}
        onRowClick={handleRowClick}
        defaultSortColumn="created_at"
        enableRowSelection={false}
        empty={<p className="text-muted-foreground">No cargo containers found.</p>}
      />

      {/* Container Details Dialog (Read-only) */}
      {selectedContainerId && (
        <ContainerDetailsDialog
          open={showContainerDetails}
          onOpenChange={setShowContainerDetails}
          containerId={selectedContainerId}
        />
      )}
    </div>
  );
}

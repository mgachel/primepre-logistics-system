import { useEffect, useMemo, useState } from "react";
import { Search, Ship, Plane, Package, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { cargoService } from "@/services/cargoService";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  CustomerContainerDetailsDialog,
  type CustomerContainerDetails,
  type ContainerStatus,
} from "./CustomerContainerDetailsDialog";

const STATUS_MAP: Record<string, string> = {
  all: "All",
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
};

const statusOrder = ["PENDING", "IN_TRANSIT", "ARRIVED", "DELIVERED", "DELAYED"] as const;

const backendStatusMap: Record<string, ContainerStatus> = {
  pending: "PENDING",
  PENDING: "PENDING",
  in_transit: "IN_TRANSIT",
  IN_TRANSIT: "IN_TRANSIT",
  delivered: "DELIVERED",
  DELIVERED: "DELIVERED",
  demurrage: "DELAYED",
  DEMURRAGE: "DELAYED",
  delayed: "DELAYED",
  DELAYED: "DELAYED",
  arrived: "ARRIVED",
  ARRIVED: "ARRIVED",
};

const backendCargoTypeMap: Record<string, "SEA" | "AIR"> = {
  sea: "SEA",
  SEA: "SEA",
  air: "AIR",
  AIR: "AIR",
};

export function CustomerCargoTab() {
  const { toast } = useToast();
  const [cargoType, setCargoType] = useState<"SEA" | "AIR">("SEA");
  const [statusFilter, setStatusFilter] = useState<keyof typeof STATUS_MAP>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [loading, setLoading] = useState(true);
  const [containers, setContainers] = useState<CustomerContainerDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<CustomerContainerDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadContainers = async () => {
    try {
      setLoading(true);
      const response = await cargoService.getCustomerContainers({
        type: cargoType,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        page: 1,
        limit: 100,
      });

      if (response.success && response.data) {
        const results = Array.isArray(response.data.results) ? response.data.results : [];
        const normalized = results.map((raw: Record<string, unknown>, index: number): CustomerContainerDetails => {
          const statusKey = String((raw as Record<string, unknown>).status ?? "");
          const cargoTypeKey = String((raw as Record<string, unknown>).cargo_type ?? cargoType);

          const status = backendStatusMap[statusKey] ?? "PENDING";
          const mappedCargoType = backendCargoTypeMap[cargoTypeKey] ?? cargoType;

          const containerNumber = String(
            (raw as Record<string, unknown>).container_number ??
              (raw as Record<string, unknown>).container_id ??
              `UNKNOWN-${index}`
          );

          const departureDate =
            ((raw as Record<string, unknown>).departure_date as string | undefined) ||
            ((raw as Record<string, unknown>).load_date as string | undefined) ||
            null;

          const arrivalDate =
            ((raw as Record<string, unknown>).arrival_date as string | undefined) ||
            ((raw as Record<string, unknown>).unloading_date as string | undefined) ||
            null;

          return {
            id: String((raw as Record<string, unknown>).container_id ?? containerNumber),
            containerNumber,
            cargoType: mappedCargoType,
            status,
            route: ((raw as Record<string, unknown>).route as string | undefined) ?? null,
            departureDate,
            arrivalDate,
            eta: ((raw as Record<string, unknown>).eta as string | undefined) ?? null,
            totalCbm:
              (raw as Record<string, unknown>).total_cbm ??
              (raw as Record<string, unknown>).cbm ??
              null,
            totalWeight:
              (raw as Record<string, unknown>).total_weight ??
              (raw as Record<string, unknown>).weight ??
              null,
            totalItems: ((raw as Record<string, unknown>).total_items as number | undefined) ?? null,
            totalClients: ((raw as Record<string, unknown>).total_clients as number | undefined) ?? null,
            clientName: ((raw as Record<string, unknown>).customer_name as string | undefined) ?? null,
            vessel: ((raw as Record<string, unknown>).vessel as string | undefined) ?? null,
            raw,
          } satisfies CustomerContainerDetails;
        });

        setContainers(normalized);
        setTotalCount(response.data.count ?? results.length);
      } else {
        throw new Error(response.message || "Unable to load containers");
      }
    } catch (error) {
      console.error("Failed to load customer containers", error);
      toast({
        title: "Unable to load containers",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
      setContainers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargoType, statusFilter, debouncedSearch]);

  const summary = useMemo(() => {
    const totals = {
      total: containers.length,
      inTransit: 0,
      delivered: 0,
      delayed: 0,
      cbm: 0,
    };

    containers.forEach((container) => {
      if (container.status === "IN_TRANSIT") totals.inTransit += 1;
      if (container.status === "DELIVERED") totals.delivered += 1;
      if (container.status === "DELAYED") totals.delayed += 1;
      totals.cbm += Number(container.totalCbm || 0);
    });

    return totals;
  }, [containers]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return containers;
    return containers.filter((c) => c.status === statusFilter);
  }, [containers, statusFilter]);

  const columns: Column<CustomerContainerDetails>[] = [
    {
      id: "container",
      header: "Container",
      accessor: (c) => <span className="font-medium">{c.containerNumber}</span>,
      sort: (a, b) => a.containerNumber.localeCompare(b.containerNumber),
      sticky: true,
      clickable: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (c) => <StatusBadge status={mapStatusBadge(c.status)} />,
      sort: (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
      width: "120px",
    },
    {
      id: "departure",
      header: "Departure",
      accessor: (c) => (
        <div className="text-sm">
          <div>{c.departureDate ? formatDate(c.departureDate) : "-"}</div>
          <div className="text-xs text-muted-foreground">{c.departureDate ? formatRelative(c.departureDate) : ""}</div>
        </div>
      ),
      sort: (a, b) => (a.departureDate || "").localeCompare(b.departureDate || ""),
    },
    {
      id: "arrival",
      header: cargoType === "SEA" ? "ETA" : "Arrival",
      accessor: (c) => (
        <div className="text-sm">
          <div className={isOverdue(c.arrivalDate || c.eta) ? "text-red-600" : undefined}>
            {c.arrivalDate ? formatDate(c.arrivalDate) : c.eta ? formatDate(c.eta) : "-"}
          </div>
          {c.eta && (
            <div className="text-xs text-muted-foreground">
              {isOverdue(c.eta) ? `${daysLate(c.eta)} days late` : formatRelative(c.eta) || ""}
            </div>
          )}
        </div>
      ),
      sort: (a, b) => (a.arrivalDate || a.eta || "").localeCompare(b.arrivalDate || b.eta || ""),
    },
    {
      id: "vessel",
      header: cargoType === "SEA" ? "Vessel" : "Flight",
      accessor: (c) => c.vessel || "-",
      sort: (a, b) => (a.vessel || "").localeCompare(b.vessel || ""),
    },
    {
      id: "route",
      header: "Route",
      accessor: (c) => getRouteLabel(c),
    },
    {
      id: "cbm",
      header: "CBM",
      accessor: (c) => (
        <span>{c.totalCbm ? Number(c.totalCbm).toFixed(2) : "-"}</span>
      ),
      align: "right",
      sort: (a, b) => (Number(a.totalCbm) || 0) - (Number(b.totalCbm) || 0),
      width: "100px",
    },
    {
      id: "weight",
      header: "Weight (kg)",
      accessor: (c) => (
        <span>{c.totalWeight ? Number(c.totalWeight).toFixed(2) : "-"}</span>
      ),
      align: "right",
      sort: (a, b) => (Number(a.totalWeight) || 0) - (Number(b.totalWeight) || 0),
      width: "120px",
    },
  ];

  const handleRowClick = (container: CustomerContainerDetails) => {
    setSelected(container);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cargo Containers</h2>
          <p className="text-sm text-muted-foreground">
            Monitor your sea and air containers currently managed by PRIMEPRE.
          </p>
        </div>
        <ToggleGroup
          type="single"
          value={cargoType}
          onValueChange={(value) => value && setCargoType(value as "SEA" | "AIR")}
          aria-label="Select cargo type"
        >
          <ToggleGroupItem value="SEA" aria-label="Sea cargo">
            <Ship className="mr-2 h-4 w-4" /> Sea Cargo
          </ToggleGroupItem>
          <ToggleGroupItem value="AIR" aria-label="Air cargo">
            <Plane className="mr-2 h-4 w-4" /> Air Cargo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Containers ({cargoType === "SEA" ? "Sea" : "Air"})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.inTransit}</div>
            <p className="text-xs text-muted-foreground">Currently on the move</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.delivered}</div>
            <p className="text-xs text-muted-foreground">Successfully received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total CBM</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <div>
              <div className="text-2xl font-semibold">{summary.cbm.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Cubic meters across containers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by container number, route, or vessel"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(STATUS_MAP).map(([key, label]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(key as keyof typeof STATUS_MAP)}
            >
              {label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={loadContainers}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <DataTable
        id={`customer-cargo-${cargoType}`}
        rows={filtered}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        empty={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No containers found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
          </div>
        }
      />

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {totalCount} containers
      </p>

      <CustomerContainerDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        container={selected}
      />
    </div>
  );
}
function mapStatusBadge(status: ContainerStatus): "pending" | "in-transit" | "delivered" | "delayed" {
  switch (status) {
    case "PENDING":
      return "pending";
    case "IN_TRANSIT":
      return "in-transit";
    case "ARRIVED":
      return "pending";
    case "DELIVERED":
      return "delivered";
    case "DELAYED":
      return "delayed";
    default:
      return "pending";
  }
}

function getRouteLabel(container: CustomerContainerDetails): string {
  if (container.route) {
    return container.route;
  }
  const raw = (container.raw as Record<string, unknown> | null) ?? null;
  const origin = raw?.origin_port ?? raw?.origin ?? "-";
  const destination = raw?.destination_port ?? raw?.destination ?? "-";
  return `${origin} → ${destination}`;
}

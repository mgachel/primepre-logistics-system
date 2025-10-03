import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cargoService, type BackendCargoItem } from "@/services/cargoService";
import { Calendar, Loader2, MapPin, Package, Plane, Search, Ship, Weight } from "lucide-react";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export type ContainerStatus = "PENDING" | "IN_TRANSIT" | "ARRIVED" | "DELIVERED" | "DELAYED";

export interface CustomerContainerDetails {
  id: string;
  containerNumber: string;
  cargoType: "SEA" | "AIR";
  status: ContainerStatus;
  route?: string | null;
  departureDate?: string | null;
  arrivalDate?: string | null;
  eta?: string | null;
  totalCbm?: number | null;
  totalWeight?: number | null;
  totalItems?: number | null;
  totalClients?: number | null;
  clientName?: string | null;
  vessel?: string | null;
  raw?: Record<string, unknown> | null;
}

interface CustomerContainerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container?: CustomerContainerDetails | null;
}

const statusLabel: Record<ContainerStatus, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
};

const statusColors: Record<ContainerStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_TRANSIT: "bg-blue-100 text-blue-800",
  ARRIVED: "bg-sky-100 text-sky-800",
  DELIVERED: "bg-green-100 text-green-800",
  DELAYED: "bg-red-100 text-red-800",
};

const API_PAGE_SIZE = 500;

export function CustomerContainerDetailsDialog({
  open,
  onOpenChange,
  container,
}: CustomerContainerDetailsDialogProps) {
  if (!container) {
    return null;
  }

  const transportType = container.cargoType;
  const TransportIcon = transportType === "AIR" ? Plane : Ship;
  const raw = container.raw ?? {};
  const origin = (raw as Record<string, unknown>)?.["origin_port"] ?? (raw as Record<string, unknown>)?.["origin"] ?? "-";
  const destination = (raw as Record<string, unknown>)?.["destination_port"] ?? (raw as Record<string, unknown>)?.["destination"] ?? "-";
  const totalItems = container.totalItems ?? (raw as Record<string, unknown>)?.["total_cargo_items"] ?? null;
  const totalClients = container.totalClients ?? (raw as Record<string, unknown>)?.["total_clients"] ?? null;
  const stayDays = (raw as Record<string, unknown>)?.["stay_days"] ?? null;
  const delayDays = (raw as Record<string, unknown>)?.["delay_days"] ?? null;
  const clientName = container.clientName ?? (raw as Record<string, unknown>)?.["customer_name"] ?? null;

  const [items, setItems] = useState<BackendCargoItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchProgress, setFetchProgress] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!open || !container?.id) {
      return;
    }

    let isMounted = true;
    setItemsLoading(true);
    setItemsError(null);

    cargoService
      .getCargoItems({ container_id: container.id, page: 1, page_size: 500 })
      .then((response) => {
        if (!isMounted) return;

        if (response.success && response.data) {
          const results = Array.isArray(response.data.results) ? response.data.results : [];
          setItems(results);
        } else {
          throw new Error(response.message || "Unable to load packages for this container.");
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : "Unable to load packages for this container.";
        setItems([]);
        setItemsError(message);
      })
      .finally(() => {
        if (isMounted) {
          setItemsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, container?.id]);

  useEffect(() => {
    if (!open) {
      setSearchTerm("");
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      const shippingMark = (item.client_shipping_mark ?? "").toLowerCase();
      const trackingId = (item.tracking_id ?? "").toLowerCase();
      return shippingMark.includes(term) || trackingId.includes(term);
    });
  }, [items, searchTerm]);

  const formatItemStatus = (status: string | null | undefined) => {
    if (!status) return "-";
    return status
      .replace(/_/g, " ")
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100vw-2rem,960px)] max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="space-y-2 px-6 pt-6 pb-4 text-left">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <TransportIcon className="h-5 w-5 text-primary" />
            <span className="truncate" title={container.containerNumber}>
              {container.containerNumber}
            </span>
            <Badge className={cn("ml-2", statusColors[container.status])}>
              {statusLabel[container.status]}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Full container manifest, schedule, and package-level details. Use the search box below to locate your items quickly.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-5rem)] px-6 pb-6">
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Container ID</p>
              <p className="font-semibold">{container.containerNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Transport Type</p>
              <p className="font-semibold">{transportType === "AIR" ? "Air Cargo" : "Sea Cargo"}</p>
            </div>
            {clientName && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Primary Client</p>
                <p className="font-semibold">{String(clientName)}</p>
              </div>
            )}
            {container.route && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="font-semibold">{container.route}</p>
              </div>
            )}
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Origin</p>
              <p className="font-semibold">{typeof origin === "string" && origin.trim() ? origin : "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-semibold">{typeof destination === "string" && destination.trim() ? destination : "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Departure Date</p>
              <p className="font-semibold">{container.departureDate ? formatDate(container.departureDate) : "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Arrival / ETA</p>
              <p className="font-semibold">
                {container.arrivalDate
                  ? formatDate(container.arrivalDate)
                  : container.eta
                  ? formatDate(container.eta)
                  : "-"}
              </p>
              </div>
            </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <Package className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total CBM</p>
              <p className="font-semibold">
                {container.totalCbm && Number(container.totalCbm) > 0
                  ? `${Number(container.totalCbm).toFixed(2)} m³`
                  : "-"}
              </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Weight className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Weight</p>
              <p className="font-semibold">
                {container.totalWeight && Number(container.totalWeight) > 0
                  ? `${Number(container.totalWeight).toFixed(2)} kg`
                  : "-"}
              </p>
              </div>
            </div>
          {(totalItems ?? totalClients ?? stayDays ?? delayDays) !== null && (
            <div className="flex items-start gap-3">
              <Package className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Summary</p>
                <p className="text-sm text-muted-foreground">
                  {totalItems ? `Items: ${totalItems}` : ""}
                  {totalClients ? `${totalItems ? " • " : ""}Clients: ${totalClients}` : ""}
                  {stayDays ? `${totalItems || totalClients ? " • " : ""}Stay days: ${stayDays}` : ""}
                  {delayDays ? `${totalItems || totalClients || stayDays ? " • " : ""}Delay days: ${delayDays}` : ""}
                  {!totalItems && !totalClients && !stayDays && !delayDays ? "-" : ""}
                </p>
              </div>
            </div>
          )}
            </div>

            <Separator />

            <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Packages in this container</h3>
                <p className="text-sm text-muted-foreground">
                  Search by shipping mark or tracking number to find your consignment.
                </p>
              </div>
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search shipping mark or tracking number"
                  className="pl-10"
                  aria-label="Search by shipping mark or tracking number"
                />
              </div>
            </div>

            {itemsLoading ? (
              <div className="flex items-center gap-2 rounded border border-muted-foreground/20 bg-muted/40 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading packages…
              </div>
            ) : itemsError ? (
              <div className="rounded border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                {itemsError}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded border border-muted-foreground/20 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                No packages have been recorded for this container yet.
              </div>
            ) : (
              <ScrollArea className="max-h-80 rounded border border-muted-foreground/20">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipping Mark</TableHead>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[90px] text-right">Qty</TableHead>
                      <TableHead className="w-[120px] text-right">Weight (kg)</TableHead>
                      <TableHead className="w-[100px] text-right">CBM</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {item.client_shipping_mark || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.tracking_id || "-"}</TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                          {item.item_description || "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">
                          {typeof item.weight === "number" ? item.weight.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {typeof item.cbm === "number" ? item.cbm.toFixed(3) : "-"}
                        </TableCell>
                        <TableCell className="text-sm">{formatItemStatus(item.status)}</TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                          No packages matched your search. Try a different shipping mark or tracking number.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}

            {!itemsLoading && !itemsError && items.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredItems.length} of {items.length} packages in this container.
              </p>
            )}
            </div>
          </section>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

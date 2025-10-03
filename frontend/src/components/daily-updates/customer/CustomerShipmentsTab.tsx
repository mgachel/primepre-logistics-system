import { useEffect, useMemo, useState } from "react";
import { Search, Package, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { warehouseService, type WarehouseItem } from "@/services/warehouseService";
import { formatDate } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

interface ShipmentRow extends WarehouseItem {
  transportType: "SEA" | "AIR";
}

export function CustomerShipmentsTab() {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dateRangeLabel, setDateRangeLabel] = useState("Last 30 days");

  const loadShipments = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const date_from = thirtyDaysAgo.toISOString().split("T")[0];
      const date_to = now.toISOString().split("T")[0];

      const [seaResponse, airResponse] = await Promise.all([
        warehouseService.getChinaWarehouseItems({
          method_of_shipping: "SEA",
          date_from,
          date_to,
          search: debouncedSearch || undefined,
          ordering: "-date_received",
          page: 1,
          limit: 100,
        }),
        warehouseService.getChinaWarehouseItems({
          method_of_shipping: "AIR",
          date_from,
          date_to,
          search: debouncedSearch || undefined,
          ordering: "-date_received",
          page: 1,
          limit: 100,
        }),
      ]);

      const extractRows = (response: Awaited<ReturnType<typeof warehouseService.getChinaWarehouseItems>>, transportType: "SEA" | "AIR") => {
        if (response.success && response.data) {
          const results = Array.isArray(response.data.results) ? response.data.results : [];
          return results.map((item) => ({
            ...item,
            transportType,
          }));
        }
        return [];
      };

      const combined = [...extractRows(seaResponse, "SEA"), ...extractRows(airResponse, "AIR")];
      combined.sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime());
      setShipments(combined);
      setDateRangeLabel(`${formatDate(date_from)} – ${formatDate(date_to)}`);
    } catch (error) {
      console.error("Failed to load China shipments", error);
      toast({
        title: "Unable to load shipments",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
      setShipments([]);
      setDateRangeLabel("Last 30 days");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const summary = useMemo(() => {
    const totals = {
      total: shipments.length,
      sea: shipments.filter((item) => item.transportType === "SEA").length,
      air: shipments.filter((item) => item.transportType === "AIR").length,
      cbm: shipments.reduce((sum, item) => sum + Number(item.cbm || 0), 0),
    };
    return totals;
  }, [shipments]);

  const columns: Column<ShipmentRow>[] = [
    {
      id: "date",
      header: "Date Received",
      accessor: (item) => (
        <div className="text-sm">
          <div>{formatDate(item.date_received)}</div>
          <div className="text-xs text-muted-foreground">{item.transportType === "SEA" ? "Sea" : "Air"}</div>
        </div>
      ),
      sort: (a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime(),
      width: "140px",
    },
    {
      id: "shipping_mark",
      header: "Shipping Mark",
      accessor: (item) => <span className="font-medium">{item.shipping_mark || "-"}</span>,
      sort: (a, b) => (a.shipping_mark || "").localeCompare(b.shipping_mark || ""),
      sticky: true,
    },
    {
      id: "tracking",
      header: "Supply Tracking",
      accessor: (item) => item.supply_tracking || "-",
      sort: (a, b) => (a.supply_tracking || "").localeCompare(b.supply_tracking || ""),
    },
    {
      id: "quantity",
      header: "Qty",
      accessor: (item) => item.quantity,
      align: "right",
      width: "80px",
      sort: (a, b) => a.quantity - b.quantity,
    },
    {
      id: "cbm",
      header: "CBM",
      accessor: (item) => (item.cbm ? Number(item.cbm).toFixed(5) : "-"),
      align: "right",
      width: "110px",
      sort: (a, b) => (Number(a.cbm) || 0) - (Number(b.cbm) || 0),
    },
    {
      id: "weight",
      header: "Weight (kg)",
      accessor: (item) => (item.weight ? Number(item.weight).toFixed(2) : "-"),
      align: "right",
      width: "120px",
      sort: (a, b) => (Number(a.weight) || 0) - (Number(b.weight) || 0),
    },
    {
      id: "status",
      header: "Status",
      accessor: (item) => (
        <span className="rounded bg-muted px-2 py-1 text-xs font-medium uppercase tracking-wide">
          {item.status || "PENDING"}
        </span>
      ),
      width: "120px",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">China Goods Received</h2>
        <p className="text-sm text-muted-foreground">
          View items received into the China warehouse (Sea & Air) during the last 30 days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Across sea and air cargo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sea Cargo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.sea}</div>
            <p className="text-xs text-muted-foreground">China sea arrivals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Air Cargo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.air}</div>
            <p className="text-xs text-muted-foreground">China air arrivals</p>
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
              <p className="text-xs text-muted-foreground">Combined volume</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shipping mark or tracking reference"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Date range:</span>
          <span className="font-medium text-foreground">{dateRangeLabel}</span>
          <Button variant="outline" size="sm" onClick={loadShipments}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <DataTable
        id="customer-china-shipments"
        rows={shipments}
        columns={columns}
        loading={loading}
        empty={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No shipments found</p>
            <p className="text-sm text-muted-foreground">No China warehouse items were received in the last 30 days.</p>
          </div>
        }
      />

      <p className="text-sm text-muted-foreground">
        Showing {shipments.length} items received over the last 30 days.
      </p>
    </div>
  );
}

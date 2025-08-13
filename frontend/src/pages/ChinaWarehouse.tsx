import { useEffect, useState } from "react";
import {
  Package,
  Search,
  Filter,
  Upload,
  Plus,
  Download,
  CheckCircle2,
  Flag,
  Ship,
  Trash2,
} from "lucide-react";
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
import { NewGoodsDialog } from "@/components/dialogs/NewGoodsDialog";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { warehouseService, WarehouseItem } from "@/services/warehouseService";
import { useToast } from "@/hooks/use-toast";

export default function ChinaWarehouse() {
  const { toast } = useToast();
  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    | "all"
    | "PENDING"
    | "READY_FOR_SHIPPING"
    | "FLAGGED"
    | "SHIPPED"
    | "CANCELLED"
  >("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WarehouseItem[]>([]);

  // helpers
  const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt2 = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await warehouseService.getAdminChinaItems({
          search: search || undefined,
          status: status === "all" ? undefined : status,
          ordering: "-updated_at",
        });
        if (!ignore) setItems(res.data?.results || []);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to load China items";
        if (!ignore)
          toast({
            title: "Load failed",
            description: msg,
            variant: "destructive",
          });
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [search, status, toast]);

  const chStatusToBadge = (
    s: WarehouseItem["status"]
  ): Parameters<typeof StatusBadge>[0]["status"] => {
    switch (s) {
      case "PENDING":
        return "pending";
      case "READY_FOR_SHIPPING":
        return "active";
      case "FLAGGED":
        return "risk";
      case "SHIPPED":
        return "delivered";
      case "CANCELLED":
        return "failed";
      default:
        return "pending";
    }
  };

  const cols: Column<WarehouseItem>[] = [
    {
      id: "select",
      header: (
        <input aria-label="Select all" type="checkbox" className="rounded" />
      ),
      accessor: () => (
        <input aria-label="Select row" type="checkbox" className="rounded" />
      ),
      width: "48px",
      sticky: true,
    },
    {
      id: "item_id",
      header: "Tracking",
      accessor: (r) => <span className="font-medium">{r.item_id}</span>,
      sort: (a, b) => a.item_id.localeCompare(b.item_id),
      sticky: true,
      clickable: true,
    },
    {
      id: "shipping_mark",
      header: "Shipping Mark",
      accessor: (r) => r.shipping_mark,
      sort: (a, b) => a.shipping_mark.localeCompare(b.shipping_mark),
    },
    {
      id: "desc",
      header: "Description",
      accessor: (r) => r.description || "-",
    },
    {
      id: "qty",
      header: "Qty",
      accessor: (r) => r.quantity,
      align: "right",
      width: "80px",
      sort: (a, b) => a.quantity - b.quantity,
    },
    {
      id: "cbm",
      header: "CBM",
      accessor: (r) => fmt2(r.cbm),
      align: "right",
      width: "90px",
      sort: (a, b) => toNum(a.cbm) - toNum(b.cbm),
    },
    {
      id: "wt",
      header: "Weight",
      accessor: (r) => fmt2(r.weight),
      align: "right",
      width: "100px",
      sort: (a, b) => toNum(a.weight) - toNum(b.weight),
    },
    {
      id: "supplier",
      header: "Supplier",
      accessor: (r) => r.supplier_name || "-",
    },
    { id: "loc", header: "Location", accessor: (r) => r.location || "-" },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <StatusBadge status={chStatusToBadge(r.status)} />,
    },
    {
      id: "updated",
      header: "Updated",
      accessor: (r) => new Date(r.updated_at).toLocaleString(),
      sort: (a, b) => a.updated_at.localeCompare(b.updated_at),
    },
  ];

  const onUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const res = await warehouseService.uploadChinaExcel(file);
      toast({
        title: res.success ? "Upload complete" : "Upload failed",
        description: res.message,
      });
      setSearch((s) => s);
    };
    input.click();
  };

  const onExportTemplate = async () => {
    try {
      const blob = await warehouseService.downloadChinaTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "china-warehouse-template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      toast({
        title: "Export failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            China Warehouse
          </h1>
          <p className="text-muted-foreground">
            Manage goods available in China warehouses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onExportTemplate}>
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Button size="sm" onClick={() => setShowNewGoodsDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Goods
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Items"
          value="0"
          icon={Package}
          className="border-primary/20 bg-primary/5"
        />
        <MetricCard
          title="Available Stock"
          value="0"
          className="border-green-500/20 bg-green-500/5"
        />
        <MetricCard
          title="Reserved Items"
          value="0"
          className="border-yellow-500/20 bg-yellow-500/5"
        />
        <MetricCard
          title="Low Stock Alert"
          value="0"
          className="border-destructive/20 bg-destructive/5"
        />
      </div>

      {/* Goods Management Section */}
      <div className="logistics-card p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              China Warehouse Inventory
            </h3>
            <p className="text-muted-foreground">
              Track and manage all goods available in China warehouses
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by shipping mark, tracking, supplier"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="READY_FOR_SHIPPING">
                  Ready for shipping
                </SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            id="china-warehouse"
            rows={items}
            columns={cols}
            loading={loading}
            empty={
              <div className="text-muted-foreground">
                No goods yet. Add Goods or Import from Excel.
              </div>
            }
            rowActions={(row) => (
              <>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.updateChinaItemStatus(
                      row.id,
                      "READY_FOR_SHIPPING"
                    );
                    if (res.success) {
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === row.id
                            ? { ...it, status: "READY_FOR_SHIPPING" }
                            : it
                        )
                      );
                      toast({
                        title: "Status updated",
                        description: "Marked as ready for shipping",
                      });
                    } else {
                      toast({
                        title: "Update failed",
                        description: res.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />{" "}
                  Ready for shipping
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.updateChinaItemStatus(
                      row.id,
                      "SHIPPED"
                    );
                    if (res.success) {
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === row.id ? { ...it, status: "SHIPPED" } : it
                        )
                      );
                      toast({
                        title: "Status updated",
                        description: "Marked as shipped",
                      });
                    } else {
                      toast({
                        title: "Update failed",
                        description: res.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Ship className="h-4 w-4 mr-2 text-blue-600" /> Shipped
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.updateChinaItemStatus(
                      row.id,
                      "FLAGGED"
                    );
                    if (res.success) {
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === row.id ? { ...it, status: "FLAGGED" } : it
                        )
                      );
                      toast({
                        title: "Item flagged",
                        description: "Item has been flagged",
                      });
                    } else {
                      toast({
                        title: "Update failed",
                        description: res.message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Flag className="h-4 w-4 mr-2 text-yellow-700" /> Flag
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.deleteChinaWarehouseItem(
                      row.id
                    );
                    if (res.success) {
                      setItems((prev) => prev.filter((it) => it.id !== row.id));
                      toast({ title: "Deleted", description: "Item removed" });
                    } else {
                      toast({
                        title: "Delete failed",
                        description: res.message,
                        variant: "destructive",
                      });
                    }
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </>
            )}
          />
        </div>
      </div>

      <NewGoodsDialog
        open={showNewGoodsDialog}
        onOpenChange={setShowNewGoodsDialog}
        warehouse="china"
        onCreated={() => setSearch((s) => s)}
      />
    </div>
  );
}

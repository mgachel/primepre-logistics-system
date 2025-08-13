import { useEffect, useState } from "react";
import {
  Package,
  Search,
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
import {
  warehouseService,
  WarehouseItem,
  AdminWarehouseStatistics,
} from "@/services/warehouseService";
import { useToast } from "@/hooks/use-toast";

export default function ChinaWarehouse() {
  const { toast } = useToast();
  const PAGE_SIZE = 20;
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
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<AdminWarehouseStatistics | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [uploading, setUploading] = useState(false);

  // helpers
  const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt2 = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  };

  // Load China items
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await warehouseService.getAdminChinaItems({
          search: search || undefined,
          status: status === "all" ? undefined : status,
          ordering: "-updated_at",
          page,
        });
        if (!ignore) {
          setItems(res.data?.results || []);
          setCount(res.data?.count || 0);
          setHasNext(!!res.data?.next);
          setHasPrev(!!res.data?.previous);
        }
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
  }, [search, status, page, toast]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  // Stats
  useEffect(() => {
    let ignore = false;
    const loadStats = async () => {
      const res = await warehouseService.getAdminChinaStatistics();
      if (!ignore && res.success) setStats(res.data);
    };
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

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
      const isExcel =
        file.type.includes("sheet") ||
        file.name.toLowerCase().endsWith(".xlsx") ||
        file.name.toLowerCase().endsWith(".xls");
      if (!isExcel) {
        toast({
          title: "Unsupported file",
          description: "Please upload an .xlsx or .xls Excel file.",
          variant: "destructive",
        });
        return;
      }
      setUploading(true);
      try {
        const res = await warehouseService.uploadChinaExcel(file);
        const created = res.data?.created_count ?? 0;
        const rawErrors = (res.data?.errors || []) as Array<
          string | { row?: number; error: string }
        >;
        const errors = rawErrors
          .map((er) =>
            typeof er === "string"
              ? er
              : er?.row
              ? `Row ${er.row}: ${er.error}`
              : er?.error
          )
          .filter(Boolean) as string[];
        const hadErrors = errors.length > 0;

        if (!res.success || created === 0) {
          const sample = errors.slice(0, 3).join(" | ");
          const raw = res.message || "";
          const missing = raw.match(/Missing required columns:\s*([^'"\]}]*)/i);
          const cleaned = raw
            .replace(/ErrorDetail\(string=/g, "")
            .replace(/,\s*code='[^']*'\)/g, ")")
            .replace(/[[{}]]/g, "")
            .replace(/^["']|["']$/g, "");
          const friendly = missing
            ? `Missing required columns: ${missing[1].trim()}. Please download and use the template.`
            : sample ||
              cleaned ||
              "No items were created from this file. Please check that the columns match the template and required fields are filled.";
          toast({
            title: "Upload failed",
            description: friendly,
            variant: "destructive",
          });
        } else {
          const detail = hadErrors
            ? `Created ${created} item(s), but ${errors.length} row(s) failed.`
            : `Created ${created} item(s).`;
          const more = hadErrors ? ` Example: ${errors[0]}` : "";
          toast({
            title: "Upload complete",
            description: `${detail}${more}`,
          });
        }

        // refresh list and stats regardless of outcome
        setPage(1);
        setSearch((s) => s);
        const statsRes = await warehouseService.getAdminChinaStatistics();
        if (statsRes.success) setStats(statsRes.data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast({
          title: "Upload failed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
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
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Import Excel"}
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
          value={(stats?.total_count ?? 0).toString()}
          icon={Package}
          className="border-primary/20 bg-primary/5"
        />
        <MetricCard
          title="Ready for shipping"
          value={(stats?.ready_for_shipping_count ?? 0).toString()}
          className="border-green-500/20 bg-green-500/5"
        />
        <MetricCard
          title="Shipped"
          value={(stats?.shipped_count ?? 0).toString()}
          className="border-yellow-500/20 bg-yellow-500/5"
        />
        <MetricCard
          title="Flagged"
          value={(stats?.flagged_count ?? 0).toString()}
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
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(count / PAGE_SIZE))} •{" "}
              {count} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <NewGoodsDialog
        open={showNewGoodsDialog}
        onOpenChange={setShowNewGoodsDialog}
        warehouse="china"
        onCreated={() => {
          setPage(1);
          setSearch((s) => s);
        }}
      />
    </div>
  );
}

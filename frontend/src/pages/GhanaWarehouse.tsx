import { useEffect, useState } from "react";
import {
  Package,
  Search,
  Upload,
  Plus,
  Download,
  Trash2,
  CheckCircle2,
  Flag,
  PackageOpen,
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
import { ExcelUploadButton } from "@/components/ui/ExcelUploadButton";
import {
  warehouseService,
  WarehouseItem,
  AdminWarehouseStatistics,
} from "@/services/warehouseService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";

export default function GhanaWarehouse() {
  const { toast } = useToast();
  const PAGE_SIZE = 20;
  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    | "all"
    | "PENDING"
    | "READY_FOR_DELIVERY"
    | "FLAGGED"
    | "DELIVERED"
    | "CANCELLED"
  >("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState<AdminWarehouseStatistics | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [_uploading, setUploading] = useState(false);

  // helpers to coerce/format numeric fields safely
  const toNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt2 = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  };

  // Load Ghana warehouse items (admin view)
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await warehouseService.getAdminGhanaItems({
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
          e instanceof Error ? e._message : "Failed to load Ghana items";
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

  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    let ignore = false;
    const loadStats = async () => {
      const res = await warehouseService.getAdminGhanaStatistics();
      if (!ignore && res.success) setStats(res.data);
    };
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  const ghStatusToBadge = (
    s: WarehouseItem["status"]
  ): Parameters<typeof StatusBadge>[0]["status"] => {
    switch (s) {
      case "PENDING":
        return "pending";
      case "READY_FOR_DELIVERY":
        return "active";
      case "FLAGGED":
        return "risk";
      case "DELIVERED":
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
      header: "",
      accessor: () => null, // DataTable handles this internally for 'select' columns
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
      accessor: (r) => <StatusBadge status={ghStatusToBadge(r.status)} />,
    },
    {
      id: "updated",
      header: "Updated",
      accessor: (r) => new Date(r.updated_at).toLocaleString(),
      sort: (a, b) => a.updated_at.localeCompare(b.updated_at),
    },
  ];

  const _onUpload = () => {
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
        const res = await warehouseService.uploadGhanaExcel(file);

        if (res.success && res.data) {
          const { _message, results } = res.data;
          const {
            _total_processed,
            successful_creates,
            failed_creates,
            errors,
          } = results;

          if (successful_creates === 0) {
            // No items were created - show detailed error _message
            const errorMessages = errors.slice(0, 3); // Show first 3 errors
            const displayError =
              errorMessages.length > 0
                ? errorMessages.join(". ")
                : "No items were created from this file. Please check that the columns match the template and required fields are filled.";

            toast({
              title: "Upload failed",
              description: displayError,
              variant: "destructive",
            });
          } else {
            // Some or all items were created successfully
            const hasErrors = failed_creates > 0;
            const description = hasErrors
              ? `Created ${successful_creates} item(s) successfully. ${failed_creates} item(s) failed. ${
                  errors.length > 0 ? `Example error: ${errors[0]}` : ""
                }`
              : `Successfully created ${successful_creates} item(s).`;

            toast({
              title: hasErrors ? "Partial upload success" : "Upload successful",
              description,
              variant: hasErrors ? "default" : "default",
            });

            // Refresh the data regardless of partial failures
            setPage(1);
            setSearch((s) => s); // Trigger reload

            // Refresh statistics
            const statsRes = await warehouseService.getAdminGhanaStatistics();
            if (statsRes.success) setStats(statsRes.data);
          }
        } else {
          // API call failed
          const errorMsg = res._message || "Upload failed. Please try again.";
          toast({
            title: "Upload failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
      } catch (err) {
        // Network or unexpected error
        let errorMessage = "Upload failed due to a network error.";

        if (err instanceof Error) {
          // Check if it's a validation error from the backend
          if (err._message.includes("Missing required columns")) {
            errorMessage =
              "Missing required columns. Please download and use the template file.";
          } else if (err._message.includes("File must be an Excel file")) {
            errorMessage = "Please upload a valid Excel file (.xlsx or .xls).";
          } else if (err._message.includes("File size must be less than")) {
            errorMessage =
              "File is too large. Please upload a file smaller than 10MB.";
          } else {
            errorMessage = err._message;
          }
        }

        toast({
          title: "Upload failed",
          description: errorMessage,
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
      const blob = await warehouseService.downloadGhanaTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ghana-warehouse-template.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e._message : "Export failed";
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
            Ghana Warehouse
          </h1>
          <p className="text-muted-foreground">
            Manage goods available in Ghana warehouses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExcelUploadButton
            uploadType="goods_received"
            warehouse="Ghana"
            variant="outline"
            size="sm"
            onUploadComplete={(response) => {
              toast({
                title: "Excel upload completed",
                description: `Successfully processed ${response.summary.created || 0} goods received items`,
              });
              // Refresh the data
              setSearch((s) => s); // Trigger reload
            }}
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </ExcelUploadButton>
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
          title="Ready for delivery"
          value={(stats?.ready_for_delivery_count ?? 0).toString()}
          className="border-green-500/20 bg-green-500/5"
        />
        <MetricCard
          title="Delivered"
          value={(stats?.delivered_count ?? 0).toString()}
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
              Ghana Warehouse Inventory
            </h3>
            <p className="text-muted-foreground">
              Track and manage all goods available in Ghana warehouses
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
                <SelectItem value="READY_FOR_DELIVERY">
                  Ready for delivery
                </SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DataTable
            id="ghana-warehouse"
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
                    const res = await warehouseService.updateGhanaItemStatus(
                      row.id,
                      "READY_FOR_DELIVERY"
                    );
                    if (res.success) {
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === row.id
                            ? { ...it, status: "READY_FOR_DELIVERY" }
                            : it
                        )
                      );
                      toast({
                        title: "Status updated",
                        description: "Marked as ready for delivery",
                      });
                    } else {
                      toast({
                        title: "Update failed",
                        description: res._message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />{" "}
                  Ready for delivery
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.updateGhanaItemStatus(
                      row.id,
                      "DELIVERED"
                    );
                    if (res.success) {
                      setItems((prev) =>
                        prev.map((it) =>
                          it.id === row.id ? { ...it, status: "DELIVERED" } : it
                        )
                      );
                      toast({
                        title: "Status updated",
                        description: "Marked as delivered",
                      });
                    } else {
                      toast({
                        title: "Update failed",
                        description: res._message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <PackageOpen className="h-4 w-4 mr-2 text-blue-600" />{" "}
                  Delivered
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.updateGhanaItemStatus(
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
                        description: res._message,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Flag className="h-4 w-4 mr-2 text-yellow-700" /> Flag
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await warehouseService.deleteGhanaWarehouseItem(
                      row.id
                    );
                    if (res.success) {
                      setItems((prev) => prev.filter((it) => it.id !== row.id));
                      toast({ title: "Deleted", description: "Item removed" });
                    } else {
                      toast({
                        title: "Delete failed",
                        description: res._message,
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
        warehouse="ghana"
        onCreated={() => {
          setPage(1);
          setSearch((s) => s);
        }}
      />
    </div>
  );
}

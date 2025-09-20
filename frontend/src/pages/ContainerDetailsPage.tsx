import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Ship,
  Plane,
  MapPin,
  Package,
  Calendar,
  Clock,
  Weight,
  DollarSign,
  User,
  Edit,
  Trash2,
  RefreshCcw,
  Search,
  Download,
  Upload,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { AddCargoItemDialog } from "@/components/dialogs/AddCargoItemDialog";
import { ContainerExcelUploadButton } from "@/components/ui/ContainerExcelUploadButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  cargoService,
  BackendCargoContainer,
  BackendCargoItem,
} from "@/services/cargoService";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";

export default function ContainerDetailsPage() {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [container, setContainer] = useState<BackendCargoContainer | null>(
    null
  );
  const [cargoItems, setCargoItems] = useState<BackendCargoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "in_transit" | "delivered" | "delayed"
  >("all");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  // Load container and cargo items
  useEffect(() => {
    if (!containerId) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [containerRes, itemsRes] = await Promise.all([
          cargoService.getContainer(containerId),
          cargoService.getCargoItems({ container_id: containerId }),
        ]);

        if (containerRes.data) {
          setContainer(containerRes.data);
        } else {
          setError("Container not found");
          return;
        }

        setCargoItems(itemsRes.data?.results || []);
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to load container details";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [containerId]);

  // Reload data function
  const reloadData = async () => {
    if (!containerId) return;

    try {
      const [containerRes, itemsRes] = await Promise.all([
        cargoService.getContainer(containerId),
        cargoService.getCargoItems({ container_id: containerId }),
      ]);

      if (containerRes.data) {
        setContainer(containerRes.data);
      }
      setCargoItems(itemsRes.data?.results || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to reload data";
      toast({
        title: "Reload Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  // Filter cargo items
  const filteredItems = useMemo(() => {
    let items = cargoItems;

    if (filterStatus !== "all") {
      items = items.filter((item) => item.status === filterStatus);
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.tracking_id.toLowerCase().includes(query) ||
          item.item_description.toLowerCase().includes(query) ||
          item.client_name?.toLowerCase().includes(query) ||
          item.client_shipping_mark?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [cargoItems, filterStatus, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalItems = cargoItems.length;
    // For sea cargo, use the container's calculated CBM; for air cargo, calculate from items (should be 0)
    const totalCBM = container?.cargo_type === 'sea' 
      ? (container.cbm || 0) 
      : cargoItems.reduce((sum, item) => sum + (item.cbm || 0), 0);
    const totalWeight = cargoItems.reduce(
      (sum, item) => sum + (item.weight || 0),
      0
    );
    const totalValue = cargoItems.reduce(
      (sum, item) => sum + (item.total_value || 0),
      0
    );

    return {
      totalItems,
      totalCBM: totalCBM.toFixed(2),
      totalWeight: totalWeight.toFixed(2),
      totalValue: totalValue.toFixed(2),
      pending: cargoItems.filter((item) => item.status === "pending").length,
      in_transit: cargoItems.filter((item) => item.status === "in_transit")
        .length,
      delivered: cargoItems.filter((item) => item.status === "delivered")
        .length,
      delayed: cargoItems.filter((item) => item.status === "delayed").length,
    };
  }, [cargoItems, container]);

  const handleDeleteItem = async (itemId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this cargo item? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await cargoService.deleteBackendCargoItem(itemId);
      toast({
        title: "Item Deleted",
        description: "Cargo item has been successfully deleted",
      });
      await reloadData();
    } catch (e: unknown) {
      toast({
        title: "Delete Failed",
        description: e instanceof Error ? e.message : "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const columns: Column<BackendCargoItem>[] = [
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
      header: "Tracking ID",
      accessor: (item) => (
        <span className="font-medium font-mono text-sm">
          {item.tracking_id}
        </span>
      ),
      sort: (a, b) => a.tracking_id.localeCompare(b.tracking_id),
      sticky: true,
    },
    {
      id: "client",
      header: "Client",
      accessor: (item) => (
        <div>
          <div className="font-medium">
            {item.client_name || `Client #${item.client}`}
          </div>
          {item.client_shipping_mark && (
            <div className="text-sm text-muted-foreground">
              {item.client_shipping_mark}
            </div>
          )}
        </div>
      ),
      sort: (a, b) => (a.client_name || "").localeCompare(b.client_name || ""),
    },
    {
      id: "description",
      header: "Description",
      accessor: (item) => (
        <div className="max-w-xs">
          <div className="truncate">{item.item_description}</div>
          <div className="text-sm text-muted-foreground">
            Qty: {item.quantity}
          </div>
        </div>
      ),
    },
    {
      id: "dimensions",
      header: "Dimensions",
      accessor: (item) => (
        <div className="text-sm">
          {container?.cargo_type === 'sea' && <div>CBM: {item.cbm}</div>}
          {container?.cargo_type === 'air' && item.weight && <div>Weight: {item.weight} kg</div>}
        </div>
      ),
      align: "right",
    },
    {
      id: "value",
      header: "Value",
      accessor: (item) => (
        <div className="text-right">
          {item.total_value ? `$${item.total_value.toFixed(2)}` : "-"}
        </div>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      accessor: (item) => (
        <StatusBadge
          status={
            item.status as "pending" | "in-transit" | "delivered" | "delayed"
          }
        />
      ),
    },
    {
      id: "created",
      header: "Created",
      accessor: (item) => (
        <div className="text-sm text-muted-foreground">
          {formatDate(item.created_at)}
        </div>
      ),
      sort: (a, b) => a.created_at.localeCompare(b.created_at),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading container details...</p>
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-destructive mb-4">
            {error || "Container not found"}
          </div>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const containerIcon = container.cargo_type === "sea" ? Ship : Plane;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center">
              {React.createElement(containerIcon, {
                className: "h-6 w-6 mr-3 text-primary",
              })}
              {container.container_id}
            </h1>
            <p className="text-muted-foreground mt-1">
              {container.cargo_type === "sea" ? "Sea" : "Air"} Cargo Container •{" "}
              {stats.totalItems} items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reloadData}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <ContainerExcelUploadButton
            containerId={containerId!}
            onUploadComplete={(response) => {
              toast({
                title: "Excel upload completed",
                description: `Successfully processed ${response.summary.created || 0} cargo items for this container`,
              });
              // Refresh the data
              reloadData();
            }}
          />
          <Button size="sm" onClick={() => setShowAddItemDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Container Information */}
      <div className="logistics-card p-6">
        <h3 className="text-lg font-semibold mb-4">Container Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Container ID</div>
              <div className="font-medium">{container.container_id}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <StatusBadge
                status={
                  container.status === "in_transit"
                    ? "in-transit"
                    : container.status === "demurrage"
                    ? "delayed"
                    : (container.status as "pending" | "delivered")
                }
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                Route
              </div>
              <div className="font-medium">{container.route}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Loading Date
              </div>
              <div className="font-medium">
                {formatDate(container.load_date)}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                ETA
              </div>
              <div
                className={`font-medium ${
                  isOverdue(container.eta) ? "text-destructive" : ""
                }`}
              >
                {formatDate(container.eta)}
                {isOverdue(container.eta) && (
                  <span className="text-sm text-destructive ml-2">
                    ({daysLate(container.eta)} days late)
                  </span>
                )}
              </div>
            </div>
            {container.unloading_date && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Unloading Date
                </div>
                <div className="font-medium">
                  {formatDate(container.unloading_date)}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground flex items-center">
                <User className="h-4 w-4 mr-1" />
                Total Clients
              </div>
              <div className="font-medium">{container.total_clients}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground flex items-center">
                <Package className="h-4 w-4 mr-1" />
                Total Items
              </div>
              <div className="font-medium">{container.total_cargo_items}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {container?.cargo_type === 'sea' && (
          <div className="logistics-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total CBM</div>
                <div className="text-lg font-semibold">{stats.totalCBM}</div>
              </div>
              <Box className="h-8 w-8 text-primary/60" />
            </div>
          </div>
        )}
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Weight</div>
              <div className="text-lg font-semibold">
                {stats.totalWeight} kg
              </div>
            </div>
            <Weight className="h-8 w-8 text-secondary/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-lg font-semibold">${stats.totalValue}</div>
            </div>
            <DollarSign className="h-8 w-8 text-accent/60" />
          </div>
        </div>
        <div className="logistics-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Delivered</div>
              <div className="text-lg font-semibold">
                {stats.delivered}/{stats.totalItems}
              </div>
            </div>
            <Package className="h-8 w-8 text-green-500/60" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by tracking ID, description, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All ({stats.totalItems})
          </Button>
          <Button
            variant={filterStatus === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("pending")}
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={filterStatus === "in_transit" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("in_transit")}
          >
            In Transit ({stats.in_transit})
          </Button>
          <Button
            variant={filterStatus === "delivered" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("delivered")}
          >
            Delivered ({stats.delivered})
          </Button>
        </div>
      </div>

      {/* Cargo Items Table */}
      <div className="logistics-card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Cargo Items</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>

        <DataTable
          id="container-cargo-items"
          rows={filteredItems}
          columns={columns}
          loading={false}
          empty={
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <div className="text-muted-foreground">
                {cargoItems.length === 0
                  ? "No cargo items in this container yet. Add items to get started."
                  : "No items match your current filters."}
              </div>
            </div>
          }
          rowActions={(row) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  // TODO: Open edit item dialog
                  toast({
                    title: "Edit Item",
                    description: "Edit functionality will be implemented",
                  });
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Item
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteItem(row.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Item
              </DropdownMenuItem>
            </>
          )}
          renderBulkBar={(rows) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Update Status
              </Button>
              <Button size="sm" variant="outline">
                Export Selected
              </Button>
              <Button size="sm" variant="destructive">
                Delete Selected
              </Button>
            </div>
          )}
        />
      </div>

      {/* Add Item Dialog */}
      <AddCargoItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        containerId={containerId!}
        cargoType={container?.cargo_type}
        onSuccess={() => {
          // Reload data after successful addition
          reloadData();
        }}
      />
    </div>
  );
}

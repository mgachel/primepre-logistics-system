import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  RefreshCcw,
  Edit,
  Trash2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { AddCargoItemDialog } from "@/components/dialogs/AddCargoItemDialog";
import { EditCargoContainerDialog } from "@/components/dialogs/EditCargoContainerDialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  cargoService,
  BackendCargoContainer,
  BackendCargoItem,
} from "@/services/cargoService";
import { formatDate } from "@/lib/date";

export default function ContainerDetailsPage() {
  // ...existing code...
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [container, setContainer] = useState<BackendCargoContainer | null>(
    null
  );
  const [cargoItems, setCargoItems] = useState<BackendCargoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedMark, setExpandedMark] = useState<string | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [showEditContainerDialog, setShowEditContainerDialog] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter and group cargo items by shipping mark based on search
  const groupedByShippingMark = useMemo(() => {
    const groups: Record<string, BackendCargoItem[]> = {};

    // Filter items based on search query
    const filteredItems = cargoItems.filter((item) => {
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase();
      const trackingId = item.tracking_id?.toLowerCase() || "";
      const shippingMark = item.client_shipping_mark?.toLowerCase() || "";
      const description = item.item_description?.toLowerCase() || "";
      
      return trackingId.includes(query) || 
             shippingMark.includes(query) || 
             description.includes(query);
    });

    filteredItems.forEach((item) => {
      const mark = item.client_shipping_mark || "Unknown";
      if (!groups[mark]) {
        groups[mark] = [];
      }
      groups[mark].push(item);
    });

    return groups;
  }, [cargoItems, searchQuery]);

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
      // Reload after deletion
      setCargoItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (e: unknown) {
      toast({
        title: "Delete Failed",
        description: e instanceof Error ? e.message : "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  // Cargo items table columns (for expanded view)
  const cargoColumns: Column<BackendCargoItem>[] = [
    {
      id: "tracking",
      header: "Tracking ID",
      accessor: (item) => (
        <span className="font-mono text-sm">{item.tracking_id}</span>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessor: (item) => (
        <div>
          {item.item_description}
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
          {container?.cargo_type === "sea" && <div>CBM: {item.cbm}</div>}
          {container?.cargo_type === "air" && item.weight && (
            <div>Weight: {item.weight} kg</div>
          )}
        </div>
      ),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      accessor: (item) => (
        <StatusBadge status={item.status as "pending" | "in-transit" | "delivered" | "delayed"} />
      ),
    },
    {
      id: "created",
      header: "Created",
      accessor: (item) => formatDate(item.created_at),
    },
  ];

  if (loading) {
    return <p className="text-center py-8">Loading container details...</p>;
  }

  if (error || !container) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error || "Container not found"}</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">{container.container_id}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {container.cargo_type === "sea" ? "Sea" : "Air"} Cargo •{" "}
            {cargoItems.length} items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditContainerDialog(true)}>
            <Edit className="h-4 w-4" /> Edit Container
          </Button>
          <Button size="sm" onClick={() => setShowAddItemDialog(true)}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Search Field */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by tracking number, shipping mark, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grouped by Shipping Mark */}
      <div className="space-y-4">
        {Object.entries(groupedByShippingMark).map(([mark, items]) => {
          const totalCBM = items.reduce((sum, i) => sum + (i.cbm || 0), 0);
          const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

          return (
            <div key={mark} className="logistics-card p-4">
              {/* Group Row */}
              <div className="flex justify-between items-center">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() =>
                    setExpandedMark(expandedMark === mark ? null : mark)
                  }
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{mark}</h3>
                      <p className="text-sm text-muted-foreground">
                        {items.length} item{items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex gap-8">
                      {container?.cargo_type === "sea" ? (
                        <span>CBM: {totalCBM.toFixed(3)}</span>
                      ) : (
                        <span>
                          Weight: {items.reduce((sum, i) => sum + (i.weight || 0), 0).toFixed(1)} kg
                        </span>
                      )}
                      <span>Qty: {totalQty}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded cargo items */}
              {expandedMark === mark && (
                <div className="mt-4">
                  <DataTable
                    id={`cargo-items-${mark}`}
                    rows={items}
                    columns={cargoColumns}
                    loading={false}
                    empty={<p>No items for {mark}.</p>}
                    rowActions={(row) => (
                      <>
                        <DropdownMenuItem
                          onClick={() =>
                            toast({
                              title: "Edit Item",
                              description:
                                "Edit functionality will be implemented",
                            })
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteItem(row.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Item Dialog */}
      <AddCargoItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        containerId={containerId || ""}
        cargoType={container?.cargo_type}
        location={container?.location}
        warehouse_type={container?.warehouse_type}
        onSuccess={() => {
          // reload container data
          window.location.reload();
        }}
      />

      {/* Edit Container Dialog */}
      <EditCargoContainerDialog
        open={showEditContainerDialog}
        onOpenChange={setShowEditContainerDialog}
        container={container}
        onSaved={(updatedContainer) => {
          setContainer(updatedContainer);
          setShowEditContainerDialog(false);
          toast({
            title: "Success",
            description: "Container updated successfully",
          });
        }}
      />
    </div>
  );
}

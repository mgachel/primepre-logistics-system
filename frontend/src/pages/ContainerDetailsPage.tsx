import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Package,
  RefreshCcw,
  Edit,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { AddCargoItemDialog } from "@/components/dialogs/AddCargoItemDialog";
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

  // Group cargo items by shipping mark
  const groupedByShippingMark = useMemo(() => {
    const groups: Record<string, BackendCargoItem[]> = {};

    cargoItems.forEach((item) => {
      const mark = item.client_shipping_mark || "Unknown";
      if (!groups[mark]) {
        groups[mark] = [];
      }
      groups[mark].push(item);
    });

    return groups;
  }, [cargoItems]);

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">{container.container_id}</h1>
          <p className="text-muted-foreground">
            {container.cargo_type === "sea" ? "Sea" : "Air"} Cargo •{" "}
            {cargoItems.length} items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAddItemDialog(true)}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
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
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() =>
                  setExpandedMark(expandedMark === mark ? null : mark)
                }
              >
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
        containerId={containerId!}
        cargoType={container?.cargo_type}
        onSuccess={() => {
          // reload container data
          window.location.reload();
        }}
      />
    </div>
  );
}

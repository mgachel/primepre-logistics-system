import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Ship,
  Plane,
  Package,
  Calendar,
  ArrowLeft,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  cargoService,
  BackendCargoContainer,
  BackendCargoItem,
} from "@/services/cargoService";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date";

// Map cargo type to icon
const getTypeIcon = (type: string) => {
  return type === "sea" ? Ship : Plane;
};

// Map status to badge
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

export default function CustomerCargoContainerDetailsPage() {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [container, setContainer] = useState<BackendCargoContainer | null>(null);
  const [items, setItems] = useState<BackendCargoItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load container details
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!containerId) {
        setError("Invalid container ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const containerData = await cargoService.getCustomerContainerDetails(Number(containerId));
        if (ignore) return;

        setContainer(containerData);

        // Load items for this container
        const itemsResponse = await cargoService.getCustomerContainerItems(Number(containerId));
        if (ignore) return;

        setItems(itemsResponse.results || []);
      } catch (err) {
        if (ignore) return;
        console.error("Error loading container details:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load container details"
        );
        toast({
          title: "Error",
          description: "Failed to load container details",
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
  }, [containerId, toast]);

  const handleBack = () => {
    if (container) {
      navigate(container.cargo_type === "sea" ? "/customer/cargo/sea" : "/customer/cargo/air");
    } else {
      navigate(-1);
    }
  };

  // Define table columns for items
  const itemColumns: Column<BackendCargoItem>[] = [
    {
      key: "customer_name",
      header: "Customer",
      render: (item) => (
        <div className="font-medium">{item.customer_name || "N/A"}</div>
      ),
    },
    {
      key: "shipping_mark",
      header: "Shipping Mark",
      render: (item) => (
        <div className="text-sm">{item.shipping_mark || "N/A"}</div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <div className="text-sm">{item.description || "N/A"}</div>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      render: (item) => (
        <div className="text-sm">{item.quantity || 0}</div>
      ),
    },
    {
      key: "cbm",
      header: "CBM",
      render: (item) => (
        <div className="text-sm">{item.cbm ? `${item.cbm} m³` : "N/A"}</div>
      ),
    },
    {
      key: "weight",
      header: "Weight",
      render: (item) => (
        <div className="text-sm">{item.weight ? `${item.weight} kg` : "N/A"}</div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <span className="block">Loading container details...</span>
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive">{error || "Container not found"}</p>
        </div>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(container.cargo_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={handleBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TypeIcon className="h-8 w-8" />
              {container.container_number}
            </h1>
            <p className="text-muted-foreground mt-1">
              {container.cargo_type === "sea" ? "Sea Cargo" : "Air Cargo"} Container Details
            </p>
          </div>
        </div>
        <StatusBadge status={mapStatus(container.status)} />
      </div>

      {/* Container Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Container Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Container No.</p>
                <p className="text-sm font-semibold mt-1">{container.container_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {container.cargo_type === "sea" ? "Vessel" : "Flight"}
                </p>
                <p className="text-sm font-semibold mt-1">{container.vessel || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {container.cargo_type === "sea" ? "Voyage" : "Flight No."}
                </p>
                <p className="text-sm font-semibold mt-1">{container.voyage_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <StatusBadge status={mapStatus(container.status)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Loading Date
                </p>
                <p className="text-sm font-semibold mt-1">
                  {container.loading_date ? formatDate(container.loading_date) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  ETA
                </p>
                <p className="text-sm font-semibold mt-1">
                  {container.eta ? formatDate(container.eta) : "N/A"}
                </p>
              </div>
              {container.actual_arrival && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Actual Arrival
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {formatDate(container.actual_arrival)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Information */}
      {(container.origin || container.destination) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {container.origin && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Origin</p>
                  <p className="text-sm font-semibold mt-1">{container.origin}</p>
                </div>
              )}
              {container.destination && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Destination</p>
                  <p className="text-sm font-semibold mt-1">{container.destination}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {container.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{container.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Your Items in This Container */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Your Items in This Container
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items found in this container</p>
            </div>
          ) : (
            <DataTable
              columns={itemColumns}
              data={items}
              loading={false}
              actions={(item) => [
                <DropdownMenuItem
                  key="view"
                  onClick={() => console.log("View item", item.id)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>,
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

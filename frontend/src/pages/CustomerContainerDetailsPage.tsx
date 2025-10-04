import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Ship,
  Calendar,
  Package,
  ArrowLeft,
  Printer,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  goodsReceivedContainerService,
  GoodsReceivedContainer,
  GoodsReceivedItem,
} from "@/services/goodsReceivedContainerService";
import { formatDate } from "@/lib/date";

export default function CustomerContainerDetailsPage() {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [container, setContainer] = useState<GoodsReceivedContainer | null>(null);
  const [goodsItems, setGoodsItems] = useState<GoodsReceivedItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, GoodsReceivedItem[]>>({});

  // Determine container type from current path
  const containerType: "sea" | "air" = window.location.pathname.includes("/air/") ? "air" : "sea";

  useEffect(() => {
    if (!containerId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [containerRes, itemsRes] = await Promise.all([
          goodsReceivedContainerService.getCustomerContainerById(containerId, containerType),
          goodsReceivedContainerService.getCustomerContainerItems(containerId, containerType),
        ]);

        setContainer(containerRes.data);
        setGroupedItems(itemsRes.data.items_by_shipping_mark);
        
        // Flatten items for the table
        const allItems = Object.values(itemsRes.data.items_by_shipping_mark).flat();
        setGoodsItems(allItems);
      } catch (error) {
        console.error("Failed to load container details:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load container details",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [containerId, containerType, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (goodsItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "There are no items to export",
      });
      return;
    }

    const headers = [
      "Shipping Mark",
      "Tracking Number",
      "Description",
      "Quantity",
      "Weight (kg)",
      "CBM",
      "Status",
      "Date Received",
    ];

    const csvData = goodsItems.map((item) => [
      item.shipping_mark,
      item.supply_tracking,
      item.description || "",
      item.quantity,
      item.weight || "",
      item.cbm || "",
      item.status,
      formatDate(item.date_received),
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `container-${containerId}-items.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Exported ${goodsItems.length} items to CSV`,
    });
  };

  if (loading) {
    return (
      <div className="logistics-container">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Package className="h-8 w-8 animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading container details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="logistics-container">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Package className="h-8 w-8 mx-auto mb-4 text-destructive" />
            <p className="text-destructive">Container not found</p>
            <Button
              onClick={() => navigate(`/customer/warehouse/${containerType}`)}
              variant="outline"
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Warehouse
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      processing: { variant: "default", label: "Processing" },
      ready_for_delivery: { variant: "default", label: "Ready" },
      delivered: { variant: "default", label: "Delivered" },
      flagged: { variant: "destructive", label: "Flagged" },
    };

    const config = statusMap[status] || statusMap.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="logistics-container print:p-8">
      {/* Header */}
      <div className="logistics-header print:hidden">
        <div className="logistics-title-section">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/customer/warehouse/${containerType}`)}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="logistics-icon-wrapper bg-blue-100">
            <Ship className="logistics-icon text-blue-600" />
          </div>
          <div>
            <h1 className="logistics-title">Container {container.container_id}</h1>
            <p className="logistics-subtitle">View your items in this container</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Container {container.container_id}</h1>
        <p className="text-sm text-muted-foreground">Your Items Details</p>
      </div>

      {/* Container Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Container Information</span>
            {getStatusBadge(container.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Container ID
              </div>
              <div className="font-mono font-semibold">{container.container_id}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Arrival Date
              </div>
              <div className="font-medium">
                {container.arrival_date ? formatDate(container.arrival_date) : "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center">
                <Package className="h-3 w-3 mr-1" />
                Your Items
              </div>
              <div className="font-medium">{goodsItems.length}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total Weight
              </div>
              <div className="font-medium">
                {goodsItems.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(2)} kg
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Total CBM
              </div>
              <div className="font-medium">
                {goodsItems.reduce((sum, item) => sum + (item.cbm || 0), 0).toFixed(2)} m³
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Type
              </div>
              <div className="font-medium uppercase">{container.container_type} Cargo</div>
            </div>
          </div>
          {container.notes && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
              <div className="text-sm">{container.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Items ({goodsItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipping Mark</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">CBM</TableHead>
                  <TableHead className="text-center">Days in Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goodsItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No items found in this container
                    </TableCell>
                  </TableRow>
                ) : (
                  goodsItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.shipping_mark}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.supply_tracking}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {item.weight ? `${item.weight} kg` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.cbm ? `${item.cbm} m³` : "—"}
                      </TableCell>
                      <TableCell className="text-center">{item.days_in_warehouse} days</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

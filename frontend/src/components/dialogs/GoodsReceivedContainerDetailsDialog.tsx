import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Package, 
  MapPin, 
  Calendar, 
  Weight, 
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Waves,
  Plane
} from "lucide-react";
import { GoodsReceivedContainer, GoodsReceivedItem } from "@/services/goodsReceivedContainerService";

interface GoodsReceivedContainerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: GoodsReceivedContainer | null;
  containerItems?: Record<string, GoodsReceivedItem[]>;
}

export function GoodsReceivedContainerDetailsDialog({ 
  open, 
  onOpenChange, 
  container,
  containerItems = {} 
}: GoodsReceivedContainerDetailsDialogProps) {
  if (!container) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "flagged":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "ready_for_delivery":
        return <Package className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "flagged":
        return "bg-red-100 text-red-800";
      case "ready_for_delivery":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const allItems = Object.values(containerItems).flat();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {container.container_type === 'air' ? (
              <Plane className="h-5 w-5" />
            ) : (
              <Waves className="h-5 w-5" />
            )}
            Goods Received Container Details - {container.container_id}
          </DialogTitle>
          <DialogDescription>
            Detailed information about goods received container {container.container_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Container ID</span>
              </div>
              <p className="font-mono text-lg font-semibold">{container.container_id}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Type</span>
              </div>
              <Badge variant="outline">
                {container.container_type?.toUpperCase() || 'N/A'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Location</span>
              </div>
              <Badge variant="outline">
                {container.location?.toUpperCase() || 'N/A'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(container.status)}
                <Badge className={getStatusColor(container.status)}>
                  {container.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Container Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{container.total_items_count}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Weight className="h-4 w-4" />
                  Total Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {container.total_weight && typeof container.total_weight === 'number' 
                    ? `${container.total_weight.toFixed(2)} kg` 
                    : 'N/A'
                  }
                </div>
              </CardContent>
            </Card>

            {container.container_type === 'sea' && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Total CBM
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {container.total_cbm && typeof container.total_cbm === 'number' 
                      ? `${container.total_cbm.toFixed(3)} CBM` 
                      : 'N/A'
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Shipping Marks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(containerItems).length}</div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Date Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Arrival Date</span>
              </div>
              <p className="text-sm">
                {container.arrival_date 
                  ? new Date(container.arrival_date).toLocaleDateString() 
                  : 'Not set'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expected Delivery</span>
              </div>
              <p className="text-sm">
                {container.expected_delivery_date 
                  ? new Date(container.expected_delivery_date).toLocaleDateString() 
                  : 'Not set'
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Actual Delivery</span>
              </div>
              <p className="text-sm">
                {container.actual_delivery_date 
                  ? new Date(container.actual_delivery_date).toLocaleDateString() 
                  : 'Not delivered'
                }
              </p>
            </div>
          </div>

          {container.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground">{container.notes}</p>
              </div>
            </>
          )}

          {/* Items by Shipping Mark */}
          {Object.keys(containerItems).length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Items by Shipping Mark</h3>
                
                {Object.entries(containerItems).map(([shippingMark, items]) => (
                  <Card key={shippingMark} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>Shipping Mark: {shippingMark}</span>
                        <Badge variant="secondary">{items.length} items</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supply Tracking</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Weight</TableHead>
                            {container.container_type === 'sea' && <TableHead>CBM</TableHead>}
                            <TableHead>Status</TableHead>
                            <TableHead>Days in Warehouse</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.supply_tracking}
                              </TableCell>
                              <TableCell>{item.description || 'N/A'}</TableCell>
                              <TableCell>{item.customer_name || 'N/A'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                {item.weight && typeof item.weight === 'number' 
                                  ? `${item.weight.toFixed(2)} kg` 
                                  : 'N/A'
                                }
                              </TableCell>
                              {container.container_type === 'sea' && (
                                <TableCell>
                                  {item.cbm && typeof item.cbm === 'number' 
                                    ? `${item.cbm.toFixed(3)} CBM` 
                                    : 'N/A'
                                  }
                                </TableCell>
                              )}
                              <TableCell>
                                <Badge variant={getStatusColor(item.status.toLowerCase()).includes('red') ? 'destructive' : 'default'}>
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>{item.days_in_warehouse} days</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
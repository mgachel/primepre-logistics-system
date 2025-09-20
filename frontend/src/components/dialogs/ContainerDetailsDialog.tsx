import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Ship, 
  MapPin, 
  Calendar, 
  Package, 
  Weight, 
  DollarSign,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ContainerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: any; // Will be typed properly when we know the structure
}

export function ContainerDetailsDialog({ open, onOpenChange, container }: ContainerDetailsDialogProps) {
  if (!container) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in-transit":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "delayed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-transit":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Container Details - {container.containerNo}
          </DialogTitle>
          <DialogDescription>
            Detailed information about cargo container {container.containerNo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Container Number</span>
              </div>
              <p className="font-mono text-lg font-semibold">{container.containerNo}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tracking ID</span>
              </div>
              <p className="font-semibold">{container.id}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(container.status)}
                <Badge className={getStatusColor(container.status)}>
                  {container.status.replace("-", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Client Name</span>
                <p className="font-medium">{container.client}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Route Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Route Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Origin</span>
                </div>
                <p className="font-medium">{container.origin}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Destination</span>
                </div>
                <p className="font-medium">{container.destination}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vessel Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vessel Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Vessel Name</span>
                </div>
                <p className="font-medium">{container.vessel}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Voyage Number</span>
                </div>
                <p className="font-medium">{container.voyage}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cargo Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cargo Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Goods Description</span>
                </div>
                <p className="font-medium">{container.goods}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Weight</span>
                </div>
                <p className="font-medium">{container.weight}</p>
              </div>
              
              {container.cargo_type === 'sea' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Volume (CBM)</span>
                  </div>
                  <p className="font-medium">{container.cbm} CBM</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Loading Date</span>
                </div>
                <p className="font-medium">{container.loadingDate}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estimated Arrival</span>
                </div>
                <p className="font-medium">{container.eta}</p>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {container.notes && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Notes</h3>
                <p className="text-sm text-muted-foreground">{container.notes}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button>
            Edit Container
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
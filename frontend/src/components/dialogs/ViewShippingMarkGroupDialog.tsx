import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Hash, Ruler, Weight, FileText, StickyNote } from "lucide-react";
import { GoodsReceivedItem } from "@/services/goodsReceivedContainerService";

interface ViewShippingMarkGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shippingMark: string;
  items: GoodsReceivedItem[];
  containerType: 'sea' | 'air';
}

export function ViewShippingMarkGroupDialog({
  open,
  onOpenChange,
  shippingMark,
  items,
  containerType,
}: ViewShippingMarkGroupDialogProps) {
  // Calculate totals
  const totalCBM = items.reduce((sum, i) => sum + (parseFloat(i.cbm?.toString() || '0') || 0), 0);
  const totalWeight = items.reduce((sum, i) => sum + (parseFloat(i.weight?.toString() || '0') || 0), 0);
  const totalQty = items.reduce((sum, i) => sum + (parseInt(i.quantity?.toString() || '0') || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] max-h-[85vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg md:text-xl break-words">
                Shipping Mark Group: {shippingMark}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
                <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                {containerType === 'sea' ? (
                  <span className="font-medium">Total CBM: {totalCBM.toFixed(5)} m³</span>
                ) : (
                  <span className="font-medium">Total Weight: {totalWeight.toFixed(1)} kg</span>
                )}
                <span className="font-medium">Total Qty: {totalQty} CTNS</span>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs sm:text-sm">
              {containerType === 'sea' ? 'Sea' : 'Air'} Freight
            </Badge>
          </div>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-4 sm:px-6">
            <div className="space-y-3 sm:space-y-4 py-4">
              {items.map((item, index) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm sm:text-base">Item {index + 1}</h3>
                    <Badge variant="outline" className="text-xs">
                      {item.quantity} CTNS
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Supply Tracking */}
                    <div className="flex items-start gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Supply Tracking</p>
                        <p className="font-medium text-sm break-all">{item.supply_tracking || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Description</p>
                          <p className="font-medium text-sm">{item.description}</p>
                        </div>
                      </div>
                    )}

                    {/* Dimensions (Sea only) */}
                    {containerType === 'sea' && item.length && item.breadth && item.height && (
                      <div className="flex items-start gap-2">
                        <Ruler className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Dimensions (L × B × H)</p>
                          <p className="font-medium text-sm">
                            {item.length} × {item.breadth} × {item.height} cm
                          </p>
                        </div>
                      </div>
                    )}

                    {/* CBM (Sea only) */}
                    {containerType === 'sea' && (
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">CBM</p>
                          <p className="font-medium text-sm">{parseFloat(item.cbm?.toString() || '0').toFixed(5)} m³</p>
                        </div>
                      </div>
                    )}

                    {/* Weight (Air only) */}
                    {containerType === 'air' && (
                      <div className="flex items-start gap-2">
                        <Weight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="font-medium text-sm">{parseFloat(item.weight?.toString() || '0').toFixed(1)} kg</p>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm">{item.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

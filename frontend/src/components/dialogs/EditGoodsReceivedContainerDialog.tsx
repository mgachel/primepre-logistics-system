import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { goodsReceivedContainerService, GoodsReceivedContainer } from "@/services/goodsReceivedContainerService";
import { ratesService, Rate } from "@/services/ratesService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: GoodsReceivedContainer | null;
  onSaved?: () => void;
};

export function EditGoodsReceivedContainerDialog({ 
  open, 
  onOpenChange, 
  container,
  onSaved 
}: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  
  const [form, setForm] = useState({
    container_type: "sea" as 'sea' | 'air',
    container_id: "",
    arrival_date: "",
    route: "China to Ghana",
    selected_rate_id: "",
    rates: "",
    dollar_rate: "",
    location: "ghana" as 'china' | 'ghana',
    status: "pending" as 'pending' | 'processing' | 'ready_for_delivery' | 'delivered' | 'flagged',
    notes: "",
  });

  // Load rates when container type changes
  useEffect(() => {
    const loadRates = async () => {
      if (!open) return;
      
      setLoadingRates(true);
      try {
        const rateType = form.container_type === 'sea' ? 'SEA_RATES' : 'AIR_RATES';
        const filters = {
          rate_type: rateType,
          limit: 100
        };
        
        const response = await ratesService.getRates(filters);
        setRates(response.data?.results || []);
        console.log('Loaded rates for edit dialog:', response.data?.results || []);
      } catch (error) {
        console.error('Failed to load rates:', error);
        setRates([]);
      } finally {
        setLoadingRates(false);
      }
    };

    loadRates();
  }, [form.container_type, open]);

  // Populate form when container changes
  useEffect(() => {
    if (container && open) {
      setForm({
        container_type: container.container_type || "sea",
        container_id: container.container_id || "",
        arrival_date: container.arrival_date?.split('T')[0] || "",
        route: "China to Ghana",
        selected_rate_id: container.selected_rate_id?.toString() || "",
        rates: container.rates?.toString() || "",
        dollar_rate: container.dollar_rate?.toString() || "",
        location: container.location || "ghana",
        status: container.status || "pending",
        notes: container.notes || "",
      });
    }
  }, [container, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!container) return;

    // Validation
    if (!form.container_id.trim()) {
      toast({
        title: "Validation Error",
        description: "Container/AWB ID is required",
        variant: "destructive",
      });
      return;
    }

    if (!form.arrival_date) {
      toast({
        title: "Validation Error", 
        description: "Offloading Date is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const updateData = {
        container_id: form.container_id.trim(),
        container_type: form.container_type,
        location: form.location,
        arrival_date: form.arrival_date,
        status: form.status,
        notes: form.notes.trim() || undefined,
        selected_rate_id: form.selected_rate_id || undefined,
        rates: form.rates ? parseFloat(form.rates) : undefined,
        dollar_rate: form.dollar_rate ? parseFloat(form.dollar_rate) : undefined,
      };

      console.log('Updating container with data:', updateData);
      
      await goodsReceivedContainerService.updateContainer(container.container_id, updateData);

      toast({
        title: "Container Updated",
        description: `Container ${form.container_id} has been updated successfully`,
      });

      onSaved?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : "Failed to update container";
          
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!container) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Cargo Container</DialogTitle>
          <DialogDescription>
            Update container details for {container?.container_id}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shipment_type">Shipment Type</Label>
                <Select 
                  value={form.container_type} 
                  onValueChange={(value: 'sea' | 'air') => 
                    setForm(f => ({ ...f, container_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sea">Sea Cargo</SelectItem>
                    <SelectItem value="air">Air Cargo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offloading_date">Offloading Date</Label>
                <Input
                  id="offloading_date"
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) => setForm(f => ({ ...f, arrival_date: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="route">Route</Label>
                <Select 
                  value={form.route} 
                  onValueChange={(value: string) => 
                    setForm(f => ({ ...f, route: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="China to Ghana">China to Ghana</SelectItem>
                    <SelectItem value="Ghana to China">Ghana to China</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rates">Rates</Label>
                <Select 
                  value={form.selected_rate_id} 
                  onValueChange={(value: string) => {
                    const selectedRate = rates.find(rate => rate.id.toString() === value);
                    setForm(f => ({ 
                      ...f, 
                      selected_rate_id: value,
                      rates: selectedRate ? selectedRate.amount.toString() : ""
                    }));
                  }}
                  disabled={loadingRates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRates ? "Loading rates..." : rates.length === 0 ? "No rates available" : "Select a rate"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rates.length === 0 && !loadingRates ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        No rates found for {form.container_type === 'air' ? 'Air' : 'Sea'} Cargo
                      </div>
                    ) : (
                      rates.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id.toString()}>
                          {rate.title} - ${rate.amount}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={form.status} 
                  onValueChange={(value: 'pending' | 'processing' | 'ready_for_delivery' | 'delivered' | 'flagged') => 
                    setForm(f => ({ ...f, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="ready_for_delivery">Ready for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="container_id">Container/AWB ID</Label>
                <Input
                  id="container_id"
                  value={form.container_id}
                  onChange={(e) => setForm(f => ({ ...f, container_id: e.target.value }))}
                  placeholder={form.container_type === 'air' ? "e.g., MSKU7823456 or 000-12345678" : "e.g., MSKU7823456 or 000-12345678"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dollar_rate">Dollar Rate</Label>
                <Select 
                  value={form.dollar_rate} 
                  onValueChange={(value: string) => 
                    setForm(f => ({ ...f, dollar_rate: value }))
                  }
                  disabled={loadingRates}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingRates ? "Loading rates..." : rates.length === 0 ? "No rates available" : "Select dollar rate"} />
                  </SelectTrigger>
                  <SelectContent>
                    {rates.length === 0 && !loadingRates ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        No rates found for {form.container_type === 'air' ? 'Air' : 'Sea'} Cargo
                      </div>
                    ) : (
                      rates.map((rate) => (
                        <SelectItem key={`dollar-${rate.id}`} value={rate.amount.toString()}>
                          ${rate.amount}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes field spanning remaining space */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional additional information..."
                  className="w-full h-24 px-3 py-2 text-sm rounded-md border border-input bg-background resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {submitting ? "Updating..." : "Update Container"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
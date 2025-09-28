import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { goodsReceivedContainerService } from "@/services/goodsReceivedContainerService";
import { ratesService, Rate } from "@/services/ratesService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'sea' | 'air';
  location?: 'china' | 'ghana';
  onCreated?: (containerId: string) => void;
};

export function NewGoodsReceivedContainerDialog({ 
  open, 
  onOpenChange, 
  defaultType = 'sea', 
  location = 'ghana',
  onCreated 
}: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);
  
  const [form, setForm] = useState({
    container_type: defaultType as 'sea' | 'air',
    container_id: "",
    arrival_date: "",
    route: "China to Ghana",
    selected_rate_id: "",
    rates: "",
    dollar_rate: "",
    location: location,
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
          limit: 100 // Get all available rates
        };
        
        console.log('Loading rates with filters:', filters);
        const response = await ratesService.getRates(filters);
        console.log('Rates loaded:', response.data?.results?.length || 0, 'rates');
        console.log('Available rates:', response.data?.results);
        
        setRates(response.data?.results || []);
      } catch (error) {
        console.error('Failed to load rates:', error);
        setRates([]);
      } finally {
        setLoadingRates(false);
      }
    };

    loadRates();
  }, [form.container_type, open]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setForm({
        container_type: defaultType,
        container_id: "",
        arrival_date: new Date().toISOString().split('T')[0],
        route: "China to Ghana",
        selected_rate_id: "",
        rates: "",
        dollar_rate: "",
        location: location,
        status: "pending",
        notes: "",
      });
    }
  }, [open, defaultType, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Comprehensive validation
    if (!form.container_id.trim()) {
      toast({
        title: "Validation Error",
        description: "Container/AWB ID is required",
        variant: "destructive",
      });
      return;
    }

    if (!form.container_type) {
      toast({
        title: "Validation Error", 
        description: "Container type is required",
        variant: "destructive",
      });
      return;
    }

    if (!form.location) {
      toast({
        title: "Validation Error", 
        description: "Location is required",
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
      const createData = {
        container_id: form.container_id.trim(),
        container_type: form.container_type as 'sea' | 'air',
        location: form.location as 'china' | 'ghana',
        arrival_date: form.arrival_date,
        selected_rate_id: form.selected_rate_id || undefined,
        rates: form.rates || undefined,
        dollar_rate: form.dollar_rate || undefined,
        status: form.status as 'pending' | 'processing' | 'ready_for_delivery' | 'delivered' | 'flagged',
        notes: form.notes.trim() || undefined,
      };
      
      console.log('Creating container with data:', createData);
      const response = await goodsReceivedContainerService.createContainer(createData);
      console.log('Container created successfully:', response.data);

      toast({
        title: "Container Created",
        description: `${form.container_type === 'air' ? 'Air' : 'Sea'} container ${response.data.container_id} has been created successfully`,
      });

      onCreated?.(response.data.container_id);
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : "Failed to create container";
          
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Cargo Container</DialogTitle>
          <DialogDescription>
            Creates a cargo container aligned with backend fields. Choose shipment type and enter container details.
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
                      rates: selectedRate?.amount?.toString() || ""
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
              {submitting ? "Creating..." : "Create Cargo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
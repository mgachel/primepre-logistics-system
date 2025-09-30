import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cargoService, BackendCargoContainer } from "@/services/cargoService";
import { ratesService, Rate } from "@/services/ratesService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: BackendCargoContainer | null;
  onSaved?: (updated: BackendCargoContainer) => void;
}

export function EditCargoContainerDialog({
  open,
  onOpenChange,
  container,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [availableRates, setAvailableRates] = useState<Rate[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  // Local form state seeded from container
  const [containerId, setContainerId] = useState("");
  const [cargoType, setCargoType] = useState<'sea' | 'air'>('sea');
  const [route, setRoute] = useState("");
  const [loadDate, setLoadDate] = useState("");
  const [eta, setEta] = useState("");
  const [rates, setRates] = useState<string | "">("");
  const [status, setStatus] =
    useState<BackendCargoContainer["status"]>("pending");

  useEffect(() => {
    if (!open || !container) return;
    setContainerId(container.container_id || "");
    setCargoType(container.cargo_type || 'sea');
    setRoute(container.route || "");
    setLoadDate(container.load_date || "");
    setEta(container.eta || "");
    setRates(container.rates != null ? String(container.rates) : "");
    setStatus(container.status);
  }, [open, container]);

  // Load available rates when dialog opens and cargo type changes
  useEffect(() => {
    if (!open || !cargoType) return;
    
    const loadRates = async () => {
      setLoadingRates(true);
      try {
        const rateType = cargoType === 'sea' ? 'SEA_RATES' : 'AIR_RATES';
        const response = await ratesService.getRates({ rate_type: rateType });
        if (response.success && response.data?.results) {
          setAvailableRates(response.data.results);
        }
      } catch (error) {
        console.error('Failed to load rates:', error);
        setAvailableRates([]);
      } finally {
        setLoadingRates(false);
      }
    };

    loadRates();
  }, [open, cargoType]);

  const canSave = useMemo(
    () => !!container && !!containerId && !!cargoType && !!route && !!loadDate && !!eta,
    [container, containerId, cargoType, route, loadDate, eta]
  );

  const handleClose = (next: boolean) => {
    if (!saving) onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!container) return;
    setSaving(true);
    try {
      const payload: Parameters<typeof cargoService.updateBackendContainer>[1] =
        {
          container_id: containerId.trim(),
          cargo_type: cargoType,
          route: route.trim(),
          load_date: loadDate,
          eta,
          rates: rates === "" ? null : parseFloat(rates),
          status,
        };

      const res = await cargoService.updateBackendContainer(
        container.container_id, // Use original container ID as identifier
        payload
      );
      if (res.data) {
        toast({
          title: "Container updated",
          description: `${container.container_id} has been updated.`,
        });
        onSaved?.(res.data);
        onOpenChange(false);
      }
    } catch (e: unknown) {
      toast({
        title: "Update failed",
        description:
          e instanceof Error ? e.message : "Unable to update container",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Cargo Container</DialogTitle>
          <DialogDescription>
            Update all details for container {container?.container_id}{" "}
            ({container?.cargo_type})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="container_id">Container/AWB ID</Label>
              <Input 
                id="container_id"
                value={containerId} 
                onChange={(e) => setContainerId(e.target.value)}
                placeholder="e.g., MSKU7823456 or 000-12345678"
                required
              />
            </div>
            <div>
              <Label>Shipment Type</Label>
              <Select value={cargoType} onValueChange={(v) => setCargoType(v as 'sea' | 'air')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sea">Sea Cargo</SelectItem>
                  <SelectItem value="air">Air Cargo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Route</Label>
              <Input
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="China to Ghana"
              />
            </div>
            <div>
              <Label>Load Date</Label>
              <Input
                type="date"
                value={loadDate}
                onChange={(e) => setLoadDate(e.target.value)}
              />
            </div>
            <div>
              <Label>ETA</Label>
              <Input
                type="date"
                value={eta}
                onChange={(e) => setEta(e.target.value)}
              />
            </div>
            <div>
              <Label>Rates (USD)</Label>
              <Select value={rates} onValueChange={setRates} disabled={loadingRates}>
                <SelectTrigger>
                  <SelectValue 
                    placeholder={loadingRates ? "Loading rates..." : "Select a rate"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {loadingRates ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading rates...</div>
                  ) : availableRates.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No rates available</div>
                  ) : (
                    availableRates
                      .filter(rate => rate.amount != null && rate.amount.toString() !== "")
                      .map((rate) => (
                        <SelectItem key={rate.id} value={String(rate.amount)}>
                          {rate.title} - ${rate.amount} ({rate.route})
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as BackendCargoContainer["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="demurrage">Demurrage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave || saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

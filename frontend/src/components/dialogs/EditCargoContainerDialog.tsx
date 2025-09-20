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
  const [route, setRoute] = useState("");
  const [loadDate, setLoadDate] = useState("");
  const [eta, setEta] = useState("");
  const [unloadingDate, setUnloadingDate] = useState<string | "">("");
  const [weight, setWeight] = useState<string | "">("");
  const [cbm, setCbm] = useState<string | "">("");
  const [rates, setRates] = useState<string | "">("");
  const [stayDays, setStayDays] = useState<string | "">("");
  const [delayDays, setDelayDays] = useState<string | "">("");
  const [status, setStatus] =
    useState<BackendCargoContainer["status"]>("pending");

  useEffect(() => {
    if (!open || !container) return;
    setRoute(container.route || "");
    setLoadDate(container.load_date || "");
    setEta(container.eta || "");
    setUnloadingDate(container.unloading_date || "");
    setWeight(container.cargo_type === 'air' && container.weight != null ? String(container.weight) : "");
    setCbm(""); // CBM not used for any cargo type
    setRates(container.rates != null ? String(container.rates) : "");
    setStayDays(container.stay_days != null ? String(container.stay_days) : "");
    setDelayDays(
      container.delay_days != null ? String(container.delay_days) : ""
    );
    setStatus(container.status);
  }, [open, container]);

  // Load available rates when dialog opens and container type is known
  useEffect(() => {
    if (!open || !container?.cargo_type) return;
    
    const loadRates = async () => {
      setLoadingRates(true);
      try {
        const rateTypes = container.cargo_type === 'sea' ? ['SEA_RATES'] : ['AIR_RATES'];
        const rates = await ratesService.getRatesByTypes(rateTypes);
        setAvailableRates(rates);
      } catch (error) {
        console.error('Failed to load rates:', error);
        setAvailableRates([]);
      } finally {
        setLoadingRates(false);
      }
    };

    loadRates();
  }, [open, container?.cargo_type]);

  const canSave = useMemo(
    () => !!container && !!route && !!loadDate && !!eta,
    [container, route, loadDate, eta]
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
          route: route.trim(),
          load_date: loadDate,
          eta,
          unloading_date: unloadingDate || undefined,
          ...(container.cargo_type === 'air' && { weight: weight === "" ? null : parseFloat(weight) }),
          rates: rates === "" ? null : parseFloat(rates),
          stay_days: stayDays === "" ? 0 : parseInt(stayDays, 10),
          delay_days: delayDays === "" ? 0 : parseInt(delayDays, 10),
          status,
        };

      const res = await cargoService.updateBackendContainer(
        container.container_id,
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Cargo Container</DialogTitle>
          <DialogDescription>
            Update all editable details for container {container?.container_id}{" "}
            ({container?.cargo_type})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Container ID</Label>
              <Input value={container?.container_id || ""} disabled />
            </div>
            <div>
              <Label>Cargo Type</Label>
              <Input value={container?.cargo_type || ""} disabled />
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
              <Label>Unloading Date</Label>
              <Input
                type="date"
                value={unloadingDate || ""}
                onChange={(e) => setUnloadingDate(e.target.value)}
              />
            </div>
            {container?.cargo_type === 'air' && (
              <div>
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Rates</Label>
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
                          {rate.name} - ${rate.amount}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stay Days</Label>
              <Input
                type="number"
                value={stayDays}
                onChange={(e) => setStayDays(e.target.value)}
              />
            </div>
            <div>
              <Label>Delay Days</Label>
              <Input
                type="number"
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
              />
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

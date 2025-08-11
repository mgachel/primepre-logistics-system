import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cargoService } from "@/services/cargoService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'sea' | 'air';
  onCreated?: (containerId: string) => void;
};

export function NewCargoContainerDialog({ open, onOpenChange, defaultType = 'sea', onCreated }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    cargo_type: defaultType as 'sea' | 'air',
    container_id: "",
    load_date: "",
    eta: "",
    route: "China to Ghana",
    cbm: "",
    weight: "",
    rates: "",
    status: "pending" as 'pending' | 'in_transit' | 'delivered' | 'demurrage',
  });

  // Reset type if defaultType changes when reusing dialog
  React.useEffect(()=>{
    if (open) setForm((f)=>({ ...f, cargo_type: defaultType }));
  }, [open, defaultType]);

  const disabled = useMemo(()=>{
    return !form.container_id || !form.load_date || !form.eta || !form.route || !form.cargo_type;
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      const payload = {
        container_id: form.container_id.trim(),
        cargo_type: form.cargo_type,
        weight: form.weight ? Number(form.weight) : null,
        cbm: form.cbm ? Number(form.cbm) : null,
        load_date: form.load_date,
        eta: form.eta,
        route: form.route.trim(),
        rates: form.rates ? Number(form.rates) : null,
        stay_days: 0,
        delay_days: 0,
        status: form.status,
      };
      const res = await cargoService.createBackendContainer(payload);
      toast({ title: "Cargo created", description: `Container ${payload.container_id} (${payload.cargo_type}) created.` });
      onOpenChange(false);
      setForm({ cargo_type: defaultType, container_id: "", load_date: "", eta: "", route: "China to Ghana", cbm: "", weight: "", rates: "", status: "pending" });
      onCreated?.(res.data?.container_id || payload.container_id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create cargo';
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v)=>{ if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Cargo Container</DialogTitle>
          <DialogDescription>Creates a cargo container aligned with backend fields. Choose shipment type and enter container details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shipment Type</Label>
              <Select value={form.cargo_type} onValueChange={(v)=> setForm(f=> ({...f, cargo_type: v as 'sea' | 'air'}))}>
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
              <Label htmlFor="container_id">Container/AWB ID</Label>
              <Input id="container_id" placeholder="e.g., MSKU7823456 or 000-12345678" value={form.container_id} onChange={(e)=> setForm(f=> ({...f, container_id: e.target.value}))} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="load_date">Load Date</Label>
              <Input id="load_date" type="date" value={form.load_date} onChange={(e)=> setForm(f=> ({...f, load_date: e.target.value}))} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta">ETA</Label>
              <Input id="eta" type="date" value={form.eta} onChange={(e)=> setForm(f=> ({...f, eta: e.target.value}))} required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="route">Route</Label>
              <Input id="route" placeholder="China to Ghana" value={form.route} onChange={(e)=> setForm(f=> ({...f, route: e.target.value}))} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cbm">CBM</Label>
              <Input id="cbm" type="number" step="0.01" placeholder="0.00" value={form.cbm} onChange={(e)=> setForm(f=> ({...f, cbm: e.target.value}))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.01" placeholder="0.00" value={form.weight} onChange={(e)=> setForm(f=> ({...f, weight: e.target.value}))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rates">Rates (USD)</Label>
              <Input id="rates" type="number" step="0.01" placeholder="0.00" value={form.rates} onChange={(e)=> setForm(f=> ({...f, rates: e.target.value}))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v)=> setForm(f=> ({...f, status: v as 'pending' | 'in_transit' | 'delivered' | 'demurrage'}))}>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={()=> onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || disabled}>{submitting ? 'Creating…' : 'Create Cargo'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

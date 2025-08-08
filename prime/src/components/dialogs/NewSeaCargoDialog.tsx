import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface NewSeaCargoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSeaCargoDialog({ open, onOpenChange }: NewSeaCargoDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    containerNo: "",
    client: "",
    origin: "",
    destination: "",
    vessel: "",
    voyage: "",
    loadingDate: "",
    eta: "",
    cbm: "",
    weight: "",
    goods: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("New sea cargo created:", formData);
    
    toast({
      title: "Sea Cargo Created",
      description: `New sea cargo shipment ${formData.containerNo} has been created successfully.`,
    });

    // Reset form
    setFormData({
      containerNo: "",
      client: "",
      origin: "",
      destination: "",
      vessel: "",
      voyage: "",
      loadingDate: "",
      eta: "",
      cbm: "",
      weight: "",
      goods: "",
      notes: ""
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Sea Cargo</DialogTitle>
          <DialogDescription>
            Enter the sea cargo shipment details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="containerNo">Container Number</Label>
              <Input
                id="containerNo"
                value={formData.containerNo}
                onChange={(e) => setFormData({...formData, containerNo: e.target.value})}
                placeholder="MSKU7823456"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => setFormData({...formData, client: e.target.value})}
                placeholder="Client name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Origin Port</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData({...formData, origin: e.target.value})}
                placeholder="Shanghai Port"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination Port</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                placeholder="Tema Port"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vessel">Vessel Name</Label>
              <Input
                id="vessel"
                value={formData.vessel}
                onChange={(e) => setFormData({...formData, vessel: e.target.value})}
                placeholder="MSC MEDITERRANEAN"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voyage">Voyage Number</Label>
              <Input
                id="voyage"
                value={formData.voyage}
                onChange={(e) => setFormData({...formData, voyage: e.target.value})}
                placeholder="24W28"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loadingDate">Loading Date</Label>
              <Input
                id="loadingDate"
                type="date"
                value={formData.loadingDate}
                onChange={(e) => setFormData({...formData, loadingDate: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta">ETA</Label>
              <Input
                id="eta"
                type="date"
                value={formData.eta}
                onChange={(e) => setFormData({...formData, eta: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cbm">CBM</Label>
              <Input
                id="cbm"
                type="number"
                step="0.1"
                value={formData.cbm}
                onChange={(e) => setFormData({...formData, cbm: e.target.value})}
                placeholder="67.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                placeholder="12400"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goods">Goods Description</Label>
            <Input
              id="goods"
              value={formData.goods}
              onChange={(e) => setFormData({...formData, goods: e.target.value})}
              placeholder="Electronics & Machinery"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes about the shipment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Sea Cargo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
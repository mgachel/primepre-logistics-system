import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface NewAirCargoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAirCargoDialog({ open, onOpenChange }: NewAirCargoDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    awbNumber: "",
    client: "",
    origin: "",
    destination: "",
    airline: "",
    flightNumber: "",
    departureDate: "",
    arrivalDate: "",
    weight: "",
    volume: "",
    goods: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("New air cargo created:", formData);
    
    toast({
      title: "Air Cargo Created",
      description: `New air cargo shipment ${formData.awbNumber} has been created successfully.`,
    });

    // Reset form
    setFormData({
      awbNumber: "",
      client: "",
      origin: "",
      destination: "",
      airline: "",
      flightNumber: "",
      departureDate: "",
      arrivalDate: "",
      weight: "",
      volume: "",
      goods: "",
      notes: ""
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Air Cargo</DialogTitle>
          <DialogDescription>
            Enter the air cargo shipment details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="awbNumber">AWB Number</Label>
              <Input
                id="awbNumber"
                value={formData.awbNumber}
                onChange={(e) => setFormData({...formData, awbNumber: e.target.value})}
                placeholder="123-45678901"
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
              <Label htmlFor="origin">Origin Airport</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData({...formData, origin: e.target.value})}
                placeholder="Guangzhou Baiyun International Airport"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination Airport</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({...formData, destination: e.target.value})}
                placeholder="Kotoka International Airport"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airline">Airline</Label>
              <Input
                id="airline"
                value={formData.airline}
                onChange={(e) => setFormData({...formData, airline: e.target.value})}
                placeholder="Ethiopian Airlines"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flightNumber">Flight Number</Label>
              <Input
                id="flightNumber"
                value={formData.flightNumber}
                onChange={(e) => setFormData({...formData, flightNumber: e.target.value})}
                placeholder="ET920"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureDate">Departure Date</Label>
              <Input
                id="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({...formData, departureDate: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalDate">Arrival Date</Label>
              <Input
                id="arrivalDate"
                type="date"
                value={formData.arrivalDate}
                onChange={(e) => setFormData({...formData, arrivalDate: e.target.value})}
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
                placeholder="500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Volume (CBM)</Label>
              <Input
                id="volume"
                type="number"
                step="0.1"
                value={formData.volume}
                onChange={(e) => setFormData({...formData, volume: e.target.value})}
                placeholder="2.5"
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
              placeholder="Electronics, Documents, Samples"
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
              Create Air Cargo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface NewGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: "china" | "ghana";
}

export function NewGoodsDialog({ open, onOpenChange, warehouse }: NewGoodsDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    trackingNumber: "",
    client: "",
    description: "",
    quantity: "",
    weight: "",
    cbm: "",
    arrivalDate: "",
    status: "received",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("New goods received:", formData);
    
    toast({
      title: "Goods Received",
      description: `New goods ${formData.trackingNumber} have been added to ${warehouse} warehouse.`,
    });

    // Reset form
    setFormData({
      trackingNumber: "",
      client: "",
      description: "",
      quantity: "",
      weight: "",
      cbm: "",
      arrivalDate: "",
      status: "received",
      notes: ""
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Goods to {warehouse.charAt(0).toUpperCase() + warehouse.slice(1)} Warehouse</DialogTitle>
          <DialogDescription>
            Enter the goods details received at the warehouse
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber}
                onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                placeholder="TRK-2024-001"
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
              <Label htmlFor="description">Goods Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Electronics, Textiles, etc."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="100"
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
              <Label htmlFor="cbm">CBM</Label>
              <Input
                id="cbm"
                type="number"
                step="0.1"
                value={formData.cbm}
                onChange={(e) => setFormData({...formData, cbm: e.target.value})}
                placeholder="2.5"
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="inspected">Inspected</SelectItem>
                  <SelectItem value="stored">Stored</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes about the goods..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Goods
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
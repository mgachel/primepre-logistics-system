import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { warehouseService } from "@/services/warehouseService";

interface NewGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: "china" | "ghana";
  onCreated?: () => void;
}

export function NewGoodsDialog({
  open,
  onOpenChange,
  warehouse,
  onCreated,
}: NewGoodsDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    shipping_mark: "",
    supply_tracking: "",
    description: "",
    quantity: "",
    weight: "",
    cbm: "",
    location: "",
    method_of_shipping: "SEA" as "AIR" | "SEA",
    supplier_name: "",
    estimated_value: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.shipping_mark ||
      !formData.supply_tracking ||
      !formData.quantity ||
      !formData.cbm
    ) {
      toast({
        title: "Missing fields",
        description:
          "Shipping mark, Supply tracking, Quantity and CBM are required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        shipping_mark: formData.shipping_mark.trim(),
        supply_tracking: formData.supply_tracking.trim(),
        description: formData.description || undefined,
        quantity: Number(formData.quantity),
        cbm: Number(formData.cbm),
        weight: formData.weight ? Number(formData.weight) : undefined,
        location: formData.location || undefined,
        method_of_shipping: formData.method_of_shipping,
        supplier_name: formData.supplier_name || undefined,
        estimated_value: formData.estimated_value
          ? Number(formData.estimated_value)
          : undefined,
        notes: formData.notes || undefined,
      };
      const res =
        warehouse === "ghana"
          ? await warehouseService.createGhanaWarehouseItem(payload)
          : await warehouseService.createChinaWarehouseItem(payload);
      if (res.success) {
        toast({
          title: "Goods added",
          description: `Item ${res.data.item_id} created in ${warehouse} warehouse.`,
        });
        // Reset form
        setFormData({
          shipping_mark: "",
          supply_tracking: "",
          description: "",
          quantity: "",
          weight: "",
          cbm: "",
          location: "",
          method_of_shipping: "SEA",
          supplier_name: "",
          estimated_value: "",
          notes: "",
        });
        onOpenChange(false);
        onCreated?.();
      } else {
        toast({
          title: "Create failed",
          description: res.message || "Unable to create item",
          variant: "destructive",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      toast({
        title: "Create failed",
        description: msg,
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
          <DialogTitle>
            Add Goods to{" "}
            {warehouse.charAt(0).toUpperCase() + warehouse.slice(1)} Warehouse
          </DialogTitle>
          <DialogDescription>
            Enter the goods details received at the warehouse
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supply_tracking">Supplier Tracking No.</Label>
              <Input
                id="supply_tracking"
                value={formData.supply_tracking}
                onChange={(e) =>
                  setFormData({ ...formData, supply_tracking: e.target.value })
                }
                placeholder="TRK123456789"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping_mark">Shipping Mark</Label>
              <Input
                id="shipping_mark"
                value={formData.shipping_mark}
                onChange={(e) =>
                  setFormData({ ...formData, shipping_mark: e.target.value })
                }
                placeholder="PMJOHN01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Goods Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Electronics, Textiles, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, weight: e.target.value })
                }
                placeholder="500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cbm">CBM</Label>
              <Input
                id="cbm"
                type="number"
                step="0.1"
                value={formData.cbm}
                onChange={(e) =>
                  setFormData({ ...formData, cbm: e.target.value })
                }
                placeholder="2.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder={warehouse === "ghana" ? "ACCRA" : "GUANGZHOU"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_name">Supplier Name</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_name: e.target.value })
                }
                placeholder="Supplier Ltd"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_value">Estimated Value (USD)</Label>
              <Input
                id="estimated_value"
                type="number"
                step="0.01"
                value={formData.estimated_value}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_value: e.target.value })
                }
                placeholder="1000.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Additional notes about the goods..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Add Goods
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

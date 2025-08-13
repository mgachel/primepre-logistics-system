import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cargoService } from "@/services/cargoService";

interface AddCargoItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string;
  onSuccess?: () => void;
}

export function AddCargoItemDialog({
  open,
  onOpenChange,
  containerId,
  onSuccess,
}: AddCargoItemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [itemType, setItemType] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [cbm, setCbm] = useState("");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setItemType("");
    setDescription("");
    setQuantity("");
    setWeight("");
    setCbm("");
    setClientName("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemType || !description || !quantity || !clientName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await cargoService.createCargoItem({
        container: parseInt(containerId, 10),
        description,
        quantity: parseInt(quantity, 10),
        weight: weight ? parseFloat(weight) : 0,
        cbm: cbm ? parseFloat(cbm) : 0,
        shipping_mark: clientName,
        notes: notes || undefined,
        type: "SEA", // Default to SEA, can be determined by container type
      });

      toast({
        title: "Success",
        description: "Cargo item added successfully",
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add cargo item:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add cargo item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Cargo Item</DialogTitle>
          <DialogDescription>
            Add a new cargo item to container {containerId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemType">Item Type *</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="furniture">Furniture</SelectItem>
                  <SelectItem value="machinery">Machinery</SelectItem>
                  <SelectItem value="food">Food Products</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="books">Books/Documents</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the item"
            />
          </div>

          <div>
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Client or consignee name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
              />
            </div>

            <div>
              <Label htmlFor="cbm">CBM (m³)</Label>
              <Input
                id="cbm"
                type="number"
                min="0"
                step="0.01"
                value={cbm}
                onChange={(e) => setCbm(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or special instructions"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

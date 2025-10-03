import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  warehouseService,
  WarehouseItem,
  UpdateWarehouseItemRequest,
} from "@/services/warehouseService";
import { clientService } from "@/services/clientService";

interface Customer {
  id: number;
  shipping_mark: string;
  business_name: string;
}

interface EditGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WarehouseItem | null;
  warehouseType: "china" | "ghana";
  onSuccess?: () => void;
}

export function EditGoodsDialog({
  open,
  onOpenChange,
  item,
  warehouseType,
  onSuccess,
}: EditGoodsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [formData, setFormData] = useState({
    customer: "",
    supply_tracking: "",
    cbm: "",
    weight: "",
    quantity: "",
    description: "",
    location: "",
    length: "",
    breadth: "",
    height: "",
    method_of_shipping: "SEA" as "AIR" | "SEA",
  });

  // Load item data when dialog opens
  useEffect(() => {
    if (open && item) {
      setFormData({
        customer: item.customer?.toString() || "",
        supply_tracking: item.supply_tracking || "",
        cbm: item.cbm?.toString() || "",
        weight: item.weight?.toString() || "",
        quantity: item.quantity?.toString() || "",
        description: item.description || "",
        location: item.location || "",
        length: "",
        breadth: "",
        height: "",
        method_of_shipping: item.method_of_shipping || "SEA",
      });
    }
  }, [open, item]);

  // Load customers when dialog opens
  useEffect(() => {
    if (open) {
      loadCustomers();
    }
  }, [open]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await clientService.getClients({
        page: 1,
        page_size: 100,
      });

      if (response.results) {
        setCustomers(
          response.results.map((client: any) => ({
            id: client.id,
            shipping_mark: client.shipping_mark,
            business_name: client.business_name,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const isGhanaSea = warehouseType === "ghana" && formData.method_of_shipping === "SEA";
  const isGhanaAir = warehouseType === "ghana" && formData.method_of_shipping === "AIR";
  const isChinaSea = warehouseType === "china" && formData.method_of_shipping === "SEA";
  const isChinaAir = warehouseType === "china" && formData.method_of_shipping === "AIR";

  const handleDimensionChange = (dimension: string, value: string) => {
    const newFormData = { ...formData, [dimension]: value };
    setFormData(newFormData);

    // Auto-calculate CBM for Ghana Sea cargo
    if (isGhanaSea) {
      const length = parseFloat(newFormData.length) || 0;
      const breadth = parseFloat(newFormData.breadth) || 0;
      const height = parseFloat(newFormData.height) || 0;

      if (length > 0 && breadth > 0 && height > 0) {
        const cbm = (length * breadth * height) / 1000000; // Convert cm³ to m³
  newFormData.cbm = cbm.toFixed(3);
        setFormData(newFormData);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      const updateData: UpdateWarehouseItemRequest = {
        customer: formData.customer ? Number(formData.customer) : undefined,
        supply_tracking: formData.supply_tracking,
        // Only include CBM for cargo types that need it (exclude Ghana Air and China Air)
        ...((!isGhanaAir && !isChinaAir) && { cbm: Number(formData.cbm) }),
        // Only include weight for cargo types that need it (exclude Ghana Sea and China Sea)
        weight: (!isGhanaSea && !isChinaSea && formData.weight) ? Number(formData.weight) : undefined,
        quantity: Number(formData.quantity),
        description: formData.description,
        method_of_shipping: formData.method_of_shipping,
      };

      // Add location for Ghana warehouse
      if (warehouseType === "ghana") {
        updateData.location = formData.location;
      }

      if (warehouseType === "china") {
        await warehouseService.updateChinaWarehouseItem(item.id, updateData);
      } else {
        await warehouseService.updateGhanaWarehouseItem(item.id, updateData);
      }

      toast({
        title: "Success",
        description: "Item updated successfully",
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit {formData.method_of_shipping} Cargo - {warehouseType.charAt(0).toUpperCase() + warehouseType.slice(1)} Warehouse
          </DialogTitle>
          <DialogDescription>
            Update the details for this warehouse item
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={formData.customer}
                onValueChange={(value) =>
                  setFormData({ ...formData, customer: value })
                }
                disabled={loadingCustomers}
              >
                <SelectTrigger>
                  <SelectValue 
                    placeholder={
                      loadingCustomers
                        ? "Loading customers..."
                        : "Select customer..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.business_name} ({customer.shipping_mark})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supply Tracking */}
            <div className="space-y-2">
              <Label htmlFor="supply_tracking">Supply Tracking *</Label>
              <Input
                id="supply_tracking"
                value={formData.supply_tracking}
                onChange={(e) =>
                  setFormData({ ...formData, supply_tracking: e.target.value })
                }
                required
              />
            </div>

            {/* Method of Shipping */}
            <div className="space-y-2">
              <Label htmlFor="method_of_shipping">Shipping Method</Label>
              <Select
                value={formData.method_of_shipping}
                onValueChange={(value) =>
                  setFormData({ ...formData, method_of_shipping: value as "AIR" | "SEA" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEA">Sea</SelectItem>
                  <SelectItem value="AIR">Air</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                required
              />
            </div>

            {/* Dimensions for Ghana Sea cargo */}
            {isGhanaSea && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="length">Length (cm) *</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.length}
                    onChange={(e) => handleDimensionChange("length", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                                    <Label htmlFor="breadth">Breadth (cm) *</Label>
                  <Input
                    id="breadth"
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="Enter breadth in cm"
                    value={formData.breadth}
                    onChange={(e) => handleDimensionChange("breadth", e.target.value)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.height}
                    onChange={(e) => handleDimensionChange("height", e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* CBM - hide for Ghana Air and China Air cargo */}
            {!isGhanaAir && !isChinaAir && (
              <div className="space-y-2">
                <Label htmlFor="cbm">
                  CBM *
                  {isGhanaSea && " (Auto-calculated)"}
                </Label>
                <Input
                  id="cbm"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.cbm}
                  onChange={(e) =>
                    setFormData({ ...formData, cbm: e.target.value })
                  }
                  required
                  readOnly={isGhanaSea}
                  className={isGhanaSea ? "bg-muted" : ""}
                />
              </div>
            )}

            {/* Weight - hide for Ghana Sea and China Sea */}
            {!isGhanaSea && !isChinaSea && (
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                />
              </div>
            )}

            {/* Location for Ghana */}
            {warehouseType === "ghana" && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCRA">Accra</SelectItem>
                    <SelectItem value="KUMASI">Kumasi</SelectItem>
                    <SelectItem value="TAKORADI">Takoradi</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter item description..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
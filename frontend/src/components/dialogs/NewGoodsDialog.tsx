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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { warehouseService, CreateWarehouseItemRequest } from "@/services/warehouseService";
import { containerExcelService } from "@/services/containerExcelService";
import { CustomerOption, mapCustomerToOption, rankCustomerOptions } from "@/lib/customerSearch";

interface NewGoodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: "china" | "ghana";
  warehouseType?: "china" | "ghana";
  defaultShippingMethod?: "AIR" | "SEA";
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function NewGoodsDialog({
  open,
  onOpenChange,
  warehouse,
  warehouseType,
  defaultShippingMethod = "SEA",
  onCreated,
  onSuccess,
}: NewGoodsDialogProps) {
  const { toast } = useToast();
  
  // Use either warehouse or warehouseType prop
  const targetWarehouse = warehouse || warehouseType || "china";
  
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch, 250);
  const [allCustomers, setAllCustomers] = useState<CustomerOption[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    customer_id: "",
    supply_tracking: "",
    description: "",
    quantity: "",
    weight: "",
    cbm: "",
    length: "",
    breadth: "",
    height: "",
    method_of_shipping: defaultShippingMethod as "AIR" | "SEA",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Load all customers when dialog opens
  React.useEffect(() => {
    if (!customerPopoverOpen) return;
    let ignore = false;
    setCustomersLoading(true);
    setCustomersError(null);

    const loadCustomers = async () => {
      try {
        const records = await containerExcelService.getAllCustomers();
        if (ignore) return;
        const mapped = records.map(mapCustomerToOption);
        mapped.sort((a, b) => a.shippingMark.localeCompare(b.shippingMark) || a.displayName.localeCompare(b.displayName));
        setAllCustomers(mapped);
      } catch (error) {
        if (ignore) return;
        console.error("Failed to load customers:", error);
        setAllCustomers([]);
        setCustomersError(error instanceof Error ? error.message : "Failed to load customers");
      } finally {
        if (!ignore) {
          setCustomersLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      ignore = true;
    };
  }, [customerPopoverOpen]);

  // Re-rank customers whenever the query changes
  React.useEffect(() => {
    const ranked = rankCustomerOptions(allCustomers, debouncedCustomerSearch, 150);
    setFilteredCustomers(ranked);
  }, [allCustomers, debouncedCustomerSearch]);

  // Check if this is Ghana Sea (needs dimensions instead of direct CBM input)
  const isGhanaSea = targetWarehouse === "ghana" && defaultShippingMethod === "SEA";
  
  // Check if this is Ghana Air (CBM not needed, only weight matters)
  const isGhanaAir = targetWarehouse === "ghana" && defaultShippingMethod === "AIR";

  // Check if this is China Sea (weight not needed)
  const isChinaSea = targetWarehouse === "china" && defaultShippingMethod === "SEA";
  
  // Check if this is China Air (CBM not needed)
  const isChinaAir = targetWarehouse === "china" && defaultShippingMethod === "AIR";

  // Auto-calculate CBM from dimensions for Ghana Sea
  const calculateCBM = (length: string, breadth: string, height: string) => {
    const l = parseFloat(length) || 0;
    const w = parseFloat(breadth) || 0;
    const h = parseFloat(height) || 0;
    const q = parseFloat(formData.quantity) || 1;
    const cbm = (l * w * h * q) / 1000000; // Convert cubic cm to cubic meters
    // Round to 3 decimal places to avoid precision issues
    return Math.round(cbm * 1000) / 1000;
  };

  // Update CBM when dimensions change for Ghana Sea
  const handleDimensionChange = (field: 'length' | 'breadth' | 'height', value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    if (isGhanaSea) {
      const cbm = calculateCBM(newFormData.length, newFormData.breadth, newFormData.height);
      newFormData.cbm = cbm.toString();
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.supply_tracking || !formData.quantity) {
      toast({
        title: "Missing fields",
        description: "Supply tracking and Quantity are required.",
        variant: "destructive",
      });
      return;
    }

    // Validate CBM or dimensions based on cargo type
    if (isGhanaSea) {
      // Ghana Sea requires dimensions
      if (!formData.length || !formData.breadth || !formData.height) {
        toast({
          title: "Missing dimensions",
          description: "Length, Breadth, and Height are required for Ghana Sea cargo.",
          variant: "destructive",
        });
        return;
      }
    } else if (!isGhanaAir && !isChinaAir && !formData.cbm) {
      // CBM is required for all cargo types except Ghana Air and China Air
      toast({
        title: "Missing CBM",
        description: "CBM is required.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // Get selected customer's shipping mark
      const selectedCustomer = formData.customer_id 
        ? allCustomers.find(c => c.id.toString() === formData.customer_id)
        : undefined;

      const payload: CreateWarehouseItemRequest = {
        shipping_mark: selectedCustomer?.shippingMark || formData.supply_tracking.trim(),
        supply_tracking: formData.supply_tracking.trim(),
        description: formData.description || undefined,
        quantity: Number(formData.quantity),
        // Only include CBM for cargo types that need it (exclude Ghana Air and China Air)
        cbm: (!isGhanaAir && !isChinaAir && formData.cbm) ? Number(formData.cbm) : undefined,
        // Only include weight for cargo types that need it (exclude Ghana Sea and China Sea)
        weight: (!isGhanaSea && !isChinaSea && formData.weight) ? Number(formData.weight) : undefined,
        method_of_shipping: formData.method_of_shipping,
        notes: formData.notes || undefined,
        // Set default status to READY_FOR_SHIPPING for China warehouse items
        status: targetWarehouse === "china" ? "READY_FOR_SHIPPING" : undefined,
      };

      const res =
        targetWarehouse === "ghana"
          ? await warehouseService.createGhanaWarehouseItem(payload)
          : await warehouseService.createChinaWarehouseItem(payload);
      if (res.success) {
        toast({
          title: "Goods added",
          description: `Item ${res.data.id} created in ${targetWarehouse} warehouse.`,
        });
        // Reset form
        setFormData({
          customer_id: "",
          supply_tracking: "",
          description: "",
          quantity: "",
          weight: "",
          cbm: "",
          length: "",
          breadth: "",
          height: "",
          method_of_shipping: defaultShippingMethod,
          notes: "",
        });
        onOpenChange(false);
        onCreated?.();
        onSuccess?.();
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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Goods Received ({formData.method_of_shipping}) - {" "}
            {targetWarehouse.charAt(0).toUpperCase() + targetWarehouse.slice(1)} Warehouse
          </DialogTitle>
          <DialogDescription>
            Enter the individual goods received details for warehouse inventory
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
              <Label htmlFor="customer">Customer</Label>
              <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerPopoverOpen}
                    className="w-full justify-between"
                  >
                    {formData.customer_id ? (() => {
                      const selectedCustomer = filteredCustomers.find((customer) => customer.id.toString() === formData.customer_id)
                        || allCustomers.find((customer) => customer.id.toString() === formData.customer_id);
                      return selectedCustomer 
                        ? `${selectedCustomer.shippingMark || 'No Mark'} - ${selectedCustomer.displayName || 'Unknown'}`
                        : "Select customer...";
                    })() : "Select customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search customers by name or shipping mark..." 
                      value={customerSearch}
                      onValueChange={setCustomerSearch}
                    />
                    <CommandEmpty>
                      {customersLoading
                        ? "Loading customers..."
                        : customersError
                          ? `No customers found. ${customersError}`
                          : "No customers found."}
                    </CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setFormData({ ...formData, customer_id: "" });
                            setCustomerSearch("");
                            setCustomerPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.customer_id === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          No customer selected
                        </CommandItem>
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.shippingMark}
                            onSelect={() => {
                              setFormData({ ...formData, customer_id: customer.id.toString() });
                              setCustomerSearch("");
                              setCustomerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.customer_id === customer.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{customer.shippingMark || "No Mark"}</span>
                              <span className="text-xs text-muted-foreground">{customer.displayName}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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

            {/* Conditional fields based on Ghana Sea */}
            {isGhanaSea ? (
              <>
                {/* Dimensions for Ghana Sea cargo */}
                <div className="space-y-2">
                  <Label htmlFor="length">Length (m)</Label>
                  <Input
                    id="length"
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={(e) => handleDimensionChange('length', e.target.value)}
                    placeholder="2.5"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breadth">Breadth (m)</Label>
                  <Input
                    id="breadth"
                    type="number"
                    step="0.01"
                    value={formData.breadth}
                    onChange={(e) => handleDimensionChange('breadth', e.target.value)}
                    placeholder="1.2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (m)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.01"
                    value={formData.height}
                    onChange={(e) => handleDimensionChange('height', e.target.value)}
                    placeholder="1.8"
                    required
                  />
                </div>

                {/* Auto-calculated CBM display */}
                <div className="space-y-2">
                  <Label htmlFor="calculated-cbm">CBM (Auto-calculated)</Label>
                  <Input
                    id="calculated-cbm"
                    type="number"
                    step="0.001"
                    value={formData.cbm}
                    readOnly
                    placeholder="Auto-calculated from dimensions"
                    className="bg-muted"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Weight field - hide for China Sea */}
                {!isChinaSea && (
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
                )}

                {/* CBM field - hide for Ghana Air and China Air */}
                {!isGhanaAir && !isChinaAir && (
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
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="method_of_shipping">Shipping Method</Label>
              <Select
                value={formData.method_of_shipping}
                onValueChange={(value: "AIR" | "SEA") =>
                  setFormData({ ...formData, method_of_shipping: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shipping method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEA">Sea Cargo</SelectItem>
                  <SelectItem value="AIR">Air Cargo</SelectItem>
                </SelectContent>
              </Select>
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

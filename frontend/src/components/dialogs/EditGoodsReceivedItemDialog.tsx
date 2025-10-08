import { useEffect, useState } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { goodsReceivedContainerService, GoodsReceivedItem } from "@/services/goodsReceivedContainerService";
import { containerExcelService } from "@/services/containerExcelService";
import { CustomerOption, mapCustomerToOption, rankCustomerOptions } from "@/lib/customerSearch";

interface EditGoodsReceivedItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GoodsReceivedItem;
  containerType?: 'sea' | 'air';
  location?: 'china' | 'ghana';
  onSuccess?: () => void;
}

export function EditGoodsReceivedItemDialog({
  open,
  onOpenChange,
  item,
  containerType,
  location,
  onSuccess,
}: EditGoodsReceivedItemDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("");
  const [cbm, setCbm] = useState("");
  const [length, setLength] = useState("");
  const [breadth, setBreadth] = useState("");
  const [height, setHeight] = useState("");
  const [supplyTracking, setSupplyTracking] = useState("");
  const [cbmEntryMode, setCbmEntryMode] = useState<'dimensions' | 'direct'>('dimensions');
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const debouncedClientQuery = useDebounce(clientQuery, 250);
  const [allClients, setAllClients] = useState<CustomerOption[]>([]);
  const [clients, setClients] = useState<CustomerOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<CustomerOption | null>(null);
  const [notes, setNotes] = useState("");

  // Initialize form with item data
  useEffect(() => {
    if (item && open) {
      console.log('Editing item:', item);
      
      setDescription(item.description || "");
      setQuantity(item.quantity?.toString() || "");
      setWeight(item.weight?.toString() || "");
      setSupplyTracking(item.supply_tracking || "");
      setNotes(item.notes || "");
      
      // Set dimensions and CBM for sea containers
      if (containerType === 'sea') {
        const itemLength = typeof item.length === 'number' ? item.length : (item.length ? parseFloat(String(item.length)) : NaN);
        const itemBreadth = typeof item.breadth === 'number' ? item.breadth : (item.breadth ? parseFloat(String(item.breadth)) : NaN);
        const itemHeight = typeof item.height === 'number' ? item.height : (item.height ? parseFloat(String(item.height)) : NaN);
        const itemCbm = typeof item.cbm === 'number' ? item.cbm : (item.cbm ? parseFloat(String(item.cbm)) : NaN);
        
        const hasLength = !isNaN(itemLength) && itemLength > 0;
        const hasBreadth = !isNaN(itemBreadth) && itemBreadth > 0;
        const hasHeight = !isNaN(itemHeight) && itemHeight > 0;
        const hasDimensions = hasLength && hasBreadth && hasHeight;
        const hasCbm = !isNaN(itemCbm) && itemCbm > 0;
        
        console.log('Sea cargo dimensions check:', {
          hasLength, hasBreadth, hasHeight, hasCbm, hasDimensions,
          itemLength, itemBreadth, itemHeight, itemCbm
        });
        
        if (hasDimensions) {
          // Has dimensions - use dimensions mode
          setLength(itemLength.toString());
          setBreadth(itemBreadth.toString());
          setHeight(itemHeight.toString());
          setCbm(hasCbm ? itemCbm.toString() : "");
          setCbmEntryMode('dimensions');
          console.log('Using dimensions mode');
        } else if (hasCbm) {
          // Has CBM but no dimensions - use direct mode
          setCbm(itemCbm.toString());
          setLength("");
          setBreadth("");
          setHeight("");
          setCbmEntryMode('direct');
          console.log('Using direct CBM mode');
        } else {
          // Default to dimensions mode
          setLength("");
          setBreadth("");
          setHeight("");
          setCbm("");
          setCbmEntryMode('dimensions');
          console.log('Using default dimensions mode (no data)');
        }
      }
      
      // Set client if available
      if (item.customer) {
        setSelectedClient({
          id: item.customer,
          displayName: item.customer_name || `Customer ${item.customer}`,
          shippingMark: item.shipping_mark || "",
          phone: undefined,
        });
      }
    }
  }, [item, open, containerType]);

  // Auto-calculate CBM for sea containers when in dimensions mode
  useEffect(() => {
    if (containerType === "sea" && cbmEntryMode === 'dimensions') {
      const l = parseFloat(length);
      const b = parseFloat(breadth);
      const h = parseFloat(height);
      const q = parseInt(quantity, 10);

      if (Number.isFinite(l) && Number.isFinite(b) && Number.isFinite(h) && Number.isFinite(q) && l > 0 && b > 0 && h > 0 && q > 0) {
        const calculatedCbm = (l * b * h * q) / 1_000_000;
        setCbm(calculatedCbm.toFixed(5));
      } else {
        setCbm("");
      }
    }
  }, [length, breadth, height, quantity, containerType, cbmEntryMode]);

  // Load entire customer directory when client picker opens
  useEffect(() => {
    if (!clientPopoverOpen) return;
    let ignore = false;
    setClientsLoading(true);
    setClientsError(null);

    const loadCustomers = async () => {
      try {
        const records = await containerExcelService.getAllCustomers();
        if (ignore) return;
        const mapped = records.map(mapCustomerToOption);
        mapped.sort((a, b) => a.shippingMark.localeCompare(b.shippingMark) || a.displayName.localeCompare(b.displayName));
        setAllClients(mapped);
      } catch (error) {
        if (ignore) return;
        console.error("Failed to load clients:", error);
        setAllClients([]);
        setClientsError(error instanceof Error ? error.message : "Failed to load clients");
      } finally {
        if (!ignore) {
          setClientsLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      ignore = true;
    };
  }, [clientPopoverOpen]);

  // Re-rank clients whenever the directory or the query changes
  useEffect(() => {
    const ranked = rankCustomerOptions(allClients, debouncedClientQuery, 150);
    setClients(ranked);
  }, [allClients, debouncedClientQuery]);

  const handleCbmEntryModeChange = (mode: 'dimensions' | 'direct') => {
    setCbmEntryMode(mode);
    if (mode === 'direct') {
      // Switching to direct mode: clear dimensions
      setLength("");
      setBreadth("");
      setHeight("");
    } else {
      // Switching to dimensions mode: clear CBM (will be recalculated)
      setCbm("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantity || !selectedClient || !supplyTracking.trim()) {
      const missingFields: string[] = [];
      if (!quantity) missingFields.push("Quantity");
      if (!selectedClient) missingFields.push("Client");
      if (!supplyTracking.trim()) missingFields.push("Supply Tracking");
      
      // Check required fields based on container type and CBM entry mode
      if (containerType === 'sea') {
        if (cbmEntryMode === 'dimensions') {
          if (!length || !breadth || !height) {
            const missingDimensions: string[] = [];
            if (!length) missingDimensions.push("Length");
            if (!breadth) missingDimensions.push("Breadth");
            if (!height) missingDimensions.push("Height");
            missingFields.push(...missingDimensions);
          }
        } else if (cbmEntryMode === 'direct') {
          if (!cbm) {
            missingFields.push("CBM");
          }
        }
      } else if (containerType === 'air' && !weight) {
        missingFields.push("Weight");
      }
      
      toast({
        title: "Validation Error",
        description: `${missingFields.join(", ")} ${missingFields.length === 1 ? 'is' : 'are'} required`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        customer: selectedClient.id,
        shipping_mark: selectedClient.shippingMark || "",
        supply_tracking: supplyTracking.trim(),
        quantity: parseInt(quantity, 10),
        location: location || 'ghana',
      };

      if (description.trim()) payload.description = description.trim();
      if (notes.trim()) payload.notes = notes.trim();

      if (containerType === 'air' && weight) {
        payload.weight = parseFloat(weight);
      }

      if (containerType === 'sea') {
        if (cbmEntryMode === 'dimensions' && length && breadth && height) {
          // Send dimensions (CBM will be auto-calculated by backend)
          payload.length = parseFloat(length);
          payload.breadth = parseFloat(breadth);
          payload.height = parseFloat(height);
          if (cbm) payload.cbm = parseFloat(cbm);
        } else if (cbmEntryMode === 'direct' && cbm) {
          // Send CBM directly without dimensions
          payload.cbm = parseFloat(cbm);
          // Explicitly set dimensions to null when in direct mode
          payload.length = null;
          payload.breadth = null;
          payload.height = null;
        }
      }

      console.log('Updating goods received item with payload:', payload);
      
      await goodsReceivedContainerService.updateItem(item.id, payload);

      toast({
        title: "Success",
        description: "Goods received item updated successfully",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update goods received item:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update goods received item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setClientPopoverOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[500px] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Goods Received Item</DialogTitle>
          <DialogDescription>
            Update the details of this goods received item.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplyTracking">Supply Tracking *</Label>
              <Input
                id="supplyTracking"
                value={supplyTracking}
                onChange={(e) => setSupplyTracking(e.target.value)}
                placeholder="e.g., SPT-001234"
                required
              />
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
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the item"
            />
          </div>

          <div className="space-y-1">
            <Label>Client *</Label>
            <Popover
              open={clientPopoverOpen}
              onOpenChange={setClientPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientPopoverOpen}
                  className="w-full justify-between"
                >
                  {selectedClient
                    ? selectedClient.shippingMark || selectedClient.displayName || `Client #${selectedClient.id}`
                    : "Select client..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search clients by name or shipping mark..."
                    value={clientQuery}
                    onValueChange={setClientQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {clientsLoading
                        ? "Loading clients..."
                        : clientsError
                          ? `No clients found. ${clientsError}`
                          : "No clients found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          className="flex flex-col items-start gap-1"
                          onSelect={() => {
                            setSelectedClient(c);
                            setClientQuery("");
                            setClientPopoverOpen(false);
                          }}
                        >
                          <span className="font-semibold tracking-tight">
                            {c.shippingMark || "No Shipping Mark"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.displayName}
                            {c.phone ? ` • ${c.phone}` : ""}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Physical Properties for Sea Cargo */}
          {containerType === 'sea' && (
            <>
              {/* CBM Entry Mode Toggle */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Label className="text-xs font-medium">CBM Entry Method:</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={cbmEntryMode === 'dimensions' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCbmEntryModeChange('dimensions')}
                  >
                    Enter Dimensions
                  </Button>
                  <Button
                    type="button"
                    variant={cbmEntryMode === 'direct' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCbmEntryModeChange('direct')}
                  >
                    Enter CBM Directly
                  </Button>
                </div>
              </div>

              {/* Dimensions Entry Mode */}
              {cbmEntryMode === 'dimensions' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="length">Length (cm) *</Label>
                      <Input
                        id="length"
                        type="number"
                        step="0.1"
                        min="0"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        placeholder="e.g., 50"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="breadth">Breadth (cm) *</Label>
                      <Input
                        id="breadth"
                        type="number"
                        step="0.1"
                        min="0"
                        value={breadth}
                        onChange={(e) => setBreadth(e.target.value)}
                        placeholder="e.g., 30"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height (cm) *</Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.1"
                        min="0"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="e.g., 20"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="cbm">CBM (auto-calculated)</Label>
                    <Input
                      id="cbm"
                      type="text"
                      value={cbm}
                      readOnly
                      className="bg-muted font-medium"
                      placeholder="Calculated from dimensions"
                    />
                  </div>
                </>
              )}

              {/* Direct CBM Entry Mode */}
              {cbmEntryMode === 'direct' && (
                <div>
                  <Label htmlFor="cbm-direct">CBM *</Label>
                  <Input
                    id="cbm-direct"
                    type="number"
                    step="0.001"
                    min="0"
                    value={cbm}
                    onChange={(e) => setCbm(e.target.value)}
                    placeholder="e.g., 1.25"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the total CBM directly without dimensions
                  </p>
                </div>
              )}
            </>
          )}

          {/* Weight for Air Cargo */}
          {containerType === 'air' && (
            <div>
              <Label htmlFor="weight">Weight (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 15.5"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about this item..."
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
              {loading ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

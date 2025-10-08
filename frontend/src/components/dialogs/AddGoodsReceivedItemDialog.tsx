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
import { goodsReceivedContainerService } from "@/services/goodsReceivedContainerService";
import { containerExcelService } from "@/services/containerExcelService";
import { CustomerOption, mapCustomerToOption, rankCustomerOptions } from "@/lib/customerSearch";

interface AddGoodsReceivedItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string;
  containerType?: 'sea' | 'air';
  location?: 'china' | 'ghana';
  onSuccess?: () => void;
}

export function AddGoodsReceivedItemDialog({
  open,
  onOpenChange,
  containerId,
  containerType,
  location,
  onSuccess,
}: AddGoodsReceivedItemDialogProps) {
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
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const debouncedClientQuery = useDebounce(clientQuery, 250);
  const [allClients, setAllClients] = useState<CustomerOption[]>([]);
  const [clients, setClients] = useState<CustomerOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<CustomerOption | null>(null);
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setDescription("");
    setQuantity("");
    setWeight("");
    setCbm("");
    setLength("");
    setBreadth("");
    setHeight("");
    setSupplyTracking("");
    setSelectedClient(null);
    setClientQuery("");
  setClientsError(null);
    setNotes("");
  };

  // Clear fields based on container type
  useEffect(() => {
    if (containerType === 'air') {
      setCbm("");
    } else if (containerType === 'sea') {
      setWeight("");
    }
  }, [containerType]);

  // Auto-calculate CBM for sea containers
  useEffect(() => {
    if (containerType === "sea") {
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
  }, [length, breadth, height, quantity, containerType]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantity || !selectedClient || !supplyTracking.trim()) {
      const missingFields: string[] = [];
      if (!quantity) missingFields.push("Quantity");
      if (!selectedClient) missingFields.push("Client");
      if (!supplyTracking.trim()) missingFields.push("Supply Tracking");
      
      // Check required fields based on container type
      if (containerType === 'sea') {
        if (!length || !breadth || !height) {
          const missingDimensions: string[] = [];
          if (!length) missingDimensions.push("Length");
          if (!breadth) missingDimensions.push("Breadth");
          if (!height) missingDimensions.push("Height");
          missingFields.push(...missingDimensions);
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
      const payload = {
        container: containerId,
        customer: selectedClient.id,
        shipping_mark: selectedClient.shippingMark || "",
        supply_tracking: supplyTracking.trim(),
        quantity: parseInt(quantity, 10),
        location: location || 'ghana',
        status: 'READY_FOR_DELIVERY',
        ...(description.trim() && { description: description.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        ...(containerType === 'air' && weight && { weight: parseFloat(weight) }),
        ...(containerType === 'sea' && cbm && { 
          cbm: parseFloat(cbm),
          ...(length && { length: parseFloat(length) }),
          ...(breadth && { breadth: parseFloat(breadth) }),
          ...(height && { height: parseFloat(height) })
        }),
      };

      console.log('Creating goods received item with payload:', payload);
      
      const response = await goodsReceivedContainerService.addItemToContainer(containerId, payload);
      console.log('Item created successfully:', response);

      toast({
        title: "Success",
        description: "Goods received item added successfully",
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add goods received item:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add goods received item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      setClientPopoverOpen(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[650px] max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
          <DialogTitle className="text-lg sm:text-xl">Add Goods Received Item</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Add a new item to this goods received container.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-4 sm:px-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="supplyTracking" className="text-xs sm:text-sm">Supply Tracking *</Label>
                <Input
                  id="supplyTracking"
                  value={supplyTracking}
                  onChange={(e) => setSupplyTracking(e.target.value)}
                  placeholder="e.g., SPT-001234"
                  required
                  className="h-9 sm:h-10 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="quantity" className="text-xs sm:text-sm">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g., 10"
                  required
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-xs sm:text-sm">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the item"
                className="h-9 sm:h-10 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs sm:text-sm">Client *</Label>
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
                  className="w-full justify-between h-9 sm:h-10 text-sm"
                >
                  {selectedClient
                    ? selectedClient.shippingMark || selectedClient.displayName || `Client #${selectedClient.id}`
                    : "Select client..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[calc(100vw-2rem)] sm:w-[400px]">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search clients..."
                    value={clientQuery}
                    onValueChange={setClientQuery}
                    className="text-sm"
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
                          className="flex flex-col items-start gap-1 text-sm"
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

            {/* Physical Properties */}
            {containerType === 'sea' && (
              <>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div>
                    <Label htmlFor="length" className="text-xs sm:text-sm">Length (cm) *</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.1"
                      min="0"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="50"
                      required
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="breadth" className="text-xs sm:text-sm">Breadth (cm) *</Label>
                    <Input
                      id="breadth"
                      type="number"
                      step="0.1"
                      min="0"
                      value={breadth}
                      onChange={(e) => setBreadth(e.target.value)}
                      placeholder="30"
                      required
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs sm:text-sm">Height (cm) *</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.1"
                      min="0"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="20"
                      required
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cbm" className="text-xs sm:text-sm">CBM (auto-calculated)</Label>
                  <Input
                    id="cbm"
                    type="number"
                    step="0.001"
                    value={cbm}
                    readOnly
                    className="bg-muted h-9 sm:h-10 text-sm"
                    placeholder="Calculated from dimensions"
                  />
                </div>
              </>
            )}

            {containerType === 'air' && (
              <div>
                <Label htmlFor="weight" className="text-xs sm:text-sm">Weight (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 15.5"
                  required
                  className="h-9 sm:h-10 text-sm"
                />
              </div>
            )}

            <div>
              <Label htmlFor="notes" className="text-xs sm:text-sm">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </form>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 shrink-0 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="h-9 sm:h-10 text-sm"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            onClick={handleSubmit}
            className="h-9 sm:h-10 text-sm"
          >
            {loading ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
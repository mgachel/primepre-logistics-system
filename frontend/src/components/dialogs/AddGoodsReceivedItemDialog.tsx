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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { goodsReceivedContainerService } from "@/services/goodsReceivedContainerService";
import { clientService, Client } from "@/services/clientService";

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
  const [debouncedClientQuery, setDebouncedClientQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [clientsHasNext, setClientsHasNext] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
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
    if (containerType === 'sea') {
      const l = parseFloat(length);
      const b = parseFloat(breadth);
      const h = parseFloat(height);
      const q = parseInt(quantity);
      
      if (l > 0 && b > 0 && h > 0 && q > 0) {
        const calculatedCbm = (l * b * h * q) / 1000000;
        console.log('CBM Calculation Debug:', { l, b, h, q, calculatedCbm });
        setCbm(calculatedCbm.toFixed(3));
      }
    }
  }, [length, breadth, height, quantity, containerType]);

  // Debounce the client query to reduce API calls
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedClientQuery(clientQuery.trim()),
      300
    );
    return () => clearTimeout(t);
  }, [clientQuery]);

  // Helper to fetch clients (with pagination)
  const fetchClients = async (page: number, append = false) => {
    setClientsLoading(true);
    try {
      const res = await clientService.getClients({
        search: debouncedClientQuery || undefined,
        page,
      });
      const results = res.data?.results || [];
      const hasNext = Boolean(res.data?.next);
      setClients((prev) => (append ? [...prev, ...results] : results));
      setClientsHasNext(hasNext);
    } catch {
      // silent fail in combobox
    } finally {
      setClientsLoading(false);
    }
  };

  // Load clients when popover opens or debounced query changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!clientPopoverOpen) return;
      if (cancelled) return;
      setClientPage(1);
      await fetchClients(1, false);
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPopoverOpen, debouncedClientQuery]);

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
        shipping_mark: selectedClient.shipping_mark || "",
        supply_tracking: supplyTracking.trim(),
        quantity: parseInt(quantity, 10),
        location: location || 'ghana',
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
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[500px] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Goods Received Item</DialogTitle>
          <DialogDescription>
            Add a new item to this goods received container.
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
                    ? selectedClient.full_name ||
                      selectedClient.shipping_mark ||
                      `Client #${selectedClient.id}`
                    : "Select client..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Command>
                  <CommandInput
                    placeholder="Search clients by name or shipping mark..."
                    value={clientQuery}
                    onValueChange={setClientQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {clientsLoading ? "Loading..." : "No clients found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {clients.map((c) => (
                        <CommandItem
                          key={c.id}
                          onSelect={() => {
                            setSelectedClient(c);
                            setClientPopoverOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{c.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {c.shipping_mark}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                      {clientsHasNext && (
                        <CommandItem
                          disabled={clientsLoading}
                          onSelect={async () => {
                            const nextPage = clientPage + 1;
                            setClientPage(nextPage);
                            await fetchClients(nextPage, true);
                          }}
                        >
                          {clientsLoading
                            ? "Loading more..."
                            : "Load more clients"}
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Physical Properties */}
          {containerType === 'sea' && (
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
                  type="number"
                  step="0.001"
                  value={cbm}
                  readOnly
                  className="bg-muted"
                  placeholder="Calculated from dimensions"
                />
              </div>
            </>
          )}

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
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
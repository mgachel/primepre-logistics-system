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
import { cargoService } from "@/services/cargoService";
import { clientService, Client } from "@/services/clientService";

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
  const [trackingId, setTrackingId] = useState("");
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
    setItemType("");
    setDescription("");
    setQuantity("");
    setWeight("");
    setCbm("");
    setTrackingId("");
    setSelectedClient(null);
    setClientQuery("");
    setNotes("");
  };

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
    } catch (e) {
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

    if (!description || !quantity || !cbm || !selectedClient) {
      toast({
        title: "Validation Error",
        description: "Description, quantity, CBM, and client are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        container: containerId,
        client: selectedClient.id,
        item_description: itemType
          ? `${itemType}: ${description}`
          : description,
        quantity: parseInt(quantity, 10),
        weight: weight ? parseFloat(weight) : null,
        cbm: parseFloat(cbm),
        // Optionally support values/ status later
      };

      // Only include tracking_id if provided; backend will auto-generate if omitted
      if (trackingId.trim()) {
        payload.tracking_id = trackingId.trim();
      }

      const res = await cargoService.createBackendCargoItem(
        payload as {
          container: string;
          client: number;
          tracking_id?: string;
          item_description: string;
          quantity: number;
          weight?: number | null;
          cbm: number;
          unit_value?: number | null;
          total_value?: number | null;
          status?: "pending" | "in_transit" | "delivered" | "delayed";
        }
      );
      if (!res.success)
        throw new Error(res.message || "Failed to add cargo item");

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
              <Label htmlFor="itemType">Item Type</Label>
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
            <Label htmlFor="trackingId">Tracking ID (optional)</Label>
            <Input
              id="trackingId"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter a tracking ID, or leave blank to auto-generate"
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
              <Label htmlFor="cbm">CBM (m³) *</Label>
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

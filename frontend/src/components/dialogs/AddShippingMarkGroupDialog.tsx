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
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemForm {
  id: string;
  description: string;
  quantity: string;
  length: string;
  breadth: string;
  height: string;
  weight: string;
  cbm: string;
  cbmEntryMode: 'dimensions' | 'direct'; // Track how CBM is being entered
  supplyTracking: string;
  notes: string;
}

interface AddShippingMarkGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerId: string;
  containerType?: 'sea' | 'air';
  location?: 'china' | 'ghana';
  onSuccess?: () => void;
}

export function AddShippingMarkGroupDialog({
  open,
  onOpenChange,
  containerId,
  containerType = 'sea',
  location = 'ghana',
  onSuccess,
}: AddShippingMarkGroupDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select-client' | 'add-items'>('select-client');

  // Client selection state
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const debouncedClientQuery = useDebounce(clientQuery, 250);
  const [allClients, setAllClients] = useState<CustomerOption[]>([]);
  const [clients, setClients] = useState<CustomerOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<CustomerOption | null>(null);

  // Items state
  const [items, setItems] = useState<ItemForm[]>([]);
  const [savedItemsCount, setSavedItemsCount] = useState(0);

  const createEmptyItem = (): ItemForm => ({
    id: Math.random().toString(36).substring(7),
    description: "",
    quantity: "",
    length: "",
    breadth: "",
    height: "",
    weight: "",
    cbm: "",
    cbmEntryMode: 'dimensions', // Default to dimensions mode
    supplyTracking: "",
    notes: "",
  });

  const resetForm = () => {
    setSelectedClient(null);
    setClientQuery("");
    setItems([]);
    setSavedItemsCount(0);
    setStep('select-client');
    setClientsError(null);
  };

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

  // Auto-calculate CBM for sea containers when dimensions change
  const updateItemCbm = (itemId: string) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id !== itemId) return item;
        
        // Only auto-calculate if in dimensions mode
        if (containerType === "sea" && item.cbmEntryMode === 'dimensions') {
          const l = parseFloat(item.length);
          const b = parseFloat(item.breadth);
          const h = parseFloat(item.height);
          const q = parseInt(item.quantity, 10);

          if (Number.isFinite(l) && Number.isFinite(b) && Number.isFinite(h) && Number.isFinite(q) && l > 0 && b > 0 && h > 0 && q > 0) {
            const calculatedCbm = (l * b * h * q) / 1_000_000;
            return { ...item, cbm: calculatedCbm.toFixed(5) };
          } else {
            return { ...item, cbm: "" };
          }
        }
        return item;
      })
    );
  };

  const handleItemChange = (itemId: string, field: keyof ItemForm, value: string) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
    
    // Trigger CBM recalculation for relevant fields
    if (containerType === 'sea' && ['length', 'breadth', 'height', 'quantity'].includes(field)) {
      setTimeout(() => updateItemCbm(itemId), 0);
    }
  };

  const handleCbmEntryModeChange = (itemId: string, mode: 'dimensions' | 'direct') => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          if (mode === 'direct') {
            // Switching to direct mode: clear dimensions but keep existing CBM
            return { 
              ...item, 
              cbmEntryMode: mode,
              length: '',
              breadth: '',
              height: ''
            };
          } else {
            // Switching to dimensions mode: clear CBM and recalculate
            return { 
              ...item, 
              cbmEntryMode: mode,
              cbm: ''
            };
          }
        }
        return item;
      })
    );
    
    // If switching to dimensions mode, recalculate after state update
    if (mode === 'dimensions') {
      setTimeout(() => updateItemCbm(itemId), 0);
    }
  };

  const addItem = () => {
    setItems(prevItems => [...prevItems, createEmptyItem()]);
  };

  const removeItem = (itemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleClientSelected = (client: CustomerOption) => {
    setSelectedClient(client);
    setClientQuery("");
    setClientPopoverOpen(false);
    setStep('add-items');
    // Add first item automatically
    setItems([createEmptyItem()]);
  };

  const handleBackToClientSelection = () => {
    setStep('select-client');
    setItems([]);
  };

  const validateItems = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (items.length === 0) {
      errors.push("Please add at least one item");
      return { valid: false, errors };
    }

    items.forEach((item, index) => {
      const itemNum = index + 1;
      
      if (!item.supplyTracking.trim()) {
        errors.push(`Item ${itemNum}: Supply Tracking is required`);
      }
      if (!item.quantity) {
        errors.push(`Item ${itemNum}: Quantity is required`);
      }
      
      if (containerType === 'sea') {
        if (item.cbmEntryMode === 'dimensions') {
          // Validate dimensions when using auto-calculation
          if (!item.length || !item.breadth || !item.height) {
            errors.push(`Item ${itemNum}: Length, Breadth, and Height are required when using dimensions mode`);
          }
        } else if (item.cbmEntryMode === 'direct') {
          // Validate CBM when entering directly
          if (!item.cbm) {
            errors.push(`Item ${itemNum}: CBM is required when using direct entry mode`);
          }
        }
      } else if (containerType === 'air') {
        if (!item.weight) {
          errors.push(`Item ${itemNum}: Weight is required for air cargo`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClient) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    const validation = validateItems();
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create all items for this shipping mark
      const createPromises = items.map(item => {
        const payload = {
          container: containerId,
          customer: selectedClient.id,
          shipping_mark: selectedClient.shippingMark || "",
          supply_tracking: item.supplyTracking.trim(),
          quantity: parseInt(item.quantity, 10),
          location: location,
          status: 'READY_FOR_DELIVERY',
          ...(item.description.trim() && { description: item.description.trim() }),
          ...(item.notes.trim() && { notes: item.notes.trim() }),
          ...(containerType === 'air' && item.weight && { weight: parseFloat(item.weight) }),
          ...(containerType === 'sea' && item.cbm && { 
            cbm: parseFloat(item.cbm),
            ...(item.length && { length: parseFloat(item.length) }),
            ...(item.breadth && { breadth: parseFloat(item.breadth) }),
            ...(item.height && { height: parseFloat(item.height) })
          }),
        };

        return goodsReceivedContainerService.addItemToContainer(containerId, payload);
      });

      await Promise.all(createPromises);

      const itemsAdded = items.length;
      setSavedItemsCount(prev => prev + itemsAdded);

      toast({
        title: "Success",
        description: `Successfully added ${itemsAdded} item${itemsAdded > 1 ? 's' : ''} for ${selectedClient.shippingMark}`,
      });

      // Clear the current items but keep the dialog open with the same client
      setItems([createEmptyItem()]);
      
      // Refresh parent data
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add items:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAndClose = () => {
    if (savedItemsCount > 0) {
      toast({
        title: "Complete",
        description: `Total of ${savedItemsCount} item${savedItemsCount > 1 ? 's' : ''} added for ${selectedClient?.shippingMark}`,
      });
    }
    resetForm();
    onOpenChange(false);
  };

  const handleSaveAndViewInvoice = async () => {
    if (!selectedClient) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    const validation = validateItems();
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create all items for this shipping mark
      const createPromises = items.map(item => {
        const payload = {
          container: containerId,
          customer: selectedClient.id,
          shipping_mark: selectedClient.shippingMark || "",
          supply_tracking: item.supplyTracking.trim(),
          quantity: parseInt(item.quantity, 10),
          location: location,
          status: 'READY_FOR_DELIVERY',
          ...(item.description.trim() && { description: item.description.trim() }),
          ...(item.notes.trim() && { notes: item.notes.trim() }),
          ...(containerType === 'air' && item.weight && { weight: parseFloat(item.weight) }),
          ...(containerType === 'sea' && item.cbm && { 
            cbm: parseFloat(item.cbm),
            ...(item.length && { length: parseFloat(item.length) }),
            ...(item.breadth && { breadth: parseFloat(item.breadth) }),
            ...(item.height && { height: parseFloat(item.height) })
          }),
        };

        return goodsReceivedContainerService.addItemToContainer(containerId, payload);
      });

      await Promise.all(createPromises);

      toast({
        title: "Success",
        description: `Successfully added ${items.length} item${items.length > 1 ? 's' : ''} for ${selectedClient.shippingMark}`,
      });

      // Generate and view invoice
      const invoiceWindow = window.open('', '_blank');
      if (invoiceWindow) {
        invoiceWindow.document.write(generateInvoiceHTML());
        invoiceWindow.document.close();
        invoiceWindow.print();
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to add items:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceHTML = () => {
    if (!selectedClient) return '';
    
    const totalAmount = containerType === 'sea' 
      ? parseFloat(totalCbm || '0') * 100 // Example rate, adjust as needed
      : parseFloat(totalWeight || '0') * 50; // Example rate, adjust as needed

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Goods Received Invoice - ${selectedClient.shippingMark}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0; 
              padding: 30px; 
              background: white; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 25px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 15px; 
            }
            .header h1 { 
              color: #333; 
              margin: 0; 
              font-size: 28px; 
              font-weight: 700;
            }
            .header .company { 
              color: #666; 
              margin-top: 8px; 
              font-size: 14px; 
            }
            .invoice-details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
              margin-bottom: 25px; 
            }
            .info-section { 
              padding: 0; 
            }
            .info-row { 
              margin-bottom: 8px; 
              font-size: 14px; 
              display: flex;
              justify-content: space-between;
            }
            .info-row strong {
              color: #333;
              min-width: 140px;
            }
            .invoice-number { 
              text-align: right; 
            }
            .invoice-number h2 { 
              color: #333; 
              margin: 0 0 10px 0; 
              font-size: 20px;
              font-weight: 600;
            }
            .invoice-number div {
              font-size: 14px;
              margin-bottom: 8px;
            }
            .summary-box {
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              padding: 15px;
              margin-bottom: 25px;
              border-radius: 8px;
            }
            .summary-title {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 10px;
              color: #333;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 14px;
            }
            .summary-total {
              border-top: 2px solid #333;
              padding-top: 10px;
              margin-top: 10px;
              font-weight: 700;
              font-size: 16px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 10px; 
              text-align: left; 
              font-size: 13px;
            }
            th { 
              background-color: #333; 
              color: white; 
              font-weight: 600; 
            }
            tbody tr:nth-child(even) { 
              background-color: #f8f9fa; 
            }
            .amount-cell { 
              text-align: right; 
              font-family: 'Courier New', monospace; 
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              color: #666; 
              font-size: 12px; 
              border-top: 1px solid #eee; 
              padding-top: 15px; 
            }
            @media print {
              body { 
                margin: 0; 
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GOODS RECEIVED INVOICE</h1>
            <div class="company">PrimePre Logistics System</div>
          </div>
          
          <div class="invoice-details">
            <div class="info-section">
              <div class="info-row"><strong>Container ID:</strong> <span>${containerId}</span></div>
              <div class="info-row"><strong>Shipping Mark:</strong> <span>${selectedClient.shippingMark}</span></div>
              <div class="info-row"><strong>Client:</strong> <span>${selectedClient.displayName}</span></div>
              <div class="info-row"><strong>Container Type:</strong> <span>${containerType.toUpperCase()}</span></div>
              <div class="info-row"><strong>Location:</strong> <span>${location.toUpperCase()}</span></div>
            </div>
            
            <div class="invoice-number">
              <h2>Invoice #${containerId}-${selectedClient.shippingMark}</h2>
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>Total Items:</strong> ${items.length}</div>
            </div>
          </div>

          <div class="summary-box">
            <div class="summary-title">Summary</div>
            <div class="summary-row">
              <span>Total Items:</span>
              <strong>${items.length}</strong>
            </div>
            <div class="summary-row">
              <span>Total Quantity (CTNS):</span>
              <strong>${items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}</strong>
            </div>
            ${containerType === 'sea' ? `
              <div class="summary-row">
                <span>Total CBM:</span>
                <strong>${totalCbm} m³</strong>
              </div>
            ` : ''}
            ${containerType === 'air' ? `
              <div class="summary-row">
                <span>Total Weight:</span>
                <strong>${totalWeight} kg</strong>
              </div>
            ` : ''}
            <div class="summary-row summary-total">
              <span>Estimated Total Amount:</span>
              <strong>₵${totalAmount.toFixed(2)}</strong>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Supply Tracking</th>
                <th>Description</th>
                <th>Quantity</th>
                ${containerType === 'sea' ? `
                  <th>Length (cm)</th>
                  <th>Breadth (cm)</th>
                  <th>Height (cm)</th>
                  <th>CBM</th>
                ` : ''}
                ${containerType === 'air' ? `<th>Weight (kg)</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.supplyTracking}</td>
                  <td>${item.description || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  ${containerType === 'sea' ? `
                    <td>${item.length || 'N/A'}</td>
                    <td>${item.breadth || 'N/A'}</td>
                    <td>${item.height || 'N/A'}</td>
                    <td class="amount-cell">${item.cbm || 'N/A'}</td>
                  ` : ''}
                  ${containerType === 'air' ? `<td class="amount-cell">${item.weight || 'N/A'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>PrimePre Logistics System - Goods Received Invoice</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      setClientPopoverOpen(false);
      onOpenChange(false);
    }
  };

  const totalCbm = containerType === 'sea' 
    ? items.reduce((sum, item) => sum + (parseFloat(item.cbm) || 0), 0).toFixed(5)
    : null;

  const totalWeight = containerType === 'air'
    ? items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[98vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 shrink-0 space-y-1 sm:space-y-2">
          <DialogTitle className="text-sm sm:text-base md:text-lg lg:text-xl leading-tight">
            {step === 'select-client' ? 'Add Shipping Mark Group' : (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base">Add Items for {selectedClient?.shippingMark}</span>
                {savedItemsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">
                    {savedItemsCount} saved
                  </Badge>
                )}
              </div>
            )}
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs md:text-sm leading-tight">
            {step === 'select-client' 
              ? 'Select a shipping mark/client, then add multiple items under that group'
              : savedItemsCount > 0
                ? `Continue adding more items. Items are saved individually - click "Finish & Close" when done.`
                : `Adding items for shipping mark: ${selectedClient?.shippingMark || 'N/A'}. Items will be saved individually.`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'select-client' && (
          <ScrollArea className="flex-1 px-3 sm:px-4 md:px-6">
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Select Shipping Mark / Client *</Label>
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
                      className="w-full justify-between h-auto min-h-[44px] sm:min-h-[40px] py-2 px-3 text-xs sm:text-sm text-left"
                    >
                      {selectedClient
                        ? (
                          <div className="flex flex-col items-start gap-0.5 sm:gap-1">
                            <span className="font-semibold text-xs sm:text-sm">{selectedClient.shippingMark || "No Shipping Mark"}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{selectedClient.displayName}</span>
                          </div>
                        )
                        : "Select shipping mark / client..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-[500px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by shipping mark or name..."
                        value={clientQuery}
                        onValueChange={setClientQuery}
                        className="text-xs sm:text-sm h-10 sm:h-9"
                      />
                      <CommandList className="max-h-[50vh] sm:max-h-[300px]">
                        <CommandEmpty className="py-4 text-xs sm:text-sm">
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
                              className="flex flex-col items-start gap-0.5 sm:gap-1 py-2.5 sm:py-2"
                              onSelect={() => handleClientSelected(c)}
                            >
                              <span className="font-semibold tracking-tight text-xs sm:text-sm">
                                {c.shippingMark || "No Shipping Mark"}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
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

              <div className="flex justify-end gap-2 pt-2 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="h-9 sm:h-10 px-4 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}

        {step === 'add-items' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-2 sm:py-2.5 px-3 sm:px-4 md:px-6 border-b shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToClientSelection}
                  className="h-7 sm:h-8 text-[11px] sm:text-xs px-2 sm:px-3"
                >
                  ← Change Client
                </Button>
                <Badge variant="secondary" className="font-semibold text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                  {selectedClient?.shippingMark}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
                <span className="text-muted-foreground">
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </span>
                {totalCbm && (
                  <span className="font-medium">
                    CBM: <span className="text-primary">{totalCbm}</span> m³
                  </span>
                )}
                {totalWeight && (
                  <span className="font-medium">
                    Wt: <span className="text-primary">{totalWeight}</span> kg
                  </span>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-2.5 sm:space-y-3 md:space-y-4 py-3 sm:py-4 px-3 sm:px-4 md:px-6">
                {items.map((item, index) => (
                  <Card key={item.id} className="relative">
                    <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm sm:text-base font-semibold">Item {index + 1}</CardTitle>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-2.5 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 md:gap-3">
                        <div className="space-y-1 sm:space-y-1.5">
                          <Label htmlFor={`supply-tracking-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                            Supply Tracking *
                          </Label>
                          <Input
                            id={`supply-tracking-${item.id}`}
                            value={item.supplyTracking}
                            onChange={(e) => handleItemChange(item.id, 'supplyTracking', e.target.value)}
                            placeholder="e.g., SPT-001234"
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5">
                          <Label htmlFor={`quantity-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                            Quantity (CTNS) *
                          </Label>
                          <Input
                            id={`quantity-${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            placeholder="e.g., 10"
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-1.5">
                        <Label htmlFor={`description-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                          Description
                        </Label>
                        <Input
                          id={`description-${item.id}`}
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Brief description"
                          className="h-9 sm:h-10 text-xs sm:text-sm"
                        />
                      </div>

                      {containerType === 'sea' && (
                        <>
                          {/* CBM Entry Mode Toggle */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-muted/50 rounded-md">
                            <Label className="text-[11px] sm:text-xs font-medium shrink-0">CBM Entry Method:</Label>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                type="button"
                                variant={item.cbmEntryMode === 'dimensions' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                                onClick={() => handleCbmEntryModeChange(item.id, 'dimensions')}
                              >
                                Enter Dimensions
                              </Button>
                              <Button
                                type="button"
                                variant={item.cbmEntryMode === 'direct' ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                                onClick={() => handleCbmEntryModeChange(item.id, 'direct')}
                              >
                                Enter CBM Directly
                              </Button>
                            </div>
                          </div>

                          {/* Dimensions Entry Mode */}
                          {item.cbmEntryMode === 'dimensions' && (
                            <>
                              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3">
                                <div className="space-y-1 sm:space-y-1.5">
                                  <Label htmlFor={`length-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                                    Length (cm) *
                                  </Label>
                                  <Input
                                    id={`length-${item.id}`}
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={item.length}
                                    onChange={(e) => handleItemChange(item.id, 'length', e.target.value)}
                                    placeholder="cm"
                                    className="h-9 sm:h-10 text-xs sm:text-sm"
                                  />
                                </div>
                                <div className="space-y-1 sm:space-y-1.5">
                                  <Label htmlFor={`breadth-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                                    Breadth (cm) *
                                  </Label>
                                  <Input
                                    id={`breadth-${item.id}`}
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={item.breadth}
                                    onChange={(e) => handleItemChange(item.id, 'breadth', e.target.value)}
                                    placeholder="cm"
                                    className="h-9 sm:h-10 text-xs sm:text-sm"
                                  />
                                </div>
                                <div className="space-y-1 sm:space-y-1.5">
                                  <Label htmlFor={`height-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                                    Height (cm) *
                                  </Label>
                                  <Input
                                    id={`height-${item.id}`}
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={item.height}
                                    onChange={(e) => handleItemChange(item.id, 'height', e.target.value)}
                                    placeholder="cm"
                                    className="h-9 sm:h-10 text-xs sm:text-sm"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1 sm:space-y-1.5">
                                <Label htmlFor={`cbm-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                                  CBM (auto-calculated)
                                </Label>
                                <Input
                                  id={`cbm-${item.id}`}
                                  type="text"
                                  value={item.cbm}
                                  readOnly
                                  className="bg-muted h-9 sm:h-10 font-medium text-xs sm:text-sm"
                                  placeholder="Calculated from dimensions"
                                />
                              </div>
                            </>
                          )}

                          {/* Direct CBM Entry Mode */}
                          {item.cbmEntryMode === 'direct' && (
                            <div className="space-y-1 sm:space-y-1.5">
                              <Label htmlFor={`cbm-direct-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                                CBM *
                              </Label>
                              <Input
                                id={`cbm-direct-${item.id}`}
                                type="number"
                                step="0.001"
                                min="0"
                                value={item.cbm}
                                onChange={(e) => handleItemChange(item.id, 'cbm', e.target.value)}
                                placeholder="e.g., 1.25"
                                className="h-9 sm:h-10 text-xs sm:text-sm"
                              />
                              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                Enter the total CBM directly without dimensions
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {containerType === 'air' && (
                        <div className="space-y-1 sm:space-y-1.5">
                          <Label htmlFor={`weight-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                            Weight (kg) *
                          </Label>
                          <Input
                            id={`weight-${item.id}`}
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.weight}
                            onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                            placeholder="e.g., 15.5"
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                          />
                        </div>
                      )}

                      <div className="space-y-1 sm:space-y-1.5">
                        <Label htmlFor={`notes-${item.id}`} className="text-[11px] sm:text-xs font-medium">
                          Notes
                        </Label>
                        <Textarea
                          id={`notes-${item.id}`}
                          value={item.notes}
                          onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                          placeholder="Additional information..."
                          rows={2}
                          className="resize-none text-xs sm:text-sm min-h-[60px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full h-10 sm:h-11 text-xs sm:text-sm font-medium"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                  Add Another Item
                </Button>
              </div>
            </ScrollArea>

            <DialogFooter className="pt-3 sm:pt-4 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 border-t shrink-0">
              <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
                <div className="flex-1 text-left text-[11px] sm:text-xs">
                  {items.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-muted-foreground">
                        <strong>Current Batch:</strong> {items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} CTNS
                        {totalCbm && <span> • {totalCbm} m³</span>}
                        {totalWeight && <span> • {totalWeight} kg</span>}
                      </div>
                      {savedItemsCount > 0 && (
                        <div className="text-green-600 font-medium">
                          ✓ {savedItemsCount} item{savedItemsCount > 1 ? 's' : ''} already saved
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFinishAndClose}
                    disabled={loading}
                    className="h-9 sm:h-10 text-[11px] sm:text-xs px-3 sm:px-4 flex-1 sm:flex-initial min-w-[100px]"
                  >
                    {savedItemsCount > 0 ? 'Finish & Close' : 'Cancel'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    disabled={loading || items.length === 0}
                    onClick={handleSaveAndViewInvoice}
                    className="h-9 sm:h-10 text-[11px] sm:text-xs px-3 sm:px-4 flex-1 sm:flex-initial min-w-[120px]"
                  >
                    {loading ? "Processing..." : "Save & View Invoice"}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || items.length === 0}
                    className="h-9 sm:h-10 text-[11px] sm:text-xs px-3 sm:px-4 flex-1 sm:flex-initial min-w-[100px]"
                  >
                    {loading ? "Saving..." : `Save & Add More`}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

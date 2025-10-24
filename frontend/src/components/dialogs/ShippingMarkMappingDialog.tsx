import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Users,
  UserPlus,
  UserX,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { containerExcelService } from '@/services/containerExcelService';
import { useToast } from '@/hooks/use-toast';

interface CandidateData {
  source_row_number: number;
  shipping_mark_normalized: string;
  original_shipping_mark_raw: string;
  description: string;
  quantity: number;
  cbm: number | null;
  tracking_number: string;
}

interface SearchCustomer {
  id: number;
  shipping_mark: string;
  name: string;
  phone: string;
  email: string;
}

interface ShippingMarkSuggestion {
  customer: SearchCustomer;
  similarity_type: string;
  similarity_score?: number;
}

interface UnmatchedItem {
  candidate: CandidateData;
  suggestions: ShippingMarkSuggestion[];
}

interface ResolvedMapping {
  unmatched_item_id: string;
  action: 'map_existing' | 'create_new' | 'skip';
  customer_id?: number;
  new_customer_data?: {
    username: string;
    email: string;
    shipping_mark: string;
    phone: string;
    first_name: string;
    last_name: string;
  };
  candidate: CandidateData;
}

interface ShippingMarkMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmatchedItems: UnmatchedItem[];
  onMappingComplete: (resolvedMappings: ResolvedMapping[]) => void;
}

export function ShippingMarkMappingDialog({
  open,
  onOpenChange,
  unmatchedItems,
  onMappingComplete,
}: ShippingMarkMappingDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedMappings, setResolvedMappings] = useState<ResolvedMapping[]>([]);
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    username: '',
    email: '',
    shipping_mark: '',
    phone: '',
    first_name: '',
    last_name: '',
  });
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<SearchCustomer[]>([]);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [isCustomerLoadingMore, setIsCustomerLoadingMore] = useState(false);
  const [customerSearchPage, setCustomerSearchPage] = useState(1);
  const [customerSearchHasMore, setCustomerSearchHasMore] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SearchCustomer | null>(null);

  const { toast } = useToast();

  const currentItem = unmatchedItems[currentIndex];
  // processedIds tracks which unmatched rows we've already resolved (supports bulk grouping)
  const suggestions = useMemo(
    () => currentItem?.suggestions ?? [],
    [currentItem]
  );
  const suggestionIds = useMemo(
    () => new Set(suggestions.map((suggestion) => suggestion.customer.id)),
    [suggestions]
  );

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    const defaultTerm = currentItem.candidate.shipping_mark_normalized || '';
    setCustomerSearchTerm(defaultTerm);
    setCustomerSearchResults([]);
    setSelectedCustomer(null);
    setCustomerSearchOpen(false);
    setShowNewCustomerForm(false);
    setIsCustomerSearching(false);
    setIsCustomerLoadingMore(false);
    setCustomerSearchPage(1);
    setCustomerSearchHasMore(false);
  }, [currentItem]);

  const fetchCustomers = useCallback(async (
    query: string,
    options: { page?: number; append?: boolean } = {}
  ) => {
    const { page = 1, append = false } = options;
    const trimmedQuery = query.trim();

    if (!append) {
      setIsCustomerSearching(true);
      setCustomerSearchPage(1);
      setCustomerSearchHasMore(false);
      if (page === 1) {
        setCustomerSearchResults([]);
      }
    } else {
      setIsCustomerLoadingMore(true);
    }

    try {
      const response = await containerExcelService.searchCustomers(trimmedQuery, 100, page);
      const customers = response?.customers ?? [];
      const pagination = response?.pagination;

      setCustomerSearchPage(pagination?.page ?? page);
      setCustomerSearchHasMore(Boolean(pagination?.has_more));

      setCustomerSearchResults((prev) => {
        if (append) {
          const existingIds = new Set(prev.map((customer) => customer.id));
          const merged = customers.filter((customer) => !existingIds.has(customer.id));
          return [...prev, ...merged];
        }
        return customers;
      });
    } catch (error) {
      console.error('Customer search error:', error);
      toast({
        title: 'Search Failed',
        description: 'Unable to load customers. Please try again.',
        variant: 'destructive',
      });
      if (!append) {
        setCustomerSearchResults([]);
      }
    } finally {
      if (!append) {
        setIsCustomerSearching(false);
      } else {
        setIsCustomerLoadingMore(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (!customerSearchOpen) {
      return;
    }

    const handler = setTimeout(() => {
      fetchCustomers(customerSearchTerm, { page: 1, append: false });
    }, 250);

    return () => clearTimeout(handler);
  }, [customerSearchOpen, customerSearchTerm, fetchCustomers, currentItem]);

  const filteredSearchResults = useMemo(
    () => customerSearchResults.filter((customer) => !suggestionIds.has(customer.id)),
    [customerSearchResults, suggestionIds]
  );

  const loadMoreCustomers = useCallback(() => {
    if (isCustomerLoadingMore || !customerSearchHasMore) {
      return;
    }
    const nextPage = customerSearchPage + 1;
    fetchCustomers(customerSearchTerm, { page: nextPage, append: true });
  }, [
    customerSearchHasMore,
    customerSearchPage,
    customerSearchTerm,
    fetchCustomers,
    isCustomerLoadingMore
  ]);

  const resolveAsExisting = (customer: SearchCustomer) => {
    if (!currentItem) {
      return;
    }
    setSelectedCustomer(customer);
    setCustomerSearchTerm(customer.shipping_mark || '');

    // Find all unmatched items with the same normalized shipping mark
    const mark = currentItem.candidate.shipping_mark_normalized;
  const sameItems = unmatchedItems.filter(u => u.candidate.shipping_mark_normalized === mark);

    const newMappings: ResolvedMapping[] = sameItems.map(si => ({
      unmatched_item_id: `row_${si.candidate.source_row_number}`,
      action: 'map_existing',
      customer_id: customer.id,
      candidate: si.candidate,
    }));

    setResolvedMappings(prev => {
      // remove any existing mappings for these ids and add the new ones
      const existingFiltered = prev.filter(m => !newMappings.some(nm => nm.unmatched_item_id === m.unmatched_item_id));
      const next = [...existingFiltered, ...newMappings];
      // mark processed ids
      const ids = newMappings.map(nm => nm.unmatched_item_id);
      setProcessedIds(prevIds => Array.from(new Set([...prevIds, ...ids])));
      proceedToNext(next);
      return next;
    });
    setCustomerSearchOpen(false);
  };

  const resolveAsNew = () => {
    // Validate new customer form
    if (!newCustomerData.username.trim() || !newCustomerData.shipping_mark.trim() || !newCustomerData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Username, phone number, and shipping mark are required",
        variant: "destructive",
      });
      return;
    }
    // Find all unmatched items with the same normalized shipping mark and apply the same new-customer mapping
    const mark = currentItem.candidate.shipping_mark_normalized;
  const sameItems = unmatchedItems.filter(u => u.candidate.shipping_mark_normalized === mark);

    const payload = { ...newCustomerData };

    const newMappings: ResolvedMapping[] = sameItems.map(si => ({
      unmatched_item_id: `row_${si.candidate.source_row_number}`,
      action: 'create_new',
      new_customer_data: { ...payload },
      candidate: si.candidate,
    }));

    setResolvedMappings(prev => {
      const existingFiltered = prev.filter(m => !newMappings.some(nm => nm.unmatched_item_id === m.unmatched_item_id));
      const next = [...existingFiltered, ...newMappings];
      const ids = newMappings.map(nm => nm.unmatched_item_id);
      setProcessedIds(prevIds => Array.from(new Set([...prevIds, ...ids])));
      proceedToNext(next);
      return next;
    });

    setShowNewCustomerForm(false);
    setCustomerSearchOpen(false);
    setSelectedCustomer(null);
    setNewCustomerData({
      username: '',
      email: '',
      shipping_mark: currentItem?.candidate.shipping_mark_normalized || '',
      phone: '',
      first_name: '',
      last_name: '',
    });
  };

  const resolveAsSkip = () => {
    // Apply skip to all items with same normalized mark
    const mark = currentItem.candidate.shipping_mark_normalized;
  const sameItems = unmatchedItems.filter(u => u.candidate.shipping_mark_normalized === mark);

    const newMappings: ResolvedMapping[] = sameItems.map(si => ({
      unmatched_item_id: `row_${si.candidate.source_row_number}`,
      action: 'skip',
      candidate: si.candidate,
    }));

    setResolvedMappings(prev => {
      const existingFiltered = prev.filter(m => !newMappings.some(nm => nm.unmatched_item_id === m.unmatched_item_id));
      const next = [...existingFiltered, ...newMappings];
      const ids = newMappings.map(nm => nm.unmatched_item_id);
      setProcessedIds(prevIds => Array.from(new Set([...prevIds, ...ids])));
      proceedToNext(next);
      return next;
    });
    setCustomerSearchOpen(false);
    setSelectedCustomer(null);
  };

  const proceedToNext = (nextMappings?: ResolvedMapping[]) => {
    const mappingsToUse = nextMappings ?? resolvedMappings;
    // If all items have been processed or there are no unprocessed items left, finish
    const total = unmatchedItems.length;
    const processedSet = new Set(processedIds);
    // Include any ids from mappingsToUse
    mappingsToUse.forEach(m => processedSet.add(m.unmatched_item_id));

    if (processedSet.size >= total) {
      onMappingComplete(mappingsToUse);
      return;
    }

    // Find next index that is not yet processed
    let nextIndex = 0;
    for (let i = 0; i < unmatchedItems.length; i++) {
      const id = `row_${unmatchedItems[i].candidate.source_row_number}`;
      if (!processedSet.has(id)) {
        nextIndex = i;
        break;
      }
    }

    setCurrentIndex(nextIndex);
    setShowNewCustomerForm(false);
    setCustomerSearchTerm('');
    setCustomerSearchResults([]);
    setCustomerSearchOpen(false);
    setSelectedCustomer(null);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowNewCustomerForm(false);
      setCustomerSearchTerm('');
      setCustomerSearchResults([]);
      setCustomerSearchOpen(false);
      setSelectedCustomer(null);
    }
  };

  const resetNewCustomerForm = () => {
    setNewCustomerData({
      username: '',
      email: '',
      shipping_mark: currentItem?.candidate.shipping_mark_normalized || '',
      phone: '',
      first_name: '',
      last_name: '',
    });
  };

  const handleShowNewCustomerForm = () => {
    resetNewCustomerForm();
    setShowNewCustomerForm(true);
  };

  if (!currentItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resolve Shipping Mark Mapping ({currentIndex + 1} of {unmatchedItems.length})
          </DialogTitle>
          <DialogDescription>
            Match the unmatched shipping mark with an existing customer or create a new one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Item Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Row {currentItem.candidate.source_row_number} - Unmatched Item
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Original Shipping Mark</Label>
                <p className="font-mono text-sm">{currentItem.candidate.original_shipping_mark_raw}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Normalized</Label>
                <p className="font-mono text-sm">{currentItem.candidate.shipping_mark_normalized}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm">{currentItem.candidate.description}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Quantity & CBM</Label>
                <p className="text-sm">
                  Qty: {currentItem.candidate.quantity}
                  {currentItem.candidate.cbm && ` • CBM: ${currentItem.candidate.cbm}`}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Similar Customers Found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{suggestion.customer.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.similarity_type === 'substring' ? 'Contains' : 'Similar Words'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mark: {suggestion.customer.shipping_mark}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.customer.email} • {suggestion.customer.phone}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => resolveAsExisting(suggestion.customer)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Use This
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Map to Existing Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Map to Existing Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Excel Shipping Mark</Label>
                <Input
                  value={currentItem.candidate.original_shipping_mark_raw || currentItem.candidate.shipping_mark_normalized}
                  readOnly
                  className="bg-muted/20"
                />
              </div>
              <div className="grid gap-2">
                <Label>Search &amp; Select Customer</Label>
                <Popover
                  open={customerSearchOpen}
                  onOpenChange={(open) => {
                    setCustomerSearchOpen(open);
                    if (open && !customerSearchTerm) {
                      setCustomerSearchTerm(currentItem.candidate.shipping_mark_normalized || '');
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedCustomer
                        ? `${selectedCustomer.shipping_mark} — ${selectedCustomer.name}`
                        : customerSearchTerm
                        ? `Search: ${customerSearchTerm}`
                        : 'Search by shipping mark, name, email, or phone'}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput
                        value={customerSearchTerm}
                        onValueChange={(value) => setCustomerSearchTerm(value)}
                        placeholder="Type to search customers..."
                      />
                      <CommandList>
                        <CommandEmpty>
                          {isCustomerSearching ? (
                            <span className="flex items-center justify-center gap-2 text-sm">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Searching...
                            </span>
                          ) : (
                            'No customers found.'
                          )}
                        </CommandEmpty>
                        {suggestions.length > 0 && (
                          <CommandGroup heading="Suggested matches">
                            {suggestions.map((suggestion) => (
                              <CommandItem
                                key={`suggestion-${suggestion.customer.id}`}
                                value={`${suggestion.customer.shipping_mark} ${suggestion.customer.name}`}
                                onSelect={() => {
                                  resolveAsExisting(suggestion.customer);
                                  setCustomerSearchOpen(false);
                                }}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">
                                    {suggestion.customer.shipping_mark}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {suggestion.customer.name} • {suggestion.customer.phone}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {suggestions.length > 0 && filteredSearchResults.length > 0 && (
                          <CommandSeparator />
                        )}
                        {filteredSearchResults.length > 0 && (
                          <CommandGroup heading="Search results">
                            {filteredSearchResults.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={`${customer.shipping_mark} ${customer.name}`}
                                  onSelect={() => {
                                    resolveAsExisting(customer);
                                    setCustomerSearchOpen(false);
                                  }}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">{customer.shipping_mark}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {customer.name} • {customer.phone}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            {customerSearchHasMore && (
                              <div className="px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-center"
                                  onClick={loadMoreCustomers}
                                  disabled={isCustomerLoadingMore}
                                >
                                  {isCustomerLoadingMore ? (
                                    <span className="flex items-center gap-2 text-xs">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Loading more…
                                    </span>
                                  ) : (
                                    'Load more results'
                                  )}
                                </Button>
                              </div>
                            )}
                            {isCustomerSearching && !customerSearchHasMore && (
                              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Updating results…
                              </div>
                            )}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Map this Excel shipping mark to an existing customer by searching their shipping mark, name, email, or phone number.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Create New Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Create New Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {!showNewCustomerForm ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleShowNewCustomerForm}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create New Customer
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        value={newCustomerData.username}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          username: e.target.value
                        }))}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping_mark">Shipping Mark *</Label>
                      <Input
                        id="shipping_mark"
                        value={newCustomerData.shipping_mark}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          shipping_mark: e.target.value
                        }))}
                        placeholder="Enter shipping mark"
                      />
                    </div>
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={newCustomerData.first_name}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          first_name: e.target.value
                        }))}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={newCustomerData.last_name}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          last_name: e.target.value
                        }))}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newCustomerData.email}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData(prev => ({
                          ...prev,
                          phone: e.target.value
                        }))}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={resolveAsNew}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create & Use
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCustomerForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Navigation & Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} of {unmatchedItems.length}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resolveAsSkip}
              >
                <UserX className="h-4 w-4 mr-2" />
                Skip Item
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
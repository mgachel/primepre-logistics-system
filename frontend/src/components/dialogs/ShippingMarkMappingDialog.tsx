import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  UserPlus,
  UserX,
  Search,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { containerExcelService } from '@/services/containerExcelService';
import { useToast } from '@/hooks/use-toast';

interface UnmatchedItem {
  candidate: {
    source_row_number: number;
    shipping_mark_normalized: string;
    original_shipping_mark_raw: string;
    description: string;
    quantity: number;
    cbm: number | null;
    tracking_number: string;
  };
  suggestions: Array<{
    customer: {
      id: number;
      shipping_mark: string;
      name: string;
      phone: string;
      email: string;
    };
    similarity_type: string;
    similarity_score?: number;
  }>;
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
  candidate: any;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    username: '',
    email: '',
    shipping_mark: '',
    phone: '',
    first_name: '',
    last_name: '',
  });

  const { toast } = useToast();

  const currentItem = unmatchedItems[currentIndex];
  const isLastItem = currentIndex === unmatchedItems.length - 1;

  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await containerExcelService.searchCustomers(query, 20);
      console.log('Search response:', response);
      setSearchResults(response?.customers || []);
      if (response?.customers && response.customers.length > 0) {
        setShowSearchDropdown(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Failed to search customers",
        variant: "destructive",
      });
      setSearchResults([]);
      setShowSearchDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchCustomers(query);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchCustomers]);

  const resolveAsExisting = (customer: any) => {
    const mapping: ResolvedMapping = {
      unmatched_item_id: `row_${currentItem.candidate.source_row_number}`,
      action: 'map_existing',
      customer_id: customer.id,
      candidate: currentItem.candidate,
    };

    setResolvedMappings(prev => [
      ...prev.filter(m => m.unmatched_item_id !== mapping.unmatched_item_id),
      mapping
    ]);

    proceedToNext();
  };

  const resolveAsNew = () => {
    // Validate new customer form
    if (!newCustomerData.username.trim() || !newCustomerData.shipping_mark.trim()) {
      toast({
        title: "Validation Error",
        description: "Username and shipping mark are required",
        variant: "destructive",
      });
      return;
    }

    const mapping: ResolvedMapping = {
      unmatched_item_id: `row_${currentItem.candidate.source_row_number}`,
      action: 'create_new',
      new_customer_data: { ...newCustomerData },
      candidate: currentItem.candidate,
    };

    setResolvedMappings(prev => [
      ...prev.filter(m => m.unmatched_item_id !== mapping.unmatched_item_id),
      mapping
    ]);

    setShowNewCustomerForm(false);
    setNewCustomerData({
      username: '',
      email: '',
      shipping_mark: '',
      phone: '',
      first_name: '',
      last_name: '',
    });

    proceedToNext();
  };

  const resolveAsSkip = () => {
    const mapping: ResolvedMapping = {
      unmatched_item_id: `row_${currentItem.candidate.source_row_number}`,
      action: 'skip',
      candidate: currentItem.candidate,
    };

    setResolvedMappings(prev => [
      ...prev.filter(m => m.unmatched_item_id !== mapping.unmatched_item_id),
      mapping
    ]);

    proceedToNext();
  };

  const proceedToNext = () => {
    if (isLastItem) {
      // Complete the mapping process
      onMappingComplete(resolvedMappings);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchDropdown(false);
      setShowNewCustomerForm(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchDropdown(false);
      setShowNewCustomerForm(false);
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
          {currentItem.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Similar Customers Found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentItem.suggestions.map((suggestion, index) => (
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

          {/* Search for Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Search Existing Customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Search by name, shipping mark, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => handleSearchQueryChange(e.target.value)}
                      onFocus={() => setShowSearchDropdown(true)}
                    />
                    {/* Search Dropdown */}
                    {showSearchDropdown && searchResults && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((customer) => (
                          <div
                            key={customer.id}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              resolveAsExisting(customer);
                              setShowSearchDropdown(false);
                            }}
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {customer.shipping_mark} • {customer.email}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveAsExisting(customer);
                                setShowSearchDropdown(false);
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="icon" disabled={isSearching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                {/* Click outside handler */}
                {showSearchDropdown && (
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSearchDropdown(false)}
                  />
                )}
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
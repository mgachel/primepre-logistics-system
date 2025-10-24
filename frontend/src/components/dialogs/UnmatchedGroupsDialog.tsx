import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, Loader2 } from 'lucide-react';
import { containerExcelService } from '@/services/containerExcelService';
import { useToast } from '@/hooks/use-toast';

interface Group {
  shipping_mark_normalized: string;
  display_mark: string;
  count: number;
  candidates: any[];
  suggestions?: any[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadId: string;
  unmatchedGroups: Group[];
  matchedItems: any[]; // existing matched_items to include when creating
  containerId: string;
  onComplete: (result: any) => void;
}

export function UnmatchedGroupsDialog({
  open,
  onOpenChange,
  uploadId,
  unmatchedGroups,
  matchedItems,
  containerId,
  onComplete,
}: Props) {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedGroup) {
      setSearchTerm('');
      setSearchResults([]);
    } else {
      setSearchTerm(selectedGroup.shipping_mark_normalized || '');
    }
  }, [selectedGroup]);

  const doSearch = useCallback(async (q: string) => {
    setIsSearching(true);
    try {
      const resp = await containerExcelService.searchCustomers(q, 20, 1);
      setSearchResults(resp.customers || []);
    } catch (err) {
      console.error('search error', err);
      toast({ title: 'Search Failed', description: 'Unable to search customers', variant: 'destructive' });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!searchTerm) return;
    const t = setTimeout(() => doSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm, doSearch]);

  const handleMapGroupToCustomer = async (customerId: number) => {
    if (!selectedGroup) return;
    setIsProcessing(true);
    try {
      // Expand group into resolved mappings on server
      const expandResp = await containerExcelService.expandUnmatchedGroup(
        uploadId,
        selectedGroup.shipping_mark_normalized,
        'map_existing',
        { customer_id: customerId }
      );

      // Create items by calling createItems with matchedItems + expanded mappings
      const createResp = await containerExcelService.createItems(
        containerId,
        matchedItems || [],
        expandResp.resolved_mappings
      );

      toast({ title: 'Group Resolved', description: `Created ${createResp.statistics.total_created} items` });
      onComplete(createResp);
      onOpenChange(false);
    } catch (err: any) {
      console.error('map group failed', err);
      toast({ title: 'Failed', description: err.message || 'Failed to map group', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Users className="inline mr-2" />
            Unmatched Shipping Mark Groups
          </DialogTitle>
          <DialogDescription>
            Review groups of identical shipping marks and bulk-map them to a single customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {unmatchedGroups && unmatchedGroups.length > 0 ? (
              unmatchedGroups.map((g) => (
                <Card key={g.shipping_mark_normalized}>
                  <CardHeader>
                    <CardTitle className="text-sm">{g.display_mark}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Count: {g.count}</div>
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => setSelectedGroup(g)}>
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-2 text-sm text-muted-foreground">No groups available</div>
            )}
          </div>

          <Separator />

          {selectedGroup && (
            <div className="space-y-3">
              <div className="text-sm">
                <strong>Selected Group:</strong> {selectedGroup.display_mark} ({selectedGroup.count})
              </div>

              <div>
                <Label>Map entire group to existing customer</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search customers by shipping mark, name, email or phone" />
                  <Button onClick={() => doSearch(searchTerm)} disabled={isSearching}>{isSearching ? <Loader2 className="animate-spin" /> : 'Search'}</Button>
                </div>

                <div className="mt-2 space-y-2">
                  {searchResults.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{c.shipping_mark} — {c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email} • {c.phone}</div>
                      </div>
                      <Button onClick={() => handleMapGroupToCustomer(c.id)} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Map Group'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

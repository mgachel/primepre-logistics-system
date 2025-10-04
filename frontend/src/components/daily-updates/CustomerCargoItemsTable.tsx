import { useState } from 'react';
import { CargoItem } from '@/services/customerDailyUpdatesService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';

interface CustomerCargoItemsTableProps {
  items: CargoItem[];
  cargoType: 'air' | 'sea';
}

export function CustomerCargoItemsTable({ items, cargoType }: CustomerCargoItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.tracking_id.toLowerCase().includes(search) ||
      item.item_description?.toLowerCase().includes(search) ||
      item.client_name?.toLowerCase().includes(search) ||
      item.client_shipping_mark?.toLowerCase().includes(search)
    );
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mb-2 opacity-50" />
        <p>No cargo items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by tracking ID, description, client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchTerm && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredItems.length} of {items.length} items
        </p>
      )}

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mb-2 opacity-50" />
          <p>No items match your search</p>
        </div>
      ) : (
        <div className="rounded-md border bg-muted/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipping Mark</TableHead>
                <TableHead>Tracking Number</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">{cargoType === 'air' ? 'Weight (kg)' : 'CBM'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.client_shipping_mark || '-'}</TableCell>
                  <TableCell>{item.tracking_id}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {cargoType === 'air' 
                      ? (item.weight?.toFixed(2) || '-')
                      : (item.cbm?.toFixed(3) || '-')
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

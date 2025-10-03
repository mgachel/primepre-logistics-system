import { useState } from 'react';
import { CargoItem } from '@/services/customerDailyUpdatesService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';

interface CustomerCargoItemsTableProps {
  items: CargoItem[];
  cargoType: 'air' | 'sea';
}

export function CustomerCargoItemsTable({ items, cargoType }: CustomerCargoItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return '-';
    return `$${parseFloat(value).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'delivered') return 'bg-green-500';
    if (statusLower === 'in_transit') return 'bg-blue-500';
    if (statusLower === 'pending') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

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
                <TableHead>Tracking ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                {cargoType === 'air' && <TableHead className="text-right">Weight (kg)</TableHead>}
                {cargoType === 'sea' && (
                  <>
                    <TableHead className="text-right">CBM</TableHead>
                    <TableHead className="text-right">Dimensions (L×B×H)</TableHead>
                  </>
                )}
                <TableHead className="text-right">Unit Value</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Client</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.tracking_id}</TableCell>
                  <TableCell className="max-w-md truncate">{item.item_description || '-'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  {cargoType === 'air' && (
                    <TableCell className="text-right">{item.weight?.toFixed(2) || '-'}</TableCell>
                  )}
                  {cargoType === 'sea' && (
                    <>
                      <TableCell className="text-right">{item.cbm?.toFixed(3) || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.length && item.breadth && item.height
                          ? `${item.length}×${item.breadth}×${item.height}`
                          : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">{formatCurrency(item.unit_value)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.total_value)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.delivered_date || '')}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{item.client_shipping_mark || item.client_name}</div>
                      {item.client_shipping_mark && item.client_name && (
                        <div className="text-muted-foreground text-xs">{item.client_name}</div>
                      )}
                    </div>
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

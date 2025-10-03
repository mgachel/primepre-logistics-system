import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Package, AlertCircle, Loader2 } from 'lucide-react';
import { customerDailyUpdatesService, GoodsReceivedChina } from '@/services/customerDailyUpdatesService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Customer Air Goods Received Component
 * Read-only view of air goods received in China from last 30 days
 * Mirrors admin dashboard functionality
 */
export function CustomerAirGoodsReceived() {
  const [goods, setGoods] = useState<GoodsReceivedChina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadGoods();
  }, [searchTerm, statusFilter, page]);

  const loadGoods = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customerDailyUpdatesService.getAirGoodsReceived({
        search: searchTerm,
        status: statusFilter,
        page,
        page_size: 20,
      });

      setGoods(response.data || []);
      if (response.count) {
        setTotalPages(Math.ceil(response.count / 20));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load air goods received');
      console.error('Error loading air goods received:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pending', variant: 'secondary' as const },
      READY_FOR_SHIPPING: { label: 'Ready for Shipping', variant: 'default' as const },
      FLAGGED: { label: 'Flagged', variant: 'destructive' as const },
      SHIPPED: { label: 'Shipped', variant: 'success' as const },
      CANCELLED: { label: 'Cancelled', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Air Goods Received - China (Last 30 Days)
          </CardTitle>
          <CardDescription>
            View-only list of air goods received in China warehouse. Search and filter available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by shipping mark, tracking, or description..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter || 'all'} onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="READY_FOR_SHIPPING">Ready for Shipping</SelectItem>
                  <SelectItem value="FLAGGED">Flagged</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Goods Table */}
          {!loading && !error && (
            <>
              {goods.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No air goods received found in the last 30 days.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shipping Mark</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Weight (kg)</TableHead>
                          <TableHead>Date Received</TableHead>
                          <TableHead>Days in Warehouse</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goods.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.shipping_mark || 'N/A'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.supply_tracking}
                            </TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {item.weight ? `${item.weight} kg` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                {formatDate(item.date_received)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.days_in_warehouse !== undefined 
                                ? `${item.days_in_warehouse} days` 
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.description || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerAirGoodsReceived;

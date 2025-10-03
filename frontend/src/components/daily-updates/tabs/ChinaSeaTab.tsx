import { useEffect, useState, useMemo, useCallback } from 'react';
import { Package, Search, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { warehouseService, WarehouseItem } from '@/services/warehouseService';
import { formatDate } from '@/lib/date';
import { useToast } from '@/hooks/use-toast';

export default function ChinaSeaTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Calculate date 30 days ago
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch China Sea goods with date_received filter for last 30 days
      const response = await warehouseService.getChinaSeaGoods({
        search: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: pageSize,
        ordering: '-date_received',
        date_received_after: thirtyDaysAgo, // Filter for last 30 days
      });

      if (response.success && response.data) {
        const results = Array.isArray(response.data.results) ? response.data.results : [];
        const total = typeof response.data.count === 'number' ? response.data.count : results.length;
        const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

        if (page > totalPages && totalPages >= 1) {
          setPage(totalPages);
          return;
        }

        setItems(results);
        setTotalCount(total);
      } else {
        setError('Failed to load warehouse data');
        setItems([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error loading China Sea warehouse items:', err);
      setItems([]);
      setTotalCount(0);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, page, pageSize, thirtyDaysAgo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = useMemo(() => {
    return items;
  }, [items]);

  const columns: Column<WarehouseItem>[] = [
    {
      id: 'date_received',
      header: 'Date Received',
      accessor: (item) => (
        <span className="text-sm">{formatDate(item.date_received)}</span>
      ),
      sort: (a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime(),
      width: '120px',
    },
    {
      id: 'shipping_mark',
      header: 'Shipping Mark',
      accessor: (item) => (
        <span className="font-medium">{item.shipping_mark || '-'}</span>
      ),
      sort: (a, b) => (a.shipping_mark || '').localeCompare(b.shipping_mark || ''),
      sticky: true,
      clickable: true,
    },
    {
      id: 'supply_tracking',
      header: 'Supply Tracking',
      accessor: (item) => item.supply_tracking || '-',
      sort: (a, b) => (a.supply_tracking || '').localeCompare(b.supply_tracking || ''),
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.description || '-'}
        </span>
      ),
    },
    {
      id: 'quantity',
      header: 'Qty',
      accessor: (item) => item.quantity,
      sort: (a, b) => a.quantity - b.quantity,
      align: 'right',
      width: '80px',
    },
    {
      id: 'cbm',
      header: 'CBM',
      accessor: (item) => {
        if (!item.cbm) return '-';
        return `${Number(item.cbm).toFixed(5)} m³`;
      },
      sort: (a, b) => (a.cbm || 0) - (b.cbm || 0),
      align: 'right',
      width: '120px',
    },
    {
      id: 'weight',
      header: 'Weight (kg)',
      accessor: (item) => {
        if (!item.weight) return '-';
        return `${Number(item.weight).toFixed(2)} kg`;
      },
      sort: (a, b) => (a.weight || 0) - (b.weight || 0),
      align: 'right',
      width: '120px',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (item) => (
        <StatusBadge 
          status={
            item.status === 'PENDING' ? 'pending' :
            item.status === 'READY_FOR_SHIPPING' ? 'in-transit' :
            item.status === 'SHIPPED' ? 'delivered' : 'pending'
          } 
        />
      ),
      width: '120px',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by shipping mark, supply tracking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="READY_FOR_SHIPPING">Ready for Shipping</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        enableRowSelection={false}
        defaultSortColumn="date_received"
        empty={
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No China Sea items found in the last 30 days.</p>
          </div>
        }
      />

      {/* Pagination Info */}
      {totalCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {totalCount} items (last 30 days)
        </div>
      )}
    </div>
  );
}

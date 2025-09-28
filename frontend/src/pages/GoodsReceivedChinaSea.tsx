import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Package, Search, Filter, RefreshCcw, Plus, CheckCircle2, Flag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MetricCard } from '@/components/ui/metric-card';
import { ExcelUploadButton } from '@/components/ui/ExcelUploadButton';
import { NewGoodsDialog } from '@/components/dialogs/NewGoodsDialog';
import { DataTable, Column } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { warehouseService, WarehouseItem } from '@/services/warehouseService';
import { formatDate } from '@/lib/date';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SeaCargoStats {
  total_count: number;
  pending_count: number;
  ready_for_shipping_count: number;
  flagged_count: number;
}

export default function GoodsReceivedChinaSea() {
  const { toast } = useToast();
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<SeaCargoStats | null>(null);
  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);
  const { isCustomer } = useAuth();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading China Sea data, isCustomer:', isCustomer());
      
      // Use different service methods based on user role
      const response = isCustomer() 
        ? await warehouseService.getChinaWarehouseItems()
        : await warehouseService.getAdminChinaItems({});
      
      console.log('📦 Warehouse response:', response);
      
      if (response.success && response.data) {
        console.log('📊 Total items:', response.data.results.length);
        
        // Filter for SEA shipments only
        const seaItems = response.data.results.filter(
          item => item.method_of_shipping === 'SEA'
        );
        
        console.log('🚢 SEA items:', seaItems.length);
        
        // Debug: Log first item structure
        if (seaItems.length > 0) {
          console.log('🔍 First SEA item structure:', seaItems[0]);
          console.log('🔍 Available properties:', Object.keys(seaItems[0]));
        }
        
        setItems(seaItems);
      } else {
        setError('Failed to load warehouse data');
      }
    } catch (err) {
      console.error('Error loading China Sea warehouse items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  // Fetch statistics for SEA cargo
  const fetchStats = useCallback(async () => {
    try {
      // For now, calculate stats from loaded items since we don't have a specific SEA stats endpoint
      const response = isCustomer() 
        ? await warehouseService.getChinaWarehouseItems()
        : await warehouseService.getAdminChinaItems({});
      
      if (response.success && response.data) {
        const seaItems = response.data.results.filter(
          item => item.method_of_shipping === 'SEA'
        );
        
        const stats: SeaCargoStats = {
          total_count: seaItems.length,
          pending_count: seaItems.filter(item => item.status === 'PENDING').length,
          ready_for_shipping_count: seaItems.filter(item => item.status === 'READY_FOR_SHIPPING').length,
          flagged_count: seaItems.filter(item => item.status === 'FLAGGED').length,
        };
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch China sea statistics:', error);
    }
  }, [isCustomer]);

  const handleStatusUpdate = async (item: WarehouseItem, newStatus: string) => {
    try {
      await warehouseService.updateChinaGoodsStatus(item.id, newStatus);
      await loadData();
      await fetchStats();
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: WarehouseItem) => {
    try {
      await warehouseService.deleteChinaGoods(item.id);
      await loadData();
      await fetchStats();
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load China Sea warehouse items
  useEffect(() => {
    const initData = async () => {
      await loadData();
      await fetchStats();
    };
    initData();
  }, [loadData, fetchStats]);

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.shipping_mark.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supply_tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  // Table configuration
  type Row = {
    id: number;
    item_id: string;
    shipping_mark: string;
    supply_tracking: string;
    description: string;
    quantity: number;
    weight: number | null;
    cbm: number;
    status: WarehouseItem['status'];
    date_received: string;
    days_in_warehouse: number;
    _raw: WarehouseItem;
  };

  const rows: Row[] = useMemo(() => {
    return filteredItems.map(item => ({
      id: item.id,
      item_id: item.item_id || `item-${item.id}`,
      shipping_mark: item.shipping_mark,
      supply_tracking: item.supply_tracking,
      description: item.description || '-',
      quantity: item.quantity || 0,
      weight: item.weight || null,
      cbm: Number(item.cbm) || 0,
      status: item.status,
      date_received: item.date_received,
      days_in_warehouse: item.days_in_warehouse || 0,
      _raw: item,
    }));
  }, [filteredItems]);

  const columns: Column<Row>[] = [
    {
      id: 'item_id',
      header: 'Item ID',
      accessor: (r) => <span className="font-medium">{r.item_id}</span>,
      sort: (a, b) => a.item_id.localeCompare(b.item_id),
    },
    {
      id: 'shipping_mark',
      header: 'Shipping Mark',
      accessor: (r) => <span className="font-medium">{r.shipping_mark}</span>,
      sort: (a, b) => a.shipping_mark.localeCompare(b.shipping_mark),
    },
    {
      id: 'supply_tracking',
      header: 'Tracking ID',
      accessor: (r) => <span className="text-sm">{r.supply_tracking}</span>,
      sort: (a, b) => a.supply_tracking.localeCompare(b.supply_tracking),
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (r) => <span className="text-sm">{r.description}</span>,
    },
    {
      id: 'quantity',
      header: 'Quantity',
      accessor: (r) => <span className="text-sm">{r.quantity}</span>,
      sort: (a, b) => a.quantity - b.quantity,
    },
    {
      id: 'cbm',
      header: 'CBM',
      accessor: (r) => <span className="text-sm">{Number(r.cbm).toFixed(2)}</span>,
      sort: (a, b) => Number(a.cbm) - Number(b.cbm),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (r) => <StatusBadge status={r.status} />,
      sort: (a, b) => a.status.localeCompare(b.status),
    },
    {
      id: 'date_received',
      header: 'Date Received',
      accessor: (r) => (
        <span className="text-sm">
          {formatDate(new Date(r.date_received))}
        </span>
      ),
      sort: (a, b) => new Date(a.date_received).getTime() - new Date(b.date_received).getTime(),
    },
    {
      id: 'days_in_warehouse',
      header: 'Days in Warehouse',
      accessor: (r) => <span className="text-sm">{r.days_in_warehouse}</span>,
      sort: (a, b) => a.days_in_warehouse - b.days_in_warehouse,
    },
  ];

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              China (Sea) - Goods Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 opacity-60" />
                <p className="text-muted-foreground">Loading warehouse data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              China (Sea) - Goods Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            China Warehouse - Sea Cargo
          </h1>
          <p className="text-muted-foreground">
            Manage sea cargo goods received in China warehouse
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExcelUploadButton
            uploadType="sea_cargo"
            warehouse="China"
            onUploadComplete={() => {
              const refreshData = async () => {
                await loadData();
                await fetchStats();
              };
              refreshData();
            }}
          />
          <Button
            onClick={() => setShowNewGoodsDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Goods Received
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={stats?.total_count || 0}
          icon={Package}
        />
        <MetricCard
          title="Pending"
          value={stats?.pending_count || 0}
          icon={Package}
        />
        <MetricCard
          title="Ready for Shipping"
          value={stats?.ready_for_shipping_count || 0}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Flagged"
          value={stats?.flagged_count || 0}
          icon={Flag}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by shipping mark, tracking ID, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="READY_FOR_SHIPPING">Ready for Shipping</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="READY_FOR_DELIVERY">Ready for Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="FLAGGED">Flagged</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                const refreshData = async () => {
                  await loadData();
                  await fetchStats();
                };
                refreshData();
              }} 
              variant="outline" 
              size="sm"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 opacity-60" />
                <p className="text-muted-foreground">Loading warehouse data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button 
                onClick={() => {
                  const refreshData = async () => {
                    await loadData();
                    await fetchStats();
                  };
                  refreshData();
                }} 
                variant="outline"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <DataTable
              id="china-sea-goods"
              rows={Array.isArray(rows) ? rows : []}
              columns={columns}
              loading={loading}
              defaultSort={{ column: "date_received", direction: "desc" }}
              rowActions={(row) => (
                <>
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate(row._raw, "READY_FOR_SHIPPING")}
                    disabled={row._raw.status === "READY_FOR_SHIPPING"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Ready
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusUpdate(row._raw, "FLAGGED")}
                    disabled={row._raw.status === "FLAGGED"}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Flag Item
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(row._raw)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              empty={
                <div className="text-center py-8">
                  <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No sea cargo found
                  </h3>
                  <p className="text-muted-foreground">
                    Add sea cargo goods or adjust your search filters
                  </p>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* New Goods Dialog */}
            {/* New Goods Dialog */}
      <NewGoodsDialog
        open={showNewGoodsDialog}
        onOpenChange={setShowNewGoodsDialog}
        warehouse="china"
        defaultShippingMethod="SEA"
        onSuccess={() => {
          const refreshData = async () => {
            await loadData();
            await fetchStats();
          };
          refreshData();
        }}
      />
    </div>
  );
}

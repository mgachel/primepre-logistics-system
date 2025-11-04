import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ship, Package, Search, Filter, RefreshCcw, Plus, CheckCircle2, Flag, Trash2, Edit, Save, X } from 'lucide-react';
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
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/date';
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
  const [activeSearchTerm, setActiveSearchTerm] = useState(''); // The actual search term used for API calls
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<SeaCargoStats | null>(null);
  const [showNewGoodsDialog, setShowNewGoodsDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Partial<import('@/services/warehouseService').UpdateWarehouseItemRequest>>({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading China Sea data');

      // Use dedicated China Sea service method with pagination
      const response = await warehouseService.getChinaSeaGoods({
        search: activeSearchTerm || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        page_size: pageSize,
        ordering: '-date_received',
      });

      console.log('📦 Warehouse response:', response);

      if (response.success && response.data) {
        const results = Array.isArray(response.data.results) ? response.data.results : [];
        const total = typeof response.data.count === 'number' ? response.data.count : results.length;
        const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

        if (page > totalPages && totalPages >= 1) {
          setPage(totalPages);
          return;
        }

        console.log('📊 Total SEA items:', total);

        if (results.length > 0) {
          console.log('🔍 First SEA item structure:', results[0]);
          console.log('🔍 Available properties:', Object.keys(results[0]));
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
  }, [activeSearchTerm, statusFilter, page, pageSize]);

  // Edit functions
  const handleEditStart = (item: WarehouseItem) => {
    setEditingItem(item.id);
    setEditingData({
      shipping_mark: item.shipping_mark || undefined,
      supply_tracking: item.supply_tracking || undefined,
      description: item.description ?? undefined,
      quantity: item.quantity,
      cbm: item.cbm ?? undefined,
      status: item.status,
    });
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditingData({});
  };

  const handleEditSave = async () => {
    if (!editingItem || !editingData) return;

    try {
      setSaving(true);
      await warehouseService.updateChinaWarehouseItem(editingItem, editingData);
      await loadData();
      await fetchStats();
      setEditingItem(null);
      setEditingData({});
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    } catch (error) {
      console.error('Failed to update item:', error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = <K extends keyof WarehouseItem>(field: K, value: WarehouseItem[K]) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Fetch statistics for SEA cargo
  const fetchStats = useCallback(async () => {
    try {
      // Use dedicated China Sea statistics endpoint
      const response = await warehouseService.getChinaSeaStatistics();
      
      if (response.success && response.data) {
        // Map AdminWarehouseStatistics to SeaCargoStats format
        const stats: SeaCargoStats = {
          total_count: response.data.total_count,
          pending_count: response.data.pending_count,
          ready_for_shipping_count: response.data.ready_for_shipping_count || 0,
          flagged_count: response.data.flagged_count || 0,
        };
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch China sea statistics:', error);
    }
  }, []);

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

  // Handler for search on Enter key press
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setActiveSearchTerm(searchTerm);
      setPage(1);
    }
  };

  // Filter items based on search and status
  const filteredItems = useMemo(() => {
    return items;
  }, [items]);

  // Role-aware coloring using auth store
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = "#00703D";
  const primaryColor = isCustomer ? "#2563eb" : ADMIN_GREEN;
  // Apply conditional coloring to all relevant elements
  const buttonStyle = { backgroundColor: primaryColor, color: "#FFFFFF" };
  const outlineButtonStyle = { borderColor: primaryColor, color: primaryColor };
  const iconStyle = { color: primaryColor };

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
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return isEditing ? (
          <Input
            value={editingData.shipping_mark || ''}
            onChange={(e) => handleFieldChange('shipping_mark', e.target.value)}
            className="h-8 text-sm"
          />
        ) : (
          <span className="font-medium">{r.shipping_mark}</span>
        );
      },
      sort: (a, b) => a.shipping_mark.localeCompare(b.shipping_mark),
    },
    {
      id: 'supply_tracking',
      header: 'Tracking ID',
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return isEditing ? (
          <Input
            value={editingData.supply_tracking || ''}
            onChange={(e) => handleFieldChange('supply_tracking', e.target.value)}
            className="h-8 text-sm"
          />
        ) : (
          <span className="text-sm">{r.supply_tracking}</span>
        );
      },
      sort: (a, b) => a.supply_tracking.localeCompare(b.supply_tracking),
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return isEditing ? (
          <Input
            value={editingData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="h-8 text-sm"
          />
        ) : (
          <span className="text-sm">{r.description}</span>
        );
      },
    },
    {
      id: 'quantity',
      header: 'Quantity',
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return isEditing ? (
          <Input
            type="number"
            value={editingData.quantity || ''}
            onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value))}
            className="h-8 text-sm w-20"
          />
        ) : (
          <span className="text-sm">{r.quantity}</span>
        );
      },
      sort: (a, b) => a.quantity - b.quantity,
    },
    {
      id: 'cbm',
      header: 'CBM',
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return isEditing ? (
          <Input
            type="number"
            step="0.01"
            value={editingData.cbm || ''}
            onChange={(e) => handleFieldChange('cbm', parseFloat(e.target.value))}
            className="h-8 text-sm w-20"
          />
        ) : (
          <span className="text-sm">{Number(r.cbm).toFixed(5)}</span>
        );
      },
      sort: (a, b) => Number(a.cbm) - Number(b.cbm),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return isEditing ? (
          <Select
            value={editingData.status || r.status}
            onValueChange={(value) => handleFieldChange('status', value as WarehouseItem['status'])}
          >
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="READY_FOR_SHIPPING">Ready for Shipping</SelectItem>
              <SelectItem value="FLAGGED">Flagged</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <StatusBadge status={r.status} />
        );
      },
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
    {
      id: 'actions',
      header: 'Actions',
      accessor: (r) => {
        const isEditing = editingItem === r._raw.id;
        return (
          <div className="flex gap-1">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditSave}
                  disabled={saving}
                  className="h-8 w-8 p-0"
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleEditCancel}
                  disabled={saving}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditStart(r._raw)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
      width: "100px",
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground">
            China Warehouse - Sea Cargo
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage sea cargo goods received in China warehouse
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExcelUploadButton
            uploadType="goods_received"
            warehouse="China"
            onUploadComplete={() => {
              const refreshData = async () => {
                await loadData();
                await fetchStats();
              };
              refreshData();
            }}
            style={buttonStyle}
          />
          <Button
            onClick={() => setShowNewGoodsDialog(true)}
            className="flex items-center gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
            style={buttonStyle}
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: "#FFFFFF" }} />
            <span className="hidden xs:inline">Add Goods</span>
            <span className="xs:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Total Items"
          value={stats?.total_count || 0}
          icon={Package}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + '22'}
        />
        <MetricCard
          title="Pending"
          value={stats?.pending_count || 0}
          icon={Package}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + '22'}
        />
        <MetricCard
          title="Ready for Shipping"
          value={stats?.ready_for_shipping_count || 0}
          icon={CheckCircle2}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + '22'}
        />
        <MetricCard
          title="Flagged"
          value={stats?.flagged_count || 0}
          icon={Flag}
          iconColor={primaryColor}
          bgColor={isCustomer ? undefined : ADMIN_GREEN + '22'}
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
                  placeholder="Search by shipping mark, tracking ID, or description... (Press Enter to search)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-10"
                />
              </div>
            </div>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value as string);
                        setPage(1);
                      }}
                    >
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
              style={outlineButtonStyle}
            >
              <RefreshCcw className="h-4 w-4 mr-2" style={iconStyle} />
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
                style={outlineButtonStyle}
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
              pagination={{
                page,
                pageSize,
                total: totalCount,
                onPageChange: (nextPage) => setPage(nextPage),
                onPageSizeChange: (nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                },
                pageSizeOptions: [25, 50, 100, 200],
              }}
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
        warehouseType="china"
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
 
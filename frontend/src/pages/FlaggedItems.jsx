import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Download, CheckCircle } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import SearchAndFilter from '../components/dashboard/SearchAndFilter';
import GoodsTable from '../components/dashboard/GoodsTable';
import goodsService from '../services/goodsService';

const FlaggedItems = () => {
  const [chinaGoods, setChinaGoods] = useState([]);
  const [ghanaGoods, setGhanaGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('china');
  const [filters, setFilters] = useState({});

  const loadFlaggedGoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [chinaData, ghanaData] = await Promise.all([
        goodsService.getChinaFlaggedItems(),
        goodsService.getGhanaFlaggedItems()
      ]);
      
      setChinaGoods(chinaData.items || chinaData.results || chinaData);
      setGhanaGoods(ghanaData.items || ghanaData.results || ghanaData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlaggedGoods();
  }, [loadFlaggedGoods]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = () => {
    loadFlaggedGoods();
  };

  const handleStatusUpdate = async (id, status, warehouse) => {
    try {
      if (warehouse === 'china') {
        await goodsService.updateChinaGoodsStatus(id, status);
      } else {
        await goodsService.updateGhanaGoodsStatus(id, status);
      }
      await loadFlaggedGoods();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleBulkStatusUpdate = async (ids, status, warehouse) => {
    try {
      if (warehouse === 'china') {
        await goodsService.bulkUpdateChinaStatus(ids, status);
      } else {
        await goodsService.bulkUpdateGhanaStatus(ids, status);
      }
      await loadFlaggedGoods();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleBulkResolve = async (warehouse) => {
    const goods = warehouse === 'china' ? chinaGoods : ghanaGoods;
    if (goods.length === 0) return;

    const confirmMsg = `Resolve all ${goods.length} flagged items in ${warehouse === 'china' ? 'China' : 'Ghana'} warehouse?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const ids = goods.map(item => item.id);
      const newStatus = warehouse === 'china' ? 'READY_FOR_SHIPPING' : 'READY_FOR_DELIVERY';
      
      if (warehouse === 'china') {
        await goodsService.bulkUpdateChinaStatus(ids, newStatus);
      } else {
        await goodsService.bulkUpdateGhanaStatus(ids, newStatus);
      }
      
      await loadFlaggedGoods();
    } catch (err) {
      alert(`Failed to resolve flagged items: ${err.message}`);
    }
  };

  const filteredGoods = (goods) => {
    if (!filters.search && !filters.location && !filters.supplier_name) {
      return goods;
    }

    return goods.filter(item => {
      const matchesSearch = !filters.search || 
        item.item_id.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.shipping_mark.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.supply_tracking.toLowerCase().includes(filters.search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(filters.search.toLowerCase()));

      const matchesLocation = !filters.location || item.location === filters.location;
      const matchesSupplier = !filters.supplier_name || 
        (item.supplier_name && item.supplier_name.toLowerCase().includes(filters.supplier_name.toLowerCase()));

      return matchesSearch && matchesLocation && matchesSupplier;
    });
  };

  const currentGoods = activeTab === 'china' ? filteredGoods(chinaGoods) : filteredGoods(ghanaGoods);

  return (
    <DashboardLayout title="Flagged Items">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="h-8 w-8 mr-3 text-red-600" />
              Flagged Items
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Items that require attention before shipping
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => handleBulkResolve(activeTab)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              disabled={currentGoods.length === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve All
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        {(chinaGoods.length > 0 || ghanaGoods.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Items Require Attention
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  You have {chinaGoods.length + ghanaGoods.length} flagged items that need to be reviewed and resolved.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">China Warehouse</p>
                <p className="text-3xl font-bold text-red-600">{chinaGoods.length}</p>
                <p className="text-sm text-gray-500">Flagged items</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            {chinaGoods.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => handleBulkResolve('china')}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  Mark all as ready for shipping →
                </button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ghana Warehouse</p>
                <p className="text-3xl font-bold text-red-600">{ghanaGoods.length}</p>
                <p className="text-sm text-gray-500">Flagged items</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            {ghanaGoods.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => handleBulkResolve('ghana')}
                  className="text-sm text-green-600 hover:text-green-800 font-medium"
                >
                  Mark all as ready for delivery →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Warehouse Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('china')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'china'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                China Warehouse ({chinaGoods.length})
              </button>
              <button
                onClick={() => setActiveTab('ghana')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'ghana'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ghana Warehouse ({ghanaGoods.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Search and Filters */}
            <div className="mb-6">
              <SearchAndFilter 
                warehouse={activeTab}
                onFiltersChange={handleFiltersChange}
                initialFilters={{ status: 'FLAGGED' }}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-red-700">
                  Error: {error}
                </div>
              </div>
            )}

            {/* Goods Table */}
            <GoodsTable
              goods={currentGoods}
              loading={loading}
              warehouse={activeTab}
              onStatusUpdate={(id, status) => handleStatusUpdate(id, status, activeTab)}
              onBulkStatusUpdate={(ids, status) => handleBulkStatusUpdate(ids, status, activeTab)}
              showSelection={true}
            />

            {/* Empty State */}
            {!loading && currentGoods.length === 0 && !error && (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No flagged items
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Great! All items in this warehouse are in good standing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FlaggedItems;

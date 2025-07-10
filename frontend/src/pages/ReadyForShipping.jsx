import React, { useState, useEffect, useCallback } from 'react';
import { Ship, RefreshCw, Download } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import SearchAndFilter from '../components/dashboard/SearchAndFilter';
import GoodsTable from '../components/dashboard/GoodsTable';
import goodsService from '../services/goodsService';

const ReadyForShipping = () => {
  const [chinaGoods, setChinaGoods] = useState([]);
  const [ghanaGoods, setGhanaGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('china');
  const [filters, setFilters] = useState({});

  const loadReadyGoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [chinaData, ghanaData] = await Promise.all([
        goodsService.getChinaReadyForShipping(),
        goodsService.getGhanaReadyForShipping()
      ]);
      
      setChinaGoods(chinaData.results || chinaData);
      setGhanaGoods(ghanaData.results || ghanaData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReadyGoods();
  }, [loadReadyGoods]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = () => {
    loadReadyGoods();
  };

  const handleStatusUpdate = async (id, status, warehouse) => {
    try {
      if (warehouse === 'china') {
        await goodsService.updateChinaGoodsStatus(id, status);
      } else {
        await goodsService.updateGhanaGoodsStatus(id, status);
      }
      await loadReadyGoods();
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
      await loadReadyGoods();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
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
    <DashboardLayout title="Ready for Shipping">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Ship className="h-8 w-8 mr-3 text-green-600" />
              Ready for Shipping
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Items ready to be shipped from warehouses
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
              onClick={() => {/* TODO: Export functionality */}}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Export List
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">China Warehouse</p>
                <p className="text-3xl font-bold text-green-600">{chinaGoods.length}</p>
                <p className="text-sm text-gray-500">Items ready for shipping</p>
              </div>
              <Ship className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ghana Warehouse</p>
                <p className="text-3xl font-bold text-green-600">{ghanaGoods.length}</p>
                <p className="text-sm text-gray-500">Items ready for delivery</p>
              </div>
              <Ship className="h-8 w-8 text-green-600" />
            </div>
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                China Warehouse ({chinaGoods.length})
              </button>
              <button
                onClick={() => setActiveTab('ghana')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'ghana'
                    ? 'border-blue-500 text-blue-600'
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
                initialFilters={{
                  status: activeTab === 'china' ? 'READY_FOR_SHIPPING' : 'READY_FOR_DELIVERY'
                }}
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
                <Ship className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No items ready for shipping
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Items will appear here when they are marked as ready for shipping.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReadyForShipping;

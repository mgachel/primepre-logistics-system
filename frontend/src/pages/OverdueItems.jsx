import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, Download, Settings, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import SearchAndFilter from '../components/dashboard/SearchAndFilter';
import GoodsTable from '../components/dashboard/GoodsTable';
import goodsService from '../services/goodsService';

const OverdueItems = () => {
  const [chinaGoods, setChinaGoods] = useState([]);
  const [ghanaGoods, setGhanaGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('china');
  const [filters, setFilters] = useState({});
  const [overdueThreshold, setOverdueThreshold] = useState(30);
  const [showSettings, setShowSettings] = useState(false);

  const loadOverdueGoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [chinaData, ghanaData] = await Promise.all([
        goodsService.getChinaOverdueItems(overdueThreshold),
        goodsService.getGhanaOverdueItems(overdueThreshold)
      ]);
      
      setChinaGoods(chinaData.results || chinaData);
      setGhanaGoods(ghanaData.results || ghanaData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [overdueThreshold]);

  useEffect(() => {
    loadOverdueGoods();
  }, [loadOverdueGoods]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = () => {
    loadOverdueGoods();
  };

  const handleThresholdChange = (newThreshold) => {
    setOverdueThreshold(newThreshold);
    setShowSettings(false);
  };

  const handleStatusUpdate = async (id, status, warehouse) => {
    try {
      if (warehouse === 'china') {
        await goodsService.updateChinaGoodsStatus(id, status);
      } else {
        await goodsService.updateGhanaGoodsStatus(id, status);
      }
      await loadOverdueGoods();
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

  const getDaysOverdue = (dateReceived) => {
    const receivedDate = new Date(dateReceived);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - receivedDate) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const getSeverityColor = (daysOverdue) => {
    if (daysOverdue >= overdueThreshold + 30) return 'text-red-600 bg-red-100';
    if (daysOverdue >= overdueThreshold + 14) return 'text-orange-600 bg-orange-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const currentGoods = activeTab === 'china' ? filteredGoods(chinaGoods) : filteredGoods(ghanaGoods);

  return (
    <DashboardLayout title="Overdue Items">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Clock className="h-8 w-8 mr-3 text-orange-600" />
              Overdue Items
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Items that have been in warehouse longer than {overdueThreshold} days
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overdue Threshold (days)
                    </label>
                    <select
                      value={overdueThreshold}
                      onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={21}>21 days</option>
                      <option value={30}>30 days</option>
                      <option value={45}>45 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
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

        {/* Alert Banner */}
        {(chinaGoods.length > 0 || ghanaGoods.length > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">
                  Overdue Items Detected
                </h3>
                <div className="mt-1 text-sm text-orange-700">
                  You have {chinaGoods.length + ghanaGoods.length} items that have been in warehouses longer than {overdueThreshold} days.
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
                <p className="text-3xl font-bold text-orange-600">{chinaGoods.length}</p>
                <p className="text-sm text-gray-500">Overdue items</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            {chinaGoods.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avg. days overdue:</span>
                  <span className="font-medium">
                    {Math.round(chinaGoods.reduce((sum, item) => 
                      sum + getDaysOverdue(item.date_received), 0) / chinaGoods.length)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Most overdue:</span>
                  <span className="font-medium">
                    {Math.max(...chinaGoods.map(item => getDaysOverdue(item.date_received)))} days
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ghana Warehouse</p>
                <p className="text-3xl font-bold text-orange-600">{ghanaGoods.length}</p>
                <p className="text-sm text-gray-500">Overdue items</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            {ghanaGoods.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avg. days overdue:</span>
                  <span className="font-medium">
                    {Math.round(ghanaGoods.reduce((sum, item) => 
                      sum + getDaysOverdue(item.date_received), 0) / ghanaGoods.length)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Most overdue:</span>
                  <span className="font-medium">
                    {Math.max(...ghanaGoods.map(item => getDaysOverdue(item.date_received)))} days
                  </span>
                </div>
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
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                China Warehouse ({chinaGoods.length})
              </button>
              <button
                onClick={() => setActiveTab('ghana')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'ghana'
                    ? 'border-orange-500 text-orange-600'
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

            {/* Enhanced Table with Overdue Information */}
            <div className="space-y-4">
              {currentGoods.map((item) => {
                const daysOverdue = getDaysOverdue(item.date_received);
                const severityClass = getSeverityColor(daysOverdue);
                
                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-gray-900">{item.item_id}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityClass}`}>
                          {daysOverdue} days overdue
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {activeTab === 'china' ? (
                          <button
                            onClick={() => handleStatusUpdate(item.id, 'READY_FOR_SHIPPING', activeTab)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Mark Ready
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusUpdate(item.id, 'READY_FOR_DELIVERY', activeTab)}
                            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Mark Ready
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'FLAGGED', activeTab)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Flag
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Shipping Mark:</span> {item.shipping_mark}
                      </div>
                      <div>
                        <span className="font-medium">CBM:</span> {item.cbm}
                      </div>
                      <div>
                        <span className="font-medium">Location:</span> {item.location}
                      </div>
                      <div>
                        <span className="font-medium">Received:</span> {new Date(item.date_received).toLocaleDateString()}
                      </div>
                    </div>
                    {item.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {item.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {!loading && currentGoods.length === 0 && !error && (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No overdue items
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  All items are being processed within the {overdueThreshold}-day threshold.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OverdueItems;

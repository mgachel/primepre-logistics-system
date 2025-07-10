import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Download, Upload } from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatsDashboard from '../components/dashboard/StatsDashboard';
import SearchAndFilter from '../components/dashboard/SearchAndFilter';
import GoodsTable from '../components/dashboard/GoodsTable';
import ExcelOperations from '../components/dashboard/ExcelOperations';
import AddItemModal from '../components/dashboard/AddItemModal';
import goodsService from '../services/goodsService';
import authService from '../services/authService';

const GhanaWarehouse = () => {
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [showExcelOps, setShowExcelOps] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  const loadGoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await goodsService.getGhanaGoods(filters);
      // Ensure we always set an array
      const goodsData = Array.isArray(response) ? response : 
                       (response.items || response.results || []);
      setGoods(goodsData);
    } catch (err) {
      setError(err.message);
      setGoods([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadGoods();
  }, [loadGoods, refreshKey]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await goodsService.updateGhanaGoodsStatus(id, status);
      await loadGoods();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleBulkStatusUpdate = async (ids, status) => {
    try {
      await goodsService.bulkUpdateGhanaStatus(ids, status);
      await loadGoods();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleEdit = (item) => {
    // TODO: Implement edit functionality
    console.log('Edit item:', item);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await goodsService.deleteGhanaGoods(id);
        await loadGoods();
      } catch (err) {
        alert(`Failed to delete item: ${err.message}`);
      }
    }
  };

  const handleUploadSuccess = () => {
    loadGoods();
  };

  const handleAddItem = async (itemData) => {
    try {
      setAddingItem(true);
      
      // For manual item addition, don't include customer to avoid shipping mark validation
      // Users should be able to add items with any shipping mark manually
      const dataWithoutCustomer = {
        ...itemData,
        customer: null  // Set to null to bypass customer shipping mark validation
      };
      
      await goodsService.createGhanaGoods(dataWithoutCustomer);
      setShowAddModal(false);
      await loadGoods();
    } catch (err) {
      alert(`Failed to add item: ${err.message}`);
    } finally {
      setAddingItem(false);
    }
  };

  return (
    <DashboardLayout title="Ghana Warehouse">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ghana Warehouse Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Track and manage goods received in Ghana warehouses
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
              onClick={() => setShowExcelOps(!showExcelOps)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200"
            >
              {showExcelOps ? <Upload className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {showExcelOps ? 'Hide' : 'Show'} Excel Operations
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Item
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <StatsDashboard warehouse="ghana" />

        {/* Excel Operations */}
        {showExcelOps && (
          <ExcelOperations 
            warehouse="ghana" 
            onUploadSuccess={handleUploadSuccess}
          />
        )}

        {/* Search and Filters */}
        <SearchAndFilter 
          warehouse="ghana"
          onFiltersChange={handleFiltersChange}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">
              Error: {error}
            </div>
          </div>
        )}

        {/* Goods Table */}
        <GoodsTable
          goods={goods}
          loading={loading}
          warehouse="ghana"
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusUpdate={handleStatusUpdate}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          showSelection={true}
        />

        {/* Empty State */}
        {!loading && Array.isArray(goods) && goods.length === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No goods found
              </h3>
              <p className="text-gray-500 mb-6">
                Get started by adding goods to your Ghana warehouse or adjust your search filters.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowExcelOps(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manually
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddItem}
        warehouse="ghana"
        loading={addingItem}
      />
    </DashboardLayout>
  );
};

export default GhanaWarehouse;

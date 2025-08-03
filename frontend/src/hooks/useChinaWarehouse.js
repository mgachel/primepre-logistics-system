import { useState, useEffect, useCallback } from 'react';
import { chinaWarehouseService } from '../services/chinaWarehouseService';

export const useChinaWarehouse = (userRole = 'customer') => {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // Keep original data for local filtering
  const [statistics, setStatistics] = useState({
    received: 0,
    shipped: 0,
    flagged: 0,
    pending: 0,
    ready_for_shipping: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which API endpoints to use based on user role
  const isStaffUser = userRole === 'staff' || userRole === 'admin';

  const fetchData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to access warehouse data');
        setLoading(false);
        return;
      }

      const itemsPromise = isStaffUser 
        ? chinaWarehouseService.getAllItems(params)
        : chinaWarehouseService.getCustomerItems(params);

      const statsPromise = isStaffUser
        ? chinaWarehouseService.getStatistics()
        : chinaWarehouseService.getCustomerStatistics();

      const [itemsResponse, statsResponse] = await Promise.all([
        itemsPromise,
        statsPromise
      ]);

      const items = itemsResponse.results || itemsResponse;
      setData(items);
      setOriginalData(items); // Keep a copy for local filtering
      
      // Map backend statistics to frontend format
      if (statsResponse) {
        setStatistics({
          received: statsResponse.pending || statsResponse.received || 0,
          shipped: statsResponse.shipped || 0,
          flagged: statsResponse.flagged || 0,
          pending: statsResponse.pending || 0,
          ready_for_shipping: statsResponse.ready_for_shipping || 0,
          total: statsResponse.total || 0
        });
      }
    } catch (err) {
      console.error('Error fetching China warehouse data:', err);
      
      // Handle authentication errors specifically
      if (err.message.includes('Authentication credentials') || err.message.includes('401')) {
        setError('Authentication required. Please log in to access warehouse data.');
      } else {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  }, [isStaffUser]);

  const createItem = useCallback(async (itemData) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can create items');
    }

    try {
      const newItem = await chinaWarehouseService.createItem(itemData);
      setData(prevData => [newItem, ...prevData]);
      
      // Refresh statistics
      const stats = await chinaWarehouseService.getStatistics();
      setStatistics({
        received: stats.pending || stats.received || 0,
        shipped: stats.shipped || 0,
        flagged: stats.flagged || 0,
        pending: stats.pending || 0,
        ready_for_shipping: stats.ready_for_shipping || 0,
        total: stats.total || 0
      });
      
      return newItem;
    } catch (err) {
      console.error('Error creating item:', err);
      throw err;
    }
  }, [isStaffUser]);

  const updateItem = useCallback(async (id, itemData) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can update items');
    }

    try {
      const updatedItem = await chinaWarehouseService.updateItem(id, itemData);
      setData(prevData => 
        prevData.map(item => 
          item.id === id ? { ...item, ...updatedItem } : item
        )
      );
      return updatedItem;
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  }, [isStaffUser]);

  const deleteItem = useCallback(async (id) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can delete items');
    }

    try {
      await chinaWarehouseService.deleteItem(id);
      setData(prevData => prevData.filter(item => item.id !== id));
      
      // Refresh statistics
      const stats = await chinaWarehouseService.getStatistics();
      setStatistics({
        received: stats.pending || stats.received || 0,
        shipped: stats.shipped || 0,
        flagged: stats.flagged || 0,
        pending: stats.pending || 0,
        ready_for_shipping: stats.ready_for_shipping || 0,
        total: stats.total || 0
      });
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  }, [isStaffUser]);

  const updateStatus = useCallback(async (id, status, notes = '') => {
    if (!isStaffUser) {
      throw new Error('Only staff members can update status');
    }

    try {
      const updatedItem = await chinaWarehouseService.updateStatus(id, status, notes);
      setData(prevData => 
        prevData.map(item => 
          item.id === id ? { ...item, status, ...updatedItem } : item
        )
      );
      
      // Refresh statistics
      const stats = await chinaWarehouseService.getStatistics();
      setStatistics({
        received: stats.pending || stats.received || 0,
        shipped: stats.shipped || 0,
        flagged: stats.flagged || 0,
        pending: stats.pending || 0,
        ready_for_shipping: stats.ready_for_shipping || 0,
        total: stats.total || 0
      });
      
      return updatedItem;
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, [isStaffUser]);

  // Local search function (instant filtering)
  const searchItems = useCallback((searchQuery) => {
    setSearchQuery(searchQuery);
    
    if (!searchQuery || searchQuery.trim() === '') {
      // If search is empty, show all data
      setData(originalData);
      return;
    }

    // Local filtering for instant response
    const query = searchQuery.toLowerCase();
    const filteredData = originalData.filter(item => {
      return (
        (item.supply_tracking && item.supply_tracking.toLowerCase().includes(query)) ||
        (item.item_id && item.item_id.toLowerCase().includes(query)) ||
        (item.shipping_mark && item.shipping_mark.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.status && item.status.toLowerCase().includes(query)) ||
        (item.created_by?.full_name && item.created_by.full_name.toLowerCase().includes(query)) ||
        (item.created_by?.username && item.created_by.username.toLowerCase().includes(query))
      );
    });

    setData(filteredData);
  }, [originalData]);

  // Server-side search function (for more complex searches if needed)
  const searchItemsOnServer = useCallback(async (searchQuery) => {
    try {
      setLoading(true);
      const params = { search: searchQuery };
      
      const response = isStaffUser 
        ? await chinaWarehouseService.getAllItems(params)
        : await chinaWarehouseService.getCustomerItems(params);
      
      const items = response.results || response;
      setData(items);
      setOriginalData(items); // Update original data with search results
    } catch (err) {
      console.error('Error searching items:', err);
      setError(err.message || 'Failed to search items');
    } finally {
      setLoading(false);
    }
  }, [isStaffUser]);

  // Reset search and show all data
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setData(originalData);
  }, [originalData]);

  const sortItems = useCallback(async (ordering) => {
    try {
      setLoading(true);
      const params = { ordering };
      
      const response = isStaffUser 
        ? await chinaWarehouseService.getAllItems(params)
        : await chinaWarehouseService.getCustomerItems(params);
      
      setData(response.results || response);
    } catch (err) {
      console.error('Error sorting items:', err);
      setError(err.message || 'Failed to sort items');
    } finally {
      setLoading(false);
    }
  }, [isStaffUser]);

  const trackItem = useCallback(async (trackingId) => {
    try {
      return await chinaWarehouseService.trackBySupplyTracking(trackingId);
    } catch (err) {
      console.error('Error tracking item:', err);
      throw err;
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    statistics,
    loading,
    error,
    searchQuery,
    fetchData,
    createItem,
    updateItem,
    deleteItem,
    updateStatus,
    searchItems,
    searchItemsOnServer,
    clearSearch,
    sortItems,
    trackItem,
    isStaffUser
  };
};

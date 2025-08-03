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

  // Function to calculate real-time statistics from actual data
  const calculateStatistics = useCallback((items) => {
    const stats = {
      received: 0,    // Items that have been received (pending + ready + others, excluding shipped/flagged)
      shipped: 0,     // Items that have been shipped out
      flagged: 0,     // Items that have issues/problems
      pending: 0,     // Items waiting for processing
      ready_for_shipping: 0,  // Items ready to be shipped
      total: items.length
    };

    items.forEach(item => {
      const status = item.status?.toLowerCase();
      
      switch (status) {
        case 'pending':
          stats.pending++;
          stats.received++; // Pending items are considered received in warehouse
          break;
        case 'ready_for_shipping':
        case 'ready for shipping':
          stats.ready_for_shipping++;
          stats.received++; // Ready items are also received in warehouse
          break;
        case 'shipped':
          stats.shipped++;
          // Shipped items are not counted as "received" since they've left
          break;
        case 'flagged':
          stats.flagged++;
          // Flagged items are not counted as "received" due to issues
          break;
        default:
          // For any other status (cancelled, etc.), consider it as received
          stats.received++;
      }
    });

    return stats;
  }, []);

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

      // We'll calculate statistics from the actual items data instead of a separate API call
      const itemsResponse = await itemsPromise;

      const items = itemsResponse.results || itemsResponse;
      setData(items);
      setOriginalData(items); // Keep a copy for local filtering
      
      // Calculate real-time statistics from actual data
      const calculatedStats = calculateStatistics(items);
      setStatistics(calculatedStats);
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
  }, [isStaffUser, calculateStatistics]);

  const createItem = useCallback(async (itemData) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can create items');
    }

    try {
      const newItem = await chinaWarehouseService.createItem(itemData);
      const updatedData = [newItem, ...data];
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with new data
      setStatistics(calculateStatistics(updatedData));
      
      return newItem;
    } catch (err) {
      console.error('Error creating item:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const updateItem = useCallback(async (id, itemData) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can update items');
    }

    try {
      const updatedItem = await chinaWarehouseService.updateItem(id, itemData);
      const updatedData = data.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      );
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with updated data
      setStatistics(calculateStatistics(updatedData));
      
      return updatedItem;
    } catch (err) {
      console.error('Error updating item:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const deleteItem = useCallback(async (id) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can delete items');
    }

    try {
      await chinaWarehouseService.deleteItem(id);
      const updatedData = data.filter(item => item.id !== id);
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with updated data
      setStatistics(calculateStatistics(updatedData));
    } catch (err) {
      console.error('Error deleting item:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const updateStatus = useCallback(async (id, status, notes = '') => {
    if (!isStaffUser) {
      throw new Error('Only staff members can update status');
    }

    try {
      const updatedItem = await chinaWarehouseService.updateStatus(id, status, notes);
      const updatedData = data.map(item => 
        item.id === id ? { ...item, status, ...updatedItem } : item
      );
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with updated data
      setStatistics(calculateStatistics(updatedData));
      
      return updatedItem;
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  // Local search function (instant filtering)
  const searchItems = useCallback((searchQuery) => {
    setSearchQuery(searchQuery);
    
    if (!searchQuery || searchQuery.trim() === '') {
      // If search is empty, show all data and recalculate full statistics
      setData(originalData);
      setStatistics(calculateStatistics(originalData));
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
    // Update statistics to reflect only the filtered data
    setStatistics(calculateStatistics(filteredData));
  }, [originalData, calculateStatistics]);

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

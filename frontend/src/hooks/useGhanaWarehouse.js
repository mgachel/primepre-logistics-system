import { useState, useEffect, useCallback } from 'react';
import { ghanaWarehouseService } from '../services/ghanaWarehouseService';

export const useGhanaWarehouse = (userRole = 'customer') => {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // Keep original data for local filtering
  const [statistics, setStatistics] = useState({
    received: 0,
    pending: 0,
    ready_for_delivery: 0,
    delivered: 0,
    flagged: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading warehouse data...');
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which API endpoints to use based on user role
  const isStaffUser = userRole === 'staff' || userRole === 'admin';

  // Function to calculate real-time statistics from actual data
  const calculateStatistics = useCallback((items) => {
    const stats = {
      received: 0,    // Items that have been received (pending + ready + others, excluding delivered/flagged)
      pending: 0,     // Items waiting for processing
      ready_for_delivery: 0,  // Items ready to be delivered
      delivered: 0,   // Items that have been delivered
      flagged: 0,     // Items that have issues/problems
      total: items.length
    };

    items.forEach(item => {
      const status = item.status?.toLowerCase();
      
      switch (status) {
        case 'pending':
          stats.pending++;
          stats.received++; // Pending items are considered received in warehouse
          break;
        case 'ready_for_delivery':
        case 'ready for delivery':
        case 'ready_for_shipping':
        case 'ready for shipping':
          stats.ready_for_delivery++;
          stats.received++; // Ready items are also received in warehouse
          break;
        case 'delivered':
          stats.delivered++;
          // Delivered items are not counted as "received" since they've left
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
      setLoadingMessage('Loading warehouse data...');
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Please log in to access warehouse data');
        setLoading(false);
        return;
      }

      // Fetch all pages to get complete data
      let allItems = [];
      let nextPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        // Update loading message to show progress
        if (nextPage > 1) {
          setLoadingMessage(`Loading page ${nextPage}... (${allItems.length} items loaded)`);
        }

        const pageParams = { ...params, page: nextPage };
        
        const itemsPromise = isStaffUser 
          ? ghanaWarehouseService.getAllItems(pageParams)
          : ghanaWarehouseService.getCustomerItems(pageParams);

        const itemsResponse = await itemsPromise;

        // Handle both paginated and non-paginated responses
        if (itemsResponse.results) {
          // Paginated response
          allItems = [...allItems, ...itemsResponse.results];
          hasMorePages = !!itemsResponse.next;
          nextPage++;
        } else {
          // Non-paginated response (for older API versions)
          allItems = itemsResponse;
          hasMorePages = false;
        }

        // Safety break to prevent infinite loops
        if (nextPage > 50) {
          console.warn('Too many pages, stopping at 50 pages');
          break;
        }
      }

      console.log(`Fetched ${allItems.length} total items from ${nextPage - 1} pages`);
      
      setData(allItems);
      setOriginalData(allItems); // Keep a copy for local filtering
      
      // Calculate real-time statistics from ALL data
      const calculatedStats = calculateStatistics(allItems);
      setStatistics(calculatedStats);
    } catch (err) {
      console.error('Error fetching Ghana warehouse data:', err);
      
      // Handle authentication errors specifically
      if (err.message.includes('Authentication credentials') || err.message.includes('401')) {
        setError('Authentication required. Please log in to access warehouse data.');
      } else {
        setError(err.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
      setLoadingMessage('Loading warehouse data...');
    }
  }, [isStaffUser, calculateStatistics]);

  const createItem = useCallback(async (itemData) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can create items');
    }

    try {
      const newItem = await ghanaWarehouseService.createItem(itemData);
      const updatedData = [newItem, ...data];
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with new data
      setStatistics(calculateStatistics(updatedData));
      return newItem;
    } catch (err) {
      console.error('Error creating Ghana warehouse item:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const updateItem = useCallback(async (id, itemData) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can update items');
    }

    try {
      const updatedItem = await ghanaWarehouseService.updateItem(id, itemData);
      const updatedData = data.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      );
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with updated data
      setStatistics(calculateStatistics(updatedData));
      return updatedItem;
    } catch (err) {
      console.error('Error updating Ghana warehouse item:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const deleteItem = useCallback(async (id) => {
    if (!isStaffUser) {
      throw new Error('Only staff members can delete items');
    }

    try {
      await ghanaWarehouseService.deleteItem(id);
      const updatedData = data.filter(item => item.id !== id);
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with updated data
      setStatistics(calculateStatistics(updatedData));
      return { success: true };
    } catch (err) {
      console.error('Error deleting Ghana warehouse item:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const updateStatus = useCallback(async (id, status, notes = '') => {
    if (!isStaffUser) {
      throw new Error('Only staff members can update status');
    }

    try {
      const result = await ghanaWarehouseService.updateStatus(id, status, notes);
      const updatedData = data.map(item => 
        item.id === id ? { ...item, status: status.toLowerCase() } : item
      );
      setData(updatedData);
      setOriginalData(updatedData);
      
      // Recalculate statistics with updated data
      setStatistics(calculateStatistics(updatedData));
      return result;
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, [isStaffUser, data, calculateStatistics]);

  const searchItems = useCallback((query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      // If search is empty, reset to original data
      setData(originalData);
      return;
    }

    // Filter data based on search query
    const filteredData = originalData.filter(item => {
      const searchFields = [
        item.supply_tracking,
        item.item_id,
        item.shipping_mark,
        item.description,
        item.status,
        item.created_by?.full_name || item.created_by?.username
      ];
      
      return searchFields.some(field => 
        field && field.toString().toLowerCase().includes(query.toLowerCase())
      );
    });

    setData(filteredData);
  }, [originalData]);

  const searchItemsOnServer = useCallback(async (query) => {
    try {
      setLoading(true);
      const params = { search: query };
      await fetchData(params);
    } catch (err) {
      console.error('Error searching items on server:', err);
      setError(err.message || 'Failed to search items');
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setData(originalData);
  }, [originalData]);

  const sortItems = useCallback(async (ordering) => {
    try {
      setLoading(true);
      const params = { ordering };
      
      const response = isStaffUser 
        ? await ghanaWarehouseService.getAllItems(params)
        : await ghanaWarehouseService.getCustomerItems(params);
      
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
      return await ghanaWarehouseService.trackBySupplyTracking(trackingId);
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
    loadingMessage,
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

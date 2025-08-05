import { useState, useEffect, useCallback } from 'react';
import { seaCargoService } from '../services/seaCargoService';

export const useSeaCargo = (userRole = 'customer') => {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]); // Keep original data for local filtering
  const [statistics, setStatistics] = useState({
    total_shipments: 0,
    in_transit: 0,
    delivered: 0,
    pending: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading sea cargo data...');
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Determine which API endpoints to use based on user role
  const isStaffUser = userRole === 'staff' || userRole === 'admin';

  // Function to calculate real-time statistics from actual data
  const calculateStatistics = useCallback((items) => {
    const stats = {
      total_shipments: items.length,
      in_transit: 0,
      delivered: 0,
      pending: 0,
      total: items.length
    };

    items.forEach(item => {
      const status = item.status?.toLowerCase();
      
      switch (status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_transit':
          stats.in_transit++;
          break;
        case 'delivered':
          stats.delivered++;
          break;
        default:
          // Handle any other statuses as pending
          stats.pending++;
          break;
      }
    });

    return stats;
  }, []);

  // Function to fetch data based on user role
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      if (isStaffUser) {
        setLoadingMessage('Loading sea cargo containers for staff...');
        // Staff/admin sees all containers
        result = await seaCargoService.getAllContainers();
      } else {
        setLoadingMessage('Loading your sea cargo items...');
        // Customers see their cargo items
        result = await seaCargoService.getCustomerItems();
      }

      // Handle different response structures
      const items = Array.isArray(result) ? result : result.results || [];
      
      setData(items);
      setOriginalData(items);
      
      // Calculate statistics from the fetched data
      const calculatedStats = calculateStatistics(items);
      setStatistics(calculatedStats);

    } catch (err) {
      console.error('Error fetching sea cargo data:', err);
      setError(err.message || 'Failed to load sea cargo data');
      setData([]);
      setOriginalData([]);
    } finally {
      setLoading(false);
    }
  }, [isStaffUser, calculateStatistics]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search functionality - searches locally in loaded data
  const searchItems = useCallback((query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setData(originalData);
      return;
    }

    const filteredData = originalData.filter(item => {
      const searchableFields = [
        item.container_id,
        item.route,
        item.status,
        // For cargo items
        item.tracking_id,
        item.item_description,
        item.client?.shipping_mark,
        item.client?.company_name,
        // For containers
        item.total_cargo_items?.toString(),
        item.total_clients?.toString(),
      ].filter(Boolean);

      return searchableFields.some(field => 
        field.toString().toLowerCase().includes(query.toLowerCase())
      );
    });

    setData(filteredData);
  }, [originalData]);

  // Sort functionality
  const sortItems = useCallback(async (sortBy, order = 'asc') => {
    try {
      setLoading(true);
      setLoadingMessage('Sorting sea cargo data...');

      // For API-based sorting, re-fetch with ordering parameter
      const orderingValue = order === 'desc' ? `-${sortBy}` : sortBy;
      
      let result;
      if (isStaffUser) {
        result = await seaCargoService.getAllContainers({ ordering: orderingValue });
      } else {
        result = await seaCargoService.getCustomerItems({ ordering: orderingValue });
      }

      const items = Array.isArray(result) ? result : result.results || [];
      setData(items);
      setOriginalData(items);

    } catch (err) {
      console.error('Error sorting sea cargo data:', err);
      // Fallback to local sorting if API sorting fails
      const sortedData = [...data].sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';
        
        if (order === 'desc') {
          return bValue.toString().localeCompare(aValue.toString());
        }
        return aValue.toString().localeCompare(bValue.toString());
      });
      
      setData(sortedData);
    } finally {
      setLoading(false);
    }
  }, [data, isStaffUser]);

  // Filter by status
  const filterByStatus = useCallback((status) => {
    if (!status || status === 'all') {
      setData(originalData);
      return;
    }

    const filteredData = originalData.filter(item => 
      item.status?.toLowerCase() === status.toLowerCase()
    );
    setData(filteredData);
  }, [originalData]);

  // Refresh data
  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Get statistics - real-time calculation from current data
  const getCurrentStatistics = useCallback(() => {
    return calculateStatistics(data);
  }, [data, calculateStatistics]);

  return {
    // Data
    data,
    originalData,
    statistics,
    
    // State
    loading,
    loadingMessage,
    error,
    searchQuery,
    
    // Functions
    searchItems,
    sortItems,
    filterByStatus,
    refreshData,
    getCurrentStatistics,
    
    // Utilities
    isStaffUser,
    userRole
  };
};

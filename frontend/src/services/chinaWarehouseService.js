// API service for China warehouse operations

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export const chinaWarehouseService = {
  // Get all China warehouse items (admin/staff)
  getAllItems: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    // Add filtering parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const url = `/api/goods/china/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    try {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching China warehouse items:', error);
      throw error;
    }
  },

  // Get customer's China warehouse items only
  getCustomerItems: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const url = `/api/customer/goods/china/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    try {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer China warehouse items:', error);
      throw error;
    }
  },

  // Get statistics for China warehouse (admin/staff)
  getStatistics: async () => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/statistics/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching China warehouse statistics:', error);
      throw error;
    }
  },

  // Get customer's statistics for China warehouse
  getCustomerStatistics: async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/china/my_statistics/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer China warehouse statistics:', error);
      throw error;
    }
  },

  // Create new China warehouse item (admin/staff)
  createItem: async (itemData) => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error creating China warehouse item:', error);
      throw error;
    }
  },

  // Update item (admin/staff)
  updateItem: async (id, itemData) => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating China warehouse item:', error);
      throw error;
    }
  },

  // Delete item (admin/staff)
  deleteItem: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting China warehouse item:', error);
      throw error;
    }
  },

  // Update status of specific item (admin/staff)
  updateStatus: async (id, status, notes = '') => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/${id}/update_status/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, notes })
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating item status:', error);
      throw error;
    }
  },

  // Get flagged items (admin/staff)
  getFlaggedItems: async () => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/flagged_items/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching flagged items:', error);
      throw error;
    }
  },

  // Get customer's flagged items
  getCustomerFlaggedItems: async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/china/my_flagged_items/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer flagged items:', error);
      throw error;
    }
  },

  // Get ready for shipping items (admin/staff)
  getReadyForShippingItems: async () => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/ready_for_shipping/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching ready for shipping items:', error);
      throw error;
    }
  },

  // Get customer's ready for shipping items
  getCustomerReadyForShippingItems: async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/china/ready_for_shipping/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer ready for shipping items:', error);
      throw error;
    }
  },

  // Bulk status update (admin/staff)
  bulkStatusUpdate: async (itemIds, status, notes = '') => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/bulk_status_update/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ item_ids: itemIds, status, notes })
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error bulk updating status:', error);
      throw error;
    }
  },

  // Upload Excel file for bulk create (admin/staff)
  uploadExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/goods/china/upload_excel/`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error uploading Excel file:', error);
      throw error;
    }
  },

  // Download Excel template (admin/staff)
  downloadTemplate: async () => {
    try {
      const response = await fetch(`${API_URL}/api/goods/china/download_template/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'china_warehouse_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      throw error;
    }
  },

  // Track item by supply tracking ID (customer)
  trackBySupplyTracking: async (trackingId) => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/china/tracking/${trackingId}/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error tracking item:', error);
      throw error;
    }
  }
};

export default chinaWarehouseService;

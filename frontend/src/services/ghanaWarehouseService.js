// API service for Ghana warehouse operations

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

export const ghanaWarehouseService = {
  // Get all Ghana warehouse items (admin/staff)
  getAllItems: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    // Add filtering parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const url = `/api/goods/ghana/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    try {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching Ghana warehouse items:', error);
      throw error;
    }
  },

  // Get customer's Ghana warehouse items only
  getCustomerItems: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });

    const url = `/api/customer/goods/ghana/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    try {
      const response = await fetch(`${API_URL}${url}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer Ghana warehouse items:', error);
      throw error;
    }
  },

  // Get statistics for Ghana warehouse (admin/staff)
  getStatistics: async () => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/statistics/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching Ghana warehouse statistics:', error);
      throw error;
    }
  },

  // Get customer's statistics for Ghana warehouse
  getCustomerStatistics: async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/ghana/my_statistics/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer Ghana warehouse statistics:', error);
      throw error;
    }
  },

  // Track specific item by supply tracking ID
  trackBySupplyTracking: async (trackingId) => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/ghana/tracking/?tracking_id=${trackingId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error tracking Ghana warehouse item:', error);
      throw error;
    }
  },

  // Create new Ghana warehouse item (admin/staff)
  createItem: async (itemData) => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error creating Ghana warehouse item:', error);
      throw error;
    }
  },

  // Update item (admin/staff)
  updateItem: async (id, itemData) => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/${id}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(itemData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating Ghana warehouse item:', error);
      throw error;
    }
  },

  // Delete item (admin/staff)
  deleteItem: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting Ghana warehouse item:', error);
      throw error;
    }
  },

  // Update status of specific item (admin/staff)
  updateStatus: async (id, status, notes = '') => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/${id}/update_status/`, {
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
      const response = await fetch(`${API_URL}/api/goods/ghana/flagged_items/`, {
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
      const response = await fetch(`${API_URL}/api/customer/goods/ghana/my_flagged_items/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer flagged items:', error);
      throw error;
    }
  },

  // Get ready for delivery items (admin/staff)
  getReadyForDeliveryItems: async () => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/ready_for_shipping/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching ready for delivery items:', error);
      throw error;
    }
  },

  // Get customer's ready for delivery items
  getCustomerReadyForDeliveryItems: async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer/goods/ghana/ready_for_shipping/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer ready for delivery items:', error);
      throw error;
    }
  },

  // Bulk status update (admin/staff)
  bulkStatusUpdate: async (itemIds, status, notes = '') => {
    try {
      const response = await fetch(`${API_URL}/api/goods/ghana/bulk_status_update/`, {
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
    formData.append('warehouse', 'ghana'); // Required by the backend serializer

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/goods/ghana/upload_excel/`, {
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/goods/ghana/download_template/`, {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Return the blob for download
      return await response.blob();
    } catch (error) {
      console.error('Error downloading Ghana warehouse template:', error);
      throw error;
    }
  }
};

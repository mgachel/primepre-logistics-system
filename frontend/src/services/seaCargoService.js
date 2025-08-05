// API service for Sea Cargo operations

import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
    throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

export const seaCargoService = {
  // Get dashboard statistics for sea cargo
  getDashboardStats: async () => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/dashboard/?cargo_type=sea`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching sea cargo dashboard stats:', error);
      throw error;
    }
  },

  // Get all sea cargo containers (admin/staff)
  getAllContainers: async (params = {}) => {
    const queryParams = new URLSearchParams({
      cargo_type: 'sea',
      ...params
    });
    
    // Add filtering parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.set(key, value);
      }
    });

    const url = `/api/cargo/api/containers/?${queryParams.toString()}`;
    
    try {
      const response = await authService.authenticatedFetch(`${API_URL}${url}`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching sea cargo containers:', error);
      throw error;
    }
  },

  // Get customer's sea cargo items only
  getCustomerItems: async (params = {}) => {
    const queryParams = new URLSearchParams({
      cargo_type: 'sea',
      ...params
    });

    const url = `/api/cargo/api/cargo-items/?${queryParams.toString()}`;
    
    try {
      const response = await authService.authenticatedFetch(`${API_URL}${url}`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching customer sea cargo items:', error);
      throw error;
    }
  },

  // Get sea cargo containers for staff (with role-based filtering)
  getStaffContainers: async (params = {}) => {
    const queryParams = new URLSearchParams({
      cargo_type: 'sea',
      ...params
    });

    const url = `/api/cargo/api/containers/?${queryParams.toString()}`;
    
    try {
      const response = await authService.authenticatedFetch(`${API_URL}${url}`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching staff sea cargo containers:', error);
      throw error;
    }
  },

  // Create new sea cargo container
  createContainer: async (containerData) => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/containers/`, {
        method: 'POST',
        body: JSON.stringify({
          ...containerData,
          cargo_type: 'sea'
        })
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error creating sea cargo container:', error);
      throw error;
    }
  },

  // Update container status
  updateContainerStatus: async (containerId, status, notes = '') => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/containers/${containerId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: status,
          ...(notes && { notes: notes })
        })
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating container status:', error);
      throw error;
    }
  },

  // Update container details
  updateContainer: async (containerId, updateData) => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/containers/${containerId}/`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating container:', error);
      throw error;
    }
  },

  // Delete container
  deleteContainer: async (containerId) => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/containers/${containerId}/`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.detail || errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting container:', error);
      throw error;
    }
  },

  // Get container details
  getContainerDetails: async (containerId) => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/containers/${containerId}/`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching container details:', error);
      throw error;
    }
  },

  // Get client summaries for a container
  getClientSummaries: async (containerId) => {
    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/containers/${containerId}/client_summaries/`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching client summaries:', error);
      throw error;
    }
  },

  // Get cargo items for a container
  getCargoItems: async (containerId, shippingMark = null) => {
    const params = new URLSearchParams({ container_id: containerId });
    if (shippingMark) {
      params.append('shipping_mark', shippingMark);
    }

    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/cargo-items/?${params.toString()}`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching cargo items:', error);
      throw error;
    }
  },

  // Bulk upload cargo items
  bulkUploadItems: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authService.authenticatedFetch(`${API_URL}/api/cargo/api/bulk-upload/`, {
        method: 'POST',
        body: formData
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('Error uploading cargo items:', error);
      throw error;
    }
  }
};

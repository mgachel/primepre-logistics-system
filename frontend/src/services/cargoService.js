// Cargo service for handling API calls to the cargo backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Use env variable or fallback to localhost

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('accessToken'); // Changed from 'token' to 'accessToken'
  return token ? `Bearer ${token}` : null;
};

// Helper function for API requests with authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders.Authorization = token;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
    console.error('API Error:', response.status, errorData);
    throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData) || 'API request failed');
  }

  // Handle empty responses (like 204 No Content for DELETE operations)
  const contentType = response.headers.get('content-type');
  if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
    return {}; // Return empty object for successful operations with no content
  }

  return response.json();
};

export const cargoService = {
  // Container Management
  getContainers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/api/cargo/api/containers/${queryParams ? `?${queryParams}` : ''}`;
    return apiRequest(endpoint);
  },

  getContainer: async (containerId) => {
    return apiRequest(`/api/cargo/api/containers/${containerId}/`);
  },

  createContainer: async (containerData) => {
    return apiRequest('/api/cargo/api/containers/', {
      method: 'POST',
      body: JSON.stringify(containerData),
    });
  },

  updateContainer: async (containerId, containerData) => {
    return apiRequest(`/api/cargo/api/containers/${containerId}/`, {
      method: 'PUT',
      body: JSON.stringify(containerData),
    });
  },

  deleteContainer: async (containerId) => {
    await apiRequest(`/api/cargo/api/containers/${containerId}/`, {
      method: 'DELETE',
    });
    return { success: true }; // Return a success indicator
  },

  // Cargo Items Management
  getCargoItems: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/api/cargo/api/cargo-items/${queryParams ? `?${queryParams}` : ''}`;
    return apiRequest(endpoint);
  },

  getCargoItem: async (itemId) => {
    return apiRequest(`/api/cargo/api/cargo-items/${itemId}/`);
  },

  createCargoItem: async (itemData) => {
    return apiRequest('/api/cargo/api/cargo-items/', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  updateCargoItem: async (itemId, itemData) => {
    return apiRequest(`/api/cargo/api/cargo-items/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  deleteCargoItem: async (itemId) => {
    await apiRequest(`/api/cargo/api/cargo-items/${itemId}/`, {
      method: 'DELETE',
    });
    return { success: true }; // Return a success indicator
  },

  // Client Shipment Summaries
  getClientSummaries: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/api/cargo/api/client-summaries/${queryParams ? `?${queryParams}` : ''}`;
    return apiRequest(endpoint);
  },

  getClientSummary: async (summaryId) => {
    return apiRequest(`/api/cargo/api/client-summaries/${summaryId}/`);
  },

  updateClientSummary: async (summaryId, summaryData) => {
    return apiRequest(`/api/cargo/api/client-summaries/${summaryId}/`, {
      method: 'PUT',
      body: JSON.stringify(summaryData),
    });
  },

  // Dashboard and Statistics
  getDashboard: async () => {
    return apiRequest('/api/cargo/api/dashboard/');
  },

  getStatistics: async () => {
    return apiRequest('/api/cargo/api/statistics/');
  },

  // Customers
  getCustomers: async (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/api/cargo/api/customers/${queryParams ? `?${queryParams}` : ''}`;
    return apiRequest(endpoint);
  },

  // Bulk Operations
  bulkUploadCargoItems: async (file, containerId) => {
    const formData = new FormData();
    formData.append('excel_file', file);
    formData.append('container_id', containerId);

    const token = getAuthToken();
    console.log('Bulk upload - Token available:', !!token);
    console.log('Bulk upload - Container ID:', containerId);
    console.log('Bulk upload - File:', file ? file.name : 'No file');
    
    const headers = {};
    if (token) {
      headers.Authorization = token;
    }
    // Note: Don't set Content-Type for FormData, browser will set it automatically with boundary

    const response = await fetch(`${API_URL}/api/cargo/api/bulk-upload/`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      console.error('Bulk upload error:', response.status, errorData);
      throw new Error(errorData.detail || errorData.error || JSON.stringify(errorData) || 'Bulk upload failed');
    }

    return response.json();
  },

  // Filtered data by cargo type
  getSeaContainers: async () => {
    return apiRequest('/api/cargo/api/containers/?cargo_type=sea');
  },

  getAirContainers: async () => {
    return apiRequest('/api/cargo/api/containers/?cargo_type=air');
  },

  // Get containers by status
  getDemurrageContainers: async () => {
    return apiRequest('/api/cargo/api/containers/?status=demurrage');
  },

  getInTransitContainers: async () => {
    return apiRequest('/api/cargo/api/containers/?status=in_transit');
  },

  getDeliveredContainers: async () => {
    return apiRequest('/api/cargo/api/containers/?status=delivered');
  },

  getPendingContainers: async () => {
    return apiRequest('/api/cargo/api/containers/?status=pending');
  },
};

export default cargoService;

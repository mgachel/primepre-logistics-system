// Customers service for handling API calls to the backend
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const customersService = {
  // Get all customers with optional filtering
  getCustomers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add search parameter
      if (params.search) {
        queryParams.append('search', params.search);
      }
      
      // Add ordering parameter
      if (params.ordering) {
        queryParams.append('ordering', params.ordering);
      }

      // Add role filter to get only customers
      queryParams.append('user_role', 'CUSTOMER');

      const url = `${API_URL}/api/auth/admin/users/?${queryParams.toString()}`;
      
      const response = await authService.authenticatedFetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch customers');
      }

      const data = await response.json();
      
      // Handle both paginated and non-paginated responses
      if (Array.isArray(data)) {
        // Non-paginated response
        const customers = data.filter(user => user.user_role === 'CUSTOMER');
        
        // Apply client-side pagination if needed
        const startIndex = ((params.page || 1) - 1) * (params.page_size || 10);
        const endIndex = startIndex + (params.page_size || 10);
        const paginatedCustomers = customers.slice(startIndex, endIndex);
        
        return {
          results: paginatedCustomers,
          count: customers.length,
          next: endIndex < customers.length ? `page=${(params.page || 1) + 1}` : null,
          previous: startIndex > 0 ? `page=${(params.page || 1) - 1}` : null
        };
      } else {
        // Paginated response
        return data;
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Get customer statistics
  getCustomerStats: async () => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/statistics/`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch customer statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching customer statistics:', error);
      throw error;
    }
  },

  // Get a specific customer by ID
  getCustomer: async (customerId) => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/${customerId}/`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch customer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  },

  // Create a new customer
  createCustomer: async (customerData) => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...customerData,
            user_role: 'CUSTOMER' // Ensure it's a customer
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create customer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  // Update a customer
  updateCustomer: async (customerId, customerData) => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/${customerId}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(customerData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update customer');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  // Delete a customer
  deleteCustomer: async (customerId) => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/${customerId}/`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete customer');
      }

      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  // Toggle customer active status
  toggleCustomerStatus: async (customerId) => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/${customerId}/toggle_active/`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to toggle customer status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling customer status:', error);
      throw error;
    }
  },

  // Reset customer password
  resetCustomerPassword: async (customerId) => {
    try {
      const response = await authService.authenticatedFetch(
        `${API_URL}/api/auth/admin/users/${customerId}/reset_password/`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reset customer password');
      }

      return await response.json();
    } catch (error) {
      console.error('Error resetting customer password:', error);
      throw error;
    }
  }
};

export default customersService;

// Utility functions for authentication and API requests
import authService from '../services/authService';

/**
 * Makes an authenticated API request with automatic token refresh
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - The fetch response
 */
export const authenticatedFetch = async (url, options = {}) => {
  return authService.authenticatedFetch(url, options);
};

/**
 * Gets authentication headers with current token
 * @returns {object} - Headers object with Authorization
 */
export const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Gets authentication headers for file uploads (no Content-Type)
 * @returns {object} - Headers object with Authorization only
 */
export const getAuthHeadersForFile = () => {
  const token = authService.getToken();
  return {
    'Authorization': `Bearer ${token}`
  };
};

/**
 * Handles API response errors consistently
 * @param {Response} response - The fetch response
 * @param {string} defaultMessage - Default error message
 * @throws {Error} - Throws error with appropriate message
 */
export const handleApiError = async (response, defaultMessage) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.message || defaultMessage);
    } catch {
      throw new Error(`${defaultMessage}: ${response.statusText}`);
    }
  }
};

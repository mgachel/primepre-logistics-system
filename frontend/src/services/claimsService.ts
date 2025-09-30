import { apiClient } from './api';

// Types for Claims
export interface Claim {
  id: number;
  tracking_id: string;
  item_name: string;
  item_description: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  shipping_mark: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  days_since_submission: number;
  admin_notes?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
}

export interface AdminClaim extends Claim {
  customer_phone: string;
  customer_email: string;
  customer_region: string;
}

export interface CreateClaimData {
  tracking_id: string;
  item_name: string;
  item_description: string;
  image_1?: File;
  image_2?: File;
  image_3?: File;
}

export interface ClaimStatusUpdate {
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  admin_notes?: string;
}

export interface ClaimsSummary {
  total_claims: number;
  pending_claims: number;
  under_review: number;
  resolved_claims: number;
  rejected_claims: number;
  recent_claims: number;
  status_breakdown: {
    PENDING: number;
    UNDER_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
    RESOLVED: number;
  };
}

export interface PaginatedClaimsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminClaim[];
}

class ClaimsService {
  // Customer endpoints
  async getCustomerClaims(): Promise<{ success: boolean; data: Claim[] }> {
    try {
      console.log('ClaimsService: Making API call to /api/claims/my-claims/');
      const response = await apiClient.get<Claim[]>('/api/claims/my-claims/');
      console.log('ClaimsService: Raw API response:', response);
      console.log('ClaimsService: Response data:', response.data);
      console.log('ClaimsService: Response data type:', typeof response.data);
      console.log('ClaimsService: Is array?', Array.isArray(response.data));
      
      return {
        success: response.success,
        data: response.data || []
      };
    } catch (error) {
      console.error('ClaimsService: Failed to fetch customer claims:', error);
      throw error;
    }
  }

  async createClaim(claimData: CreateClaimData): Promise<{ success: boolean; data: Claim }> {
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('tracking_id', claimData.tracking_id);
      formData.append('item_name', claimData.item_name);
      formData.append('item_description', claimData.item_description);
      
      // Append image files if they exist
      if (claimData.image_1) {
        formData.append('image_1', claimData.image_1);
      }
      if (claimData.image_2) {
        formData.append('image_2', claimData.image_2);
      }
      if (claimData.image_3) {
        formData.append('image_3', claimData.image_3);
      }

      const response = await apiClient.post<Claim>('/api/claims/my-claims/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to create claim:', error);
      throw error;
    }
  }

  async getCustomerClaimDetail(id: number): Promise<{ success: boolean; data: Claim }> {
    try {
      const response = await apiClient.get<Claim>(`/api/claims/my-claims/${id}/`);
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch claim detail:', error);
      throw error;
    }
  }

  async updateClaim(id: number, claimData: CreateClaimData): Promise<{ success: boolean; data: Claim }> {
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append('tracking_id', claimData.tracking_id);
      formData.append('item_name', claimData.item_name);
      formData.append('item_description', claimData.item_description);
      
      // Append image files if they exist
      if (claimData.image_1) {
        formData.append('image_1', claimData.image_1);
      }
      if (claimData.image_2) {
        formData.append('image_2', claimData.image_2);
      }
      if (claimData.image_3) {
        formData.append('image_3', claimData.image_3);
      }

      const response = await apiClient.put<Claim>(`/api/claims/my-claims/${id}/`, formData);
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to update claim:', error);
      throw error;
    }
  }

  async deleteClaim(id: number): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete(`/api/claims/my-claims/${id}/`);
      return {
        success: response.success
      };
    } catch (error) {
      console.error('Failed to delete claim:', error);
      throw error;
    }
  }

  // Admin endpoints
  async getAllClaims(params?: {
    status?: string;
    shipping_mark?: string;
    tracking_id?: string;
    search?: string;
  }): Promise<{ success: boolean; data: AdminClaim[] }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.shipping_mark) queryParams.append('shipping_mark', params.shipping_mark);
      if (params?.tracking_id) queryParams.append('tracking_id', params.tracking_id);
      if (params?.search) queryParams.append('search', params.search);

      const url = `/api/claims/admin/claims/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('ClaimsService: Making admin claims API call to:', url);
      const response = await apiClient.get<AdminClaim[] | PaginatedClaimsResponse>(url);
      console.log('ClaimsService: Admin claims raw response:', response);
      console.log('ClaimsService: Admin claims data:', response.data);
      console.log('ClaimsService: Admin claims data type:', typeof response.data);
      console.log('ClaimsService: Admin claims is array?', Array.isArray(response.data));
      console.log('ClaimsService: Response success flag:', response.success);
      console.log('ClaimsService: Response keys:', Object.keys(response));
      
      // Handle paginated response - check if data has 'results' field
      let claimsData: AdminClaim[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          // Direct array response
          claimsData = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          // Paginated response with results field
          claimsData = response.data.results;
        }
      }
      
      console.log('ClaimsService: Final claims data:', claimsData);
      console.log('ClaimsService: Final claims count:', claimsData.length);
      
      return {
        success: response.success,
        data: claimsData
      };
    } catch (error) {
      console.error('Failed to fetch all claims:', error);
      throw error;
    }
  }

  async getClaimDetail(id: number): Promise<{ success: boolean; data: AdminClaim }> {
    try {
      const response = await apiClient.get<AdminClaim>(`/api/claims/admin/claims/${id}/`);
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch claim detail:', error);
      throw error;
    }
  }

  async updateClaimStatus(id: number, statusData: ClaimStatusUpdate): Promise<{ success: boolean; data: AdminClaim }> {
    try {
      const response = await apiClient.patch<AdminClaim>(`/api/claims/admin/claims/${id}/`, statusData);
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to update claim status:', error);
      throw error;
    }
  }

  async getClaimsSummary(): Promise<{ success: boolean; data: ClaimsSummary }> {
    try {
      const response = await apiClient.get<ClaimsSummary>('/api/claims/admin/claims/summary/');
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch claims summary:', error);
      throw error;
    }
  }

  async getClaimsByShippingMark(shippingMark: string): Promise<{ success: boolean; data: AdminClaim[] }> {
    try {
      const response = await apiClient.get<AdminClaim[]>(`/api/claims/admin/claims/by-shipping-mark/${shippingMark}/`);
      return {
        success: response.success,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch claims by shipping mark:', error);
      throw error;
    }
  }

  // Utility methods
  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pending Review';
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'RESOLVED':
        return 'Resolved';
      default:
        return status;
    }
  }
}

export const claimsService = new ClaimsService();

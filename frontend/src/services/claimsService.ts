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
      const response = await apiClient.post<Claim>('/api/claims/my-claims/', claimData);
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
      const response = await apiClient.get<AdminClaim[]>(url);
      console.log('ClaimsService: Admin claims raw response:', response);
      console.log('ClaimsService: Admin claims data:', response.data);
      console.log('ClaimsService: Admin claims data type:', typeof response.data);
      console.log('ClaimsService: Admin claims is array?', Array.isArray(response.data));
      console.log('ClaimsService: Response success flag:', response.success);
      console.log('ClaimsService: Response keys:', Object.keys(response));
      
      return {
        success: response.success,
        data: response.data || []
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

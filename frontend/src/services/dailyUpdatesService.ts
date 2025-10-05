import { apiClient } from './api';

// =============================
// Daily Updates Types
// =============================
export interface DailyUpdate {
  id: number;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  priority_display: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  expires_at_formatted?: string;
  created_at_formatted?: string;
  is_expired: boolean;
  days_until_expiry: number | null;
  attachment?: string | null;
  attachment_name?: string;
  attachment_size?: number | null;
  attachment_file_extension?: string | null;
  attachment_size_display?: string | null;
  attachment_url?: string | null;
}

export interface DailyUpdateCreate {
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  expires_at?: string | null;
}

export interface DailyUpdateUpdate extends Partial<DailyUpdateCreate> {}

export interface DailyUpdatesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DailyUpdate[];
}

export interface DailyUpdatesFilters {
  search?: string;
  priority?: 'low' | 'medium' | 'high';
  expired?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

// =============================
// Daily Updates Service
// =============================
class DailyUpdatesService {
  private baseUrl = '/api/daily-updates';

  /**
   * Get all daily updates with optional filtering
   */
  async getDailyUpdates(filters?: DailyUpdatesFilters): Promise<DailyUpdatesListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.expired !== undefined) params.append('expired', filters.expired.toString());
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/?${queryString}` : `${this.baseUrl}/`;
    
    const response = await apiClient.get<DailyUpdatesListResponse>(url);
    
    // Check if response is successful and has data
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch daily updates');
    }
    
    return response.data;
  }

  /**
   * Get active (non-expired) daily updates
   */
  async getActiveDailyUpdates(filters?: Omit<DailyUpdatesFilters, 'expired'>): Promise<DailyUpdatesListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/active/?${queryString}` : `${this.baseUrl}/active/`;
    
    const response = await apiClient.get<DailyUpdatesListResponse>(url);
    return response.data;
  }

  /**
   * Get expired daily updates
   */
  async getExpiredDailyUpdates(filters?: Omit<DailyUpdatesFilters, 'expired'>): Promise<DailyUpdatesListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/expired/?${queryString}` : `${this.baseUrl}/expired/`;
    
    const response = await apiClient.get<DailyUpdatesListResponse>(url);
    return response.data;
  }

  /**
   * Get daily updates by priority
   */
  async getDailyUpdatesByPriority(priority: 'low' | 'medium' | 'high', filters?: Omit<DailyUpdatesFilters, 'priority'>): Promise<DailyUpdatesListResponse> {
    const params = new URLSearchParams();
    params.append('priority', priority);
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = `${this.baseUrl}/by_priority/?${queryString}`;
    
    const response = await apiClient.get<DailyUpdatesListResponse>(url);
    return response.data;
  }

  /**
   * Get a specific daily update by ID
   */
  async getDailyUpdate(id: number): Promise<DailyUpdate> {
    const response = await apiClient.get<DailyUpdate>(`${this.baseUrl}/${id}/`);
    return response.data;
  }

  /**
   * Create a new daily update (Admin only)
   */
  async createDailyUpdate(data: DailyUpdateCreate): Promise<DailyUpdate> {
    const response = await apiClient.post<DailyUpdate>(`${this.baseUrl}/`, data);
    return response.data;
  }

  /**
   * Create or update daily update with file upload (Admin only)
   */
  async createOrUpdateWithFile(formData: FormData, id?: number): Promise<DailyUpdate> {
    const baseApiUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const url = id ? `${baseApiUrl}${this.baseUrl}/${id}/` : `${baseApiUrl}${this.baseUrl}/`;
    const method = id ? 'PATCH' : 'POST';
    
    // Use fetch API for multipart/form-data instead of apiClient
    const token = localStorage.getItem('access_token');
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to upload';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.message || error.detail || JSON.stringify(error);
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  /**
   * Update a daily update (Admin only)
   */
  async updateDailyUpdate(id: number, data: DailyUpdateUpdate): Promise<DailyUpdate> {
    const response = await apiClient.patch<DailyUpdate>(`${this.baseUrl}/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a daily update (Admin only)
   */
  async deleteDailyUpdate(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}/`);
  }

  /**
   * Extend expiry date of a daily update (Admin only)
   */
  async extendExpiry(id: number, days: number = 7): Promise<DailyUpdate> {
    const response = await apiClient.post<DailyUpdate>(`${this.baseUrl}/${id}/extend_expiry/`, { days });
    return response.data;
  }

  /**
   * Get priority options
   */
  getPriorityOptions() {
    return [
      { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50' },
      { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
      { value: 'high', label: 'High', color: 'text-red-600 bg-red-50' }
    ];
  }

  /**
   * Get priority color class
   */
  getPriorityColor(priority: string): string {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null): string {
    if (!dateString) return 'No expiry';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return `Expired ${Math.abs(diffInDays)} days ago`;
    } else if (diffInDays === 0) {
      return 'Expires today';
    } else if (diffInDays === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${diffInDays} days`;
    }
  }

  /**
   * Check if update is expiring soon (within 3 days)
   */
  isExpiringSoon(update: DailyUpdate): boolean {
    if (!update.expires_at || update.is_expired) return false;
    
    const expiryDate = new Date(update.expires_at);
    const now = new Date();
    const diffInDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffInDays <= 3 && diffInDays > 0;
  }
}

export const dailyUpdatesService = new DailyUpdatesService();
export default dailyUpdatesService;
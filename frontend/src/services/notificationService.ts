import { apiClient, ApiResponse, PaginatedResponse } from './api';

export interface Notification {
  id: string;
  type: 'shipment' | 'system' | 'user' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
  relatedId?: string; // ID of related entity (shipment, user, etc.)
  createdAt: string;
}

export interface CreateNotificationRequest {
  type: 'shipment' | 'system' | 'user' | 'alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  userId?: string;
  relatedId?: string;
}

export interface NotificationFilters {
  type?: string;
  priority?: string;
  read?: boolean;
  page?: number;
  limit?: number;
}

export const notificationService = {
  // Get all notifications
  async getNotifications(filters: NotificationFilters = {}): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const endpoint = `/notifications?${params.toString()}`;
    return apiClient.get<PaginatedResponse<Notification>>(endpoint);
  },

  // Get unread notifications
  async getUnreadNotifications(): Promise<ApiResponse<Notification[]>> {
    return apiClient.get<Notification[]>('/notifications/unread');
  },

  // Get notification by ID
  async getNotificationById(id: string): Promise<ApiResponse<Notification>> {
    return apiClient.get<Notification>(`/notifications/${id}`);
  },

  // Mark notification as read
  async markAsRead(id: string): Promise<ApiResponse<Notification>> {
    return apiClient.patch<Notification>(`/notifications/${id}/read`, {});
  },

  // Mark notification as unread
  async markAsUnread(id: string): Promise<ApiResponse<Notification>> {
    return apiClient.patch<Notification>(`/notifications/${id}/unread`, {});
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<ApiResponse<{ updated: number }>> {
    return apiClient.patch<{ updated: number }>('/notifications/mark-all-read', {});
  },

  // Delete notification
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/notifications/${id}`);
  },

  // Create notification
  async createNotification(data: CreateNotificationRequest): Promise<ApiResponse<Notification>> {
    return apiClient.post<Notification>('/notifications', data);
  },

  // Get notification count
  async getNotificationCount(): Promise<ApiResponse<{
    total: number;
    unread: number;
    high: number;
    medium: number;
    low: number;
  }>> {
    return apiClient.get('/notifications/count');
  },
}; 
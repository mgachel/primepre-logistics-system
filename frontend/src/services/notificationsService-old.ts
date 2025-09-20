import { apiClient, ApiResponse } from "./api";

export interface Notification {
  id: string;
  type:
    | "shipment"
    | "system"
    | "user"
    | "alert"
    | "capacity"
    | "quality"
    | "efficiency"
    | "overdue"
    | "message"; // Added message type for admin messages
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  action_required?: boolean;
  endpoint?: string;
  warehouse?: "china" | "ghana" | "all";
  sender?: string; // Added for admin messages
  recipient?: string; // Added for admin messages
  metadata?: {
    item_count?: number;
    cbm_amount?: number;
    value?: number;
    threshold_days?: number;
    sender_name?: string;
    recipient_name?: string;
    shipping_mark?: string;
  };
}

// New interface for admin messaging
export interface AdminMessage {
  id?: number;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  recipients: string[] | "all"; // Array of client IDs or "all" for broadcast
  shipping_marks?: string[]; // Optional shipping marks for targeting
  sender: string;
  created_at?: string;
  read_count?: number;
  total_recipients?: number;
}

// Request interface for creating admin messages
export interface CreateAdminMessageRequest {
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  recipients: number[] | "all"; // Client IDs or "all"
  shipping_marks?: string[]; // Optional specific shipping marks
}

// Interface for client notifications from backend
export interface ClientNotification {
  id: number;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  notification_type: "admin_message" | "system_alert" | "shipment_update" | "warehouse_notification";
  warehouse?: string;
  metadata?: Record<string, any>;
  read: boolean;
  action_required: boolean;
  timestamp: string;
  admin_message_title?: string;
  sender_name?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_type: {
    shipment: number;
    system: number;
    user: number;
    alert: number;
    capacity: number;
    quality: number;
    efficiency: number;
    overdue: number;
    message: number; // Added message type
  };
}

export interface NotificationFilters {
  type?: string;
  priority?: string;
  read?: boolean;
  warehouse?: "china" | "ghana" | "all";
  date_from?: string;
  date_to?: string;
  search?: string;
}

class NotificationsService {
  // Get all notifications from the new ClientNotification API
  async getNotifications(
    filters: NotificationFilters = {}
  ): Promise<ApiResponse<Notification[]>> {
    try {
      // Get client notifications from our new API
      const response = await apiClient.get<ClientNotification[]>("/api/settings/client-notifications/");
      
      if (!response.success || !response.data) {
        return {
          success: false,
          message: "Failed to fetch notifications",
          data: [],
        };
      }

      // Convert ClientNotifications to our frontend Notification format
      const notifications: Notification[] = response.data.map((clientNotification) => 
        this.convertClientNotificationToNotification(clientNotification)
      );

      // Apply filters
      let filteredNotifications = notifications;

      if (filters.type && filters.type !== "all") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n && n.type === filters.type
        );
      }

      if (filters.priority && filters.priority !== "all") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.priority === filters.priority
        );
      }

      if (filters.warehouse && filters.warehouse !== "all") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.warehouse === filters.warehouse
        );
      }

      if (filters.read !== undefined) {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.read === filters.read
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredNotifications = filteredNotifications.filter(
          (n) =>
            n.title.toLowerCase().includes(searchLower) ||
            n.message.toLowerCase().includes(searchLower)
        );
      }

      // Sort by priority and timestamp
      filteredNotifications.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff =
          priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });

      return {
        success: true,
        data: filteredNotifications,
        message: "Notifications retrieved successfully",
      };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications",
        data: [],
      };
    }
  }

  // Get notification statistics
  async getNotificationStats(): Promise<ApiResponse<NotificationStats>> {
    try {
      const notificationsResponse = await this.getNotifications();

      if (!notificationsResponse.success || !notificationsResponse.data) {
        throw new Error("Failed to get notifications for stats");
      }

      const notifications = notificationsResponse.data;

      const stats: NotificationStats = {
        total: notifications.length,
        unread: notifications.filter((n) => !n.read).length,
        by_priority: {
          critical: notifications.filter((n) => n.priority === "critical")
            .length,
          high: notifications.filter((n) => n.priority === "high").length,
          medium: notifications.filter((n) => n.priority === "medium").length,
          low: notifications.filter((n) => n.priority === "low").length,
        },
        by_type: {
          shipment: notifications.filter((n) => n && n.type === "shipment").length,
          system: notifications.filter((n) => n && n.type === "system").length,
          user: notifications.filter((n) => n && n.type === "user").length,
          alert: notifications.filter((n) => n && n.type === "alert").length,
          capacity: notifications.filter((n) => n && n.type === "capacity").length,
          quality: notifications.filter((n) => n && n.type === "quality").length,
          efficiency: notifications.filter((n) => n && n.type === "efficiency")
            .length,
          overdue: notifications.filter((n) => n && n.type === "overdue").length,
          message: notifications.filter((n) => n && n.type === "message").length,
        },
      };

      return {
        success: true,
        data: stats,
        message: "Notification statistics retrieved successfully",
      };
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch notification stats",
        data: {
          total: 0,
          unread: 0,
          by_priority: { critical: 0, high: 0, medium: 0, low: 0 },
          by_type: {
            shipment: 0,
            system: 0,
            user: 0,
            alert: 0,
            capacity: 0,
            quality: 0,
            efficiency: 0,
            overdue: 0,
            message: 0,
          },
        },
      };
    }
  }

  // Mark notification as read
  async markAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/api/settings/client-notifications/${id}/mark-read/`);
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark notification as read",
        data: undefined,
      };
    }
  }

  // Mark notification as unread
  async markAsUnread(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.post(`/api/settings/client-notifications/${id}/mark-unread/`);
      return response;
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark notification as unread",
        data: undefined,
      };
    }
  }

  // Delete notification
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiClient.delete(`/api/settings/client-notifications/${id}/`);
      return response;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete notification",
        data: undefined,
      };
    }
  }

  // Mark all notifications as read (simulated)
  async markAllAsRead(): Promise<ApiResponse<void>> {
    try {
      return {
        success: true,
        message: "All notifications marked as read",
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to mark all notifications as read",
        data: undefined,
      };
    }
  }

  // Helper method to convert ClientNotification to frontend Notification format
  private convertClientNotificationToNotification(
    clientNotification: ClientNotification
  ): Notification {
    return {
      id: clientNotification.id?.toString() || '',
      type: this.mapNotificationTypeToFrontendType(clientNotification.notification_type),
      title: clientNotification.title,
      message: clientNotification.message,
      timestamp: clientNotification.timestamp,
      read: clientNotification.read,
      priority: clientNotification.priority,
      action_required: clientNotification.action_required,
      endpoint: '', // Not used for client notifications
      warehouse: clientNotification.warehouse || '',
      metadata: clientNotification.metadata || {},
    };
  }

  private mapNotificationTypeToFrontendType(
    notificationType: string
  ): Notification["type"] {
    const typeMap: Record<string, Notification["type"]> = {
      admin_message: "user",
      system_alert: "alert",
      shipment_update: "shipment",
      warehouse_notification: "capacity",
    };

    return typeMap[notificationType] || "alert";
  }

  // Admin messaging methods
  
  // Send message to specific clients
  async sendAdminMessage(data: CreateAdminMessageRequest): Promise<ApiResponse<AdminMessage>> {
    try {
      const response = await apiClient.post<AdminMessage>('/api/settings/admin-messages/', data);
      return response;
    } catch (error) {
      console.error('Error sending admin message:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to send message",
        data: {} as AdminMessage,
      };
    }
  }

  // Get all admin messages (for admin view)
  async getAdminMessages(): Promise<ApiResponse<AdminMessage[]>> {
    try {
      const response = await apiClient.get<AdminMessage[]>('/api/settings/admin-messages/');
      return response;
    } catch (error) {
      console.error('Error fetching admin messages:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch admin messages",
        data: [],
      };
    }
  }

  // Get client notifications (for client view)
  async getClientNotifications(): Promise<ApiResponse<ClientNotification[]>> {
    try {
      const response = await apiClient.get<ClientNotification[]>('/api/settings/client-notifications/');
      return response;
    } catch (error) {
      console.error('Error fetching client notifications:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch client notifications",
        data: [],
      };
    }
  }

  // Get client notifications (for client view) - legacy function
  async getClientMessages(): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await apiClient.get<any[]>('/api/settings/client-notifications/');
      
      // Convert client notifications to frontend Notification format
      const notifications = response.data?.map((notification) => ({
        id: notification.id.toString(),
        type: notification.notification_type || "system_alert",
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp || notification.created_at,
        read: notification.read || notification.is_read,
        priority: notification.priority,
        action_required: notification.action_required || false,
        warehouse: notification.warehouse,
        metadata: notification.metadata || {}
      })) || [];

      return {
        success: response.success,
        message: response.message || "Client notifications retrieved successfully",
        data: notifications,
      };
    } catch (error) {
      console.error('Error fetching client messages:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch client messages",
        data: [],
      };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>(`/api/settings/client-notifications/${notificationId}/mark-read/`);
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark notification as read",
        data: {},
      };
    }
  }

  // Mark notification as unread
  async markNotificationAsUnread(notificationId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>(`/api/settings/client-notifications/${notificationId}/mark-unread/`);
      return response;
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark notification as unread",
        data: {},
      };
    }
  }

  // Delete notification
  async deleteNotification(notificationId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete<any>(`/api/settings/client-notifications/${notificationId}/`);
      return response;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete notification",
        data: {},
      };
    }
  }

  // Get notification statistics
  async getNotificationStats(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>('/api/settings/client-notifications/stats/');
      return response;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch notification stats",
        data: {},
      };
    }
  }

  // Get recent admin messages with stats
  async getRecentAdminMessages(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<any>('/api/settings/admin-messages/recent/');
      return response;
    } catch (error) {
      console.error('Error fetching recent admin messages:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to fetch recent admin messages",
        data: {},
      };
    }
  }

  // Mark all notifications as read for current user
  async markAllNotificationsAsRead(): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>('/api/settings/client-notifications/mark-all-read/');
      return response;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark all notifications as read",
        data: {},
      };
    }
  }

  // Mark a specific notification as read
  async markAsRead(notificationId: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post<any>(`/api/settings/client-notifications/${notificationId}/mark-read/`);
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to mark notification as read",
        data: {},
      };
    }
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;

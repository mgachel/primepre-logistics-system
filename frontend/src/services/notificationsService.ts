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
    | "message";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  action_required?: boolean;
  endpoint?: string;
  warehouse?: "china" | "ghana" | "all";
  sender?: string;
  recipient?: string;
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

// Interface for admin messaging
export interface AdminMessage {
  id?: number;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  recipients: string[] | "all";
  shipping_marks?: string[];
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
  recipients: string; // "all" or comma-separated client IDs like "1,2,3"
  shipping_marks?: string[];
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
    message: number;
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
  // Get client notifications for customers (simplified)
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

  // Send admin message
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
  async getAdminMessages(): Promise<ApiResponse<AdminMessage[] | any>> {
    try {
      const response = await apiClient.get<AdminMessage[] | any>('/api/settings/admin-messages/');
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

  // Legacy function - Get notifications (for backward compatibility)
  async getNotifications(filters: NotificationFilters = {}): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await apiClient.get<ClientNotification[]>("/api/settings/client-notifications/");
      
      if (!response.success || !response.data) {
        return {
          success: false,
          message: "Failed to fetch notifications",
          data: [],
        };
      }

      // Convert ClientNotification to Notification format
      const notifications: Notification[] = response.data.map((clientNotification) => ({
        id: clientNotification.id.toString(),
        type: clientNotification.notification_type === 'admin_message' ? 'message' : 'system',
        title: clientNotification.title,
        message: clientNotification.message,
        timestamp: clientNotification.timestamp,
        read: clientNotification.read,
        priority: clientNotification.priority,
        action_required: clientNotification.action_required,
        warehouse: clientNotification.warehouse as "china" | "ghana" | "all" | undefined,
        sender: clientNotification.sender_name,
        metadata: {
          ...clientNotification.metadata,
          sender_name: clientNotification.sender_name,
        },
      }));

      // Apply filters
      let filteredNotifications = notifications;

      if (filters.type && filters.type !== "all") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.type === filters.type
        );
      }

      if (filters.priority && filters.priority !== "all") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.priority === filters.priority
        );
      }

      if (filters.warehouse && filters.warehouse !== "all") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.warehouse === filters.warehouse || !n.warehouse
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
}

export const notificationsService = new NotificationsService();
export default notificationsService;
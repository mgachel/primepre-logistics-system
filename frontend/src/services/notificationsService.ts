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
    | "overdue";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high" | "critical";
  action_required?: boolean;
  endpoint?: string;
  warehouse?: "china" | "ghana" | "all";
  metadata?: {
    item_count?: number;
    cbm_amount?: number;
    value?: number;
    threshold_days?: number;
  };
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
  };
}

export interface SmartAlert {
  level: "critical" | "warning" | "info";
  type: string;
  message: string;
  action_required: boolean;
  endpoint?: string;
  timestamp: string;
  warehouse: "china" | "ghana";
}

export interface AlertsSummary {
  alerts: SmartAlert[];
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
  last_updated: string;
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
  // Get all notifications (from smart alerts + generated notifications)
  async getNotifications(
    filters: NotificationFilters = {}
  ): Promise<ApiResponse<Notification[]>> {
    try {
      // Get smart alerts from both warehouses
      const [chinaResponse, ghanaResponse] = await Promise.all([
        apiClient.get<AlertsSummary>("/api/goods/china/smart_alerts/"),
        apiClient.get<AlertsSummary>("/api/goods/ghana/smart_alerts/"),
      ]);

      const notifications: Notification[] = [];

      // Convert China alerts to notifications
      if (chinaResponse.data?.alerts) {
        chinaResponse.data.alerts.forEach((alert, index) => {
          if (alert) {  // Only process non-null alerts
            notifications.push(
              this.convertAlertToNotification(alert, `china_${index}`, "china")
            );
          }
        });
      }

      // Convert Ghana alerts to notifications
      if (ghanaResponse.data?.alerts) {
        ghanaResponse.data.alerts.forEach((alert, index) => {
          if (alert) {  // Only process non-null alerts
            notifications.push(
              this.convertAlertToNotification(alert, `ghana_${index}`, "ghana")
            );
          }
        });
      }

      // Filter out any null notifications and ensure all notifications have required properties
      const validNotifications = notifications.filter(
        (notification) => 
          notification && 
          notification.id && 
          notification.type && 
          notification.title && 
          notification.message
      );

      // Apply filters
      let filteredNotifications = validNotifications;

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
          },
        },
      };
    }
  }

  // Mark notification as read (simulated - we don't have persistent notifications yet)
  async markAsRead(id: string): Promise<ApiResponse<void>> {
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate success
      return {
        success: true,
        message: "Notification marked as read",
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to mark notification as read",
        data: undefined,
      };
    }
  }

  // Mark notification as unread (simulated)
  async markAsUnread(id: string): Promise<ApiResponse<void>> {
    try {
      return {
        success: true,
        message: "Notification marked as unread",
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to mark notification as unread",
        data: undefined,
      };
    }
  }

  // Delete notification (simulated)
  async deleteNotification(id: string): Promise<ApiResponse<void>> {
    try {
      return {
        success: true,
        message: "Notification deleted",
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete notification",
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

  // Helper method to convert smart alerts to notifications
  private convertAlertToNotification(
    alert: SmartAlert,
    id: string,
    warehouse: "china" | "ghana"
  ): Notification {
    return {
      id,
      type: this.mapAlertTypeToNotificationType(alert?.type || 'system'),
      title: this.generateTitleFromAlert(alert),
      message: alert?.message || 'No message available',
      timestamp: alert?.timestamp || new Date().toISOString(),
      read: false, // All alerts are initially unread
      priority: this.mapAlertLevelToPriority(alert?.level || 'low'),
      action_required: alert?.action_required || false,
      endpoint: alert?.endpoint || '',
      warehouse,
      metadata: this.extractMetadataFromAlert(alert),
    };
  }

  private mapAlertTypeToNotificationType(
    alertType: string | null | undefined
  ): Notification["type"] {
    if (!alertType) {
      return "alert"; // Default fallback
    }
    
    const typeMap: Record<string, Notification["type"]> = {
      overdue: "overdue",
      capacity: "capacity",
      quality: "quality",
      efficiency: "efficiency",
      shipment: "shipment",
      system: "system",
      user: "user",
    };

    return typeMap[alertType] || "alert";
  }

  private mapAlertLevelToPriority(
    level: SmartAlert["level"] | null | undefined
  ): Notification["priority"] {
    if (!level) {
      return "low"; // Default fallback
    }
    
    const priorityMap: Record<SmartAlert["level"], Notification["priority"]> = {
      critical: "critical",
      warning: "high",
      info: "medium",
    };

    return priorityMap[level] || "low";
  }

  private generateTitleFromAlert(alert: SmartAlert | null): string {
    if (!alert || !alert.type) {
      return "System Alert";
    }
    
    const titleMap: Record<string, string> = {
      overdue: "Overdue Items Alert",
      capacity: "Warehouse Capacity Alert",
      quality: "Quality Issues Detected",
      efficiency: "Processing Efficiency Notice",
      shipment: "Shipment Update",
      system: "System Notification",
      user: "User Activity",
    };

    return titleMap[alert.type] || "System Alert";
  }

  private extractMetadataFromAlert(
    alert: SmartAlert | null
  ): Notification["metadata"] {
    if (!alert || !alert.message) {
      return {};
    }
    
    const metadata: Notification["metadata"] = {};

    // Extract numbers from message for metadata
    const numberMatches = alert.message.match(/\d+/g);
    if (numberMatches && numberMatches.length > 0) {
      const firstNumber = parseInt(numberMatches[0]);

      if ((alert.type === "overdue" || alert.type === "quality")) {
        metadata.item_count = firstNumber;
      } else if (alert.type === "capacity") {
        metadata.cbm_amount = firstNumber;
      }
    }

    // Extract threshold days from overdue alerts
    if (alert.type === "overdue" && alert.message && alert.message.includes("days")) {
      const daysMatch = alert.message.match(/(\d+)\+?\s*days/);
      if (daysMatch) {
        metadata.threshold_days = parseInt(daysMatch[1]);
      }
    }

    return metadata;
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;

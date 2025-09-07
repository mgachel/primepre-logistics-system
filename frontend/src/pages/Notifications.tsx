import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Package,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Mail,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  TrendingUp,
  Warehouse,
  Flag,
  BarChart3,
} from "lucide-react";
import {
  notificationsService,
  Notification,
  NotificationStats,
  NotificationFilters,
} from "@/services/notificationsService";

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter states
  const [filters, setFilters] = useState<NotificationFilters>({
    warehouse: "all",
    type: "all",
    priority: "all",
    read: undefined,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications and stats
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchFilters: NotificationFilters = {
        ...filters,
        search: searchQuery || undefined,
      };

      // Apply tab-specific filters
      if (activeTab === "unread") {
        searchFilters.read = false;
      } else if (activeTab === "read") {
        searchFilters.read = true;
      }

      const [notificationsResponse, statsResponse] = await Promise.all([
        notificationsService.getNotifications(searchFilters),
        notificationsService.getNotificationStats(),
      ]);

      if (notificationsResponse.success && notificationsResponse.data) {
        setNotifications(notificationsResponse.data);
      } else {
        throw new Error(
          notificationsResponse.message || "Failed to fetch notifications"
        );
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch notifications"
      );
      toast({
        title: "Error",
        description: "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, activeTab, toast]);

  // Refresh notifications
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Notifications updated",
    });
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const response = await notificationsService.markAsRead(id);
      if (response.success) {
        setNotifications(
          notifications.map((notification) =>
            notification && notification.id === id
              ? { ...notification, read: true }
              : notification
          ).filter(Boolean) // Remove any null/undefined items
        );
        toast({
          title: "Success",
          description: "Notification marked as read",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  // Mark notification as unread
  const markAsUnread = async (id: string) => {
    try {
      const response = await notificationsService.markAsUnread(id);
      if (response.success) {
        setNotifications(
          notifications.map((notification) =>
            notification && notification.id === id
              ? { ...notification, read: false }
              : notification
          ).filter(Boolean)
        );
        toast({
          title: "Success",
          description: "Notification marked as unread",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as unread",
        variant: "destructive",
      });
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const response = await notificationsService.deleteNotification(id);
      if (response.success) {
        setNotifications(
          notifications.filter((notification) => notification.id !== id)
        );
        toast({
          title: "Success",
          description: "Notification deleted",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await notificationsService.markAllAsRead();
      if (response.success) {
        setNotifications(
          notifications.filter(Boolean).map((notification) => ({ ...notification, read: true }))
        );
        toast({
          title: "Success",
          description: "All notifications marked as read",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  // Filter and compute counts
  const allNotifications = notifications;
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);
  const unreadCount = unreadNotifications.length;

  // Load notifications on component mount and when filters change
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Helper functions
  const getIcon = (type: string) => {
    switch (type) {
      case "shipment":
        return <Package className="h-4 w-4" />;
      case "user":
        return <Users className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "system":
        return <CheckCircle className="h-4 w-4" />;
      case "capacity":
        return <Warehouse className="h-4 w-4" />;
      case "quality":
        return <Flag className="h-4 w-4" />;
      case "efficiency":
        return <TrendingUp className="h-4 w-4" />;
      case "overdue":
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "medium":
        return "bg-yellow-500 text-black";
      case "low":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const getWarehouseBadge = (warehouse?: string) => {
    if (!warehouse || warehouse === "all") return null;

    return (
      <Badge
        variant="outline"
        className={`text-xs ${
          warehouse === "china"
            ? "border-blue-400 text-blue-600"
            : "border-green-400 text-green-600"
        }`}
      >
        {warehouse.charAt(0).toUpperCase() + warehouse.slice(1)}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      } else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${Math.max(1, diffMins)} minute${diffMins > 1 ? "s" : ""} ago`;
      }
    } catch {
      return timestamp;
    }
  };

  const NotificationCard = ({
    notification,
  }: {
    notification: Notification;
  }) => (
    <Card
      className={`transition-all hover:shadow-sm ${
        !notification.read ? "border-l-4 border-l-primary bg-muted/50" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-full ${
                notification.read ? "bg-muted" : "bg-primary/10"
              }`}
            >
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4
                  className={`text-sm font-medium ${
                    !notification.read ? "font-semibold" : ""
                  }`}
                >
                  {notification.title}
                </h4>
                <Badge
                  variant="outline"
                  className={getPriorityColor(notification.priority)}
                >
                  {notification.priority}
                </Badge>
                {getWarehouseBadge(notification.warehouse)}
                {notification.action_required && (
                  <Badge variant="destructive" className="text-xs">
                    Action Required
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <Clock className="h-3 w-3" />
                {formatTimestamp(notification.timestamp)}
                {notification.metadata?.item_count && (
                  <>
                    <span>•</span>
                    <span>{notification.metadata.item_count} items</span>
                  </>
                )}
                {notification.metadata?.cbm_amount && (
                  <>
                    <span>•</span>
                    <span>{notification.metadata.cbm_amount} CBM</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!notification.read ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsRead(notification.id)}
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsUnread(notification.id)}
                className="h-8 w-8 p-0"
                title="Mark as unread"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteNotification(notification.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Delete notification"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with system alerts and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          )}
          <Button
            variant="outline"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Critical</p>
                  <p className="text-2xl font-bold">
                    {stats.by_priority.critical}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">High Priority</p>
                  <p className="text-2xl font-bold">{stats.by_priority.high}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Unread</p>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>

        <Select
          value={filters.warehouse || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              warehouse:
                value === "all" ? undefined : (value as "china" | "ghana"),
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            <SelectItem value="china">China</SelectItem>
            <SelectItem value="ghana">Ghana</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.type || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              type: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="capacity">Capacity</SelectItem>
            <SelectItem value="quality">Quality</SelectItem>
            <SelectItem value="efficiency">Efficiency</SelectItem>
            <SelectItem value="shipment">Shipment</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              priority: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All ({allNotifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="read">
            Read ({readNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading notifications...</span>
            </div>
          ) : allNotifications.length > 0 ? (
            allNotifications.filter(Boolean).map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery ||
                  Object.values(filters).some((f) => f && f !== "all")
                    ? "No notifications match your current filters."
                    : "You're all caught up! Check back later for new notifications."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading notifications...</span>
            </div>
          ) : unreadNotifications.length > 0 ? (
            unreadNotifications.filter(Boolean).map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No unread notifications
                </h3>
                <p className="text-muted-foreground text-center">
                  Great! You've read all your notifications.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="read" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading notifications...</span>
            </div>
          ) : readNotifications.length > 0 ? (
            readNotifications.filter(Boolean).map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No read notifications
                </h3>
                <p className="text-muted-foreground text-center">
                  Read notifications will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

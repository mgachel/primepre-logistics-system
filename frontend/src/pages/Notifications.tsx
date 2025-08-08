import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Package, Users, AlertTriangle, CheckCircle, Clock, Trash2, Mail } from "lucide-react";

interface Notification {
  id: string;
  type: "shipment" | "system" | "user" | "alert";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high";
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "shipment",
      title: "New Shipment Created",
      message: "Air cargo shipment AC-2024-001 has been created and is ready for processing.",
      timestamp: "2 hours ago",
      read: false,
      priority: "medium"
    },
    {
      id: "2",
      type: "alert",
      title: "Warehouse Capacity Alert",
      message: "China warehouse is approaching maximum capacity (85% full).",
      timestamp: "4 hours ago",
      read: false,
      priority: "high"
    },
    {
      id: "3",
      type: "user",
      title: "New Admin User Added",
      message: "Sarah Johnson has been added as a new administrator.",
      timestamp: "1 day ago",
      read: true,
      priority: "low"
    },
    {
      id: "4",
      type: "system",
      title: "System Maintenance",
      message: "Scheduled maintenance completed successfully. All systems are operational.",
      timestamp: "2 days ago",
      read: true,
      priority: "medium"
    },
    {
      id: "5",
      type: "shipment",
      title: "Delivery Confirmation",
      message: "Sea cargo shipment SC-2024-015 has been delivered successfully.",
      timestamp: "3 days ago",
      read: true,
      priority: "low"
    }
  ]);

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
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAsUnread = (id: string) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, read: false } : notification
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const allNotifications = notifications;
  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <Card className={`transition-all hover:shadow-sm ${!notification.read ? 'border-l-4 border-l-primary bg-muted/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${notification.read ? 'bg-muted' : 'bg-primary/10'}`}>
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                  {notification.title}
                </h4>
                <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                  {notification.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {notification.timestamp}
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
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsUnread(notification.id)}
                className="h-8 w-8 p-0"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteNotification(notification.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with system alerts and activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary">
              {unreadCount} unread
            </Badge>
          )}
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({allNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="read">
            Read ({readNotifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {allNotifications.length > 0 ? (
            allNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground text-center">
                  You're all caught up! Check back later for new notifications.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unread" className="space-y-4">
          {unreadNotifications.length > 0 ? (
            unreadNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No unread notifications</h3>
                <p className="text-muted-foreground text-center">
                  Great! You've read all your notifications.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="read" className="space-y-4">
          {readNotifications.length > 0 ? (
            readNotifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No read notifications</h3>
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
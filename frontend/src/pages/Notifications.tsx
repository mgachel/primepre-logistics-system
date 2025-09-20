import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import {
  Bell,
  Send,
  MessageSquare,
  Plus,
  Loader2,
  RefreshCw,
  Mail,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  notificationsService,
  CreateAdminMessageRequest,
  AdminMessage,
  ClientNotification,
} from "@/services/notificationsService";
import { clientService, Client } from "@/services/clientService";

export default function Notifications() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Helper functions for role checking
  const isAdmin = () => user && user.user_role && ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role);
  const isCustomer = () => user && user.user_role === 'CUSTOMER';

  // Admin messaging states (send only)
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageForm, setMessageForm] = useState({
    title: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    recipients: "all" as "all" | "specific",
    selectedClients: [] as string[],
    selectedShippingMarks: [] as string[],
  });

  // New states for client/shipping mark selection
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [shippingMarks, setShippingMarks] = useState<string[]>([]);

  // Client notifications states (view only)
  const [clientNotifications, setClientNotifications] = useState<ClientNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  // Ensure arrays are always arrays
  const safeClientNotifications = Array.isArray(clientNotifications) ? clientNotifications : [];
  const safeAdminMessages = Array.isArray(adminMessages) ? adminMessages : [];

  // Load client notifications for customers
  const fetchClientNotifications = async () => {
    if (!isCustomer()) return;
    
    try {
      setLoadingNotifications(true);
      const response = await notificationsService.getClientNotifications();
      if (response.success && response.data && Array.isArray(response.data)) {
        setClientNotifications(response.data);
      } else {
        console.warn('Invalid response data format:', response.data);
        setClientNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching client notifications:', error);
      setClientNotifications([]);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Load admin messages and clients for admin
  const fetchAdminData = async () => {
    if (!isAdmin()) return;

    try {
      // Load sent messages
      const messagesResponse = await notificationsService.getAdminMessages();
      if (messagesResponse.success && messagesResponse.data) {
        // Handle both direct array and paginated response formats
        let messagesData: AdminMessage[] = [];
        if (Array.isArray(messagesResponse.data)) {
          messagesData = messagesResponse.data;
        } else if (messagesResponse.data.results && Array.isArray(messagesResponse.data.results)) {
          messagesData = messagesResponse.data.results;
        }
        setAdminMessages(messagesData);
      } else {
        console.warn('Invalid admin messages response data format:', messagesResponse.data);
        setAdminMessages([]);
      }

      // Load clients for selection
      setLoadingClients(true);
      const clientsResponse = await clientService.getClients();
      if (clientsResponse.success && clientsResponse.data) {
        const clientsData = Array.isArray(clientsResponse.data) ? clientsResponse.data : 
                           (clientsResponse.data.results && Array.isArray(clientsResponse.data.results)) ? clientsResponse.data.results : [];
        setClients(clientsData);
        
        // Extract unique shipping marks from clients
        const marks = [...new Set(clientsData.map(client => client.shipping_mark).filter(Boolean))];
        setShippingMarks(marks);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setAdminMessages([]);
      setClients([]);
      setShippingMarks([]);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (isCustomer()) {
      fetchClientNotifications();
    } else if (isAdmin()) {
      fetchAdminData();
    }
  }, [user]);

  // Send admin message
  const handleSendMessage = async () => {
    if (!messageForm.title.trim() || !messageForm.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate specific recipients selection
    if (messageForm.recipients === "specific" && 
        messageForm.selectedClients.length === 0 && 
        messageForm.selectedShippingMarks.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please select at least one client or shipping mark for specific targeting",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingMessage(true);
      
      const messageData: CreateAdminMessageRequest = {
        title: messageForm.title,
        message: messageForm.message,
        priority: messageForm.priority,
        recipients: messageForm.recipients === "all" ? "all" : messageForm.selectedClients.join(","),
        shipping_marks: messageForm.selectedShippingMarks.length > 0 ? messageForm.selectedShippingMarks : undefined,
      };

      const response = await notificationsService.sendAdminMessage(messageData);
      
      if (response.success) {
        toast({
          title: "Message Sent",
          description: `Your message has been sent successfully to ${
            messageForm.recipients === "all" ? "all clients" :
            messageForm.selectedShippingMarks.length > 0 ? `clients with shipping mark: ${messageForm.selectedShippingMarks[0]}` :
            "selected clients"
          }`,
        });
        
        // Reset form
        setMessageForm({
          title: "",
          message: "",
          priority: "medium",
          recipients: "all",
          selectedClients: [],
          selectedShippingMarks: [],
        });
        
        setIsMessageDialogOpen(false);
        fetchAdminData(); // Refresh sent messages
      } else {
        throw new Error(response.message || "Failed to send message");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setClientNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Admin interface - Send messages only
  if (isAdmin()) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Messaging</h1>
            <p className="text-muted-foreground">Send messages to clients</p>
          </div>
          
          <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Send Message to Clients</DialogTitle>
                <DialogDescription>
                  Compose and send a message to your clients
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div>
                  <Label htmlFor="title">Message Title *</Label>
                  <Input
                    id="title"
                    value={messageForm.title}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter message title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="message">Message Content *</Label>
                  <Textarea
                    id="message"
                    value={messageForm.message}
                    onChange={(e) => setMessageForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter your message"
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={messageForm.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "critical") => 
                      setMessageForm(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Recipients</Label>
                  <Select
                    value={messageForm.recipients}
                    onValueChange={(value: "all" | "specific") => 
                      setMessageForm(prev => ({ ...prev, recipients: value, selectedClients: [], selectedShippingMarks: [] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="specific">Specific Clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Client Selection Options - Only show when "specific" is selected */}
                {messageForm.recipients === "specific" && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <Label htmlFor="shipping-marks">Select by Shipping Mark</Label>
                      <Select
                        value={messageForm.selectedShippingMarks[0] || ""}
                        onValueChange={(value) => 
                          setMessageForm(prev => ({ 
                            ...prev, 
                            selectedShippingMarks: value ? [value] : [],
                            selectedClients: [] // Clear client selection when using shipping mark
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a shipping mark" />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingMarks.map((mark) => (
                            <SelectItem key={mark} value={mark}>
                              {mark}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      OR
                    </div>

                    <div>
                      <Label htmlFor="specific-clients">Select Specific Clients</Label>
                      <Select
                        value={messageForm.selectedClients[0] || ""}
                        onValueChange={(value) => 
                          setMessageForm(prev => ({ 
                            ...prev, 
                            selectedClients: value ? [value] : [],
                            selectedShippingMarks: [] // Clear shipping mark selection when using clients
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.company_name} ({client.shipping_mark})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMessageForm(prev => ({ 
                          ...prev, 
                          recipients: "all",
                          selectedClients: [],
                          selectedShippingMarks: []
                        }))}
                        className="w-full"
                      >
                        Send to All Clients Instead
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
                <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage} disabled={sendingMessage}>
                  {sendingMessage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sent Messages History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Sent Messages
              </CardTitle>
              <CardDescription>Messages you've sent to clients</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchAdminData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {(safeAdminMessages.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {safeAdminMessages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{message.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {message.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{formatDate(message.created_at || "")}</span>
                          <span>{message.total_recipients} recipients</span>
                          <span>{message.read_count} read</span>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(message.priority)}>
                        {message.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Customer interface - View messages only
  if (isCustomer()) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">Messages from admin</p>
          </div>
          
          <Button variant="ghost" size="sm" onClick={fetchClientNotifications}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Your Messages
            </CardTitle>
            <CardDescription>Messages sent by the admin</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (safeClientNotifications.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {safeClientNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{notification.title}</h3>
                          {!notification.read && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.timestamp)}
                          </div>
                          {notification.sender_name && (
                            <span>From: {notification.sender_name}</span>
                          )}
                          {notification.read && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Read
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={getPriorityColor(notification.priority)}>
                        {notification.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback for unauthorized users
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Access denied</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
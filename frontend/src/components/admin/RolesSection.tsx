import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Shield,
  Crown,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { NewRoleDialog } from "@/components/dialogs/NewRoleDialog";
import { adminService, UserStats } from "@/services/adminService";

interface RoleInfo {
  role: string;
  name: string;
  description: string;
  permissions: string[];
  icon: React.ReactNode;
  color: string;
  count: number;
}

export function RolesSection() {
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const { toast } = useToast();

  // Static role definitions based on backend model
  const roleDefinitions: RoleInfo[] = [
    {
      role: "SUPER_ADMIN",
      name: "Super Administrator",
      description: "Full system access with all permissions",
      permissions: [
        "Manage all users",
        "Manage all warehouses",
        "View analytics",
        "Manage admins",
        "System configuration",
      ],
      icon: <Crown className="h-8 w-8" />,
      color: "bg-red-100 text-red-800 border-red-200",
      count: 0,
    },
    {
      role: "MANAGER",
      name: "Manager",
      description: "Manage operations and personnel",
      permissions: [
        "Create users",
        "Manage inventory",
        "View analytics",
        "Access all warehouses",
      ],
      icon: <Shield className="h-8 w-8" />,
      color: "bg-purple-100 text-purple-800 border-purple-200",
      count: 0,
    },
    {
      role: "ADMIN",
      name: "Administrator",
      description: "Administrative duties and warehouse management",
      permissions: [
        "Manage inventory",
        "Manage rates",
        "View analytics",
        "Warehouse access",
      ],
      icon: <UserCheck className="h-8 w-8" />,
      color: "bg-blue-100 text-blue-800 border-blue-200",
      count: 0,
    },
    {
      role: "STAFF",
      name: "Staff",
      description: "Basic warehouse operations",
      permissions: ["View inventory", "Basic operations", "Limited access"],
      icon: <Users className="h-8 w-8" />,
      color: "bg-green-100 text-green-800 border-green-200",
      count: 0,
    },
  ];

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminService.getUserStats();

      if (response.success && response.data) {
        setUserStats(response.data);
      } else {
        throw new Error(response.message || "Failed to fetch user statistics");
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load user statistics"
      );
      toast({
        title: "Error",
        description: "Failed to load user statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  // Get user count for each role from stats
  const getRoleCount = (role: string) => {
    if (!userStats) return 0;

    switch (role) {
      case "SUPER_ADMIN":
        // Super admins are included in admin_users but need separate count
        return 0; // This would need a separate API call to get exact count
      case "MANAGER":
        return 0; // This would need a separate API call to get exact count
      case "ADMIN":
        return userStats.admin_users || 0;
      case "STAFF":
        return 0; // This would need a separate API call to get exact count
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Roles
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage admin roles and permissions
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-48 p-6">
                <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Role Stats Summary */}
          {userStats && (
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
                <CardDescription>Overview of users by role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {userStats.admin_users}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Admin Users
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {userStats.total_users}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Users
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {userStats.active_users}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Active Users
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {userStats.recent_registrations}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Recent (30d)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleDefinitions.map((role) => (
              <Card
                key={role.role}
                className={`relative group border-2 ${role.color}`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/50">
                        {role.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {getRoleCount(role.role)} users
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        toast({
                          title: "Info",
                          description:
                            "Role editing is not available in this version. Roles are predefined by the system.",
                        });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="mt-2">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium mb-2">Permissions:</h5>
                      <div className="space-y-1">
                        {role.permissions.map((permission, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        System Role
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled
                        title="System roles cannot be deleted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Note about role management */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-32 p-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Roles are predefined by the system and cannot be modified.
                </p>
                <p className="text-xs text-muted-foreground">
                  User permissions are automatically assigned based on their
                  role.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <NewRoleDialog
        open={showNewRoleDialog}
        onOpenChange={setShowNewRoleDialog}
      />
    </div>
  );
}

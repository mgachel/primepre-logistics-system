import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { NewAdminDialog } from "@/components/dialogs/NewAdminDialog";
import { adminService, AdminUser } from "@/services/adminService";
import { User } from "@/services/authService";

export function PersonnelSection() {
  const [showNewAdminDialog, setShowNewAdminDialog] = useState(false);
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch personnel data from backend
  const fetchPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all users (admin, staff, etc.)
      const response = await adminService.getAllUsers({
        user_role: undefined, // Get all roles for personnel management
      });

      if (response.success && response.data) {
        // Filter out customers, only show admin/staff personnel
        const adminPersonnel =
          response.data.results?.filter((user) =>
            ["STAFF", "ADMIN", "MANAGER", "SUPER_ADMIN"].includes(
              user.user_role
            )
          ) || [];
        setPersonnel(adminPersonnel);
      } else {
        throw new Error(response.message || "Failed to fetch personnel");
      }
    } catch (error) {
      console.error("Error fetching personnel:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load personnel"
      );
      toast({
        title: "Error",
        description: "Failed to load personnel data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await adminService.toggleUserStatus(userId);

      if (response.success) {
        // Update local state
        setPersonnel((prev) =>
          prev.map((person) =>
            person.id === userId
              ? { ...person, is_active: !currentStatus }
              : person
          )
        );

        toast({
          title: "Success",
          description:
            response.data?.message ||
            `User ${!currentStatus ? "activated" : "deactivated"} successfully`,
        });
      } else {
        throw new Error(response.message || "Failed to update user status");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await adminService.deleteAdminUser(userId);

      if (response.success) {
        // Remove from local state
        setPersonnel((prev) => prev.filter((person) => person.id !== userId));

        toast({
          title: "Success",
          description: "User deleted successfully",
        });
      } else {
        throw new Error(response.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-100 text-red-800";
      case "MANAGER":
        return "bg-purple-100 text-purple-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      case "STAFF":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Personnel
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage personnel info and admin users.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Personnel Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Personnel ({personnel.length})
            </CardTitle>
            <CardDescription>
              View and manage all personnel members and their associated
              details.
            </CardDescription>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowNewAdminDialog(true)}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Personnel
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Loading personnel...
              </div>
            </div>
          ) : personnel.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No Personnel Found
              </h3>
              <p className="text-muted-foreground mb-4">
                No admin or staff users have been created yet.
              </p>
              <Button onClick={() => setShowNewAdminDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Personnel
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Warehouses</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnel.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{person.full_name}</div>
                          {person.company_name && (
                            <div className="text-sm text-muted-foreground">
                              {person.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{person.email || "N/A"}</TableCell>
                      <TableCell>{person.phone}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getRoleColor(person.user_role)}
                        >
                          {person.user_role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={person.is_active ? "default" : "destructive"}
                          className={
                            person.is_active
                              ? "bg-green-100 text-green-800"
                              : ""
                          }
                        >
                          {person.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {person.accessible_warehouses.map((warehouse) => (
                            <Badge
                              key={warehouse}
                              variant="outline"
                              className="text-xs"
                            >
                              {warehouse.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(person.date_joined).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleStatus(person.id, person.is_active)
                            }
                            title={
                              person.is_active
                                ? "Deactivate user"
                                : "Activate user"
                            }
                          >
                            {person.is_active ? (
                              <X className="h-4 w-4 text-orange-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button variant="ghost" size="sm" title="Edit user">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(person.id)}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewAdminDialog
        open={showNewAdminDialog}
        onOpenChange={setShowNewAdminDialog}
        onSuccess={fetchPersonnel}
      />
    </div>
  );
}

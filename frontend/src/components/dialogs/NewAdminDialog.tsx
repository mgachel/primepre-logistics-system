import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminService, CreateAdminRequest } from "@/services/adminService";

interface NewAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewAdminDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewAdminDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAdminRequest>({
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    phone: "",
    region: "",
    user_role: "STAFF",
    user_type: "INDIVIDUAL",
    password: "",
    confirm_password: "",
    accessible_warehouses: ["china", "ghana"],
    can_create_users: false,
    can_manage_inventory: false,
    can_view_analytics: false,
    can_manage_admins: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (formData.password !== formData.confirm_password) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Add default values for removed fields
      const adminData: CreateAdminRequest = {
        ...formData,
        accessible_warehouses: ["china", "ghana"], // Default warehouse access
        can_create_users: false,
        can_manage_inventory: false,
        can_view_analytics: false,
        can_manage_admins: false,
      };

      // Remove empty email to avoid unique constraint issues
      if (!adminData.email || adminData.email.trim() === '') {
        delete adminData.email;
      }

      const response = await adminService.createAdminUser(adminData);

      if (response.success) {
        toast({
          title: "Success",
          description: `Admin user ${formData.first_name} ${formData.last_name} has been created successfully.`,
        });

        // Reset form
        setFormData({
          first_name: "",
          last_name: "",
          company_name: "",
          email: "",
          phone: "",
          region: "",
          user_role: "STAFF",
          user_type: "INDIVIDUAL",
          password: "",
          confirm_password: "",
          accessible_warehouses: ["china", "ghana"],
          can_create_users: false,
          can_manage_inventory: false,
          can_view_analytics: false,
          can_manage_admins: false,
        });

        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error(response.message || "Failed to create admin user");
      }
    } catch (error) {
      console.error("Error creating admin user:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Admin User</DialogTitle>
          <DialogDescription>
            Create a new admin user with specific roles and permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  placeholder="John"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  placeholder="Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john.doe@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+233 XX XXX XXXX"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region *</Label>
                <Select
                  value={formData.region}
                  onValueChange={(value) =>
                    setFormData({ ...formData, region: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREATER_ACCRA">Greater Accra</SelectItem>
                    <SelectItem value="ASHANTI">Ashanti</SelectItem>
                    <SelectItem value="WESTERN">Western</SelectItem>
                    <SelectItem value="CENTRAL">Central</SelectItem>
                    <SelectItem value="VOLTA">Volta</SelectItem>
                    <SelectItem value="EASTERN">Eastern</SelectItem>
                    <SelectItem value="NORTHERN">Northern</SelectItem>
                    <SelectItem value="UPPER_EAST">Upper East</SelectItem>
                    <SelectItem value="UPPER_WEST">Upper West</SelectItem>
                    <SelectItem value="BRONG_AHAFO">Brong Ahafo</SelectItem>
                    <SelectItem value="WESTERN_NORTH">Western North</SelectItem>
                    <SelectItem value="AHAFO">Ahafo</SelectItem>
                    <SelectItem value="BONO">Bono</SelectItem>
                    <SelectItem value="BONO_EAST">Bono East</SelectItem>
                    <SelectItem value="OTI">Oti</SelectItem>
                    <SelectItem value="NORTH_EAST">North East</SelectItem>
                    <SelectItem value="SAVANNAH">Savannah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="PrimePre Logistics"
                />
              </div>
            </div>
          </div>

          {/* Role and Type */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Role & Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user_role">User Role *</Label>
                <Select
                  value={formData.user_role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      user_role: value as CreateAdminRequest["user_role"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_type">User Type *</Label>
                <Select
                  value={formData.user_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      user_type: value as CreateAdminRequest["user_type"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Security</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirm_password: e.target.value,
                    })
                  }
                  placeholder="Confirm password"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Admin User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

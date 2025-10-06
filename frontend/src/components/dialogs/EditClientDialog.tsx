import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { adminService } from "@/services/adminService";
import type { User } from "@/services/authService";
import { Loader2 } from "lucide-react";

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: User | null;
  onSuccess?: () => void;
}

export function EditClientDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: EditClientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    first_name: string;
    last_name: string;
    nickname: string;
    email: string;
    phone: string;
    company_name: string;
    shipping_mark: string;
    region: string;
    user_type: string;
    user_role: string;
    is_active: boolean;
    is_verified: boolean;
  }>({
    first_name: "",
    last_name: "",
    nickname: "",
    email: "",
    phone: "",
    company_name: "",
    shipping_mark: "",
    region: "",
    user_type: "",
    user_role: "",
    is_active: true,
    is_verified: false,
  });

  // Populate form when client changes or dialog opens
  useEffect(() => {
    if (client && open) {
      console.log('EditClientDialog: Loading client data', client);
      setFormData({
        first_name: client.first_name || "",
        last_name: client.last_name || "",
        nickname: (client as any).nickname || "",
        email: client.email || "",
        phone: client.phone || "",
        company_name: client.company_name || "",
        shipping_mark: client.shipping_mark || "",
        region: client.region || "",
        user_type: client.user_type || "",
        user_role: client.user_role || "",
        is_active: client.is_active ?? true,
        is_verified: (client as any).is_verified ?? false,
      });
    }
  }, [client, open]);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) {
      console.error('EditClientDialog: No client selected');
      return;
    }

    setLoading(true);

    console.log('EditClientDialog: Submitting update for client', client.id);
    console.log('EditClientDialog: Form data:', formData);

    try {
      const response = await adminService.updateClient(client.id, formData as Partial<User>);
      
      console.log('EditClientDialog: Update successful', response);

      toast({
        title: "Client Updated",
        description: `${formData.first_name} ${formData.last_name}'s information has been updated successfully.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('EditClientDialog: Update failed', error);
      console.error('EditClientDialog: Error response:', error?.response?.data);
      
      // Extract detailed error message
      let errorMessage = "Failed to update client information";
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        // Check for field-specific errors
        if (typeof errorData === 'object' && !errorData.message) {
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => {
              const errorArray = Array.isArray(errors) ? errors : [errors];
              return `${field}: ${errorArray.join(', ')}`;
            })
            .join('; ');
          errorMessage = fieldErrors || errorMessage;
        } else {
          errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" key={client?.id}>
        <DialogHeader>
          <DialogTitle>Edit Client - {client?.shipping_mark}</DialogTitle>
          <DialogDescription>
            Update client information. All fields can be edited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Personal Information
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => {
                    console.log('EditClientDialog: Changing first_name to:', e.target.value);
                    setFormData({ ...formData, first_name: e.target.value });
                  }}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData({ ...formData, nickname: e.target.value })
                  }
                  placeholder="Optional display name"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="client@example.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="region">
                Region <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.region}
                onValueChange={(value) =>
                  setFormData({ ...formData, region: value })
                }
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GREATER_ACCRA">Greater Accra</SelectItem>
                  <SelectItem value="ASHANTI">Ashanti</SelectItem>
                  <SelectItem value="WESTERN">Western</SelectItem>
                  <SelectItem value="EASTERN">Eastern</SelectItem>
                  <SelectItem value="CENTRAL">Central</SelectItem>
                  <SelectItem value="NORTHERN">Northern</SelectItem>
                  <SelectItem value="UPPER_EAST">Upper East</SelectItem>
                  <SelectItem value="UPPER_WEST">Upper West</SelectItem>
                  <SelectItem value="VOLTA">Volta</SelectItem>
                  <SelectItem value="BONO">Bono</SelectItem>
                  <SelectItem value="BONO_EAST">Bono East</SelectItem>
                  <SelectItem value="AHAFO">Ahafo</SelectItem>
                  <SelectItem value="BRONG_AHAFO">Brong Ahafo</SelectItem>
                  <SelectItem value="SAVANNAH">Savannah</SelectItem>
                  <SelectItem value="NORTH_EAST">North East</SelectItem>
                  <SelectItem value="OTI">Oti</SelectItem>
                  <SelectItem value="WESTERN_NORTH">Western North</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Business Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="shipping_mark">
                  Shipping Mark <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="shipping_mark"
                  value={formData.shipping_mark}
                  onChange={(e) =>
                    setFormData({ ...formData, shipping_mark: e.target.value })
                  }
                  required
                  className="font-mono uppercase"
                  placeholder="UNIQUE-MARK"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="user_type">
                User Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.user_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, user_type: value })
                }
              >
                <SelectTrigger id="user_type">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Account Settings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user_role">
                  User Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.user_role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, user_role: value })
                  }
                >
                  <SelectTrigger id="user_role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Customer</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="is_active">Account Status</Label>
                <Select
                  value={formData.is_active ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value === "active" })
                  }
                >
                  <SelectTrigger id="is_active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="is_verified">Verification Status</Label>
              <Select
                value={formData.is_verified ? "verified" : "unverified"}
                onValueChange={(value) =>
                  setFormData({ ...formData, is_verified: value === "verified" })
                }
              >
                <SelectTrigger id="is_verified">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

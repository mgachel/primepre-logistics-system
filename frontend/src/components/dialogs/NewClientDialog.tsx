import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { clientService, CreateClientRequest } from "@/services/clientService";
import { adminService } from "@/services/adminService";
import { useAuthStore } from "@/stores/authStore";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional callback when a client is successfully created
  onCreated?: (client: unknown) => void;
}

export function NewClientDialog({ open, onOpenChange, onCreated }: NewClientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    first_name: string;
    last_name: string;
    nickname?: string;
    company_name?: string;
    shipping_mark?: string;
    email?: string;
    phone: string;
    region: string;
    user_type: 'INDIVIDUAL' | 'BUSINESS';
    user_role?: string;
    is_active?: boolean;
    is_verified?: boolean;
    password: string;
    confirm_password: string;
    notes?: string;
  }>(
    {
      first_name: "",
      last_name: "",
      nickname: "",
      company_name: "",
      shipping_mark: "",
      email: "",
      phone: "",
      region: "",
      user_type: 'INDIVIDUAL',
      user_role: 'CUSTOMER',
      is_active: true,
      is_verified: false,
      password: "",
      confirm_password: "",
      notes: "",
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      toast({ title: "Password mismatch", description: "Password and confirmation do not match", variant: "destructive" });
      return;
    }

  setLoading(true);
  try {
      // Prepare payload for API
      const payload: CreateClientRequest = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        region: formData.region,
        user_type: formData.user_type,
        password: formData.password,
        confirm_password: formData.confirm_password,
      };

      // include additional fields (shipping_mark, user_role, is_active, is_verified)
      const extendedPayload = {
        ...payload,
        shipping_mark: formData.shipping_mark,
        user_role: formData.user_role,
        is_active: formData.is_active,
        is_verified: formData.is_verified,
      };

      // Choose service depending on whether current user is an admin
      const currentUser = useAuthStore.getState().user;
      let res;
      if (currentUser?.is_admin_user) {
        // Admins use the admin create endpoint
        res = await adminService.createAdminUser(extendedPayload as any);
      } else {
        res = await clientService.createClient(extendedPayload as any);
      }

      toast({ title: "Client Created", description: `New client ${payload.first_name} ${payload.last_name} has been added successfully.` });

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        nickname: "",
        company_name: "",
        shipping_mark: "",
        email: "",
        phone: "",
        region: "",
        user_type: 'INDIVIDUAL',
        user_role: 'CUSTOMER',
        is_active: true,
        is_verified: false,
        password: "",
        confirm_password: "",
        notes: "",
      });

      onOpenChange(false);

      if ((res as unknown as { data?: unknown })?.data && typeof onCreated === 'function') {
        onCreated((res as unknown as { data: unknown }).data);
      }
    } catch (error: unknown) {
      console.error('CreateClient failed', error);

      // Extract detailed error message similar to EditClientDialog
      let errorMessage = 'Failed to create client';
      if ((error as any)?.response?.data) {
        const errorData = (error as any).response.data;
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
      } else if ((error as any).message) {
        errorMessage = (error as any).message;
      }

      toast({ title: 'Create Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" key={open ? 'new-client' : undefined}>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Enter the client details to add them to your system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
                <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
                <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="nickname">Nickname</Label>
                <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} placeholder="Optional display name" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+233 XX XXX XXXX" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="client@example.com" />
              </div>
            </div>
            <div>
              <Label htmlFor="region">Region <span className="text-destructive">*</span></Label>
              <Select value={formData.region} onValueChange={(value) => setFormData({...formData, region: value})}>
                <SelectTrigger id="region"><SelectValue placeholder="Select region"/></SelectTrigger>
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

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Business Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input id="company_name" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="shipping_mark">Shipping Mark <span className="text-destructive">*</span></Label>
                <Input id="shipping_mark" value={formData.shipping_mark} onChange={(e) => setFormData({...formData, shipping_mark: e.target.value})} required className="font-mono uppercase" placeholder="UNIQUE-MARK" />
              </div>
            </div>
            <div>
              <Label htmlFor="user_type">User Type <span className="text-destructive">*</span></Label>
              <Select value={formData.user_type} onValueChange={(value) => setFormData({...formData, user_type: value as 'INDIVIDUAL' | 'BUSINESS'})}>
                <SelectTrigger id="user_type"><SelectValue placeholder="Select user type"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user_role">User Role <span className="text-destructive">*</span></Label>
                <Select value={formData.user_role} onValueChange={(value) => setFormData({...formData, user_role: value})}>
                  <SelectTrigger id="user_role"><SelectValue placeholder="Select role"/></SelectTrigger>
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
                <Select value={formData.is_active ? 'active' : 'inactive'} onValueChange={(value) => setFormData({...formData, is_active: value === 'active'})}>
                  <SelectTrigger id="is_active"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="is_verified">Verification Status</Label>
              <Select value={formData.is_verified ? 'verified' : 'unverified'} onValueChange={(value) => setFormData({...formData, is_verified: value === 'verified'})}>
                <SelectTrigger id="is_verified"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm Password <span className="text-destructive">*</span></Label>
              <Input id="confirm_password" type="password" value={formData.confirm_password} onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value || ''})} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {loading ? 'Adding...' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 

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
  const { user: currentUser } = useAuthStore();
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
  // If the current user is an admin, default to verified and a known default password
  is_verified: currentUser?.is_admin_user ? true : false,
  // Use a default password that meets backend validators (uppercase, number, special char, min length)
  password: currentUser?.is_admin_user ? "PrimeMade1" : "",
  confirm_password: currentUser?.is_admin_user ? "PrimeMade1" : "",
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
      // Basic client-side normalization & validation
      const firstName = (formData.first_name || "").trim();
      const lastName = (formData.last_name || "").trim();
  // Preserve the exact shipping mark the admin typed. Do not alter casing or internal spacing.
  const shippingMarkRaw = formData.shipping_mark || "";
      const phoneRaw = (formData.phone || "").trim();
      const phoneDigits = phoneRaw.replace(/[^0-9]/g, "");
      if (phoneDigits.length < 10) {
        toast({ title: 'Invalid phone', description: 'Please enter a valid phone number with at least 10 digits', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // If password fields are empty (for example the form hides them for admins or auth isn't loaded),
      // always fall back to a secure default so the backend does not receive blank values.
      const defaultAdminPassword = "PrimeMade1";
      const passwordToSend = (formData.password && formData.password.length > 0)
        ? formData.password
        : defaultAdminPassword;
      const confirmToSend = (formData.confirm_password && formData.confirm_password.length > 0)
        ? formData.confirm_password
        : defaultAdminPassword;

      // Prepare payload for API
      // Ensure required registration fields are present even for the simplified admin form
      const payload: CreateClientRequest = {
  first_name: firstName,
  last_name: lastName,
        company_name: formData.company_name,
        email: formData.email,
  phone: phoneRaw,
        // Register endpoint requires region and user_type; provide sensible defaults if empty
        region: formData.region || "GREATER_ACCRA",
        user_type: (formData.user_type as 'INDIVIDUAL' | 'BUSINESS') || 'INDIVIDUAL',
        password: passwordToSend,
        confirm_password: confirmToSend,
      };

      // We will set admin-only fields (shipping_mark, user_role, is_verified, is_active)
      // in a follow-up PATCH after successful registration.

  // Use the client registration endpoint to create customers.
  // Send only the fields accepted by RegisterSerializer to avoid validation errors
  // caused by unexpected fields. We'll set admin-only fields with a follow-up PATCH.
      console.debug('Register payload', payload);

      let res;
      // If the current user is admin, use admin create endpoint which can create customers
      // and will auto-verify them. Provide admin serializer fields with sensible defaults.
      if (currentUser?.is_admin_user) {
        const adminPayload = {
          first_name: payload.first_name,
          last_name: payload.last_name,
          company_name: payload.company_name,
          email: payload.email,
          phone: payload.phone,
          region: payload.region,
          // Send the raw value so the backend stores exactly what the admin entered
          shipping_mark: shippingMarkRaw,
          user_role: 'CUSTOMER',
          user_type: payload.user_type || 'INDIVIDUAL',
          accessible_warehouses: [],
          can_create_users: false,
          can_manage_inventory: false,
          can_view_analytics: false,
          can_manage_admins: false,
          password: payload.password,
          confirm_password: payload.confirm_password,
        };

        console.debug('Admin create payload', adminPayload);
        res = await adminService.createAdminUser(adminPayload as any);
      } else {
        res = await clientService.createClient(payload as any);
      }

      // If admin provided a shipping_mark (and the register endpoint doesn't accept it),
      // update the created user via the admin PATCH endpoint so the shipping_mark is stored
      // and the user is marked verified immediately.
      try {
        const createdUser = (res as any)?.data?.user || (res as any)?.data;
        const createdId = createdUser?.id;
        if (createdId && formData.shipping_mark) {
          await adminService.updateClient(createdId, {
            // Use the raw shipping mark for the update as well
            shipping_mark: shippingMarkRaw,
            is_verified: true,
            user_role: formData.user_role,
            is_active: formData.is_active,
          } as any);
        }
      } catch (updateErr) {
        // Non-fatal: show a toast but don't fail the whole flow
        console.warn('Failed to set shipping_mark via admin update', updateErr);
        toast({ title: 'Partial Success', description: 'Client created but failed to set shipping mark automatically.', variant: 'warning' });
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

      // Always call onCreated so parent refreshes its list even if the response shape is unexpected
      try {
        if (typeof onCreated === 'function') onCreated((res as any)?.data || null);
      } catch (e) {
        console.warn('onCreated callback failed', e);
      }
    } catch (error: unknown) {
      // Log full error to console for debugging
      console.error('CreateClient failed', error);

      // Try to extract response body if available
      let errorMessage = 'Failed to create client';
      const respData = (error as any)?.response?.data;
      if (respData) {
        try {
          if (typeof respData === 'object') {
            // Build readable field: errors
            const fieldErrors = Object.entries(respData)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join('; ');
            errorMessage = fieldErrors || JSON.stringify(respData);
          } else {
            errorMessage = String(respData);
          }
        } catch (e) {
          errorMessage = JSON.stringify(respData);
        }
      } else if ((error as any)?.message) {
        errorMessage = (error as any).message;
      }

      // Also show raw response in console to help debugging
      if ((error as any)?.response) console.debug('Register response', (error as any).response);

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
          {/* Simplified form (admin-only UI): show only the requested fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
              <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
              <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="shipping_mark">Shipping Mark <span className="text-destructive">*</span></Label>
              {/* Preserve exact input (no automatic uppercase) so datatable shows what admin entered */}
              <Input id="shipping_mark" value={formData.shipping_mark} onChange={(e) => setFormData({...formData, shipping_mark: e.target.value})} required className="font-mono" placeholder="UNIQUE-MARK" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="client@example.com" />
            </div>
            <div>
              <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
              <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+233 XX XXX XXXX" required />
            </div>
            <div className="text-xs text-muted-foreground">
              Password will be set to <strong>PrimeMade1</strong> and the account will be marked as verified automatically.
            </div>
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

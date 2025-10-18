import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { clientService, CreateClientRequest } from "@/services/clientService";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional callback when a client is successfully created
  onCreated?: (client: unknown) => void;
}

export function NewClientDialog({ open, onOpenChange, onCreated }: NewClientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateClientRequest & { full_name?: string; notes?: string; }>(
    {
      first_name: "",
      last_name: "",
      company_name: "",
      email: "",
      phone: "",
      region: "",
      user_type: "INDIVIDUAL",
      password: "",
      confirm_password: "",
      full_name: "",
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

  const res = await clientService.createClient(payload);
      // Assume success when no error thrown and res.data exists
      toast({ title: "Client Created", description: `New client ${payload.first_name} ${payload.last_name} has been added successfully.` });

      // callback to parent will happen below via onCreated

      // Reset form
      setFormData({
        first_name: "",
        last_name: "",
        company_name: "",
        email: "",
        phone: "",
        region: "",
        user_type: "INDIVIDUAL",
        password: "",
        confirm_password: "",
        full_name: "",
        notes: "",
      });

      onOpenChange(false);

      // If parent provided onCreated, call it with returned client
      if ((res as unknown as { data?: unknown })?.data && typeof onCreated === 'function') {
        onCreated((res as unknown as { data: unknown }).data);
      }
    } catch (error: unknown) {
      console.error('Failed to create client:', error);
      toast({ title: 'Create Failed', description: error instanceof Error ? error.message : 'Failed to create client', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Enter the client details to add them to your system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  placeholder="First name"
                  required
                />
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="client@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+233 XX XXX XXXX"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.region}
                onChange={(e) => setFormData({...formData, region: e.target.value})}
                placeholder="Region or City, Country"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user_type">User Type</Label>
              <select
                id="user_type"
                value={formData.user_type}
                onChange={(e) => setFormData({...formData, user_type: e.target.value as 'INDIVIDUAL' | 'BUSINESS'})}
                className="w-full p-2 border rounded"
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({...formData, confirm_password: e.target.value})}
                placeholder="Confirm password"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value || ''})}
              placeholder="Additional notes about the client..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 

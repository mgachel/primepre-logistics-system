import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface NewRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRoleDialog({ open, onOpenChange }: NewRoleDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {
      dashboard: false,
      clients: false,
      seaCargo: false,
      airCargo: false,
      chinaWarehouse: false,
      ghanaWarehouse: false,
      claims: false,
      rates: false,
      admins: false,
      settings: false
    }
  });

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("New role created:", formData);
    
    toast({
      title: "Role Created",
      description: `New role "${formData.name}" has been created successfully.`,
    });

    // Reset form
    setFormData({
      name: "",
      description: "",
      permissions: {
        dashboard: false,
        clients: false,
        seaCargo: false,
        airCargo: false,
        chinaWarehouse: false,
        ghanaWarehouse: false,
        claims: false,
        rates: false,
        admins: false,
        settings: false
      }
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Define a new role with specific permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Warehouse Manager"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the role and its responsibilities..."
                rows={3}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Permissions</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dashboard"
                  checked={formData.permissions.dashboard}
                  onCheckedChange={(checked) => handlePermissionChange("dashboard", checked as boolean)}
                />
                <Label htmlFor="dashboard">Dashboard Access</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clients"
                  checked={formData.permissions.clients}
                  onCheckedChange={(checked) => handlePermissionChange("clients", checked as boolean)}
                />
                <Label htmlFor="clients">Client Management</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="seaCargo"
                  checked={formData.permissions.seaCargo}
                  onCheckedChange={(checked) => handlePermissionChange("seaCargo", checked as boolean)}
                />
                <Label htmlFor="seaCargo">Sea Cargo Management</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="airCargo"
                  checked={formData.permissions.airCargo}
                  onCheckedChange={(checked) => handlePermissionChange("airCargo", checked as boolean)}
                />
                <Label htmlFor="airCargo">Air Cargo Management</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chinaWarehouse"
                  checked={formData.permissions.chinaWarehouse}
                  onCheckedChange={(checked) => handlePermissionChange("chinaWarehouse", checked as boolean)}
                />
                <Label htmlFor="chinaWarehouse">China Warehouse</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ghanaWarehouse"
                  checked={formData.permissions.ghanaWarehouse}
                  onCheckedChange={(checked) => handlePermissionChange("ghanaWarehouse", checked as boolean)}
                />
                <Label htmlFor="ghanaWarehouse">Ghana Warehouse</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="claims"
                  checked={formData.permissions.claims}
                  onCheckedChange={(checked) => handlePermissionChange("claims", checked as boolean)}
                />
                <Label htmlFor="claims">Claims Management</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rates"
                  checked={formData.permissions.rates}
                  onCheckedChange={(checked) => handlePermissionChange("rates", checked as boolean)}
                />
                <Label htmlFor="rates">Shipping Rates</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admins"
                  checked={formData.permissions.admins}
                  onCheckedChange={(checked) => handlePermissionChange("admins", checked as boolean)}
                />
                <Label htmlFor="admins">Admin Management</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="settings"
                  checked={formData.permissions.settings}
                  onCheckedChange={(checked) => handlePermissionChange("settings", checked as boolean)}
                />
                <Label htmlFor="settings">System Settings</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
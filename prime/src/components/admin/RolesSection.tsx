import React, { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewRoleDialog } from "@/components/dialogs/NewRoleDialog";

export function RolesSection() {
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);

  // Static roles data
  const roles = [
    {
      id: 1,
      name: "ADMINISTRATOR",
      description: "ADMINISTRATIVE DUTIES",
    },
    {
      id: 2,
      name: "WAREHOUSE",
      description: "WAREHOUSE OPERATIONS",
    },
    {
      id: 3,
      name: "MANAGER",
      description: "GENERAL MANAGER",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Roles</h1>
        <p className="text-muted-foreground mt-1">Manage admins roles</p>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Role Card */}
        <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setShowNewRoleDialog(true)}>
          <CardContent className="flex flex-col items-center justify-center h-48 p-6">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">Add new role</p>
          </CardContent>
        </Card>

        {/* Existing Roles */}
        {roles.map((role) => (
          <Card key={role.id} className="relative group">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{role.name}</CardTitle>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NewRoleDialog 
        open={showNewRoleDialog} 
        onOpenChange={setShowNewRoleDialog} 
      />
    </div>
  );
}

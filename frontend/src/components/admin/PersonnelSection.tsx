import React, { useState } from "react";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewAdminDialog } from "@/components/dialogs/NewAdminDialog";

export function PersonnelSection() {
  const [showNewAdminDialog, setShowNewAdminDialog] = useState(false);

  // Static personnel data
  const personnel = [
    {
      id: 1,
      name: "ZIPPORAH",
      email: "serwaam430@gmail.com",
      phone: "0501936785",
      role: "ADMINISTRATOR",
      verification: "verified",
      createdBy: "Prime Pre Account",
    },
    {
      id: 2,
      name: "LAWRENCE",
      email: "quaamedegbor00@gmail.com",
      phone: "0553815636",
      role: "WAREHOUSE",
      verification: "verified",
      createdBy: "Prime Pre Account",
    },
    {
      id: 3,
      name: "NIKO",
      email: "nichpadi9@gmail.com",
      phone: "0246146109",
      role: "WAREHOUSE",
      verification: "not-verified",
      createdBy: "PEARL",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Personnels</h1>
        <p className="text-muted-foreground mt-1">Manage personnel info.</p>
      </div>

      {/* Personnel Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Personnel
            </CardTitle>
            <CardDescription>View and manage all personnel members and their associated details.</CardDescription>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowNewAdminDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Personnel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-border" 
                      aria-label="Select all personnel"
                      title="Select all personnel"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnel.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <input 
                        type="checkbox" 
                        className="rounded border-border" 
                        aria-label={`Select ${person.name}`}
                        title={`Select ${person.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>{person.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{person.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={person.verification === "verified" ? "default" : "destructive"}
                        className={person.verification === "verified" ? "bg-green-100 text-green-800" : ""}
                      >
                        {person.verification === "verified" ? "Verified" : "Not Verified"}
                      </Badge>
                    </TableCell>
                    <TableCell>{person.createdBy}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewAdminDialog 
        open={showNewAdminDialog} 
        onOpenChange={setShowNewAdminDialog} 
      />
    </div>
  );
}
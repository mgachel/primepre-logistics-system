import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Claims() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Claim Requests</h1>
        <p className="text-muted-foreground mt-1">Manage client's requests to unknown packages</p>
      </div>

      {/* Claims Section */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Requests</CardTitle>
          <CardDescription>Review and manage package claim requests from clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by tracking number, client name, or container"
              className="pl-9"
            />
          </div>

          {/* Claims Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="rounded border-border"
                      aria-label="Select all claims"
                      title="Select all claims"
                    />
                  </TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Claimed By</TableHead>
                  <TableHead>Container (Loading Date)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Claimed On</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
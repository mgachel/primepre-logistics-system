import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WarehouseItem } from "@/services/warehouseService";
import { apiClient } from "@/services/api";

export default function Claims() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WarehouseItem[]>([]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use flagged items from both warehouses as a proxy for claims
        const [chinaRes, ghanaRes] = await Promise.all([
          apiClient.get<WarehouseItem[]>(`/api/goods/china/flagged_items/`),
          apiClient.get<WarehouseItem[]>(`/api/goods/ghana/flagged_items/`),
        ]);
        const data = [...(chinaRes.data || []), ...(ghanaRes.data || [])];
        if (!ignore) setItems(data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load claims';
        if (!ignore) setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  const filtered = items.filter(i => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.supply_tracking?.toLowerCase().includes(q) ||
      i.shipping_mark?.toLowerCase().includes(q) ||
      i.item_id?.toLowerCase().includes(q)
    );
  });

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-destructive">{error}</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No data available</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <input type="checkbox" className="rounded border-border" aria-label={`Select claim ${it.item_id || it.id}`} title={`Select claim ${it.item_id || it.id}`} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{it.supply_tracking || '-'}</TableCell>
                      <TableCell>{it.customer_name || it.shipping_mark}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{it.status}</TableCell>
                      <TableCell>{new Date(it.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{it.flagged_reason || it.notes || '-'}</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
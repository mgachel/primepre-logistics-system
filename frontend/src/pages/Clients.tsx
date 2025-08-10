import { useMemo, useState } from "react";
import { Search, Plus, Filter, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewClientDialog } from "@/components/dialogs/NewClientDialog";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import type { User } from "@/services/authService";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  const queryParams = useMemo(() => {
    const params: Record<string, string | boolean> = {
      user_role: 'CUSTOMER',
      ordering: '-date_joined',
    };
    if (searchTerm) params.search = searchTerm;
    if (filterStatus !== 'all') params.is_active = filterStatus === 'active';
    return params;
  }, [searchTerm, filterStatus]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['clients', queryParams],
    queryFn: async () => {
      const search = new URLSearchParams();
      Object.entries(queryParams).forEach(([k, v]) => search.append(k, String(v)));
      return adminService.getAllUsers(Object.fromEntries(search.entries()));
    },
  });

  const clients = ((data?.data?.results || []) as User[]).map((u) => {
    const name = u.full_name || `${u.first_name} ${u.last_name}`.trim();
    const lastActivity = u.date_joined ? new Date(u.date_joined).toISOString().slice(0, 10) : '-';
    // Placeholders until shipment aggregation is wired
    const totalShipments = (u as unknown as { total_shipments?: number })?.total_shipments ?? 0;
    const activeShipments = (u as unknown as { active_shipments?: number })?.active_shipments ?? 0;
    const totalValueNum = (u as unknown as { total_value?: number })?.total_value;
    const totalValue = typeof totalValueNum === 'number' ? `$${totalValueNum}` : '-';
    return {
      id: u.id,
      name,
      email: u.email || '-',
      phone: u.phone || '-',
      region: u.region || '-',
      status: u.is_active ? ('active' as const) : ('inactive' as const),
      lastActivity,
      totalShipments,
      activeShipments,
      totalValue,
    };
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client relationships and view shipping history
          </p>
        </div>
        <Button onClick={() => setShowNewClientDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("active")}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="logistics-card">
        <div className="overflow-x-auto">
          <table className="logistics-table">
            <thead>
              <tr>
                <th className="w-12">
                  <input 
                    type="checkbox" 
                    className="rounded"
                    aria-label="Select all clients"
                    title="Select all clients"
                  />
                </th>
                <th>Client</th>
                <th>Contact</th>
                <th>Region</th>
                <th>Shipments</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading clients...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-destructive">
                    Failed to load clients.
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    No clients found matching your criteria.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/50">
                    <td>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        aria-label={`Select ${client.name}`}
                        title={`Select ${client.name}`}
                      />
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{client.phone}</div>
                    </td>
                    <td>
                      <div className="text-sm">{client.region}</div>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">{client.totalShipments}</div>
                        <div className="text-sm text-muted-foreground">
                          {client.activeShipments} active
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{client.totalValue}</div>
                    </td>
                    <td>
                      <StatusBadge status={client.status} />
                    </td>
                    <td>
                      <div className="text-sm text-muted-foreground">{client.lastActivity}</div>
                    </td>
                    <td>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewClientDialog 
        open={showNewClientDialog} 
        onOpenChange={setShowNewClientDialog} 
      />
    </div>
  );
}
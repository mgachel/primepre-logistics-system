import { useMemo, useState } from "react";
import { Search, Plus, Eye, Edit, Trash2, Mail, History, Briefcase, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NewClientDialog } from "@/components/dialogs/NewClientDialog";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import type { User } from "@/services/authService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { formatDate } from "@/lib/date";
import { persistGet, persistSet } from "@/lib/persist";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">(persistGet('clients:filterStatus', 'all'));
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const rawUsers = useMemo(() => (data?.data?.results || []) as User[], [data?.data?.results]);
  const clients = rawUsers.map((u) => {
    const name = u.full_name || `${u.first_name} ${u.last_name}`.trim();
    const lastActivity = formatDate(u.date_joined);
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
      _raw: u,
    };
  });

  const counts = useMemo(() => ({
    all: rawUsers.length,
    active: rawUsers.filter(u=>u.is_active).length,
    inactive: rawUsers.filter(u=>!u.is_active).length,
  }), [rawUsers]);

  const cols: Column<typeof clients[number]>[] = [
    { id: 'select', header: <input type="checkbox" className="rounded" aria-label="Select all" />, accessor: () => <input type="checkbox" className="rounded" aria-label="Select row" />, width: '48px', sticky: true },
    { id: 'name', header: 'Client', accessor: (c) => (
      <div>
        <div className="font-medium underline cursor-pointer" onClick={(e)=>{ e.stopPropagation(); setDetailsUser(c._raw); setDetailsOpen(true); }}>{c.name}</div>
        <div className="text-sm text-muted-foreground">{c.email}</div>
      </div>
    ), sort: (a,b)=>a.name.localeCompare(b.name), sticky: true, clickable: true },
    { id: 'contact', header: 'Contact', accessor: (c) => <div className="text-sm">{c.phone}</div>, sort: (a,b)=> (a.phone||'').localeCompare(b.phone||'') },
    { id: 'region', header: 'Region', accessor: (c) => <div className="text-sm">{c.region}</div>, sort: (a,b)=> (a.region||'').localeCompare(b.region||'') },
    { id: 'shipments', header: 'Shipments', accessor: (c) => (
      <div>
        <div className="font-medium text-right">{c.totalShipments}</div>
        <div className="text-xs text-muted-foreground text-right">{c.activeShipments} active</div>
      </div>
    ), sort: (a,b)=> a.totalShipments - b.totalShipments, align: 'right', width: '120px' },
    { id: 'value', header: 'Total Value', accessor: (c) => <div className="font-medium text-right">{c.totalValue}</div>, sort: (a,b)=> (parseFloat((a.totalValue||'').replace(/[^0-9.]/g,''))||0) - (parseFloat((b.totalValue||'').replace(/[^0-9.]/g,''))||0), align: 'right', width: '140px' },
    { id: 'status', header: 'Status', accessor: (c) => <StatusBadge status={c.status} /> },
    { id: 'last', header: 'Last Activity', accessor: (c) => <div className="text-sm text-muted-foreground">{c.lastActivity}</div>, sort: (a,b)=> (a.lastActivity||'').localeCompare(b.lastActivity||'') },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage client relationships and view recent shipments</p>
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
      <div className="logistics-card p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-muted-foreground">{counts.all} total • Active {counts.active} • Inactive {counts.inactive}</div>
          {(filterStatus !== 'all' || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={()=>{ setFilterStatus('all'); setSearchTerm(''); persistSet('clients:filterStatus','all'); }}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Reset filters
            </Button>
          )}
        </div>
        <DataTable
          id="clients"
          rows={clients}
          columns={cols}
          loading={isLoading}
          empty={<div className="text-muted-foreground">No clients yet. Add Client or Import from Excel.</div>}
          renderBulkBar={(rows)=>(
            <div className="flex gap-2">
              <Button size="sm" variant="outline"><Briefcase className="h-4 w-4 mr-1"/>Assign</Button>
              <Button size="sm" variant="outline"><Mail className="h-4 w-4 mr-1"/>Email</Button>
              <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4 mr-1"/>Delete</Button>
            </div>
          )}
          rowActions={(row) => (
            <>
              <DropdownMenuItem onClick={()=>{ setDetailsUser(row._raw); setDetailsOpen(true); }}><Eye className="h-4 w-4 mr-2"/>View</DropdownMenuItem>
              <DropdownMenuItem><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
              <DropdownMenuItem><History className="h-4 w-4 mr-2"/>View History</DropdownMenuItem>
              <DropdownMenuItem>Print / Export</DropdownMenuItem>
            </>
          )}
          onRowClick={(row)=>{ setDetailsUser(row._raw); setDetailsOpen(true); }}
        />
      </div>

      <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{detailsUser?.full_name || `${detailsUser?.first_name ?? ''} ${detailsUser?.last_name ?? ''}`.trim()}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-3">
              <div className="font-medium mb-2">Recent Shipments</div>
              <div className="text-sm text-muted-foreground">No recent shipments.</div>
            </div>
            <div className="border rounded p-3">
              <div className="font-medium mb-2">Recent Activity</div>
              <div className="text-sm text-muted-foreground">No recent activity.</div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <NewClientDialog 
        open={showNewClientDialog} 
        onOpenChange={setShowNewClientDialog} 
      />
    </div>
  );
}
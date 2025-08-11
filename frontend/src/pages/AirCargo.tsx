import { useEffect, useMemo, useState } from "react";
import { Ship, Plane, AlertTriangle, Clock, Plus, Search, Filter, Upload, MapPin, RefreshCcw, Edit, Eye, Trash2, FileDown, Settings } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewCargoContainerDialog } from "@/components/dialogs/NewCargoContainerDialog";
import { useNavigate } from "react-router-dom";
import { cargoService, BackendCargoContainer, BackendCargoItem, CargoDashboardStats } from "@/services/cargoService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";
import { persistGet, persistSet } from "@/lib/persist";
import { useToast } from "@/hooks/use-toast";

interface AirCargoItem {
  id: string;
  awbNumber: string;
  client: string;
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  departureDate: string;
  arrivalDate: string;
  weight: string;
  volume: string;
  goods: string;
  status: "in-transit" | "delivered" | "pending" | "delayed";
  notes: string;
}

export default function AirCargo() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("air-cargos");
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BackendCargoItem[]>([]);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);
  const [dashboard, setDashboard] = useState<CargoDashboardStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "in_transit" | "delivered" | "pending" | "delayed">(
    persistGet('air:filterStatus', 'all')
  );

  // Load air cargo data (items and containers) + dashboard
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [itemsRes, containersRes, dashRes] = await Promise.all([
          cargoService.getCargoItems({ status: undefined }),
          cargoService.getContainers({ cargo_type: 'air' }),
          cargoService.getDashboard('air'),
        ]);
        if (!ignore) {
          const airContainers = containersRes.data?.results || [];
          const allItems = itemsRes.data?.results || [];
          const airContainerIds = new Set(airContainers.map(c => c.container_id));
          const airItems = allItems.filter(i => i.container && airContainerIds.has(i.container));
          setItems(airItems);
          setContainers(airContainers);
          setDashboard(dashRes.data || null);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load air cargo';
        if (!ignore) setError(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(i =>
        (i.tracking_id || '').toLowerCase().includes(q) ||
        (i.client_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filterStatus, searchTerm]);

  const counts = useMemo(() => ({
    all: items.length,
    in_transit: items.filter(i=>i.status==='in_transit').length,
    delivered: items.filter(i=>i.status==='delivered').length,
    pending: items.filter(i=>i.status==='pending').length,
    delayed: items.filter(i=>i.status==='delayed').length,
  }), [items]);

  const containerMap = useMemo(() => {
    const map = new Map<string, BackendCargoContainer>();
    for (const c of containers) map.set(c.container_id, c);
    return map;
  }, [containers]);

  type Row = {
    id: string;
    tracking: string;
    awb: string;
    client: string;
    route: string;
    airline: string;
    flight: string;
    departure: string;
    arrival: string;
    eta: string | null;
    status: 'in-transit' | 'delivered' | 'pending' | 'delayed';
    _raw: BackendCargoItem;
  };

  const rows: Row[] = useMemo(() => filtered.map((i) => {
    const c = containerMap.get(i.container);
    const status: Row['status'] = i.status === 'in_transit' ? 'in-transit' : (i.status as Row['status']);
    return {
      id: i.id,
      tracking: i.tracking_id || i.id,
      awb: i.tracking_id || '-',
      client: i.client_name || String(i.client || ''),
      route: c?.route ?? '-',
      airline: '-',
      flight: '-',
      departure: c?.load_date ? formatDate(c.load_date) : '-',
      arrival: c?.unloading_date ? formatDate(c.unloading_date) : '-',
      eta: c?.eta ?? null,
      status,
      _raw: i,
    };
  }), [filtered, containerMap]);

  const columns: Column<Row>[] = [
    { id: 'select', header: <input type="checkbox" className="rounded" aria-label="Select all" />, accessor: () => <input type="checkbox" className="rounded" aria-label="Select row" />, width: '48px', sticky: true },
    { id: 'tracking', header: 'Tracking ID', accessor: (r) => <span className="font-medium">{r.tracking}</span>, sort: (a,b)=> a.tracking.localeCompare(b.tracking), sticky: true },
    { id: 'awb', header: 'AWB Number', accessor: (r) => <span className="font-mono text-sm">{r.awb}</span>, sort: (a,b)=> a.awb.localeCompare(b.awb) },
    { id: 'client', header: 'Client', accessor: (r) => r.client, sort: (a,b)=> a.client.localeCompare(b.client) },
    { id: 'route', header: 'Route', accessor: (r) => <div className="flex items-center text-sm"><MapPin className="h-3 w-3 mr-1 text-muted-foreground" />{r.route}</div> },
    { id: 'departure', header: 'Departure', accessor: (r) => <span className="text-sm text-muted-foreground">{r.departure}</span>, sort: (a,b)=> (a.departure||'').localeCompare(b.departure||'') },
    { id: 'arrival', header: 'Arrival', accessor: (r) => <span className="text-sm text-muted-foreground">{r.arrival}</span>, sort: (a,b)=> (a.arrival||'').localeCompare(b.arrival||'') },
    { id: 'eta', header: 'ETA', accessor: (r) => {
      const d = r.eta ? new Date(r.eta) : null;
      if (!d) return <span className="text-sm text-muted-foreground">-</span>;
      const overdue = isOverdue(d);
      return (
        <div className="text-sm">
          <div className={overdue ? 'text-destructive font-medium' : ''}>{formatDate(d)}</div>
          <div className={"text-xs " + (overdue ? 'text-destructive' : 'text-muted-foreground')}>
            {overdue ? `${daysLate(d)} days late` : formatRelative(d)}
          </div>
        </div>
      );
    }, sort: (a,b)=> (a.eta||'').localeCompare(b.eta||'') },
    { id: 'status', header: 'Status', accessor: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
    <div className="flex items-center justify-between">
        <div>
      <h1 className="text-2xl font-semibold text-foreground">Air Cargo</h1>
      <p className="text-muted-foreground mt-1">Track and manage all air cargo shipments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls,.csv';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                // Handle file upload
                console.log('Uploading file:', file.name);
              }
            };
            input.click();
          }}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button size="sm" onClick={() => setShowNewCargoDialog(true)}>
            <Plus className="h-4 w-4" />
            Add Cargo
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="sea-cargos" className="flex items-center gap-2" onClick={() => navigate('/cargos/sea')}>
            <Ship className="h-4 w-4" />
            Sea Cargos
          </TabsTrigger>
          <TabsTrigger value="air-cargos" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Air Cargos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="air-cargos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Air Cargo Management</h2>
              <p className="text-muted-foreground">Track and manage all air cargo shipments and their current status</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Containers"
              value={(dashboard?.total_containers ?? containers.length).toString()}
              icon={Plane}
              className="border-primary/20 bg-primary/5"
            />
            <MetricCard
              title="Demurraged"
              value={(dashboard?.demurrage_containers ?? 0).toString()}
              icon={AlertTriangle}
              className="border-destructive/20 bg-destructive/5"
            />
            <MetricCard
              title="In Transit"
              value={(dashboard?.containers_in_transit ?? 0).toString()}
              icon={Clock}
              className="border-blue-500/20 bg-blue-500/5"
            />
          </div>

          {/* Air Cargo Management Section */}
          <div className="logistics-card p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Air Cargo Management</h3>
              <p className="text-muted-foreground">Track and manage all air cargo shipments and their current status</p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by tracking ID or client" 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e)=> setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant={filterStatus==='all' ? 'default' : 'outline'} onClick={()=>{ setFilterStatus('all'); persistSet('air:filterStatus','all'); }}>All ({counts.all})</Button>
                <Button size="sm" variant={filterStatus==='in_transit' ? 'default' : 'outline'} onClick={()=>{ setFilterStatus('in_transit'); persistSet('air:filterStatus','in_transit'); }}>In Transit ({counts.in_transit})</Button>
                <Button size="sm" variant={filterStatus==='pending' ? 'default' : 'outline'} onClick={()=>{ setFilterStatus('pending'); persistSet('air:filterStatus','pending'); }}>Pending ({counts.pending})</Button>
                <Button size="sm" variant={filterStatus==='delivered' ? 'default' : 'outline'} onClick={()=>{ setFilterStatus('delivered'); persistSet('air:filterStatus','delivered'); }}>Delivered ({counts.delivered})</Button>
                <Button size="sm" variant={filterStatus==='delayed' ? 'default' : 'outline'} onClick={()=>{ setFilterStatus('delayed'); persistSet('air:filterStatus','delayed'); }}>Delayed ({counts.delayed})</Button>
                {(filterStatus !== 'all' || searchTerm) && (
                  <Button size="sm" variant="ghost" onClick={()=>{ setFilterStatus('all'); setSearchTerm(''); persistSet('air:filterStatus','all'); }}>
                    <RefreshCcw className="h-4 w-4 mr-1"/> Reset filters
                  </Button>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xlsx,.xls,.csv';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      console.log('Uploading file:', file.name);
                    }
                  };
                  input.click();
                }}>
                  <Upload className="h-4 w-4" />
                  Import Excel
                </Button>
                <Button size="sm" onClick={() => setShowNewCargoDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add Cargo
                </Button>
              </div>
            </div>

            <DataTable
              id="air-cargo"
              rows={rows}
              columns={columns}
              loading={loading}
              empty={<div className="text-center space-y-2 py-6"><div className="text-muted-foreground">No air cargo yet. Add Cargo or Import from Excel.</div><a className="text-primary underline text-sm" href="#" onClick={(e)=>{e.preventDefault(); const csv = "AWB Number,Airline,Route,Flight,Departure,Arrival,ETA\n000-12345678,SampleAir,PVG-ACC,SA123,2025-08-01,2025-08-02,2025-08-03"; const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='air-cargo-template.csv'; a.click(); URL.revokeObjectURL(url);}}>Download sample CSV</a></div>}
              renderBulkBar={(rows)=>(
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"><Settings className="h-4 w-4 mr-1"/>Update Status</Button>
                  <Button size="sm" variant="outline"><FileDown className="h-4 w-4 mr-1"/>Export</Button>
                  <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4 mr-1"/>Delete</Button>
                </div>
              )}
              rowActions={(row) => (
                <>
                  <DropdownMenuItem onClick={async ()=>{
                    const next: BackendCargoItem['status'] = row._raw.status === 'pending' ? 'in_transit' : (row._raw.status === 'in_transit' ? 'delivered' : 'pending');
                    try {
                      await cargoService.updateBackendCargoItem(row._raw.id, { status: next });
                      setItems((prev)=> prev.map(i=> i.id===row._raw.id ? { ...i, status: next } : i));
                      toast({ title: 'Status updated', description: `${row.tracking} → ${next.replace('_',' ')}` });
                    } catch (e: unknown) {
                      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Unable to update', variant: 'destructive' });
                    }
                  }}><Settings className="h-4 w-4 mr-2"/>Update Status</DropdownMenuItem>
                  <DropdownMenuItem><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={async ()=>{
                    if (!confirm(`Delete cargo item ${row.tracking}?`)) return;
                    try {
                      await cargoService.deleteBackendCargoItem(row._raw.id);
                      setItems((prev)=> prev.filter(i=> i.id!==row._raw.id));
                      toast({ title: 'Deleted', description: `${row.tracking} removed.` });
                    } catch (e: unknown) {
                      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Unable to delete', variant: 'destructive' });
                    }
                  }}><Trash2 className="h-4 w-4 mr-2"/>Delete</DropdownMenuItem>
                </>
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="sea-cargos" className="space-y-6">
          <div className="logistics-card p-6">
            <div className="text-center py-8">
              <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Sea Cargo Management</h3>
              <p className="text-muted-foreground">Sea cargo management will be implemented here</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

  <NewCargoContainerDialog open={showNewCargoDialog} onOpenChange={setShowNewCargoDialog} defaultType="air" />
    </div>
  );
}
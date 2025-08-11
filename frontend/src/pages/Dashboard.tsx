import { Package, Truck, Users, Ship, Plane, TrendingUp, Calendar, Plus, Upload, RefreshCcw } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { NewCargoContainerDialog } from "@/components/dialogs/NewCargoContainerDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, UserStats } from "@/services/adminService";
import { apiClient } from "@/services/api";
import type { ApiResponse, PaginatedResponse } from "@/services/api";
import type { User } from "@/services/authService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";
import { cargoService, BackendCargoContainer } from "@/services/cargoService";

type GoodsStats = { total_cbm?: number };
type CargoContainer = {
  container_id: string;
  status?: string;
  route?: string;
  eta?: string;
  client_summaries?: Array<{ client_name?: string }>;
};
type CargoDashboard = {
  containers_in_transit?: number;
  total_cargo_items?: number;
  recent_containers?: CargoContainer[];
};
// --

export default function Dashboard() {
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const queryClient = useQueryClient();

  // Admin/user stats
  const { data: userStats, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: () => adminService.getUserStats(),
  });

  // Goods statistics (admin endpoints)
  const { data: chinaStats, isLoading: loadingChina } = useQuery({
    queryKey: ["goods-stats", "china"],
    queryFn: () => apiClient.get<GoodsStats>("/api/goods/china/statistics/"),
  });
  const { data: ghanaStats, isLoading: loadingGhana } = useQuery({
    queryKey: ["goods-stats", "ghana"],
    queryFn: () => apiClient.get<GoodsStats>("/api/goods/ghana/statistics/"),
  });

  // In-transit containers (sea and air)
  const { data: seaInTransit, isLoading: loadingSea } = useQuery({
    queryKey: ["containers", "sea", "in_transit"],
    queryFn: () => cargoService.getContainers({ cargo_type: "sea", status: "in_transit" }),
  });
  const { data: airInTransit, isLoading: loadingAir } = useQuery({
    queryKey: ["containers", "air", "in_transit"],
    queryFn: () => cargoService.getContainers({ cargo_type: "air", status: "in_transit" }),
  });

  // Cargo items in transit count
  const { data: itemsInTransit } = useQuery({
    queryKey: ["cargo-items", "in_transit", "count"],
    queryFn: () => cargoService.getCargoItems({ status: "in_transit" }),
  });

  // Recent users for activity (latest)
  const { data: recentUsers, isLoading: loadingRecentUsers } = useQuery<ApiResponse<PaginatedResponse<User>>>({
    queryKey: ["recent-users"],
    queryFn: () => apiClient.get<PaginatedResponse<User>>("/api/auth/admin/users/?ordering=-date_joined"),
  });

  const stats = useMemo(() => {
    const cbmInWarehouse = (chinaStats?.data?.total_cbm || 0) + (ghanaStats?.data?.total_cbm || 0);
    const activeShipments = (seaInTransit?.data?.count || 0) + (airInTransit?.data?.count || 0);
    const totalCargoItems = itemsInTransit?.data?.count || 0; // only items currently in transit
  const activeClients = (userStats as ApiResponse<UserStats> | undefined)?.data?.active_users ?? 0;
    return { cbmInWarehouse, activeShipments, totalCargoItems, activeClients };
  }, [chinaStats, ghanaStats, seaInTransit, airInTransit, itemsInTransit, userStats]);

  const transitingCargo = useMemo(() => {
    const mapContainer = (type: "sea" | "air") => (c: BackendCargoContainer) => ({
      type,
      container: c.container_id,
      client: "-", // backend may include client_summaries; kept simple here
      route: c.route || "-",
      eta: c.eta || "-",
      status: "in-transit" as const,
    });
    const sea = (seaInTransit?.data?.results || []).map(mapContainer("sea"));
    const air = (airInTransit?.data?.results || []).map(mapContainer("air"));
    return [...sea, ...air];
  }, [seaInTransit, airInTransit]);

  const recentClientActivity = useMemo(() => {
  const users: User[] = recentUsers?.data?.results ?? [];
    return users.slice(0, 5).map((u) => ({
      name: u.full_name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
      activity: "Joined Primepre",
      time: u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "",
      status: u.is_active ? ("active" as const) : ("inactive" as const),
    }));
  }, [recentUsers]);

  const loadingStats = loadingChina || loadingGhana || loadingSea || loadingAir || loadingUsers;
  const loadingTransiting = loadingSea || loadingAir;

  type Row = {
    type: "sea" | "air";
    container: string;
    client: string;
    route: string;
    eta: string | null;
    status: "in-transit";
  };

  const rows: Row[] = transitingCargo.map(c => ({
    type: c.type,
    container: c.container,
    client: c.client,
    route: c.route,
    eta: c.eta || null,
    status: "in-transit",
  }));

  const columns: Column<Row>[] = [
    { id: "type", header: "Type", accessor: r => (
      <div className="flex items-center gap-2">
        {r.type === "sea" ? <Ship className="h-4 w-4 text-primary" /> : <Plane className="h-4 w-4 text-primary" />}
        <span className="capitalize">{r.type}</span>
      </div>
    ) },
    { id: "container", header: "Container/AWB", accessor: r => <code className="text-xs">{r.container}</code>, sort: (a,b)=>a.container.localeCompare(b.container), sticky: true },
    { id: "client", header: "Client", accessor: r => r.client, sort: (a,b)=>a.client.localeCompare(b.client) },
    { id: "route", header: "Route", accessor: r => r.route, sort: (a,b)=> (a.route||"").localeCompare(b.route||"") },
    { id: "eta", header: "ETA", accessor: r => {
      if (!r.eta) return <span className="text-sm text-muted-foreground">-</span>;
      const d = new Date(r.eta);
      const overdue = isOverdue(d);
      return (
        <div className="text-sm">
          <div className={overdue ? "text-destructive font-medium" : undefined}>{formatDate(d)}</div>
          <div className={"text-xs " + (overdue ? "text-destructive" : "text-muted-foreground")}>{overdue ? `${daysLate(d)} days late` : formatRelative(d)}</div>
        </div>
      );
    }, sort: (a,b)=> (a.eta||"").localeCompare(b.eta||"") },
    { id: "status", header: "Status", accessor: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor your logistics operations and key metrics • All times shown in your local time zone</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 days
          </Button>
          <Button size="sm" onClick={() => setShowNewCargoDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Cargo
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="logistics-card p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))
        ) : (
          <>
            <MetricCard title="CBM in Warehouse" value={stats.cbmInWarehouse.toString()} icon={Package} change={{ value: "+2.1%", type: "increase" }} />
            <MetricCard title="Active Shipments" value={stats.activeShipments.toString()} icon={Truck} change={{ value: "-1.3%", type: "decrease" }} />
            <MetricCard title="Total Cargo Items" value={stats.totalCargoItems.toString()} icon={TrendingUp} change={{ value: "+0.4%", type: "increase" }} />
            <MetricCard title="Active Clients" value={stats.activeClients.toString()} icon={Users} change={{ value: "0%", type: "neutral" }} />
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Transiting Cargo */}
        <div className="logistics-card xl:col-span-2">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cargo in Transit</h3>
              <Link to="/cargos/sea">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </div>
          <div className="p-4">
            <DataTable
              id="dashboard-transit"
              rows={rows}
              columns={columns}
              loading={loadingTransiting}
              empty={
                <div className="text-center space-y-2">
                  <div className="text-muted-foreground">No cargo currently in transit.</div>
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" onClick={() => setShowNewCargoDialog(true)}>
                      <Plus className="h-4 w-4 mr-1"/> Add Cargo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.xlsx,.xls,.csv';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) console.log('Uploading file:', file.name);
                      };
                      input.click();
                    }}>
                      <Upload className="h-4 w-4 mr-1"/> Import Excel
                    </Button>
                  </div>
                  <a className="text-primary underline text-sm" href="#" onClick={(e)=>{e.preventDefault(); const csv = "Tracking ID,Type,Container/AWB,Client,Route,ETA\nAA-0001,Air,000-12345678,Sample Client,PVG-ACC,2025-08-15"; const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='transit-template.csv'; a.click(); URL.revokeObjectURL(url);}}>Download sample CSV</a>
                </div>
              }
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="logistics-card">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentClientActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">{activity.activity}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                        <StatusBadge status={activity.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

  <NewCargoContainerDialog open={showNewCargoDialog} onOpenChange={(o)=>{
    setShowNewCargoDialog(o);
    if (!o) {
      // refresh after closing if created
      queryClient.invalidateQueries({ queryKey: ["containers", "sea", "in_transit"] });
      queryClient.invalidateQueries({ queryKey: ["containers", "air", "in_transit"] });
      queryClient.invalidateQueries({ queryKey: ["cargo-items", "in_transit", "count"] });
      queryClient.invalidateQueries({ queryKey: ["goods-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-stats"] });
    }
  }} />
    </div>
  );
}
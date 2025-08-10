import { Package, Truck, Users, Ship, Plane, TrendingUp, Calendar, Plus } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { NewShipmentDialog } from "@/components/dialogs/NewShipmentDialog";
import { useQuery } from "@tanstack/react-query";
import { adminService, UserStats } from "@/services/adminService";
import { apiClient } from "@/services/api";
import type { ApiResponse, PaginatedResponse } from "@/services/api";
import type { User } from "@/services/authService";

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
  const [showNewShipmentDialog, setShowNewShipmentDialog] = useState(false);

  // Admin/user stats
  const { data: userStats } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: () => adminService.getUserStats(),
  });

  // Goods statistics (admin endpoints)
  const { data: chinaStats } = useQuery({
    queryKey: ["goods-stats", "china"],
    queryFn: () => apiClient.get<GoodsStats>("/api/goods/china/statistics/"),
  });
  const { data: ghanaStats } = useQuery({
    queryKey: ["goods-stats", "ghana"],
    queryFn: () => apiClient.get<GoodsStats>("/api/goods/ghana/statistics/"),
  });

  // Cargo dashboard (sea and air)
  const { data: seaCargo } = useQuery({
    queryKey: ["cargo-dashboard", "sea"],
    queryFn: () => apiClient.get<CargoDashboard>("/api/cargo/dashboard/?cargo_type=sea"),
  });
  const { data: airCargo } = useQuery({
    queryKey: ["cargo-dashboard", "air"],
    queryFn: () => apiClient.get<CargoDashboard>("/api/cargo/dashboard/?cargo_type=air"),
  });

  // Recent users for activity (latest)
  const { data: recentUsers } = useQuery<ApiResponse<PaginatedResponse<User>>>({
    queryKey: ["recent-users"],
    queryFn: () => apiClient.get<PaginatedResponse<User>>("/api/auth/admin/users/?ordering=-date_joined"),
  });

  const stats = useMemo(() => {
    const cbmInWarehouse = (chinaStats?.data?.total_cbm || 0) + (ghanaStats?.data?.total_cbm || 0);
    const activeShipments = (seaCargo?.data?.containers_in_transit || 0) + (airCargo?.data?.containers_in_transit || 0);
    const totalCargoItems = (seaCargo?.data?.total_cargo_items || 0) + (airCargo?.data?.total_cargo_items || 0);
  const activeClients = (userStats as ApiResponse<UserStats> | undefined)?.data?.active_users ?? 0;
    return { cbmInWarehouse, activeShipments, totalCargoItems, activeClients };
  }, [chinaStats, ghanaStats, seaCargo, airCargo, userStats]);

  const transitingCargo = useMemo(() => {
    const mapContainer = (type: "sea" | "air") => (c: CargoContainer) => ({
      id: c.container_id,
      type,
      container: c.container_id,
      client: c.client_summaries?.[0]?.client_name || "-",
      route: c.route || "-",
      eta: c.eta || "-",
      status: "in-transit" as const,
    });
    const sea = (seaCargo?.data?.recent_containers || [])
      .filter((c) => c.status === "in_transit")
      .map(mapContainer("sea"));
    const air = (airCargo?.data?.recent_containers || [])
      .filter((c) => c.status === "in_transit")
      .map(mapContainer("air"));
    return [...sea, ...air].slice(0, 10);
  }, [seaCargo, airCargo]);

  const recentClientActivity = useMemo(() => {
  const users: User[] = recentUsers?.data?.results ?? [];
    return users.slice(0, 5).map((u) => ({
      name: u.full_name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
      activity: "Joined Primepre",
      time: u.date_joined ? new Date(u.date_joined).toLocaleDateString() : "",
      status: u.is_active ? ("active" as const) : ("inactive" as const),
    }));
  }, [recentUsers]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Monitor your logistics operations and key metrics</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 days
          </Button>
          <Button size="sm" onClick={() => setShowNewShipmentDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Shipment
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="CBM in Warehouse" value={stats.cbmInWarehouse.toString()} icon={Package} />
        <MetricCard title="Active Shipments" value={stats.activeShipments.toString()} icon={Truck} />
        <MetricCard title="Total Cargo Items" value={stats.totalCargoItems.toString()} icon={TrendingUp} />
        <MetricCard title="Active Clients" value={stats.activeClients.toString()} icon={Users} />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Transiting Cargo */}
        <div className="logistics-card xl:col-span-2">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cargo in Transit</h3>
              <Link to="/cargos/sea">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="logistics-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Type</th>
                  <th>Container/AWB</th>
                  <th>Client</th>
                  <th>Route</th>
                  <th>ETA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transitingCargo.map((cargo) => (
                  <tr key={cargo.id} className="hover:bg-muted/50">
                    <td className="font-medium">{cargo.id}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {cargo.type === "sea" ? (
                          <Ship className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Plane className="h-4 w-4 text-green-500" />
                        )}
                        <span className="capitalize">{cargo.type}</span>
                      </div>
                    </td>
                    <td className="font-mono text-sm">{cargo.container}</td>
                    <td>{cargo.client}</td>
                    <td>{cargo.route}</td>
                    <td>{cargo.eta}</td>
                    <td>
                      <StatusBadge status={cargo.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <NewShipmentDialog open={showNewShipmentDialog} onOpenChange={setShowNewShipmentDialog} />
    </div>
  );
}
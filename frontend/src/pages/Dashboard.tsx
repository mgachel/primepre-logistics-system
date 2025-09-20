import {
  Package,
  Truck,
  Ship,
  Plane,
  TrendingUp,
  Calendar,
  Plus,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { NewCargoContainerDialog } from "@/components/dialogs/NewCargoContainerDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { apiClient } from "@/services/api";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelative, isOverdue, daysLate } from "@/lib/date";
import { cargoService } from "@/services/cargoService";
import { dashboardService } from "@/services/dashboardService";
import { claimsService } from "@/services/claimsService";
import { useAuthStore } from "@/stores/authStore";

type GoodsStats = { total_cbm?: number };
type CargoContainer = {
  container_id: string;
  status?: string;
  route?: string;
  eta?: string;
  client_summaries?: Array<{ client_name?: string }>;
  cargo_type?: string;
  container_number?: string;
  client_name?: string;
  customer_name?: string;
};

export default function Dashboard() {
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Helper functions for role checking (matching authStore logic)
  const isCustomer = useMemo(() => user?.user_role === 'CUSTOMER', [user?.user_role]);
  const isAdmin = useMemo(() => user && user.user_role && ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role), [user]);
  const isManager = useMemo(() => user?.user_role === 'MANAGER', [user?.user_role]);

  console.log('🔍 Dashboard Debug:', {
    user: user,
    userRole: user?.user_role,
    isAdmin: isAdmin,
    isCustomer: isCustomer
  });

  // Single unified dashboard query based on user role
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data", user?.user_role, user?.id], // Include user ID to prevent cross-user caching
    queryFn: () => {
      console.log('📊 Fetching dashboard data for role:', user?.user_role);
      return dashboardService.getDashboard(user?.user_role || "CUSTOMER");
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  console.log('📊 Dashboard data received:', dashboardData);

  // Customer-specific claims (only load for customers)
  const { data: customerClaims, isLoading: loadingClaims } = useQuery({
    queryKey: ["customer-claims", user?.id], // Include user ID to prevent cross-user caching
    queryFn: () => claimsService.getCustomerClaims(),
    enabled: isCustomer && !!user,
    staleTime: 10 * 60 * 1000, // Cache longer for claims
  });

  // Admin-only user stats (only load for admin/manager roles)
  const { data: userStats, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: () => adminService.getUserStats(),
    enabled: (isAdmin || isManager) && !!user,
    staleTime: 15 * 60 * 1000, // Cache longer for admin stats
  });

  // Role-based goods statistics - single query instead of separate china/ghana
  const { data: goodsStats, isLoading: loadingGoods } = useQuery({
    queryKey: ["goods-stats", user?.user_role, user?.id], // Include user ID for customer personal stats
    queryFn: async () => {
      if (isCustomer) {
        // For customers: China = personal stats, Ghana = all warehouse stats (since customers can see all Ghana goods)
        const [china, ghana] = await Promise.all([
          apiClient.get<GoodsStats>("/api/customer/goods/china/my_statistics/"),
          apiClient.get<GoodsStats>("/api/customer/goods/ghana/statistics/") // Use general stats since customers see all Ghana goods
        ]);
        return { china: china.data, ghana: ghana.data };
      } else {
        // For admin/staff, get overall stats
        const [china, ghana] = await Promise.all([
          apiClient.get<GoodsStats>("/api/goods/china/statistics/"),
          apiClient.get<GoodsStats>("/api/goods/ghana/statistics/")
        ]);
        return { china: china.data, ghana: ghana.data };
      }
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  // Simplified container query - only load what's needed for the role
  const { data: containerData, isLoading: loadingContainers } = useQuery({
    queryKey: ["containers-summary", user?.user_role],
    queryFn: async () => {
      if (isCustomer) {
        // Customers only see their own containers
        const containers = await cargoService.getCustomerContainers({ 
          status: "in_transit",
          page_size: 10 // Limit to first 10 for performance
        });
        return {
          inTransit: containers.data?.results || [],
          seaCount: containers.data?.results?.filter((c: CargoContainer) => c.cargo_type === 'sea').length || 0,
          airCount: containers.data?.results?.filter((c: CargoContainer) => c.cargo_type === 'air').length || 0,
          total: containers.data?.count || 0
        };
      } else {
        // Admin/staff get actual transit containers with limited count
        const [sea, air] = await Promise.all([
          cargoService.getContainers({ cargo_type: "sea", status: "in_transit", page_size: 10 }),
          cargoService.getContainers({ cargo_type: "air", status: "in_transit", page_size: 10 })
        ]);
        
        // Combine the actual container data for display
        const seaContainers = sea.data?.results || [];
        const airContainers = air.data?.results || [];
        const allTransitContainers = [...seaContainers, ...airContainers];
        
        return {
          inTransit: allTransitContainers, // Load actual containers for display
          seaCount: sea.data?.count || 0,
          airCount: air.data?.count || 0,
          total: (sea.data?.count || 0) + (air.data?.count || 0)
        };
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Recent activity (lighter query, only for admin/staff)
  const { data: recentActivity, isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => dashboardService.getRecentActivity(),
    enabled: !isCustomer && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const stats = useMemo(() => {
    // Use the optimized goodsStats instead of separate china/ghana queries
    const cbmInWarehouse =
      (goodsStats?.china?.total_cbm || 0) + (goodsStats?.ghana?.total_cbm || 0);
    
    // Use the optimized containerData instead of separate sea/air queries
    const activeShipments = containerData?.total || 0;
    
    // For customers, get items from dashboard data; for admins, use separate query if needed
    const totalCargoItems = dashboardData?.data?.cargo_items_count || 0;
    
    const activeClients = userStats?.data?.active_users ?? 0;

    // Delayed/Demurrage containers from the limited container data
    const delayedContainers = containerData?.inTransit?.filter(c => {
      if (!c.eta) return false;
      const etaDate = new Date(c.eta);
      return isOverdue(etaDate);
    }).length || 0;

    // Calculate pending claims for customers
    const pendingClaims = isCustomer 
      ? (customerClaims?.success && customerClaims.data 
          ? customerClaims.data.filter(claim => claim.status === 'PENDING').length 
          : 0)
      : 0;

    return { cbmInWarehouse, activeShipments, totalCargoItems, activeClients, pendingClaims, delayedContainers };
  }, [
    goodsStats,
    containerData,
    dashboardData,
    userStats,
    customerClaims,
    isCustomer,
  ]);

  // Simplified loading states
  const loadingStats = loadingGoods || loadingContainers || loadingUsers || (isCustomer && loadingClaims);
  const loadingTransiting = loadingContainers;

  // Combine container data for the transiting cargo table
  const transitingCargo = useMemo(() => {
    console.log('🚚 Processing transit cargo data:', containerData);
    
    if (!containerData?.inTransit) {
      console.log('⚠️ No inTransit data available');
      return [];
    }
    
    console.log('🚚 InTransit containers:', containerData.inTransit);
    
    return containerData.inTransit.map((container: CargoContainer) => {
      const containerNumber = container.container_number || 
                              container.container_id || 
                              container.awb_number || 
                              container.tracking_number ||
                              container.number ||
                              container.id || 
                              'N/A';
      
      return {
        type: container.cargo_type || 'sea',
        container: containerNumber,
        client: container.client_name || container.customer_name || container.client || '-',
        route: container.route || container.origin_destination || '-',
        eta: container.eta || container.estimated_arrival || null,
      };
    });
  }, [containerData]);

  // Transform recent activity data for the UI
  const recentEvents = useMemo(() => {
    if (!recentActivity?.data) return [];
    
    // Assuming recentActivity.data is an array of activity items
    const activities = Array.isArray(recentActivity.data) ? recentActivity.data : [];
    
    return activities.map((activity: Record<string, unknown>) => ({
      title: activity.title as string || activity.description as string || 'Activity',
      detail: activity.detail as string || activity.message as string || '',
      when: activity.timestamp as string || activity.created_at as string || activity.date as string,
      status: activity.status as string || 'completed',
    }));
  }, [recentActivity]);

  type Row = {
    type: "sea" | "air";
    container: string;
    client: string;
    route: string;
    eta: string | null;
    status: "in-transit";
  };

  const rows: Row[] = transitingCargo.filter(Boolean).map((c) => ({
    type: c?.type || 'sea',
    container: c?.container || '',
    client: c?.client || '-',
    route: c?.route || '-',
    eta: c?.eta || null,
    status: "in-transit",
  }));

  const columns: Column<Row>[] = [
    {
      id: "type",
      header: "Type",
      accessor: (r) => (
        <div className="flex items-center gap-2">
          {r.type === "sea" ? (
            <Ship className="h-4 w-4 text-primary" />
          ) : (
            <Plane className="h-4 w-4 text-primary" />
          )}
          <span className="capitalize">{r.type}</span>
        </div>
      ),
    },
    {
      id: "container",
      header: "Container/AWB",
      accessor: (r) => <code className="text-xs">{r.container}</code>,
      sort: (a, b) => a.container.localeCompare(b.container),
      sticky: true,
    },
    {
      id: "client",
      header: "Client",
      accessor: (r) => r.client,
      sort: (a, b) => a.client.localeCompare(b.client),
    },
    {
      id: "route",
      header: "Route",
      accessor: (r) => r.route,
      sort: (a, b) => (a.route || "").localeCompare(b.route || ""),
    },
    {
      id: "eta",
      header: "ETA",
      accessor: (r) => {
        if (!r.eta)
          return <span className="text-sm text-muted-foreground">-</span>;
        const d = new Date(r.eta);
        const overdue = isOverdue(d);
        return (
          <div className="text-sm">
            <div
              className={overdue ? "text-destructive font-medium" : undefined}
            >
              {formatDate(d)}
            </div>
            <div
              className={
                "text-xs " +
                (overdue ? "text-destructive" : "text-muted-foreground")
              }
            >
              {overdue ? `${daysLate(d)} days late` : formatRelative(d)}
            </div>
          </div>
        );
      },
      sort: (a, b) => (a.eta || "").localeCompare(b.eta || ""),
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your logistics operations and key metrics • All times shown
            in your local time zone
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            This Month
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingStats ? (
          Array.from({ length: isCustomer ? 4 : 4 }).map((_, i) => (
            <div key={i} className="logistics-card p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))
        ) : (
          <>
            {isCustomer ? (
              // Customer Dashboard Cards
              <>
                <MetricCard
                  title="CBM in Warehouse"
                  value={stats.cbmInWarehouse.toString()}
                  icon={Package}
                  change={{ value: "+2.1%", type: "increase" }}
                />
                <MetricCard
                  title="Active Shipments"
                  value={stats.activeShipments.toString()}
                  icon={Truck}
                  change={{ value: "-1.3%", type: "decrease" }}
                />
                <Link to="/my-claims" className="block">
                  <MetricCard
                    title="Pending Claims"
                    value={stats.pendingClaims.toString()}
                    icon={AlertTriangle}
                    change={{ 
                      value: stats.pendingClaims > 0 ? "Requires attention" : "All resolved", 
                      type: stats.pendingClaims > 0 ? "decrease" : "neutral" 
                    }}
                  />
                </Link>
                <MetricCard
                  title="Total Cargo Items"
                  value={stats.totalCargoItems.toString()}
                  icon={TrendingUp}
                  change={{ value: "+0.4%", type: "increase" }}
                />
              </>
            ) : (
              // Admin Dashboard Cards
              <>
                <MetricCard
                  title="Total Containers"
                  value={stats.activeShipments.toString()}
                  icon={Package}
                  change={{ value: "+2.1%", type: "increase" }}
                />
                <MetricCard
                  title="In Transit"
                  value={stats.activeShipments.toString()}
                  icon={Truck}
                  change={{ value: "-1.3%", type: "decrease" }}
                />
                <MetricCard
                  title="Total CBM"
                  value={Number(stats.cbmInWarehouse).toFixed(4)}
                  icon={TrendingUp}
                  change={{ value: "+0.4%", type: "increase" }}
                />
                <MetricCard
                  title="Active Clients"
                  value={stats.activeClients.toString()}
                  icon={AlertTriangle}
                  change={{ value: "+12.5%", type: "increase" }}
                />
              </>
            )}
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
                <Button variant="ghost" size="sm">
                  View All
                </Button>
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
                  <div className="text-muted-foreground">
                    No cargo currently in transit.
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowNewCargoDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Cargo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".xlsx,.xls,.csv";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) console.log("Uploading file:", file.name);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" /> Import Excel
                    </Button>
                  </div>
                  <a
                    className="text-primary underline text-sm"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const csv =
                        "Type,Container/AWB,Client,Route,ETA\nAir,000-12345678,Sample Client,PVG-ACC,2025-08-15";
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "transit-template.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download sample CSV
                  </a>
                </div>
              }
            />
          </div>
        </div>

        {/* Recent Activity - Only show for admin/manager users */}
        {!isCustomer && (
          <div>
            <div className="logistics-card">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
              </div>
              <div className="p-6">
                {loadingRecent ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="w-2 h-2 rounded-full mt-2" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-40 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentEvents.length > 0 ? recentEvents.map((e, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{e.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {e.detail}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {e.when  
                                ? new Date(e.when).toLocaleDateString()
                                : ""}
                            </span>
                            <StatusBadge status={e.status === 'completed' ? 'completed' : 'pending'} />
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-muted-foreground">
                        No recent activity
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Customer-specific quick actions */}
        {isCustomer && (
          <div>
            <div className="logistics-card">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <Link to="/track" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="h-4 w-4 mr-2" />
                    Track Shipment
                  </Button>
                </Link>
                <Link to="/my-claims" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    File Claim
                  </Button>
                </Link>
                <Link to="/cargo/upload" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <NewCargoContainerDialog
        open={showNewCargoDialog}
        onOpenChange={(o) => {
          setShowNewCargoDialog(o);
          if (!o) {
            // Refresh the optimized queries after closing if created
            queryClient.invalidateQueries({
              queryKey: ["dashboard-data"],
            });
            queryClient.invalidateQueries({
              queryKey: ["goods-stats"],
            });
            queryClient.invalidateQueries({
              queryKey: ["containers-summary"],
            });
            queryClient.invalidateQueries({ 
              queryKey: ["admin-user-stats"] 
            });
            queryClient.invalidateQueries({ 
              queryKey: ["recent-activity"] 
            });
          }
        }}
      />
    </div>
  );
}

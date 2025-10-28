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
  RefreshCw,
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
// ...existing code...

export default function Dashboard() {
  const [showNewCargoDialog, setShowNewCargoDialog] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Helper functions for role checking
  const isCustomer = useMemo(() => user?.user_role === 'CUSTOMER', [user?.user_role]);
  const isAdmin = useMemo(() => user && user.user_role && ['ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'].includes(user.user_role), [user]);
  // Explicit manager check (was referenced later but not defined)
  const isManager = useMemo(() => user?.user_role === 'MANAGER', [user?.user_role]);

  // Define primary color based on user role
  const primaryColor = isCustomer ? "#4FC3F7" : "#00703D"; // Light blue for customers, green for others

  // Single unified dashboard query based on user role
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data", user?.user_role, user?.id], // Include user ID to prevent cross-user caching
    queryFn: () => {
      console.log('📊 Fetching dashboard data for role:', user?.user_role);
      return dashboardService.getDashboard(user?.user_role || "CUSTOMER").catch((err) => {
        console.error('Dashboard fetch failed:', err);
        // Return a safe empty shape so the UI can render without throwing
        return { data: { cargo_items_count: 0 }, success: false, message: String(err) };
      });
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
          limit: 10 // Limit to first 10 for performance (mapped to page_size by service)
        });
        const results: any[] = containers.data?.results || [];
        return {
          inTransit: results,
          seaCount: results.filter((c: any) => c.cargo_type === 'sea').length || 0,
          airCount: results.filter((c: any) => c.cargo_type === 'air').length || 0,
          total: containers.data?.count || 0
        };
      } else {
        // Admin/staff get actual transit containers with limited count
        const [sea, air] = await Promise.all([
          cargoService.getContainers({ cargo_type: "sea", status: "in_transit" }),
          cargoService.getContainers({ cargo_type: "air", status: "in_transit" })
        ]);
        
        // Combine the actual container data for display
  const seaContainers: any[] = sea.data?.results || [];
  const airContainers: any[] = air.data?.results || [];
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



  const stats = useMemo(() => {
    // Use the optimized goodsStats instead of separate china/ghana queries
    const cbmInWarehouse =
      (goodsStats?.china?.total_cbm || 0) + (goodsStats?.ghana?.total_cbm || 0);
    
    // Use the optimized containerData instead of separate sea/air queries
    const activeShipments = containerData?.total || 0;
    
    // For customers, get items from dashboard data; for admins, use separate query if needed
    // dashboardData may be shaped differently for customer vs admin
    let totalCargoItems = 0;
    if (dashboardData?.data) {
      // Customer dashboard returns .stats while admin returns top-level totals — handle both
      if ("stats" in dashboardData.data && (dashboardData.data as any).stats) {
        totalCargoItems = (dashboardData.data as any).stats.total_cargo_items ?? 0;
      } else {
        totalCargoItems = (dashboardData.data as any).total_cargo_items ?? 0;
      }
    }
    
    const activeClients = userStats?.data?.active_users ?? 0;

    // Delayed/Demurrage containers from the limited container data
    const delayedContainers = (containerData?.inTransit || []).filter((c: any) => {
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
    if (!containerData?.inTransit) return [];
    return (containerData.inTransit as any[]).map((container: any) => ({
      type: (container.cargo_type === 'air' ? 'air' : 'sea') as "sea" | "air",
      container: container.container_number || container.container_id || 'N/A',
      client: container.client_name || container.customer_name || '-',
      route: container.route || '-',
      eta: container.eta || null,
    }));
  }, [containerData]);



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
            <Ship className="h-4 w-4" style={{ color: primaryColor }} />
          ) : (
            <Plane className="h-4 w-4" style={{ color: primaryColor }} />
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
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm lg:text-base">
            Monitor your logistics operations and key metrics • All times shown
            in your local time zone
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="justify-center"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <Calendar className="h-4 w-4 sm:mr-2" style={{ color: primaryColor }} />
            <span className="hidden sm:inline">This Month</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries()}
            className="justify-center"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <RefreshCw className="h-4 w-4 sm:mr-2" style={{ color: primaryColor }} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard
          title="CBM in Warehouse"
          value={loadingStats ? <Skeleton className="h-6 w-20" /> : String(stats.cbmInWarehouse ?? 0)}
          icon={Package}
          iconColor={primaryColor}
        />
        <MetricCard
          title="Active Shipments"
          value={loadingStats ? <Skeleton className="h-6 w-12" /> : String(stats.activeShipments ?? 0)}
          icon={Truck}
          iconColor={primaryColor}
        />
        <MetricCard
          title="Total Cargo Items"
          value={loadingStats ? <Skeleton className="h-6 w-16" /> : String(stats.totalCargoItems ?? 0)}
          icon={TrendingUp}
          iconColor={primaryColor}
        />
        <MetricCard
          title="Pending Claims"
          value={loadingStats ? <Skeleton className="h-6 w-8" /> : String(stats.pendingClaims ?? 0)}
          icon={AlertTriangle}
          iconColor={primaryColor}
        />
      </div>

      {/* Content Grid */}
      <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${isCustomer ? 'xl:grid-cols-3' : ''}`}>
        {/* Transiting Cargo */}
        <div className={`logistics-card ${isCustomer ? 'xl:col-span-2' : ''}`}>
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
                      <Plus className="h-4 w-4 mr-1" style={{ color: primaryColor }} /> Add Cargo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".xlsx,.xls,.csv";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) console.log("Uploading file:", file.name);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" style={{ color: primaryColor }} /> Import Excel
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
          }
        }}
      />
    </div>
  );
}

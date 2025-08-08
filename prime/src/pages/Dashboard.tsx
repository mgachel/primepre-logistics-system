import { 
  Package, 
  Truck, 
  DollarSign, 
  Users, 
  Ship, 
  Plane,
  TrendingUp,
  Calendar,
  Plus
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { NewShipmentDialog } from "@/components/dialogs/NewShipmentDialog";

export default function Dashboard() {
  const [showNewShipmentDialog, setShowNewShipmentDialog] = useState(false);

  // Static dashboard data
  const dashboardData = {
    stats: {
      cbmInWarehouse: 2847,
      activeShipments: 18,
      revenueThisMonth: "$124,750",
      activeClients: 64
    },
    transitingCargo: [
      {
        id: "TC001",
        type: "sea",
        container: "MSKU7823456",
        client: "Global Traders Ltd",
        route: "Shanghai → Tema",
        eta: "2024-08-15",
        status: "in-transit"
      },
      {
        id: "TC002",
        type: "air",
        container: "AWB98765432",
        client: "Express Imports",
        route: "Guangzhou → Accra",
        eta: "2024-08-05",
        status: "delayed"
      }
    ],
    recentClientActivity: [
      {
        name: "Global Traders Ltd",
        activity: "New shipment created",
        time: "2 hours ago",
        status: "active"
      },
      {
        name: "Express Imports",
        activity: "Payment received",
        time: "4 hours ago",
        status: "active"
      },
      {
        name: "West African Supplies",
        activity: "Documents uploaded",
        time: "1 day ago",
        status: "pending"
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your logistics operations and key metrics
          </p>
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
        <MetricCard
          title="CBM in Warehouse"
          value={dashboardData.stats.cbmInWarehouse.toString()}
          change={{ value: "+12% from last month", type: "increase" }}
          icon={Package}
        />
        <MetricCard
          title="Active Shipments"
          value={dashboardData.stats.activeShipments.toString()}
          change={{ value: "+3 new this week", type: "increase" }}
          icon={Truck}
        />
        <MetricCard
          title="Revenue This Month"
          value={dashboardData.stats.revenueThisMonth}
          change={{ value: "+8% from last month", type: "increase" }}
          icon={DollarSign}
        />
        <MetricCard
          title="Active Clients"
          value={dashboardData.stats.activeClients.toString()}
          change={{ value: "2 new this week", type: "neutral" }}
          icon={Users}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Transiting Cargo */}
        <div className="xl:col-span-2">
          <div className="logistics-card">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cargo in Transit</h3>
                <Link to="/cargos/sea">
                  <Button variant="ghost" size="sm">View All</Button>
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
                  {dashboardData.transitingCargo.map((cargo) => (
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
        </div>

        {/* Recent Activity */}
        <div>
          <div className="logistics-card">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData.recentClientActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">{activity.activity}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                        <StatusBadge status={activity.status} size="sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewShipmentDialog 
        open={showNewShipmentDialog} 
        onOpenChange={setShowNewShipmentDialog} 
      />
    </div>
  );
}
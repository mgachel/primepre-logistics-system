import { useEffect, useMemo, useState } from "react";
import { Ship, Plane, AlertTriangle, Clock, Plus, Search, Filter, Upload, MapPin } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewAirCargoDialog } from "@/components/dialogs/NewAirCargoDialog";
import { ContainerDetailsDialog } from "@/components/dialogs/ContainerDetailsDialog";
import { useNavigate } from "react-router-dom";
import { cargoService, BackendCargoContainer, BackendCargoItem, CargoDashboardStats } from "@/services/cargoService";

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
  const [activeTab, setActiveTab] = useState("air-cargos");
  const [showNewAirCargoDialog, setShowNewAirCargoDialog] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<AirCargoItem | null>(null);
  const [showContainerDetails, setShowContainerDetails] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BackendCargoItem[]>([]);
  const [containers, setContainers] = useState<BackendCargoContainer[]>([]);
  const [dashboard, setDashboard] = useState<CargoDashboardStats | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cargo Management</h1>
          <p className="text-muted-foreground">Track and manage all cargo shipments</p>
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
          <Button size="sm" onClick={() => setShowNewAirCargoDialog(true)}>
            <Plus className="h-4 w-4" />
            Quick Create
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
              <h2 className="text-2xl font-semibold text-foreground">Air Cargos</h2>
              <p className="text-muted-foreground">Manage air cargoes attached to your shipping agency</p>
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
          <div className="logistics-card p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Air Cargo Management</h3>
                <p className="text-muted-foreground">Track and manage all air cargo shipments and their current status</p>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by container ID, route, or dates" 
                    className="pl-10"
                  />
                </div>
                <Select>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="transit">In Transit</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Add Cargo
                </Button>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input 
                          type="checkbox" 
                          className="rounded"
                          aria-label="Select all air cargo"
                          title="Select all air cargo"
                        />
                      </TableHead>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>AWB Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Airline</TableHead>
                      <TableHead>Flight</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Arrival</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-destructive">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No air cargo data available. Start by adding your first cargo shipment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((cargo) => (
                        <TableRow 
                          key={cargo.id}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            // Map cargo item to container details dialog shape
                            const mapped: AirCargoItem = {
                              id: cargo.tracking_id || cargo.id,
                              awbNumber: cargo.tracking_id || '-',
                              client: cargo.client_name || cargo.client?.toString() || '-',
                              origin: '-',
                              destination: '-',
                              airline: '-',
                              flightNumber: '-',
                              departureDate: '-',
                              arrivalDate: '-',
                              weight: cargo.weight ? `${cargo.weight} kg` : '-',
                              volume: String(cargo.cbm ?? 0),
                              goods: cargo.item_description,
                              status: cargo.status === 'in_transit' ? 'in-transit' : (cargo.status === 'delivered' ? 'delivered' : cargo.status === 'pending' ? 'pending' : 'delayed'),
                              notes: '',
                            };
                            setSelectedContainer(mapped);
                            setShowContainerDetails(true);
                          }}
                        >
                          <TableCell>
                            <input 
                              type="checkbox" 
                              className="rounded"
                              aria-label={`Select ${cargo.id}`}
                              title={`Select cargo ${cargo.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{cargo.tracking_id || cargo.id}</TableCell>
                          <TableCell className="font-mono text-sm">{cargo.tracking_id || '-'}</TableCell>
                          <TableCell>{cargo.client_name || cargo.client}</TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                              -
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">-</TableCell>
                          <TableCell className="text-sm">-</TableCell>
                          <TableCell className="text-sm">-</TableCell>
                          <TableCell className="text-sm">-</TableCell>
                          <TableCell>
                            <Badge 
                              variant={cargo.status === "in_transit" ? "default" : "secondary"}
                              className={cargo.status === "in_transit" ? "bg-blue-100 text-blue-800" : ""}
                            >
                              {cargo.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
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

      <NewAirCargoDialog 
        open={showNewAirCargoDialog} 
        onOpenChange={setShowNewAirCargoDialog} 
      />
    </div>
  );
}
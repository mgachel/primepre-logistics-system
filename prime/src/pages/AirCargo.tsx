import { useState } from "react";
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

  // Static air cargo data
  const airCargo = [
    {
      id: "AC001",
      awbNumber: "123-45678901",
      client: "Express Imports Co.",
      origin: "Guangzhou Baiyun International Airport",
      destination: "Kotoka International Airport",
      airline: "Ethiopian Airlines",
      flightNumber: "ET920",
      departureDate: "2024-08-01",
      arrivalDate: "2024-08-02",
      weight: "500 kg",
      volume: "2.5",
      goods: "Electronics & Documents",
      status: "in-transit" as const,
      notes: "Priority shipment for urgent delivery"
    },
    {
      id: "AC002",
      awbNumber: "123-45678902",
      client: "Global Traders Ltd",
      origin: "Shanghai Pudong International Airport",
      destination: "Kotoka International Airport",
      airline: "Turkish Airlines",
      flightNumber: "TK672",
      departureDate: "2024-08-03",
      arrivalDate: "2024-08-04",
      weight: "750 kg",
      volume: "3.2",
      goods: "Textiles & Samples",
      status: "pending" as const,
      notes: "Samples for trade show"
    }
  ];

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
              value={airCargo.length.toString()}
              icon={Plane}
              className="border-primary/20 bg-primary/5"
            />
            <MetricCard
              title="Demurraged"
              value="0"
              icon={AlertTriangle}
              className="border-destructive/20 bg-destructive/5"
            />
            <MetricCard
              title="In Transit"
              value={airCargo.filter(c => c.status === "in-transit").length.toString()}
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
                    {airCargo.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No air cargo data available. Start by adding your first cargo shipment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      airCargo.map((cargo) => (
                        <TableRow 
                          key={cargo.id}
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedContainer(cargo);
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
                          <TableCell className="font-medium">{cargo.id}</TableCell>
                          <TableCell className="font-mono text-sm">{cargo.awbNumber}</TableCell>
                          <TableCell>{cargo.client}</TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <MapPin className="h-3 w-3 mr-1 text-muted-foreground" />
                              {cargo.origin.split(' ')[0]} → {cargo.destination.split(' ')[0]}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{cargo.airline}</TableCell>
                          <TableCell className="text-sm">{cargo.flightNumber}</TableCell>
                          <TableCell className="text-sm">{cargo.departureDate}</TableCell>
                          <TableCell className="text-sm">{cargo.arrivalDate}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={cargo.status === "in-transit" ? "default" : "secondary"}
                              className={cargo.status === "in-transit" ? "bg-blue-100 text-blue-800" : ""}
                            >
                              {cargo.status.replace("-", " ").toUpperCase()}
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
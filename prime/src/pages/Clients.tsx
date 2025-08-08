import { useState } from "react";
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

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);

  // Static clients data
  const clients = [
    {
      id: "CL001",
      name: "Global Traders Ltd",
      email: "contact@globaltraders.com",
      phone: "+233 24 123 4567",
      totalShipments: 24,
      activeShipments: 3,
      totalValue: "$45,600",
      status: "active" as const,
      lastActivity: "2024-08-01",
      location: "Accra, Ghana",
    },
    {
      id: "CL002", 
      name: "Express Imports Co.",
      email: "info@expressimports.gh",
      phone: "+233 20 987 6543",
      totalShipments: 18,
      activeShipments: 1,
      totalValue: "$32,400",
      status: "active" as const,
      lastActivity: "2024-07-30",
      location: "Kumasi, Ghana",
    },
    {
      id: "CL003",
      name: "West African Supplies",
      email: "admin@wasupplies.com", 
      phone: "+233 26 555 7890",
      totalShipments: 42,
      activeShipments: 5,
      totalValue: "$78,900",
      status: "active" as const,
      lastActivity: "2024-08-01",
      location: "Tema, Ghana",
    },
    {
      id: "CL004",
      name: "Modern Electronics",
      email: "sales@modernelec.gh",
      phone: "+233 23 444 1122",
      totalShipments: 6,
      activeShipments: 0,
      totalValue: "$15,200",
      status: "inactive" as const,
      lastActivity: "2024-06-15",
      location: "Takoradi, Ghana",
    },
  ];

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || client.status === filterStatus;
    return matchesSearch && matchesFilter;
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
                <th>Location</th>
                <th>Shipments</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted-foreground">
                    No clients found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
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
                      <div className="text-sm">{client.location}</div>
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
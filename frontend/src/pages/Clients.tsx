import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Trash2,
  Mail,
  History,
  Briefcase,
  RefreshCcw,
  ShieldX,
  ShieldCheck,
  MessageSquare,
  Upload,
} from "lucide-react";
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
import { SendMessageDialog } from "@/components/dialogs/SendMessageDialog";
import { CustomerExcelUploadDialog } from "@/components/dialogs/CustomerExcelUploadDialog";
import { useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import type { User } from "@/services/authService";
import { DataTable, Column } from "@/components/data-table/DataTable";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatDate } from "@/lib/date";
import { persistGet, persistSet } from "@/lib/persist";
import { cargoService, BackendCargoItem } from "@/services/cargoService";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Refresh handler for dashboard-related queries
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    queryClient.invalidateQueries({ queryKey: ["goods-stats"] });
    queryClient.invalidateQueries({ queryKey: ["containers-summary"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-stats"] });
    queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    queryClient.invalidateQueries({ queryKey: ["customer-claims"] });
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >(persistGet("clients:filterStatus", "all"));
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showExcelUploadDialog, setShowExcelUploadDialog] = useState(false);
  const [showSendMessageDialog, setShowSendMessageDialog] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] =
    useState<User | null>(null);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<BackendCargoItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Pagination state
  const [allClients, setAllClients] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingAllClients, setLoadingAllClients] = useState(false);

  // Function to fetch all clients across all pages
  const fetchAllClients = async (
    searchParams: Record<string, string | boolean>
  ) => {
    setLoadingAllClients(true);
    try {
      let allResults: User[] = [];
      let currentPage = 1;
      let hasMore = true;
      let total = 0;

      while (hasMore) {
        const search = new URLSearchParams();
        Object.entries(searchParams).forEach(([k, v]) =>
          search.append(k, String(v))
        );
        search.append("page", currentPage.toString());

        const response = await adminService.getAllUsers(
          Object.fromEntries(search.entries())
        );

        if (response.data) {
          allResults = [...allResults, ...(response.data.results || [])];
          total = response.data.count || 0;
          hasMore = !!response.data.next;
          currentPage++;
        } else {
          hasMore = false;
        }
      }

      setAllClients(allResults);
      setTotalCount(total);
    } catch (error) {
      console.error("Failed to fetch all clients:", error);
      setAllClients([]);
      setTotalCount(0);
    } finally {
      setLoadingAllClients(false);
    }
  };

  // Load all clients when filters change
  useEffect(() => {
    const params: Record<string, string | boolean> = {
      user_role: "CUSTOMER",
      ordering: "-date_joined",
    };
    if (searchTerm) params.search = searchTerm;
    if (filterStatus !== "all") params.is_active = filterStatus === "active";

    fetchAllClients(params);
  }, [searchTerm, filterStatus]);

  // Load ALL shipments for the selected client when details drawer opens
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!detailsOpen || !detailsUser) return;
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        // Get ALL cargo items for this client (not just delivered)
        const res = await cargoService.getCargoItems({
          client: detailsUser.id as unknown as number,
        });
        const results = res.data?.results || [];
        results.sort((a, b) =>
          (b.updated_at || "").localeCompare(a.updated_at || "")
        );
        if (!ignore) setHistoryItems(results);
      } catch (e: unknown) {
        if (!ignore)
          setHistoryError(
            e instanceof Error ? e.message : "Failed to load history"
          );
      } finally {
        if (!ignore) setLoadingHistory(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [detailsOpen, detailsUser]);

  const queryParams = useMemo(() => {
    const params: Record<string, string | boolean> = {
      user_role: "CUSTOMER",
      ordering: "-date_joined",
    };
    if (searchTerm) params.search = searchTerm;
    if (filterStatus !== "all") params.is_active = filterStatus === "active";
    return params;
  }, [searchTerm, filterStatus]);

  const clients = useMemo(
    () =>
      allClients.map((u) => {
        const name = u.full_name || `${u.first_name} ${u.last_name}`.trim();
        const lastActivity = formatDate(u.date_joined);
        // Convert region from backend format (e.g., "GREATER_ACCRA") to readable format
        const region = u.region 
          ? u.region.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : "-";
        // Convert user type to readable format
        const userType = u.user_type 
          ? u.user_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : "-";
        
        return {
          id: u.id,
          name,
          email: u.email || "-",
          phone: u.phone || "-",
          region,
          company_name: u.company_name || "-",
          shipping_mark: u.shipping_mark || "-",
          user_type: userType,
          status: u.is_active ? ("active" as const) : ("inactive" as const),
          lastActivity,
          is_verified: u.is_verified ? "Verified" : "Unverified",
          _raw: u,
        };
      }),
    [allClients]
  );

  const counts = useMemo(
    () => ({
      all: allClients.length,
      active: allClients.filter((u) => u.is_active).length,
      inactive: allClients.filter((u) => !u.is_active).length,
    }),
    [allClients]
  );

  const cols: Column<(typeof clients)[number]>[] = [
    {
      id: "select",
      header: (
        <input type="checkbox" className="rounded" aria-label="Select all" />
      ),
      accessor: () => (
        <input type="checkbox" className="rounded" aria-label="Select row" />
      ),
      width: "48px",
      sticky: true,
    },
    {
      id: "name",
      header: "Client",
      accessor: (c) => (
        <div>
          <div
            className="font-medium underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setDetailsUser(c._raw);
              setDetailsOpen(true);
            }}
          >
            {c.name}
          </div>
          <div className="text-sm text-muted-foreground">{c.email}</div>
        </div>
      ),
      sort: (a, b) => a.name.localeCompare(b.name),
      sticky: true,
      clickable: true,
    },
    {
      id: "contact",
      header: "Contact",
      accessor: (c) => <div className="text-sm">{c.phone}</div>,
      sort: (a, b) => (a.phone || "").localeCompare(b.phone || ""),
    },
    {
      id: "company",
      header: "Company",
      accessor: (c) => (
        <div className="text-sm">
          <div>{c.company_name}</div>
          <div className="text-xs text-muted-foreground capitalize">{c.user_type.toLowerCase()}</div>
        </div>
      ),
      sort: (a, b) => (a.company_name || "").localeCompare(b.company_name || ""),
    },
    {
      id: "shipping_mark",
      header: "Shipping Mark",
      accessor: (c) => (
        <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {c.shipping_mark}
        </div>
      ),
      sort: (a, b) => (a.shipping_mark || "").localeCompare(b.shipping_mark || ""),
    },
    {
      id: "region",
      header: "Region",
      accessor: (c) => <div className="text-sm">{c.region}</div>,
      sort: (a, b) => (a.region || "").localeCompare(b.region || ""),
    },
    {
      id: "verification",
      header: "Verification",
      accessor: (c) => (
        <div className="flex items-center gap-1">
          {c.is_verified === "Verified" ? (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          ) : (
            <ShieldX className="h-4 w-4 text-red-600" />
          )}
          <span className="text-sm">{c.is_verified}</span>
        </div>
      ),
      sort: (a, b) => a.is_verified.localeCompare(b.is_verified),
    },
    {
      id: "status",
      header: "Status",
      accessor: (c) => <StatusBadge status={c.status} />,
    },
    {
      id: "last",
      header: "Date Joined",
      accessor: (c) => (
        <div className="text-sm text-muted-foreground">{c.lastActivity}</div>
      ),
      sort: (a, b) =>
        (a.lastActivity || "").localeCompare(b.lastActivity || ""),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Manage your clients and their information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNewClientDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowExcelUploadDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Excel
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md flex items-center gap-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Button
            variant="outline"
            size="sm"
            style={{ marginLeft: 8 }}
            onClick={() => fetchAllClients(queryParams)}
          >
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilterStatus("all");
              persistSet("clients:filterStatus", "all");
            }}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilterStatus("active");
              persistSet("clients:filterStatus", "active");
            }}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilterStatus("inactive");
              persistSet("clients:filterStatus", "inactive");
            }}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="logistics-card p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-muted-foreground">
            {counts.all} total • Active {counts.active} • Inactive{" "}
            {counts.inactive}
          </div>
          {(filterStatus !== "all" || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus("all");
                setSearchTerm("");
                persistSet("clients:filterStatus", "all");
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-1" /> Reset filters
            </Button>
          )}
        </div>
        <DataTable
          id="clients"
          rows={clients}
          columns={cols}
          loading={loadingAllClients}
          empty={
            <div className="text-muted-foreground">
              No clients yet. Add Client or Import from Excel.
            </div>
          }
          renderBulkBar={(rows) => (
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Briefcase className="h-4 w-4 mr-1" />
                Assign
              </Button>
              <Button size="sm" variant="outline">
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button size="sm" variant="destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
          rowActions={(row) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setDetailsUser(row._raw);
                  setDetailsOpen(true);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedUserForMessage(row._raw);
                  setShowSendMessageDialog(true);
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </DropdownMenuItem>
              <DropdownMenuItem
                className={
                  row._raw.is_active ? "text-destructive" : "text-green-600"
                }
                onClick={async () => {
                  const action = row._raw.is_active ? "block" : "unblock";
                  const actionText = row._raw.is_active ? "Block" : "Unblock";

                  if (
                    !confirm(
                      `${actionText} client ${
                        row._raw.full_name || row._raw.email || row._raw.id
                      }? They will become ${
                        row._raw.is_active ? "inactive" : "active"
                      }.`
                    )
                  )
                    return;

                  try {
                    const response = await adminService.toggleUserStatus(
                      row._raw.id
                    );
                    toast({
                      title: `Client ${action}ed`,
                      description: `${
                        row._raw.full_name || row._raw.email
                      } is now ${
                        response.data.user.is_active ? "active" : "inactive"
                      }.`,
                    });

                    // Refresh list by re-fetching all clients
                    const params: {
                      user_role: string;
                      ordering: string;
                      search?: string;
                      is_active?: boolean;
                    } = {
                      user_role: "CUSTOMER",
                      ordering: "-date_joined",
                    };
                    if (searchTerm) params.search = searchTerm;
                    if (filterStatus !== "all")
                      params.is_active = filterStatus === "active";
                    fetchAllClients(params);
                  } catch (e: unknown) {
                    toast({
                      title: `Failed to ${action}`,
                      description:
                        e instanceof Error
                          ? e.message
                          : "Unable to update user status",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {row._raw.is_active ? (
                  <>
                    <ShieldX className="h-4 w-4 mr-2" />
                    Block Client
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Unblock Client
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
          onRowClick={(row) => {
            setDetailsUser(row._raw);
            setDetailsOpen(true);
          }}
        />
      </div>

      <Drawer open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {detailsUser?.full_name ||
                `${detailsUser?.first_name ?? ""} ${
                  detailsUser?.last_name ?? ""
                }`.trim()}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {/* Client Details Section */}
            <div className="border rounded p-4">
              <div className="font-medium mb-3">Client Details</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Full Name</div>
                  <div className="font-medium">
                    {detailsUser?.full_name ||
                      `${detailsUser?.first_name || ""} ${
                        detailsUser?.last_name || ""
                      }`.trim() ||
                      "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Email</div>
                  <div className="font-medium">
                    {detailsUser?.email || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Phone</div>
                  <div className="font-medium">
                    {detailsUser?.phone || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Company</div>
                  <div className="font-medium">
                    {detailsUser?.company_name || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Region</div>
                  <div className="font-medium">
                    {detailsUser?.region || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div>
                    <StatusBadge
                      status={detailsUser?.is_active ? "active" : "inactive"}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Joined</div>
                  <div className="font-medium">
                    {detailsUser?.date_joined
                      ? formatDate(detailsUser.date_joined)
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">User Type</div>
                  <div className="font-medium">
                    {detailsUser?.user_type || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipment History Section */}
            <div className="border rounded p-4">
              <div className="font-medium mb-3">All Shipments History</div>
              {loadingHistory ? (
                <div className="text-sm text-muted-foreground">
                  Loading shipments…
                </div>
              ) : historyError ? (
                <div className="text-sm text-destructive">{historyError}</div>
              ) : historyItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No shipments found for this client.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-auto">
                  {historyItems.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between border-b pb-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {it.tracking_id || it.id}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {it.item_description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(it.created_at)} • Updated:{" "}
                          {formatDate(it.updated_at)}
                        </div>
                        {it.cbm && (
                          <div className="text-xs text-muted-foreground">
                            CBM: {it.cbm}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <StatusBadge
                          status={
                            (it.status === "in_transit"
                              ? "in-transit"
                              : it.status) as
                              | "in-transit"
                              | "delivered"
                              | "pending"
                              | "delayed"
                          }
                        />
                        {it.total_value && (
                          <div className="text-xs text-muted-foreground mt-1">
                            ${it.total_value}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <SendMessageDialog
        open={showSendMessageDialog}
        onOpenChange={setShowSendMessageDialog}
        user={selectedUserForMessage}
      />

      <NewClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
      />

      <CustomerExcelUploadDialog
        open={showExcelUploadDialog}
        onOpenChange={setShowExcelUploadDialog}
        onUploadComplete={() => {
          handleRefresh();
          setShowExcelUploadDialog(false);
        }}
      />
    </div>
  );
}

// Load shipment history when the drawer opens for a user
// Placed after component to keep patch minimal; could be inside component via useEffect
// but TypeScript/React requires hooks inside component. We'll augment inside component below.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Mail,
  Briefcase,
  RefreshCcw,
  ShieldX,
  ShieldCheck,
  MessageSquare,
  Upload,
  Download,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { NewClientDialog } from "@/components/dialogs/NewClientDialog";
import { EditClientDialog } from "@/components/dialogs/EditClientDialog";
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
import { exportClientsToExcel } from "@/lib/excelExporter";
import { useAuthStore } from "@/stores/authStore";

export default function Clients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = "#00703D";
  const primaryColor = isCustomer ? "#2563eb" : ADMIN_GREEN;
  const buttonStyle = { backgroundColor: primaryColor, color: "#FFFFFF" };
  const outlineButtonStyle = { borderColor: primaryColor, color: primaryColor };
  const iconStyle = { color: primaryColor };

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >( (persistGet("clients:filterStatus") as "all" | "active" | "inactive" ) ?? "all");
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [showExcelUploadDialog, setShowExcelUploadDialog] = useState(false);
  const [showSendMessageDialog, setShowSendMessageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] =
    useState<User | null>(null);
  const [detailsUser, setDetailsUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<BackendCargoItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [clientResults, setClientResults] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loadingClients, setLoadingClients] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const baseQueryParams = useMemo<Record<string, string | number | boolean>>(
    () => {
      const params: Record<string, string | number | boolean> = {
        user_role: "CUSTOMER",
        ordering: "-date_joined",
      };
      if (searchTerm) params.search = searchTerm;
      return params;
    },
    [searchTerm]
  );

  const queryParams = useMemo<Record<string, string | number | boolean>>(
    () => {
      const params = { ...baseQueryParams };
      if (filterStatus !== "all") {
        params.is_active = filterStatus === "active";
      }
      return params;
    },
    [baseQueryParams, filterStatus]
  );

  const refreshCounts = useCallback(
    async (currentTotal?: number) => {
      const total = currentTotal ?? totalCount;

      if (filterStatus === "all") {
        try {
          const [activeRes, inactiveRes] = await Promise.all([
            adminService.getAllUsers({
              ...baseQueryParams,
              is_active: true,
              page: 1,
              page_size: 1,
            }),
            adminService.getAllUsers({
              ...baseQueryParams,
              is_active: false,
              page: 1,
              page_size: 1,
            }),
          ]);

          setActiveCount(activeRes.data?.count ?? 0);
          setInactiveCount(inactiveRes.data?.count ?? 0);
        } catch (error) {
          console.error("Failed to fetch client counts:", error);
          setActiveCount(0);
          setInactiveCount(0);
        }
      } else if (filterStatus === "active") {
        setActiveCount(total);
        setInactiveCount(0);
      } else {
        setActiveCount(0);
        setInactiveCount(total);
      }
    },
    [filterStatus, baseQueryParams, totalCount]
  );

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const response = await adminService.getAllUsers({
        ...queryParams,
        page,
        page_size: pageSize,
      });

      const results = response.data?.results || [];
      const total = response.data?.count || 0;
      const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

      if (page > totalPages) {
        setPage(totalPages);
        return;
      }

      setClientResults(results);
      setTotalCount(total);
      await refreshCounts(total);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      setClientResults([]);
      setTotalCount(0);
      setActiveCount(0);
      setInactiveCount(0);
    } finally {
      setLoadingClients(false);
    }
  }, [queryParams, page, pageSize, refreshCounts]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    queryClient.invalidateQueries({ queryKey: ["goods-stats"] });
    queryClient.invalidateQueries({ queryKey: ["containers-summary"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-stats"] });
    queryClient.invalidateQueries({ queryKey: ["customer-claims"] });
    loadClients();
  }, [queryClient, loadClients]);

  const handleExportToExcel = useCallback(async () => {
    try {
      // Fetch ALL clients for export (not just current page)
      const response = await adminService.getAllUsers({
        user_role: "CUSTOMER",
        ordering: "-date_joined",
        page_size: 10000, // Get all clients
      });

      const allClients = response.data?.results || [];

      if (allClients.length === 0) {
        toast({
          title: "No Clients",
          description: "There are no clients to export",
          variant: "destructive",
        });
        return;
      }

      // Map to export format
      const exportData = allClients.map(client => ({
        shipping_mark: client.shipping_mark || '-',
        first_name: client.first_name || '-',
        last_name: client.last_name || '-',
        email: client.email || '-',
        phone: client.phone || '-',
      }));

      const filename = exportClientsToExcel(exportData);

      toast({
        title: "Export Successful",
        description: `${allClients.length} clients exported to ${filename}`,
      });
    } catch (error) {
      console.error("Failed to export clients:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export clients",
        variant: "destructive",
      });
    }
  }, [toast]);

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
          page_size: 5000,
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

  const tableRows = useMemo(
    () =>
      clientResults.map((u) => {
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
    is_verified: (u as any).is_verified ? "Verified" : "Unverified",
          _raw: u,
        };
      }),
    [clientResults]
  );

  const counts = useMemo(
    () => ({
      all: totalCount,
      active: activeCount,
      inactive: inactiveCount,
    }),
    [totalCount, activeCount, inactiveCount]
  );

  const cols: Column<(typeof tableRows)[number]>[] = [
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
      id: "shipping_mark",
      header: "Shipping Mark",
      accessor: (c) => (
        <div
          className="font-mono text-sm font-medium px-2 py-1 rounded"
          style={isCustomer ? undefined : { backgroundColor: ADMIN_GREEN + '22', color: ADMIN_GREEN }}
        >
          {c.shipping_mark}
        </div>
      ),
      sort: (a, b) => (a.shipping_mark || "").localeCompare(b.shipping_mark || ""),
      sticky: true,
    },
    {
      id: "name",
      header: "Client",
      accessor: (c) => (
        <div>
          <div className="font-medium">{c.name}</div>
          <div className="text-sm text-muted-foreground">{c.email}</div>
        </div>
      ),
      sort: (a, b) => a.name.localeCompare(b.name),
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
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowNewClientDialog(true)} style={buttonStyle}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowExcelUploadDialog(true)}
            style={outlineButtonStyle}
          >
            <Upload className="h-4 w-4 mr-2" style={iconStyle} />
            Upload Excel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportToExcel}
            style={outlineButtonStyle}
          >
            <Download className="h-4 w-4 mr-2" style={iconStyle} />
            Download Excel
          </Button>
          <Button variant="outline" onClick={handleRefresh} style={outlineButtonStyle}>
            <RefreshCcw className="h-4 w-4 mr-2" style={iconStyle} />
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
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
          <Button
            variant="outline"
            size="sm"
            style={{ marginLeft: 8 }}
            onClick={() => loadClients()}
          >
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            style={filterStatus === "all" ? buttonStyle : outlineButtonStyle}
            onClick={() => {
              setFilterStatus("all");
              setPage(1);
              persistSet("clients:filterStatus", "all");
            }}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            style={filterStatus === "active" ? buttonStyle : outlineButtonStyle}
            onClick={() => {
              setFilterStatus("active");
              setPage(1);
              persistSet("clients:filterStatus", "active");
            }}
          >
            Active
          </Button>
          <Button
            variant={filterStatus === "inactive" ? "default" : "outline"}
            size="sm"
            style={filterStatus === "inactive" ? buttonStyle : outlineButtonStyle}
            onClick={() => {
              setFilterStatus("inactive");
              setPage(1);
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
                setPage(1);
                persistSet("clients:filterStatus", "all");
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-1" /> Reset filters
            </Button>
          )}
        </div>
        <DataTable
          id="clients"
          rows={tableRows}
          columns={cols}
          loading={loadingClients}
          empty={
            <div className="text-muted-foreground">
              No clients yet. Add Client or Import from Excel.
            </div>
          }
          renderBulkBar={(_rows) => (
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
                  setDetailsUser(row._raw);
                  setShowEditDialog(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
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

                    // Refresh list by re-fetching current page
                    loadClients();
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
              <DropdownMenuItem
                onClick={async () => {
                  const clientName = row._raw.full_name || row._raw.email || `Client #${row._raw.id}`;
                  
                  if (
                    !confirm(
                      `Reset password for ${clientName}?\n\nThe password will be reset to: PrimeMade`
                    )
                  )
                    return;

                  try {
                    await adminService.resetUserPassword(row._raw.id, {
                      new_password: "PrimeMade",
                    });
                    
                    toast({
                      title: "Password Reset",
                      description: `Password for ${clientName} has been reset to "PrimeMade"`,
                    });
                  } catch (e: unknown) {
                    toast({
                      title: "Failed to Reset Password",
                      description:
                        e instanceof Error
                          ? e.message
                          : "Unable to reset password",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
            </>
          )}
          pagination={{
            page,
            pageSize,
            total: totalCount,
            onPageChange: (nextPage) => setPage(nextPage),
            onPageSizeChange: (nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            },
            pageSizeOptions: [10, 25, 50, 100],
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
        onCreated={() => {
          // Refresh clients list after a new client is created
          handleRefresh();
        }}
      />

      <EditClientDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        client={detailsUser}
        onSuccess={handleRefresh}
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

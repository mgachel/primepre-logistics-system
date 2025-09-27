import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import {
  Search,
  Package,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  goodsReceivedService,
  GoodsReceivedGhana,
  GoodsFilters,
  GoodsStats,
} from "@/services/goodsReceivedService";

export default function CustomerShipments() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // State management
  const [shipments, setShipments] = useState<GoodsReceivedGhana[]>([]);
  const [stats, setStats] = useState<GoodsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    current_page: 1,
  });

  // Filters state
  const [filters, setFilters] = useState<GoodsFilters>({
    search: "",
    page: 1,
    page_size: 20,
  });

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Fetch shipments
  const fetchShipments = async (newFilters?: GoodsFilters, showLoading = true) => {
    if (showLoading) setLoading(true);
    else setSearchLoading(true);

    try {
      const currentFilters = newFilters || filters;
      
      // For initial load, get shipments for customer
      const response = await goodsReceivedService.getGhanaGoods(currentFilters);

      if (response.success && response.data) {
        setShipments(response.data.results || []);
        setPagination({
          count: response.data.count || 0,
          next: response.data.next,
          previous: response.data.previous,
          current_page: currentFilters.page || 1,
        });
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to fetch shipments",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching shipments:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await goodsReceivedService.getGoodsStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Handle search
  const handleSearch = () => {
    const newFilters = { ...filters, page: 1 };
    setFilters(newFilters);
    fetchShipments(newFilters, false);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    fetchShipments(newFilters, false);
  };

  // Clear filters
  const clearFilters = () => {
    const newFilters = {
      search: "",
      page: 1,
      page_size: 20,
    };
    setFilters(newFilters);
    fetchShipments(newFilters);
  };

  // Initial load
  useEffect(() => {
    fetchShipments();
    fetchStats();
  }, []);

  if (!user || user.user_role !== 'CUSTOMER') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Access Denied</h3>
          <p className="text-gray-600">This page is only available to customers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
          <p className="text-muted-foreground">
            View shipments in Ghana warehouse - search by tracking number or shipping mark
          </p>
        </div>
        <Button
          onClick={() => fetchShipments()}
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Delivery</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.ready_for_delivery || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Search by tracking number or shipping mark to find your shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Enter tracking number or shipping mark..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searchLoading}>
                  {searchLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shipments</CardTitle>
              <CardDescription>
                Showing {shipments.length} of {pagination.count} shipments (search to find yours)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No shipments found</h3>
              <p className="text-gray-600">
                {filters.search
                  ? "Try adjusting your search criteria"
                  : "No shipments in Ghana warehouse"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipping Mark</TableHead>
                      <TableHead>Tracking ID</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Received On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-medium">
                          {shipment.shipping_mark}
                        </TableCell>
                        <TableCell>{shipment.supply_tracking}</TableCell>
                        <TableCell>{shipment.quantity}</TableCell>
                        <TableCell>{formatDate(shipment.date_received)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.count > filters.page_size! && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.current_page - 1) * (filters.page_size || 20)) + 1} to{" "}
                    {Math.min(pagination.current_page * (filters.page_size || 20), pagination.count)} of{" "}
                    {pagination.count} results
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={!pagination.previous}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={!pagination.next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
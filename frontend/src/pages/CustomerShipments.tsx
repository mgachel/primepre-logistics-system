import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ship,
  Plane,
  Search,
  Filter,
  Eye,
  Download,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  customerShipmentsService,
  CustomerShipment,
  ShipmentStats,
} from "@/services/customerShipmentsService";
import { formatDate } from "@/lib/date";

export default function CustomerShipments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [shipments, setShipments] = useState<CustomerShipment[]>([]);
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });

  // Fetch shipments data
  const fetchShipments = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        const filters = {
          search: searchTerm || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          cargo_type:
            typeFilter !== "all"
              ? typeFilter === "Sea Cargo"
                ? ("sea" as const)
                : ("air" as const)
              : undefined,
          page,
          page_size: 10,
        };

        const [shipmentsResponse, statsResponse] = await Promise.all([
          customerShipmentsService.getShipments(filters),
          customerShipmentsService.getShipmentStats(
            typeFilter !== "all"
              ? typeFilter === "Sea Cargo"
                ? "sea"
                : "air"
              : undefined
          ),
        ]);

        setShipments(shipmentsResponse.data.results);
        setStats(statsResponse.data);
        setPagination({
          page,
          totalPages: Math.ceil(shipmentsResponse.data.count / 10),
          totalItems: shipmentsResponse.data.count,
        });
      } catch (err) {
        console.error("Failed to fetch shipments:", err);
        setError("Failed to load shipments. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, statusFilter, typeFilter]
  );

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchShipments(1);
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (loading && shipments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading shipments...</span>
      </div>
    );
  }

  // Error state
  if (error && shipments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchShipments()}>Try Again</Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Delivered
          </Badge>
        );
      case "in_transit":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            In Transit
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-800">
            Processing
          </Badge>
        );
      case "delayed":
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === "Sea Cargo" ? (
      <Ship className="h-4 w-4" />
    ) : (
      <Plane className="h-4 w-4" />
    );
  };

  const formatWeight = (weight?: number) => {
    if (!weight) return "N/A";
    return weight >= 1000
      ? `${(weight / 1000).toFixed(1)} tons`
      : `${weight} kg`;
  };

  const formatValue = (value?: number) => {
    if (!value) return "N/A";
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Shipments</h1>
          <p className="text-muted-foreground">
            Track and manage your shipments{" "}
            {user?.shipping_mark && `(${user.shipping_mark})`}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Shipments
              </CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_shipments}</div>
              <p className="text-xs text-muted-foreground">
                All time shipments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.in_transit_shipments}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently shipping
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.delivered_shipments}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(stats.total_value)}
              </div>
              <p className="text-xs text-muted-foreground">
                Combined shipment value
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, tracking number, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Sea Cargo">Sea Cargo</SelectItem>
                <SelectItem value="Air Cargo">Air Cargo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading shipments...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => fetchShipments()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {shipments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No shipments found</p>
                    <p className="text-sm">
                      {searchTerm ||
                      statusFilter !== "all" ||
                      typeFilter !== "all"
                        ? "Try adjusting your filters or search terms"
                        : "Start by creating your first shipment"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              shipments.map((shipment) => (
                <Card key={shipment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(shipment.type)}
                          <div>
                            <div className="font-semibold">
                              {shipment.tracking_id || `CGO-${shipment.id}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {shipment.type} •{" "}
                              {shipment.description || "No description"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">
                            {shipment.origin || "N/A"} →{" "}
                            {shipment.destination || "N/A"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatWeight(shipment.weight || undefined)} •{" "}
                            {formatValue(shipment.value || undefined)}
                          </div>
                        </div>

                        <div className="text-right">
                          {getStatusBadge(shipment.status || "pending")}
                          <div className="text-sm text-muted-foreground mt-1">
                            {shipment.status === "delivered" &&
                            shipment.delivered_date
                              ? `Delivered: ${formatDate(
                                  shipment.delivered_date
                                )}`
                              : shipment.eta
                              ? `ETA: ${formatDate(shipment.eta)}`
                              : `Created: ${formatDate(shipment.date)}`}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalItems > 10 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * 10 + 1} to{" "}
                    {Math.min(pagination.page * 10, pagination.totalItems)} of{" "}
                    {pagination.totalItems} shipments
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (pagination.page > 1) {
                          fetchShipments(pagination.page - 1);
                        }
                      }}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (pagination.page < pagination.totalPages) {
                          fetchShipments(pagination.page + 1);
                        }
                      }}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

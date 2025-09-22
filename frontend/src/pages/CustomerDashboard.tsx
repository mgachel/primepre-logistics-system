import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ship, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { CustomerClaim, customerDashboardService } from '@/services/customerDashboardService';
import { CargoItem } from '@/services/cargoService';
import { formatDate } from '@/lib/date';
import { useNavigate } from 'react-router-dom';

// Recent shipments component - Enhanced table format
const RecentShipmentsTable = ({ shipments }: { shipments: CargoItem[] }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_transit':
        return <Ship className="h-4 w-4 text-blue-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'demurrage':
      case 'delayed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'in_transit':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Transit</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'demurrage':
        return <Badge variant="destructive">Demurrage</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (shipments.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Ship className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No goods in Ghana warehouse</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground">
        <div className="col-span-3">Shipping Mark</div>
        <div className="col-span-4">Tracking ID</div>
        <div className="col-span-2">Quantity</div>
        <div className="col-span-3">Received On</div>
      </div>
      
      {/* Table Rows */}
      <div className="space-y-2">
        {shipments.slice(0, 5).map((shipment) => (
          <div key={shipment.id} className="grid grid-cols-12 gap-3 px-3 py-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="col-span-3 flex items-center space-x-2">
              {getStatusIcon(shipment.status)}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate" title={shipment.shipping_mark || 'N/A'}>
                  {shipment.shipping_mark || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {shipment.type === 'AIR' ? 'Air' : 'Sea'}
                </div>
              </div>
            </div>
            <div className="col-span-4 flex items-center">
              <div className="text-sm">
                <div className="font-medium truncate" title={shipment.tracking_number || 'N/A'}>
                  {shipment.tracking_number || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getStatusBadge(shipment.status)}
                </div>
              </div>
            </div>
            <div className="col-span-2 flex items-center">
              <div className="text-sm font-medium">
                {shipment.quantity}
              </div>
            </div>
            <div className="col-span-3 flex items-center">
              <div className="text-sm">
                <div className="font-medium">
                  {formatDate(shipment.created_at)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Created
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent claims component - Enhanced to show latest 5 claims
const RecentClaimsTable = ({ claims }: { claims: CustomerClaim[] }) => {
  const formatStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (claims.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No recent claims</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-muted/50 rounded-lg text-xs font-medium text-muted-foreground">
        <div className="col-span-3">Claim ID</div>
        <div className="col-span-5">Item Name</div>
        <div className="col-span-4">Tracking ID</div>
      </div>
      
      {/* Table Rows */}
      <div className="space-y-2">
        {claims.slice(0, 5).map((claim) => (
          <div key={claim.id} className="grid grid-cols-12 gap-3 px-3 py-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="col-span-3 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">#{claim.id}</div>
                <div className="text-xs">
                  <Badge className={getStatusColor(claim.status)} variant="outline">
                    {formatStatusText(claim.status)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="col-span-5 flex items-center">
              <div className="text-sm truncate" title={(claim as CustomerClaim & {item_name?: string}).item_name || 'N/A'}>
                {(claim as CustomerClaim & {item_name?: string}).item_name || 'N/A'}
              </div>
            </div>
            <div className="col-span-4 flex items-center">
              <div className="text-sm font-medium truncate" title={(claim as CustomerClaim & {tracking_id?: string}).tracking_id || 'N/A'}>
                {(claim as CustomerClaim & {tracking_id?: string}).tracking_id || 'N/A'}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {claims.length > 5 && (
        <div className="text-center py-2">
          <span className="text-xs text-muted-foreground">
            Showing 5 of {claims.length} claims
          </span>
        </div>
      )}
    </div>
  );
};

// Main CustomerDashboard component
export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Use React Query for dashboard data
  const {
    data: dashboardData,
    isLoading: loading,
    error,
    refetch: loadDashboardData
  } = useQuery({
    queryKey: ['customerDashboard', user?.id], // Include user ID to prevent cross-user caching
    queryFn: async () => {
      const response = await customerDashboardService.getCargoDashboard();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
  });

  // Manual refresh handler
  const handleRefresh = () => {
    loadDashboardData();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <span className="block">Loading dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry options
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-red-600 mb-4">{error?.message || 'An error occurred'}</p>
            <div className="space-x-2">
              <Button onClick={handleRefresh} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Hard Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const stats = dashboardData || {};
  const recent_shipments = dashboardData?.recent_items || [];
  const recent_claims: CustomerClaim[] = dashboardData?.recent_claims || []; // Use actual claims data from API

  // Use API data for pending claims count
  const pendingClaimsCount = dashboardData?.pending_claims_count || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.full_name || user?.first_name || 'Customer'}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your shipments today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_shipments || stats.ghana_total_items || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time shipments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingClaimsCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Shipments</CardTitle>
            <CardDescription>
              Your latest goods received in Ghana warehouse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentShipmentsTable shipments={recent_shipments} />
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/my-shipments')}>
              View All Shipments
            </Button>
          </CardContent>
        </Card>

        {/* Recent Claims */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
            <CardDescription>
              Latest 5 claims from your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentClaimsTable claims={recent_claims} />
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/my-claims')}>
              View All Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

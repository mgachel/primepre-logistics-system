import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ship, 
  FileText, 
  Package, 
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { customerDashboardService, CustomerDashboardData, CustomerShipment, CustomerClaim } from '@/services/customerDashboardService';
import { formatDate, formatRelative, isOverdue } from '@/lib/date';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await customerDashboardService.getFullDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  // Show error state
  if (error || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-600 mb-4">{error || 'Failed to load dashboard data'}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const { stats, recent_shipments, recent_claims } = dashboardData;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_transit':
        return <Ship className="h-4 w-4 text-blue-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'delayed':
        return <XCircle className="h-4 w-4 text-red-500" />;
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
      case 'processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Delayed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

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
        <Button>
          <Ship className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_cargo_items}</div>
            <p className="text-xs text-muted-foreground">
              All time shipments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_transit_items}</div>
            <p className="text-xs text-muted-foreground">
              Currently in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Items</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered_items}</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_claims || 0}</div>
            <p className="text-xs text-muted-foreground">
              Under review
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
              Your latest shipment activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_shipments.length > 0 ? (
                recent_shipments.map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(shipment.status)}
                      <div>
                        <div className="font-medium">{shipment.tracking_id || shipment.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {shipment.origin} → {shipment.destination}
                        </div>
                        {shipment.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {shipment.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(shipment.status)}
                      <div className="text-sm text-muted-foreground mt-1">
                        {shipment.status === 'delivered' && shipment.delivered 
                          ? formatDate(shipment.delivered)
                          : shipment.eta 
                          ? `ETA: ${formatDate(shipment.eta)}`
                          : formatDate(shipment.date)
                        }
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Ship className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent shipments</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Shipments
            </Button>
          </CardContent>
        </Card>

        {/* Recent Claims */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Claims</CardTitle>
            <CardDescription>
              Your latest claim requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_claims.length > 0 ? (
                recent_claims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{claim.id}</div>
                        <div className="text-sm text-muted-foreground">
                          {claim.type} - {claim.shipment_id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={claim.status === 'under_review' ? 'default' : 'secondary'}>
                        {formatStatusText(claim.status)}
                      </Badge>
                      <div className="text-sm font-medium mt-1">{claim.amount}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent claims</p>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

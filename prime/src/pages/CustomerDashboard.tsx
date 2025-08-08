import React from 'react';
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
  XCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerDashboard() {
  const { user } = useAuth();

  // Mock data for customer dashboard
  const customerStats = {
    totalShipments: 24,
    activeShipments: 3,
    completedShipments: 18,
    pendingClaims: 2,
    totalSpent: '$12,450.00'
  };

  const recentShipments = [
    {
      id: 'SH-001',
      type: 'Sea Cargo',
      status: 'In Transit',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-15',
      eta: '2024-02-20'
    },
    {
      id: 'SH-002',
      type: 'Air Cargo',
      status: 'Delivered',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-10',
      delivered: '2024-01-12'
    },
    {
      id: 'SH-003',
      type: 'Sea Cargo',
      status: 'Processing',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-20',
      eta: '2024-03-05'
    }
  ];

  const recentClaims = [
    {
      id: 'CL-001',
      shipmentId: 'SH-002',
      type: 'Damaged Goods',
      status: 'Under Review',
      amount: '$500.00',
      date: '2024-01-13'
    },
    {
      id: 'CL-002',
      shipmentId: 'SH-001',
      type: 'Delayed Delivery',
      status: 'Pending',
      amount: '$200.00',
      date: '2024-01-18'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Transit':
        return <Ship className="h-4 w-4 text-blue-500" />;
      case 'Processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <Badge variant="default" className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'In Transit':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Transit</Badge>;
      case 'Processing':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.name || 'Customer'}!</h1>
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
            <div className="text-2xl font-bold">{customerStats.totalShipments}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.activeShipments}</div>
            <p className="text-xs text-muted-foreground">
              Currently in transit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.totalSpent}</div>
            <p className="text-xs text-muted-foreground">
              +$1,200 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerStats.pendingClaims}</div>
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
              {recentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(shipment.status)}
                    <div>
                      <div className="font-medium">{shipment.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {shipment.origin} → {shipment.destination}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(shipment.status)}
                    <div className="text-sm text-muted-foreground mt-1">
                      {shipment.status === 'Delivered' ? shipment.delivered : `ETA: ${shipment.eta}`}
                    </div>
                  </div>
                </div>
              ))}
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
              {recentClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{claim.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {claim.type} - {claim.shipmentId}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={claim.status === 'Under Review' ? 'default' : 'secondary'}>
                      {claim.status}
                    </Badge>
                    <div className="text-sm font-medium mt-1">{claim.amount}</div>
                  </div>
                </div>
              ))}
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
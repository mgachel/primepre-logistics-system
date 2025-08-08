import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Ship, 
  Plane,
  Search,
  Filter,
  Eye,
  Download,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerShipments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock data for customer shipments
  const shipments = [
    {
      id: 'SH-001',
      type: 'Sea Cargo',
      status: 'In Transit',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-15',
      eta: '2024-02-20',
      value: '$5,000.00',
      weight: '2.5 tons',
      trackingNumber: 'TRK-001-2024'
    },
    {
      id: 'SH-002',
      type: 'Air Cargo',
      status: 'Delivered',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-10',
      delivered: '2024-01-12',
      value: '$2,500.00',
      weight: '500 kg',
      trackingNumber: 'TRK-002-2024'
    },
    {
      id: 'SH-003',
      type: 'Sea Cargo',
      status: 'Processing',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-20',
      eta: '2024-03-05',
      value: '$8,000.00',
      weight: '4.0 tons',
      trackingNumber: 'TRK-003-2024'
    },
    {
      id: 'SH-004',
      type: 'Air Cargo',
      status: 'In Transit',
      origin: 'China',
      destination: 'Ghana',
      date: '2024-01-25',
      eta: '2024-01-28',
      value: '$1,800.00',
      weight: '300 kg',
      trackingNumber: 'TRK-004-2024'
    }
  ];

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

  const getTypeIcon = (type: string) => {
    return type === 'Sea Cargo' ? <Ship className="h-4 w-4" /> : <Plane className="h-4 w-4" />;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = shipment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shipment.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Shipments</h1>
          <p className="text-muted-foreground">
            Track and manage your shipments
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

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
                  placeholder="Search by ID or tracking number..."
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
                <SelectItem value="Processing">Processing</SelectItem>
                <SelectItem value="In Transit">In Transit</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <div className="grid gap-4">
        {filteredShipments.map((shipment) => (
          <Card key={shipment.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(shipment.type)}
                    <div>
                      <div className="font-semibold">{shipment.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {shipment.type} • {shipment.trackingNumber}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">{shipment.origin} → {shipment.destination}</div>
                    <div className="text-sm text-muted-foreground">
                      {shipment.weight} • {shipment.value}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(shipment.status)}
                    <div className="text-sm text-muted-foreground mt-1">
                      {shipment.status === 'Delivered' 
                        ? `Delivered: ${shipment.delivered}`
                        : `ETA: ${shipment.eta}`
                      }
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
        ))}
      </div>

      {filteredShipments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              No shipments found matching your criteria.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
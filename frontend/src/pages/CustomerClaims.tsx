import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerClaims() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock data for customer claims
  const claims = [
    {
      id: 'CL-001',
      shipmentId: 'SH-002',
      type: 'Damaged Goods',
      status: 'Under Review',
      amount: '$500.00',
      date: '2024-01-13',
      description: 'Package arrived with visible damage to the outer packaging. Contents appear to be intact but require inspection.',
      evidence: ['damage_photo_1.jpg', 'damage_photo_2.jpg']
    },
    {
      id: 'CL-002',
      shipmentId: 'SH-001',
      type: 'Delayed Delivery',
      status: 'Pending',
      amount: '$200.00',
      date: '2024-01-18',
      description: 'Shipment delayed by 5 days beyond the original ETA. This caused additional storage costs.',
      evidence: ['delay_notification.pdf', 'storage_invoice.pdf']
    },
    {
      id: 'CL-003',
      shipmentId: 'SH-003',
      type: 'Lost Items',
      status: 'Approved',
      amount: '$1,200.00',
      date: '2024-01-22',
      description: 'Two items from the shipment were missing upon delivery. Inventory count confirmed the loss.',
      evidence: ['inventory_list.pdf', 'delivery_receipt.pdf']
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'Under Review':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'Pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Rejected':
        return <Badge variant="default" className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Under Review':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'Pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Claims</h1>
          <p className="text-muted-foreground">
            Track and manage your claim requests
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Claim
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
                  placeholder="Search by claim ID, shipment ID, or type..."
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
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <div className="grid gap-4">
        {filteredClaims.map((claim) => (
          <Card key={claim.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(claim.status)}
                    <div>
                      <div className="font-semibold">{claim.id}</div>
                      <div className="text-sm text-muted-foreground">
                        {claim.type} • Shipment: {claim.shipmentId}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">{claim.amount}</div>
                    <div className="text-sm text-muted-foreground">
                      Filed: {claim.date}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(claim.status)}
                    <div className="text-sm text-muted-foreground mt-1">
                      {claim.evidence.length} evidence files
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Claim Description */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Description:</div>
                <div className="text-sm">{claim.description}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClaims.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              No claims found matching your criteria.
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Claim Form (Hidden by default, can be toggled) */}
      <Card>
        <CardHeader>
          <CardTitle>Submit New Claim</CardTitle>
          <CardDescription>
            Submit a new claim for any issues with your shipments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Shipment ID</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SH-001">SH-001</SelectItem>
                  <SelectItem value="SH-002">SH-002</SelectItem>
                  <SelectItem value="SH-003">SH-003</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Claim Type</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="damaged">Damaged Goods</SelectItem>
                  <SelectItem value="delayed">Delayed Delivery</SelectItem>
                  <SelectItem value="lost">Lost Items</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Claim Amount</label>
            <Input placeholder="$0.00" />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              placeholder="Please provide a detailed description of the issue..."
              rows={4}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline">Cancel</Button>
            <Button>Submit Claim</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
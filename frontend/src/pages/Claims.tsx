import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  Edit,
  User,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { claimsService, AdminClaim, ClaimStatusUpdate, ClaimsSummary } from '@/services/claimsService';
import { formatDate, formatRelative } from '@/lib/date';

export default function Claims() {
  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [summary, setSummary] = useState<ClaimsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shippingMarkFilter, setShippingMarkFilter] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<AdminClaim | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Status update state
  const [statusUpdate, setStatusUpdate] = useState<ClaimStatusUpdate>({
    status: 'PENDING',
    admin_notes: '',
  });

  // Load claims and summary
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading claims data...', { statusFilter, searchTerm });
      
      const [claimsResponse, summaryResponse] = await Promise.all([
        claimsService.getAllClaims({
          status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm && searchTerm.trim() !== '' ? searchTerm : undefined,
          shipping_mark: shippingMarkFilter && shippingMarkFilter.trim() !== '' ? shippingMarkFilter : undefined,
        }),
        claimsService.getClaimsSummary()
      ]);
      
      console.log('Claims response:', claimsResponse);
      console.log('Summary response:', summaryResponse);
      console.log('Claims response success:', claimsResponse.success);
      console.log('Claims response data type:', typeof claimsResponse.data);
      console.log('Claims response data is array:', Array.isArray(claimsResponse.data));
      console.log('Raw claims data:', claimsResponse.data);
      console.log('Raw claims data length:', claimsResponse.data?.length);
      
      // Additional debugging for the response structure
      console.log('Full claimsResponse object keys:', Object.keys(claimsResponse));
      console.log('claimsResponse.success type:', typeof claimsResponse.success);
      console.log('claimsResponse.data exists:', !!claimsResponse.data);
      
      // Handle the response properly - check if the request was successful
      console.log('=== CLAIMS DEBUGGING ===');
      console.log('claimsResponse:', claimsResponse);
      console.log('claimsResponse.success:', claimsResponse.success);
      console.log('claimsResponse.data:', claimsResponse.data);
      console.log('Type of claimsResponse.data:', typeof claimsResponse.data);
      console.log('Is claimsResponse.data an array:', Array.isArray(claimsResponse.data));
      console.log('claimsResponse.data length:', claimsResponse.data?.length);
      
      if (claimsResponse.success && claimsResponse.data) {
        const claimsData = Array.isArray(claimsResponse.data) ? claimsResponse.data : [];
        console.log('Setting claims data:', claimsData);
        console.log('Claims data length:', claimsData.length);
        console.log('Individual claims:', claimsData.map(c => ({ id: c.id, shipping_mark: c.shipping_mark, customer_name: c.customer_name })));
        setClaims(claimsData);
      } else {
        console.log('Claims response unsuccessful or no data, setting empty array');
        console.log('Reason - success:', claimsResponse.success, 'data:', !!claimsResponse.data);
        setClaims([]);
      }
      
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Failed to load claims data:', err);
      setError('Failed to load claims data. Please try again.');
      setClaims([]); // Reset to empty array on error
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, shippingMarkFilter]);

  // Update claim status
  const handleStatusUpdate = async () => {
    if (!selectedClaim) return;

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      console.log('=== STATUS UPDATE DEBUG ===');
      console.log('Updating claim:', selectedClaim.id, 'with status:', statusUpdate);

      const response = await claimsService.updateClaimStatus(selectedClaim.id, statusUpdate);
      
      console.log('Update response:', response);
      console.log('Updated claim data:', response.data);
      
      // Instead of just updating the single claim, reload all claims to ensure data integrity
      console.log('Reloading all claims after status update...');
      await loadData();
      
      setSelectedClaim(response.data);
      setSuccess('Claim status updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to update claim status:', err);
      const apiError = err as { response?: { data?: Record<string, string[]> } };
      
      if (apiError?.response?.data) {
        const errorMessages = Object.entries(apiError.response.data)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setError(`Failed to update claim: ${errorMessages}`);
      } else {
        setError('Failed to update claim. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Filter claims
  const filteredClaims = (claims || []).filter(claim => {
    const matchesSearch = searchTerm === '' || 
      claim.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.shipping_mark.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || statusFilter === '' || claim.status === statusFilter;
    
    const matchesShippingMark = shippingMarkFilter === '' || 
      claim.shipping_mark.toLowerCase().includes(shippingMarkFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesShippingMark;
  });

  // Debug filtered claims
  console.log('=== FILTERED CLAIMS DEBUG ===');
  console.log('Total claims in state:', claims?.length || 0);
  console.log('Filtered claims count:', filteredClaims.length);
  console.log('Search term:', searchTerm);
  console.log('Status filter:', statusFilter);
  console.log('Shipping mark filter:', shippingMarkFilter);
  console.log('All claims in state:', claims);
  console.log('Filtered claims:', filteredClaims);

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'UNDER_REVIEW':
        return <AlertCircle className="h-4 w-4" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setShippingMarkFilter('');
  };

  // Open claim detail modal
  const openClaimDetail = (claim: AdminClaim) => {
    setSelectedClaim(claim);
    setStatusUpdate({
      status: claim.status,
      admin_notes: claim.admin_notes || '',
    });
    setShowDetailModal(true);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, loadData]);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        loadData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claims Management</h1>
          <p className="text-muted-foreground">
            Review and manage customer claims for lost or damaged items
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_claims}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.pending_claims}</div>
              <p className="text-xs text-muted-foreground">Needs review</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.under_review}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.status_breakdown.APPROVED}</div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.status_breakdown.RESOLVED}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent (7 days)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.recent_claims}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tracking ID, item name, shipping mark, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Input
                placeholder="Filter by shipping mark"
                value={shippingMarkFilter}
                onChange={(e) => setShippingMarkFilter(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all' || shippingMarkFilter) && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Claims ({filteredClaims.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading claims...</p>
              </div>
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Claims Found</h3>
              <p className="text-muted-foreground">
                {claims.length === 0 
                  ? "No claims have been submitted yet."
                  : "No claims match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Shipping Mark</TableHead>
                    <TableHead>Customer Details</TableHead>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim, index) => {
                    // Add safety checks for claim data but be less strict
                    if (!claim) {
                      console.warn('Null claim at index:', index);
                      return null;
                    }
                    
                    // Use index as fallback key if id is missing
                    const claimKey = claim.id || `claim-${index}`;
                    
                    return (
                      <TableRow key={claimKey}>
                        <TableCell className="font-medium">#{claim.id || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="font-mono text-lg font-semibold text-blue-600">
                            {claim.shipping_mark || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{claim.customer_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">
                              {claim.customer_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {claim.customer_phone}
                                </div>
                              )}
                              {claim.customer_region && (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {claim.customer_region}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{claim.tracking_id || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={claim.item_name || ''}>
                            {claim.item_name || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`flex items-center gap-1 w-fit ${claimsService.getStatusBadgeColor(claim.status || 'PENDING')}`}
                          >
                            {getStatusIcon(claim.status || 'PENDING')}
                            {claimsService.getStatusLabel(claim.status || 'PENDING')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{claim.created_at ? formatDate(claim.created_at) : 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {claim.created_at ? formatRelative(claim.created_at) : 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openClaimDetail(claim)}
                            disabled={!claim.id}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Claim Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Claim #{selectedClaim?.id} Details</DialogTitle>
            <DialogDescription>
              Review and update the claim status
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-6 pr-2">{/* Added right padding for scrollbar space */}
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Customer Name</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{selectedClaim.customer_name}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Shipping Mark</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Package className="h-4 w-4" />
                      <span className="font-mono text-lg font-semibold text-blue-600">{selectedClaim.shipping_mark}</span>
                    </div>
                  </div>
                  {selectedClaim.customer_phone && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4" />
                        <span>{selectedClaim.customer_phone}</span>
                      </div>
                    </div>
                  )}
                  {selectedClaim.customer_email && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        <span>{selectedClaim.customer_email}</span>
                      </div>
                    </div>
                  )}
                  {selectedClaim.customer_region && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Region</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedClaim.customer_region.replace('_', ' ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Claim Information */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tracking ID</Label>
                  <p className="font-mono mt-1">{selectedClaim.tracking_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Item Name</Label>
                  <p className="mt-1">{selectedClaim.item_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Item Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedClaim.item_description}</p>
                </div>
                
                {/* Images Section */}
                {(selectedClaim.image_1 || selectedClaim.image_2 || selectedClaim.image_3) && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Supporting Images
                    </Label>
                    <div className="flex gap-3 mt-2 flex-wrap">
                      {selectedClaim.image_1 && (
                        <div className="relative group">
                          <img
                            src={selectedClaim.image_1}
                            alt="Claim supporting image 1"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-all shadow-sm"
                            onClick={() => window.open(selectedClaim.image_1, '_blank')}
                            onError={(e) => {
                              console.error('Failed to load image 1:', selectedClaim.image_1);
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
                              target.classList.add('opacity-50');
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      )}
                      {selectedClaim.image_2 && (
                        <div className="relative group">
                          <img
                            src={selectedClaim.image_2}
                            alt="Claim supporting image 2"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-all shadow-sm"
                            onClick={() => window.open(selectedClaim.image_2, '_blank')}
                            onError={(e) => {
                              console.error('Failed to load image 2:', selectedClaim.image_2);
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
                              target.classList.add('opacity-50');
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      )}
                      {selectedClaim.image_3 && (
                        <div className="relative group">
                          <img
                            src={selectedClaim.image_3}
                            alt="Claim supporting image 3"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-all shadow-sm"
                            onClick={() => window.open(selectedClaim.image_3, '_blank')}
                            onError={(e) => {
                              console.error('Failed to load image 3:', selectedClaim.image_3);
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FcnJvcjwvdGV4dD48L3N2Zz4=';
                              target.classList.add('opacity-50');
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted</Label>
                  <p className="mt-1">{formatDate(selectedClaim.created_at)} ({formatRelative(selectedClaim.created_at)})</p>
                </div>
              </div>

              {/* Status Update */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <Select value={statusUpdate.status} onValueChange={(value: string) => setStatusUpdate(prev => ({ ...prev, status: value as ClaimStatusUpdate['status'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending Review</SelectItem>
                      <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="admin_notes">Admin Notes</Label>
                  <Textarea
                    id="admin_notes"
                    value={statusUpdate.admin_notes}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, admin_notes: e.target.value }))}
                    placeholder="Add internal notes about this claim..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowDetailModal(false)} disabled={updating}>
                  Close
                </Button>
                <Button onClick={handleStatusUpdate} disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Claim
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
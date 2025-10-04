import React, { useState, useEffect } from 'react';
import {
  Plus,
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
  Image as ImageIcon,
  Camera,
  Edit,
  Trash2
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
import { FileUpload } from '@/components/ui/file-upload';
import { claimsService, Claim, CreateClaimData } from '@/services/claimsService';
import { formatDate, formatRelative } from '@/lib/date';

export default function CustomerClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);

  // Form state for creating new claim
  const [newClaim, setNewClaim] = useState<CreateClaimData>({
    tracking_id: '',
    item_name: '',
    item_description: '',
    image_1: undefined,
    image_2: undefined,
    image_3: undefined,
  });

  // Load claims
  const loadClaims = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading customer claims...');
      const response = await claimsService.getCustomerClaims();
      console.log('Customer claims raw response:', response);
      console.log('Claims response success:', response.success);
      console.log('Claims data type:', typeof response.data);
      console.log('Claims data:', response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      // Handle the response properly - check if the request was successful
      if (response.success && response.data) {
        const claimsData = Array.isArray(response.data) ? response.data : [];
        console.log('Setting claims data:', claimsData);
        setClaims(claimsData);
      } else {
        console.log('Claims response unsuccessful or no data, setting empty array');
        setClaims([]);
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
      setError('Failed to load claims. Please try again.');
      setClaims([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Create new claim
  const handleCreateClaim = async () => {
    if (!newClaim.tracking_id || !newClaim.item_name || !newClaim.item_description) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const response = await claimsService.createClaim(newClaim);
      
      // Add the new claim to the list if response is successful
      if (response.success && response.data) {
        setClaims(prev => [response.data, ...prev]);
        
        // Reset form and close modal
        setNewClaim({
          tracking_id: '',
          item_name: '',
          item_description: '',
          image_1: undefined,
          image_2: undefined,
          image_3: undefined,
        });
        setShowCreateModal(false);
        setSuccess('Claim submitted successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to create claim. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Failed to create claim:', err);
      const apiError = err as { response?: { data?: Record<string, string[]> } };
      
      if (apiError?.response?.data) {
        const errorMessages = Object.entries(apiError.response.data)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('; ');
        setError(`Failed to create claim: ${errorMessages}`);
      } else {
        setError('Failed to create claim. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  // Edit claim
  const handleEditClaim = (claim: Claim) => {
    setEditingClaim(claim);
    setNewClaim({
      tracking_id: claim.tracking_id,
      item_name: claim.item_name,
      item_description: claim.item_description,
      image_1: undefined, // Reset images - they can upload new ones if needed
      image_2: undefined,
      image_3: undefined,
    });
    setShowEditModal(true);
  };

  // Update claim
  const handleUpdateClaim = async () => {
    if (!editingClaim || !newClaim.tracking_id || !newClaim.item_name || !newClaim.item_description) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setEditing(true);
      setError(null);
      setSuccess(null);

      const response = await claimsService.updateClaim(editingClaim.id, newClaim);
      
      if (response.success && response.data) {
        // Update the claim in the list
        setClaims(prev => prev.map(claim => 
          claim.id === editingClaim.id ? response.data : claim
        ));
        
        // Reset form and close modal
        setNewClaim({
          tracking_id: '',
          item_name: '',
          item_description: '',
          image_1: undefined,
          image_2: undefined,
          image_3: undefined,
        });
        setEditingClaim(null);
        setShowEditModal(false);
        setSuccess('Claim updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update claim. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Failed to update claim:', err);
      setError('Failed to update claim. Please try again.');
    } finally {
      setEditing(false);
    }
  };

  // Delete claim
  const handleDeleteClaim = async (claimId: number) => {
    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(claimId);
      setError(null);
      setSuccess(null);

      const response = await claimsService.deleteClaim(claimId);
      
      if (response.success) {
        // Remove the claim from the list
        setClaims(prev => prev.filter(claim => claim.id !== claimId));
        setSuccess('Claim deleted successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete claim. Please try again.');
      }
    } catch (err: unknown) {
      console.error('Failed to delete claim:', err);
      setError('Failed to delete claim. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  // Filter claims
  const filteredClaims = (claims || []).filter(claim => {
    const matchesSearch = searchTerm === '' || 
      claim.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.item_description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || statusFilter === '' || claim.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  // Get status badge variant
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'PENDING':
        return 'outline';
      case 'UNDER_REVIEW':
        return 'secondary';
      case 'APPROVED':
      case 'RESOLVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Claims</h1>
          <p className="text-muted-foreground">
            Submit and track claims for lost or damaged items
          </p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Claim
            </Button>
          </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[500px] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit New Claim</DialogTitle>
              <DialogDescription>
                Report a lost, damaged, or missing item from your shipment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="tracking_id">Tracking ID / Tracking Number *</Label>
                <Input
                  id="tracking_id"
                  value={newClaim.tracking_id}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, tracking_id: e.target.value }))}
                  placeholder="Enter tracking number"
                />
              </div>
              <div>
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  value={newClaim.item_name}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, item_name: e.target.value }))}
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <Label htmlFor="item_description">Item Description *</Label>
                <Textarea
                  id="item_description"
                  value={newClaim.item_description}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, item_description: e.target.value }))}
                  placeholder="Describe the item and the issue in detail..."
                  rows={4}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <Label className="text-base font-medium">Supporting Images (Optional)</Label>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload up to 3 images to support your claim. Images help us process your claim faster.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Image 1</Label>
                    <FileUpload
                      onFileSelect={(file) => setNewClaim(prev => ({ ...prev, image_1: file || undefined }))}
                      currentFile={newClaim.image_1 || null}
                      placeholder="Upload first image"
                      maxSize={5}
                      disabled={creating}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Image 2</Label>
                    <FileUpload
                      onFileSelect={(file) => setNewClaim(prev => ({ ...prev, image_2: file || undefined }))}
                      currentFile={newClaim.image_2 || null}
                      placeholder="Upload second image"
                      maxSize={5}
                      disabled={creating}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Image 3</Label>
                    <FileUpload
                      onFileSelect={(file) => setNewClaim(prev => ({ ...prev, image_3: file || undefined }))}
                      currentFile={newClaim.image_3 || null}
                      placeholder="Upload third image"
                      maxSize={5}
                      disabled={creating}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateClaim} disabled={creating} className="w-full sm:w-auto">
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Claim'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Claim Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Claim</DialogTitle>
              <DialogDescription>
                Update your claim details. You can only edit pending claims.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-tracking-id">Tracking ID *</Label>
                <Input
                  id="edit-tracking-id"
                  value={newClaim.tracking_id}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, tracking_id: e.target.value }))}
                  placeholder="Enter tracking ID or number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-item-name">Item Name *</Label>
                <Input
                  id="edit-item-name"
                  value={newClaim.item_name}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, item_name: e.target.value }))}
                  placeholder="Enter item name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={newClaim.item_description}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, item_description: e.target.value }))}
                  placeholder="Describe the issue with your item in detail..."
                  className="min-h-[100px]"
                  required
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label>Supporting Images (Optional - Upload new images to replace existing ones)</Label>
                <div className="space-y-3">
                  <FileUpload
                    id="edit-image-1"
                    label="Upload Image 1"
                    accept="image/*"
                    onChange={(file) => setNewClaim(prev => ({ ...prev, image_1: file }))}
                    icon={<Camera className="h-5 w-5" />}
                  />
                  <FileUpload
                    id="edit-image-2"
                    label="Upload Image 2"
                    accept="image/*"
                    onChange={(file) => setNewClaim(prev => ({ ...prev, image_2: file }))}
                    icon={<Camera className="h-5 w-5" />}
                  />
                  <FileUpload
                    id="edit-image-3"
                    label="Upload Image 3"
                    accept="image/*"
                    onChange={(file) => setNewClaim(prev => ({ ...prev, image_3: file }))}
                    icon={<Camera className="h-5 w-5" />}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClaim(null);
                    setNewClaim({
                      tracking_id: '',
                      item_name: '',
                      item_description: '',
                      image_1: undefined,
                      image_2: undefined,
                      image_3: undefined,
                    });
                  }}
                  disabled={editing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateClaim}
                  disabled={editing || !newClaim.tracking_id || !newClaim.item_name || !newClaim.item_description}
                  className="flex-1"
                >
                  {editing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Claim'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims by tracking ID, item name, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
            <Button variant="outline" size="sm" onClick={loadClaims} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading claims...</p>
          </div>
        </div>
      ) : filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Claims Found</h3>
            <p className="text-muted-foreground mb-4">
              {claims.length === 0 
                ? "You haven't submitted any claims yet."
                : "No claims match your current filters."
              }
            </p>
            {claims.length === 0 && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Claim
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => (
            <Card key={claim.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {claim.item_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Claim #{claim.id} • Tracking: {claim.tracking_id}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(claim.status)} className="flex items-center gap-1">
                    {getStatusIcon(claim.status)}
                    {claimsService.getStatusLabel(claim.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                    <p className="text-sm">{claim.item_description}</p>
                  </div>
                  
                  {/* Images Section */}
                  {(claim.image_1 || claim.image_2 || claim.image_3) && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-4 w-4" />
                        Supporting Images
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {claim.image_1 && (
                          <div key={`${claim.id}-image-1`} className="relative group">
                            <img
                              src={claim.image_1}
                              alt="Claim supporting image 1"
                              className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(claim.image_1, '_blank')}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {claim.image_2 && (
                          <div key={`${claim.id}-image-2`} className="relative group">
                            <img
                              src={claim.image_2}
                              alt="Claim supporting image 2"
                              className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(claim.image_2, '_blank')}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {claim.image_3 && (
                          <div key={`${claim.id}-image-3`} className="relative group">
                            <img
                              src={claim.image_3}
                              alt="Claim supporting image 3"
                              className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => window.open(claim.image_3, '_blank')}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Submitted {formatRelative(new Date(claim.created_at))}</span>
                    </div>
                    <div>
                      {claim.days_since_submission === 0 
                        ? 'Submitted today' 
                        : `${claim.days_since_submission} day${claim.days_since_submission > 1 ? 's' : ''} ago`
                      }
                    </div>
                  </div>

                  {claim.admin_notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <h4 className="font-medium text-sm mb-1">Admin Notes</h4>
                      <p className="text-sm">{claim.admin_notes}</p>
                    </div>
                  )}

                  {/* Action Buttons - Only show for pending claims */}
                  {(claim.status === 'PENDING') && (
                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClaim(claim)}
                        disabled={editing || deleting !== null}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClaim(claim.id)}
                        disabled={editing || deleting !== null}
                      >
                        {deleting === claim.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        {deleting === claim.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
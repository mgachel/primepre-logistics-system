import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Separator not used in this file
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DailyUpdate } from '@/services/dailyUpdatesService';
import dailyUpdatesService from '@/services/dailyUpdatesService';
import { DailyUpdateForm } from './DailyUpdateForm';
import { DailyUpdateViewDialog } from './DailyUpdateViewDialog';
import { DeleteConfirmDialog } from '../dialogs/DeleteConfirmDialog';
import { useAuthStore } from '@/stores/authStore';

export function DailyUpdatesAdmin() {
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = "#00703D";
  const primaryColor = isCustomer ? "#2563eb" : ADMIN_GREEN;
  const buttonStyle = { backgroundColor: primaryColor, color: "#FFFFFF" };
  const outlineButtonStyle = { borderColor: primaryColor, color: primaryColor };
  const iconStyle = { color: primaryColor };
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<DailyUpdate | null>(null);

  // Load daily updates
  const loadDailyUpdates = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const response = await dailyUpdatesService.getDailyUpdates({
        page,
        page_size: 20,
        ordering: '-created_at',
      });

      // Ensure we have valid data structure
      if (response && response.results && Array.isArray(response.results)) {
        setUpdates(response.results);
        setTotalCount(response.count || 0);
        setHasNextPage(!!response.next);
        setHasPreviousPage(!!response.previous);
        setCurrentPage(page);
      } else {
        // Handle unexpected response structure
        console.error('Unexpected API response structure:', response);
        setUpdates([]);
        setTotalCount(0);
        setHasNextPage(false);
        setHasPreviousPage(false);
        setError('Received invalid data from server');
      }
    } catch (err) {
      console.error('Error loading daily updates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load daily updates');
      setUpdates([]); // Ensure updates is always an array
      setTotalCount(0);
      setHasNextPage(false);
      setHasPreviousPage(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle create
  const handleCreate = async (data: any) => {
    try {
      await dailyUpdatesService.createDailyUpdate(data);
      setCreateDialogOpen(false);
      loadDailyUpdates(currentPage);
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle update
  const handleUpdate = async (data: any) => {
    if (!selectedUpdate) return;
    
    try {
      await dailyUpdatesService.updateDailyUpdate(selectedUpdate.id, data);
      setEditDialogOpen(false);
      setSelectedUpdate(null);
      loadDailyUpdates(currentPage);
    } catch (err) {
      throw err; // Let the form handle the error
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUpdate) return;
    
    try {
      await dailyUpdatesService.deleteDailyUpdate(selectedUpdate.id);
      setDeleteDialogOpen(false);
      setSelectedUpdate(null);
      loadDailyUpdates(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete update');
    }
  };

  // Handle extend expiry
  const handleExtendExpiry = async (update: DailyUpdate, days: number = 7) => {
    try {
      await dailyUpdatesService.extendExpiry(update.id, days);
      loadDailyUpdates(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extend expiry');
    }
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    loadDailyUpdates(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial load
  useEffect(() => {
    loadDailyUpdates(1);
  }, []);

  // Refresh data
  const handleRefresh = () => {
    loadDailyUpdates(currentPage);
  };

  if (loading && (!updates || updates.length === 0)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-0">
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Client Announcements</h1>
          {totalCount > 0 && (
            <Badge className="ml-2" style={{ backgroundColor: primaryColor, color: '#FFFFFF' }}>
              {totalCount} total
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={loading}
            className="flex-1 sm:flex-none"
            style={outlineButtonStyle}
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} style={iconStyle} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none" style={buttonStyle}>
                <Plus className="h-4 w-4 sm:mr-2" style={{ color: '#FFFFFF' }} />
                <span className="hidden sm:inline">Create Update</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Create Daily Update</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-2">
                <DailyUpdateForm onSubmit={handleCreate} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Updates Table */}
      {(!updates || updates.length === 0) && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Updates Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first daily update.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} style={buttonStyle}>
              <Plus className="h-4 w-4 mr-2" style={{ color: '#FFFFFF' }} />
              Create Update
            </Button>
          </CardContent>
        </Card>
      ) : (
        updates && updates.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Title</TableHead>
                      <TableHead className="min-w-[100px]">Priority</TableHead>
                      <TableHead className="min-w-[100px]">Created</TableHead>
                      <TableHead className="min-w-[100px]">Expires</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right min-w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updates.map((update) => (
                      <DailyUpdateRow
                        key={update.id}
                        update={update}
                        onView={(update) => {
                          setSelectedUpdate(update);
                          setViewDialogOpen(true);
                        }}
                        onEdit={(update) => {
                          setSelectedUpdate(update);
                          setEditDialogOpen(true);
                        }}
                        onDelete={(update) => {
                          setSelectedUpdate(update);
                          setDeleteDialogOpen(true);
                        }}
                        onExtendExpiry={handleExtendExpiry}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Pagination */}
      {(hasNextPage || hasPreviousPage) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            Showing page {currentPage} of {Math.ceil(totalCount / 20)}
          </div>
          <div className="flex space-x-2 order-1 sm:order-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              disabled={!hasPreviousPage || loading}
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex-1 sm:flex-none"
              style={outlineButtonStyle}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              disabled={!hasNextPage || loading}
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex-1 sm:flex-none"
              style={outlineButtonStyle}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Daily Update</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            {selectedUpdate && (
              <DailyUpdateForm 
                initialData={selectedUpdate}
                onSubmit={handleUpdate} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DailyUpdateViewDialog
        update={selectedUpdate}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Daily Update"
        description={`Are you sure you want to delete "${selectedUpdate?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}

// Daily Update Row Component
interface DailyUpdateRowProps {
  update: DailyUpdate;
  onView: (update: DailyUpdate) => void;
  onEdit: (update: DailyUpdate) => void;
  onDelete: (update: DailyUpdate) => void;
  onExtendExpiry: (update: DailyUpdate, days: number) => void;
}

function DailyUpdateRow({ update, onView, onEdit, onDelete, onExtendExpiry }: DailyUpdateRowProps) {
  const { user } = useAuthStore();
  const isCustomer = user?.user_role === 'CUSTOMER' || user?.is_admin_user === false;
  const ADMIN_GREEN = "#00703D";
  const primaryColor = isCustomer ? "#2563eb" : ADMIN_GREEN;
  const priorityColor = dailyUpdatesService.getPriorityColor(update.priority);
  const expiryText = dailyUpdatesService.formatDate(update.expires_at);
  const isExpiringSoon = dailyUpdatesService.isExpiringSoon(update);

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{update.title}</div>
          <div className="text-sm text-muted-foreground truncate max-w-xs">
            {update.content}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={priorityColor}>
          {update.priority_display}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {new Date(update.created_at).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell>
        <div className={`text-sm ${isExpiringSoon ? 'text-orange-600' : ''}`}>
          {expiryText}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex space-x-1">
          {update.is_expired && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              Expired
            </Badge>
          )}
          {isExpiringSoon && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Expiring Soon
            </Badge>
          )}
          {!update.is_expired && !isExpiringSoon && (
            <Badge variant="outline" style={{ color: primaryColor, borderColor: primaryColor }}>
              Active
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(update)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(update)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {(update.is_expired || isExpiringSoon) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExtendExpiry(update, 7)}
              title="Extend expiry by 7 days"
            >
              <Clock className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(update)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default DailyUpdatesAdmin;
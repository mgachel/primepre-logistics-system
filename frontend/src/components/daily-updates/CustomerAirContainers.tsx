import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Package, AlertCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { customerDailyUpdatesService, CargoContainer } from '@/services/customerDailyUpdatesService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerCargoItemsTable } from './CustomerCargoItemsTable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Customer Air Containers Component
 * Read-only view of air cargo containers from last 30 days
 * Mirrors admin dashboard functionality
 */
export function CustomerAirContainers() {
  const [containers, setContainers] = useState<CargoContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [containerDetails, setContainerDetails] = useState<Map<string, CargoContainer>>(new Map());

  useEffect(() => {
    loadContainers();
  }, [searchTerm, statusFilter, page]);

  const loadContainers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customerDailyUpdatesService.getAirContainers({
        search: searchTerm,
        status: statusFilter,
        page,
        page_size: 20,
      });

      setContainers(response.data || []);
      if (response.count) {
        setTotalPages(Math.ceil(response.count / 20));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load air containers');
      console.error('Error loading air containers:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const },
      in_transit: { label: 'In Transit', variant: 'default' as const },
      delivered: { label: 'Delivered', variant: 'success' as const },
      demurrage: { label: 'Demurrage', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleContainer = async (containerId: string) => {
    const isExpanded = expandedContainers.has(containerId);
    const newExpanded = new Set(expandedContainers);
    
    if (isExpanded) {
      newExpanded.delete(containerId);
      setExpandedContainers(newExpanded);
    } else {
      newExpanded.add(containerId);
      setExpandedContainers(newExpanded);
      
      // Load cargo items if not already loaded
      if (!containerDetails.has(containerId)) {
        try {
          setLoadingItems(new Set(loadingItems).add(containerId));
          const response = await customerDailyUpdatesService.getContainerDetails(containerId);
          const newDetails = new Map(containerDetails);
          newDetails.set(containerId, response.data);
          setContainerDetails(newDetails);
        } catch (err) {
          console.error('Error loading cargo items:', err);
        } finally {
          const newLoading = new Set(loadingItems);
          newLoading.delete(containerId);
          setLoadingItems(newLoading);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Air Cargo Containers (Last 30 Days)
          </CardTitle>
          <CardDescription>
            View-only list of air cargo containers. Search and filter available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by container ID, route, or tracking number..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter || 'all'} onValueChange={(value) => {
                setStatusFilter(value === 'all' ? '' : value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="demurrage">Demurrage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Containers Table */}
          {!loading && !error && (
            <>
              {containers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No air containers found in the last 30 days.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Load Date</TableHead>
                          <TableHead>ETA</TableHead>
                          <TableHead>Items</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {containers.map((container) => {
                          const isExpanded = expandedContainers.has(container.container_id);
                          const details = containerDetails.get(container.container_id);
                          const isLoading = loadingItems.has(container.container_id);

                          return (
                            <React.Fragment key={container.container_id}>
                              <TableRow 
                                key={container.container_id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleContainer(container.container_id)}
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell>{getStatusBadge(container.status)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(container.load_date)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(container.eta)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {container.total_cargo_items || 0} items
                                  </Badge>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={5} className="bg-muted/30 p-4">
                                    {isLoading ? (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                      </div>
                                    ) : details?.cargo_items ? (
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">Cargo Items in Container</h4>
                                        <CustomerCargoItemsTable 
                                          items={details.cargo_items} 
                                          cargoType="air"
                                        />
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground text-center py-4">
                                        No cargo items found
                                      </p>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomerAirContainers;

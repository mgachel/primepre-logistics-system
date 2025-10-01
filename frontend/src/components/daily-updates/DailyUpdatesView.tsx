import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Search, Filter, Calendar, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DailyUpdate, DailyUpdatesFilters } from '@/services/dailyUpdatesService';
import dailyUpdatesService from '@/services/dailyUpdatesService';

interface DailyUpdatesViewProps {
  className?: string;
}

export function DailyUpdatesView({ className }: DailyUpdatesViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '-created_at');

  // Load daily updates
  const loadDailyUpdates = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const filters: DailyUpdatesFilters = {
        page,
        page_size: 10,
        ordering: sortBy,
      };

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      if (priorityFilter !== 'all') {
        filters.priority = priorityFilter as 'low' | 'medium' | 'high';
      }

      // Use the main daily updates endpoint
      const response = await dailyUpdatesService.getDailyUpdates(filters);

      // Ensure we have valid data structure
      if (response && response.results && Array.isArray(response.results)) {
        setUpdates(Array.isArray(response.results) ? response.results : []);
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

  // Update URL params
  const updateUrlParams = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter);
    if (sortBy !== '-created_at') params.set('sort', sortBy);
    setSearchParams(params);
  };

  // Handle search
  const handleSearch = () => {
    updateUrlParams();
    loadDailyUpdates(1);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'priority':
        setPriorityFilter(value);
        break;
      case 'sort':
        setSortBy(value);
        break;
    }
  };

  // Apply filters
  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrlParams();
      loadDailyUpdates(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [priorityFilter, sortBy]);

  // Initial load
  useEffect(() => {
    loadDailyUpdates(1);
  }, []);

  // Handle pagination
  const handlePageChange = (page: number) => {
    loadDailyUpdates(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Refresh data
  const handleRefresh = () => {
    loadDailyUpdates(currentPage);
  };

  // Safety check: ensure updates is always an array
  const safeUpdates = Array.isArray(updates) ? updates : [];

  if (loading && safeUpdates.length === 0) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Daily Updates</h1>
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {totalCount} total
            </Badge>
          )}
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search updates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={priorityFilter} onValueChange={(value) => handleFilterChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(value) => handleFilterChange('sort', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_at">Newest First</SelectItem>
                  <SelectItem value="created_at">Oldest First</SelectItem>
                  <SelectItem value="-priority">Priority High to Low</SelectItem>
                  <SelectItem value="priority">Priority Low to High</SelectItem>
                  <SelectItem value="expires_at">Expiry Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(searchTerm || priorityFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleSearch} className="mr-2">
                <Search className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setPriorityFilter('all');
                  setSortBy('-created_at');
                  setSearchParams(new URLSearchParams());
                  loadDailyUpdates(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Updates List */}
      {safeUpdates.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Updates Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || priorityFilter !== 'all' 
                ? 'Try adjusting your filters to see more updates.'
                : 'There are no daily updates available at the moment.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        safeUpdates.length > 0 && (
          <div className="space-y-4">
            {safeUpdates.map((update) => (
              <DailyUpdateCard key={update.id} update={update} />
            ))}
          </div>
        )
      )}

      {/* Pagination */}
      {(hasNextPage || hasPreviousPage) && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing page {currentPage} of {Math.ceil(totalCount / 10)}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              disabled={!hasPreviousPage || loading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              disabled={!hasNextPage || loading}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Daily Update Card Component
interface DailyUpdateCardProps {
  update: DailyUpdate;
}

function DailyUpdateCard({ update }: DailyUpdateCardProps) {
  const priorityColor = dailyUpdatesService.getPriorityColor(update.priority);
  const expiryText = dailyUpdatesService.formatDate(update.expires_at);
  const isExpiringSoon = dailyUpdatesService.isExpiringSoon(update);

  return (
    <Card className={`transition-all hover:shadow-md ${update.is_expired ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{update.title}</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(update.created_at).toLocaleDateString()}
              </div>
              {update.expires_at && (
                <div className={`flex items-center ${isExpiringSoon ? 'text-orange-600' : ''}`}>
                  <Clock className="h-4 w-4 mr-1" />
                  {expiryText}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isExpiringSoon && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Expiring Soon
              </Badge>
            )}
            {update.is_expired && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                Expired
              </Badge>
            )}
            <Badge className={priorityColor}>
              {update.priority_display}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="prose prose-sm max-w-none">
          <p className="text-foreground whitespace-pre-wrap">{update.content}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default DailyUpdatesView;
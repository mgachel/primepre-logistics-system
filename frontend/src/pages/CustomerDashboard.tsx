import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  FileText,
  Download
} from 'lucide-react';
import dailyUpdatesService, { DailyUpdate } from '@/services/dailyUpdatesService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

// Daily Update Card Component
const DailyUpdateCard = ({ update, isExpanded, onToggle }: { update: DailyUpdate; isExpanded: boolean; onToggle: () => void }) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpiring = update.days_until_expiry !== null && update.days_until_expiry <= 7 && update.days_until_expiry > 0;
  const isExpired = update.is_expired;

  return (
    <Card className={`${isExpired ? 'opacity-60 border-gray-300' : ''} ${update.priority === 'high' ? 'border-red-200 shadow-md' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {getPriorityIcon(update.priority)}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{update.title}</CardTitle>
                {getPriorityBadge(update.priority)}
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(update.created_at)}</span>
                </div>
                {update.expires_at && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {isExpired ? 'Expired' : isExpiring ? `Expires in ${update.days_until_expiry} days` : 'Active'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="ml-2"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <>
          <Separator />
          <CardContent className="pt-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {update.content}
              </div>
            </div>
            
            {update.attachment_url && (
              <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{update.attachment_name || 'Attached File'}</p>
                      {update.attachment_size_display && (
                        <p className="text-xs text-muted-foreground">{update.attachment_size_display}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={update.attachment_url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            )}
            
            {isExpiring && (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  This update will expire in {update.days_until_expiry} days
                </AlertDescription>
              </Alert>
            )}
            
            {isExpired && (
              <Alert className="mt-4 border-gray-200 bg-gray-50">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-800">
                  This update has expired
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};

// Main CustomerDashboard component
export default function CustomerDashboard() {
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [showExpired, setShowExpired] = useState(false);

  // Load daily updates
  const loadDailyUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await dailyUpdatesService.getDailyUpdates({
        page: 1,
        page_size: 50,
        ordering: '-created_at',
        expired: showExpired ? undefined : false,
      });

      if (response && response.results && Array.isArray(response.results)) {
        setUpdates(response.results);
        // All updates are collapsed by default
        setExpandedIds(new Set());
      } else {
        setUpdates([]);
      }
    } catch (err) {
      console.error('Error loading daily updates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load updates');
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadDailyUpdates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExpired]);

  // Manual refresh handler
  const handleRefresh = () => {
    loadDailyUpdates();
  };

  // Toggle expand/collapse
  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // Expand all
  const expandAll = () => {
    setExpandedIds(new Set(updates.map(u => u.id)));
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Filter updates
  const activeUpdates = updates.filter(u => !u.is_expired);
  const expiredUpdates = updates.filter(u => u.is_expired);
  const displayedUpdates = showExpired ? updates : activeUpdates;

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <span className="block">Loading updates...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Updates</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Announcements
          </h1>
          <p className="text-muted-foreground mt-2">
            Stay informed with the latest updates from our team
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

      {/* Stats and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-green-100 text-green-800">
              {activeUpdates.length} Active
            </Badge>
            {expiredUpdates.length > 0 && (
              <Badge variant="secondary">
                {expiredUpdates.length} Expired
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {displayedUpdates.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </>
          )}
          {expiredUpdates.length > 0 && (
            <Button 
              variant={showExpired ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowExpired(!showExpired)}
            >
              {showExpired ? 'Hide' : 'Show'} Expired
            </Button>
          )}
        </div>
      </div>

      {/* Updates List */}
      {displayedUpdates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Updates Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              There are no annpuncements available at the moment. Check back later for new announcements and information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedUpdates.map((update) => (
            <DailyUpdateCard
              key={update.id}
              update={update}
              isExpanded={expandedIds.has(update.id)}
              onToggle={() => toggleExpand(update.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
import { Calendar, Clock, User, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { DailyUpdate } from '@/services/dailyUpdatesService';
import dailyUpdatesService from '@/services/dailyUpdatesService';

interface DailyUpdateViewDialogProps {
  update: DailyUpdate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyUpdateViewDialog({ update, open, onOpenChange }: DailyUpdateViewDialogProps) {
  if (!update) return null;

  const priorityColor = dailyUpdatesService.getPriorityColor(update.priority);
  const expiryText = dailyUpdatesService.formatDate(update.expires_at);
  const isExpiringSoon = dailyUpdatesService.isExpiringSoon(update);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Daily Update Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-semibold pr-4">{update.title}</h2>
              <div className="flex items-center space-x-2 flex-shrink-0">
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
                <Badge className={priorityColor}>
                  {update.priority_display}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created: {new Date(update.created_at).toLocaleString()}</span>
              </div>
              
              {update.expires_at && (
                <div className={`flex items-center space-x-2 ${
                  isExpiringSoon ? 'text-orange-600' : 'text-muted-foreground'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span>{expiryText}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Last updated: {new Date(update.updated_at).toLocaleString()}</span>
              </div>

              {update.days_until_expiry !== null && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {update.days_until_expiry > 0 
                      ? `${update.days_until_expiry} days remaining`
                      : update.is_expired 
                        ? 'Expired'
                        : 'Expires today'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Content</h3>
            <div className="prose prose-sm max-w-none">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {update.content}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{update.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge className={priorityColor} variant="outline">
                    {update.priority_display}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={
                    update.is_expired 
                      ? 'text-red-600' 
                      : isExpiringSoon 
                        ? 'text-orange-600' 
                        : 'text-green-600'
                  }>
                    {update.is_expired 
                      ? 'Expired' 
                      : isExpiringSoon 
                        ? 'Expiring Soon' 
                        : 'Active'
                    }
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{update.created_at_formatted || new Date(update.created_at).toLocaleDateString()}</span>
                </div>
                {update.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className={isExpiringSoon ? 'text-orange-600' : ''}>
                      {update.expires_at_formatted || new Date(update.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>{new Date(update.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning for expired/expiring updates */}
          {(update.is_expired || isExpiringSoon) && (
            <div className={`p-4 rounded-lg border ${
              update.is_expired 
                ? 'bg-red-50 border-red-200 text-red-800' 
                : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {update.is_expired ? 'Update Expired' : 'Update Expiring Soon'}
                </span>
              </div>
              <p className="text-sm mt-1">
                {update.is_expired 
                  ? 'This update has expired and may no longer be relevant.'
                  : 'This update will expire soon. Consider extending the expiry date if still relevant.'
                }
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DailyUpdateViewDialog;
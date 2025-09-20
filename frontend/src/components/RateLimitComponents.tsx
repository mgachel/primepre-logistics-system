/**
 * Rate Limit Notification Components
 * 
 * User-friendly UI components for displaying rate limit status
 * and queue progress to users
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Wifi, WifiOff, CheckCircle, XCircle } from 'lucide-react';
import { useThrottledApiQueue } from '../hooks/useThrottledApiQueue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

/**
 * Rate Limit Banner Component
 * Shows when the API is rate limited with countdown
 */
export function RateLimitBanner() {
  const { status, rateLimitInfo } = useThrottledApiQueue();
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!rateLimitInfo.isActive || !rateLimitInfo.retryAfterTimestamp) {
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, rateLimitInfo.retryAfterTimestamp! - Date.now());
      setCountdown(Math.ceil(remaining / 1000));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [rateLimitInfo]);

  if (!rateLimitInfo.isActive) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-800">
      <Clock className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>
          {rateLimitInfo.message || 'Server is busy. Please wait...'}
        </span>
        {countdown > 0 && (
          <Badge variant="outline" className="ml-2">
            {countdown}s
          </Badge>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * API Queue Status Component
 * Shows current queue status and circuit breaker state
 */
export function ApiQueueStatus() {
  const { status } = useThrottledApiQueue();

  const getCircuitBreakerColor = () => {
    switch (status.circuitState) {
      case 'CLOSED': return 'text-green-600';
      case 'HALF_OPEN': return 'text-yellow-600';
      case 'OPEN': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCircuitBreakerIcon = () => {
    switch (status.circuitState) {
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      case 'HALF_OPEN': return <Clock className="h-4 w-4" />;
      case 'OPEN': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-center space-x-4 text-sm text-gray-600">
      {/* Circuit Breaker Status */}
      <div className={`flex items-center space-x-1 ${getCircuitBreakerColor()}`}>
        {getCircuitBreakerIcon()}
        <span>API: {status.circuitState}</span>
      </div>

      {/* Queue Length */}
      {status.queueLength > 0 && (
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>{status.queueLength} queued</span>
        </div>
      )}

      {/* Processing Indicator */}
      {status.isProcessing && (
        <div className="flex items-center space-x-1 text-blue-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Connection Status Component
 * Shows overall connection health
 */
export function ConnectionStatus() {
  const { status, rateLimitInfo } = useThrottledApiQueue();
  
  const isHealthy = status.circuitState === 'CLOSED' && !rateLimitInfo.isActive;
  const hasIssues = status.circuitState === 'OPEN' || rateLimitInfo.isActive;

  return (
    <div className="flex items-center space-x-2">
      {isHealthy ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">Connected</span>
        </>
      ) : hasIssues ? (
        <>
          <WifiOff className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">Limited</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-600">Reconnecting</span>
        </>
      )}
    </div>
  );
}

/**
 * Loading Progress Component
 * Shows dashboard loading progress
 */
interface LoadingProgressProps {
  title?: string;
  showDetails?: boolean;
}

export function LoadingProgress({ 
  title = "Loading dashboard...", 
  showDetails = false 
}: LoadingProgressProps) {
  const { status, isLoading } = useThrottledApiQueue();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }

    // Simulate progress based on queue activity
    const interval = setInterval(() => {
      setProgress(prev => {
        if (status.queueLength === 0) return 100;
        
        // Calculate progress based on queue processing
        const totalEstimated = 5; // Estimated total requests
        const remaining = status.queueLength;
        const completed = totalEstimated - remaining;
        
        return Math.min(95, (completed / totalEstimated) * 100);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading, status.queueLength]);

  if (!isLoading && progress >= 100) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {status.isProcessing ? 'Processing request...' : 
             status.queueLength > 0 ? `${status.queueLength} requests queued` : 
             'Completing...'}
          </span>
          <ApiQueueStatus />
        </div>
      )}
    </div>
  );
}

/**
 * Retry Button Component
 * Allows manual retry when there are issues
 */
interface RetryButtonProps {
  onRetry: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function RetryButton({ onRetry, disabled, children }: RetryButtonProps) {
  const { status } = useThrottledApiQueue();
  
  const canRetry = status.circuitState !== 'OPEN' && !status.rateLimitInfo.isActive;
  
  return (
    <button
      onClick={onRetry}
      disabled={disabled || !canRetry}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        canRetry && !disabled
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      {children || 'Retry'}
    </button>
  );
}

/**
 * Full Status Panel Component
 * Comprehensive status display for development/debugging
 */
export function ApiStatusPanel() {
  const { status, clearCache, resetQueue } = useThrottledApiQueue();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">API Status</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium">Circuit State:</span>
          <span className={`ml-2 ${
            status.circuitState === 'CLOSED' ? 'text-green-600' :
            status.circuitState === 'HALF_OPEN' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {status.circuitState}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Queue Length:</span>
          <span className="ml-2">{status.queueLength}</span>
        </div>
        
        <div>
          <span className="font-medium">Processing:</span>
          <span className="ml-2">{status.isProcessing ? 'Yes' : 'No'}</span>
        </div>
        
        <div>
          <span className="font-medium">Rate Limited:</span>
          <span className="ml-2">{status.rateLimitInfo.isActive ? 'Yes' : 'No'}</span>
        </div>
      </div>

      {status.rateLimitInfo.isActive && (
        <div className="text-sm">
          <span className="font-medium">Rate Limit Message:</span>
          <div className="mt-1 text-gray-600">{status.rateLimitInfo.message}</div>
        </div>
      )}

      <div className="flex space-x-2 pt-2">
        <button
          onClick={() => clearCache()}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
        >
          Clear Cache
        </button>
        <button
          onClick={resetQueue}
          className="px-3 py-1 bg-red-200 text-red-700 rounded text-xs hover:bg-red-300"
        >
          Reset Queue
        </button>
      </div>
    </div>
  );
}
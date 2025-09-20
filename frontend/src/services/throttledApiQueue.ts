/**
 * Throttled API Queue Service
 * 
 * Manages API requests to prevent rate limiting by:
 * - Sequencing requests with configurable delays
 * - Implementing circuit breaker pattern
 * - Handling 429 responses with Retry-After headers
 * - Providing graceful degradation with caching
 */

import { ApiResponse } from './api';

// Configuration constants
export const API_QUEUE_CONFIG = {
  // Request spacing - Minimal delay for development
  REQUEST_DELAY_MS: 10,             // 10ms between requests (nearly instant)
  
  // Circuit breaker thresholds
  FAILURE_THRESHOLD: 5,             // More tolerance before opening circuit
  RECOVERY_TIMEOUT_MS: 60000,       // 1 minute before trying recovery (reduced)
  HALF_OPEN_TIMEOUT_MS: 30000,      // 30 seconds in half-open state (reduced)
  
  // Retry configuration
  MAX_RETRY_DELAY_MS: 10000,        // Max 10 seconds retry delay (reduced)
  DEFAULT_RETRY_DELAY_MS: 2000,     // Default 2 seconds if no Retry-After (reduced)
  
  // Cache configuration
  CACHE_TTL_MS: 300000,             // 5 minutes cache TTL
  OFFLINE_CACHE_DAYS: 7,            // Keep offline cache for 7 days
} as const;

// Queue item interface
interface QueueItem<T> {
  id: string;
  requestFn: () => Promise<ApiResponse<T>>;
  resolve: (value: ApiResponse<T>) => void;
  reject: (error: Error) => void;
  priority: 'high' | 'medium' | 'low';
  cacheKey?: string;
  retryCount: number;
  maxRetries: number;
}

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Rate limit info interface
export interface RateLimitInfo {
  isActive: boolean;
  retryAfterSeconds?: number;
  retryAfterTimestamp?: number;
  message?: string;
}

// Queue status interface
export interface QueueStatus {
  isProcessing: boolean;
  queueLength: number;
  circuitState: CircuitState;
  rateLimitInfo: RateLimitInfo;
  lastError?: string;
}

/**
 * Throttled API Queue Class
 * Manages sequential API requests with rate limiting protection
 */
class ThrottledApiQueue {
  private queue: QueueItem<any>[] = [];
  private isProcessing = false;
  private circuitState: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private rateLimitInfo: RateLimitInfo = { isActive: false };
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private statusListeners: Array<(status: QueueStatus) => void> = [];

  /**
   * Add a request to the queue or execute immediately if bypass is enabled
   */
  async enqueue<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      cacheKey?: string;
      maxRetries?: number;
      id?: string;
      bypass?: boolean; // Skip queue entirely for critical requests
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      priority = 'medium',
      cacheKey,
      maxRetries = 2,
      id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bypass = false
    } = options;

    // Check cache first if cacheKey provided
    if (cacheKey) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached) {
        console.log(`📋 Using cached data for ${cacheKey}`);
        return cached;
      }
    }

    // Bypass queue for critical requests (like dashboard)
    if (bypass) {
      console.log(`🚀 BYPASS: Executing request ${id} immediately`);
      try {
        const result = await requestFn();
        if (cacheKey && result.success) {
          this.setCachedData(cacheKey, result);
        }
        return result;
      } catch (error) {
        console.error(`❌ BYPASS request ${id} failed:`, error);
        return {
          data: {} as T,
          success: false,
          message: error instanceof Error ? error.message : 'Request failed',
        };
      }
    }

    // Check cache first if cacheKey provided
    if (cacheKey) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached) {
        console.log(`📋 Using cached data for ${cacheKey}`);
        return cached;
      }
    }

    // Check circuit breaker
    if (this.circuitState === 'OPEN') {
      console.warn('🚫 Circuit breaker is OPEN - rejecting request');
      return {
        data: {} as T,
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
      };
    }

    // Check rate limit
    if (this.rateLimitInfo.isActive) {
      const waitTime = this.getRemainingWaitTime();
      if (waitTime > 0) {
        console.warn(`⏳ Rate limited - ${Math.ceil(waitTime / 1000)}s remaining`);
        return {
          data: {} as T,
          success: false,
          message: `Server busy. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        };
      }
    }

    return new Promise((resolve, reject) => {
      const queueItem: QueueItem<T> = {
        id,
        requestFn,
        resolve,
        reject,
        priority,
        cacheKey,
        retryCount: 0,
        maxRetries,
      };

      // Insert based on priority
      this.insertByPriority(queueItem);
      
      console.log(`📝 Queued request ${id} (priority: ${priority}, queue length: ${this.queue.length})`);
      this.notifyStatusChange();
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyStatusChange();

    while (this.queue.length > 0) {
      // Check circuit breaker state
      this.updateCircuitState();
      
      if (this.circuitState === 'OPEN') {
        console.warn('🚫 Circuit breaker OPEN - stopping queue processing');
        this.rejectAllPending('Circuit breaker is open');
        break;
      }

      // Check rate limit
      if (this.rateLimitInfo.isActive) {
        const waitTime = this.getRemainingWaitTime();
        if (waitTime > 0) {
          console.log(`⏳ Rate limited - waiting ${Math.ceil(waitTime / 1000)}s`);
          await this.sleep(waitTime);
          continue;
        } else {
          // Rate limit expired
          this.rateLimitInfo = { isActive: false };
          this.notifyStatusChange();
        }
      }

      const item = this.queue.shift();
      if (!item) continue;

      try {
        console.log(`🚀 Processing request ${item.id}`);
        
        // Execute the request
        const result = await item.requestFn();
        
        // Handle the response
        if (result.success) {
          // Success - reset failure count and cache result
          this.onSuccess();
          
          if (item.cacheKey) {
            this.setCachedData(item.cacheKey, result);
          }
          
          item.resolve(result);
          console.log(`✅ Request ${item.id} completed successfully`);
        } else {
          // Check if it's a rate limiting error
          if (this.isRateLimitError(result.message)) {
            this.handleRateLimitResponse(result.message);
            
            // Retry the item if possible
            if (item.retryCount < item.maxRetries) {
              item.retryCount++;
              this.insertByPriority(item); // Re-queue for retry
              console.log(`🔄 Re-queuing request ${item.id} (attempt ${item.retryCount + 1})`);
            } else {
              item.resolve(result); // Max retries exceeded
            }
          } else {
            // Non-rate-limit error
            item.resolve(result);
          }
        }
        
      } catch (error) {
        console.error(`❌ Request ${item.id} failed:`, error);
        this.onFailure();
        
        // Retry or reject
        if (item.retryCount < item.maxRetries) {
          item.retryCount++;
          this.insertByPriority(item);
          console.log(`🔄 Re-queuing failed request ${item.id} (attempt ${item.retryCount + 1})`);
        } else {
          const errorResult: ApiResponse<any> = {
            data: {} as any,
            success: false,
            message: error instanceof Error ? error.message : 'Request failed',
          };
          item.resolve(errorResult);
        }
      }

      // Wait before next request (unless queue is empty, circuit is open, or next item is high priority)
      if (this.queue.length > 0 && this.circuitState !== 'OPEN') {
        const nextItem = this.queue[0];
        const shouldSkipDelay = nextItem?.priority === 'high';
        
        if (!shouldSkipDelay) {
          console.log(`⏰ Waiting ${API_QUEUE_CONFIG.REQUEST_DELAY_MS}ms before next request`);
          await this.sleep(API_QUEUE_CONFIG.REQUEST_DELAY_MS);
        } else {
          console.log(`🚀 High priority request - skipping delay`);
        }
      }
    }

    this.isProcessing = false;
    this.notifyStatusChange();
    console.log('🏁 Queue processing completed');
  }

  /**
   * Handle rate limit response
   */
  private handleRateLimitResponse(message: string): void {
    console.warn('🚫 Rate limit detected:', message);
    
    // Try to extract Retry-After from message
    let retryAfterSeconds = API_QUEUE_CONFIG.DEFAULT_RETRY_DELAY_MS / 1000;
    
    // Look for patterns like "Expected available in X seconds"
    const match = message.match(/available in (\d+) seconds/i);
    if (match) {
      retryAfterSeconds = Math.min(
        parseInt(match[1]),
        API_QUEUE_CONFIG.MAX_RETRY_DELAY_MS / 1000
      );
    }

    this.rateLimitInfo = {
      isActive: true,
      retryAfterSeconds,
      retryAfterTimestamp: Date.now() + (retryAfterSeconds * 1000),
      message: `Server busy. Retrying in ${Math.ceil(retryAfterSeconds)} seconds.`
    };

    this.onFailure();
    this.notifyStatusChange();
  }

  /**
   * Check if error message indicates rate limiting
   */
  private isRateLimitError(message: string): boolean {
    const rateLimitKeywords = [
      'throttled',
      'rate limit',
      'too many requests',
      'expected available in',
      '429'
    ];
    
    return rateLimitKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Circuit breaker management
   */
  private updateCircuitState(): void {
    const now = Date.now();
    
    switch (this.circuitState) {
      case 'CLOSED':
        if (this.failureCount >= API_QUEUE_CONFIG.FAILURE_THRESHOLD) {
          this.circuitState = 'OPEN';
          console.warn(`🚫 Circuit breaker OPENED (${this.failureCount} failures)`);
          this.notifyStatusChange();
        }
        break;
        
      case 'OPEN':
        if (now - this.lastFailureTime > API_QUEUE_CONFIG.RECOVERY_TIMEOUT_MS) {
          this.circuitState = 'HALF_OPEN';
          console.log('🔄 Circuit breaker HALF_OPEN - attempting recovery');
          this.notifyStatusChange();
        }
        break;
        
      case 'HALF_OPEN':
        // Will transition to CLOSED on next success or OPEN on next failure
        break;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
      console.log('✅ Circuit breaker CLOSED - service recovered');
      this.notifyStatusChange();
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'OPEN';
      console.warn('🚫 Circuit breaker OPEN - recovery failed');
      this.notifyStatusChange();
    }
  }

  /**
   * Cache management
   */
  private getCachedData<T>(key: string): ApiResponse<T> | null {
    // Check memory cache first
    const memoryCache = this.cache.get(key);
    if (memoryCache && Date.now() - memoryCache.timestamp < memoryCache.ttl) {
      return memoryCache.data;
    }

    // Check localStorage cache
    try {
      const stored = localStorage.getItem(`api_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const age = Date.now() - parsed.timestamp;
        
        // Use offline cache if less than configured days old
        if (age < API_QUEUE_CONFIG.OFFLINE_CACHE_DAYS * 24 * 60 * 60 * 1000) {
          console.log(`📋 Using offline cache for ${key} (${Math.round(age / 1000 / 60)} min old)`);
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn('Failed to read cache:', error);
    }

    return null;
  }

  private setCachedData<T>(key: string, data: ApiResponse<T>): void {
    // Store in memory cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: API_QUEUE_CONFIG.CACHE_TTL_MS,
    });

    // Store in localStorage for offline access
    try {
      localStorage.setItem(`api_cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Utility methods
   */
  private insertByPriority<T>(item: QueueItem<T>): void {
    const priorities = { high: 0, medium: 1, low: 2 };
    const insertIndex = this.queue.findIndex(
      queueItem => priorities[queueItem.priority] > priorities[item.priority]
    );
    
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }
  }

  private getRemainingWaitTime(): number {
    if (!this.rateLimitInfo.isActive || !this.rateLimitInfo.retryAfterTimestamp) {
      return 0;
    }
    return Math.max(0, this.rateLimitInfo.retryAfterTimestamp - Date.now());
  }

  private rejectAllPending(reason: string): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        const errorResult: ApiResponse<any> = {
          data: {} as any,
          success: false,
          message: reason,
        };
        item.resolve(errorResult);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Public API methods
   */
  
  getStatus(): QueueStatus {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      circuitState: this.circuitState,
      rateLimitInfo: { ...this.rateLimitInfo },
      lastError: this.failureCount > 0 ? 'Recent failures detected' : undefined,
    };
  }

  onStatusChange(listener: (status: QueueStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => listener(status));
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      try {
        localStorage.removeItem(`api_cache_${key}`);
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
    } else {
      this.cache.clear();
      try {
        Object.keys(localStorage).forEach(storageKey => {
          if (storageKey.startsWith('api_cache_')) {
            localStorage.removeItem(storageKey);
          }
        });
      } catch (error) {
        console.warn('Failed to clear all cache:', error);
      }
    }
  }

  // Force reset (for testing/emergency)
  reset(): void {
    this.queue = [];
    this.isProcessing = false;
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.rateLimitInfo = { isActive: false };
    this.notifyStatusChange();
    console.log('🔄 Queue reset');
  }
}

// Global instance
export const throttledApiQueue = new ThrottledApiQueue();
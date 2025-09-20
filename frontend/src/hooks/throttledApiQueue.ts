// Re-export the real throttledApiQueue implementation from services to ensure
// there's a single shared queue instance used across the app. This enforces
// request spacing, caching, and circuit-breaker behavior.
export { throttledApiQueue } from '@/services/throttledApiQueue';
export type { QueueStatus, RateLimitInfo } from '@/services/throttledApiQueue';

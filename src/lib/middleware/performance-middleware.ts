/**
 * Performance Tracking Middleware
 * 
 * Wraps API routes to automatically track response times and errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordResponseTime } from '@/lib/monitoring/performance-metrics';

/**
 * Paths to exclude from performance tracking
 */
const EXCLUDED_PATHS = [
  '/api/health',
  '/api/health/ready',
  '/api/health/live',
  '/api/status',
  '/_next',
  '/favicon.ico',
];

/**
 * Check if path should be excluded from tracking
 */
function shouldExclude(path: string): boolean {
  return EXCLUDED_PATHS.some(excluded => path.startsWith(excluded));
}

/**
 * Performance tracking wrapper for API route handlers
 * 
 * @example
 * ```ts
 * import { withPerformanceTracking } from '@/lib/middleware/performance-middleware';
 * 
 * export const GET = withPerformanceTracking(async (request: NextRequest) => {
 *   return NextResponse.json({ data: 'ok' });
 * });
 * ```
 */
export function withPerformanceTracking(
  handler: (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params: Record<string, string> }): Promise<NextResponse> => {
    const path = new URL(request.url).pathname;
    const method = request.method;

    // Skip excluded paths
    if (shouldExclude(path)) {
      return handler(request, context);
    }

    const startTime = Date.now();
    let isError = false;

    try {
      const response = await handler(request, context);
      
      // Consider 4xx and 5xx as errors for tracking purposes
      if (response.status >= 400) {
        isError = true;
      }
      
      return response;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      recordResponseTime(path, method, duration, isError);
    }
  };
}

/**
 * Performance tracking for individual API calls (manual usage)
 */
export class PerformanceTracker {
  private startTime: number;
  private path: string;
  private method: string;
  private ended: boolean = false;

  constructor(path: string, method: string) {
    this.startTime = Date.now();
    this.path = path;
    this.method = method;
  }

  /**
   * End tracking and record metrics
   */
  end(isError: boolean = false): number {
    if (this.ended) {
      return 0;
    }
    this.ended = true;
    
    const duration = Date.now() - this.startTime;
    
    if (!shouldExclude(this.path)) {
      recordResponseTime(this.path, this.method, duration, isError);
    }
    
    return duration;
  }

  /**
   * Get elapsed time without ending tracking
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Create a performance tracker for manual timing
 * 
 * @example
 * ```ts
 * const tracker = trackPerformance('/api/custom', 'POST');
 * // ... do work ...
 * const duration = tracker.end(false); // false = no error
 * ```
 */
export function trackPerformance(path: string, method: string): PerformanceTracker {
  return new PerformanceTracker(path, method);
}

/**
 * Performance Tracking Integration Example
 * 
 * This file demonstrates how to add performance tracking to API routes.
 * Copy this pattern to other API routes as needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackPerformance } from '@/lib/middleware/performance-middleware';

/**
 * Example: Adding performance tracking to an API handler
 * 
 * The performance middleware automatically tracks:
 * - Response time
 * - Error rate
 * - Request count
 * - Percentiles (p50, p95, p99)
 */

// ============================================
// Option 1: Using withPerformanceTracking wrapper
// ============================================

import { withPerformanceTracking } from '@/lib/middleware/performance-middleware';

export const trackedGET = withPerformanceTracking(async (request: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ data: 'ok' });
});

// ============================================
// Option 2: Manual tracking (for more control)
// ============================================

export async function manualTracking(request: NextRequest) {
  const tracker = trackPerformance('/api/example', 'GET');
  
  try {
    // Your API logic here
    const result = { data: 'ok' };
    
    // Mark as success
    tracker.end(false);
    
    return NextResponse.json(result);
  } catch (error) {
    // Mark as error
    tracker.end(true);
    throw error;
  }
}

// ============================================
// Option 3: Tracking specific operations
// ============================================

import { recordResponseTime } from '@/lib/monitoring/performance-metrics';

export async function trackSpecificOperations(request: NextRequest) {
  const startTime = Date.now();
  
  // Track database query
  const dbStart = Date.now();
  // ... database query ...
  const dbDuration = Date.now() - dbStart;
  recordResponseTime('/api/example/db-query', 'INTERNAL', dbDuration);
  
  // Track external API call
  const apiStart = Date.now();
  // ... external API call ...
  const apiDuration = Date.now() - apiStart;
  recordResponseTime('/api/example/external-api', 'INTERNAL', apiDuration);
  
  const totalDuration = Date.now() - startTime;
  
  return NextResponse.json({
    timing: {
      total: totalDuration,
      db: dbDuration,
      api: apiDuration,
    }
  });
}

// ============================================
// Integration Pattern for Existing Routes
// ============================================

/**
 * BEFORE:
 * ```ts
 * export async function GET(request: NextRequest) {
 *   // ... handler code ...
 *   return NextResponse.json(data);
 * }
 * ```
 * 
 * AFTER:
 * ```ts
 * import { withPerformanceTracking } from '@/lib/middleware/performance-middleware';
 * 
 * export const GET = withPerformanceTracking(async (request: NextRequest) => {
 *   // ... handler code ...
 *   return NextResponse.json(data);
 * });
 * ```
 */

/**
 * For routes with multiple methods:
 * ```ts
 * export const GET = withPerformanceTracking(async (request: NextRequest) => { ... });
 * export const POST = withPerformanceTracking(async (request: NextRequest) => { ... });
 * export const PUT = withPerformanceTracking(async (request: NextRequest) => { ... });
 * export const DELETE = withPerformanceTracking(async (request: NextRequest) => { ... });
 * ```
 */

export default {
  trackedGET,
  manualTracking,
  trackSpecificOperations,
};

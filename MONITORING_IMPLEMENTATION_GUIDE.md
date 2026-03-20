# Monitoring Implementation Guide
**Date**: 2026-03-20
**Project**: 7zi AI Team Management Platform

## Overview

This guide shows how to implement monitoring improvements across the API routes and dashboard.

## Quick Start: Apply Monitoring to All API Routes

### Step 1: Import the Monitoring Wrapper

At the top of each API route file, add:

```typescript
import { withMonitoring } from '@/lib/middleware/monitoring-wrapper';
```

### Step 2: Wrap Route Handlers

Replace your existing handlers:

**Before:**
```typescript
export async function GET(request: NextRequest) {
  // Your handler logic
}
```

**After:**
```typescript
const handler = async (request: NextRequest) => {
  // Your handler logic
};

export const GET = withMonitoring(handler);
```

### Step 3: Add Route Names (Optional but Recommended)

For better metrics:

```typescript
export const GET = withMonitoring(handler, {
  routeName: '/api/teams', // Specific route name
  alertThreshold: 3000,     // Custom alert threshold (3s)
  alertOnSlowRequests: true,
});
```

## Example: Full API Route Implementation

```typescript
/**
 * Teams API with Monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMonitoring } from '@/lib/middleware/monitoring-wrapper';
import { logger } from '@/lib/logger';

// Handler implementation
const handler = async (request: NextRequest) => {
  try {
    // Your business logic here
    const teams = await getTeams();

    return NextResponse.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    logger.error('Failed to fetch teams', error);
    throw error; // Monitoring wrapper will handle Sentry capture
  }
};

// Export with monitoring
export const GET = withMonitoring(handler, {
  routeName: '/api/teams',
  alertThreshold: 2000, // 2 seconds
  captureErrors: true,  // Send to Sentry
});

export const POST = withMonitoring(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const team = await createTeam(body);

    return NextResponse.json({
      success: true,
      data: team,
    }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create team', error);
    throw error;
  }
}, {
  routeName: '/api/teams',
  alertThreshold: 3000, // POST might be slower
});
```

## Available Monitoring Options

```typescript
interface MonitoringOptions {
  /**
   * Alert threshold in milliseconds
   * Default: 2000ms
   */
  alertThreshold?: number;

  /**
   * Capture errors to Sentry
   * Default: true
   */
  captureErrors?: boolean;

  /**
   * Route name for metrics/logs
   * Default: Inferred from URL path
   */
  routeName?: string;

  /**
   * Send alerts for slow requests
   * Default: true
   */
  alertOnSlowRequests?: boolean;

  /**
   * Custom metrics calculation
   */
  customMetrics?: Record<string, (duration: number) => number>;
}
```

## What Gets Monitored Automatically?

### 1. Performance Metrics
- ✅ Request duration (all routes)
- ✅ Average, min, max latency per route
- ✅ P95 and P99 percentiles
- ✅ Request counts by status code
- ✅ Error rate calculation

### 2. Error Tracking
- ✅ Automatic Sentry capture
- ✅ Error categorization
- ✅ Request context (ID, route, duration)
- ✅ Stack trace logging

### 3. Alerting
- ✅ Slow request alerts (configurable threshold)
- ✅ High error rate alerts (>10%)
- ✅ New error type detection
- ✅ Slack/Email notifications (if configured)

### 4. Request Tracing
- ✅ Unique request IDs (x-request-id header)
- ✅ Request duration in response (x-response-time header)
- ✅ Request logging (debug level)

## Prometheus Integration

### Configure Prometheus Scrape

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: '7zi-frontend'
    metrics_path: '/api/metrics/prometheus'
    scrape_interval: 30s
    static_configs:
      - targets: ['your-app:3000']
```

### Available Metrics

#### System Metrics
```
nodejs_heap_size_total_bytes
nodejs_heap_size_used_bytes
process_uptime_seconds
```

#### HTTP Metrics
```
http_requests_total
http_requests_success_total
http_requests_error_total
http_requests_slow_total
http_request_duration_seconds
http_request_duration_p95_seconds
http_request_duration_p99_seconds
```

#### Database Metrics
```
db_queries_total
db_query_duration_seconds
db_queries_slow_total
db_query_success_rate
```

## Grafana Dashboard

### Import Dashboard JSON

A sample Grafana dashboard is provided at:
```
docs/monitoring/grafana-dashboard.json
```

### Key Panels

1. **Overview**: Request rate, error rate, average latency
2. **Performance**: P95/P99 latency, slow requests
3. **Health**: Database health, cache hit rate
4. **System**: Memory usage, uptime, CPU
5. **Errors**: Error by status code, recent errors

## Migration Checklist

Apply monitoring to these routes:

### High Priority (Critical APIs)
- [ ] `/api/auth/login`
- [ ] `/api/auth/register`
- [ ] `/api/teams`
- [ ] `/api/users`
- [ ] `/api/tasks`

### Medium Priority (Important APIs)
- [ ] `/api/backup`
- [ ] `/api/database/health`
- [ ] `/api/status`
- [ ] `/api/csrf-token`

### Low Priority (Less Critical)
- [ ] `/api/github/*`
- [ ] `/api/multimodal/*`

## Testing

### Verify Metrics Collection

```bash
# Check Prometheus metrics endpoint
curl http://localhost:3000/api/metrics/prometheus

# Check performance report
curl http://localhost:3000/api/metrics/performance?category=all

# Check health
curl http://localhost:3000/api/health
```

### Verify Alerting

1. Make a slow request (add `setTimeout` temporarily)
2. Check Slack/Email for alert
3. Check Sentry for error capture

## Troubleshooting

### No Metrics Appearing

**Check:**
1. Is `withMonitoring` wrapper applied?
2. Is the route being called?
3. Check logs for errors

### Alerts Not Sending

**Check:**
1. Are Slack webhook/email configured?
2. Is the threshold being exceeded?
3. Check logs for alert errors

### Metrics Lost on Restart

**Expected behavior**: Metrics are stored in-memory. To persist:
1. Configure Prometheus to scrape regularly
2. Metrics will be stored in Prometheus TSDB
3. Long-term storage in Prometheus/Loki

## Best Practices

### 1. Use Descriptive Route Names

```typescript
// Good
export const GET = withMonitoring(handler, {
  routeName: 'api.teams.list',
});

// Avoid
export const GET = withMonitoring(handler, {
  routeName: 'teams',
});
```

### 2. Set Appropriate Thresholds

```typescript
// Fast endpoint (simple read)
export const GET = withMonitoring(handler, {
  alertThreshold: 1000, // 1 second
});

// Slow endpoint (complex computation)
export const GET = withMonitoring(handler, {
  alertThreshold: 5000, // 5 seconds
});
```

### 3. Don't Suppress Errors

Let the monitoring wrapper handle errors:

```typescript
// Good
const handler = async (request: NextRequest) => {
  // Error will be caught by wrapper
  throw new Error('Something failed');
};

// Avoid
const handler = async (request: NextRequest) => {
  try {
    throw new Error('Something failed');
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
    // Error suppressed, no Sentry capture!
  }
};
```

## Next Steps

1. **Apply monitoring wrapper** to all API routes
2. **Configure Prometheus** to scrape metrics
3. **Set up Grafana** dashboard
4. **Configure alerting** (Slack/Email)
5. **Monitor baseline** for 1-2 weeks
6. **Adjust thresholds** based on actual performance

## Support

For issues or questions:
1. Check logs in `/var/log/7zi/`
2. Review Sentry error tracking
3. Check Prometheus target status
4. Review Grafana dashboard

---

**Last Updated**: 2026-03-20
**Version**: 1.0.0

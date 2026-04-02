# Performance Monitoring Documentation

## Overview

The 7zi platform now includes a comprehensive performance monitoring system that tracks API response times, database query performance, and system health metrics.

## Features

### 1. API Performance Tracking

Tracks response times for all API endpoints with automatic logging of slow requests.

**Key Features:**

- Automatic response time measurement
- Slow request detection (>1s)
- Error rate tracking
- Per-endpoint metrics aggregation
- X-Response-Time header injection

**Location:** `/src/lib/middleware/api-performance.ts`

### 2. Database Query Performance Logging

Monitors all database queries with detailed performance metrics.

**Key Features:**

- Query execution time tracking
- Slow query detection (>100ms)
- Query error tracking
- Operation type aggregation (SELECT, INSERT, UPDATE, DELETE)
- Query sanitization for secure logging

**Location:** `/src/lib/middleware/db-performance.ts`

### 3. Performance Report API

Comprehensive performance reporting endpoint for monitoring dashboards.

**Endpoint:** `GET /api/performance/report`

**Query Parameters:**

- `detailed=true` - Include full slow request/query details
- `minutes=5` - Time window for recent metrics (default: 5 minutes)

**Response includes:**

- Overall health status (healthy/warning/critical)
- Performance score (0-100)
- API metrics summary
- Database metrics summary
- System health
- Performance insights
- Optimization recommendations

**Location:** `/src/app/api/performance/report/route.ts`

### 4. Performance Metrics Management

API to clear collected performance metrics.

**Endpoint:** `POST /api/performance/clear`

**Location:** `/src/app/api/performance/clear/route.ts`

## Usage

### Enabling Database Performance Logging

Add this to your `.env` file:

```bash
# Enable database query performance logging
ENABLE_DB_PERFORMANCE_LOGGING=true
```

By default, database performance logging is enabled in development mode.

### Wrapping API Routes with Performance Tracking

Use the `withApiPerformanceTracking` middleware for API routes:

```typescript
import { withApiPerformanceTracking } from '@/lib/middleware/api-performance'
import { NextRequest } from 'next/server'

async function myHandler(req: NextRequest) {
  // Your handler logic
  return NextResponse.json({ data: '...' })
}

export const GET = withApiPerformanceTracking(myHandler)
export const POST = withApiPerformanceTracking(myHandler)
```

### Manual API Performance Tracking

Use the decorator for internal functions:

```typescript
import { trackApiCall } from '@/lib/middleware/api-performance'

class MyService {
  @trackApiCall('user.fetchProfile')
  async fetchProfile(userId: string) {
    // Your logic
    return profile
  }
}
```

### Database Performance Logging

Database performance logging is automatic when enabled. All queries through `getDatabase()` are automatically tracked.

To manually wrap a database connection:

```typescript
import { withPerformanceLogging } from '@/lib/middleware/db-performance'
import { getDatabase } from '@/lib/db'

const db = withPerformanceLogging(getDatabase())
// All queries through db will be tracked
```

## Monitoring Endpoints

### Performance Report

```bash
# Basic report
curl http://localhost:3000/api/performance/report

# Detailed report with recent metrics
curl http://localhost:3000/api/performance/report?detailed=true&minutes=10
```

**Response Example:**

```json
{
  "timestamp": "2026-03-18T22:44:00.000Z",
  "summary": {
    "status": "healthy",
    "overallScore": 92,
    "issues": 2,
    "recommendations": 1
  },
  "api": {
    "summary": {
      "total": 150,
      "avgDuration": 234.5,
      "minDuration": 12.0,
      "maxDuration": 2340.0,
      "successRate": 99.33
    },
    "slowRequests": [...],
    "byPath": {
      "/api/auth/login": { "count": 25, "avgDuration": 156.0, "errorRate": 0.0 }
    },
    "recent": [...]
  },
  "database": {
    "summary": {
      "total": 450,
      "avgDuration": 8.5,
      "minDuration": 0.5,
      "maxDuration": 234.0,
      "successRate": 100.0
    },
    "slowQueries": [...],
    "byOperation": {
      "SELECT": { "count": 300, "avgDuration": 5.2, "errorRate": 0.0 }
    },
    "stats": {
      "connectionCount": 1,
      "isOpen": true,
      "sizeInMB": 12.5
    }
  },
  "system": {
    "uptime": 86400,
    "memory": {
      "used": 256,
      "limit": 512,
      "usagePercent": 50.0
    },
    "nodeVersion": "v22.22.0"
  },
  "insights": [
    "Found 3 slow queries (>100ms). Average duration: 8.5ms."
  ],
  "recommendations": [
    "Database: 3 slow queries detected. Review query execution plans and indexes."
  ]
}
```

### Clear Metrics

```bash
curl -X POST http://localhost:3000/api/performance/clear
```

## Performance Thresholds

### API Response Times

- **Good:** < 500ms
- **Warning:** 500ms - 1000ms
- **Critical:** > 1000ms

### Database Query Times

- **Good:** < 50ms
- **Warning:** 50ms - 100ms
- **Critical:** > 100ms

### System Health Scores

- **Healthy:** Score >= 80
- **Warning:** Score 60-79
- **Critical:** Score < 60

## Integration with Existing Monitoring

### Sentry Integration

Performance metrics are automatically sent to Sentry if configured:

```typescript
import * as Sentry from '@sentry/nextjs'

// Metrics are tracked as:
// - Breadcrumbs for each API request
// - Breadcrumbs for each database query
// - Performance measurements for web vitals
```

### Console Logging

In development mode, performance warnings are logged to console:

```
[Performance] Slow API request: /api/auth/login took 1560ms
[DB Performance] Slow query (234ms): SELECT * FROM users WHERE id = ?
```

## Best Practices

1. **Monitor Regularly:** Check the performance report endpoint periodically to identify issues early.

2. **Set Up Alerts:** Integrate with monitoring tools to alert on critical performance degradation.

3. **Investigate Slow Queries:** Use the slow query list to identify database optimization opportunities.

4. **Track Trends:** Compare metrics over time to spot performance regression.

5. **Clean Up Metrics:** Use the clear endpoint periodically to prevent memory issues in long-running processes.

6. **Enable in Production:** Set `ENABLE_DB_PERFORMANCE_LOGGING=true` in production for comprehensive monitoring.

## Troubleshooting

### Metrics Not Appearing

- Check that `ENABLE_DB_PERFORMANCE_LOGGING` is set to `true`
- Verify the middleware is properly imported
- Check browser console for errors

### High Memory Usage

- Clear metrics periodically using `POST /api/performance/clear`
- Adjust `MAX_METRICS` constants in the middleware files
- Consider external monitoring solutions for production

### Performance Overhead

The monitoring system adds minimal overhead:

- API tracking: ~0.1ms per request
- DB tracking: ~0.05ms per query

If overhead is a concern, disable database logging in production.

## Future Enhancements

Potential improvements for the performance monitoring system:

1. **Persistent Storage:** Store metrics in a database for long-term trend analysis
2. **Dashboard UI:** Visual performance dashboard with charts and graphs
3. **Real-time Alerts:** WebSocket-based real-time performance alerts
4. **Historical Comparison:** Compare current performance against historical baselines
5. **Anomaly Detection:** Machine learning-based anomaly detection for performance issues
6. **Distributed Tracing:** Support for distributed tracing across microservices

## Support

For issues or questions about the performance monitoring system, check the documentation or contact the development team.

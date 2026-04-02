# APM (Application Performance Monitoring) API

## Overview

This API provides detailed APM status and metrics for monitoring application performance and observability.

## Endpoints

### `GET /api/monitoring/apm`

Returns comprehensive APM status including Sentry configuration, distributed tracing, and performance metrics.

**Authentication:** Not required (public endpoint for monitoring)

**Response:**

```json
{
  "success": true,
  "data": {
    "apm": {
      "status": "enabled" | "disabled",
      "sentry": {
        "initialized": boolean,
        "dsn": boolean,
        "environment": string,
        "release": string,
        "tracesSampleRate": number,
        "profilesSampleRate": number
      },
      "tracing": {
        "traceId": string | null,
        "spanId": string | null,
        "activeSpans": number
      }
    },
    "performance": {
      "memory": {
        "used": number,
        "limit": number,
        "percentage": number
      },
      "uptime": number,
      "responseTime": number
    },
    "agentTasks": {
      "totalAgents": number,
      "totalTasks": number,
      "completedTasks": number,
      "failedTasks": number,
      "activeTasks": number,
      "avgTaskDuration": number,
      "totalTokens": number
    }
  }
}
```

**Headers:**

- `traceparent`: W3C Trace Context header for distributed tracing
- `sentry-trace`: Sentry trace header for Sentry tracing
- `X-Response-Time`: Response time in milliseconds

### `GET /api/monitoring/apm/stats`

Returns aggregated performance statistics for monitoring dashboards.

**Query Parameters:**

- `timeRange`: Time range for statistics (default: `1h`) - options: `15m`, `1h`, `6h`, `24h`, `7d`
- `granularity`: Data granularity (default: `auto`) - options: `minute`, `hour`, `day`

**Response:**

```json
{
  "success": true,
  "data": {
    "timeRange": "1h",
    "granularity": "minute",
    "metrics": {
      "requests": {
        "total": number,
        "success": number,
        "error": number,
        "avgDuration": number
      },
      "errors": {
        "total": number,
        "byType": {
          "error_type": number
        }
      },
      "traces": {
        "total": number,
        "sampled": number,
        "avgDuration": number
      }
    },
    "trends": [
      {
        "timestamp": string,
        "requests": number,
        "errors": number,
        "avgDuration": number
      }
    ]
  }
}
```

### `GET /api/monitoring/apm/traces/:traceId`

Returns detailed information about a specific trace.

**Path Parameters:**

- `traceId`: The trace ID to retrieve

**Response:**

```json
{
  "success": true,
  "data": {
    "traceId": string,
    "rootSpan": {
      "spanId": string,
      "name": string,
      "startTime": number,
      "endTime": number,
      "duration": number,
      "status": string
    },
    "spans": [
      {
        "spanId": string,
        "parentSpanId": string | null,
        "name": string,
        "startTime": number,
        "endTime": number,
        "duration": number,
        "status": string,
        "tags": object
      }
    ],
    "metrics": {
      "totalDuration": number,
      "spanCount": number,
      "errorCount": number
    }
  }
}
```

### `GET /api/monitoring/apm/alerts`

Returns active alerts and recent alert history.

**Query Parameters:**

- `severity`: Filter by severity - options: `critical`, `error`, `warning`, `info`
- `limit`: Maximum number of alerts to return (default: `50`)

**Response:**

```json
{
  "success": true,
  "data": {
    "active": [
      {
        "id": string,
        "severity": "critical" | "error" | "warning" | "info",
        "title": string,
        "message": string,
        "timestamp": string,
        "status": "active" | "acknowledged" | "resolved"
      }
    ],
    "history": [
      {
        "id": string,
        "severity": string,
        "title": string,
        "message": string,
        "timestamp": string,
        "status": string
      }
    ]
  }
}
```

## Distributed Tracing

### Trace Context Propagation

All APM endpoints support distributed tracing via the following headers:

**W3C Trace Context:**
```
traceparent: 00-{traceId}-{spanId}-{traceFlags}
```

**Sentry Trace:**
```
sentry-trace: {traceId}-{spanId}-{sampled}
```

**B3 Propagation:**
```
X-B3-TraceId: {traceId}
X-B3-SpanId: {spanId}
X-B3-Sampled: 1
```

### Extracting Trace Context

To extract trace context from incoming requests:

```typescript
import { extractTraceContext } from '@/lib/tracing/context';

const traceContext = extractTraceContext(request.headers, 'w3c');
// or
const traceContext = extractTraceContext(request.headers, 'sentry');
// or
const traceContext = extractTraceContext(request.headers, 'b3');
```

### Injecting Trace Context

To inject trace context into outgoing requests:

```typescript
import { injectTraceContext } from '@/lib/tracing/context';

const headers = injectTraceContext(traceContext, 'w3c');
fetch(url, { headers });
```

## Agent Task Monitoring

### Tracking Tasks

Use the `agentTracker` to monitor agent task execution:

```typescript
import { startTask } from '@/lib/monitoring';

const { end } = startTask({
  taskId: 'task-123',
  agentId: 'agent-456',
  agentName: 'MyAgent',
  taskType: 'research',
  taskName: 'Research Project',
  priority: 'high',
});

try {
  // Execute task
  const result = await doTask();
  end('completed');
  return result;
} catch (error) {
  end('failed', error);
  throw error;
}
```

### Tracking Collaboration

Track agent-to-agent collaboration:

```typescript
import { trackCollaboration } from '@/lib/monitoring';

const { end } = trackCollaboration(
  'collab-123',
  { id: 'agent-1', name: 'Agent A' },
  { id: 'agent-2', name: 'Agent B' },
  'delegate'
);

// ... collaboration logic
end('completed');
```

## Performance Monitoring

### Custom Metrics

Record custom performance metrics:

```typescript
import { recordCustomMetric } from '@/lib/monitoring';

recordCustomMetric('custom_operation', {
  category: 'business_logic',
  value: performance.now(),
  tags: {
    operation: 'payment_processing',
    method: 'credit_card'
  }
});
```

### API Performance

Track API endpoint performance automatically using middleware:

```typescript
import { withApiMonitoring } from '@/lib/monitoring';

export async function GET(request: Request) {
  return withApiMonitoring(request, async (req) => {
    // Your handler logic
    const data = await getData();
    return NextResponse.json({ data });
  });
}
```

## Alerting

### Creating Alert Rules

Define custom alert rules:

```typescript
import { getAlertManager } from '@/lib/monitoring';

const alertManager = getAlertManager();

alertManager.addRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  severity: 'critical',
  condition: (metrics) => metrics.errorRate > 0.05,
  channels: ['slack', 'email'],
  throttle: 300000, // 5 minutes
});
```

### Sending Alerts

Send alerts programmatically:

```typescript
import { sendAlert } from '@/lib/monitoring';

await sendAlert({
  severity: 'critical',
  title: 'Database Connection Failed',
  message: 'Unable to connect to database',
  channels: ['slack', 'email'],
  tags: {
    database: 'postgres',
    region: 'us-east-1'
  }
});
```

## Error Tracking

### Capturing Exceptions

Capture exceptions with context:

```typescript
import { captureException } from '@/lib/monitoring';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: {
      operation: 'risky_operation',
      userId: user.id
    },
    extra: {
      input: data,
      environment: process.env.NODE_ENV
    }
  });
}
```

### Tracking Errors

Track errors with custom categories:

```typescript
import { captureError } from '@/lib/monitoring';

captureError(error, {
  category: 'validation',
  severity: 'warning',
  context: {
    field: 'email',
    value: 'invalid-email'
  }
});
```

## Metrics Export

### Prometheus Export

Export metrics in Prometheus format:

```bash
curl http://localhost:3000/api/metrics/prometheus
```

Response:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/health",status="200"} 1234

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 500
http_request_duration_seconds_bucket{le="0.5"} 800
http_request_duration_seconds_bucket{le="+Inf"} 1000
```

## Configuration

### Environment Variables

Configure APM behavior using environment variables:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
NEXT_PUBLIC_SENTRY_RELEASE=1.0.6
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Sampling Rates
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.05

# Debug Mode
NEXT_PUBLIC_SENTRY_DEBUG=true
```

### Sampling Configuration

Adjust sampling rates per environment:

```typescript
import { sentryClient } from '@/lib/monitoring';

await sentryClient.init({
  tracesSampleRate: 0.1, // 10% in production
  profilesSampleRate: 0.05 // 5% profiling
});
```

## Health Checks

### Basic Health Check

```bash
curl http://localhost:3000/api/health
```

Response includes APM status:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-04-02T06:30:00.000Z",
    "uptime": 123456,
    "version": "1.0.6",
    "checks": {
      "memory": {
        "status": "ok",
        "used": 256,
        "limit": 512
      },
      "node": {
        "status": "ok",
        "version": "v22.22.1"
      }
    },
    "apm": {
      "status": "enabled",
      "sentry": {
        "initialized": true,
        "dsn": true,
        "environment": "production",
        "tracesSampleRate": 0.1,
        "profilesSampleRate": 0.05
      },
      "tracing": {
        "traceId": "abc123...",
        "spanId": "def456..."
      }
    }
  }
}
```

## Best Practices

1. **Always include trace context** in API calls for end-to-end tracing
2. **Use appropriate sampling rates** based on environment (dev=100%, staging=50%, prod=10%)
3. **Set meaningful tags** and contexts for better observability
4. **Monitor slow requests** and failures to identify performance issues
5. **Set up alerts** for critical thresholds before they impact users
6. **Regular review** of APM dashboards to identify trends and anomalies
7. **Use span relationships** to understand request flow through services

## Troubleshooting

### No Traces Appearing

1. Check Sentry DSN is configured correctly
2. Verify `tracesSampleRate` is greater than 0
3. Check browser console for Sentry initialization errors
4. Verify traces aren't being filtered by sampling

### Missing Trace Context

1. Ensure incoming headers include trace context
2. Check `extractTraceContext` is being called with correct format
3. Verify trace propagation across service boundaries

### High Performance Overhead

1. Reduce sampling rates (`tracesSampleRate`, `profilesSampleRate`)
2. Exclude low-value routes from tracing
3. Use asynchronous reporting
4. Monitor `getTotalPerformanceOverhead()` to identify bottlenecks

## Further Reading

- [Sentry Documentation](https://docs.sentry.io/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/reference/specification/)

# Performance Alerting System

## Overview

The Performance Alerting System provides a comprehensive, multi-level alert mechanism for monitoring and notifying about performance issues in your application.

## Features

- **Multi-level Alerts**: Supports 4 severity levels (info, warning, error, critical)
- **Alert Suppression**: Prevents duplicate alerts within a configurable time window
- **Alert Aggregation**: Merges similar alerts to reduce noise
- **Alert History**: Tracks all alert lifecycle events
- **Dashboard Channel**: Built-in channel for UI integration
- **Custom Channels**: Extensible channel system for integrations (email, Slack, etc.)
- **Suppression Rules**: Advanced filtering with custom suppression rules
- **Statistics**: Real-time alert metrics and analytics

## Installation

```typescript
import {
  PerformanceAlerter,
  DashboardChannel,
  createPerformanceAlert,
} from '@/lib/performance-monitoring/alerting'
```

## Quick Start

```typescript
// Create alerter instance
const alerter = new PerformanceAlerter({
  minLevel: 'warning',
  suppressionWindow: 300000, // 5 minutes
  aggregationWindow: 60000, // 1 minute
})

// Register dashboard channel
const dashboardChannel = new DashboardChannel()
alerter.registerChannel(dashboardChannel)

// Subscribe to dashboard alerts
const unsubscribe = dashboardChannel.subscribe(message => {
  console.log('New alert:', message)
  // Display in your UI
})

// Create an alert
const alert = await alerter.createAlert(
  createPerformanceAlert(
    'High Response Time',
    'API response time exceeded 3s threshold',
    'warning',
    {
      category: 'performance',
      source: 'api-gateway',
      metric: 'response-time',
      currentValue: 3500,
      threshold: 3000,
    }
  )
)
```

## Alert Levels

| Level      | Priority | Use Case                | Icon |
| ---------- | -------- | ----------------------- | ---- |
| `info`     | 0        | Informational messages  | ℹ️   |
| `warning`  | 1        | Performance degradation | ⚠️   |
| `error`    | 2        | Critical errors         | ❌   |
| `critical` | 3        | System-critical issues  | 🚨   |

## Alert Categories

- `performance` - Performance issues (slow load, high latency)
- `availability` - Uptime and availability issues
- `error` - Application errors
- `resource` - Resource exhaustion (CPU, memory, disk)
- `security` - Security-related alerts
- `custom` - Custom categories

## Alert Lifecycle

```
Create → Active → Acknowledged → Resolved
    ↓
Suppressed
```

### States

- **active**: Alert is currently active and requires attention
- **acknowledged**: Alert has been seen by a user
- **resolved**: Alert has been resolved
- **suppressed**: Alert was suppressed (duplicate or rule)

## Configuration

```typescript
interface AlertConfig {
  // Minimum alert level to trigger
  minLevel: AlertLevel

  // Enable/disable alerting
  enabled: boolean

  // Time window for suppressing duplicates (ms)
  suppressionWindow: number

  // Time window for aggregating similar alerts (ms)
  aggregationWindow: number

  // Maximum number of history entries to keep
  maxHistorySize: number

  // Enable alert aggregation
  enableAggregation: boolean

  // Custom deduplication key function
  deduplicationKeyFn?: (alert) => string
}
```

## API Reference

### PerformanceAlerter

#### Methods

- `createAlert(data)`: Create and send a new alert
- `getActiveAlerts()`: Get all active alerts
- `getAlert(id)`: Get a specific alert by ID
- `acknowledgeAlert(id, user)`: Acknowledge an alert
- `resolveAlert(id)`: Resolve an alert
- `clearAllAlerts()`: Clear all active alerts
- `getHistory(options)`: Get alert history
- `getStats()`: Get alert statistics
- `registerChannel(channel)`: Register an alert channel
- `unregisterChannel(name)`: Unregister a channel
- `addSuppressionRule(rule)`: Add a suppression rule
- `removeSuppressionRule(id)`: Remove a suppression rule
- `updateConfig(config)`: Update configuration
- `setEnabled(enabled)`: Enable/disable alerting
- `toDashboardMessage(alert)`: Convert alert to dashboard format

### DashboardChannel

#### Methods

- `send(alert)`: Send alert to dashboard
- `subscribe(callback)`: Subscribe to new alerts
- `getHistory(options)`: Get message history
- `clearHistory()`: Clear message history
- `test()`: Test channel connectivity

## Custom Channels

Create custom channels by implementing the `AlertChannel` interface:

```typescript
interface AlertChannel {
  name: string
  send(alert: PerformanceAlert): Promise<void>
  test?(): Promise<boolean>
}

// Example: Email channel
class EmailChannel implements AlertChannel {
  name = 'email'

  async send(alert: PerformanceAlert): Promise<void> {
    await sendEmail({
      subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
      body: alert.message,
      priority: this.mapLevelToPriority(alert.level),
    })
  }

  async test(): Promise<boolean> {
    return await checkEmailService()
  }
}

// Register channel
alerter.registerChannel(new EmailChannel())
```

## Suppression Rules

Define custom suppression rules to filter alerts:

```typescript
const rule = alerter.addSuppressionRule({
  name: 'Suppress Info Alerts',
  filter: {
    level: 'info',
    source: 'background-jobs',
  },
  duration: 3600000, // 1 hour
  active: true,
  reason: 'Maintenance window',
  createdBy: 'admin',
})
```

## Filtering

Filter alerts using the `filterAlerts` utility:

```typescript
import { filterAlerts } from '@/lib/performance-monitoring/alerting'

const alerts = alerter.getActiveAlerts()

// Filter by level
const errorAlerts = filterAlerts(alerts, { level: 'error' })

// Filter by category
const perfAlerts = filterAlerts(alerts, { category: 'performance' })

// Filter by tags
const urgentAlerts = filterAlerts(alerts, { tags: ['urgent'] })

// Custom filter
const customFiltered = filterAlerts(alerts, {
  customFn: alert => {
    return alert.metric === 'LCP' && alert.currentValue! > 3000
  },
})
```

## Statistics

Get real-time alert statistics:

```typescript
const stats = alerter.getStats()

console.log(stats)
// {
//   byLevel: { info: 10, warning: 25, error: 5, critical: 2 },
//   byCategory: { performance: 30, availability: 8, error: 4 },
//   byStatus: { active: 3, acknowledged: 2, resolved: 35, suppressed: 2 },
//   last24Hours: 12,
//   last7Days: 42,
//   avgResolutionTime: 285000, // milliseconds
//   activeSuppressions: 1
// }
```

## Best Practices

### 1. Use Appropriate Alert Levels

```typescript
// ✅ Good: Use appropriate levels
await alerter.createAlert(createPerformanceAlert('Info', 'Cache cleared', 'info'))

// ❌ Bad: Overusing critical
await alerter.createAlert(createPerformanceAlert('Minor Issue', 'Slight slowdown', 'critical'))
```

### 2. Include Context in Alerts

```typescript
// ✅ Good: Include relevant metadata
await alerter.createAlert(
  createPerformanceAlert('Slow Query', 'Query took 5s', 'warning', {
    source: 'database',
    metric: 'query-time',
    currentValue: 5000,
    threshold: 3000,
    metadata: {
      query: 'SELECT * FROM users WHERE...',
      table: 'users',
      rows: 15000,
    },
  })
)

// ❌ Bad: Minimal information
await alerter.createAlert(createPerformanceAlert('Slow', 'Slow query', 'warning'))
```

### 3. Configure Suppression Wisely

```typescript
// For high-frequency metrics, use longer suppression windows
const alerter = new PerformanceAlerter({
  suppressionWindow: 600000, // 10 minutes for CPU alerts
})

// For critical alerts, use shorter windows or disable suppression
const criticalAlerter = new PerformanceAlerter({
  minLevel: 'critical',
  suppressionWindow: 0, // No suppression for critical alerts
})
```

### 4. Set Up Multiple Channels

```typescript
// Send alerts to multiple destinations
alerter.registerChannel(new DashboardChannel())
alerter.registerChannel(new SlackChannel(webhookUrl))
alerter.registerChannel(new EmailChannel(smtpConfig))

// Each channel receives all alerts
```

## Example: Integrating with Performance Monitor

```typescript
// In your performance monitor
import { performanceAlerter, createPerformanceAlert } from './alerting'

async function checkPerformance() {
  const metrics = await getMetrics()

  // Check LCP
  if (metrics.LCP > 3000) {
    await performanceAlerter.createAlert(
      createPerformanceAlert(
        'High LCP',
        `LCP is ${metrics.LCP}ms, exceeding threshold of 3000ms`,
        'warning',
        {
          category: 'performance',
          source: 'web-vitals',
          metric: 'LCP',
          currentValue: metrics.LCP,
          threshold: 3000,
          metadata: {
            page: window.location.pathname,
            device: getDeviceType(),
          },
        }
      )
    )
  }

  // Check error rate
  if (metrics.errorRate > 0.01) {
    await performanceAlerter.createAlert(
      createPerformanceAlert(
        'High Error Rate',
        `Error rate is ${(metrics.errorRate * 100).toFixed(2)}%`,
        'error',
        {
          category: 'error',
          source: 'error-tracking',
          metric: 'error-rate',
          currentValue: metrics.errorRate,
          threshold: 0.01,
        }
      )
    )
  }
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { PerformanceAlerter, createPerformanceAlert } from './alerter'

describe('Alert System', () => {
  it('should create and send alerts', async () => {
    const alerter = new PerformanceAlerter()
    const channel = { name: 'test', send: vi.fn() }
    alerter.registerChannel(channel)

    const alert = await alerter.createAlert(createPerformanceAlert('Test', 'Message', 'warning'))

    expect(alert.status).toBe('active')
    expect(channel.send).toHaveBeenCalledTimes(1)
  })
})
```

## Performance Considerations

- **Memory**: Alert history is bounded by `maxHistorySize`
- **CPU**: Suppression and aggregation are O(1) operations
- **Network**: Alerts are sent asynchronously to all channels
- **Database**: No database dependency (in-memory storage)

## License

MIT

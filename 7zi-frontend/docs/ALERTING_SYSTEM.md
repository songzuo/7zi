# Performance Monitoring Alerting System

> v1.8.0 - Alert Engine Implementation

## Overview

The Performance Monitoring Alerting System provides a comprehensive solution for monitoring application performance and sending alerts through multiple channels.

## Features

- **Threshold-based alerts**: Trigger alerts when metrics exceed defined thresholds
- **Trend-based alerts**: Detect anomalies based on historical baseline data
- **Rate change alerts**: Identify sudden spikes or drops in metrics
- **Multi-channel notifications**: Support for Email, Slack, Webhook, Dashboard, and Telegram
- **Alert suppression**: Avoid alert storms with configurable suppression rules
- **Escalation policies**: Automatically escalate unresolved alerts
- **Priority-based routing**: Route alerts to appropriate channels based on priority (P0-P3)

## Architecture

```
┌─────────────────┐
│   Metrics       │
│   (API, Web     │
│   Vitals, etc)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   AlertEngine   │────▶│  Alert Rules    │
│                 │     │  (P0-P3)        │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Suppression   │
│   & Aggregation │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│           Alert Channels                 │
├───────────┬───────────┬─────────────────┤
│  Email    │  Slack    │  Webhook/etc    │
└───────────┴───────────┴─────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import { AlertEngine, SlackAlertChannel, EmailAlertChannel } from '@/lib/monitoring'

// Create alert engine
const engine = new AlertEngine()

// Configure channels
const slackChannel = new SlackAlertChannel({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channels: {
    P0: '#alerts-critical',
    P1: '#alerts-high',
    P2: '#alerts-warning',
    P3: '#alerts-info',
    default: '#alerts',
  },
})

const emailChannel = new EmailAlertChannel({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: 'alerts@example.com', pass: 'password' },
  from: 'alerts@example.com',
  recipients: {
    P0: ['admin@example.com', 'ops@example.com'],
    P1: ['admin@example.com'],
    P2: ['dev@example.com'],
    P3: ['dev@example.com'],
  },
})

// Register channels
engine.registerChannel('slack', slackChannel)
engine.registerChannel('email', emailChannel)

// Evaluate metrics
await engine.evaluate('errorRate', 10) // 10% error rate
await engine.evaluate('LCP', 5000) // 5 second LCP
```

### Using with Performance Monitor

```typescript
import { monitor } from '@/lib/monitoring'
import { alertEngine } from '@/lib/monitoring/alert-engine'

// Track metric and check alerts
async function trackAndAlert(metric: string, value: number) {
  // Update trend data for anomaly detection
  alertEngine.updateTrendData(metric, value)

  // Evaluate against alert rules
  const alerts = await alertEngine.evaluate(metric, value)

  return alerts
}
```

## Alert Rules

### Priority Levels

| Priority | Description   | Response Time | Example                       |
| -------- | ------------- | ------------- | ----------------------------- |
| P0       | Critical      | 5 minutes     | Service down, SSL expired     |
| P1       | High          | 15 minutes    | Error rate > 5%, API failures |
| P2       | Warning       | 1 hour        | Slow LCP, high memory usage   |
| P3       | Informational | 24 hours      | Minor issues, reminders       |

### Default Rules

The system includes predefined rules based on industry best practices:

```typescript
// P0 - Critical
{ id: "p0-service-down", priority: "P0", condition: { type: "uptime_check", consecutive_failures: 3 } }
{ id: "p0-complete-failure", priority: "P0", condition: { type: "error_rate", threshold: 100 } }
{ id: "p0-ssl-expired", priority: "P0", condition: { type: "ssl_expiry", days_remaining: 0 } }

// P1 - High
{ id: "p1-high-error-rate", priority: "P1", condition: { type: "error_rate", threshold: 5, time_window: "15m" } }
{ id: "p1-error-rate-spike", priority: "P1", condition: { type: "rate_change", multiplier: 3 } }

// P2 - Warning
{ id: "p2-slow-lcp", priority: "P2", condition: { type: "web_vital", metric: "LCP", threshold: 4000 } }
{ id: "p2-slow-api", priority: "P2", condition: { type: "api_latency", threshold: 2000 } }

// P3 - Info
{ id: "p3-error-rate-above-normal", priority: "P3", condition: { type: "error_rate", threshold: 1 } }
```

### Custom Rules

Add custom rules for your specific needs:

```typescript
engine.addRule({
  id: 'custom-cpu-alert',
  name: 'High CPU Usage',
  description: 'Alert when CPU usage exceeds 80%',
  enabled: true,
  priority: 'P2',
  condition: {
    type: 'threshold',
    operator: '>',
    value: 80,
  },
  severity: 'warning',
  channels: ['slack'],
  cooldown: 300, // 5 minutes
  response_time: '1h',
})
```

## Alert Channels

### Email Channel

```typescript
const emailChannel = new EmailAlertChannel({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  from: 'alerts@yourcompany.com',
  recipients: {
    P0: ['admin@company.com', 'ops@company.com'],
    P1: ['admin@company.com'],
    P2: ['dev@company.com'],
    P3: ['dev@company.com'],
  },
  includeContext: true,
})
```

### Slack Channel

```typescript
const slackChannel = new SlackAlertChannel({
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  // Or use bot token for more features
  botToken: process.env.SLACK_BOT_TOKEN,
  channels: {
    P0: '#alerts-critical',
    P1: '#alerts-high',
    P2: '#alerts-warning',
    P3: '#alerts-info',
    default: '#alerts',
  },
  username: 'Performance Bot',
  iconEmoji: ':chart_with_downwards_trend:',
})
```

### Webhook Channel

```typescript
import { WebhookChannel } from '@/lib/performance/alerting/channels'

const webhookChannel = new WebhookChannel({
  url: 'https://your-service.com/alerts',
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_TOKEN',
  },
})

engine.registerChannel('webhook', webhookChannel)
```

## Alert Suppression

Prevent alert storms with suppression rules:

```typescript
engine.updateConfig({
  suppression: {
    windowMs: 60000, // 1 minute window
    maxAlerts: 50, // Max alerts per window
    deduplicateBy: ['ruleId', 'priority'],
    maintenanceWindows: [
      {
        start: 'Sunday 02:00 UTC',
        duration: '2h',
        description: 'Weekly maintenance',
      },
    ],
    ignorePatterns: ['ResizeObserver loop limit exceeded', 'Network request failed'],
    deploymentGracePeriod: '5m',
  },
})
```

## Escalation Policies

Automatically escalate unresolved alerts:

```typescript
engine.updateConfig({
  escalationPolicies: [
    {
      priority: 'P0',
      steps: [
        { after: '0m', notify: ['slack', 'email'] },
        { after: '5m', notify: ['slack', 'email'], escalate_to: ['manager'] },
        { after: '15m', notify: ['slack', 'email'], escalate_to: ['director'] },
      ],
    },
    // ... more policies
  ],
})
```

## Trend Detection

The system maintains baseline statistics for trend detection:

```typescript
// Update trend data
engine.updateTrendData('responseTime', 150)
engine.updateTrendData('responseTime', 148)
engine.updateTrendData('responseTime', 152)

// Later, evaluate with anomaly detection
const alerts = await engine.evaluate('responseTime', 500) // High spike
```

## API Reference

### AlertEngine

```typescript
class AlertEngine {
  constructor(config?: Partial<AlertEngineConfig>)

  // Core methods
  evaluate(metric: string, value: number, context?: Record<string, unknown>): Promise<Alert[]>
  updateTrendData(metric: string, value: number, timestamp?: number): void

  // Alert management
  acknowledge(alertId: string, acknowledgedBy: string): boolean
  resolve(alertId: string): boolean
  getActiveAlerts(filter?: AlertFilter): Alert[]
  getAlert(alertId: string): Alert | undefined
  getAlertHistory(timeWindowMs?: number): Alert[]
  getSummary(): AlertSummary

  // Configuration
  addRule(rule: AlertRule): void
  removeRule(ruleId: string): boolean
  registerChannel(name: string, channel: AlertChannel): void
  updateConfig(config: Partial<AlertEngineConfig>): void
  getConfig(): AlertEngineConfig

  // Cleanup
  clearResolved(maxAgeMs?: number): number
  reset(): void
}
```

## Environment Variables

```bash
# Email Channel
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=alerts@company.com
EMAIL_SMTP_PASS=your-password
EMAIL_FROM=alerts@company.com
EMAIL_RECIPIENTS_P0=admin@company.com,ops@company.com
EMAIL_RECIPIENTS_P1=admin@company.com
EMAIL_RECIPIENTS_P2=dev@company.com
EMAIL_RECIPIENTS_P3=dev@company.com

# Slack Channel
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_BOT_TOKEN=xoxb-xxx-yyy-zzz
SLACK_CHANNEL_P0=#alerts-critical
SLACK_CHANNEL_P1=#alerts-high
SLACK_CHANNEL_P2=#alerts-warning
SLACK_CHANNEL_P3=#alerts-info
SLACK_CHANNEL_DEFAULT=#alerts

# Dashboard URLs (for alert links)
NEXT_PUBLIC_SITE_URL=https://yourcompany.com
```

## Testing

Run tests:

```bash
npx vitest run src/lib/monitoring/__tests__/
```

## Related Documentation

- [ALERT_RULES.yaml](./ALERT_RULES.yaml) - Detailed alert rule definitions
- [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) - Performance monitoring overview
- [PERFORMANCE_MONITORING_IMPROVEMENT_v180.md](./PERFORMANCE_MONITORING_IMPROVEMENT_v180.md) - v1.8.0 improvements

---

_Created: 2026-04-02_
_Version: 1.8.0_

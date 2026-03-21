# Performance Monitoring Quick Start Guide

**Project**: 7zi-Project
**Version**: 1.0.0

---

## 🚀 Quick Start

### 1. Access the Dashboard

Navigate to `/performance` in your application:

```
https://your-domain.com/performance
```

You'll see:
- Overall performance rating
- Active alerts
- Metric cards with statistics
- Interactive charts
- Time period controls

### 2. View Performance Data

The dashboard automatically shows data for the last 24 hours. Change the time period using the dropdown:
- Last 1 Hour
- Last 6 Hours
- Last 24 Hours
- Last 7 Days
- Last 30 Days

### 3. Monitor Alerts

Active alerts appear at the top of the dashboard:
- 🔴 **Critical** - Immediate attention needed
- 🟠 **High** - Important issues
- 🟡 **Medium** - Needs improvement
- 🟢 **Low** - Minor issues

Click **"Acknowledge"** to dismiss resolved alerts.

---

## 📊 Understanding Metrics

### Core Web Vitals

| Metric | What It Measures | Good | Needs Improvement | Poor |
|--------|------------------|------|-------------------|-------|
| **LCP** | Largest Contentful Paint | ≤ 2.5s | 2.5-4s | > 4s |
| **FID** | First Input Delay | ≤ 100ms | 100-300ms | > 300ms |
| **CLS** | Cumulative Layout Shift | ≤ 0.1 | 0.1-0.25 | > 0.25 |
| **INP** | Interaction to Next Paint | ≤ 200ms | 200-500ms | > 500ms |
| **TTFB** | Time to First Byte | ≤ 800ms | 800-1800ms | > 1800ms |

### Dashboard Metrics

Each metric card shows:
- **Current average** - Most recent value
- **Trend** - Improving (↓), Stable (→), Degrading (↑)
- **Rating distribution** - Percentage of good/needs-improvement/poor
- **Percentiles** - P50 (median), P90, P95 values
- **Sample count** - Number of data points

---

## 🔧 Recording Custom Metrics

### Basic Custom Metric

```typescript
import { recordCustomMetric } from '@/lib/monitoring/performance-metrics';

// Record a custom metric
recordCustomMetric('DatabaseQuery', 150, 'good');
```

### API Response Time

```typescript
import { recordApiResponse } from '@/lib/monitoring/performance-metrics';

const start = performance.now();
await fetch('/api/data');
const duration = performance.now() - start;
recordApiResponse('/api/data', duration);
```

### Component Render Time

```typescript
import { recordComponentRender } from '@/lib/monitoring/performance-metrics';

const renderStart = performance.now();
// ... component render logic ...
const renderDuration = performance.now() - renderStart;
recordComponentRender('MyComponent', renderDuration);
```

---

## 🚨 Managing Alert Rules

### Create Custom Alert Rule

```typescript
await fetch('/api/performance/alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create-rule',
    rule: {
      name: 'Database Slow Query',
      metric: 'DatabaseQuery',
      condition: 'gt',  // gt, lt, eq
      threshold: 1000,
      enabled: true,
      severity: 'high',  // low, medium, high, critical
      notificationChannels: ['console'],
    },
  }),
});
```

### Acknowledge Alert

```typescript
await fetch('/api/performance/alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'acknowledge',
    alertId: 'alert-123',
  }),
});
```

### Update Alert Rule

```typescript
await fetch('/api/performance/alerts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ruleId: 'rule-123',
    updates: {
      threshold: 5000,
      enabled: false,
    },
  }),
});
```

---

## 📈 Generating Reports

### Get Performance Report

```typescript
// Last 24 hours
const response = await fetch('/api/performance/report?period=24h');
const data = await response.json();

console.log('Overall rating:', data.report.summary.overallRating);
console.log('Total metrics:', data.report.summary.totalMetrics);
console.log('Critical alerts:', data.report.summary.criticalAlerts);
console.log('Top issues:', data.report.summary.topIssues);
```

### Time Periods

Available periods:
- `1h` - Last 1 hour
- `6h` - Last 6 hours
- `24h` - Last 24 hours (default)
- `7d` - Last 7 days
- `30d` - Last 30 days

### Custom Time Range

```typescript
const startTime = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
const endTime = Date.now();

const response = await fetch(
  `/api/performance/report?startTime=${startTime}&endTime=${endTime}`
);
```

---

## 🔍 Querying Metrics

### Get All Metrics

```typescript
const response = await fetch('/api/performance/metrics?limit=100');
const data = await response.json();

console.log('Metrics:', data.metrics);
console.log('Statistics:', data.stats);
```

### Filter by Route

```typescript
const response = await fetch('/api/performance/metrics?route=/dashboard');
const data = await response.json();
```

### Filter by Metric Name

```typescript
const response = await fetch('/api/performance/metrics?metric=LCP');
const data = await response.json();
```

### Filter by Rating

```typescript
const response = await fetch('/api/performance/metrics?rating=poor');
const data = await response.json();
```

### Time Range Filter

```typescript
const startTime = Date.now() - 24 * 60 * 60 * 1000; // 24h ago
const endTime = Date.now();

const response = await fetch(
  `/api/performance/metrics?startTime=${startTime}&endTime=${endTime}`
);
const data = await response.json();
```

---

## 🧪 Running Tests

### API Tests

```bash
cd /root/.openclaw/workspace/7zi-project
npm test -- src/app/api/performance/__tests__/performance-api.test.ts
```

**Expected**: 18/18 tests passed ✅

### Dashboard Tests

```bash
npm test -- src/app/[locale]/performance/__tests__/performance-dashboard.test.tsx
```

**Expected**: All tests passed ✅

---

## 📊 Dashboard Features

### Overall Status Card

Shows:
- **Performance rating** - Good/Needs Improvement/Poor
- **Active alerts count** - Number of unacknowledged alerts
- **Summary message** - Brief status description

### Metric Cards

Each card displays:
- Metric name and label
- Current average value with unit
- Trend indicator (percentage)
- Rating distribution percentages
- P50, P90, P95 percentiles
- Sample count

### Active Alerts Panel

Shows:
- Severity badge
- Metric name
- Alert message
- Route and timestamp
- Acknowledge button

### Charts

Interactive features:
- **Time-series visualization** - See trends over time
- **Metric selector** - Switch between metrics
- **Custom tooltips** - Hover for details
- **Responsive** - Adapts to screen size

---

## 🔧 Configuration

### Adjust Sampling Rate

Edit `src/components/ClientProviders.tsx`:

```typescript
initWebVitalsMonitoring({
  sampleRate: 0.1,  // 10% sampling (reduce server load)
  // ...
});
```

### Enable/Disable Console Logs

```typescript
initWebVitalsMonitoring({
  enableConsole: false,  // Disable console logs in production
  // ...
});
```

### Custom API Endpoint

Set environment variable:

```bash
NEXT_PUBLIC_WEB_VITALS_API_URL=/api/performance/metrics
```

---

## 🎯 Performance Optimization Tips

### Improve LCP
- Optimize images (WebP, lazy loading)
- Preload critical resources
- Minimize render-blocking CSS/JS
- Use CDN for static assets

### Improve FID
- Reduce JavaScript execution time
- Defer non-critical scripts
- Use code splitting
- Minimize main thread work

### Improve CLS
- Reserve space for images and ads
- Avoid inserting content above existing content
- Use font-display: swap
- Ensure proper image dimensions

### Improve INP
- Optimize event handlers
- Use requestIdleCallback for non-critical work
- Avoid long tasks
- Use web workers for heavy computation

### Improve TTFB
- Optimize server performance
- Use CDN
- Enable compression
- Reduce server-side processing

---

## 📝 Common Issues

### Q: Dashboard shows "No data available"

**A**: Wait for some page views to generate metrics. The dashboard needs data to display.

### Q: Alerts not triggering

**A**: Check that:
- Alert rules are enabled
- Threshold values are correct
- Metrics are being collected (check logs)

### Q: High memory usage

**A**: Reduce sampling rate or limit stored metrics:
```typescript
initWebVitalsMonitoring({
  sampleRate: 0.1,  // 10% sampling
});
```

### Q: Metrics not appearing in dashboard

**A**: Check browser console for errors and ensure:
- `ClientProviders` is wrapping the app
- No network errors (check API endpoints)
- Metrics are being sent (check network tab)

---

## 🚀 Production Deployment

### Before Production

1. **Reduce sampling rate** to 10-20%
2. **Enable database persistence** (replace in-memory storage)
3. **Set up alert notifications** (Slack, Email, etc.)
4. **Configure data retention policy**
5. **Test with real traffic**

### Database Migration

Replace in-memory storage with your database:

```typescript
// In metrics/route.ts
// Replace Map<string, PerformanceMetric[]> with database queries

import { db } from '@/lib/db';

// Store metric
await db.performanceMetrics.create({ ...metric });

// Retrieve metrics
const metrics = await db.performanceMetrics.findMany({ ...filters });
```

---

## 📚 Additional Resources

- [Web Vitals Documentation](https://web.dev/vitals/)
- [Recharts Documentation](https://recharts.org/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

---

## 💡 Tips & Best Practices

1. **Monitor regularly** - Check dashboard daily for trends
2. **Set realistic thresholds** - Base alerts on your data
3. **Acknowledge alerts** - Keep alerts list clean
4. **Export data** - Save reports for historical analysis
5. **Optimize incrementally** - Fix worst metrics first
6. **Test on real devices** - Emulators don't show real performance

---

**Last Updated**: 2026-03-21
**Version**: 1.0.0

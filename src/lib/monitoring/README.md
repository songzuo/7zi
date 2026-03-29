# Performance Monitoring Module

Comprehensive performance monitoring and root cause analysis system for 7zi v1.4.0.

## Features

### Core Performance Monitoring

- **Performance Logger** (`performance-logger.ts`) - Logs performance metrics
- **Performance Analyzer** (`performance-analyzer.ts`) - Analyzes performance trends
- **Web Vitals** (`web-vitals.ts`) - Core Web Vitals tracking (FCP, LCP, CLS, FID, INP)

### Root Cause Analysis

Located in `root-cause/` directory:

#### 1. Performance Waterfall (`performance-waterfall.ts`, `performance-waterfall-enhanced.ts`)

Analyzes resource loading waterfall to identify performance bottlenecks.

**Features:**
- Page load performance waterfall visualization
- Network request timing breakdown (DNS, TCP, TLS, Request, Response)
- Render blocking analysis
- First Contentful Paint (FCP) calculation and estimation
- Critical path identification
- Resource impact estimation

**Usage:**

```typescript
import { performanceWaterfall, fromPerformanceResourceTiming } from './monitoring/root-cause';

// Start observing resource timing
performanceWaterfall.startObserving();

// Analyze waterfall
const analysis = performanceWaterfall.analyzeWaterfall();

console.log('FCP Estimate:', analysis.fcpEstimate);
console.log('Render Blocking Resources:', analysis.renderBlockingResources);
console.log('Timing Breakdown:', analysis.timingBreakdown);
console.log('Recommendations:', analysis.recommendations);

// Find slowest resources
const slowest = performanceWaterfall.findSlowestResources(5);

// Find largest resources
const largest = performanceWaterfall.findLargestResources(5);
```

#### 2. Performance Root Cause Analyzer (`performance-root-cause.ts`)

Complete root cause analysis for performance issues.

**Features:**
- Slow page diagnosis (FCP > 1.8s, LCP > 2.5s, CLS > 0.1, INP > 200ms)
- Memory leak detection (long-term heap growth > 50MB)
- Network bottleneck identification (DNS/TCP/TLS connection times)
- Render issue diagnosis (long tasks > 50ms, forced reflows)

**Usage:**

```typescript
import {
  performanceRootCauseAnalyzer,
  createMockCoreWebVitals,
  createMockMemoryMetrics,
  createMockNetworkTiming,
} from './monitoring/root-cause';

// Collect metrics
const coreWebVitals = {
  FCP: 3500, // Slow
  LCP: 2000,
  CLS: 0.05,
  FID: 50,
  INP: 100,
  TTFB: 600,
};

const memoryMetrics = createMockMemoryMetrics({
  usedJSHeapSize: 100 * 1024 * 1024, // 100MB
  growthRate: 20 * 1024 * 1024, // 20MB/sec
  trend: 'increasing',
});

const networkTimings = [
  createMockNetworkTiming({
    dns: 200,
    tcp: 150,
    tls: 180,
  }),
];

// Perform analysis
const analysis = performanceRootCauseAnalyzer.analyze(
  coreWebVitals,
  memoryMetrics,
  networkTimings,
  window.location.href
);

console.log('Overall Health:', analysis.overallHealth);
console.log('Slow Page Diagnoses:', analysis.slowPageDiagnoses);
console.log('Memory Analysis:', analysis.memoryAnalysis);
console.log('Network Bottlenecks:', analysis.networkBottlenecks);
console.log('Priority Actions:', analysis.priorityActions);
console.log('Summary:', analysis.summary);
```

**Slow Page Diagnosis:**

```typescript
const diagnoses = performanceRootCauseAnalyzer.diagnoseSlowPages(coreWebVitals);

for (const diagnosis of diagnoses) {
  console.log(`Metric: ${diagnosis.metric}`);
  console.log(`Severity: ${diagnosis.severity}`);
  console.log(`Deviation: ${diagnosis.deviation}%`);
  console.log(`Root Causes:`, diagnosis.rootCauses);
  console.log(`Recommendations:`, diagnosis.recommendations);
}
```

**Memory Leak Detection:**

```typescript
const memoryAnalysis = performanceRootCauseAnalyzer.detectMemoryLeak(memoryMetrics);

if (memoryAnalysis.detected) {
  console.log(`Memory leak detected: ${memoryAnalysis.growthRate.toFixed(2)} MB/hour`);
  console.log(`Severity: ${memoryAnalysis.severity}`);
  console.log(`Estimated time to OOM: ${memoryAnalysis.estimatedTimeToOOM}s`);
  console.log(`Suspected sources:`, memoryAnalysis.suspectedSources);
  console.log(`Recommendations:`, memoryAnalysis.recommendations);
}
```

**Network Bottleneck Detection:**

```typescript
const bottlenecks = performanceRootCauseAnalyzer.identifyNetworkBottlenecks(networkTimings);

for (const bottleneck of bottlenecks) {
  console.log(`Type: ${bottleneck.type}`);
  console.log(`Duration: ${bottleneck.duration}ms`);
  console.log(`Severity: ${bottleneck.severity}`);
  console.log(`Recommendation: ${bottleneck.recommendation}`);
}
```

#### 3. Performance Budget Controller (`performance-budget.ts`)

Performance budget control with threshold-based alerting.

**Features:**
- Performance budget thresholds for all key metrics
- Budget violation detection (warnings and errors)
- Budget compliance reporting
- Budget violation alerts with suppression
- Historical compliance tracking

**Default Budget Thresholds:**

| Metric | Threshold | Severity | Category |
|--------|-----------|-----------|-----------|
| FCP | 1800ms | error | Web Vitals |
| LCP | 2500ms | error | Web Vitals |
| CLS | 0.1 | error | Web Vitals |
| FID | 100ms | error | Web Vitals |
| INP | 200ms | error | Web Vitals |
| TTFB | 800ms | error | Web Vitals |
| TBT | 200ms | warning | Web Vitals |
| TTI | 3800ms | warning | Web Vitals |
| Total Transfer Size | 1MB | error | Resource |
| JavaScript Size | 300KB | error | Resource |
| CSS Size | 100KB | warning | Resource |
| Image Size | 500KB | error | Resource |
| Request Count | 50 | warning | Resource |
| Third-Party Request Count | 20 | error | Resource |
| DOM Node Count | 1500 | warning | Resource |
| Memory Usage | 100MB | warning | Memory |
| Memory Usage Ratio | 70% | error | Memory |

**Usage:**

```typescript
import { performanceBudgetController, createMockPerformanceMetrics } from './monitoring/root-cause';

// Check budgets
const metrics = createMockPerformanceMetrics({
  FCP: 3500, // Violation
  LCP: 2000,
  CLS: 0.05,
  INP: 100,
});

const report = performanceBudgetController.checkBudgets(metrics, window.location.href);

console.log('Compliance Status:', report.complianceStatus);
console.log('Overall Score:', report.overallScore);
console.log('Violations:', report.violations);
console.log('Warnings:', report.warnings);
console.log('Summary:', report.summary);
console.log('Recommendations:', report.recommendations);
```

**Custom Budget Thresholds:**

```typescript
// Add custom threshold
performanceBudgetController.setThreshold({
  metric: 'CUSTOM_METRIC',
  threshold: 100,
  unit: 'ms',
  comparison: 'lte',
  severity: 'error',
  category: 'custom',
  description: 'Custom metric threshold',
});

// Update existing threshold
performanceBudgetController.setThreshold({
  metric: 'FCP',
  threshold: 2000,
  unit: 'ms',
  comparison: 'lte',
  severity: 'error',
  category: 'web-vitals',
  description: 'Updated FCP threshold',
});

// Remove threshold
performanceBudgetController.removeThreshold('FCP');
```

**Alert Management:**

```typescript
// Get alerts
const alerts = performanceBudgetController.getAlerts();

// Suppress alert
performanceBudgetController.suppressAlert('FCP', 'Known issue, will fix later');

// Unsuppress alert
performanceBudgetController.unsuppressAlert('FCP');

// Clear alerts
performanceBudgetController.clearAlerts();
```

**Compliance Reporting:**

```typescript
// Get compliance report for a URL
const report = performanceBudgetController.getComplianceReportByUrl(
  'https://example.com',
  new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  new Date()
);

if (report) {
  console.log('Average Score:', report.overallScore);
  console.log('Compliance Status:', report.complianceStatus);
  console.log('Summary:', report.summary);
}

// Get performance trend
const trend = performanceBudgetController.getPerformanceTrend(24); // Last 24 hours

trend.forEach((data) => {
  console.log(`${data.timestamp.toISOString()}: ${data.score} (${data.status})`);
});
```

### Other Components

#### Bottleneck Detector (`bottleneck-detector.ts`)

Identifies performance bottlenecks and provides optimization recommendations.

#### Slow Request Tracker (`slow-request-tracker.ts`)

Tracks and analyzes slow API requests.

#### Alert System (`alerts.ts`, `alert-manager.ts`)

Manages performance alerts and notifications.

## Next.js App Router Integration

All modules are compatible with Next.js App Router and can be used in:

- Server Components (for server-side metrics)
- Client Components (for browser metrics)
- API Routes (for custom endpoints)
- Middleware (for request tracking)

### Example: Server Component

```typescript
'use client';

import { useEffect } from 'react';
import { performanceRootCauseAnalyzer } from '@/lib/monitoring/root-cause';

export default function PerformanceMonitor() {
  useEffect(() => {
    // Start observing
    performanceRootCauseAnalyzer.startObserving();

    // Collect memory samples periodically
    const interval = setInterval(() => {
      performanceRootCauseAnalyzer.collectMemorySample();
    }, 60000); // Every minute

    return () => {
      clearInterval(interval);
      performanceRootCauseAnalyzer.stopObserving();
    };
  }, []);

  return null;
}
```

### Example: API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { performanceBudgetController } from '@/lib/monitoring/root-cause';

export async function POST(req: NextRequest) {
  const metrics = await req.json();
  
  const report = performanceBudgetController.checkBudgets(
    metrics,
    metrics.url
  );

  return NextResponse.json(report);
}
```

## Testing

All modules include comprehensive unit tests using Vitest:

```bash
# Run all tests
npm test

# Run specific test file
npm test performance-root-cause.test.ts

# Run tests with coverage
npm test -- --coverage
```

## API Reference

### Types

See individual module files for complete type definitions:

- `ResourceTiming` - Resource timing data
- `WaterfallAnalysis` - Complete waterfall analysis
- `CoreWebVitalsMetrics` - Core Web Vitals metrics
- `MemoryMetrics` - Memory usage metrics
- `NetworkTimingBreakdown` - Network timing breakdown
- `BudgetThreshold` - Budget threshold configuration
- `BudgetComplianceReport` - Budget compliance report

### Constants

- `CORE_WEB_VITALS_THRESHOLDS` - Core Web Vitals thresholds
- `NETWORK_THRESHOLDS` - Network timing thresholds
- `MEMORY_THRESHOLDS` - Memory leak detection thresholds
- `RENDER_THRESHOLDS` - Render issue thresholds
- `DEFAULT_BUDGET_THRESHOLDS` - Default budget thresholds

## Contributing

When adding new features:

1. Update the appropriate module file
2. Add comprehensive unit tests
3. Update this README.md with usage examples
4. Ensure TypeScript strict mode compliance
5. Test with Next.js App Router

## License

Part of 7zi v1.4.0

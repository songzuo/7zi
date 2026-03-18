# HealthDashboard Component

## Overview

The `HealthDashboard` component is a real-time system health monitoring dashboard for the 7zi AI Team Management Platform. It displays critical system metrics with visual status indicators and supports responsive design with dark/light theme switching.

## Features

- **Real-time Monitoring**: Auto-refreshes at configurable intervals (default: 5 seconds)
- **Multi-Metric Display**:
  - API Response Time (based on TTFB metrics)
  - WebSocket Connection Status
  - Memory Usage (heap size in MB)
  - Last Active Time
- **Status Indicators**: Visual color-coded status (healthy/warning/critical)
- **Responsive Design**: Adapts to all screen sizes (mobile, tablet, desktop)
- **Theme Support**: Automatically adapts to dark/light theme
- **Overall Status Summary**: Shows aggregated system health

## Installation

The component is already installed and exported from `src/components/index.ts`:

```tsx
import { HealthDashboard } from '@/components/HealthDashboard';
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes to apply to the container |
| `refreshInterval` | `number` | `5000` | Auto-refresh interval in milliseconds |

### Exported Types

```typescript
export type HealthMetric = {
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
};

export type HealthDashboardProps = {
  className?: string;
  refreshInterval?: number;
};
```

## Usage Examples

### Basic Usage

```tsx
import { HealthDashboard } from '@/components/HealthDashboard';

export default function DashboardPage() {
  return (
    <div>
      <h1>System Status</h1>
      <HealthDashboard />
    </div>
  );
}
```

### Custom Refresh Interval

```tsx
// Refresh every 10 seconds
<HealthDashboard refreshInterval={10000} />

// Refresh every 30 seconds
<HealthDashboard refreshInterval={30000} />
```

### With Custom Styling

```tsx
<HealthDashboard className="my-dashboard shadow-2xl" />
```

### Full Page Implementation

```tsx
import { HealthDashboard } from '@/components/HealthDashboard';

export default function HealthPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Health</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Real-time monitoring dashboard
          </p>
        </header>

        <HealthDashboard refreshInterval={5000} />
      </div>
    </div>
  );
}
```

## Metrics Explained

### API Response Time

- **Source**: Core Web Vitals - TTFB (Time to First Byte)
- **Thresholds**:
  - Healthy: < 200ms
  - Warning: 200-500ms
  - Critical: > 500ms
- **Display**: Shows the most recent TTFB value in milliseconds

### WebSocket Connection

- **Source**: Realtime notification store connection status
- **Thresholds**:
  - Healthy: Connected
  - Critical: Disconnected
- **Display**: Shows current connection state

### Memory Usage

- **Source**: Browser Performance API - `performance.memory.usedJSHeapSize`
- **Thresholds**:
  - Healthy: < 100MB
  - Warning: 100-200MB
  - Critical: > 200MB
- **Display**: Shows current heap usage in megabytes

### Last Active Time

- **Source**: Component state - time since last refresh
- **Display**: Human-readable time (e.g., "5s ago", "2m ago", "1h ago")

## Status Indicators

The dashboard uses color-coded indicators to quickly communicate health status:

- **Green (✓)**: All systems operating normally
- **Amber (⚠)**: Some metrics need attention
- **Red (✗)**: Immediate action required

### Overall Status Logic

The overall system status is calculated as follows:
- **Critical**: If any metric is critical
- **Warning**: If any metric is warning (and none are critical)
- **Healthy**: If all metrics are healthy

## Dependencies

The component integrates with existing infrastructure:

- `@/contexts/SettingsContext`: For theme detection
- `@/lib/monitoring/performance.monitor`: For API latency metrics
- `@/lib/realtime/store`: For WebSocket connection status

## Browser Compatibility

- **Required**:
  - `performance.memory` API (for memory usage) - Chrome/Edge only
  - `PerformanceObserver` API (for TTFB) - Modern browsers

- **Fallbacks**:
  - If memory API is unavailable, shows "N/A"
  - If metrics are unavailable, defaults to healthy status

## Styling

The component uses Tailwind CSS with built-in dark mode support:

- Light mode: White backgrounds, zinc-900 text
- Dark mode: Zinc-800 backgrounds, white text

Custom styling can be added via the `className` prop:

```tsx
<HealthDashboard className="custom-border" />
```

## Performance Considerations

- **Refresh Interval**: Default is 5 seconds. Increase for better battery life, decrease for more real-time updates
- **Memory**: Component automatically cleans up intervals on unmount
- **Network**: No additional network requests - uses local monitoring data

## Examples

See `src/components/HealthDashboard.demo.tsx` for complete usage examples including:
- Basic implementation
- Custom refresh intervals
- Full page layout with additional information

## Future Enhancements

Potential improvements for future versions:

1. **Historical Trends**: Add charts showing metric trends over time
2. **Alert Configuration**: Allow users to set custom thresholds
3. **Export Functionality**: Export health reports as PDF/CSV
4. **Additional Metrics**:
   - CPU usage (if available)
   - Network speed
   - Error rates
   - Active user count
5. **Integration**: Connect to backend health check endpoints

## Troubleshooting

### Metrics showing "N/A"

- **Memory**: Only available in Chrome/Edge browsers
- **API Latency**: Requires page navigation or API calls to populate
- **WebSocket**: Requires active WebSocket connection

### Status not updating

- Check that `refreshInterval` is set appropriately
- Ensure browser is not suspended/backgrounded
- Check browser console for errors

### Theme not applying

- Ensure `SettingsProvider` wraps your app
- Check that `useTheme()` is accessible in component tree

## License

This component is part of the 7zi AI Team Management Platform.

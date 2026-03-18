/**
 * HealthDashboard Component Demo
 *
 * This file demonstrates how to use the HealthDashboard component.
 * You can import this component into any page to display system health metrics.
 */

import { HealthDashboard } from '@/components/HealthDashboard';

/**
 * Basic Usage
 *
 * Simply import and render the component:
 *
 * ```tsx
 * import { HealthDashboard } from '@/components/HealthDashboard';
 *
 * export default function MyPage() {
 *   return <HealthDashboard />;
 * }
 * ```
 */

/**
 * Custom Refresh Interval
 *
 * You can customize how often the dashboard refreshes (in milliseconds):
 *
 * ```tsx
 * <HealthDashboard refreshInterval={10000} /> // Refresh every 10 seconds
 * ```
 */

/**
 * Custom Styling
 *
 * Pass additional CSS classes via the `className` prop:
 *
 * ```tsx
 * <HealthDashboard className="my-custom-class" />
 * ```
 */

/**
 * Example Implementation
 */
export function HealthDashboardDemo() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">System Health</h1>
      <HealthDashboard refreshInterval={5000} />
    </div>
  );
}

/**
 * Full Page Example with Dashboard Layout
 */
export function HealthDashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">7zi AI Team - System Health</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Health Dashboard */}
          <HealthDashboard refreshInterval={3000} />

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Monitoring Information</h2>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• API Response Time: Based on TTFB (Time to First Byte) metrics</li>
                <li>• WebSocket Connection: Real-time connection status from notification store</li>
                <li>• Memory Usage: Current heap size usage in MB</li>
                <li>• Last Active: Time since last data refresh</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Status Indicators</h2>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li>✓ Healthy: All metrics within acceptable ranges</li>
                <li>⚠ Warning: Some metrics need attention</li>
                <li>✗ Critical: Immediate action required</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

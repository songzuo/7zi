/**
 * React Hooks for Monitoring
 * 性能监控 React Hooks
 *
 * NOTE: These are separated from monitoring/index.ts to avoid circular dependencies
 */

export {
  usePerformanceMonitor,
  useRenderPerformance,
  useApiPerformance,
  useRouteChangePerformance,
  useMemoryUsage,
  PerformanceScore,
  type PerformanceSummary,
  type UsePerformanceMonitorOptions,
  type UsePerformanceMonitorReturn,
} from '../use-performance';

/**
 * Monitoring Module
 * Central export for all monitoring utilities
 */

// Web Vitals
export {
  initWebVitalsMonitoring,
  observePerformance,
  getCurrentVitals,
} from './web-vitals';

// Error tracking
export {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  captureError,
  withErrorTracking,
  handleApiError,
  addBreadcrumb,
} from './errors';

// Alerting
export {
  sendAlert,
  sendSlackAlert,
  sendEmailAlert,
  alerts,
  type AlertSeverity,
  type AlertConfig,
} from './alerts';

// Health checks
export {
  basicHealthCheck,
  detailedHealthCheck,
  comprehensiveHealthReport,
  enhancedHealthReport,
  getSystemResources,
  getPerformanceMetrics,
  getHealthHistory,
  addToHistory,
  clearHealthHistory,
  healthResponse,
  probes,
  type HealthStatus,
  type CheckResult,
  type ComponentStatus,
  type HealthSummary,
  type DetailedHealthReport,
  type SystemResources,
  type ServiceStatus,
  type ConfigurationStatus,
} from './health';

// Performance metrics
export {
  recordResponseTime,
  takeSystemSnapshot,
  getEndpointMetrics,
  getSlowestEndpoints,
  getErrorProneEndpoints,
  getMostAccessedEndpoints,
  getPerformanceSummary,
  getHourlyStats,
  getSystemSnapshots,
  getLatestSnapshot,
  resetPerformanceMetrics,
  withPerformanceTracking,
  createPerformanceTracker,
  type EndpointMetrics,
  type SystemSnapshot,
  type PerformanceStore,
} from './performance-metrics';
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
  healthResponse,
  probes,
  type HealthStatus,
  type CheckResult,
} from './health';
/**
 * Performance Monitoring - Alerting Module
 * 
 * Multi-level alert system with suppression, aggregation, and history tracking
 * 
 * @module performance/alerting
 */

// ========================================
// Core Classes
// ========================================

export { PerformanceAlerter, DashboardChannel } from './alerter';
export { performanceAlerter } from './alerter';

// ========================================
// Types
// ========================================

export type {
  AlertLevel,
  AlertStatus,
  AlertCategory,
  PerformanceAlert,
  AlertConfig,
  SuppressionRule,
  AlertFilter,
  AggregatedAlertGroup,
  AlertHistoryEntry,
  AlertAction,
  AlertStats,
  AlertChannel,
  DashboardAlertMessage,
} from './alerter';

// ========================================
// Utilities
// ========================================

export {
  generateAlertId,
  getLevelPriority,
  compareLevels,
  meetsMinLevel,
  getLevelDisplay,
  defaultDeduplicationKey,
  createPerformanceAlert,
  formatAlertForLog,
  filterAlerts,
} from './alerter';

// ========================================
// Default Export
// ========================================

export { default } from './alerter';

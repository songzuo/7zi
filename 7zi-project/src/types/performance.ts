/**
 * Performance Monitoring Types
 * 
 * Types for performance metrics tracking and alerts
 */

// ============================================================================
// Performance Metrics Types
// ============================================================================

export interface PerformanceMetrics {
  // API Response Time (ms)
  apiResponseTime: number;

  // Page Load Time (ms)
  pageLoadTime: number;

  // Error Rate (percentage, 0-100)
  errorRate: number;

  // Active Users Count
  activeUsers: number;

  // Timestamp of the measurement
  timestamp: number;
}

// ============================================================================
// Historical Metrics Data
// ============================================================================

export interface MetricsHistory {
  data: PerformanceMetrics[];
  timeframe: '1h' | '6h' | '24h' | '7d';
}

// ============================================================================
// Alert Configuration
// ============================================================================

export interface AlertThreshold {
  // Metric name
  metric: keyof PerformanceMetrics;

  // Warning threshold
  warningThreshold: number;

  // Critical threshold
  criticalThreshold: number;

  // Alert enabled
  enabled: boolean;
}

export interface PerformanceAlert {
  id: string;
  metric: keyof PerformanceMetrics;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

// ============================================================================
// Dashboard State Types
// ============================================================================

export interface PerformanceDashboardState {
  currentMetrics: PerformanceMetrics | null;
  history: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface MetricsApiResponse {
  success: boolean;
  data: PerformanceMetrics;
  alerts?: PerformanceAlert[];
  timestamp: number;
}

export interface MetricsHistoryResponse {
  success: boolean;
  data: PerformanceMetrics[];
  timeframe: string;
  timestamp: number;
}

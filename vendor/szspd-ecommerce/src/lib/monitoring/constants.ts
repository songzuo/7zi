// @ts-nocheck
/**
 * Shared Constants for Monitoring
 * 避免硬编码值，统一配置
 */

// Time intervals (in milliseconds)
export const TIME_INTERVALS = {
  MEMORY_CHECK: 30000,
  METRICS_REFRESH: 1000,
  ALERTS_CHECK: 5000,
  HEALTH_CHECK: 30000,
  DEFAULT_TIMEOUT: 5000,
  BATCH_FLUSH: 30000,
} as const

// Size limits
export const SIZE_LIMITS = {
  MAX_CUSTOM_METRICS: 100,
  MAX_METRICS_HISTORY: 60,
  MAX_ALERTS_HISTORY: 20,
  MAX_PENDING_METRICS: 10,
  MAX_ALERT_HISTORY_SIZE: 1000,
  MAX_DURATION_HISTORY: 100,
  MAX_API_ARGS_LENGTH: 500,
} as const

// Alert thresholds (for quick reference)
export const ALERT_THRESHOLDS = {
  MEMORY_WARNING: 50,
  MEMORY_CRITICAL: 100,
  LONG_TASK_WARNING: 100,
  LONG_TASK_CRITICAL: 300,
  RENDER_WARNING: 16,
  RENDER_CRITICAL: 33,
} as const

// HTTP statuses
export const HTTP_STATUS = {
  OK: 200,
  UNAUTHORIZED: 401,
} as const

// Performance weights for scoring
export const PERFORMANCE_WEIGHTS = {
  LCP: 0.25,
  INP: 0.25,
  CLS: 0.25,
  FCP: 0.15,
  TTFB: 0.1,
} as const

// Performance score thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 50,
} as const

// Cleanup cutoff (1 hour in ms)
export const CLEANUP_CUTOFF = 3600000

// Regex patterns for resource type detection
export const RESOURCE_PATTERNS = {
  JS: /\.js($|\?)/,
  CSS: /\.css($|\?)/,
  IMAGE: /\.(png|jpg|jpeg|gif|webp|svg|ico)($|\?)/i,
  FONT: /\.(woff|woff2|ttf|otf|eot)($|\?)/i,
  API: /\/api\//,
} as const

// Performance score colors
export const PERFORMANCE_COLORS = {
  GOOD: '#0cce6b',
  NEEDS_IMPROVEMENT: '#ffa400',
  POOR: '#ff4e42',
} as const

// Performance score labels
export const SCORE_LABELS = {
  EXCELLENT: '优秀',
  GOOD: '需改进',
  POOR: '差',
} as const

// Severity colors for Slack alerts
export const SEVERITY_COLORS = {
  p0: '#FF0000',
  p1: '#FFA500',
  p2: '#FFFF00',
  p3: '#00FF00',
} as const

// Severity labels for Slack alerts
export const SEVERITY_LABELS = {
  p0: '🔴 CRITICAL',
  p1: '🟠 HIGH',
  p2: '🟡 WARNING',
  p3: '🟢 INFO',
} as const

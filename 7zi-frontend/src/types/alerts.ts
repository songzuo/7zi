/**
 * Alert Rule Type Definitions
 * @version 1.0.0
 * @date 2026-04-03
 */

// ============================================
// Alert Rule Types
// ============================================

export type MetricType = 'CPU' | 'Memory' | 'ResponseTime' | 'ErrorRate' | 'Throughput'

export type Condition = '>' | '<' | '>=' | '<=' | '=='

export type Severity = 'info' | 'warning' | 'critical'

export type NotificationChannel = 'email' | 'slack' | 'webhook'

export interface AlertRule {
  id: string
  name: string
  metricType: MetricType
  condition: Condition
  threshold: number
  duration: number // Duration in seconds before triggering
  severity: Severity
  channels: NotificationChannel[]
  enabled: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  description?: string
}

export interface CreateAlertRuleDTO {
  name: string
  metricType: MetricType
  condition: Condition
  threshold: number
  duration: number
  severity: Severity
  channels: NotificationChannel[]
  enabled?: boolean
  description?: string
}

export interface UpdateAlertRuleDTO extends Partial<CreateAlertRuleDTO> {
  id: string
}

// ============================================
// Alert History Types
// ============================================

export interface AlertHistory {
  id: string
  ruleId: string
  ruleName: string
  metricType: MetricType
  severity: Severity
  value: number
  threshold: number
  condition: Condition
  triggeredAt: string
  resolvedAt?: string
  status: 'active' | 'resolved' | 'acknowledged'
  acknowledgedBy?: string
  acknowledgedAt?: string
  metadata?: Record<string, unknown>
}

export interface AlertHistoryQuery {
  ruleId?: string
  severity?: Severity
  status?: 'active' | 'resolved' | 'acknowledged'
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

// ============================================
// API Response Types
// ============================================

export interface AlertRulesResponse {
  rules: AlertRule[]
  total: number
  page: number
  pageSize: number
}

export interface AlertHistoryResponse {
  alerts: AlertHistory[]
  total: number
  page: number
  pageSize: number
}

export interface AlertRuleStats {
  total: number
  enabled: number
  disabled: number
  bySeverity: Record<Severity, number>
  byMetricType: Record<MetricType, number>
}
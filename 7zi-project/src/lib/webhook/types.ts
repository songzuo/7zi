/**
 * Webhook Event Types and Interfaces
 * v1.12.0 - Webhook Event Notification System
 */

// ============================================================
// Event Types
// ============================================================

/**
 * All supported event types
 */
export type WebhookEventType =
  // Agent events
  | 'agent.created'
  | 'agent.updated'
  | 'agent.deleted'
  // Task events
  | 'task.created'
  | 'task.completed'
  | 'task.failed'
  // Workflow events
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  // System events
  | 'system.alert'
  | 'system.error'

/**
 * Event categories
 */
export type EventCategory = 'agent' | 'task' | 'workflow' | 'system'

// ============================================================
// Webhook Endpoint
// ============================================================

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  id: string
  url: string
  secret: string
  events: WebhookEventType[]
  enabled: boolean
  createdAt: number
  updatedAt: number
  description?: string
  ipWhitelist?: string[]
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
}

/**
 * Create webhook endpoint request
 */
export interface CreateWebhookRequest {
  url: string
  secret: string
  events: WebhookEventType[]
  description?: string
  ipWhitelist?: string[]
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
}

/**
 * Update webhook endpoint request
 */
export interface UpdateWebhookRequest {
  url?: string
  secret?: string
  events?: WebhookEventType[]
  enabled?: boolean
  description?: string
  ipWhitelist?: string[]
  headers?: Record<string, string>
  metadata?: Record<string, unknown>
}

// ============================================================
// Event Payload
// ============================================================

/**
 * Base event payload
 */
export interface WebhookEventPayload {
  id: string
  type: WebhookEventType
  timestamp: number
  data: unknown
  metadata?: Record<string, unknown>
}

/**
 * Agent event data
 */
export interface AgentEventData {
  agentId: string
  name?: string
  status?: string
  capabilities?: string[]
  config?: Record<string, unknown>
}

/**
 * Task event data
 */
export interface TaskEventData {
  taskId: string
  agentId?: string
  status: string
  progress?: number
  result?: unknown
  error?: string
}

/**
 * Workflow event data
 */
export interface WorkflowEventData {
  workflowId: string
  status: string
  steps?: number
  completedSteps?: number
  error?: string
}

/**
 * System event data
 */
export interface SystemEventData {
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  component?: string
  details?: Record<string, unknown>
}

// ============================================================
// Event Delivery
// ============================================================

/**
 * Delivery status
 */
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying' | 'expired'

/**
 * Event delivery record
 */
export interface EventDelivery {
  id: string
  eventId: string
  webhookId: string
  status: DeliveryStatus
  attempts: number
  maxAttempts: number
  lastAttempt?: number
  nextRetry?: number
  error?: string
  responseCode?: number
  createdAt: number
  updatedAt: number
}

/**
 * Delivery attempt log
 */
export interface DeliveryAttempt {
  id: string
  deliveryId: string
  attemptNumber: number
  timestamp: number
  success: boolean
  responseCode?: number
  responseTime: number
  error?: string
}

// ============================================================
// Event Filter
// ============================================================

/**
 * Event filter configuration
 */
export interface EventFilter {
  eventTypes?: WebhookEventType[]
  eventCategories?: EventCategory[]
  conditions?: EventFilterCondition[]
}

/**
 * Filter condition
 */
export interface EventFilterCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists'
  value: unknown
}

// ============================================================
// Webhook Configuration
// ============================================================

/**
 * Webhook manager configuration
 */
export interface WebhookConfig {
  maxRetries: number
  initialRetryDelay: number
  maxRetryDelay: number
  retryMultiplier: number
  requestTimeout: number
  maxConcurrentDeliveries: number
  enableEventQueue: boolean
  queueMaxSize: number
}

/**
 * Default configuration
 */
export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  maxRetries: 5,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 60000, // 60 seconds
  retryMultiplier: 2,
  requestTimeout: 10000, // 10 seconds
  maxConcurrentDeliveries: 10,
  enableEventQueue: true,
  queueMaxSize: 10000,
}

// ============================================================
// Signature
// ============================================================

/**
 * Signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean
  error?: string
}

/**
 * Webhook signature headers
 */
export interface WebhookSignatureHeaders {
  signature: string
  timestamp: string
  nonce?: string
}

// ============================================================
// Statistics
// ============================================================

/**
 * Webhook statistics
 */
export interface WebhookStatistics {
  totalEvents: number
  successfulDeliveries: number
  failedDeliveries: number
  pendingDeliveries: number
  averageResponseTime: number
  lastDelivery?: number
  eventsByType: Record<WebhookEventType, number>
}

// ============================================================
// Errors
// ============================================================

/**
 * Webhook error types
 */
export type WebhookErrorType =
  | 'invalid_url'
  | 'invalid_secret'
  | 'invalid_events'
  | 'not_found'
  | 'disabled'
  | 'delivery_failed'
  | 'timeout'
  | 'signature_invalid'
  | 'ip_not_whitelisted'
  | 'queue_full'

/**
 * Webhook error
 */
export class WebhookError extends Error {
  constructor(
    public type: WebhookErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'WebhookError'
  }
}

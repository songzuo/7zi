/**
 * Webhook Event Notification System
 * v1.12.0
 *
 * A comprehensive webhook system for event notifications with:
 * - Webhook endpoint management
 * - HMAC-SHA256 signature verification
 * - Retry mechanism with exponential backoff
 * - Async event delivery
 * - Event filtering
 */

// ============================================================
// Types
// ============================================================

export type {
  WebhookEventType,
  EventCategory,
  WebhookEndpoint,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookEventPayload,
  AgentEventData,
  TaskEventData,
  WorkflowEventData,
  SystemEventData,
  DeliveryStatus,
  EventDelivery,
  DeliveryAttempt,
  EventFilter,
  EventFilterCondition,
  WebhookConfig,
  SignatureVerificationResult,
  WebhookSignatureHeaders,
  WebhookStatistics,
  WebhookErrorType,
} from './types'

export { WebhookError, DEFAULT_WEBHOOK_CONFIG } from './types'

// ============================================================
// Signature
// ============================================================

export {
  generateSignature,
  generateSignatureHeaders,
  verifySignature,
  verifySignatureFromHeaders,
  hasValidSignatureHeaders,
  extractSignatureHeaders,
  normalizeHeaders,
} from './signature'

// ============================================================
// Webhook Manager
// ============================================================

export { WebhookManager, InMemoryWebhookStorage } from './webhook-manager'

export type { WebhookStorage } from './webhook-manager'

// ============================================================
// Event Delivery
// ============================================================

export { EventDeliveryService, InMemoryDeliveryStorage } from './event-delivery'

export type { DeliveryStorage } from './event-delivery'

// ============================================================
// Event Dispatcher
// ============================================================

export { EventDispatcher } from './event-dispatcher'

export type { EventDispatcherConfig } from './event-dispatcher'

// ============================================================
// Create Default Instance
// ============================================================

import { WebhookManager } from './webhook-manager'
import { EventDeliveryService } from './event-delivery'
import { EventDispatcher } from './event-dispatcher'
import type { EventDispatcherConfig } from './event-dispatcher'

/**
 * Create a default webhook system with in-memory storage
 */
export function createWebhookSystem(config?: {
  webhookConfig?: Partial<import('./types').WebhookConfig>
  dispatcherConfig?: Partial<EventDispatcherConfig>
}): {
  webhookManager: WebhookManager
  deliveryService: EventDeliveryService
  dispatcher: EventDispatcher
} {
  const mgr = new WebhookManager(undefined, config?.webhookConfig)
  const svc = new EventDeliveryService(undefined, config?.webhookConfig)
  const disp = new EventDispatcher(mgr, svc, config?.dispatcherConfig)

  return {
    webhookManager: mgr,
    deliveryService: svc,
    dispatcher: disp,
  }
}

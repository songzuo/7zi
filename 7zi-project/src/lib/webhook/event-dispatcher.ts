/**
 * Event Dispatcher
 * v1.12.0 - Webhook Event Notification System
 */

import type {
  WebhookEventType,
  WebhookEventPayload,
  EventFilter,
  EventFilterCondition,
  WebhookStatistics,
  AgentEventData,
  TaskEventData,
  WorkflowEventData,
  SystemEventData,
  EventCategory,
} from './types'
import { WebhookManager } from './webhook-manager'
import { EventDeliveryService } from './event-delivery'

// ============================================================
// Event Dispatcher
// ============================================================

/**
 * Event dispatcher configuration
 */
export interface EventDispatcherConfig {
  enableQueue: boolean
  maxQueueSize: number
  batchSize: number
}

const DEFAULT_DISPATCHER_CONFIG: EventDispatcherConfig = {
  enableQueue: true,
  maxQueueSize: 10000,
  batchSize: 100,
}

/**
 * Event Dispatcher
 *
 * Coordinates event emission and delivery to webhooks
 */
export class EventDispatcher {
  private webhookManager: WebhookManager
  private deliveryService: EventDeliveryService
  private config: EventDispatcherConfig
  private statistics: WebhookStatistics
  private eventQueue: WebhookEventPayload[] = []
  private processingBatch: boolean = false

  constructor(
    webhookManager: WebhookManager,
    deliveryService: EventDeliveryService,
    config?: Partial<EventDispatcherConfig>
  ) {
    this.webhookManager = webhookManager
    this.deliveryService = deliveryService
    this.config = { ...DEFAULT_DISPATCHER_CONFIG, ...config }

    this.statistics = this.initStatistics()
  }

  // ============================================================
  // Event Emission
  // ============================================================

  /**
   * Emit an event to all subscribed webhooks
   *
   * @param type - Event type
   * @param data - Event data
   * @param metadata - Optional metadata
   * @returns Event ID
   */
  async emit(
    type: WebhookEventType,
    data: unknown,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const event: WebhookEventPayload = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      data,
      metadata,
    }

    // Update statistics
    this.updateStatistics(event)

    // Add to queue or dispatch immediately
    if (this.config.enableQueue) {
      this.addToQueue(event)
    } else {
      await this.dispatchEvent(event)
    }

    return event.id
  }

  /**
   * Emit agent event
   */
  async emitAgentEvent(
    type: 'agent.created' | 'agent.updated' | 'agent.deleted',
    data: AgentEventData,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.emit(type, data, metadata)
  }

  /**
   * Emit task event
   */
  async emitTaskEvent(
    type: 'task.created' | 'task.completed' | 'task.failed',
    data: TaskEventData,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.emit(type, data, metadata)
  }

  /**
   * Emit workflow event
   */
  async emitWorkflowEvent(
    type: 'workflow.started' | 'workflow.completed' | 'workflow.failed',
    data: WorkflowEventData,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.emit(type, data, metadata)
  }

  /**
   * Emit system event
   */
  async emitSystemEvent(
    type: 'system.alert' | 'system.error',
    data: SystemEventData,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.emit(type, data, metadata)
  }

  // ============================================================
  // Batch Operations
  // ============================================================

  /**
   * Emit multiple events
   *
   * @param events - Array of events to emit
   * @returns Array of event IDs
   */
  async emitBatch(
    events: Array<{ type: WebhookEventType; data: unknown; metadata?: Record<string, unknown> }>
  ): Promise<string[]> {
    const eventIds: string[] = []

    for (const { type, data, metadata } of events) {
      const id = await this.emit(type, data, metadata)
      eventIds.push(id)
    }

    return eventIds
  }

  // ============================================================
  // Queue Management
  // ============================================================

  /**
   * Add event to queue
   */
  private addToQueue(event: WebhookEventPayload): void {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      console.warn('[Webhook] Event queue full, dropping oldest event')
      this.eventQueue.shift()
    }

    this.eventQueue.push(event)
    this.processBatch()
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch) return
    if (this.eventQueue.length === 0) return

    this.processingBatch = true

    try {
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, this.config.batchSize)

        for (const event of batch) {
          await this.dispatchEvent(event)
        }
      }
    } finally {
      this.processingBatch = false
    }
  }

  // ============================================================
  // Event Dispatching
  // ============================================================

  /**
   * Dispatch event to subscribed webhooks
   */
  private async dispatchEvent(event: WebhookEventPayload): Promise<void> {
    try {
      // Get webhooks subscribed to this event type
      const webhooks = await this.webhookManager.getWebhooksForEvent(event.type)

      if (webhooks.length === 0) {
        return
      }

      // Deliver to all webhooks (parallel)
      await this.deliveryService.deliverToMultiple(event.id, webhooks, event)
    } catch (error) {
      console.error(`[Webhook] Error dispatching event ${event.id}:`, error)
    }
  }

  // ============================================================
  // Event Filtering
  // ============================================================

  /**
   * Check if event matches filter
   */
  matchesFilter(event: WebhookEventPayload, filter: EventFilter): boolean {
    // Check event types
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false
    }

    // Check event categories
    if (filter.eventCategories) {
      const category = event.type.split('.')[0] as EventCategory
      if (!filter.eventCategories.includes(category)) {
        return false
      }
    }

    // Check conditions
    if (filter.conditions) {
      for (const condition of filter.conditions) {
        if (!this.matchesCondition(event, condition)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Check if event matches condition
   */
  private matchesCondition(event: WebhookEventPayload, condition: EventFilterCondition): boolean {
    const value = this.getNestedValue(event, condition.field)
    const conditionValue = condition.value

    switch (condition.operator) {
      case 'eq':
        return value === conditionValue
      case 'ne':
        return value !== conditionValue
      case 'gt':
        return (value as number) > (conditionValue as number)
      case 'gte':
        return (value as number) >= (conditionValue as number)
      case 'lt':
        return (value as number) < (conditionValue as number)
      case 'lte':
        return (value as number) <= (conditionValue as number)
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(value)
      case 'nin':
        return Array.isArray(conditionValue) && !conditionValue.includes(value)
      case 'exists':
        return conditionValue ? value !== undefined : value === undefined
      default:
        return false
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(
    obj: WebhookEventPayload | Record<string, unknown>,
    path: string
  ): unknown {
    const parts = path.split('.')
    let current: unknown = obj

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined
      }
      if (typeof current !== 'object') {
        return undefined
      }
      current = (current as Record<string, unknown>)[part]
    }

    return current
  }

  // ============================================================
  // Statistics
  // ============================================================

  /**
   * Get current statistics
   */
  getStatistics(): WebhookStatistics {
    return { ...this.statistics }
  }

  /**
   * Initialize statistics
   */
  private initStatistics(): WebhookStatistics {
    return {
      totalEvents: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      averageResponseTime: 0,
      eventsByType: {} as Record<WebhookEventType, number>,
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(event: WebhookEventPayload): void {
    this.statistics.totalEvents++
    this.statistics.eventsByType[event.type] = (this.statistics.eventsByType[event.type] || 0) + 1
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = this.initStatistics()
  }

  // ============================================================
  // Utilities
  // ============================================================

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `evt_${timestamp}_${random}`
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.eventQueue = []
  }
}

/**
 * Event Delivery Service
 * v1.12.0 - Webhook Event Notification System
 */

import type {
  WebhookEndpoint,
  WebhookEventPayload,
  WebhookConfig,
  EventDelivery,
  DeliveryAttempt,
  DeliveryStatus,
} from './types';
import { WebhookError } from './types';
import {
  generateSignatureHeaders,
  verifySignature,
} from './signature';

// ============================================================
// Event Delivery Service
// ============================================================

/**
 * Storage interface for event delivery records
 */
export interface DeliveryStorage {
  saveDelivery(delivery: EventDelivery): Promise<void>;
  getDelivery(id: string): Promise<EventDelivery | null>;
  updateDelivery(id: string, updates: Partial<EventDelivery>): Promise<void>;
  saveAttempt(attempt: DeliveryAttempt): Promise<void>;
  getAttempts(deliveryId: string): Promise<DeliveryAttempt[]>;
}

/**
 * In-memory delivery storage
 */
export class InMemoryDeliveryStorage implements DeliveryStorage {
  private deliveries: Map<string, EventDelivery> = new Map();
  private attempts: Map<string, DeliveryAttempt[]> = new Map();

  async saveDelivery(delivery: EventDelivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async getDelivery(id: string): Promise<EventDelivery | null> {
    return this.deliveries.get(id) || null;
  }

  async updateDelivery(id: string, updates: Partial<EventDelivery>): Promise<void> {
    const existing = this.deliveries.get(id);
    if (existing) {
      this.deliveries.set(id, { ...existing, ...updates });
    }
  }

  async saveAttempt(attempt: DeliveryAttempt): Promise<void> {
    const existing = this.attempts.get(attempt.deliveryId) || [];
    existing.push(attempt);
    this.attempts.set(attempt.deliveryId, existing);
  }

  async getAttempts(deliveryId: string): Promise<DeliveryAttempt[]> {
    return this.attempts.get(deliveryId) || [];
  }
}

/**
 * Event Delivery Service
 * 
 * Handles async event delivery with retry logic
 */
export class EventDeliveryService {
  private storage: DeliveryStorage;
  private config: WebhookConfig;
  private activeDeliveries: Set<string> = new Set();
  private deliveryQueue: Array<{
    eventId: string;
    webhook: WebhookEndpoint;
    payload: WebhookEventPayload;
  }> = [];
  private processingQueue: boolean = false;

  constructor(
    storage?: DeliveryStorage,
    config?: Partial<WebhookConfig>
  ) {
    this.storage = storage || new InMemoryDeliveryStorage();
    this.config = {
      maxRetries: 5,
      initialRetryDelay: 1000,
      maxRetryDelay: 60000,
      retryMultiplier: 2,
      requestTimeout: 10000,
      maxConcurrentDeliveries: 10,
      enableEventQueue: true,
      queueMaxSize: 10000,
      ...config,
    };
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Deliver an event to a webhook
   * 
   * @param eventId - Event ID
   * @param webhook - Webhook endpoint
   * @param payload - Event payload
   * @returns Delivery record ID
   */
  async deliverEvent(
    eventId: string,
    webhook: WebhookEndpoint,
    payload: WebhookEventPayload
  ): Promise<string> {
    const deliveryId = this.generateDeliveryId();

    const delivery: EventDelivery = {
      id: deliveryId,
      eventId,
      webhookId: webhook.id,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.storage.saveDelivery(delivery);

    // Add to queue or deliver immediately
    if (this.config.enableEventQueue) {
      this.addToQueue(eventId, webhook, payload);
    } else {
      // Start processing - delivery will be tracked internally
      this.processDelivery(eventId, webhook, payload);
    }

    return deliveryId;
  }

  /**
   * Deliver events to multiple webhooks
   * 
   * @param eventId - Event ID
   * @param webhooks - Array of webhook endpoints
   * @param payload - Event payload
   * @returns Array of delivery IDs
   */
  async deliverToMultiple(
    eventId: string,
    webhooks: WebhookEndpoint[],
    payload: WebhookEventPayload
  ): Promise<string[]> {
    const deliveryIds: string[] = [];

    for (const webhook of webhooks) {
      const id = await this.deliverEvent(eventId, webhook, payload);
      deliveryIds.push(id);
    }

    return deliveryIds;
  }

  // ============================================================
  // Queue Management
  // ============================================================

  /**
   * Add delivery to queue
   */
  private addToQueue(
    eventId: string,
    webhook: WebhookEndpoint,
    payload: WebhookEventPayload
  ): void {
    if (this.deliveryQueue.length >= this.config.queueMaxSize) {
      throw new WebhookError('queue_full', 'Event delivery queue is full');
    }

    this.deliveryQueue.push({ eventId, webhook, payload });
    this.processQueue();
  }

  /**
   * Process delivery queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    if (this.activeDeliveries.size >= this.config.maxConcurrentDeliveries) return;
    if (this.deliveryQueue.length === 0) return;

    this.processingQueue = true;

    try {
      while (
        this.activeDeliveries.size < this.config.maxConcurrentDeliveries &&
        this.deliveryQueue.length > 0
      ) {
        const item = this.deliveryQueue.shift();
        if (item) {
          this.processDelivery(item.eventId, item.webhook, item.payload);
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  // ============================================================
  // Delivery Processing
  // ============================================================

  /**
   * Process a single delivery
   */
  private async processDelivery(
    eventId: string,
    webhook: WebhookEndpoint,
    payload: WebhookEventPayload
  ): Promise<void> {
    // Create delivery record for tracking
    const deliveryId = this.generateDeliveryId();
    const delivery: EventDelivery = {
      id: deliveryId,
      eventId,
      webhookId: webhook.id,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.storage.saveDelivery(delivery);
    this.activeDeliveries.add(deliveryId);

    try {
      await this.attemptDelivery(delivery, webhook, payload);
    } catch (error) {
      console.error(
        `[Webhook] Error processing delivery ${deliveryId}:`,
        error
      );
    } finally {
      this.activeDeliveries.delete(deliveryId);
      
      // Process queue after delivery completes
      if (this.config.enableEventQueue) {
        this.processQueue();
      }
    }
  }

  /**
   * Attempt delivery with retry logic
   */
  private async attemptDelivery(
    delivery: EventDelivery,
    webhook: WebhookEndpoint,
    payload: WebhookEventPayload
  ): Promise<void> {
    const attemptNumber = delivery.attempts + 1;
    const attemptStart = Date.now();

    // Check max attempts
    if (attemptNumber > delivery.maxAttempts) {
      await this.updateDeliveryStatus(delivery.id, 'expired');
      return;
    }

    try {
      // Send webhook request
      const result = await this.sendWebhook(webhook, payload);

      // Record attempt
      const attempt: DeliveryAttempt = {
        id: this.generateAttemptId(),
        deliveryId: delivery.id,
        attemptNumber,
        timestamp: Date.now(),
        success: true,
        responseCode: result.status,
        responseTime: Date.now() - attemptStart,
      };

      await this.storage.saveAttempt(attempt);
      await this.updateDeliveryStatus(delivery.id, 'success', {
        attempts: attemptNumber,
        responseCode: result.status,
        lastAttempt: attempt.timestamp,
      });

      console.log(
        `[Webhook] Successfully delivered event ${payload.type} to ${webhook.url} ` +
          `(attempt ${attemptNumber})`
      );
    } catch (error) {
      // Record failed attempt
      const attempt: DeliveryAttempt = {
        id: this.generateAttemptId(),
        deliveryId: delivery.id,
        attemptNumber,
        timestamp: Date.now(),
        success: false,
        responseTime: Date.now() - attemptStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      await this.storage.saveAttempt(attempt);

      // Check if should retry
      if (attemptNumber < delivery.maxAttempts) {
        const delay = this.calculateRetryDelay(attemptNumber);
        const nextRetry = Date.now() + delay;

        await this.updateDeliveryStatus(delivery.id, 'retrying', {
          attempts: attemptNumber,
          lastAttempt: attempt.timestamp,
          nextRetry,
          error: attempt.error,
        });

        console.warn(
          `[Webhook] Delivery attempt ${attemptNumber} failed for ${webhook.url}, ` +
            `retrying in ${delay}ms`
        );

        // Schedule retry
        setTimeout(async () => {
          const updated = await this.storage.getDelivery(delivery.id);
          if (updated && updated.status === 'retrying') {
            await this.processDelivery(delivery.eventId, webhook, payload);
          }
        }, delay);
      } else {
        await this.updateDeliveryStatus(delivery.id, 'failed', {
          attempts: attemptNumber,
          lastAttempt: attempt.timestamp,
          error: attempt.error,
        });

        console.error(
          `[Webhook] Failed to deliver event ${payload.type} to ${webhook.url} ` +
            `after ${attemptNumber} attempts`
        );
      }
    }
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(
    webhook: WebhookEndpoint,
    payload: WebhookEventPayload
  ): Promise<{ status: number; body?: string }> {
    // Generate signature headers
    const signatureHeaders = generateSignatureHeaders(payload, webhook.secret);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': '7zi-Webhook/v1.12.0',
      'X-Webhook-Id': payload.id,
      'X-Webhook-Timestamp': signatureHeaders.timestamp,
      'X-Webhook-Signature': signatureHeaders.signature,
    };

    // Add custom headers
    if (webhook.headers) {
      Object.assign(headers, webhook.headers);
    }

    // Add nonce if provided
    if (signatureHeaders.nonce) {
      headers['X-Webhook-Nonce'] = signatureHeaders.nonce;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.requestTimeout
    );

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. Body: ${body}`
        );
      }

      return { status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ============================================================
  // Retry Logic
  // ============================================================

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const delay = Math.min(
      this.config.initialRetryDelay *
        Math.pow(this.config.retryMultiplier, attemptNumber - 1),
      this.config.maxRetryDelay
    );

    // Add jitter (±25%)
    const jitter = delay * 0.25;
    return delay - jitter + Math.random() * (2 * jitter);
  }

  // ============================================================
  // Storage Helpers
  // ============================================================

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    updates: Partial<EventDelivery> = {}
  ): Promise<void> {
    await this.storage.updateDelivery(deliveryId, {
      status,
      ...updates,
      updatedAt: Date.now(),
    });
  }

  // ============================================================
  // Utilities
  // ============================================================

  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `del_${timestamp}_${random}`;
  }

  /**
   * Generate unique attempt ID
   */
  private generateAttemptId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `att_${timestamp}_${random}`;
  }
}

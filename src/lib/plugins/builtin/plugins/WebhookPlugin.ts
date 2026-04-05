/**
 * Webhook Plugin
 * Event-driven webhooks with retry and delivery tracking
 */

import {
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginContext,
  PluginHealthStatus,
  PluginMetrics,
  HookHandler,
} from '../../types';

export interface WebhookPluginConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  maxConcurrent: number;
  enableSignature: boolean;
  secretKey?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  headers?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: unknown;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  response?: {
    status: number;
    body: unknown;
  };
  error?: string;
  createdAt: Date;
}

// Input types for execute actions
export interface CreateEndpointInput {
  url: string;
  events: string[];
  headers?: Record<string, string>;
}

export interface UpdateEndpointInput {
  id: string;
  url?: string;
  events?: string[];
  headers?: Record<string, string>;
  enabled?: boolean;
}

export interface DeleteEndpointInput {
  id: string;
}

export interface GetEndpointInput {
  id: string;
}

export interface TriggerInput {
  event: string;
  payload: unknown;
  endpointId?: string;
}

export interface GetDeliveryInput {
  id: string;
}

export interface ListDeliveriesInput {
  endpointId?: string;
  event?: string;
  status?: WebhookDelivery['status'];
  limit?: number;
}

export interface RetryDeliveryInput {
  id: string;
}

export class WebhookPlugin implements Plugin {
  metadata: PluginMetadata = {
    id: '@openclaw/plugin-webhook',
    name: 'Webhook Plugin',
    version: '1.0.0',
    description: 'Event-driven webhooks with retry and delivery tracking',
    category: 'webhook',
    tags: ['webhook', 'events', 'integration', 'http'],
    author: {
      name: 'OpenClaw Team',
      email: 'team@openclaw.com',
    },
    license: 'MIT',
  };

  config: PluginConfig = {
    id: this.metadata.id,
    enabled: true,
    priority: 80,
    config: {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      maxConcurrent: 10,
      enableSignature: true,
    } as WebhookPluginConfig,
  };

  private context?: PluginContext;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private queue: WebhookDelivery[] = [];
  private processing: boolean = false;
  private metrics = {
    sent: 0,
    failed: 0,
    retried: 0,
    endpoints: 0,
  };

  /**
   * Initialize plugin
   */
  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('Webhook plugin initialized');

    // Start delivery processor
    setInterval(() => this.processQueue(), 1000);
  }

  /**
   * Start plugin
   */
  async start(): Promise<void> {
    this.context?.logger.info('Webhook plugin started');
  }

  /**
   * Stop plugin
   */
  async stop(): Promise<void> {
    // Wait for queue to be processed
    while (this.queue.length > 0 && this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.context?.logger.info('Webhook plugin stopped');
  }

  /**
   * Destroy plugin
   */
  async destroy(): Promise<void> {
    this.endpoints.clear();
    this.deliveries.clear();
    this.queue = [];
    this.context?.logger.info('Webhook plugin destroyed');
  }

  /**
   * Register hooks
   */
  registerHooks(registry: HookRegistry): void {
    registry.register('onWebhookReceived', this.handleWebhookReceived.bind(this) as HookHandler);
    registry.register('onEvent', this.handleEvent.bind(this) as HookHandler);
  }

  /**
   * Execute plugin action
   */
  async execute<TInput = unknown, TOutput = unknown>(
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    switch (action) {
      case 'createEndpoint':
        return (await this.createEndpoint(input as CreateEndpointInput)) as TOutput;

      case 'updateEndpoint':
        return (await this.updateEndpoint(input as UpdateEndpointInput)) as TOutput;

      case 'deleteEndpoint':
        return (await this.deleteEndpoint(input as DeleteEndpointInput)) as TOutput;

      case 'getEndpoint':
        return (await this.getEndpoint(input as GetEndpointInput)) as TOutput;

      case 'listEndpoints':
        return (await this.listEndpoints()) as TOutput;

      case 'trigger':
        return (await this.trigger(input as TriggerInput)) as TOutput;

      case 'getDelivery':
        return (await this.getDelivery(input as GetDeliveryInput)) as TOutput;

      case 'listDeliveries':
        return (await this.listDeliversies(input as ListDeliveriesInput)) as TOutput;

      case 'retryDelivery':
        return (await this.retryDelivery(input as RetryDeliveryInput)) as TOutput;

      case 'stats':
        return (await this.stats()) as TOutput;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Create webhook endpoint
   */
  private async createEndpoint(data: {
    url: string;
    events: string[];
    headers?: Record<string, string>;
  }): Promise<WebhookEndpoint> {
    const endpoint: WebhookEndpoint = {
      id: this.generateId(),
      url: data.url,
      events: data.events,
      enabled: true,
      headers: data.headers,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.metrics.endpoints = this.endpoints.size;

    return endpoint;
  }

  /**
   * Update webhook endpoint
   */
  private async updateEndpoint(data: {
    id: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
    headers?: Record<string, string>;
  }): Promise<WebhookEndpoint | undefined> {
    const endpoint = this.endpoints.get(data.id);
    if (!endpoint) {
      return undefined;
    }

    if (data.url !== undefined) endpoint.url = data.url;
    if (data.events !== undefined) endpoint.events = data.events;
    if (data.enabled !== undefined) endpoint.enabled = data.enabled;
    if (data.headers !== undefined) endpoint.headers = data.headers;

    endpoint.updatedAt = new Date();

    return endpoint;
  }

  /**
   * Delete webhook endpoint
   */
  private async deleteEndpoint(data: { id: string }): Promise<{ success: boolean }> {
    const result = this.endpoints.delete(data.id);
    this.metrics.endpoints = this.endpoints.size;
    return { success: result };
  }

  /**
   * Get webhook endpoint
   */
  private async getEndpoint(data: { id: string }): Promise<WebhookEndpoint | undefined> {
    return this.endpoints.get(data.id);
  }

  /**
   * List webhook endpoints
   */
  private async listEndpoints(): Promise<WebhookEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  /**
   * Trigger webhook event
   */
  private async trigger(data: {
    event: string;
    payload: unknown;
  }): Promise<{ deliveries: string[] }> {
    const deliveries: string[] = [];

    // Find matching endpoints
    for (const endpoint of this.endpoints.values()) {
      if (!endpoint.enabled) {
        continue;
      }

      if (!endpoint.events.includes(data.event) && !endpoint.events.includes('*')) {
        continue;
      }

      // Create delivery
      const delivery: WebhookDelivery = {
        id: this.generateId(),
        endpointId: endpoint.id,
        event: data.event,
        payload: data.payload,
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
      };

      this.deliveries.set(delivery.id, delivery);
      this.queue.push(delivery);
      deliveries.push(delivery.id);
    }

    return { deliveries };
  }

  /**
   * Get webhook delivery
   */
  private async getDelivery(data: { id: string }): Promise<WebhookDelivery | undefined> {
    return this.deliveries.get(data.id);
  }

  /**
   * List webhook deliveries
   */
  private async listDeliversies(data: {
    endpointId?: string;
    status?: WebhookDelivery['status'];
    limit?: number;
  }): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.deliveries.values());

    if (data.endpointId) {
      deliveries = deliveries.filter((d) => d.endpointId === data.endpointId);
    }

    if (data.status) {
      deliveries = deliveries.filter((d) => d.status === data.status);
    }

    if (data.limit) {
      deliveries = deliveries.slice(0, data.limit);
    }

    return deliveries;
  }

  /**
   * Retry delivery
   */
  private async retryDelivery(data: { id: string }): Promise<{ success: boolean }> {
    const delivery = this.deliveries.get(data.id);
    if (!delivery) {
      return { success: false };
    }

    delivery.status = 'retrying';
    delivery.nextRetry = new Date();
    this.queue.push(delivery);

    return { success: true };
  }

  /**
   * Get statistics
   */
  private async stats(): Promise<typeof this.metrics> {
    return { ...this.metrics };
  }

  /**
   * Process delivery queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    const config = this.config.config as WebhookPluginConfig;
    this.processing = true;

    try {
      // Process batch
      const batch = this.queue.splice(0, config.maxConcurrent);

      await Promise.all(batch.map((delivery) => this.deliver(delivery)));
    } finally {
      this.processing = false;
    }
  }

  /**
   * Deliver webhook
   */
  private async deliver(delivery: WebhookDelivery): Promise<void> {
    const config = this.config.config as WebhookPluginConfig;
    const endpoint = this.endpoints.get(delivery.endpointId);

    if (!endpoint) {
      delivery.status = 'failed';
      delivery.error = 'Endpoint not found';
      return;
    }

    delivery.attempts++;
    delivery.lastAttempt = new Date();

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.event,
        'X-Webhook-ID': delivery.id,
        'X-Webhook-Timestamp': delivery.createdAt.toISOString(),
        ...endpoint.headers,
      };

      // Add signature
      if (config.enableSignature && config.secretKey) {
        const signature = this.signPayload(delivery.payload, config.secretKey);
        headers['X-Webhook-Signature'] = signature;
      }

      // Send request
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(delivery.payload),
        signal: AbortSignal.timeout(config.timeout),
      });

      if (response.ok) {
        delivery.status = 'success';
        delivery.response = {
          status: response.status,
          body: await response.text(),
        };
        this.metrics.sent++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      delivery.error = (error as Error).message;

      // Retry logic
      if (delivery.attempts < config.maxRetries) {
        delivery.status = 'retrying';
        delivery.nextRetry = new Date(
          Date.now() + config.retryDelay * Math.pow(2, delivery.attempts - 1)
        );

        // Add back to queue after delay
        setTimeout(() => {
          this.queue.push(delivery);
        }, delivery.nextRetry.getTime() - Date.now());

        this.metrics.retried++;
      } else {
        delivery.status = 'failed';
        this.metrics.failed++;
      }
    }
  }

  /**
   * Sign payload
   */
  private signPayload(payload: unknown, secret: string): string {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Handle webhook received hook
   */
  private handleWebhookReceived(context: unknown, input: unknown): void {
    this.trigger({
      event: input.event || 'webhook.received',
      payload: input.payload,
    });
  }

  /**
   * Handle event hook
   */
  private handleEvent(context: unknown, input: unknown): void {
    if (input.event) {
      this.trigger({
        event: input.event,
        payload: input.payload,
      });
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PluginHealthStatus> {
    const config = this.config.config as WebhookPluginConfig;

    return {
      status: 'healthy',
      message: 'Webhook plugin is running',
      timestamp: new Date(),
      checks: {
        queue: {
          status: this.queue.length < 100 ? 'healthy' : 'degraded',
          message: `Queue size: ${this.queue.length}`,
        },
        endpoints: {
          status: 'healthy',
          message: `Active endpoints: ${this.endpoints.size}`,
        },
      },
    };
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<PluginMetrics> {
    return {
      executionCount: this.metrics.sent + this.metrics.failed,
      successCount: this.metrics.sent,
      failureCount: this.metrics.failed,
      memoryUsage: process.memoryUsage().heapUsed,
      custom: { ...this.metrics } as Record<string, number>,
      timestamp: new Date(),
    };
  }
}
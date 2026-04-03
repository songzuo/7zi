/**
 * Webhook Manager
 * v1.12.0 - Webhook Event Notification System
 */

import type {
  WebhookEndpoint,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookConfig,
  DEFAULT_WEBHOOK_CONFIG,
} from './types';
import { WebhookError } from './types';

// ============================================================
// Webhook Manager
// ============================================================

/**
 * Storage interface for webhook endpoints
 */
export interface WebhookStorage {
  get(id: string): Promise<WebhookEndpoint | null>;
  getAll(): Promise<WebhookEndpoint[]>;
  save(endpoint: WebhookEndpoint): Promise<void>;
  delete(id: string): Promise<boolean>;
  findByUrl(url: string): Promise<WebhookEndpoint | null>;
}

/**
 * In-memory storage implementation
 */
export class InMemoryWebhookStorage implements WebhookStorage {
  private endpoints: Map<string, WebhookEndpoint> = new Map();

  async get(id: string): Promise<WebhookEndpoint | null> {
    return this.endpoints.get(id) || null;
  }

  async getAll(): Promise<WebhookEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async save(endpoint: WebhookEndpoint): Promise<void> {
    this.endpoints.set(endpoint.id, endpoint);
  }

  async delete(id: string): Promise<boolean> {
    return this.endpoints.delete(id);
  }

  async findByUrl(url: string): Promise<WebhookEndpoint | null> {
    for (const endpoint of this.endpoints.values()) {
      if (endpoint.url === url) {
        return endpoint;
      }
    }
    return null;
  }
}

/**
 * Webhook Manager
 * 
 * Manages webhook endpoints - create, update, delete, and query
 */
export class WebhookManager {
  private storage: WebhookStorage;
  private config: WebhookConfig;

  constructor(
    storage?: WebhookStorage,
    config?: Partial<WebhookConfig>
  ) {
    this.storage = storage || new InMemoryWebhookStorage();
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
  // Create
  // ============================================================

  /**
   * Create a new webhook endpoint
   * 
   * @param request - Create webhook request
   * @returns The created webhook endpoint
   */
  async createWebhook(request: CreateWebhookRequest): Promise<WebhookEndpoint> {
    // Validate URL
    this.validateUrl(request.url);

    // Validate secret
    this.validateSecret(request.secret);

    // Validate events
    this.validateEvents(request.events);

    // Check for duplicate URL
    const existing = await this.storage.findByUrl(request.url);
    if (existing) {
      throw new WebhookError(
        'invalid_url',
        'Webhook with this URL already exists',
        { url: request.url }
      );
    }

    // Validate IP whitelist if provided
    if (request.ipWhitelist) {
      this.validateIpWhitelist(request.ipWhitelist);
    }

    const now = Date.now();
    const endpoint: WebhookEndpoint = {
      id: this.generateId(),
      url: request.url,
      secret: request.secret,
      events: request.events,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      description: request.description,
      ipWhitelist: request.ipWhitelist,
      headers: request.headers,
      metadata: request.metadata,
    };

    await this.storage.save(endpoint);
    return endpoint;
  }

  // ============================================================
  // Update
  // ============================================================

  /**
   * Update an existing webhook endpoint
   * 
   * @param id - Webhook ID
   * @param request - Update webhook request
   * @returns The updated webhook endpoint
   */
  async updateWebhook(
    id: string,
    request: UpdateWebhookRequest
  ): Promise<WebhookEndpoint> {
    const existing = await this.storage.get(id);
    if (!existing) {
      throw new WebhookError('not_found', 'Webhook not found', { id });
    }

    // Validate URL if provided
    if (request.url) {
      this.validateUrl(request.url);
      
      // Check for duplicate URL (excluding current)
      const duplicate = await this.storage.findByUrl(request.url);
      if (duplicate && duplicate.id !== id) {
        throw new WebhookError(
          'invalid_url',
          'Webhook with this URL already exists',
          { url: request.url }
        );
      }
    }

    // Validate secret if provided
    if (request.secret) {
      this.validateSecret(request.secret);
    }

    // Validate events if provided
    if (request.events) {
      this.validateEvents(request.events);
    }

    // Validate IP whitelist if provided
    if (request.ipWhitelist) {
      this.validateIpWhitelist(request.ipWhitelist);
    }

    const updated: WebhookEndpoint = {
      ...existing,
      ...request,
      updatedAt: Date.now(),
    };

    await this.storage.save(updated);
    return updated;
  }

  // ============================================================
  // Delete
  // ============================================================

  /**
   * Delete a webhook endpoint
   * 
   * @param id - Webhook ID
   * @returns True if deleted, false if not found
   */
  async deleteWebhook(id: string): Promise<boolean> {
    const existing = await this.storage.get(id);
    if (!existing) {
      throw new WebhookError('not_found', 'Webhook not found', { id });
    }

    return this.storage.delete(id);
  }

  // ============================================================
  // Query
  // ============================================================

  /**
   * Get a webhook by ID
   * 
   * @param id - Webhook ID
   * @returns The webhook endpoint or null
   */
  async getWebhook(id: string): Promise<WebhookEndpoint | null> {
    return this.storage.get(id);
  }

  /**
   * Get all webhooks
   * 
   * @returns Array of all webhook endpoints
   */
  async getAllWebhooks(): Promise<WebhookEndpoint[]> {
    return this.storage.getAll();
  }

  /**
   * Get enabled webhooks
   * 
   * @returns Array of enabled webhook endpoints
   */
  async getEnabledWebhooks(): Promise<WebhookEndpoint[]> {
    const all = await this.storage.getAll();
    return all.filter((w) => w.enabled);
  }

  /**
   * Get webhooks for an event type
   * 
   * @param eventType - The event type
   * @returns Array of webhooks subscribed to the event
   */
  async getWebhooksForEvent(eventType: string): Promise<WebhookEndpoint[]> {
    const enabled = await this.getEnabledWebhooks();
    return enabled.filter((w) => w.events.includes(eventType as WebhookEventType));
  }

  // ============================================================
  // Enable/Disable
  // ============================================================

  /**
   * Enable a webhook
   * 
   * @param id - Webhook ID
   * @returns The updated webhook endpoint
   */
  async enableWebhook(id: string): Promise<WebhookEndpoint> {
    return this.updateWebhook(id, { enabled: true });
  }

  /**
   * Disable a webhook
   * 
   * @param id - Webhook ID
   * @returns The updated webhook endpoint
   */
  async disableWebhook(id: string): Promise<WebhookEndpoint> {
    return this.updateWebhook(id, { enabled: false });
  }

  // ============================================================
  // Validation
  // ============================================================

  /**
   * Validate webhook URL
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new WebhookError(
          'invalid_url',
          'URL must use http or https protocol',
          { url }
        );
      }

      // Security: Prevent localhost/internal URLs in production
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname === '::1'
      ) {
        console.warn(
          `[Webhook] Warning: Internal URL detected (${url}). ` +
            'This should not be allowed in production.'
        );
      }
    } catch (error) {
      if (error instanceof WebhookError) throw error;
      
      throw new WebhookError('invalid_url', 'Invalid URL format', { url });
    }
  }

  /**
   * Validate webhook secret
   */
  private validateSecret(secret: string): void {
    if (!secret || secret.length < 8) {
      throw new WebhookError(
        'invalid_secret',
        'Secret must be at least 8 characters long',
        { length: secret?.length || 0 }
      );
    }
  }

  /**
   * Validate events array
   */
  private validateEvents(events: string[]): void {
    if (!events || events.length === 0) {
      throw new WebhookError(
        'invalid_events',
        'At least one event type is required'
      );
    }

    const validEvents = [
      'agent.created',
      'agent.updated',
      'agent.deleted',
      'task.created',
      'task.completed',
      'task.failed',
      'workflow.started',
      'workflow.completed',
      'workflow.failed',
      'system.alert',
      'system.error',
    ];

    const invalid = events.filter((e) => !validEvents.includes(e));
    if (invalid.length > 0) {
      throw new WebhookError(
        'invalid_events',
        'Invalid event types',
        { invalidEvents: invalid }
      );
    }
  }

  /**
   * Validate IP whitelist
   */
  private validateIpWhitelist(ips: string[]): void {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

    for (const ip of ips) {
      if (
        !ipv4Regex.test(ip) &&
        !ipv4CidrRegex.test(ip) &&
        !ipv6Regex.test(ip)
      ) {
        throw new WebhookError(
          'invalid_url',
          'Invalid IP address in whitelist',
          { ip }
        );
      }
    }
  }

  // ============================================================
  // Utilities
  // ============================================================

  /**
   * Generate unique webhook ID
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `wh_${timestamp}_${random}`;
  }
}

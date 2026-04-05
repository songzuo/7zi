/**
 * Webhook Manager Tests
 * v1.12.0 - Webhook Event Notification System
 */

import { WebhookManager, InMemoryWebhookStorage } from './webhook-manager';
import { WebhookError } from './types';
import type { WebhookEndpoint, CreateWebhookRequest } from './types';

describe('WebhookManager', () => {
  let manager: WebhookManager;

  beforeEach(() => {
    manager = new WebhookManager();
  });

  const createValidRequest = (overrides: Partial<CreateWebhookRequest> = {}): CreateWebhookRequest => ({
    url: 'https://example.com/webhook',
    secret: 'test-secret-12345',
    events: ['agent.created', 'task.completed'],
    ...overrides,
  });

  describe('createWebhook', () => {
    it('should create a webhook with valid data', async () => {
      const request = createValidRequest();
      const webhook = await manager.createWebhook(request);

      expect(webhook.id).toBeDefined();
      expect(webhook.id).toMatch(/^wh_/);
      expect(webhook.url).toBe(request.url);
      expect(webhook.secret).toBe(request.secret);
      expect(webhook.events).toEqual(request.events);
      expect(webhook.enabled).toBe(true);
      expect(webhook.createdAt).toBeDefined();
      expect(webhook.updatedAt).toBeDefined();
    });

    it('should create webhook with optional fields', async () => {
      const request = createValidRequest({
        description: 'Test webhook',
        ipWhitelist: ['192.168.1.1', '10.0.0.0/24'],
        headers: { 'X-Custom': 'value' },
        metadata: { owner: 'team-a' },
      });

      const webhook = await manager.createWebhook(request);

      expect(webhook.description).toBe('Test webhook');
      expect(webhook.ipWhitelist).toEqual(['192.168.1.1', '10.0.0.0/24']);
      expect(webhook.headers).toEqual({ 'X-Custom': 'value' });
      expect(webhook.metadata).toEqual({ owner: 'team-a' });
    });

    it('should reject invalid URL', async () => {
      const request = createValidRequest({ url: 'invalid-url' });

      await expect(manager.createWebhook(request)).rejects.toThrow(WebhookError);
    });

    it('should reject non-HTTP URL', async () => {
      const request = createValidRequest({ url: 'ftp://example.com/webhook' });

      await expect(manager.createWebhook(request)).rejects.toThrow('http or https protocol');
    });

    it('should reject short secret', async () => {
      const request = createValidRequest({ secret: 'short' });

      await expect(manager.createWebhook(request)).rejects.toThrow('at least 8 characters');
    });

    it('should reject empty events', async () => {
      const request = createValidRequest({ events: [] });

      await expect(manager.createWebhook(request)).rejects.toThrow('At least one event');
    });

    it('should reject invalid event types', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const request = createValidRequest({ events: ['invalid.event' as any] });

      await expect(manager.createWebhook(request)).rejects.toThrow('Invalid event types');
    });

    it('should reject duplicate URL', async () => {
      const request = createValidRequest();
      await manager.createWebhook(request);

      await expect(manager.createWebhook(request)).rejects.toThrow('already exists');
    });

    it('should reject invalid IP whitelist', async () => {
      const request = createValidRequest({ ipWhitelist: ['invalid-ip'] });

      await expect(manager.createWebhook(request)).rejects.toThrow('Invalid IP address');
    });
  });

  describe('updateWebhook', () => {
    let existingWebhook: WebhookEndpoint;

    beforeEach(async () => {
      existingWebhook = await manager.createWebhook(createValidRequest());
    });

    it('should update webhook URL', async () => {
      const updated = await manager.updateWebhook(existingWebhook.id, {
        url: 'https://newurl.com/webhook',
      });

      expect(updated.url).toBe('https://newurl.com/webhook');
      expect(updated.updatedAt).toBeGreaterThanOrEqual(existingWebhook.updatedAt);
    });

    it('should update webhook events', async () => {
      const newEvents = ['workflow.started', 'workflow.completed'];
      const updated = await manager.updateWebhook(existingWebhook.id, {
        events: newEvents,
      });

      expect(updated.events).toEqual(newEvents);
    });

    it('should enable/disable webhook', async () => {
      const disabled = await manager.updateWebhook(existingWebhook.id, {
        enabled: false,
      });
      expect(disabled.enabled).toBe(false);

      const enabled = await manager.updateWebhook(existingWebhook.id, {
        enabled: true,
      });
      expect(enabled.enabled).toBe(true);
    });

    it('should reject update for non-existent webhook', async () => {
      await expect(
        manager.updateWebhook('non-existent', { enabled: false })
      ).rejects.toThrow('not found');
    });

    it('should reject update with duplicate URL', async () => {
      const another = await manager.createWebhook(
        createValidRequest({ url: 'https://another.com/webhook' })
      );

      await expect(
        manager.updateWebhook(another.id, { url: existingWebhook.url })
      ).rejects.toThrow('already exists');
    });
  });

  describe('deleteWebhook', () => {
    it('should delete existing webhook', async () => {
      const webhook = await manager.createWebhook(createValidRequest());
      const result = await manager.deleteWebhook(webhook.id);

      expect(result).toBe(true);

      const found = await manager.getWebhook(webhook.id);
      expect(found).toBeNull();
    });

    it('should reject delete for non-existent webhook', async () => {
      await expect(manager.deleteWebhook('non-existent')).rejects.toThrow('not found');
    });
  });

  describe('getWebhook', () => {
    it('should return webhook by ID', async () => {
      const created = await manager.createWebhook(createValidRequest());
      const found = await manager.getWebhook(created.id);

      expect(found).toEqual(created);
    });

    it('should return null for non-existent ID', async () => {
      const found = await manager.getWebhook('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getAllWebhooks', () => {
    it('should return all webhooks', async () => {
      await manager.createWebhook(createValidRequest({ url: 'https://one.com/webhook' }));
      await manager.createWebhook(createValidRequest({ url: 'https://two.com/webhook' }));

      const all = await manager.getAllWebhooks();

      expect(all).toHaveLength(2);
    });
  });

  describe('getEnabledWebhooks', () => {
    it('should return only enabled webhooks', async () => {
      const webhook1 = await manager.createWebhook(
        createValidRequest({ url: 'https://one.com/webhook' })
      );
      const webhook2 = await manager.createWebhook(
        createValidRequest({ url: 'https://two.com/webhook' })
      );

      await manager.updateWebhook(webhook2.id, { enabled: false });

      const enabled = await manager.getEnabledWebhooks();

      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe(webhook1.id);
    });
  });

  describe('getWebhooksForEvent', () => {
    it('should return webhooks subscribed to event', async () => {
      await manager.createWebhook(
        createValidRequest({
          url: 'https://one.com/webhook',
          events: ['agent.created', 'agent.updated'],
        })
      );
      await manager.createWebhook(
        createValidRequest({
          url: 'https://two.com/webhook',
          events: ['task.created'],
        })
      );

      const forAgentCreated = await manager.getWebhooksForEvent('agent.created');
      expect(forAgentCreated).toHaveLength(1);

      const forTaskCreated = await manager.getWebhooksForEvent('task.created');
      expect(forTaskCreated).toHaveLength(1);

      const forSystemAlert = await manager.getWebhooksForEvent('system.alert');
      expect(forSystemAlert).toHaveLength(0);
    });
  });

  describe('enableWebhook / disableWebhook', () => {
    it('should enable webhook', async () => {
      const webhook = await manager.createWebhook(createValidRequest());
      await manager.updateWebhook(webhook.id, { enabled: false });

      const enabled = await manager.enableWebhook(webhook.id);
      expect(enabled.enabled).toBe(true);
    });

    it('should disable webhook', async () => {
      const webhook = await manager.createWebhook(createValidRequest());

      const disabled = await manager.disableWebhook(webhook.id);
      expect(disabled.enabled).toBe(false);
    });
  });
});

/**
 * SSE Implementation Tests
 * Basic tests for SSE utilities and stream manager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSSEHeaders,
  formatSSEEvent,
  parseSSEMessage,
  isValidSSEConnection,
  getClientIP,
} from '@/lib/sse/utils';
import {
  SSEStreamManager,
  getGlobalStreamManager,
  resetGlobalStreamManager,
} from '@/lib/sse/stream';

describe('SSE Utils', () => {
  it('should return correct SSE headers', () => {
    const headers = getSSEHeaders();

    expect(headers).toEqual({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
  });

  it('should format SSE event correctly', () => {
    const data = { message: 'Hello' };
    const event = formatSSEEvent(data, 'message', '1');

    expect(event).toContain('id: 1');
    expect(event).toContain('event: message');
    expect(event).toContain('data: {"message":"Hello"}');
    expect(event).toMatch(/\n\n$/);
  });

  it('should parse SSE message correctly', () => {
    const message = 'event: message\ndata: {"test":"value"}\nid: 123\n\n';
    const parsed = parseSSEMessage(message);

    expect(parsed).not.toBeNull();
    expect(parsed?.event).toBe('message');
    expect(parsed?.id).toBe('123');
    expect(parsed?.data).toEqual({ test: 'value' });
  });

  it('should validate SSE connection', () => {
    const validRequest = new Request('http://localhost:3000/api/stream', {
      headers: { Accept: 'text/event-stream' },
    });

    const invalidRequest = new Request('http://localhost:3000/api/stream', {
      headers: { Accept: 'application/json' },
    });

    expect(isValidSSEConnection(validRequest)).toBe(true);
    expect(isValidSSEConnection(invalidRequest)).toBe(false);
  });

  it('should extract client IP from forwarded header', () => {
    const request = new Request('http://localhost:3000/api/stream', {
      headers: { 'X-Forwarded-For': '192.168.1.1, 10.0.0.1' },
    });

    const ip = getClientIP(request);
    expect(ip).toBe('192.168.1.1');
  });
});

describe('SSE Stream Manager', () => {
  let manager: SSEStreamManager;
  let mockController: ReadableStreamDefaultController;

  beforeEach(() => {
    resetGlobalStreamManager();
    manager = new SSEStreamManager();
    mockController = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;
  });

  afterEach(() => {
    resetGlobalStreamManager();
  });

  it('should add and remove clients', () => {
    const clientId = 'client-1';
    const client = manager.addClient(clientId, mockController);

    expect(client.id).toBe(clientId);
    expect(manager.getClientCount()).toBe(1);

    manager.removeClient(clientId);
    expect(manager.getClientCount()).toBe(0);
  });

  it('should send event to specific client', () => {
    const clientId = 'client-1';
    manager.addClient(clientId, mockController);

    const data = { message: 'Test' };
    const result = manager.sendToClient(clientId, data);

    expect(result).toBe(true);
    expect(mockController.enqueue).toHaveBeenCalled();
  });

  it('should broadcast event to all clients', () => {
    const mockController2 = {
      enqueue: vi.fn(),
      close: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    manager.addClient('client-1', mockController);
    manager.addClient('client-2', mockController2);

    const data = { message: 'Broadcast' };
    const count = manager.broadcast(data);

    expect(count).toBe(2);
    expect(mockController.enqueue).toHaveBeenCalled();
    expect(mockController2.enqueue).toHaveBeenCalled();
  });

  it('should track event history', () => {
    const clientId = 'client-1';
    manager.addClient(clientId, mockController);

    const data = { message: 'Test' };
    manager.sendToClient(clientId, data, 'test-event', '1');

    const history = manager.getEventHistory(clientId);
    expect(history).toHaveLength(1);
    expect(history[0]).toContain('event: test-event');
  });

  it('should limit event history size', () => {
    const clientId = 'client-1';
    manager.addClient(clientId, mockController);

    // Send more events than maxQueueSize
    for (let i = 0; i < 150; i++) {
      manager.sendToClient(clientId, { index: i });
    }

    const history = manager.getEventHistory(clientId);
    expect(history.length).toBeLessThanOrEqual(100);
  });
});

describe('Global Stream Manager', () => {
  afterEach(() => {
    resetGlobalStreamManager();
  });

  it('should return singleton instance', () => {
    const manager1 = getGlobalStreamManager();
    const manager2 = getGlobalStreamManager();

    expect(manager1).toBe(manager2);
  });

  it('should reset global manager', () => {
    const manager1 = getGlobalStreamManager();
    resetGlobalStreamManager();
    const manager2 = getGlobalStreamManager();

    expect(manager1).not.toBe(manager2);
  });
});

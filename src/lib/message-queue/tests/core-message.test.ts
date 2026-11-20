/**
 * Core Message Tests - 消息核心类测试
 * 覆盖 Message 的创建、状态流转、时间逻辑与序列化
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Message } from '../core/message';
import {
  MessageStatus,
  MessageQueueError,
  QueueNotFoundError,
  ConsumerError,
  TransactionError
} from '../types';

describe('Message', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a pending message with default values', () => {
      const msg = new Message('orders', { id: 1 });

      expect(msg.id).toMatch(/^msg_/);
      expect(msg.queueName).toBe('orders');
      expect(msg.data).toEqual({ id: 1 });
      expect(msg.status).toBe(MessageStatus.PENDING);
      expect(msg.retryCount).toBe(0);
      expect(msg.maxRetries).toBe(3);
      expect(msg.priority).toBeUndefined();
      expect(msg.delay).toBeUndefined();
      expect(msg.expiresAt).toBeUndefined();
      expect(msg.metadata).toBeUndefined();
    });

    it('should apply priority, delay, ttl, maxRetries and metadata options', () => {
      const before = Date.now();
      const msg = new Message('orders', 'payload', {
        priority: 9,
        delay: 500,
        ttl: 1000,
        maxRetries: 7,
        metadata: { source: 'test' }
      });

      expect(msg.priority).toBe(9);
      expect(msg.delay).toBe(500);
      expect(msg.maxRetries).toBe(7);
      expect(msg.metadata).toEqual({ source: 'test' });
      expect(msg.expiresAt).toBeGreaterThanOrEqual(before + 1000);
      expect(msg.expiresAt).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('should generate unique ids for consecutive messages', () => {
      const a = new Message('q', 1);
      const b = new Message('q', 2);

      expect(a.id).not.toBe(b.id);
    });
  });

  describe('expiration', () => {
    it('should not report expired when no ttl was provided', () => {
      const msg = new Message('q', 'x');
      expect(msg.isExpired()).toBe(false);
    });

    it('should report expired after the ttl elapsed', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const msg = new Message('q', 'x', { ttl: 1000 });

      expect(msg.isExpired()).toBe(false);

      vi.advanceTimersByTime(1001);

      expect(msg.isExpired()).toBe(true);
    });
  });

  describe('delay handling', () => {
    it('should not need delay when no delay was provided', () => {
      const msg = new Message('q', 'x');

      expect(msg.needsDelay()).toBe(false);
      expect(msg.getDelayRemaining()).toBe(0);
    });

    it('should need delay until the delay window elapsed', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const msg = new Message('q', 'x', { delay: 2000 });

      expect(msg.needsDelay()).toBe(true);
      expect(msg.getDelayRemaining()).toBe(2000);

      vi.advanceTimersByTime(500);

      expect(msg.needsDelay()).toBe(true);
      expect(msg.getDelayRemaining()).toBe(1500);
    });

    it('should report zero remaining delay once the window elapsed', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const msg = new Message('q', 'x', { delay: 1000 });
      vi.advanceTimersByTime(1500);

      expect(msg.needsDelay()).toBe(false);
      expect(msg.getDelayRemaining()).toBe(0);
    });
  });

  describe('retry capability', () => {
    it('should allow retries while retryCount is below maxRetries', () => {
      const msg = new Message('q', 'x', { maxRetries: 2 });

      expect(msg.canRetry()).toBe(true);

      msg.markRetrying();
      expect(msg.retryCount).toBe(1);
      expect(msg.canRetry()).toBe(true);

      msg.markRetrying();
      expect(msg.retryCount).toBe(2);
      expect(msg.canRetry()).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should mark processing with consumer id and start timestamp', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const msg = new Message('q', 'x');
      msg.markProcessing('consumer-1');

      expect(msg.status).toBe(MessageStatus.PROCESSING);
      expect(msg.consumerId).toBe('consumer-1');
      expect(msg.processingStartedAt).toBe(Date.now());
    });

    it('should clear consumer and timing info on acknowledge', () => {
      const msg = new Message('q', 'x');
      msg.markProcessing('consumer-1');
      msg.markAcknowledged();

      expect(msg.status).toBe(MessageStatus.ACKNOWLEDGED);
      expect(msg.consumerId).toBeUndefined();
      expect(msg.processingStartedAt).toBeUndefined();
    });

    it('should clear consumer and timing info on reject', () => {
      const msg = new Message('q', 'x');
      msg.markProcessing('consumer-1');
      msg.markRejected();

      expect(msg.status).toBe(MessageStatus.REJECTED);
      expect(msg.consumerId).toBeUndefined();
      expect(msg.processingStartedAt).toBeUndefined();
    });

    it('should increment retry count and reset processing info on retry', () => {
      const msg = new Message('q', 'x');
      msg.markProcessing('consumer-1');
      msg.markRetrying();

      expect(msg.status).toBe(MessageStatus.RETRYING);
      expect(msg.retryCount).toBe(1);
      expect(msg.consumerId).toBeUndefined();
      expect(msg.processingStartedAt).toBeUndefined();
    });

    it('should mark dead letter and reset processing info', () => {
      const msg = new Message('q', 'x');
      msg.markProcessing('consumer-1');
      msg.markDeadLetter();

      expect(msg.status).toBe(MessageStatus.DEAD_LETTER);
      expect(msg.consumerId).toBeUndefined();
      expect(msg.processingStartedAt).toBeUndefined();
    });
  });

  describe('processing duration', () => {
    it('should return null when the message was never processed', () => {
      const msg = new Message('q', 'x');
      expect(msg.getProcessingDuration()).toBeNull();
    });

    it('should return the elapsed time since processing started', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const msg = new Message('q', 'x');
      msg.markProcessing('consumer-1');

      vi.advanceTimersByTime(250);

      expect(msg.getProcessingDuration()).toBe(250);
    });
  });

  describe('serialization', () => {
    it('should expose all fields through toJSON', () => {
      const msg = new Message('orders', { id: 7 }, {
        priority: 4,
        delay: 100,
        ttl: 5000,
        maxRetries: 2,
        metadata: { k: 'v' }
      });
      msg.markProcessing('consumer-9');

      const json = msg.toJSON();

      expect(json.id).toBe(msg.id);
      expect(json.queueName).toBe('orders');
      expect(json.data).toEqual({ id: 7 });
      expect(json.status).toBe(MessageStatus.PROCESSING);
      expect(json.priority).toBe(4);
      expect(json.delay).toBe(100);
      expect(json.createdAt).toBe(msg.createdAt);
      expect(json.expiresAt).toBe(msg.expiresAt);
      expect(json.retryCount).toBe(0);
      expect(json.maxRetries).toBe(2);
      expect(json.consumerId).toBe('consumer-9');
      expect(json.processingStartedAt).toBe(msg.processingStartedAt);
      expect(json.metadata).toEqual({ k: 'v' });
    });

    it('should rebuild an equivalent message through fromJSON', () => {
      const original = new Message('orders', { id: 7 }, {
        priority: 6,
        delay: 300,
        ttl: 5000,
        maxRetries: 4,
        metadata: { k: 'v' }
      });
      original.markProcessing('consumer-9');
      original.markRetrying();

      const restored = Message.fromJSON(original.toJSON());

      expect(restored.id).toBe(original.id);
      expect(restored.queueName).toBe('orders');
      expect(restored.data).toEqual({ id: 7 });
      expect(restored.status).toBe(MessageStatus.RETRYING);
      expect(restored.priority).toBe(6);
      expect(restored.delay).toBe(300);
      expect(restored.createdAt).toBe(original.createdAt);
      expect(restored.expiresAt).toBe(original.expiresAt);
      expect(restored.retryCount).toBe(1);
      expect(restored.maxRetries).toBe(4);
      expect(restored.metadata).toEqual({ k: 'v' });
    });
  });
});

describe('MessageQueue error types', () => {
  it('should expose code and details on MessageQueueError', () => {
    const err = new MessageQueueError('boom', 'E_BOOM', { a: 1 });

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('MessageQueueError');
    expect(err.message).toBe('boom');
    expect(err.code).toBe('E_BOOM');
    expect(err.details).toEqual({ a: 1 });
  });

  it('should build a QueueNotFoundError with the queue name', () => {
    const err = new QueueNotFoundError('missing');

    expect(err).toBeInstanceOf(MessageQueueError);
    expect(err.name).toBe('QueueNotFoundError');
    expect(err.code).toBe('QUEUE_NOT_FOUND');
    expect(err.message).toBe('Queue not found: missing');
    expect(err.details).toEqual({ queueName: 'missing' });
  });

  it('should build a ConsumerError with the consumer id', () => {
    const err = new ConsumerError('bad handler', 'consumer-1', { code: 5 });

    expect(err).toBeInstanceOf(MessageQueueError);
    expect(err.name).toBe('ConsumerError');
    expect(err.code).toBe('CONSUMER_ERROR');
    expect(err.consumerId).toBe('consumer-1');
    expect(err.details).toEqual({ consumerId: 'consumer-1', code: 5 });
  });

  it('should build a TransactionError with the transaction id', () => {
    const err = new TransactionError('commit failed', 'txn-1', { code: 9 });

    expect(err).toBeInstanceOf(MessageQueueError);
    expect(err.name).toBe('TransactionError');
    expect(err.code).toBe('TRANSACTION_ERROR');
    expect(err.transactionId).toBe('txn-1');
    expect(err.details).toEqual({ transactionId: 'txn-1', code: 9 });
  });
});

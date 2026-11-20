/**
 * Queue Tests - 队列实现测试
 * 覆盖 Queue 基类、普通队列、优先级队列、延迟队列与死信队列
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NormalQueue } from '../queues/normal-queue';
import { PriorityQueue } from '../queues/priority-queue';
import { DelayQueue } from '../queues/delay-queue';
import { DeadLetterQueue } from '../queues/dead-letter-queue';
import { MessageStatus, QueueType, type IMessage } from '../types';

describe('Queue base behaviour (via NormalQueue)', () => {
  let queue: NormalQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'base-queue', type: QueueType.NORMAL });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
    vi.useRealTimers();
  });

  it('should expose its name and type', () => {
    expect(queue.name).toBe('base-queue');
    expect(queue.type).toBe(QueueType.NORMAL);
  });

  it('should reject publish before initialization', async () => {
    const fresh = new NormalQueue({ name: 'uninit', type: QueueType.NORMAL });

    await expect(fresh.publish('x')).rejects.toThrow('Queue uninit is not initialized');
  });

  it('should reject consume before initialization', async () => {
    const fresh = new NormalQueue({ name: 'uninit', type: QueueType.NORMAL });

    await expect(fresh.consume()).rejects.toThrow('Queue uninit is not initialized');
  });

  it('should enforce the configured maxSize capacity', async () => {
    const limited = new NormalQueue({
      name: 'limited',
      type: QueueType.NORMAL,
      maxSize: 2
    });
    await limited.initialize();

    await limited.publish('one');
    await limited.publish('two');

    await expect(limited.publish('three')).rejects.toThrow('Queue limited is full (max: 2)');
    expect(limited.size()).toBe(2);
  });

  it('should throw when acknowledging an unknown message', async () => {
    await expect(queue.acknowledge('does-not-exist')).rejects.toThrow(
      'Message not found: does-not-exist'
    );
  });

  it('should throw when rejecting an unknown message', async () => {
    await expect(queue.reject('does-not-exist')).rejects.toThrow(
      'Message not found: does-not-exist'
    );
  });

  it('should remove a message from the queue after acknowledge', async () => {
    const msg = await queue.publish('payload');
    expect(queue.size()).toBe(1);

    await queue.acknowledge(msg.id);

    expect(queue.size()).toBe(0);
    expect(queue.getMessage(msg.id)).toBeNull();
    expect(queue.getAllMessages()).toHaveLength(0);
  });

  it('should keep the message in the queue when rejected with requeue', async () => {
    const msg = await queue.publish('payload');

    await queue.reject(msg.id, true);

    const stored = queue.getMessage(msg.id);
    expect(stored).not.toBeNull();
    expect(stored!.status).toBe(MessageStatus.RETRYING);
    expect(stored!.retryCount).toBe(1);
    expect(queue.size()).toBe(1);
  });

  it('should remove the message when rejected without requeue', async () => {
    const msg = await queue.publish('payload');

    await queue.reject(msg.id, false);

    expect(queue.getMessage(msg.id)).toBeNull();
    expect(queue.size()).toBe(0);
  });

  it('should not requeue once the retry budget is exhausted', async () => {
    const msg = await queue.publish('payload', { maxRetries: 1 });

    await queue.reject(msg.id, true);
    expect(queue.getMessage(msg.id)).not.toBeNull();

    await queue.reject(msg.id, true);

    expect(queue.getMessage(msg.id)).toBeNull();
    expect(queue.size()).toBe(0);
  });

  it('should clear every message and reset counters', async () => {
    await queue.publish('a');
    await queue.publish('b');
    expect(queue.size()).toBe(2);

    await queue.clear();

    expect(queue.size()).toBe(0);
    expect(queue.getAllMessages()).toHaveLength(0);

    const stats = queue.getStats();
    expect(stats.totalMessages).toBe(0);
    expect(stats.pendingMessages).toBe(0);
  });

  it('should track produced and acknowledged counters in the stats', async () => {
    await queue.publish('a');
    await queue.publish('b');

    let stats = queue.getStats();
    expect(stats.totalMessages).toBe(2);
    expect(stats.pendingMessages).toBe(2);

    const consumed = await queue.consume('consumer-1');
    expect(consumed).not.toBeNull();
    expect(consumed!.status).toBe(MessageStatus.PROCESSING);
    expect(consumed!.consumerId).toBe('consumer-1');

    await queue.acknowledge(consumed!.id);

    stats = queue.getStats();
    expect(stats.acknowledgedMessages).toBe(1);
    expect(stats.pendingMessages).toBe(1);
  });

  it('should return a snapshot from getStats that does not mutate internal state', async () => {
    await queue.publish('a');

    const snapshot = queue.getStats();
    snapshot.totalMessages = 999;

    expect(queue.getStats().totalMessages).toBe(1);
  });

  it('should clear its messages on close', async () => {
    await queue.publish('a');

    await queue.close();

    expect(queue.size()).toBe(0);
  });
});

describe('NormalQueue', () => {
  let queue: NormalQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'fifo', type: QueueType.NORMAL });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
    vi.useRealTimers();
  });

  it('should deliver messages in FIFO order', async () => {
    await queue.publish('first');
    await queue.publish('second');
    await queue.publish('third');

    const first = await queue.consume();
    const second = await queue.consume();
    const third = await queue.consume();

    expect(first!.data).toBe('first');
    expect(second!.data).toBe('second');
    expect(third!.data).toBe('third');
  });

  it('should return null when the queue is empty', async () => {
    expect(await queue.consume()).toBeNull();
  });

  it('should drop expired messages instead of delivering them', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('stale', { ttl: 100 });

    vi.advanceTimersByTime(200);

    expect(await queue.consume()).toBeNull();
    expect(queue.size()).toBe(0);
  });

  it('should skip messages that are still delayed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('later', { delay: 1000 });

    expect(await queue.consume()).toBeNull();

    vi.advanceTimersByTime(1500);

    const msg = await queue.consume();
    expect(msg).not.toBeNull();
    expect(msg!.data).toBe('later');
  });
});

describe('PriorityQueue', () => {
  let queue: PriorityQueue;

  beforeEach(async () => {
    queue = new PriorityQueue({ name: 'prio', type: QueueType.PRIORITY });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should deliver the highest priority message first', async () => {
    await queue.publish('low', { priority: 1 });
    await queue.publish('high', { priority: 10 });
    await queue.publish('mid', { priority: 5 });

    const first = await queue.consume();
    const second = await queue.consume();
    const third = await queue.consume();

    expect(first!.data).toBe('high');
    expect(second!.data).toBe('mid');
    expect(third!.data).toBe('low');
  });

  it('should default the priority to 5 when not provided', async () => {
    const msg = await queue.publish('default');

    expect(msg.priority).toBe(5);
  });

  it('should treat missing priorities as 5 during ordering', async () => {
    await queue.publish('explicit', { priority: 3 });
    await queue.publish('implicit');

    const first = await queue.consume();
    const second = await queue.consume();

    expect(first!.data).toBe('implicit');
    expect(second!.data).toBe('explicit');
  });

  it('should return null when the queue is empty', async () => {
    expect(await queue.consume()).toBeNull();
  });

  it('should skip expired high priority messages', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('expired', { priority: 10, ttl: 100 });
    await queue.publish('alive', { priority: 1 });

    vi.advanceTimersByTime(200);

    const msg = await queue.consume();
    expect(msg).not.toBeNull();
    expect(msg!.data).toBe('alive');
  });
});

describe('DelayQueue', () => {
  let queue: DelayQueue;

  beforeEach(async () => {
    queue = new DelayQueue({ name: 'delayed', type: QueueType.DELAY });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
    vi.useRealTimers();
  });

  it('should not deliver a message before its delay elapsed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('later', { delay: 1000 });

    expect(await queue.consume()).toBeNull();
    expect(queue.getDelayedCount()).toBe(1);
    expect(queue.getReadyCount()).toBe(0);
  });

  it('should deliver a message once its delay elapsed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('later', { delay: 1000 });

    vi.advanceTimersByTime(1000);

    const msg = await queue.consume();
    expect(msg).not.toBeNull();
    expect(msg!.data).toBe('later');
    expect(queue.getDelayedCount()).toBe(0);
  });

  it('should deliver messages without delay immediately', async () => {
    await queue.publish('now');

    expect(queue.getReadyCount()).toBe(1);
    const msg = await queue.consume();
    expect(msg).not.toBeNull();
    expect(msg!.data).toBe('now');
  });

  it('should count delayed and ready messages separately', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('delayed', { delay: 5000 });
    await queue.publish('ready');

    expect(queue.getDelayedCount()).toBe(1);
    expect(queue.getReadyCount()).toBe(1);
  });

  it('should clear pending timers on close', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    await queue.publish('later', { delay: 1000 });
    await queue.close();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('DeadLetterQueue', () => {
  let queue: DeadLetterQueue;

  const buildMessage = (overrides: Partial<IMessage> = {}): IMessage => ({
    id: 'msg_dlq_1',
    queueName: 'source-queue',
    data: { payload: true },
    status: MessageStatus.PROCESSING,
    createdAt: 1000,
    retryCount: 3,
    maxRetries: 3,
    ...overrides
  });

  beforeEach(async () => {
    queue = new DeadLetterQueue({ name: 'dlq', type: QueueType.DEAD_LETTER });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should store a dead lettered message with its failure metadata', async () => {
    await queue.addDeadLetter(buildMessage(), 'source-queue', 'handler exploded');

    const details = queue.getDeadLetterDetails('msg_dlq_1');

    expect(details.message).not.toBeNull();
    expect(details.message!.status).toBe(MessageStatus.DEAD_LETTER);
    expect(details.originalQueue).toBe('source-queue');
    expect(details.reason).toBe('handler exploded');
    expect(details.failedAt).toBeGreaterThan(0);
  });

  it('should count dead lettered messages in the stats', async () => {
    await queue.addDeadLetter(buildMessage(), 'source-queue', 'reason');

    const stats = queue.getStats();

    expect(stats.deadLetterMessages).toBe(1);
    expect(stats.totalMessages).toBe(1);
  });

  it('should refuse direct publishing', async () => {
    await expect(queue.publish('nope')).rejects.toThrow(
      'Direct publishing to dead letter queue is not recommended'
    );
  });

  it('should remove the message and its metadata on retryMessage', async () => {
    await queue.addDeadLetter(buildMessage(), 'source-queue', 'reason');

    await queue.retryMessage('msg_dlq_1', 'source-queue');

    expect(queue.getMessage('msg_dlq_1')).toBeNull();
    expect(queue.getFailureReason('msg_dlq_1')).toBeUndefined();
    expect(queue.getOriginalQueue('msg_dlq_1')).toBeUndefined();
    expect(queue.getFailureTime('msg_dlq_1')).toBeUndefined();
  });

  it('should throw when retrying an unknown message', async () => {
    await expect(queue.retryMessage('missing', 'source-queue')).rejects.toThrow(
      'Message not found: missing'
    );
  });

  it('should make dead lettered messages consumable for manual handling', async () => {
    await queue.addDeadLetter(buildMessage(), 'source-queue', 'reason');

    const msg = await queue.consume('operator-1');

    expect(msg).not.toBeNull();
    expect(msg!.id).toBe('msg_dlq_1');
    expect(msg!.status).toBe(MessageStatus.PROCESSING);
    expect(msg!.consumerId).toBe('operator-1');
  });

  it('should clear failure metadata when the queue is cleared', async () => {
    await queue.addDeadLetter(buildMessage(), 'source-queue', 'reason');

    await queue.clear();

    expect(queue.getFailureReason('msg_dlq_1')).toBeUndefined();
    expect(queue.size()).toBe(0);
  });
});

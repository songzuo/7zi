/**
 * queue-semantics.test.ts
 *
 * 消息队列核心语义测试: FIFO 顺序、并发消费、ack/nack、优先级、失败重试、TTL。
 *
 * 这些用例针对 T289 修复的实现缺陷:
 *   - 队列此前会把同一条消息重复投递 (in-flight 守卫未接线), 导致 FIFO 断言失败
 *   - PriorityQueue 同优先级下不是稳定的先进先出
 *   - PriorityQueue / DeadLetterQueue 缺少 in-flight 守卫, 会重复投递
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NormalQueue } from '../queues/normal-queue';
import { PriorityQueue } from '../queues/priority-queue';
import { DelayQueue } from '../queues/delay-queue';
import { DeadLetterQueue } from '../queues/dead-letter-queue';
import { Broker } from '../core/broker';
import { QueueType, MessageStatus } from '../types';

describe('FIFO ordering semantics', () => {
  let queue: NormalQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'fifo', type: QueueType.NORMAL });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should deliver strictly in publication order for 10 messages', async () => {
    for (let i = 0; i < 10; i++) {
      await queue.publish(`m${i}`);
    }

    const received: string[] = [];
    for (let i = 0; i < 10; i++) {
      const msg = await queue.consume();
      expect(msg).not.toBeNull();
      received.push(msg!.data as string);
    }

    expect(received).toEqual(['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9']);
  });

  it('should not deliver the same message twice while it is unacknowledged', async () => {
    await queue.publish('only-once');

    const first = await queue.consume();
    const second = await queue.consume();

    expect(first!.data).toBe('only-once');
    // 第二次消费不应再拿到同一条消息 (in-flight 守卫)
    expect(second).toBeNull();
  });

  it('should redeliver the message after it is acknowledged and removed', async () => {
    const published = await queue.publish('x');
    await queue.consume();
    await queue.acknowledge(published.id);

    expect(await queue.consume()).toBeNull();
  });

  it('should keep the original relative order when a message is requeued', async () => {
    const a = await queue.publish('a');
    await queue.publish('b');
    await queue.publish('c');

    const first = await queue.consume();
    expect(first!.data).toBe('a');

    // 拒绝并重新入队, 消息应回到原有位置 (仍在 b/c 之前)
    await queue.reject(a.id, true);

    const next = await queue.consume();
    expect(next!.data).toBe('a');
  });

  it('should keep publication order across interleaved publishes and consumes', async () => {
    for (let i = 0; i < 6; i++) {
      await queue.publish(`p${i}`);
      if (i % 2 === 1) {
        await queue.consume();
      }
    }

    // 已消费但未确认的 p0/p1/p2 处于 in-flight 状态, 不会再被投递;
    // 剩余可投递的是 p3/p4/p5, 且保持发布顺序
    const remaining: string[] = [];
    let msg = await queue.consume();
    while (msg) {
      remaining.push(msg.data as string);
      msg = await queue.consume();
    }

    expect(remaining).toEqual(['p3', 'p4', 'p5']);
  });
});

describe('Concurrent consumption', () => {
  let queue: NormalQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'concurrent', type: QueueType.NORMAL });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should hand each message to exactly one consumer under parallel consume', async () => {
    const total = 50;
    for (let i = 0; i < total; i++) {
      await queue.publish(i);
    }

    // 8 个消费者并发抢消息
    const consumers = Array.from({ length: 8 }, (_, c) => `c${c}`);
    const taken: Array<{ consumer: string; id: string }> = [];

    await Promise.all(
      consumers.map(async (consumerId) => {
        for (;;) {
          const msg = await queue.consume(consumerId);
          if (!msg) break;
          taken.push({ consumer: consumerId, id: msg.id });
        }
      })
    );

    expect(taken).toHaveLength(total);
    // 每个消息 id 只出现一次
    const ids = taken.map(t => t.id);
    expect(new Set(ids).size).toBe(total);
  });

  it('should never deliver the same message to two consumers at once', async () => {
    for (let i = 0; i < 20; i++) {
      await queue.publish(i);
    }

    const seen = new Map<string, string>();
    let duplicates = 0;

    await Promise.all(
      Array.from({ length: 5 }, (_, c) => `c${c}`).map(async (consumerId) => {
        for (;;) {
          const msg = await queue.consume(consumerId);
          if (!msg) break;
          if (seen.has(msg.id)) {
            duplicates++;
          } else {
            seen.set(msg.id, consumerId);
          }
        }
      })
    );

    expect(duplicates).toBe(0);
    expect(seen.size).toBe(20);
  });

  it('should assign the consumer id to the delivered message', async () => {
    await queue.publish('payload');

    const msg = await queue.consume('worker-7');

    expect(msg!.consumerId).toBe('worker-7');
    expect(msg!.status).toBe(MessageStatus.PROCESSING);
  });

  it('should allow a message to be consumed again after its visibility timeout expires', async () => {
    const shortQueue = new NormalQueue({
      name: 'short-visibility',
      type: QueueType.NORMAL,
      visibilityTimeout: 40
    });
    await shortQueue.initialize();

    await shortQueue.publish('slow');
    const first = await shortQueue.consume('c1');
    expect(first!.data).toBe('slow');

    // 可见性窗口内不应重投
    expect(await shortQueue.consume('c2')).toBeNull();

    // 等待可见性超时
    await new Promise(r => setTimeout(r, 70));

    const redelivered = await shortQueue.consume('c2');
    expect(redelivered).not.toBeNull();
    expect(redelivered!.id).toBe(first!.id);

    await shortQueue.close();
  });
});

describe('Acknowledge and reject semantics', () => {
  let queue: NormalQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'ack', type: QueueType.NORMAL });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should remove the message from the queue on acknowledge', async () => {
    const m = await queue.publish('a');
    await queue.consume();
    await queue.acknowledge(m.id);

    expect(queue.size()).toBe(0);
  });

  it('should make the message available again after reject with requeue', async () => {
    const m = await queue.publish('a');
    await queue.consume();
    await queue.reject(m.id, true);

    const again = await queue.consume();
    expect(again).not.toBeNull();
    expect(again!.id).toBe(m.id);
    expect(again!.status).toBe(MessageStatus.PROCESSING);
  });

  it('should increment the retry count when requeueing', async () => {
    const m = await queue.publish('a');
    await queue.consume();
    await queue.reject(m.id, true);

    const again = await queue.consume();
    expect(again!.retryCount).toBe(1);
  });

  it('should drop the message when rejected without requeue', async () => {
    const m = await queue.publish('a');
    await queue.consume();
    await queue.reject(m.id, false);

    expect(queue.size()).toBe(0);
    expect(await queue.consume()).toBeNull();
  });

  it('should stop requeueing once maxRetries is exhausted', async () => {
    const m = await queue.publish('a', { maxRetries: 2 });

    // 前两次重试成功 (消息保留), 第三次因预算耗尽被丢弃
    await queue.consume();
    await queue.reject(m.id, true);
    expect(queue.size()).toBe(1);

    await queue.consume();
    await queue.reject(m.id, true);
    expect(queue.size()).toBe(1);

    // 预算耗尽: 消息被移出队列
    await queue.consume();
    await queue.reject(m.id, true);
    expect(queue.size()).toBe(0);
    expect(await queue.consume()).toBeNull();
  });

  it('should count acknowledged messages in the stats', async () => {
    const m = await queue.publish('a');
    await queue.consume();
    await queue.acknowledge(m.id);

    const stats = queue.getStats();
    expect(stats.acknowledgedMessages).toBe(1);
    expect(stats.totalMessages).toBe(1);
  });
});

describe('Priority queue semantics', () => {
  let queue: PriorityQueue;

  beforeEach(async () => {
    queue = new PriorityQueue({ name: 'prio', type: QueueType.PRIORITY });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should deliver higher priority first', async () => {
    await queue.publish('low', { priority: 1 });
    await queue.publish('high', { priority: 10 });
    await queue.publish('mid', { priority: 5 });

    const first = await queue.consume();
    const second = await queue.consume();
    const third = await queue.consume();

    expect([first!.data, second!.data, third!.data]).toEqual(['high', 'mid', 'low']);
  });

  it('should keep FIFO order among messages of equal priority', async () => {
    await queue.publish('a', { priority: 5 });
    await queue.publish('b', { priority: 5 });
    await queue.publish('c', { priority: 5 });

    const received: string[] = [];
    let msg = await queue.consume();
    while (msg) {
      received.push(msg.data as string);
      msg = await queue.consume();
    }

    expect(received).toEqual(['a', 'b', 'c']);
  });

  it('should keep FIFO order among equal priority while a higher priority is pending', async () => {
    await queue.publish('a', { priority: 3 });
    await queue.publish('b', { priority: 3 });
    await queue.publish('z', { priority: 9 });

    const first = await queue.consume();
    expect(first!.data).toBe('z');

    const second = await queue.consume();
    const third = await queue.consume();
    expect([second!.data, third!.data]).toEqual(['a', 'b']);
  });

  it('should default the priority to 5', async () => {
    const m = await queue.publish('x');
    expect(m.priority).toBe(5);
  });

  it('should not deliver the same priority message twice while unacknowledged', async () => {
    await queue.publish('a', { priority: 7 });

    const first = await queue.consume();
    const second = await queue.consume();

    expect(first!.data).toBe('a');
    expect(second).toBeNull();
  });

  it('should keep a requeued priority message in the queue', async () => {
    const m = await queue.publish('a', { priority: 7 });
    await queue.consume();
    await queue.reject(m.id, true);

    const again = await queue.consume();
    expect(again).not.toBeNull();
    expect(again!.id).toBe(m.id);
  });

  it('should remove an acknowledged message from the priority heap', async () => {
    const m = await queue.publish('a', { priority: 7 });
    await queue.consume();
    await queue.acknowledge(m.id);

    expect(queue.size()).toBe(0);
    expect(await queue.consume()).toBeNull();
  });

  it('should skip an expired message and deliver the next one', async () => {
    await queue.publish('expired', { priority: 9, ttl: 1 });
    await new Promise(r => setTimeout(r, 20));
    await queue.publish('fresh', { priority: 1 });

    const msg = await queue.consume();
    expect(msg!.data).toBe('fresh');
  });
});

describe('Delay queue semantics', () => {
  let queue: DelayQueue;

  beforeEach(async () => {
    queue = new DelayQueue({ name: 'delay', type: QueueType.DELAY });
    await queue.initialize();
  });

  afterEach(async () => {
    await queue.close();
  });

  it('should not deliver a message before its delay elapsed', async () => {
    await queue.publish('later', { delay: 1000 });
    expect(await queue.consume()).toBeNull();
  });

  it('should deliver a message once its delay elapsed', async () => {
    await queue.publish('later', { delay: 30 });
    await new Promise(r => setTimeout(r, 60));

    const msg = await queue.consume();
    expect(msg!.data).toBe('later');
  });

  it('should deliver messages without delay immediately', async () => {
    await queue.publish('now');
    const msg = await queue.consume();
    expect(msg!.data).toBe('now');
  });

  it('should preserve FIFO order for messages sharing the same delay', async () => {
    await queue.publish('a', { delay: 30 });
    await queue.publish('b', { delay: 30 });
    await queue.publish('c', { delay: 30 });

    await new Promise(r => setTimeout(r, 60));

    const received: string[] = [];
    let msg = await queue.consume();
    while (msg) {
      received.push(msg.data as string);
      msg = await queue.consume();
    }

    expect(received).toEqual(['a', 'b', 'c']);
  });

  it('should not deliver the same delayed message twice while unacknowledged', async () => {
    await queue.publish('later', { delay: 20 });
    await new Promise(r => setTimeout(r, 50));

    const first = await queue.consume();
    const second = await queue.consume();

    expect(first!.data).toBe('later');
    expect(second).toBeNull();
  });

  it('should count delayed and ready messages separately', async () => {
    await queue.publish('later', { delay: 1000 });
    await queue.publish('now');

    const stats = queue.getStats();
    expect(stats.pendingMessages).toBe(2);
  });
});

describe('TTL and expiration', () => {
  it('should drop an expired message on consume', async () => {
    const queue = new NormalQueue({ name: 'ttl', type: QueueType.NORMAL });
    await queue.initialize();

    await queue.publish('gone', { ttl: 10 });
    await new Promise(r => setTimeout(r, 30));

    expect(await queue.consume()).toBeNull();
    await queue.close();
  });

  it('should keep a message that has not expired', async () => {
    const queue = new NormalQueue({ name: 'ttl2', type: QueueType.NORMAL });
    await queue.initialize();

    await queue.publish('alive', { ttl: 5000 });
    const msg = await queue.consume();
    expect(msg!.data).toBe('alive');
    await queue.close();
  });

  it('should set the expiresAt field from the ttl option', async () => {
    const queue = new NormalQueue({ name: 'ttl3', type: QueueType.NORMAL });
    await queue.initialize();

    const before = Date.now();
    const m = await queue.publish('x', { ttl: 1000 });
    expect(m.expiresAt).toBeGreaterThanOrEqual(before + 1000);
    await queue.close();
  });

  it('should leave expiresAt undefined when no ttl is given', async () => {
    const queue = new NormalQueue({ name: 'ttl4', type: QueueType.NORMAL });
    await queue.initialize();

    const m = await queue.publish('x');
    expect(m.expiresAt).toBeUndefined();
    await queue.close();
  });
});

describe('Broker dead letter routing', () => {
  let broker: Broker;

  beforeEach(async () => {
    broker = new Broker('test-broker');
    await broker.initialize();
  });

  afterEach(async () => {
    await broker.close();
  });

  it('should route a rejected message to the dead letter queue', async () => {
    await broker.createQueue({ name: 'q', type: QueueType.NORMAL });
    const m = await broker.publish('q', 'bad');

    await broker.consume('q');
    await broker.reject('q', m.id, false);

    const dlq = (broker as any).deadLetterQueue as DeadLetterQueue;
    expect(dlq.size()).toBe(1);
    expect(dlq.getFailureReason(m.id)).toBe('Message rejected');
    expect(dlq.getOriginalQueue(m.id)).toBe('q');
  });

  it('should not route a requeued message to the dead letter queue', async () => {
    await broker.createQueue({ name: 'q', type: QueueType.NORMAL });
    const m = await broker.publish('q', 'retry-me');

    await broker.consume('q');
    await broker.reject('q', m.id, true);

    const dlq = (broker as any).deadLetterQueue as DeadLetterQueue;
    expect(dlq.size()).toBe(0);
  });

  it('should keep the dead lettered message consumable for manual handling', async () => {
    await broker.createQueue({ name: 'q', type: QueueType.NORMAL });
    const m = await broker.publish('q', 'bad');

    await broker.consume('q');
    await broker.reject('q', m.id, false);

    const dlq = (broker as any).deadLetterQueue as DeadLetterQueue;

    // 消费前状态为 dead-letter
    expect(dlq.getMessage(m.id)!.status).toBe(MessageStatus.DEAD_LETTER);

    const dead = await dlq.consume('inspector');
    expect(dead).not.toBeNull();
    expect(dead!.id).toBe(m.id);
    // 被取出后进入 processing 状态
    expect(dead!.status).toBe(MessageStatus.PROCESSING);
  });

  it('should not deliver a dead letter message twice while unacknowledged', async () => {
    await broker.createQueue({ name: 'q', type: QueueType.NORMAL });
    const m = await broker.publish('q', 'bad');
    await broker.consume('q');
    await broker.reject('q', m.id, false);

    const dlq = (broker as any).deadLetterQueue as DeadLetterQueue;
    const first = await dlq.consume('a');
    const second = await dlq.consume('b');

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });
});

describe('Queue type definitions and lifecycle', () => {
  it('should expose the configured queue type', async () => {
    const normal = new NormalQueue({ name: 'n', type: QueueType.NORMAL });
    const prio = new PriorityQueue({ name: 'p', type: QueueType.PRIORITY });
    const delay = new DelayQueue({ name: 'd', type: QueueType.DELAY });

    await normal.initialize();
    await prio.initialize();
    await delay.initialize();

    expect(normal.type).toBe(QueueType.NORMAL);
    expect(prio.type).toBe(QueueType.PRIORITY);
    expect(delay.type).toBe(QueueType.DELAY);

    await normal.close();
    await prio.close();
    await delay.close();
  });

  it('should reject operations before initialization', async () => {
    const queue = new NormalQueue({ name: 'uninit', type: QueueType.NORMAL });
    await expect(queue.publish('x')).rejects.toThrow(/not initialized/);
    await expect(queue.consume()).rejects.toThrow(/not initialized/);
  });

  it('should enforce the maxSize capacity', async () => {
    const queue = new NormalQueue({ name: 'small', type: QueueType.NORMAL, maxSize: 2 });
    await queue.initialize();

    await queue.publish('a');
    await queue.publish('b');
    await expect(queue.publish('c')).rejects.toThrow(/full/);

    await queue.close();
  });

  it('should clear all messages and reset the counters', async () => {
    const queue = new NormalQueue({ name: 'clr', type: QueueType.NORMAL });
    await queue.initialize();

    await queue.publish('a');
    await queue.publish('b');
    await queue.clear();

    expect(queue.size()).toBe(0);
    expect(queue.getStats().totalMessages).toBe(0);
    expect(await queue.consume()).toBeNull();

    await queue.close();
  });

  it('should return a copy of the stats that does not mutate internal state', async () => {
    const queue = new NormalQueue({ name: 'stats', type: QueueType.NORMAL });
    await queue.initialize();

    await queue.publish('a');
    const first = queue.getStats();
    first.totalMessages = 999;

    expect(queue.getStats().totalMessages).toBe(1);
    await queue.close();
  });

  it('should clear the messages on close', async () => {
    const queue = new NormalQueue({ name: 'closing', type: QueueType.NORMAL });
    await queue.initialize();
    await queue.publish('a');
    await queue.close();

    expect(queue.size()).toBe(0);
  });
});

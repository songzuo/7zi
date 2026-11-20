/**
 * consumer-broker.test.ts
 *
 * 消费者组、消费者生命周期与 Broker 公共 API 的测试。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Broker } from '../core/broker';
import { Consumer } from '../consumers/consumer';
import { ConsumerGroup } from '../consumers/consumer-group';
import { NormalQueue } from '../queues/normal-queue';
import { DeadLetterQueue } from '../queues/dead-letter-queue';
import { QueueType, ConsumerStatus, MessageStatus } from '../types';

describe('Broker queue management', () => {
  let broker: Broker;

  beforeEach(async () => {
    broker = new Broker('b1', 'Broker One');
    await broker.initialize();
  });

  afterEach(async () => {
    await broker.close();
  });

  it('should create a queue and expose it', async () => {
    await broker.createQueue({ name: 'q1', type: QueueType.NORMAL });

    expect(broker.hasQueue('q1')).toBe(true);
    expect(broker.getQueue('q1')).toBeDefined();
    expect(broker.getQueue('q1')!.name).toBe('q1');
  });

  it('should throw when creating a duplicate queue', async () => {
    await broker.createQueue({ name: 'q1', type: QueueType.NORMAL });
    await expect(
      broker.createQueue({ name: 'q1', type: QueueType.NORMAL })
    ).rejects.toThrow(/already exists/);
  });

  it('should throw when publishing to a non-existent queue', async () => {
    await expect(broker.publish('nope', 'x')).rejects.toThrow(/Queue not found/);
  });

  it('should throw when consuming from a non-existent queue', async () => {
    await expect(broker.consume('nope')).rejects.toThrow(/Queue not found/);
  });

  it('should throw when acknowledging on a non-existent queue', async () => {
    await expect(broker.acknowledge('nope', 'id')).rejects.toThrow(/Queue not found/);
  });

  it('should throw when rejecting on a non-existent queue', async () => {
    await expect(broker.reject('nope', 'id')).rejects.toThrow(/Queue not found/);
  });

  it('should delete a queue', async () => {
    await broker.createQueue({ name: 'q1', type: QueueType.NORMAL });
    await broker.deleteQueue('q1');

    expect(broker.hasQueue('q1')).toBe(false);
  });

  it('should throw when deleting a non-existent queue', async () => {
    await expect(broker.deleteQueue('nope')).rejects.toThrow(/Queue not found/);
  });

  it('should list all queues', async () => {
    await broker.createQueue({ name: 'a', type: QueueType.NORMAL });
    await broker.createQueue({ name: 'b', type: QueueType.PRIORITY });

    const names = broker.getAllQueues().map(q => q.name).sort();
    expect(names).toEqual(['a', 'b']);
  });

  it('should create each queue type', async () => {
    await broker.createQueue({ name: 'n', type: QueueType.NORMAL });
    await broker.createQueue({ name: 'p', type: QueueType.PRIORITY });
    await broker.createQueue({ name: 'd', type: QueueType.DELAY });
    await broker.createQueue({ name: 'x', type: QueueType.DEAD_LETTER });

    expect(broker.getQueue('n')!.type).toBe(QueueType.NORMAL);
    expect(broker.getQueue('p')!.type).toBe(QueueType.PRIORITY);
    expect(broker.getQueue('d')!.type).toBe(QueueType.DELAY);
    expect(broker.getQueue('x')!.type).toBe(QueueType.DEAD_LETTER);
  });

  it('should publish and consume through the broker', async () => {
    await broker.createQueue({ name: 'q1', type: QueueType.NORMAL });
    await broker.publish('q1', 'hello');

    const msg = await broker.consume('q1');
    expect(msg!.data).toBe('hello');
    expect(msg!.status).toBe(MessageStatus.PROCESSING);
  });

  it('should acknowledge through the broker', async () => {
    await broker.createQueue({ name: 'q1', type: QueueType.NORMAL });
    const m = await broker.publish('q1', 'hello');
    await broker.consume('q1');
    await broker.acknowledge('q1', m.id);

    expect(broker.getQueue('q1')!.size()).toBe(0);
  });

  it('should report queue stats per queue and in aggregate', async () => {
    await broker.createQueue({ name: 'q1', type: QueueType.NORMAL });
    await broker.publish('q1', 'a');
    await broker.publish('q1', 'b');

    const stats = broker.getQueueStats('q1');
    expect(stats).not.toBeNull();
    expect(stats!.totalMessages).toBe(2);

    const all = broker.getAllQueueStats();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some(s => s.totalMessages === 2)).toBe(true);
  });

  it('should return null stats for an unknown queue', () => {
    expect(broker.getQueueStats('nope')).toBeNull();
  });
});

describe('Broker pub/sub', () => {
  let broker: Broker;

  beforeEach(async () => {
    broker = new Broker('b2');
    await broker.initialize();
  });

  afterEach(async () => {
    await broker.close();
  });

  it('should create a topic and deliver to subscribers', async () => {
    await broker.createTopic('news');
    const received: unknown[] = [];

    await broker.subscribe('news', 'sub-1', msg => {
      received.push(msg.data);
      return Promise.resolve(true);
    });
    await broker.publishToTopic('news', { title: 'hi' });

    await new Promise(r => setTimeout(r, 20));
    expect(received).toEqual([{ title: 'hi' }]);
  });

  it('should throw when creating a duplicate topic', async () => {
    await broker.createTopic('news');
    await expect(broker.createTopic('news')).rejects.toThrow(/already exists/);
  });

  it('should throw when subscribing to a non-existent topic', async () => {
    await expect(
      broker.subscribe('missing', 's', () => Promise.resolve(true))
    ).rejects.toThrow(/Topic not found/);
  });

  it('should stop delivering after unsubscribe', async () => {
    await broker.createTopic('news');
    const received: unknown[] = [];

    const subId = await broker.subscribe('news', 'sub-1', msg => {
      received.push(msg.data);
      return Promise.resolve(true);
    });
    await broker.unsubscribe('news', subId);
    await broker.publishToTopic('news', 1);

    await new Promise(r => setTimeout(r, 20));
    expect(received).toEqual([]);
  });

  it('should deliver to multiple subscribers', async () => {
    await broker.createTopic('news');
    const a: unknown[] = [];
    const b: unknown[] = [];

    await broker.subscribe('news', 's1', msg => {
      a.push(msg.data);
      return Promise.resolve(true);
    });
    await broker.subscribe('news', 's2', msg => {
      b.push(msg.data);
      return Promise.resolve(true);
    });
    await broker.publishToTopic('news', 'payload');

    await new Promise(r => setTimeout(r, 20));
    expect(a).toEqual(['payload']);
    expect(b).toEqual(['payload']);
  });

  it('should snapshot the message before rejecting it into the dead-letter queue', async () => {
    // 回归：reject(requeue=false) 会把消息从队列里移除。
    // 如果在 reject 之后才去 getMessage()，拿到的是 null，
    // 死信队列就永远收不到这条消息 —— 消息"消失"且没有留下任何痕迹。
    await broker.createQueue({ name: 'dlq-q', type: QueueType.NORMAL });
    const q = broker.getQueue('dlq-q')!;

    const msg = await q.publish('payload-to-dlq', { metadata: { userId: 'u1' } });

    await broker.reject('dlq-q', msg.id, false);

    // 消息应已从原队列移除
    expect(q.getMessage(msg.id)).toBeNull();

    // 死信队列应能查到它的失败详情（证明快照在 reject 之前取到了）
    const dlq = (broker as any).deadLetterQueue as DeadLetterQueue;
    expect(dlq.getFailureReason(msg.id)).toBe('Message rejected');
    expect(dlq.getOriginalQueue(msg.id)).toBe('dlq-q');
  });

  it('should not put a requeued message into the dead-letter queue', async () => {
    await broker.createQueue({ name: 'requeue-q', type: QueueType.NORMAL });
    const q = broker.getQueue('requeue-q')!;

    const msg = await q.publish('payload-requeued', { metadata: { userId: 'u1' } });

    await broker.reject('requeue-q', msg.id, true);

    const dlq = (broker as any).deadLetterQueue as DeadLetterQueue;
    expect(dlq.getFailureReason(msg.id)).toBeUndefined();
  });

  it('should report topic stats', async () => {
    await broker.createTopic('news');
    await broker.subscribe('news', 's1', () => Promise.resolve(true));

    const stats = broker.getTopicStats();
    expect(stats.length).toBe(1);
    // ITopicStats 的主题名字段是 name，不是 topicName
    expect(stats[0].name).toBe('news');
    expect(stats[0].subscriberCount).toBe(1);
  });
});

describe('ConsumerGroup', () => {
  let group: ConsumerGroup;
  let queue: NormalQueue;
  let dlq: DeadLetterQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'cg', type: QueueType.NORMAL });
    dlq = new DeadLetterQueue({ name: 'cg-dlq', type: QueueType.DEAD_LETTER });
    await queue.initialize();
    await dlq.initialize();

    group = new ConsumerGroup(
      { groupId: 'cg', handler: async () => true } as any,
      queue,
      dlq
    );
  });

  afterEach(async () => {
    await group.stop();
    await queue.close();
    await dlq.close();
  });

  it('should register and list consumers', async () => {
    await group.addConsumer(async () => true);

    expect(group.getAllConsumers().length).toBe(1);
    expect(group.getConsumerCount()).toBe(1);
  });

  it('should report the consumer count', async () => {
    await group.addConsumer(async () => true);
    await group.addConsumer(async () => true);

    expect(group.getConsumerCount()).toBe(2);
  });

  it('should return undefined for an unknown consumer id', () => {
    expect(group.getConsumer('nope')).toBeUndefined();
  });

  it('should resolve when removing an unknown consumer', async () => {
    // 实现对未知 consumer 静默忽略, 不抛错
    await expect(group.removeConsumer('nope')).resolves.toBeUndefined();
  });

  it('should remove a consumer', async () => {
    const consumerId = await group.addConsumer(async () => true);

    await group.removeConsumer(consumerId);
    expect(group.getAllConsumers().length).toBe(0);
  });

  it('should expose the group id', () => {
    expect(group.groupId).toBe('cg');
  });

  it('should select the least busy consumer', async () => {
    const c1 = await group.addConsumer(async () => true);
    const c2 = await group.addConsumer(async () => true);

    const selected = group.selectConsumer();
    expect(selected).not.toBeNull();
    expect([c1, c2]).toContain(selected!.id);
  });

  it('should return null when selecting from an empty group', () => {
    expect(group.selectConsumer()).toBeNull();
  });

  it('should aggregate consumer stats', async () => {
    await group.addConsumer(async () => true);

    const stats = group.getStats();
    expect(stats.groupId).toBe('cg');
    expect(stats.queueName).toBe('cg');
    expect(stats.consumerCount).toBe(1);
    expect(stats.consumers.length).toBe(1);
  });

  it('should report unhealthy when no consumer is active', async () => {
    const check = await group.healthCheck();
    expect(check.healthy).toBe(false);
    expect(check.details.length).toBe(0);
  });

  it('should report healthy when a consumer is active', async () => {
    await group.addConsumer(async () => true);
    await group.start();

    const check = await group.healthCheck();
    expect(check.healthy).toBe(true);
    expect(check.details.length).toBe(1);
  });
});

describe('Consumer lifecycle', () => {
  let queue: NormalQueue;
  let dlq: DeadLetterQueue;

  beforeEach(async () => {
    queue = new NormalQueue({ name: 'cl', type: QueueType.NORMAL });
    dlq = new DeadLetterQueue({ name: 'cl-dlq', type: QueueType.DEAD_LETTER });
    await queue.initialize();
    await dlq.initialize();
  });

  afterEach(async () => {
    await queue.close();
    await dlq.close();
  });

  const makeConsumer = (handler: any, config: any = {}) =>
    new Consumer({ groupId: 'g', ...config } as any, queue, dlq, handler);

  it('should start in IDLE state and become ACTIVE on start', async () => {
    const consumer = makeConsumer(async () => true);

    expect(consumer.getStats().status).toBe(ConsumerStatus.IDLE);
    await consumer.start();
    expect(consumer.getStats().status).toBe(ConsumerStatus.ACTIVE);
    await consumer.stop();
  });

  it('should process and acknowledge a message', async () => {
    await queue.publish('payload');

    const seen: unknown[] = [];
    const consumer = makeConsumer(async (msg: any) => {
      seen.push(msg.data);
      return true;
    });

    await consumer.start();
    await new Promise(r => setTimeout(r, 250));
    await consumer.stop();

    expect(seen).toEqual(['payload']);
    expect(consumer.getStats().processedMessages).toBe(1);
    expect(queue.size()).toBe(0);
  });

  it('should retry a message when the handler returns false', async () => {
    await queue.publish('payload');

    let calls = 0;
    const consumer = makeConsumer(async () => {
      calls++;
      return false;
    }, { retryPolicy: { maxRetries: 2, backoffMs: 1, backoffMultiplier: 1 } });

    await consumer.start();
    await new Promise(r => setTimeout(r, 300));
    await consumer.stop();

    expect(calls).toBeGreaterThan(1);
    expect(consumer.getStats().failedMessages).toBeGreaterThan(0);
  });

  it('should move a message to the dead letter queue after retries are exhausted', async () => {
    await queue.publish('poison');

    const consumer = makeConsumer(async () => false, {
      retryPolicy: { maxRetries: 0, backoffMs: 1, backoffMultiplier: 1 }
    });

    await consumer.start();
    await new Promise(r => setTimeout(r, 250));
    await consumer.stop();

    expect(dlq.size()).toBe(1);
  });

  it('should handle a throwing handler without crashing', async () => {
    await queue.publish('boom');

    const consumer = makeConsumer(async () => {
      throw new Error('handler exploded');
    }, { retryPolicy: { maxRetries: 0, backoffMs: 1, backoffMultiplier: 1 } });

    await consumer.start();
    await new Promise(r => setTimeout(r, 250));
    await consumer.stop();

    expect(consumer.getStats().failedMessages).toBeGreaterThan(0);
  });

  it('should pause and resume', async () => {
    const consumer = makeConsumer(async () => true);

    await consumer.start();
    await consumer.pause();
    expect(consumer.getStats().status).toBe(ConsumerStatus.PAUSED);

    await consumer.resume();
    expect(consumer.getStats().status).toBe(ConsumerStatus.ACTIVE);
    await consumer.stop();
  });

  it('should be idempotent on repeated start', async () => {
    const consumer = makeConsumer(async () => true);

    await consumer.start();
    await consumer.start();
    expect(consumer.getStats().status).toBe(ConsumerStatus.ACTIVE);
    await consumer.stop();
  });

  it('should report OFFLINE after stop', async () => {
    const consumer = makeConsumer(async () => true);

    await consumer.start();
    await consumer.stop();
    expect(consumer.getStats().status).toBe(ConsumerStatus.OFFLINE);
  });

  it('should expose the group id and queue name in stats', async () => {
    const consumer = makeConsumer(async () => true, { groupId: 'grp-1' });

    const stats = consumer.getStats();
    expect(stats.groupId).toBe('grp-1');
    expect(stats.queueName).toBe('cl');
    expect(stats.id).toBe(consumer.id);
  });

  it('should return a copy of the stats', async () => {
    const consumer = makeConsumer(async () => true);

    const stats = consumer.getStats();
    stats.processedMessages = 999;
    expect(consumer.getStats().processedMessages).toBe(0);
  });
});

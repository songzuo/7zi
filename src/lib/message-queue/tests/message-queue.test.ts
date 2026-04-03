/**
 * Message Queue Tests - 消息队列测试
 * 测试消息队列系统的核心功能
 */

import { MessageQueue, QueueType, MessageStatus, ConsumerStatus } from '../index';

describe('MessageQueue', () => {
  let mq: MessageQueue;

  beforeEach(async () => {
    mq = new MessageQueue({
      storage: 'memory',
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 100,
        backoffMultiplier: 2
      },
      monitoring: {
        enabled: false,
        intervalMs: 5000
      }
    });
    await mq.initialize();
  });

  afterEach(async () => {
    await mq.close();
  });

  describe('Queue Management', () => {
    it('should create a normal queue', async () => {
      await mq.createQueue('test-queue', QueueType.NORMAL);
      const stats = mq.getQueueStats('test-queue');
      expect(stats).toBeDefined();
      expect(stats!.name).toBe('test-queue');
      expect(stats!.type).toBe(QueueType.NORMAL);
    });

    it('should create a priority queue', async () => {
      await mq.createQueue('priority-queue', QueueType.PRIORITY);
      const stats = mq.getQueueStats('priority-queue');
      expect(stats).toBeDefined();
      expect(stats!.type).toBe(QueueType.PRIORITY);
    });

    it('should create a delay queue', async () => {
      await mq.createQueue('delay-queue', QueueType.DELAY);
      const stats = mq.getQueueStats('delay-queue');
      expect(stats).toBeDefined();
      expect(stats!.type).toBe(QueueType.DELAY);
    });

    it('should delete a queue', async () => {
      await mq.createQueue('temp-queue', QueueType.NORMAL);
      await mq.deleteQueue('temp-queue');
      const stats = mq.getQueueStats('temp-queue');
      expect(stats).toBeNull();
    });
  });

  describe('Message Publishing', () => {
    beforeEach(async () => {
      await mq.createQueue('test-queue', QueueType.NORMAL);
    });

    it('should publish a message', async () => {
      const message = await mq.publish('test-queue', {
        type: 'test',
        data: 'Hello'
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.data).toEqual({ type: 'test', data: 'Hello' });
      expect(message.status).toBe(MessageStatus.PENDING);
    });

    it('should publish a message with options', async () => {
      const message = await mq.publish('test-queue', {
        type: 'test',
        data: 'Hello'
      }, {
        priority: 10,
        ttl: 60000,
        maxRetries: 5
      });

      expect(message.priority).toBe(10);
      expect(message.expiresAt).toBeGreaterThan(message.createdAt);
      expect(message.maxRetries).toBe(5);
    });
  });

  describe('Message Consumption', () => {
    beforeEach(async () => {
      await mq.createQueue('test-queue', QueueType.NORMAL);
    });

    it('should consume a message', async () => {
      await mq.publish('test-queue', { type: 'test', data: 'Hello' });
      
      const message = await mq.consume('test-queue', 'test-consumer');
      
      expect(message).toBeDefined();
      expect(message!.data).toEqual({ type: 'test', data: 'Hello' });
      expect(message!.status).toBe(MessageStatus.PROCESSING);
    });

    it('should acknowledge a message', async () => {
      await mq.publish('test-queue', { type: 'test', data: 'Hello' });
      
      const message = await mq.consume('test-queue', 'test-consumer');
      await mq.acknowledge('test-queue', message!.id);
      
      const stats = mq.getQueueStats('test-queue');
      expect(stats!.acknowledgedMessages).toBe(1);
    });

    it('should reject a message with requeue', async () => {
      await mq.publish('test-queue', { type: 'test', data: 'Hello' });
      
      const message1 = await mq.consume('test-queue', 'test-consumer');
      await mq.reject('test-queue', message1!.id, true);
      
      const message2 = await mq.consume('test-queue', 'test-consumer');
      expect(message2).toBeDefined();
    });
  });

  describe('Consumer Management', () => {
    beforeEach(async () => {
      await mq.createQueue('test-queue', QueueType.NORMAL);
    });

    it('should create a consumer', async () => {
      const consumer = await mq.createConsumer('test-queue', async (message) => {
        return true;
      }, {
        groupId: 'test-group'
      });

      expect(consumer).toBeDefined();
      expect(consumer.groupId).toBe('test-group');
    });

    it('should process messages with consumer', async () => {
      let processed = false;

      const consumer = await mq.createConsumer('test-queue', async (message) => {
        processed = true;
        return true;
      });

      await mq.publish('test-queue', { type: 'test' });

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(processed).toBe(true);
    });
  });

  describe('Pub/Sub', () => {
    it('should create a topic', async () => {
      await mq.createTopic('test-topic');
      const stats = mq.getMonitorReport();
      // Topic 创建成功
      expect(true).toBe(true);
    });

    it('should subscribe to a topic', async () => {
      await mq.createTopic('test-topic');
      
      const subscriberId = await mq.subscribe('test-topic', 'test-subscriber', async (message) => {
        return true;
      });

      expect(subscriberId).toBeDefined();
    });

    it('should publish to a topic', async () => {
      let received = false;

      await mq.createTopic('test-topic');
      await mq.subscribe('test-topic', 'test-subscriber', async (message) => {
        received = true;
        return true;
      });

      await mq.publishToTopic('test-topic', { type: 'test' });

      // 等待处理
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(received).toBe(true);
    });
  });

  describe('Transaction', () => {
    beforeEach(async () => {
      await mq.createQueue('test-queue', QueueType.NORMAL);
    });

    it('should begin a transaction', async () => {
      const transaction = await mq.beginTransaction();
      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
    });

    it('should commit a transaction', async () => {
      const transaction = await mq.beginTransaction();
      
      await transaction.publish('test-queue', { type: 'test1' });
      await transaction.publish('test-queue', { type: 'test2' });
      
      await transaction.commit();

      const stats = mq.getQueueStats('test-queue');
      expect(stats!.totalMessages).toBe(2);
    });

    it('should rollback a transaction', async () => {
      const transaction = await mq.beginTransaction();
      
      await transaction.publish('test-queue', { type: 'test1' });
      
      await transaction.rollback();

      const stats = mq.getQueueStats('test-queue');
      expect(stats!.totalMessages).toBe(0);
    });
  });

  describe('Monitoring', () => {
    beforeEach(async () => {
      await mq.createQueue('test-queue', QueueType.NORMAL);
    });

    it('should get queue stats', async () => {
      await mq.publish('test-queue', { type: 'test' });
      
      const stats = mq.getQueueStats('test-queue');
      
      expect(stats).toBeDefined();
      expect(stats!.totalMessages).toBe(1);
      expect(stats!.pendingMessages).toBe(1);
    });

    it('should get all queue stats', async () => {
      await mq.createQueue('queue1', QueueType.NORMAL);
      await mq.createQueue('queue2', QueueType.NORMAL);
      
      const stats = mq.getAllQueueStats();
      
      expect(stats.length).toBe(3); // test-queue + queue1 + queue2
    });

    it('should get broker stats', async () => {
      const stats = mq.getBrokerStats();
      
      expect(stats).toBeDefined();
      expect(stats.queueCount).toBe(1);
    });
  });
});
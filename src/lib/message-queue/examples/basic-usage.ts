/**
 * Basic Usage Example - 基本使用示例
 * 演示消息队列系统的基本功能
 */

import { MessageQueue, QueueType } from '../index';

async function main() {
  // 创建消息队列实例
  const mq = new MessageQueue({
    storage: 'memory',
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000,
      backoffMultiplier: 2
    },
    deadLetterQueue: {
      enabled: true,
      queueName: 'dead-letter-queue',
      maxRetries: 3
    },
    monitoring: {
      enabled: true,
      intervalMs: 5000
    },
    api: {
      restEnabled: true,
      restPort: 3000,
      wsEnabled: true,
      wsPort: 3001
    }
  });

  // 初始化
  await mq.initialize();

  console.log('Message Queue initialized');

  // ============================================================================
  // 示例 1: 创建队列
  // ============================================================================

  await mq.createQueue('orders', QueueType.NORMAL);
  await mq.createQueue('priority-orders', QueueType.PRIORITY);
  await mq.createQueue('delayed-tasks', QueueType.DELAY);

  console.log('Queues created');

  // ============================================================================
  // 示例 2: 发布消息
  // ============================================================================

  // 发布普通消息
  const message1 = await mq.publish('orders', {
    id: '123',
    type: 'order.created',
    data: { productId: 'p1', quantity: 2 }
  });

  console.log('Published message:', message1.id);

  // 发布优先级消息
  const message2 = await mq.publish('priority-orders', {
    id: '456',
    type: 'urgent.order',
    data: { productId: 'p2', quantity: 1 }
  }, {
    priority: 10 // 最高优先级
  });

  console.log('Published priority message:', message2.id);

  // 发布延迟消息
  const message3 = await mq.publish('delayed-tasks', {
    id: '789',
    type: 'scheduled.task',
    data: { task: 'send-reminder' }
  }, {
    delay: 5000 // 5秒后执行
  });

  console.log('Published delayed message:', message3.id);

  // ============================================================================
  // 示例 3: 创建消费者
  // ============================================================================

  const consumer = await mq.createConsumer('orders', async (message) => {
    console.log('Processing message:', message.data);
    
    // 模拟处理
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Message processed:', message.id);
    return true; // 返回 true 表示成功
  }, {
    groupId: 'order-processors',
    concurrency: 5,
    rateLimit: 100
  });

  console.log('Consumer created:', consumer.groupId);

  // ============================================================================
  // 示例 4: 发布/订阅模式
  // ============================================================================

  // 创建主题
  await mq.createTopic('notifications');

  // 订阅主题
  await mq.subscribe('notifications', 'email-service', async (message) => {
    console.log('Email service received:', message.data);
    return true;
  });

  await mq.subscribe('notifications', 'sms-service', async (message) => {
    console.log('SMS service received:', message.data);
    return true;
  });

  // 发布到主题
  await mq.publishToTopic('notifications', {
    type: 'user.registered',
    userId: '123',
    email: 'user@example.com'
  });

  console.log('Published to topic');

  // ============================================================================
  // 示例 5: 事务支持
  // ============================================================================

  const transaction = await mq.beginTransaction();

  try {
    await transaction.publish('orders', {
      id: '999',
      type: 'order.created',
      data: { productId: 'p3', quantity: 1 }
    });

    await transaction.publish('orders', {
      id: '1000',
      type: 'order.created',
      data: { productId: 'p4', quantity: 2 }
    });

    await transaction.commit();
    console.log('Transaction committed');
  } catch (error) {
    await transaction.rollback();
    console.error('Transaction rolled back:', error);
  }

  // ============================================================================
  // 示例 6: 监控和统计
  // ============================================================================

  // 获取队列统计
  const queueStats = mq.getAllQueueStats();
  console.log('Queue stats:', queueStats);

  // 获取 Broker 统计
  const brokerStats = mq.getBrokerStats();
  console.log('Broker stats:', brokerStats);

  // 获取监控报告
  const monitorReport = mq.getMonitorReport();
  console.log('Monitor report:', monitorReport);

  // ============================================================================
  // 示例 7: 手动消费消息
  // ============================================================================

  const message = await mq.consume('orders', 'manual-consumer');
  if (message) {
    console.log('Consumed message:', message.data);

    // 处理消息
    await new Promise(resolve => setTimeout(resolve, 100));

    // 确认消息
    await mq.acknowledge('orders', message.id);
    console.log('Message acknowledged');
  }

  // ============================================================================
  // 示例 8: 拒绝消息
  // ============================================================================

  const messageToReject = await mq.consume('orders', 'manual-consumer');
  if (messageToReject) {
    console.log('Consumed message to reject:', messageToReject.data);

    // 拒绝消息并重新入队
    await mq.reject('orders', messageToReject.id, true);
    console.log('Message rejected and requeued');
  }

  // ============================================================================
  // 清理
  // ============================================================================

  // 等待一段时间观察
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 关闭消息队列
  await mq.close();
  console.log('Message Queue closed');
}

// 运行示例
main().catch(console.error);
# Message Queue System - v1.10.0

企业级消息队列系统，支持点对点和发布/订阅模式，提供完整的消息持久化、事务支持、消费者管理和监控功能。

## 特性

### 消息队列核心
- ✅ 点对点 (P2P) 模式
- ✅ 发布/订阅 (Pub/Sub) 模式
- ✅ 消息持久化（内存/文件存储）
- ✅ 事务支持
- ✅ 消息确认机制 (ACK/NACK)
- ✅ 自动重试机制

### 队列管理
- ✅ 普通队列 (FIFO)
- ✅ 优先级队列
- ✅ 延迟队列
- ✅ 死信队列 (DLQ)
- ✅ 队列监控和配置
- ✅ 动态队列创建/删除

### 消费者管理
- ✅ 消费者组
- ✅ 负载均衡
- ✅ 并发控制
- ✅ 限流机制
- ✅ 健康检查
- ✅ 消费者注册/注销

### 集成和 API
- ✅ REST API 管理接口
- ✅ WebSocket 实时监控
- ✅ 多 Broker 支持
- ✅ 事件系统

## 快速开始

### 基本使用

```typescript
import { MessageQueue, QueueType } from './index';

// 创建消息队列实例
const mq = new MessageQueue({
  storage: 'memory', // 或 'file'
  storagePath: './mq-data'
});

// 创建队列
await mq.createQueue('orders', QueueType.NORMAL);
await mq.createQueue('priority-orders', QueueType.PRIORITY);
await mq.createQueue('delayed-tasks', QueueType.DELAY);

// 发布消息
await mq.publish('orders', {
  id: '123',
  type: 'order.created',
  data: { productId: 'p1', quantity: 2 }
});

// 创建消费者
const consumer = await mq.createConsumer('orders', {
  groupId: 'order-processors',
  concurrency: 5,
  handler: async (message) => {
    console.log('Processing:', message.data);
    // 处理消息
    await processOrder(message.data);
    return true; // 返回 true 表示成功
  }
});

// 启动消费者
await consumer.start();
```

### 发布/订阅模式

```typescript
// 创建主题
await mq.createTopic('notifications');

// 订阅主题
await mq.subscribe('notifications', 'email-service', async (message) => {
  await sendEmail(message.data);
});

await mq.subscribe('notifications', 'sms-service', async (message) => {
  await sendSMS(message.data);
});

// 发布到主题
await mq.publishToTopic('notifications', {
  type: 'user.registered',
  userId: '123',
  email: 'user@example.com'
});
```

### 优先级队列

```typescript
await mq.createQueue('urgent-tasks', QueueType.PRIORITY);

await mq.publish('urgent-tasks', {
  task: 'process-payment',
  priority: 10 // 优先级 1-10，10 最高
});
```

### 延迟队列

```typescript
await mq.createQueue('scheduled-tasks', QueueType.DELAY);

// 5分钟后执行
await mq.publish('scheduled-tasks', {
  task: 'send-reminder',
  delay: 5 * 60 * 1000 // 5分钟
});
```

### 事务支持

```typescript
const transaction = await mq.beginTransaction();

try {
  await transaction.publish('orders', order1);
  await transaction.publish('orders', order2);
  await transaction.publish('inventory', inventoryUpdate);

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

## API 文档

### REST API

#### 队列管理
- `GET /api/queues` - 获取所有队列
- `POST /api/queues` - 创建队列
- `DELETE /api/queues/:name` - 删除队列
- `GET /api/queues/:name/stats` - 获取队列统计

#### 消息管理
- `POST /api/queues/:name/messages` - 发布消息
- `GET /api/queues/:name/messages` - 获取消息列表
- `DELETE /api/queues/:name/messages/:id` - 删除消息

#### 消费者管理
- `GET /api/consumers` - 获取所有消费者
- `POST /api/consumers` - 创建消费者
- `DELETE /api/consumers/:id` - 删除消费者
- `GET /api/consumers/:id/stats` - 获取消费者统计

### WebSocket 事件

- `queue:stats` - 队列统计更新
- `consumer:stats` - 消费者统计更新
- `message:published` - 消息发布
- `message:consumed` - 消息消费
- `message:failed` - 消息失败

## 配置选项

```typescript
interface MessageQueueOptions {
  // 存储类型: 'memory' | 'file'
  storage: 'memory' | 'file';

  // 文件存储路径
  storagePath?: string;

  // 默认重试配置
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };

  // 默认死信队列配置
  deadLetterQueue?: {
    enabled: boolean;
    queueName: string;
    maxRetries: number;
  };

  // 监控配置
  monitoring?: {
    enabled: boolean;
    intervalMs: number;
  };

  // API 配置
  api?: {
    restEnabled: boolean;
    restPort: number;
    wsEnabled: boolean;
    wsPort: number;
  };
}
```

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                     Message Queue System                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Producer   │──────│    Broker    │──────│ Consumer │
│  └──────────────┘      └──────────────┘      └─────────┘ │
│                                │                         │
│                                ▼                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    Queue Manager                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │  │
│  │  │  Normal  │ │ Priority │ │  Delay   │          │  │
│  │  └──────────┘ └──────────┘ └──────────┘          │  │
│  │  ┌──────────┐                                     │  │
│  │  │   DLQ    │                                     │  │
│  │  └──────────┘                                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                │                         │
│                                ▼                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Storage Layer                    │  │
│  │  ┌──────────┐          ┌──────────┐              │  │
│  │  │  Memory  │          │   File   │              │  │
│  │  └──────────┘          └──────────┘              │  │
│  └──────────────────────────────────────────────────┘  │
│                                │                         │
│                                ▼                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                    API Layer                      │  │
│  │  ┌──────────┐          ┌──────────┐              │  │
│  │  │   REST   │          │ WebSocket│              │  │
│  │  └──────────┘          └──────────┘              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 性能指标

- **吞吐量**: > 10,000 消息/秒 (内存存储)
- **延迟**: < 1ms (内存存储), < 10ms (文件存储)
- **并发**: 支持多消费者并发消费
- **持久化**: 可选内存或文件持久化

## 监控指标

- 队列深度 (消息数量)
- 消费速率 (消息/秒)
- 生产速率 (消息/秒)
- 消费者健康状态
- 重试次数
- 死信队列大小

## 许可证

MIT
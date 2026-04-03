# A2A 协议架构设计文档

## 📋 实现概述

已完成 A2A (Agent-to-Agent) 通信协议的实现，包括客户端、服务器和完整的测试套件。

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         A2A 协议层                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   A2AClient      │         │   A2AServer      │              │
│  │                  │◄───────►│                  │              │
│  │  - 消息发送      │         │  - 连接管理      │              │
│  │  - 消息接收      │         │  - 消息路由      │              │
│  │  - 请求/响应     │         │  - 心跳检查      │              │
│  │  - 心跳机制      │         │  - 消息历史      │              │
│  └──────────────────┘         └──────────────────┘              │
│           │                              │                       │
│           │         ┌──────────────┐    │                       │
│           └────────►│ A2AProtocol  │◄───┘                       │
│                     │  (基础层)    │                            │
│                     │ - 消息格式   │                            │
│                     │ - 事件系统   │                            │
│                     └──────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 文件结构

```
src/lib/a2a/
├── A2ATypes.ts              # 类型定义
├── A2AProtocol.ts           # 基础协议类
├── A2AClient.ts             # 客户端实现
├── A2AServer.ts             # 服务器实现
├── A2AProtocol.test.ts      # 测试用例（28个测试全部通过）
├── index.ts                 # 模块导出
├── README.md                # 使用文档
├── demo.js                  # 演示脚本
└── examples/
    └── A2AExamples.ts       # 使用示例
```

## 📦 核心组件

### 1. A2ATypes.ts - 类型定义

定义了协议所需的所有类型：

- `A2AMessage` - 消息格式
- `A2ARequestOptions` - 请求选项
- `A2AConnection` - 连接信息
- `A2AServerConfig` - 服务器配置
- `A2AClientConfig` - 客户端配置
- `A2AEvent` - 事件类型

### 2. A2AProtocol.ts - 基础协议

提供核心消息处理功能：

- 消息发送和接收
- 请求-响应模式
- 事件发射系统
- 超时处理
- 消息处理器注册

### 3. A2AClient.ts - 客户端

**主要功能：**

```typescript
class A2AClient {
  // 连接管理
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  
  // 消息发送
  async send(to, payload, type, options): Promise<A2AMessage>
  async request(to, payload, options): Promise<unknown>
  async respond(to, correlationId, payload): Promise<A2AMessage>
  async notify(to, payload): Promise<A2AMessage>
  async sendError(to, correlationId, error): Promise<A2AMessage>
  
  // 消息处理
  async handleMessage(message): Promise<void>
  
  // 状态查询
  getConnectionStatus(): { connected, connectionId }
  getPendingRequestCount(): number
}
```

**特性：**

- ✅ 自动消息队列（断线时缓存消息）
- ✅ 请求超时和重试机制
- ✅ 心跳自动发送
- ✅ 事件驱动架构
- ✅ 离线消息队列

### 4. A2AServer.ts - 服务器

**主要功能：**

```typescript
class A2AServer {
  // 生命周期
  async start(): Promise<void>
  async stop(): Promise<void>
  
  // 连接管理
  async registerAgent(agentId, metadata?): Promise<string>
  async disconnectAgent(agentId): Promise<void>
  
  // 消息处理
  async handleMessage(message): Promise<void>
  async send(to, payload, type, correlationId?): Promise<A2AMessage>
  async sendResponse(to, correlationId, payload): Promise<A2AMessage>
  async sendError(to, correlationId, error): Promise<A2AMessage>
  
  // 查询方法
  getConnections(): A2AConnection[]
  getConnectionCount(): number
  getMessageHistory(limit?): A2AMessage[]
  isAgentOnline(agentId): boolean
  getStatus(): ServerStatus
  
  // 处理器注册
  onMessage(messageType, handler): void
}
```

**特性：**

- ✅ 最大连接数限制
- ✅ 自动心跳检查（断开不活跃连接）
- ✅ 消息历史记录
- ✅ 消息路由和转发
- ✅ 代理在线状态追踪

## 🔗 消息流程

### 1. 通知流程 (Notification)

```
Agent A                  Server                  Agent B
   │                       │                       │
   │── notify(payload) ────>│                       │
   │                       │── forward() ──────────>│
   │                       │                       │
   │<─── ack ──────────────│                       │
   │                       │<─────── ack ───────────│
```

### 2. 请求-响应流程 (Request-Response)

```
Agent A                  Server                  Agent B
   │                       │                       │
   │── request(payload) ───>│                       │
   │                       │── forward() ──────────>│
   │                       │                       │
   │                       │<─── response() ────────│
   │<─── response() ───────│                       │
```

### 3. 错误处理流程 (Error)

```
Agent A                  Server                  Agent B
   │                       │                       │
   │── request(payload) ───>│                       │
   │                       │── forward() ──────────>│
   │                       │                       │
   │                       │<─── error() ───────────│
   │<─── error() ──────────│                       │
```

### 4. 心跳流程 (Heartbeat)

```
Agent A                  Server
   │                       │
   │── heartbeat() ────────>│
   │<── heartbeat() ────────│
   │     (每30秒)           │
```

## 📊 消息格式

```typescript
{
  id: string;              // 唯一消息ID: msg_<timestamp>_<random>
  from: string;            // 发送者代理ID
  to: string;              // 接收者代理ID 或 '__server__'
  type: 'request' | 'response' | 'notification' | 'error' | 'heartbeat';
  timestamp: number;       // Unix 时间戳
  payload: unknown;        // 消息内容
  correlationId?: string;  // 关联ID（请求-响应模式）
  priority?: 'low' | 'normal' | 'high';  // 优先级
  metadata?: Record<string, unknown>;     // 扩展元数据
}
```

## ✅ 测试覆盖

已实现 **28 个测试用例**，全部通过：

### A2AClient 测试 (9个)
- ✅ 创建客户端
- ✅ 连接/断开连接
- ✅ 发送通知消息
- ✅ 发送请求消息
- ✅ 离线消息队列
- ✅ 事件发射
- ✅ 接收消息处理
- ✅ 响应请求

### A2AServer 测试 (12个)
- ✅ 创建服务器
- ✅ 启动/停止服务器
- ✅ 注册代理
- ✅ 最大连接数限制
- ✅ 代理在线状态
- ✅ 断开代理
- ✅ 心跳处理
- ✅ 消息事件
- ✅ 消息历史
- ✅ 服务器发送消息
- ✅ 获取连接列表

### 消息流程测试 (4个)
- ✅ 消息格式验证
- ✅ 通知流程
- ✅ 响应流程（带 correlationId）
- ✅ 错误消息流程

### 连接管理测试 (3个)
- ✅ 多连接追踪
- ✅ 连接元数据
- ✅ 重复注册处理

## 🎯 核心特性

### 1. 可靠性
- ✅ 请求超时机制
- ✅ 自动重试
- ✅ 错误处理
- ✅ 心跳检测

### 2. 灵活性
- ✅ 多种消息类型
- ✅ 消息优先级
- ✅ 自定义元数据
- ✅ 事件驱动

### 3. 可扩展性
- ✅ 自定义消息处理器
- ✅ 事件监听器
- ✅ 中间件支持（未来）

### 4. 易用性
- ✅ 简洁的 API
- ✅ 完整的类型定义
- ✅ 丰富的示例代码
- ✅ 详细的文档

## 📈 性能特性

- **消息队列**: 断线时自动缓存，重连后发送
- **心跳优化**: 可配置心跳间隔，默认 30 秒
- **连接限制**: 防止资源耗尽，默认最大 100 个连接
- **历史记录**: 保留最近 1000 条消息
- **自动清理**: 超时请求自动清理，防止内存泄漏

## 🚀 使用示例

### 基本使用

```typescript
import { A2AClient, A2AServer } from './a2a';

// 创建服务器
const server = new A2AServer();
await server.start();

// 创建客户端
const client1 = new A2AClient('agent-1');
const client2 = new A2AClient('agent-2');

await client1.connect();
await client2.connect();

await server.registerAgent('agent-1');
await server.registerAgent('agent-2');

// 发送通知
await client1.notify('agent-2', { text: 'Hello!' });

// 请求-响应
const response = await client1.request('agent-2', { action: 'test' });
```

### 事件监听

```typescript
client.on('message', (message) => {
  console.log('Received:', message);
});

server.on('message:received', (message) => {
  console.log('Server received:', message);
});
```

## 🔮 未来扩展

- [ ] WebSocket 传输层
- [ ] 消息加密和认证
- [ ] 消息持久化
- [ ] 分布式服务器支持
- [ ] 消息过滤和路由规则
- [ ] 性能监控指标

## 📝 总结

已成功实现一个完整的 A2A 通信协议，包括：

1. ✅ **完整的协议实现** - 客户端、服务器和基础协议层
2. ✅ **消息格式设计** - 支持请求、响应、通知、错误、心跳
3. ✅ **通信流程实现** - 请求-响应、通知、错误处理、心跳
4. ✅ **测试用例** - 28 个测试全部通过
5. ✅ **文档和示例** - README、架构文档、使用示例

协议设计遵循简单、可靠、可扩展的原则，适用于智能体之间的通信场景。
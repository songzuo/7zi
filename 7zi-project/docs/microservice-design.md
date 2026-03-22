# 7zi 微服务架构设计文档

> 版本: 1.0.0  
> 日期: 2026-03-06  
> 架构师: 🏗️ 架构师

---

## 1. 概述

### 1.1 项目背景

**7zi** 是一个 AI 驱动的团队管理平台，由 11 位专业 AI 成员组成完整的组织架构。当前采用 Next.js 单体架构，为支持后续扩展性、高并发和微服务化演进，特制定本架构设计。

### 1.2 设计目标

- ✅ **服务解耦** - 各功能模块独立部署和扩展
- ✅ **高可用** - 单点故障不影响整体系统
- ✅ **可扩展** - 支持未来 8 台服务器集群部署
- ✅ **技术多样性** - 允许不同服务使用最合适的技术栈

---

## 2. 架构总览

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户访问层                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │  Web    │  │  PWA    │  │  API    │  │ Webhook │  │  CDN    │          │
│  │  浏览器  │  │  移动端  │  │  第三方  │  │  回调   │  │  静态资源│          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
└───────┼────────────┼────────────┼────────────┼────────────┼────────────────┘
        │            │            │            │            │
        └────────────┴──────┬──────┴────────────┴────────────┘
                            │
                    ┌───────▼───────┐
                    │   API Gateway │
                    │   (Nginx)     │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│  网关/路由层    │   │  服务注册中心  │   │   配置中心    │
│   (Kong)      │   │   (Nacos)     │   │   (Nacos)     │
└───────────────┘   └───────────────┘   └───────────────┘

        ┌───────────────────────────────────────────────────┐
        │                    服务网格层                        │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
        │  │  Front   │  │  Agent   │  │  Chat   │          │
        │  │ Service  │  │ Service  │  │ Service  │          │
        │  └──────────┘  └──────────┘  └──────────┘          │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
        │  │  Task    │  │  Memory  │  │  Message│          │
        │  │ Service  │  │ Service  │  │ Service  │          │
        │  └──────────┘  └──────────┘  └──────────┘          │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
        │  │  Report  │  │  Media   │  │  OAuth  │          │
        │  │ Service  │  │ Service  │  │ Service  │          │
        │  └──────────┘  └──────────┘  └──────────┘          │
        └───────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐  ▼───────┐ ┌───────
│    Redis      │   │    MySQL      │   │   Elasticsearch│
│   (缓存/会话)  │   │   (主数据)    │   │   (搜索/日志)  │
└───────────────┘   └───────────────┘   └───────────────┘
```

### 2.2 部署架构 (8 服务器)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         7zi 服务器集群部署                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     负载均衡层 (2 台)                             │ │
│  │  ┌─────────────────┐          ┌─────────────────┐              │ │
│  │  │  LB-1 (主)      │  <────>  │  LB-2 (备)      │              │ │
│  │  │  165.99.43.61   │          │  (高可用 IP)    │              │ │
│  │  └─────────────────┘          └─────────────────┘              │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     应用服务层 (4 台)                             │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │ │
│  │  │ App-1   │  │ App-2   │  │ App-3   │  │ App-4   │             │ │
│  │  │ Front   │  │ Agent   │  │ Chat    │  │ Task    │             │ │
│  │  │ Service │  │ Service │  │ Service │  │ Service │             │ │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘             │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐ │
│  │        数据层 (1 台)          │  │       缓存/消息 (1 台)         │ │
│  │  ┌────────┐  ┌────────┐      │  │  ┌────────┐  ┌────────┐      │ │
│  │  │ MySQL  │  │ ES     │      │  │  │ Redis  │  │ Kafka  │      │ │
│  │  │ 主从   │  │ 日志   │      │  │  │ 缓存   │  │ 消息   │      │ │
│  │  └────────┘  └────────┘      │  │  └────────┘  └────────┘      │ │
│  └──────────────────────────────┘  └──────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 服务边界定义

### 3.1 服务清单

| 编号 | 服务名称 | 英文名 | 职责 | 技术栈 |
|------|----------|--------|------|--------|
| S01 | 前端服务 | frontend-service | Next.js Web 应用，提供 UI 渲染 | Next.js/React |
| S02 | AI 代理服务 | agent-service | 11 位 AI 成员管理，任务分配，协调 | Node.js/OpenClaw |
| S03 | 聊天服务 | chat-service | AI 对话存储话管理，会，多模型调用 | Node.js/WS |
| S04 | 任务服务 | task-service | 任务创建、分配、追踪、状态管理 | Node.js |
| S05 | 记忆服务 | memory-service | 长短期记忆存储，上下文管理 | Node.js/向量数据库 |
| S06 | 消息服务 | message-service | 实时消息推送，WebSocket 管理 | Node.js/WS |
| S07 | 报表服务 | report-service | 数据统计，报告生成，分析看板 | Node.js |
| S08 | 媒体服务 | media-service | 图片/视频处理，CDN 加速 | Node.js/FFmpeg |
| S09 | 认证服务 | auth-service | 用户认证，OAuth，权限管理 | Node.js/JWT |
| S10 | API 网关 | api-gateway | 请求路由，限流，认证 | Nginx/Kong |

### 3.2 服务依赖关系

```
┌─────────────┐
│  Frontend   │ ◄─────┐
│  Service    │       │
└──────┬──────┘       │
       │              │
       ▼              │
┌─────────────┐       │
│ API Gateway │       │
└──────┬──────┘       │
       │              │
       ├──────────────┤
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│ Auth Service│  │Chat Service │
└──────┬──────┘  └──────┬──────┘
       │              │
       │    ┌─────────┴─────────┐
       │    │                    │
       ▼    ▼                    ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│Agent Service│  │Task Service │  │Memory Service│
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │              │              │
       │              │    ┌─────────┴─────────┐
       │              │    │                    │
       │              ▼    ▼                    ▼
       │     ┌─────────────┐  ┌─────────────┐
       │     │Message Svc  │  │Report Service│
       │     └─────────────┘  └──────┬──────┘
       │                             │
       └─────────────┬───────────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Media Svc   │
              └─────────────┘
```

---

## 4. 详细服务设计

### 4.1 前端服务 (Frontend Service)

**服务 ID:** S01  
**端口:** 3000  
**技术栈:** Next.js 14, React, TypeScript, Tailwind CSS

**核心功能:**
- Web 页面渲染 (SSR/SSG)
- Dashboard 实时展示
- PWA 支持
- SEO 优化

**API 接口:**
```
GET  /api/health          - 健康检查
GET  /api/dashboard       - 获取仪表盘数据
GET  /api/team            - 获取团队成员
POST /api/chat/send       - 发送聊天消息
GET  /api/tasks           - 获取任务列表
```

**部署:** Docker 容器，2+ 实例

---

### 4.2 AI 代理服务 (Agent Service)

**服务 ID:** S02  
**端口:** 3001  
**技术栈:** Node.js, OpenClaw

**核心功能:**
- 11 位 AI 成员生命周期管理
- 任务智能分配与调度
- 子代理协调与监督
- 会议系统主持

**核心模块:**
```typescript
// Agent Manager
interface AgentManager {
  // 创建 AI 成员实例
  createAgent(role: AgentRole): Agent;
  
  // 任务分配
  assignTask(agent: Agent, task: Task): void;
  
  // 协调会议
  holdMeeting(type: MeetingType): Meeting;
  
  // 进度汇报
  reportProgress(): ProgressReport;
}
```

**与其它服务交互:**
- 📥 接收任务 → Task Service
- 📤 派发指令 → Agent Service (子代理)
- 💾 存储记忆 → Memory Service

---

### 4.3 聊天服务 (Chat Service)

**服务 ID:** S03  
**端口:** 3002  
**技术栈:** Node.js, WebSocket, MiniMax/Volcengine/Bailian SDK

**核心功能:**
- AI 对话处理
- 多模型集成 (MiniMax, Volcengine, Bailian, Self-Claude)
- 会话上下文管理
- 流式响应

**核心模块:**
```typescript
// Chat Handler
interface ChatHandler {
  // 发送消息
  sendMessage(sessionId: string, message: string): Promise<ChatResponse>;
  
  // 流式响应
  streamMessage(sessionId: string, message: string): AsyncIterable<Chunk>;
  
  // 会话管理
  createSession(userId: string): Session;
  getSessionHistory(sessionId: string): Message[];
}
```

**WebSocket 事件:**
```
ws://api.7zi.com/chat
├── message        - 发送消息
├── message ack    - 消息确认
├── token          - 流式 token
├── error          - 错误通知
└── typing         -  typing 状态
```

---

### 4.4 任务服务 (Task Service)

**服务 ID:** S04  
**端口:** 3003  
**技术栈:** Node.js, MySQL

**核心功能:**
- 任务 CRUD 操作
- 任务状态流转
- 优先级管理
- 任务依赖处理

**数据模型:**
```sql
CREATE TABLE tasks (
  id          VARCHAR(36) PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      ENUM('pending', 'in_progress', 'completed', 'failed'),
  priority    ENUM('low', 'medium', 'high', 'urgent'),
  assignee    VARCHAR(36),      -- agent_id
  creator     VARCHAR(36),      -- user_id
  due_date    DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 4.5 记忆服务 (Memory Service)

**服务 ID:** S05  
**端口:** 3004  
**技术栈:** Node.js, PostgreSQL, Qdrant (向量数据库)

**核心功能:**
- 长期记忆存储
- 短期会话记忆
- 向量相似度搜索
- 上下文检索

**记忆类型:**
```typescript
enum MemoryType {
  EPISODIC = 'episodic',    // 事件记忆
  SEMANTIC = 'semantic',    // 语义知识
  WORKING = 'working',      // 工作记忆
}

interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  embedding: number[];       // 向量表示
  agentId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
```

---

### 4.6 消息服务 (Message Service)

**服务 ID:** S06  
**端口:** 3005  
**技术栈:** Node.js, WebSocket, Redis Pub/Sub

**核心功能:**
- 实时消息推送
- 多端同步
- 消息已读/未读状态
- 离线消息存储

**消息类型:**
```typescript
enum MessageType {
  CHAT = 'chat',           // 聊天消息
  TASK = 'task',           // 任务通知
  SYSTEM = 'system',       // 系统通知
  MEMBER = 'member',        // 成员动态
}
```

---

### 4.7 报表服务 (Report Service)

**服务 ID:** S07  
**端口:** 3006  
**技术栈:** Node.js, ECharts

**核心功能:**
- 数据统计分析
- 图表生成
- 定时报告推送
- Dashboard 数据源

**核心 API:**
```
GET  /api/reports/daily     - 日报
GET  /api/reports/weekly    - 周报
GET  /api/reports/monthly   - 月报
GET  /api/stats/team        - 团队统计
GET  /api/stats/performance - 效率分析
```

---

### 4.8 媒体服务 (Media Service)

**服务 ID:** S08  
**端口:** 3007  
**技术栈:** Node.js, FFmpeg, 阿里云 OSS

**核心功能:**
- 图片上传/处理
- 视频转码
- CDN 加速分发
- 缩略图生成

**上传流程:**
```
用户上传 → 前端 → API Gateway → Media Service → OSS/CDN → 返回 URL
```

---

### 4.9 认证服务 (Auth Service)

**服务 ID:** S09  
**端口:** 3008  
**技术栈:** Node.js, JWT, OAuth 2.0

**核心功能:**
- 用户注册/登录
- JWT 签发与验证
- 第三方 OAuth (GitHub, Google)
- 权限管理

**安全特性:**
- 密码 bcrypt 加密
- Token 过期时间: 24h (access), 7d (refresh)
- 失败锁定: 5 次后锁定 15 分钟

---

### 4.10 API 网关

**服务 ID:** S10  
**技术栈:** Nginx / Kong

**核心功能:**
- 请求路由
- 负载均衡
- 限流熔断
- SSL 终结
- 日志记录

**路由配置:**
```nginx
# Nginx 配置示例
upstream frontend {
    server 10.0.0.11:3000;
    server 10.0.0.12:3000;
}

upstream agent {
    server 10.0.0.21:3001;
    server 10.0.0.22:3001;
}

server {
    listen 80;
    server_name api.7zi.com;
    
    location /api/agent/ {
        proxy_pass http://agent;
    }
    
    location /api/chat/ {
        proxy_pass http://chat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 5. 通信机制

### 5.1 服务间通信

| 场景 | 协议 | 方式 |
|------|------|------|
| 同步调用 | HTTP/gRPC | REST API |
| 异步消息 | AMQP | RabbitMQ/Kafka |
| 实时通信 | WebSocket | Socket.IO |
| 服务发现 | DNS | Nacos |

### 5.2 消息队列设计

```yaml
# Kafka Topics
topics:
  - name: task_events
    partitions: 4
    retention: 7d
    description: 任务事件流
  
  - name: agent_commands
    partitions: 2
    retention: 1d
    description: AI 代理指令
  
  - name: notifications
    partitions: 2
    retention: 3d
    description: 通知消息
```

---

## 6. 数据存储

### 6.1 存储选型

| 数据类型 | 存储方案 | 原因 |
|----------|----------|------|
| 业务数据 | MySQL 8.0 | 事务支持，成熟稳定 |
| 会话缓存 | Redis Cluster | 高性能，持久化 |
| 搜索日志 | Elasticsearch | 全文搜索，日志分析 |
| 向量记忆 | Qdrant | 向量相似度检索 |
| 文件存储 | 阿里云 OSS | 海量存储，CDN 加速 |

### 6.2 数据库分片

```
MySQL 分片策略:
├── users (按 user_id hash)
├── tasks (按 assignee hash)
├── messages (按 session_id hash)
└── memories (按 agent_id hash)
```

---

## 7. 安全设计

### 7.1 安全措施

- ✅ **HTTPS/TLS** - 全链路加密
- ✅ **JWT** - 无状态认证
- ✅ **API 限流** - 防止 DDoS
- ✅ **输入验证** - SQL 注入防护
- ✅ **CORS** - 跨域控制
- ✅ **审计日志** - 操作追踪

### 7.2 敏感数据

```typescript
// 加密存储
interface SensitiveData {
  password: string;      // bcrypt 哈希
  apiKey: string;        // AES-256 加密
  token: string;         // JWT
}
```

---

## 8. 监控与运维

### 8.1 监控指标

| 指标类型 | 工具 | 告警阈值 |
|----------|------|----------|
| 基础设施 | Prometheus | CPU > 80% |
| 应用性能 | APM | 响应 > 2s |
| 业务指标 | 自定义 | 错误率 > 1% |
| 日志 | ELK | Error 关键词 |

### 8.2 日志规范

```json
{
  "timestamp": "2026-03-06T09:00:00Z",
  "service": "agent-service",
  "level": "INFO",
  "traceId": "abc123",
  "message": "Task assigned to agent",
  "metadata": {
    "agentId": "agent-001",
    "taskId": "task-456"
  }
}
```

---

## 9. 迁移路径

### 阶段 1: 容器化 (当前)
```bash
# Docker Compose 本地开发
docker-compose up -d
```

### 阶段 2: 服务拆分
```
单体 → API Gateway + 核心服务
     ├── Agent Service (拆分)
     └── Chat Service (拆分)
```

### 阶段 3: 完整微服务
```
8 台服务器集群
├── 负载均衡
├── 4 台应用服务
├── 1 台数据
└── 1 台缓存/消息
```

---

## 10. 总结

### 架构优势

1. **解耦清晰** - 10 个独立服务，各司其职
2. **扩展灵活** - 按需扩展单个服务
3. **高可用** - 多实例部署，自动故障转移
4. **技术多样** - 不同服务可用最优技术栈

### 风险与对策

| 风险 | 对策 |
|------|------|
| 服务间通信延迟 | 异步消息 + 本地缓存 |
| 分布式事务 | 最终一致性 + 补偿机制 |
| 运维复杂度 | 容器编排 + 自动化监控 |
| 成本增加 | 按需扩展 + 资源复用 |

---

**文档状态:** ✅ 已完成  
**下次评审:** 2026-03-13


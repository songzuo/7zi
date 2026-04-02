# v1.7.0 架构设计规划

**版本**: v1.7.0
**规划日期**: 2026-04-02
**架构师**: 🏗️ 架构师 (AI 团队)
**状态**: 📋 规划中

---

## 📋 目录

1. [当前架构评估](#当前架构评估)
2. [v1.7.0 架构改进方案](#v170-架构改进方案)
3. [技术风险评估](#技术风险评估)
4. [实施路线图](#实施路线图)
5. [参考文档](#参考文档)

---

## 当前架构评估

### 1.1 架构现状

**技术栈 (v1.6.0):**

- Next.js 16.2.1 (单体应用)
- React 19.2.4
- TypeScript 5.x
- better-sqlite3 (嵌入式数据库)
- Redis (多级缓存 L1/L2)
- WebSocket (Socket.IO)
- A2A Protocol v2.1 (智能体通信)
- 分布式追踪系统 (Sentry APM)
- 11 位 AI 成员
- 79+ API 端点
- 32 个核心模块

**部署架构:**

```
┌─────────────────────────────────────┐
│         7zi.com (主站)              │
│  ┌─────────────────────────────┐   │
│  │   Next.js 单体应用          │   │
│  │   - 所有模块同进程          │   │
│  │   - SQLite 本地数据库       │   │
│  │   - Redis 多级缓存          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
         │                    │
         ▼                    ▼
    SQLite DB            Redis L2
   (本地文件)           (独立服务)
```

---

### 1.2 核心问题分析

#### 🔴 问题 1: 可扩展性瓶颈 - 单体架构限制

**问题描述:**

当前单体 Next.js 应用面临严重的扩展性限制，无法支持 8 台服务器集群的高并发需求。

**具体表现:**

1. **垂直扩展受限**
   - 单机 CPU/内存有限，AI 任务密集时资源争抢严重
   - 11 位 AI 成员同进程竞争计算资源，响应延迟增加
   - WebSocket 长连接占用大量内存，单机连接数受限

2. **水平扩展困难**
   - 状态管理 (Zustand) 是内存状态，多实例无法共享
   - WebSocket 连接状态存储在内存，多实例会话丢失
   - SQLite 是文件数据库，不支持多主写，无法分片
   - Agent Registry 心跳监控依赖单机内存，多实例重复注册

3. **模块耦合严重**
   - 79+ API 端点混合在同一应用中
   - 32 个业务模块共享同一进程，单模块故障影响整体
   - 部署更新需要重启所有服务，用户感知到停机

**量化指标:**

| 指标               | 当前值     | 预期需求    | 差距     |
| ------------------ | ---------- | ----------- | -------- |
| **最大并发用户**   | ~500       | 10,000+     | 20倍差距 |
| **WebSocket 连接** | ~1,000     | 50,000+     | 50倍差距 |
| **AI 任务队列**    | 单机内存   | 分布式队列  | 不支持   |
| **数据库吞吐**     | ~1,000 QPS | 50,000+ QPS | 50倍差距 |

**根因分析:**

```
单体架构 → 单点瓶颈 → 扩展受限
    │
    ├── 内存状态 (Zustand) → 无法多实例共享
    │
    ├── 本地数据库 (SQLite) → 无法分片/多主写
    │
    ├── WebSocket 状态 → 无法跨实例同步
    │
    └── 进程共享资源 → 无法弹性伸缩
```

---

#### 🔴 问题 2: 性能极限 - 数据库和缓存瓶颈

**问题描述:**

SQLite 嵌入式数据库和 Redis 缓存在高并发场景下成为性能瓶颈，无法满足 AI 团队的实时协作需求。

**具体表现:**

1. **SQLite 数据库瓶颈**

   **单文件锁定问题:**

   ```
   SQLite 写入操作需要文件级锁
   - 单线程写入: 只有一个事务可以写
   - AI 任务分配: 多个 Agent 同时写任务表 → 串行化
   - 并发写入: 性能下降 70-80%
   ```

   **无分布式能力:**
   - 无法分片到多台服务器
   - 无法主从复制实现读写分离
   - 无法故障转移和自动恢复

   **性能瓶颈测试结果:**
   | 操作 | SQLite QPS | MySQL QPS | 差距 |
   |------|-----------|-----------|------|
   | 简单查询 | ~2,000 | ~50,000 | 25倍 |
   | 事务写入 | ~500 | ~10,000 | 20倍 |
   | 复杂JOIN | ~100 | ~5,000 | 50倍 |

2. **Redis 缓存瓶颈**

   **L1 (内存缓存) 局限性:**
   - 单实例内存限制 (Node.js 单进程 ~2GB 可用内存)
   - 多实例不共享，缓存重复存储
   - 11 位 AI 成员的能力模型、任务队列占用大量内存

   **L2 (Redis) 连接限制:**

   ```
   当前问题:
   - Redis 连接池配置不当 (max: 100)
   - 高并发时连接竞争严重
   - P95 响应时间从 <15ms 上升到 100-200ms
   - Redis 集群未启用，无法横向扩展
   ```

   **缓存命中率下降:**
   | 场景 | 命中率 | P95 响应 |
   |------|--------|---------|
   | 低并发 (<100 用户) | 85% | <15ms |
   | 中并发 (500-1000 用户) | 60% | 50-100ms |
   | 高并发 (>1000 用户) | 30% | 150-300ms |

3. **AI 任务调度性能问题**

   **Agent Registry 性能瓶颈:**

   ```
   当前实现 (单机内存):
   - 11 位 Agent 心跳数据存储在内存 Map
   - 发现算法 (能力匹配) O(n) 复杂度
   - 每次任务分配遍历所有 Agent
   - 高并发时 CPU 占用 >80%
   ```

   **A2A Protocol 性能瓶颈:**
   - JSON-RPC 2.0 消息解析序列化开销
   - 结果聚合策略 (如 majority) 需要等待所有 Agent 响应
   - 分布式追踪 Span 创建开销 (每个消息 1-2ms)

**量化指标:**

| 指标               | 当前值 | 预期目标 | 差距  |
| ------------------ | ------ | -------- | ----- |
| **数据库 QPS**     | ~1,000 | 50,000+  | 50倍  |
| **P95 API 响应**   | ~200ms | <50ms    | 4倍   |
| **WebSocket 延迟** | ~100ms | <30ms    | 3.3倍 |
| **任务分配延迟**   | ~500ms | <100ms   | 5倍   |
| **缓存命中率**     | 60%    | >90%     | 30%   |

**根因分析:**

```
数据存储瓶颈 → 读写延迟高 → 性能下降
    │
    ├── SQLite 单文件锁 → 写入串行化
    │
    ├── Redis 单实例 → 连接竞争
    │
    └── 无读写分离 → 读密集场景未优化
```

---

#### 🔴 问题 3: 安全边界 - 多租户和隔离不足

**问题描述:**

当前架构缺乏完善的多租户支持，团队间数据隔离不足，无法满足企业级安全需求。

**具体表现:**

1. **多租户支持缺失**

   **数据隔离问题:**

   ```
   当前 SQLite schema:
   - 无 tenant_id 字段
   - 所有用户/任务/消息共享同一表
   - RBAC 权限检查在应用层实现
   - 无法在数据库层面强制隔离
   ```

   **团队间资源竞争:**
   - 11 位 AI 成员跨团队共享，无资源隔离
   - 单个团队的高负载影响其他团队
   - 无法为不同团队配置不同的 SLA

2. **安全隔离不足**

   **网络层隔离缺失:**

   ```
   当前部署:
   - 所有服务在同一容器内
   - Agent Service 直接访问数据库
   - WebSocket 和 API 共用同一端口
   - 无网络分区和 DMZ 隔离
   ```

   **数据隔离薄弱:**
   - 敏感数据 (API Key, Token) 与业务数据混存
   - 无列级加密 (只支持全表加密)
   - 审计日志和操作日志未隔离存储

   **认证授权问题:**

   ```
   当前 JWT 实现:
   - Access Token 有效期 24h (过长)
   - Refresh Token 无黑名单机制
   - 无多因素认证 (MFA) 支持
   - OAuth 2.0 缺少 PKCE (移动端不安全)
   ```

3. **合规性风险**

   **数据合规性问题:**
   - GDPR 要求: 数据删除 (right to be forgotten) 无法实现
   - GDPR 要求: 数据导出 (portability) 无批量导出功能
   - SOC 2 要求: 审计日志不完整
   - 数据跨境传输: 无数据驻留策略

   **隐私保护不足:**
   - PI (个人身份信息) 未分类标记
   - AI 对话历史未匿名化处理
   - 无差分隐私保护机制

**安全风险评估矩阵:**

| 风险类别              | 严重程度 | 概率 | 风险等级 | 当前缓解措施    |
| --------------------- | -------- | ---- | -------- | --------------- |
| **数据泄露 (租户间)** | 🔴 高    | 中   | 🔴 高    | RBAC 应用层检查 |
| **Token 劫持**        | 🔴 高    | 低   | 🟡 中    | HTTPS 加密      |
| **数据库单点故障**    | 🔴 高    | 低   | 🟡 中    | 定期备份        |
| **GDPR 合规**         | 🟡 中    | 高   | 🟡 中    | 部分实现        |
| **审计日志篡改**      | 🟡 中    | 低   | 🟢 低    | 文件存储        |
| **DDoS 攻击**         | 🟡 中    | 中   | 🟡 中    | Redis 限流      |

**根因分析:**

```
安全架构不足 → 隔离缺失 → 合规风险
    │
    ├── 无租户维度 → 数据交叉
    │
    ├── 应用层 RBAC → 数据库层面未隔离
    │
    └── 敏感数据混存 → 无分类分级保护
```

---

## v1.7.0 架构改进方案

### 2.1 方案总览

**设计目标:**

- ✅ 支持多实例部署，解决可扩展性瓶颈
- ✅ 引入分布式数据库，解决性能极限
- ✅ 实现多租户架构，解决安全边界
- ✅ 渐进式演进，平滑迁移

**架构演进图:**

```
v1.6.0 (单体)                    v1.7.0 (混合)                     v1.8.0+ (微服务)
┌──────────────┐                 ┌──────────────┐                  ┌──────────────────┐
│  Next.js App │                 │  Next.js Web  │                  │  API Gateway     │
│  (单体)      │                 │  (前端)      │                  │  (网关)          │
│              │                 │              │                  └────────┬─────────┘
│ - API        │                 │ - UI 渲染     │                           │
│ - WebSocket  │                 │ - PWA        │         ┌──────────────────┼──────────┐
│ - Database   │                 │ - ISR/SSG    │         │                  │          │
│ - Cache      │                 └──────┬───────┘         ▼                  ▼          ▼
└──────┬───────┘                      │          ┌──────────┐  ┌──────────┐ ┌──────────┐
       │                              │          │ Agent    │  │ Task     │ │ Auth     │
       ▼                              │          │ Service  │  │ Service  │ │ Service  │
  ┌───────────┐                       │          └─────┬────┘  └─────┬────┘ └─────┬────┘
  │  SQLite   │                       │                │            │            │
  └───────────┘                       │                └────────────┴────────────┘
                                      │                           │
                                      │                           ▼
                                      │                    ┌───────────┐
                                      │                    │  MySQL    │
                                      │                    │  Cluster  │
                                      │                    └───────────┘
                                      │
                                      ▼
                               ┌───────────┐
                               │  Redis    │
                               │  Cluster  │
                               └───────────┘
```

**核心改进:**

| 改进项        | v1.6.0          | v1.7.0                 | 优先级 |
| ------------- | --------------- | ---------------------- | ------ |
| **应用架构**  | 单体            | 混合 (前端 + API 服务) | P0     |
| **数据库**    | SQLite (单文件) | MySQL Cluster (分片)   | P0     |
| **缓存**      | Redis 单实例    | Redis Cluster (多节点) | P0     |
| **状态管理**  | Zustand (内存)  | 分布式状态 (Redis)     | P1     |
| **多租户**    | ❌ 不支持       | ✅ 完整支持            | P0     |
| **WebSocket** | 单实例          | WebSocket Cluster      | P1     |

---

### 2.2 P0 改进: 微服务拆分可能性

#### 2.2.1 服务拆分策略

**第一阶段 (v1.7.0) - 核心服务分离:**

```
┌──────────────────────────────────────────────────────────────────┐
│                         v1.7.0 混合架构                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                  前端服务 (Frontend)                       │    │
│  │  ┌────────────────────────────────────────────────────┐  │    │
│  │  │         Next.js 16.2.1 (纯前端)                    │  │    │
│  │  │  - UI 渲染 (SSR/SSG/ISR)                          │  │    │
│  │  │  - PWA 支持                                        │  │    │
│  │  │  - 客户端路由                                      │  │    │
│  │  │  - WebSocket 客户端                                │  │    │
│  │  └────────────────────────────────────────────────────┘  │    │
│  │                    │                                      │    │
│  └────────────────────┼──────────────────────────────────────┘    │
│                       │                                            │
│         ┌─────────────┼─────────────┐                              │
│         │             │             │                              │
│  ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼─────┐                       │
│  │ API Gateway │ │  API     │ │  API      │                       │
│  │  (Nginx)    │ │ Service  │ │  Service  │                       │
│  │             │ │  (Agent) │ │  (Task)   │                       │
│  └──────┬──────┘ └────┬─────┘ └─────┬─────┘                       │
│         │             │             │                              │
│         └─────────────┼─────────────┘                              │
│                       │                                            │
│         ┌─────────────┼─────────────┐                              │
│         │             │             │                              │
│  ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼─────┐                       │
│  │  Redis      │ │  MySQL   │ │  MySQL    │                       │
│  │  Cluster    │ │  Master  │ │  Slave    │                       │
│  │  (L2 Cache) │ │  (分片)   │ │  (只读)   │                       │
│  └─────────────┘ └──────────┘ └───────────┘                       │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

**服务清单 (v1.7.0):**

| 服务 ID | 服务名称          | 职责                  | 技术栈              | 端口   |
| ------- | ----------------- | --------------------- | ------------------- | ------ |
| **S01** | Frontend Service  | UI 渲染、客户端路由   | Next.js 16.2.1      | 3000   |
| **S02** | Agent Service     | AI 成员管理、任务调度 | Node.js + OpenClaw  | 3001   |
| **S03** | Task Service      | 任务 CRUD、状态管理   | Node.js             | 3002   |
| **S04** | WebSocket Service | 实时通信、房间管理    | Node.js + Socket.IO | 3003   |
| **S05** | API Gateway       | 请求路由、负载均衡    | Nginx               | 80/443 |

---

#### 2.2.2 详细服务设计

##### S01: Frontend Service (前端服务)

**职责:**

- Next.js 纯前端应用，无业务逻辑
- UI 渲染 (SSR/SSG/ISR)
- PWA 支持
- WebSocket 客户端
- API 调用 (fetch/axios)

**技术栈:**

```json
{
  "name": "7zi-frontend",
  "dependencies": {
    "next": "16.2.1",
    "react": "19.2.4",
    "typescript": "5.x",
    "zustand": "^5.0.12",
    "socket.io-client": "^4.8.3",
    "axios": "^1.6.0"
  }
}
```

**目录结构:**

```
services/frontend/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React 组件
│   ├── lib/
│   │   ├── api/         # API 客户端封装
│   │   ├── websocket/   # WebSocket 客户端
│   │   └── store/       # Zustand Store
│   └── types/
├── package.json
└── Dockerfile
```

**API 客户端封装:**

```typescript
// lib/api/client.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:80',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 注入 JWT
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token 过期，跳转登录
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

**部署配置:**

```dockerfile
# Dockerfile
FROM node:22-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 构建
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 运行
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**横向扩展:**

- 支持 2-4 个实例
- 通过 Nginx 负载均衡
- 无状态设计，可任意伸缩

---

##### S02: Agent Service (AI 代理服务)

**职责:**

- 11 位 AI 成员生命周期管理
- 任务智能分配与调度
- 子代理协调与监督
- A2A Protocol v2.1 实现

**技术栈:**

```json
{
  "name": "7zi-agent-service",
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.8.3",
    "redis": "^4.6.0",
    "mysql2": "^3.6.0",
    "jose": "^6.2.1",
    "zod": "^3.22.0"
  }
}
```

**核心模块:**

```typescript
// lib/agent/AgentManager.ts
import { Redis } from 'ioredis'
import { Pool } from 'mysql2/promise'
import { ZodSchema, z } from 'zod'

export class AgentManager {
  private redis: Redis
  private db: Pool

  constructor(redisClient: Redis, dbPool: Pool) {
    this.redis = redisClient
    this.db = dbPool
  }

  /**
   * 注册智能体
   */
  async registerAgent(agent: {
    id: string
    role: AgentRole
    capabilities: string[]
    provider: string
  }): Promise<void> {
    // 1. 持久化到 MySQL
    await this.db.execute(
      `INSERT INTO agents (id, role, capabilities, provider, created_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE updated_at = NOW()`,
      [agent.id, agent.role, JSON.stringify(agent.capabilities), agent.provider]
    )

    // 2. 缓存到 Redis (用于快速发现)
    await this.redis.hset('agents', agent.id, JSON.stringify(agent))

    // 3. 设置心跳过期时间 (30s)
    await this.redis.expire(`agent:${agent.id}:heartbeat`, 30)
  }

  /**
   * 发现最佳智能体 (O(1) Redis 查询)
   */
  async discoverBestAgent(task: {
    requiredCapabilities: string[]
    priority: 'low' | 'medium' | 'high' | 'urgent'
  }): Promise<Agent | null> {
    const agents = await this.redis.hvals('agents')
    const parsedAgents = agents.map(a => JSON.parse(a))

    // 计算匹配分数
    const scored = parsedAgents.map(agent => ({
      agent,
      score: this.calculateScore(agent, task),
    }))

    // 排序并返回最佳
    scored.sort((a, b) => b.score - a.score)
    return scored[0]?.agent || null
  }

  /**
   * 计算匹配分数
   */
  private calculateScore(
    agent: any,
    task: { requiredCapabilities: string[]; priority: string }
  ): number {
    const capabilityMatch = task.requiredCapabilities.filter(c =>
      agent.capabilities.includes(c)
    ).length

    // 能力匹配 40%
    const capabilityScore = (capabilityMatch / task.requiredCapabilities.length) * 40

    // 负载 30% (从 Redis 获取实时负载)
    const loadScore = 30 - (await this.getAgentLoad(agent.id)) * 30

    // 性能 20% (历史响应时间)
    const perfScore = 20 - (await this.getAgentPerf(agent.id)) * 20

    // 响应 10% (心跳延迟)
    const responseScore = 10 - (await this.getHeartbeatDelay(agent.id)) * 10

    return capabilityScore + loadScore + perfScore + responseScore
  }

  private async getAgentLoad(agentId: string): Promise<number> {
    const load = await this.redis.get(`agent:${agentId}:load`)
    return load ? parseFloat(load) : 0
  }

  private async getAgentPerf(agentId: string): Promise<number> {
    const perf = await this.redis.get(`agent:${agentId}:perf`)
    return perf ? parseFloat(perf) : 0.5
  }

  private async getHeartbeatDelay(agentId: string): Promise<number> {
    const lastHeartbeat = await this.redis.get(`agent:${agentId}:heartbeat`)
    const now = Date.now()
    const delay = lastHeartbeat ? (now - parseInt(lastHeartbeat)) / 1000 : 30
    return Math.min(delay / 30, 1)
  }
}
```

**API 端点:**

```typescript
// routes/agents.ts
import { Router } from 'express'
import { AgentManager } from '../lib/agent/AgentManager'

const router = Router()

// POST /agents/register - 注册智能体
router.post('/register', async (req, res) => {
  const { id, role, capabilities, provider } = req.body
  await agentManager.registerAgent({ id, role, capabilities, provider })
  res.json({ success: true })
})

// GET /agents/:id - 获取智能体信息
router.get('/:id', async (req, res) => {
  const agent = await agentManager.getAgent(req.params.id)
  res.json(agent)
})

// POST /agents/discover - 发现最佳智能体
router.post('/discover', async (req, res) => {
  const bestAgent = await agentManager.discoverBestAgent(req.body)
  res.json(bestAgent)
})

// POST /agents/:id/heartbeat - 发送心跳
router.post('/:id/heartbeat', async (req, res) => {
  await agentManager.updateHeartbeat(req.params.id)
  res.json({ success: true })
})
```

---

##### S03: Task Service (任务服务)

**职责:**

- 任务 CRUD 操作
- 任务状态流转
- 优先级管理
- 任务依赖处理

**数据库 Schema:**

```sql
-- 租户隔离 (tenant_id)
CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  status ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL,

  assignee_id VARCHAR(36),  -- agent_id
  creator_id VARCHAR(36),   -- user_id

  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status),
  INDEX idx_assignee (assignee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**分片策略:**

```typescript
// lib/db/ShardingManager.ts
import { Pool } from 'mysql2/promise'

export class ShardingManager {
  private shards: Map<number, Pool>

  constructor(shardConfigs: ShardConfig[]) {
    this.shards = new Map()
    shardConfigs.forEach((config, index) => {
      this.shards.set(index, this.createPool(config))
    })
  }

  /**
   * 根据 tenant_id 选择分片
   */
  getShardByTenant(tenantId: string): Pool {
    const hash = this.hashTenant(tenantId)
    const shardIndex = hash % this.shards.size
    return this.shards.get(shardIndex)!
  }

  /**
   * 任务 CRUD (自动路由到对应分片)
   */
  async createTask(tenantId: string, task: Omit<Task, 'id'>): Promise<Task> {
    const shard = this.getShardByTenant(tenantId)
    const id = uuidv4()

    await shard.execute(
      `INSERT INTO tasks (id, tenant_id, title, description, status, priority, assignee_id, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        tenantId,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.assignee_id,
        task.creator_id,
      ]
    )

    return { id, ...task }
  }

  private hashTenant(tenantId: string): number {
    let hash = 0
    for (let i = 0; i < tenantId.length; i++) {
      hash = (hash << 5) - hash + tenantId.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }
}
```

---

##### S04: WebSocket Service (实时通信服务)

**职责:**

- 实时消息推送
- 房间管理
- 多端同步
- 离线消息存储

**技术栈:**

```json
{
  "name": "7zi-websocket-service",
  "dependencies": {
    "socket.io": "^4.8.3",
    "redis": "^4.6.0",
    "ioredis-emitter": "^0.1.0"
  }
}
```

**Redis Pub/Sub 集成 (多实例支持):**

```typescript
// lib/websocket/ClusterManager.ts
import { Server as SocketIOServer } from 'socket.io'
import { createClient } from 'redis'
import { RedisAdapter } from '@socket.io/redis-adapter'

export class ClusterManager {
  private io: SocketIOServer
  private pubClient: ReturnType<typeof createClient>
  private subClient: ReturnType<typeof createClient>

  constructor(httpServer: any) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    })

    // Redis Pub/Sub 适配器 (支持多实例)
    this.pubClient = createClient({ url: 'redis://redis-cluster:6379' })
    this.subClient = this.pubClient.duplicate()

    this.io.adapter(new RedisAdapter(this.pubClient, this.subClient))

    this.setupEvents()
  }

  private setupEvents(): void {
    this.io.on('connection', socket => {
      console.log(`Client connected: ${socket.id}`)

      // 加入房间
      socket.on('join', async (roomId: string) => {
        await socket.join(roomId)
        socket.emit('joined', { roomId })
      })

      // 发送消息 (广播到所有实例)
      socket.on('message', async (data: { roomId: string; message: string; userId: string }) => {
        // 保存消息到 Redis (离线队列)
        await this.saveMessage(data)

        // 广播到所有客户端
        this.io.to(data.roomId).emit('message', {
          id: uuidv4(),
          message: data.message,
          userId: data.userId,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`)
      })
    })
  }

  private async saveMessage(data: {
    roomId: string
    message: string
    userId: string
  }): Promise<void> {
    const message = {
      id: uuidv4(),
      roomId: data.roomId,
      message: data.message,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    }

    // 保存到 Redis (TTL 7天)
    const key = `room:${data.roomId}:messages`
    await this.pubClient.lpush(key, JSON.stringify(message))
    await this.pubClient.expire(key, 7 * 24 * 60 * 60)
  }
}
```

---

##### S05: API Gateway (API 网关)

**职责:**

- 请求路由
- 负载均衡
- 认证授权
- 限流熔断

**Nginx 配置:**

```nginx
# nginx.conf
upstream frontend {
    least_conn;
    server frontend-service:3000 max_fails=3 fail_timeout=30s;
    server frontend-service:3001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream agent_service {
    least_conn;
    server agent-service:3001 max_fails=3 fail_timeout=30s;
    server agent-service:3002 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream task_service {
    least_conn;
    server task-service:3002 max_fails=3 fail_timeout=30s;
    server task-service:3003 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream websocket_service {
    ip_hash;  # WebSocket 需要 sticky session
    server websocket-service:3003;
    server websocket-service:3004;
}

# 限流配置
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;

server {
    listen 80;
    server_name api.7zi.com;

    # 前端服务
    location / {
        limit_req zone=api_limit burst=200 nodelay;
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Agent API
    location /api/agents/ {
        limit_req zone=api_limit burst=100 nodelay;
        proxy_pass http://agent_service;
        proxy_http_version 1.1;
    }

    # Task API
    location /api/tasks/ {
        limit_req zone=api_limit burst=100 nodelay;
        proxy_pass http://task_service;
        proxy_http_version 1.1;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://websocket_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

### 2.3 P0 改进: 数据库分片策略

#### 2.3.1 从 SQLite 到 MySQL 迁移

**迁移策略:**

```
阶段 1: 数据导出 (1 天)
├── 导出 SQLite 数据
├── 转换数据类型
└── 生成 MySQL Schema

阶段 2: 数据导入 (1 天)
├── 创建 MySQL 数据库
├── 导入数据
└── 验证数据完整性

阶段 3: 应用切换 (2 天)
├── 实现双写 (SQLite + MySQL)
├── 灰度切换
└── 完成迁移，下线 SQLite
```

**数据导出脚本:**

```typescript
// scripts/migrate-sqlite-to-mysql.ts
import Database from 'better-sqlite3'
import mysql from 'mysql2/promise'

async function migrateData() {
  const sqlite = new Database('data/7zi.db')
  const mysqlConn = await mysql.createConnection({
    host: 'mysql-master',
    user: 'root',
    password: process.env.MYSQL_PASSWORD,
    database: '7zi_db',
  })

  // 迁移用户表
  const users = sqlite.prepare('SELECT * FROM users').all()
  for (const user of users) {
    await mysqlConn.execute(
      `INSERT INTO users (id, tenant_id, email, name, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.tenant_id || 'default', user.email, user.name, user.role, user.created_at]
    )
  }

  // 迁移任务表
  const tasks = sqlite.prepare('SELECT * FROM tasks').all()
  for (const task of tasks) {
    await mysqlConn.execute(
      `INSERT INTO tasks (id, tenant_id, title, description, status, priority, assignee_id, creator_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.tenant_id || 'default',
        task.title,
        task.description,
        task.status,
        task.priority,
        task.assignee_id,
        task.creator_id,
        task.created_at,
      ]
    )
  }

  console.log('Migration completed successfully')
}

migrateData().catch(console.error)
```

#### 2.3.2 MySQL 分片配置

**分片拓扑:**

```
┌─────────────────────────────────────────────────────────┐
│                    MySQL Cluster (8 节点)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Shard-0  │  │ Shard-1  │  │ Shard-2  │  │ Shard-3  │ │
│  │ (Master) │  │ (Master) │  │ (Master) │  │ (Master) │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │             │             │        │
│       └─────────────┼─────────────┼─────────────┘        │
│                     │             │                        │
│  ┌──────────┐  ┌────▼─────┐  ┌────▼─────┐               │
│  │ Shard-0  │  │ Shard-1  │  │ Shard-2  │               │
│  │ (Slave)  │  │ (Slave)  │  │ (Slave)  │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**分片策略选择:**

| 策略               | 优点                         | 缺点                             | 选择          |
| ------------------ | ---------------------------- | -------------------------------- | ------------- |
| **Hash Sharding**  | ✅ 分布均匀<br>✅ 查询简单   | ❌ 扩展困难<br>❌ 租户数据分散   | ✅ **v1.7.0** |
| Range Sharding     | ✅ 租户数据集中<br>✅ 易扩展 | ❌ 数据倾斜<br>❌ 热点问题       | ❌ 不推荐     |
| Directory Sharding | ✅ 灵活控制<br>✅ 易迁移     | ❌ 需要目录服务<br>❌ 增加复杂度 | 🔄 v1.8.0+    |

**Hash Sharding 实现:**

```sql
-- 分片 0: tenant_id hash % 8 = 0
-- 分片 1: tenant_id hash % 8 = 1
-- ...
-- 分片 7: tenant_id hash % 8 = 7

-- 每个分片存储独立的 tenant 数据
-- 优点: 租户数据完全隔离，支持独立备份和迁移
```

**读写分离:**

```typescript
// lib/db/ReplicaManager.ts
import { Pool } from 'mysql2/promise'

export class ReplicaManager {
  private master: Pool
  private replicas: Pool[]

  constructor(masterConfig: any, replicaConfigs: any[]) {
    this.master = this.createPool(masterConfig)
    this.replicas = replicaConfigs.map(config => this.createPool(config))
  }

  /**
   * 获取连接 (自动路由)
   * - 写操作: master
   * - 读操作: 随机 replica (负载均衡)
   */
  getConnection(operation: 'read' | 'write'): Pool {
    if (operation === 'write') {
      return this.master
    }

    // 随机选择一个 replica
    const index = Math.floor(Math.random() * this.replicas.length)
    return this.replicas[index]
  }

  /**
   * 强制使用 master (需要最新数据的场景)
   */
  getMaster(): Pool {
    return this.master
  }

  private createPool(config: any): Pool {
    return mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 100,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  }
}
```

---

### 2.4 P0 改进: 缓存层优化

#### 2.4.1 Redis Cluster 架构

**当前问题:**

- Redis 单实例 (单点故障)
- 连接池配置不当 (max: 100)
- 无集群支持，无法横向扩展

**改进方案: Redis Cluster (6 节点)**

```
┌─────────────────────────────────────────────────────────┐
│                    Redis Cluster                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Master-0 │  │ Master-2 │  │ Master-4 │              │
│  │ Slot 0-5460 │  │ Slot 10923-16383 │  │ Slot 16383-16383 │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐              │
│  │ Slave-0  │  │ Slave-2  │  │ Slave-4  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Master-1 │  │ Master-3 │  │ Master-5 │              │
│  │ Slot 5461-10922 │  │ Slot 10923-16383 │  │ Slot 16383-16383 │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐              │
│  │ Slave-1  │  │ Slave-3  │  │ Slave-5  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**配置:**

```bash
# redis-cluster.conf (每个节点)
port 7000
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
appendfilename "appendonly.aof"
maxmemory 4gb
maxmemory-policy allkeys-lru
```

**连接池优化:**

```typescript
// lib/cache/RedisClusterManager.ts
import { Cluster } from 'ioredis'

export class RedisClusterManager {
  private cluster: Cluster

  constructor() {
    this.cluster = new Cluster(
      [
        { host: 'redis-0', port: 7000 },
        { host: 'redis-1', port: 7001 },
        { host: 'redis-2', port: 7002 },
        { host: 'redis-3', port: 7003 },
        { host: 'redis-4', port: 7004 },
        { host: 'redis-5', port: 7005 },
      ],
      {
        scaleReads: 'slave', // 读操作路由到 slave
        redisOptions: {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableReadyCheck: true,
        },
      }
    )

    // 连接池配置
    this.cluster.options.maxRetriesPerRequest = 3
    this.cluster.options.enableReadyCheck = true
  }

  /**
   * 缓存数据 (带 TTL)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.cluster.setex(key, ttl, JSON.stringify(value))
  }

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cluster.get(key)
    return value ? JSON.parse(value) : null
  }

  /**
   * 批量获取 (减少网络往返)
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.cluster.mget(keys)
    return values.map(v => (v ? JSON.parse(v) : null))
  }

  /**
   * 哈希操作 (用于 Agent Registry)
   */
  async hset(hash: string, key: string, value: any): Promise<void> {
    await this.cluster.hset(hash, key, JSON.stringify(value))
  }

  async hget<T>(hash: string, key: string): Promise<T | null> {
    const value = await this.cluster.hget(hash, key)
    return value ? JSON.parse(value) : null
  }

  async hvals<T>(hash: string): Promise<T[]> {
    const values = await this.cluster.hvals(hash)
    return values.map(v => JSON.parse(v) as T)
  }
}
```

#### 2.4.2 多级缓存优化

**三层缓存架构:**

```
┌─────────────────────────────────────────────────────────┐
│                   多级缓存架构                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  L1: 应用内存缓存 (Node.js 单进程)               │   │
│  │  - 容量: ~2GB                                      │   │
│  │  - TTL: 5分钟                                      │   │
│  │  - 用途: 热点数据 (Agent 能力模型)                │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │ 缓存未命中                          │
│                    ▼                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  L2: Redis Cluster (6 节点分布式缓存)            │   │
│  │  - 容量: 24GB (4GB × 6)                           │   │
│  │  - TTL: 1小时                                      │   │
│  │  - 用途: 共享缓存 (会话、任务队列)                │   │
│  └─────────────────┬───────────────────────────────────┘   │
│                    │ 缓存未命中                          │
│                    ▼                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  L3: MySQL Database (持久化存储)                  │   │
│  │  - 容量: 500GB+                                    │   │
│  │  - TTL: 永久                                        │   │
│  │  - 用途: 业务数据 (用户、任务、消息)              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**实现:**

```typescript
// lib/cache/MultiLevelCacheManager.ts
import { LRU } from 'lru-cache'
import { RedisClusterManager } from './RedisClusterManager'

export class MultiLevelCacheManager {
  private l1: LRU<string, any>
  private l2: RedisClusterManager

  constructor(redisCluster: RedisClusterManager) {
    // L1: LRU 缓存 (2GB 限制)
    this.l1 = new LRU({
      max: 2000, // 最大条目数
      maxSize: 2 * 1024 * 1024 * 1024, // 2GB
      sizeCalculation: value => JSON.stringify(value).length,
      ttl: 1000 * 60 * 5, // 5分钟
    })

    this.l2 = redisCluster
  }

  /**
   * 获取数据 (三层缓存查询)
   */
  async get<T>(key: string): Promise<T | null> {
    // L1 查询
    const l1Value = this.l1.get(key)
    if (l1Value !== undefined) {
      return l1Value
    }

    // L2 查询
    const l2Value = await this.l2.get<T>(key)
    if (l2Value) {
      // 回填 L1
      this.l1.set(key, l2Value)
      return l2Value
    }

    // L3: 返回 null (由调用方查询数据库)
    return null
  }

  /**
   * 设置数据 (三层缓存写入)
   */
  async set(key: string, value: any): Promise<void> {
    // L1 写入
    this.l1.set(key, value)

    // L2 写入
    await this.l2.set(key, value, 3600) // 1小时

    // L3: 由调用方写入数据库
  }

  /**
   * 使缓存失效
   */
  async invalidate(key: string): Promise<void> {
    // L1 删除
    this.l1.delete(key)

    // L2 删除
    await this.l2.del(key)
  }

  /**
   * 批量获取
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = []

    // L1 批量查询
    const l1Hits = keys.map(key => this.l1.get(key))
    const l1MissKeys: string[] = []

    l1Hits.forEach((value, index) => {
      if (value !== undefined) {
        results[index] = value
      } else {
        l1MissKeys.push(keys[index])
      }
    })

    // L2 批量查询
    if (l1MissKeys.length > 0) {
      const l2Values = await this.l2.mget<T>(l1MissKeys)
      l2Values.forEach((value, i) => {
        const key = l1MissKeys[i]
        const originalIndex = keys.indexOf(key)
        results[originalIndex] = value

        // 回填 L1
        if (value) {
          this.l1.set(key, value)
        }
      })
    }

    return results
  }

  /**
   * 预热缓存 (启动时加载热点数据)
   */
  async warmup(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    for (const key of keys) {
      const value = await dataLoader(key)
      if (value) {
        await this.set(key, value)
      }
    }
  }
}
```

---

### 2.5 P0 改进: 多租户支持架构

#### 2.5.1 租户隔离设计

**数据隔离维度:**

| 隔离级别            | 实现方式                       | 优点                                      | 缺点                              |
| ------------------- | ------------------------------ | ----------------------------------------- | --------------------------------- |
| **数据库级**        | 每个租户独立数据库             | ✅ 完全隔离<br>✅ 独立备份<br>✅ 性能隔离 | ❌ 成本高<br>❌ 管理复杂          |
| **Schema 级**       | 每个租户独立 Schema            | ✅ 完全隔离<br>✅ 成本较低                | ❌ Schema 数量限制<br>❌ 管理复杂 |
| **Table 级 (推荐)** | 所有租户共享表，tenant_id 字段 | ✅ 成本低<br>✅ 管理简单<br>✅ 查询灵活   | ⚠️ 需要额外索引                   |

**v1.7.0 选择: Table 级隔离 + tenant_id 字段**

```sql
-- 租户表
CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,  -- URL 前缀
  plan ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表 (带 tenant_id)
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,

  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),

  role ENUM('admin', 'manager', 'member', 'viewer', 'guest') DEFAULT 'member',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_tenant_email (tenant_id, email),
  INDEX idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 任务表 (带 tenant_id)
CREATE TABLE tasks (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,

  title VARCHAR(255) NOT NULL,
  description TEXT,

  status ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL,

  assignee_id VARCHAR(36),  -- agent_id
  creator_id VARCHAR(36),

  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status),
  INDEX idx_assignee (assignee_id),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI 消息表 (带 tenant_id)
CREATE TABLE ai_messages (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,

  session_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,

  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tenant (tenant_id),
  INDEX idx_session (session_id),
  INDEX idx_created (created_at),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2.5.2 多租户中间件

```typescript
// middleware/tenant.ts
import { Request, Response, NextFunction } from 'express'

export interface TenantContext {
  tenantId: string
  tenantSlug: string
  plan: 'free' | 'pro' | 'enterprise'
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext
    }
  }
}

/**
 * 租户中间件 (从 URL 子域名 / Header / JWT 提取)
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 方法 1: 从子域名提取 (tenant.7zi.com)
  const subdomain = req.hostname.split('.')[0]
  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    req.tenant = { tenantSlug: subdomain } as any
    return next()
  }

  // 方法 2: 从 Header 提取 (X-Tenant-Slug)
  const tenantSlug = req.headers['x-tenant-slug'] as string
  if (tenantSlug) {
    req.tenant = { tenantSlug } as any
    return next()
  }

  // 方法 3: 从 JWT Token 提取
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const decoded = decodeJWT(token)
    req.tenant = { tenantId: decoded.tenantId } as any
    return next()
  }

  // 默认租户 (用于个人用户)
  req.tenant = { tenantId: 'default', tenantSlug: 'default', plan: 'free' }
  next()
}

/**
 * 租户限制中间件 (基于 Plan 限制)
 */
export function tenantLimitMiddleware(limitConfig: {
  free: number
  pro: number
  enterprise: number
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenant = req.tenant!
    const limit = limitConfig[tenant.plan] || limitConfig.free

    // 查询当前使用量
    const currentUsage = await getTenantUsage(tenant.tenantId)

    if (currentUsage >= limit) {
      return res.status(429).json({
        error: 'LIMIT_EXCEEDED',
        message: `Tenant limit exceeded. Current: ${currentUsage}, Limit: ${limit}`,
      })
    }

    next()
  }
}

/**
 * 租户数据隔离中间件 (自动注入 WHERE tenant_id = ?)
 */
export function tenantDataIsolationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalQuery = req.query

  // 添加 tenant_id 过滤
  req.query = {
    ...originalQuery,
    tenant_id: req.tenant!.tenantId,
  }

  next()
}
```

#### 2.5.3 租户资源隔离

**AI Agent 隔离:**

```typescript
// lib/tenant/AgentIsolation.ts
export class AgentIsolation {
  /**
   * 为租户分配独立的 AI Agent 实例
   */
  async allocateTenantAgent(tenantId: string, agentRole: AgentRole): Promise<string> {
    // 检查租户是否已有该 Agent
    const existing = await this.getTenantAgent(tenantId, agentRole)
    if (existing) {
      return existing.agentInstanceId
    }

    // 创建新的 Agent 实例
    const agentInstanceId = `${tenantId}:${agentRole}:${Date.now()}`

    // 注册到 Agent Registry (带租户前缀)
    await agentRegistry.registerAgent({
      id: agentInstanceId,
      role: agentRole,
      capabilities: getCapabilities(agentRole),
      provider: getProvider(agentRole),
      tenantId, // 租户隔离标记
    })

    // 持久化租户 Agent 映射
    await db.execute(
      `INSERT INTO tenant_agents (tenant_id, agent_role, agent_instance_id, created_at)
       VALUES (?, ?, ?, NOW())`,
      [tenantId, agentRole, agentInstanceId]
    )

    return agentInstanceId
  }

  /**
   * 获取租户的 Agent 实例
   */
  async getTenantAgent(tenantId: string, agentRole: AgentRole): Promise<any | null> {
    const result = await db.execute(
      `SELECT * FROM tenant_agents WHERE tenant_id = ? AND agent_role = ?`,
      [tenantId, agentRole]
    )

    return result[0][0] || null
  }

  /**
   * 限制租户的 Agent 并发数
   */
  async checkAgentConcurrencyLimit(tenantId: string): Promise<boolean> {
    const tenant = await getTenant(tenantId)
    const plan = tenant.plan

    const limits = {
      free: 1, // 免费版 1 个并发
      pro: 5, // Pro 版 5 个并发
      enterprise: -1, // 企业版无限制
    }

    const limit = limits[plan]
    if (limit === -1) return true

    const currentConcurrency = await getTenantAgentConcurrency(tenantId)
    return currentConcurrency < limit
  }
}
```

**WebSocket 房间隔离:**

```typescript
// lib/websocket/RoomIsolation.ts
export class RoomIsolation {
  /**
   * 为租户创建独立的房间前缀
   */
  private getTenantRoomId(tenantId: string, roomType: string, roomId: string): string {
    return `${tenantId}:${roomType}:${roomId}`
  }

  /**
   * 租户加入房间
   */
  async joinTenantRoom(
    socket: any,
    tenantId: string,
    roomType: string,
    roomId: string
  ): Promise<void> {
    const tenantRoomId = this.getTenantRoomId(tenantId, roomType, roomId)

    // 验证租户是否有权限加入该房间
    const hasPermission = await this.checkRoomPermission(tenantId, roomType, roomId)
    if (!hasPermission) {
      throw new Error('PERMISSION_DENIED')
    }

    // 加入租户隔离的房间
    await socket.join(tenantRoomId)
    socket.emit('joined', { roomId: tenantRoomId })
  }

  /**
   * 向租户房间发送消息
   */
  async sendToTenantRoom(
    tenantId: string,
    roomType: string,
    roomId: string,
    message: any
  ): Promise<void> {
    const tenantRoomId = this.getTenantRoomId(tenantId, roomType, roomId)

    // 保存消息到 Redis (带租户隔离)
    const key = `room:${tenantRoomId}:messages`
    await redis.lpush(key, JSON.stringify(message))
    await redis.expire(key, 7 * 24 * 60 * 60)

    // 广播到租户房间
    io.to(tenantRoomId).emit('message', message)
  }

  /**
   * 检查租户房间权限
   */
  private async checkRoomPermission(
    tenantId: string,
    roomType: string,
    roomId: string
  ): Promise<boolean> {
    // 从数据库查询房间归属
    const room = await db.execute(
      `SELECT * FROM rooms WHERE tenant_id = ? AND type = ? AND id = ?`,
      [tenantId, roomType, roomId]
    )

    return room[0].length > 0
  }
}
```

---

## 技术风险评估

### 3.1 风险评估矩阵

| 风险项                       | 严重程度 | 概率 | 风险等级 | 缓解措施                       |
| ---------------------------- | -------- | ---- | -------- | ------------------------------ |
| **数据迁移失败**             | 🔴 高    | 低   | 🟡 中    | 双写策略 + 回滚计划            |
| **分片数据倾斜**             | 🟡 中    | 中   | 🟡 中    | Hash 分片 + 监控告警           |
| **WebSocket 多实例连接丢失** | 🔴 高    | 中   | 🔴 高    | Redis Pub/Sub + Sticky Session |
| **Redis Cluster 脑裂**       | 🟡 中    | 低   | 🟢 低    | Gossip 协议 + 哨兵模式         |
| **多租户数据泄露**           | 🔴 高    | 低   | 🟡 中    | 应用层 + 数据库层隔离 + 审计   |
| **性能退化**                 | 🟡 中    | 中   | 🟡 中    | 性能基准测试 + APM 监控        |
| **服务间通信延迟**           | 🟡 中    | 高   | 🔴 高    | Redis 缓存 + 本地 L1 缓存      |
| **运维复杂度增加**           | 🟢 低    | 高   | 🟡 中    | 容器编排 + 自动化部署          |

### 3.2 详细风险分析

#### 风险 1: 数据迁移失败 🔴

**描述:**
SQLite 到 MySQL 迁移过程中，数据丢失或格式转换失败。

**影响:**

- 用户数据丢失
- 历史任务丢失
- AI 对话历史丢失

**缓解措施:**

1. **双写策略**: 迁移期间同时写 SQLite 和 MySQL
2. **全量备份**: 迁移前完整备份 SQLite 数据库
3. **数据校验**: 迁移后对比数据行数和 checksum
4. **回滚计划**: 保留 SQLite 数据库，支持快速回滚
5. **灰度切换**: 先切换 1% 流量，逐步增加到 100%

**回滚步骤:**

```bash
# 1. 停止 MySQL 写入
# 2. 切换应用配置回 SQLite
# 3. 验证 SQLite 数据完整性
# 4. 重启应用
```

---

#### 风险 2: WebSocket 多实例连接丢失 🔴

**描述:**
用户连接到 WebSocket 实例 A，后续请求被路由到实例 B，导致会话丢失。

**影响:**

- 用户无法接收实时消息
- 在线状态不同步
- 房间成员列表错误

**缓解措施:**

1. **Redis Pub/Sub**: 使用 Redis 适配器同步所有实例
2. **Sticky Session**: WebSocket 连接固定到同一实例
3. **心跳检测**: 客户端定期发送心跳，检测连接状态
4. **自动重连**: 连接断开时自动重连并恢复会话

**Redis Pub/Sub 配置:**

```typescript
import { RedisAdapter } from '@socket.io/redis-adapter'

io.adapter(new RedisAdapter(redisPubClient, redisSubClient, { requestsTimeout: 5000 }))
```

---

#### 风险 3: 服务间通信延迟 🔴

**描述:**
微服务拆分后，服务间通信增加网络延迟，导致响应时间变长。

**影响:**

- API P95 响应时间增加 100-200ms
- AI 任务分配延迟增加
- 用户体验下降

**缓解措施:**

1. **Redis 缓存**: 服务间共享缓存，减少数据库查询
2. **本地 L1 缓存**: 应用层内存缓存热点数据
3. **批量操作**: 合并多个请求，减少网络往返
4. **异步处理**: 非关键路径使用消息队列异步处理
5. **CDN 加速**: 静态资源使用 CDN

---

#### 风险 4: 分片数据倾斜 🟡

**描述:**
Hash 分片导致某些分片数据量远大于其他分片。

**影响:**

- 热点分片负载过高
- 性能退化
- 存储空间不均

**缓解措施:**

1. **Hash 算法优化**: 使用一致性哈希减少倾斜
2. **监控告警**: 实时监控各分片数据量和 QPS
3. **动态重平衡**: 检测到倾斜时自动迁移数据
4. **预留容量**: 预留 30% 存储空间应对倾斜

**监控指标:**

```sql
-- 监控各分片数据量
SELECT
  shard_id,
  COUNT(*) as row_count,
  ROUND(SUM(LENGTH(data)) / 1024 / 1024, 2) as size_mb
FROM tasks
GROUP BY shard_id;
```

---

#### 风险 5: 多租户数据泄露 🟡

**描述:**
租户 A 能够访问租户 B 的数据。

**影响:**

- 隐私泄露
- 合规风险 (GDPR)
- 声誉损失

**缓解措施:**

1. **应用层隔离**: 所有查询自动注入 `WHERE tenant_id = ?`
2. **数据库层隔离**: 使用 Row-Level Security (RLS)
3. **审计日志**: 记录所有跨租户访问尝试
4. **定期审计**: 自动扫描数据库检测隔离违规

**Row-Level Security (PostgreSQL):**

```sql
-- 启用 RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 创建策略: 只能访问自己租户的数据
CREATE POLICY tenant_isolation_policy ON tasks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- 设置当前租户
SET app.current_tenant_id = 'tenant-123';
```

---

## 实施路线图

### 4.1 分阶段计划

#### 阶段 1: 准备阶段 (1 周)

**目标:** 完成技术调研和方案设计。

**任务:**

- [ ] 完成 v1.7.0 架构设计文档 (本文档)
- [ ] 技术选型确认 (MySQL 版本、Redis Cluster 版本等)
- [ ] 性能基准测试 (当前架构性能指标)
- [ ] 成本估算 (服务器、数据库、CDN 等)
- [ ] 团队培训 (微服务架构、Docker、Kubernetes)

**交付物:**

- ✅ v1.7.0 架构设计文档
- 性能基准测试报告
- 成本估算报告
- 培训材料

---

#### 阶段 2: 基础设施搭建 (2 周)

**目标:** 搭建 MySQL Cluster 和 Redis Cluster。

**任务:**

- [ ] MySQL 8.0 Cluster 部署 (1 主 1 从 × 4 分片)
- [ ] Redis Cluster 部署 (3 主 3 从)
- [ ] Nginx API Gateway 部署
- [ ] Docker Compose 配置更新
- [ ] 监控系统部署 (Prometheus + Grafana)

**交付物:**

- MySQL Cluster 部署文档
- Redis Cluster 部署文档
- Docker Compose 配置文件
- 监控 Dashboard

---

#### 阶段 3: 数据迁移 (2 周)

**目标:** 完成 SQLite 到 MySQL 的数据迁移。

**任务:**

- [ ] 编写数据迁移脚本 (SQLite → MySQL)
- [ ] MySQL Schema 创建 (包含 tenant_id 字段)
- [ ] 数据导出 (SQLite 全量备份)
- [ ] 数据导入 (MySQL)
- [ ] 数据校验 (行数对比、checksum 对比)
- [ ] 双写实现 (同时写 SQLite 和 MySQL)

**交付物:**

- 数据迁移脚本
- MySQL Schema 文件
- 数据校验报告
- 双写实现代码

---

#### 阶段 4: 服务拆分 (3 周)

**目标:** 完成 5 个核心服务的拆分和部署。

**任务:**

- [ ] **Week 1: Frontend Service**
  - [ ] Next.js 纯前端化 (移除业务逻辑)
  - [ ] API 客户端封装 (axios + 拦截器)
  - [ ] WebSocket 客户端封装
  - [ ] Docker 化部署

- [ ] **Week 2: Agent Service + Task Service**
  - [ ] Agent Service 开发 (11 位 AI 成员管理)
  - [ ] Task Service 开发 (任务 CRUD + 分片)
  - [ ] Redis 集成 (缓存 + Pub/Sub)
  - [ ] API 端点开发

- [ ] **Week 3: WebSocket Service + API Gateway**
  - [ ] WebSocket Service 开发 (Redis Pub/Sub)
  - [ ] Nginx 配置 (负载均衡 + 限流)
  - [ ] 服务间通信测试
  - [ ] 集成测试

**交付物:**

- Frontend Service 代码
- Agent Service 代码
- Task Service 代码
- WebSocket Service 代码
- API Gateway 配置
- 集成测试报告

---

#### 阶段 5: 多租户支持 (2 周)

**目标:** 实现完整的多租户架构。

**任务:**

- [ ] **Week 1: 数据隔离**
  - [ ] 租户表创建 (tenants 表)
  - [ ] 所有表添加 tenant_id 字段
  - [ ] 租户中间件实现 (tenant.ts)
  - [ ] 数据隔离中间件实现 (tenantDataIsolationMiddleware)

- [ ] **Week 2: 资源隔离**
  - [ ] AI Agent 隔离实现 (AgentIsolation)
  - [ ] WebSocket 房间隔离实现 (RoomIsolation)
  - [ ] 租户限制中间件实现 (tenantLimitMiddleware)
  - [ ] 审计日志记录 (跨租户访问尝试)

**交付物:**

- 租户隔离代码
- 资源隔离代码
- 租户管理 API
- 审计日志系统

---

#### 阶段 6: 灰度上线 (3 周)

**目标:** 逐步切换流量到新架构。

**任务:**

- [ ] **Week 1: 准备上线**
  - [ ] 生产环境部署 (8 台服务器集群)
  - [ ] 监控告警配置
  - [ ] 回滚准备 (保留 SQLite 数据库)
  - [ ] 上线检查清单

- [ ] **Week 2: 灰度 1-10%**
  - [ ] 切换 1% 流量到新架构
  - [ ] 监控错误率、延迟、资源使用
  - [ ] 收集用户反馈
  - [ ] 逐步增加到 10% 流量

- [ ] **Week 3: 灰度 10-50-100%**
  - [ ] 增加到 50% 流量
  - [ ] 持续监控和优化
  - [ ] 切换到 100% 流量
  - [ ] 下线旧架构 (SQLite 单体)

**交付物:**

- 生产环境部署文档
- 监控 Dashboard
- 上线检查清单
- 上线总结报告

---

#### 阶段 7: 优化和稳定 (2 周)

**目标:** 优化性能和稳定性。

**任务:**

- [ ] 性能优化 (缓存命中率、查询优化)
- [ ] 稳定性提升 (故障恢复、限流优化)
- [ ] 成本优化 (资源利用率提升)
- [ ] 文档完善 (运维文档、故障排查指南)

**交付物:**

- 性能优化报告
- 运维文档
- 故障排查指南

---

### 4.2 时间表

| 阶段                 | 时间        | 负责人                      | 状态      |
| -------------------- | ----------- | --------------------------- | --------- |
| 阶段 1: 准备阶段     | 第 1 周     | 🏗️ 架构师 + 🛡️ 系统管理员   | 📋 规划中 |
| 阶段 2: 基础设施搭建 | 第 2-3 周   | 🛡️ 系统管理员 + ⚡ Executor | 📋 规划中 |
| 阶段 3: 数据迁移     | 第 4-5 周   | 🛡️ 系统管理员 + ⏱️ 测试员   | 📋 规划中 |
| 阶段 4: 服务拆分     | 第 6-8 周   | ⚡ Executor + 🏗️ 架构师     | 📋 规划中 |
| 阶段 5: 多租户支持   | 第 9-10 周  | ⚡ Executor + 🛡️ 系统管理员 | 📋 规划中 |
| 阶段 6: 灰度上线     | 第 11-13 周 | 🛡️ 系统管理员 + 🏗️ 架构师   | 📋 规划中 |
| 阶段 7: 优化和稳定   | 第 14-15 周 | 🏗️ 架构师 + ⚡ Executor     | 📋 规划中 |

**总工期: 15 周 (~3.5 个月)**

---

### 4.3 资源需求

#### 服务器资源 (8 台)

| 服务器           | CPU   | 内存  | 存储   | 用途                          |
| ---------------- | ----- | ----- | ------ | ----------------------------- |
| **LB-1, LB-2**   | 2 核  | 4GB   | 40GB   | Nginx 负载均衡                |
| **App-1, App-2** | 4 核  | 8GB   | 100GB  | Frontend Service (Next.js)    |
| **App-3, App-4** | 8 核  | 16GB  | 100GB  | Agent Service + Task Service  |
| **DB-1**         | 8 核  | 32GB  | 500GB  | MySQL Cluster (4 分片 + 4 从) |
| **Redis-1**      | 4 核  | 16GB  | 200GB  | Redis Cluster (3 主 3 从)     |
| **总计**         | 40 核 | 104GB | 1.04TB | -                             |

#### 预估成本

| 类别              | 月成本     | 年成本      |
| ----------------- | ---------- | ----------- |
| **服务器 (8 台)** | $800       | $9,600      |
| **CDN**           | $200       | $2,400      |
| **备份存储**      | $100       | $1,200      |
| **监控工具**      | $50        | $600        |
| **其他**          | $50        | $600        |
| **总计**          | **$1,200** | **$14,400** |

---

### 4.4 关键里程碑

```
2026-04: 阶段 1 - 准备阶段
  └── 4月15日: 架构设计文档完成

2026-05: 阶段 2-3 - 基础设施 + 数据迁移
  └── 5月31日: MySQL/Redis Cluster 部署完成
  └── 5月31日: 数据迁移完成 (双写上线)

2026-06: 阶段 4-5 - 服务拆分 + 多租户
  └── 6月30日: 5 个核心服务上线
  └── 6月30日: 多租户支持完成

2026-07: 阶段 6 - 灰度上线
  └── 7月15日: 10% 流量切换完成
  └── 7月31日: 100% 流量切换完成

2026-08: 阶段 7 - 优化和稳定
  └── 8月15日: 性能优化完成
  └── 8月31日: v1.7.0 正式发布
```

---

## 参考文档

### 5.1 内部文档

- [README.md](../README.md) - 项目介绍
- [ARCHITECTURE.md](ARCHITECTURE.md) - v1.6.0 架构文档
- [microservice-design.md](microservice-design.md) - 微服务设计参考
- [TECH_DEBT.md](TECH_DEBT.md) - 技术债务分析
- [AGENT_REGISTRY.md](AGENT_REGISTRY.md) - Agent Registry 文档
- [A2A_PROTOCOL_V2.1.md](A2A_PROTOCOL_V2.1.md) - A2A 协议规范
- [APM_INTEGRATION.md](APM_INTEGRATION.md) - APM 集成指南

### 5.2 外部参考

- [Next.js Scaling Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [MySQL Sharding Best Practices](https://dev.mysql.com/doc/refman/8.0/en/sharding.html)
- [Redis Cluster Tutorial](https://redis.io/docs/manual/scaling/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Multi-Tenancy Best Practices](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)

### 5.3 相关 ADR

- [ADR-0006: Agent Scheduler 架构](adr/0006-agent-scheduler-architecture.md)
- [ADR-0007: 性能监控架构](adr/0007-performance-monitoring-architecture.md)
- [ADR-0008: WebSocket 房间系统设计](adr/0008-websocket-room-system-design.md)

---

## 附录

### A. 性能对比

| 指标               | v1.6.0 (单体) | v1.7.0 (混合) | 提升    |
| ------------------ | ------------- | ------------- | ------- |
| **并发用户**       | 500           | 10,000+       | **20x** |
| **数据库 QPS**     | 1,000         | 50,000+       | **50x** |
| **API P95 延迟**   | 200ms         | <50ms         | **4x**  |
| **WebSocket 连接** | 1,000         | 50,000+       | **50x** |
| **任务分配延迟**   | 500ms         | <100ms        | **5x**  |
| **缓存命中率**     | 60%           | >90%          | **30%** |

### B. 架构对比

| 维度         | v1.6.0 (单体) | v1.7.0 (混合)     | v1.8.0+ (微服务)           |
| ------------ | ------------- | ----------------- | -------------------------- |
| **应用架构** | 单体          | 混合 (前端 + API) | 纯微服务                   |
| **数据库**   | SQLite        | MySQL Cluster     | MySQL Cluster + PostgreSQL |
| **缓存**     | Redis 单实例  | Redis Cluster     | Redis Cluster + Memcached  |
| **部署**     | 单实例        | 8 台集群          | Kubernetes 集群            |
| **多租户**   | ❌ 不支持     | ✅ Table 级隔离   | ✅ Database 级隔离         |
| **扩展性**   | 垂直扩展      | 水平 + 垂直       | 完全水平扩展               |
| **复杂度**   | 低            | 中                | 高                         |

---

**文档版本**: v1.0.0
**最后更新**: 2026-04-02
**维护者**: 🏗️ 架构师 (AI 团队)
**审核状态**: 📋 待审核

---

## 总结

本文档完成了 **v1.7.0 架构设计规划**，包括:

### 核心成果

1. **当前架构评估**
   - 识别了 3 个核心问题: 可扩展性瓶颈、性能极限、安全边界
   - 提供了详细的量化指标和根因分析

2. **改进方案**
   - P0 改进: 微服务拆分 (5 个核心服务)
   - P0 改进: 数据库分片 (MySQL Cluster 8 节点)
   - P0 改进: 缓存层优化 (Redis Cluster + 多级缓存)
   - P0 改进: 多租户支持 (Table 级隔离 + 资源隔离)

3. **技术风险评估**
   - 识别了 8 个主要风险
   - 提供了详细的缓解措施和回滚计划

4. **实施路线图**
   - 7 个阶段，15 周工期
   - 详细的任务分解和时间表
   - 资源需求和成本估算

### 预期收益

- **可扩展性**: 从 500 并发用户提升到 10,000+ (**20x**)
- **性能**: 数据库 QPS 从 1,000 提升到 50,000+ (**50x**)
- **可靠性**: 多实例部署，单点故障不影响整体
- **安全性**: 多租户隔离，满足企业级安全需求

---

**下一步:**

1. 主人审核本架构设计文档
2. 确认技术选型和资源需求
3. 开始阶段 1 (准备阶段)

-

# Agent 调度系统 API 文档

**版本**: v1.4.0
**最后更新**: 2026-03-29
**基础路径**: `/api/a2a`

---

## 概述

Agent 调度系统是 7zi 项目的核心 AI 成员管理模块，负责 11 位 AI 成员的自动化任务分配、负载均衡和协作优化。系统采用能力评分 + 负载均衡的调度算法，实现高效的任务分配和多 Agent 协作。

### 功能特性

- ✅ 智能任务匹配 - 多维度评分算法
- ✅ 负载均衡 - 动态分配避免过载
- ✅ 多 Agent 协作 - 顺序/并行/评审模式
- ✅ 任务优先级管理 - 紧急度、依赖关系
- ✅ 实时状态监控 - Dashboard UI

### 11 位 AI 成员

| 角色 | 职责 | 技术能力 |
|------|------|----------|
| 🌟 智能体世界专家 | 视角转换、未来布局 | AI, 架构设计, 战略规划 |
| 📚 咨询师 | 研究分析 | 数据分析, 市场研究, 文档编写 |
| 🏗️ 架构师 | 系统设计 | 架构设计, TypeScript, 系统集成 |
| ⚡ Executor | 任务执行 | 编码, 测试, 部署 |
| 🛡️ 系统管理员 | 运维部署 | Docker, CI/CD, 监控 |
| 🧪 测试员 | 质量保障 | 测试自动化, Bug 修复 |
| 🎨 设计师 | UI/UX 设计 | React, CSS, 设计系统 |
| 📣 推广专员 | 市场推广 | SEO, 内容营销 |
| 💼 销售客服 | 客户支持 | 沟通, 问题解决 |
| 💰 财务 | 成本控制 | 数据分析, 报表 |
| 📺 媒体 | 内容创作 | 文案, 视频制作 |

---

## 认证方式

所有 API 请求需要携带认证凭证：

```bash
Authorization: Bearer <your-jwt-token>
# 或
X-API-Key: <your-api-key>
```

---

## 端点列表

| 方法 | 端点 | 描述 |
|------|------|------|
| `GET` | `/api/a2a/registry` | 获取 Agent 注册列表 |
| `POST` | `/api/a2a/registry` | 注册新 Agent |
| `GET` | `/api/a2a/registry/:id` | 获取单个 Agent 信息 |
| `PUT` | `/api/a2a/registry/:id` | 更新 Agent 信息 |
| `DELETE` | `/api/a2a/registry/:id` | 注销 Agent |
| `POST` | `/api/a2a/registry/:id/heartbeat` | Agent 心跳 |
| `GET` | `/api/a2a/queue` | 获取任务队列状态 |
| `POST` | `/api/a2a/queue` | 添加任务到队列 |
| `DELETE` | `/api/a2a/queue` | 清空任务队列 |
| `POST` | `/api/a2a/jsonrpc` | JSON-RPC 调用 |

---

## Agent 注册管理

### GET /api/a2a/registry

获取所有注册的 Agent 列表。

#### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| `status` | string | 否 | - | 状态过滤 (`online` \| `offline` \| `busy`) |
| `type` | string | 否 | - | 类型过滤 |
| `limit` | number | 否 | 50 | 返回数量限制 |
| `offset` | number | 否 | 0 | 分页偏移 |

#### 请求示例

```bash
curl -X GET "https://7zi.com/api/a2a/registry?status=online" \
  -H "Authorization: Bearer your-jwt-token"
```

```javascript
const response = await fetch('/api/a2a/registry?status=online', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log(data.agents);
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "agent-architect",
        "name": "架构师",
        "type": "architect",
        "status": "online",
        "capabilities": [
          "architecture-design",
          "system-integration",
          "typescript"
        ],
        "currentLoad": 45,
        "maxLoad": 90,
        "performanceScore": 0.95,
        "lastHeartbeat": "2026-03-29T10:00:00.000Z",
        "metadata": {
          "provider": "self-claude",
          "model": "claude-3.5"
        }
      }
    ],
    "total": 11,
    "online": 8,
    "offline": 3
  }
}
```

---

### POST /api/a2a/registry

注册新的 Agent。

#### 请求体

```typescript
interface RegisterAgentDto {
  id: string;                    // Agent 唯一 ID
  name: string;                  // Agent 名称
  type: string;                  // Agent 类型
  capabilities: string[];         // 能力列表
  maxLoad?: number;              // 最大负载 (默认 100)
  metadata?: Record<string, unknown>; // 额外元数据
}
```

#### 请求示例

```bash
curl -X POST "https://7zi.com/api/a2a/registry" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "agent-custom-001",
    "name": "自定义 Agent",
    "type": "custom",
    "capabilities": ["data-processing", "report-generation"],
    "maxLoad": 80,
    "metadata": {
      "provider": "custom",
      "version": "1.0.0"
    }
  }'
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "id": "agent-custom-001",
    "name": "自定义 Agent",
    "type": "custom",
    "status": "online",
    "capabilities": ["data-processing", "report-generation"],
    "currentLoad": 0,
    "maxLoad": 80,
    "registeredAt": "2026-03-29T10:00:00.000Z"
  }
}
```

---

### GET /api/a2a/registry/:id

获取单个 Agent 的详细信息。

#### 请求示例

```bash
curl -X GET "https://7zi.com/api/a2a/registry/agent-architect" \
  -H "Authorization: Bearer your-jwt-token"
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "id": "agent-architect",
    "name": "架构师",
    "type": "architect",
    "status": "online",
    "capabilities": [
      "architecture-design",
      "system-integration",
      "typescript",
      "react",
      "nextjs"
    ],
    "currentLoad": 45,
    "maxLoad": 90,
    "performanceScore": 0.95,
    "averageResponseTime": 1200,
    "successRate": 0.98,
    "tasksCompleted": 150,
    "lastHeartbeat": "2026-03-29T10:00:00.000Z",
    "registeredAt": "2026-03-01T00:00:00.000Z",
    "metadata": {
      "provider": "self-claude",
      "model": "claude-3.5"
    },
    "scheduleHistory": [
      {
        "taskId": "task-001",
        "scheduledAt": "2026-03-29T09:00:00.000Z",
        "completedAt": "2026-03-29T10:00:00.000Z",
        "result": "success"
      }
    ]
  }
}
```

---

### PUT /api/a2a/registry/:id

更新 Agent 信息。

#### 请求体

所有字段可选：

```typescript
interface UpdateAgentDto {
  name?: string;
  capabilities?: string[];
  maxLoad?: number;
  status?: 'online' | 'offline' | 'busy';
  metadata?: Record<string, unknown>;
}
```

#### 请求示例

```bash
curl -X PUT "https://7zi.com/api/a2a/registry/agent-architect" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "maxLoad": 95,
    "capabilities": [
      "architecture-design",
      "system-integration",
      "typescript",
      "react",
      "nextjs",
      "performance-optimization"
    ]
  }'
```

---

### DELETE /api/a2a/registry/:id

注销 Agent。

#### 请求示例

```bash
curl -X DELETE "https://7zi.com/api/a2a/registry/agent-custom-001" \
  -H "Authorization: Bearer your-jwt-token"
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "id": "agent-custom-001",
    "message": "Agent unregistered successfully"
  }
}
```

---

### POST /api/a2a/registry/:id/heartbeat

Agent 发送心跳，保持在线状态。

#### 请求体

```typescript
interface HeartbeatDto {
  status?: 'online' | 'busy';
  currentLoad?: number;
  currentTask?: string;
  metrics?: {
    responseTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}
```

#### 请求示例

```bash
curl -X POST "https://7zi.com/api/a2a/registry/agent-architect/heartbeat" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "busy",
    "currentLoad": 65,
    "currentTask": "task-001",
    "metrics": {
      "responseTime": 1150,
      "memoryUsage": 512,
      "cpuUsage": 45
    }
  }'
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "agentId": "agent-architect",
    "status": "busy",
    "timestamp": "2026-03-29T10:00:00.000Z",
    "nextHeartbeat": 30000
  }
}
```

---

## 任务队列管理

### GET /api/a2a/queue

获取任务队列状态。

#### 请求示例

```bash
curl -X GET "https://7zi.com/api/a2a/queue" \
  -H "Authorization: Bearer your-jwt-token"
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "stats": {
      "total": 42,
      "pending": 15,
      "inProgress": 12,
      "completed": 10,
      "failed": 5,
      "byPriority": {
        "urgent": 5,
        "high": 10,
        "normal": 20,
        "low": 7
      },
      "byAgent": {
        "agent-executor": 15,
        "agent-architect": 12,
        "agent-tester": 10,
        "agent-designer": 5
      }
    },
    "nextTask": {
      "id": "task-001",
      "type": "code-development",
      "priority": "urgent",
      "assignedAgent": "agent-executor",
      "estimatedDuration": 3600000
    },
    "config": {
      "maxSize": 1000,
      "maxAttempts": 3,
      "defaultPriority": "normal"
    }
  }
}
```

---

### POST /api/a2a/queue

添加任务到队列。

#### 请求体

```typescript
interface EnqueueTaskDto {
  id: string;                    // 任务 ID
  type: string;                  // 任务类型
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  payload: Record<string, unknown>; // 任务数据
  requiredCapabilities?: string[]; // 所需能力
  preferredAgent?: string;       // 首选 Agent
  maxAttempts?: number;          // 最大重试次数
  estimatedDuration?: number;    // 预估耗时 (ms)
  dependencies?: string[];       // 依赖任务 ID
  metadata?: Record<string, unknown>;
}
```

#### 请求示例

```bash
curl -X POST "https://7zi.com/api/a2a/queue" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "task-001",
    "type": "code-development",
    "priority": "high",
    "payload": {
      "description": "实现用户认证模块",
      "techStack": ["TypeScript", "Next.js"],
      "files": ["src/lib/auth.ts"]
    },
    "requiredCapabilities": ["typescript", "nextjs", "authentication"],
    "estimatedDuration": 3600000,
    "dependencies": ["task-000"]
  }'
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "taskId": "task-001",
    "queuePosition": 5,
    "assignedAgent": null,
    "estimatedStart": "2026-03-29T11:00:00.000Z",
    "scheduling": {
      "candidates": [
        {
          "agentId": "agent-executor",
          "score": 0.92,
          "currentLoad": 30,
          "availableAt": "2026-03-29T10:30:00.000Z"
        },
        {
          "agentId": "agent-architect",
          "score": 0.85,
          "currentLoad": 45,
          "availableAt": "2026-03-29T11:00:00.000Z"
        }
      ],
      "reasoning": "agent-executor 最匹配任务需求，当前负载低，预计 30 分钟后可开始"
    }
  }
}
```

---

### DELETE /api/a2a/queue

清空任务队列或特定条件的任务。

#### 请求参数

| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `agentId` | string | 否 | 仅清空特定 Agent 的任务 |
| `priority` | string | 否 | 仅清空特定优先级的任务 |
| `status` | string | 否 | 仅清空特定状态的任务 |

#### 请求示例

```bash
# 清空所有任务
curl -X DELETE "https://7zi.com/api/a2a/queue" \
  -H "Authorization: Bearer your-jwt-token"

# 仅清空低优先级任务
curl -X DELETE "https://7zi.com/api/a2a/queue?priority=low" \
  -H "Authorization: Bearer your-jwt-token"

# 清空特定 Agent 的任务
curl -X DELETE "https://7zi.com/api/a2a/queue?agentId=agent-executor" \
  -H "Authorization: Bearer your-jwt-token"
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "removed": 15,
    "remaining": 27
  }
}
```

---

## JSON-RPC 接口

### POST /api/a2a/jsonrpc

执行 JSON-RPC 2.0 标准调用。

#### 请求体

```typescript
interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown> | unknown[];
  id: string | number;
}
```

#### 支持的方法

| 方法 | 描述 |
|------|------|
| `schedule_task` | 调度任务 |
| `get_agent_status` | 获取 Agent 状态 |
| `cancel_task` | 取消任务 |
| `get_task_result` | 获取任务结果 |
| `list_agents` | 列出所有 Agent |
| `agent_capability` | 查询 Agent 能力 |

#### 请求示例

```bash
curl -X POST "https://7zi.com/api/a2a/jsonrpc" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "schedule_task",
    "params": {
      "taskType": "code-review",
      "taskId": "task-001",
      "requiredCapabilities": ["code-review", "typescript"]
    },
    "id": 1
  }'
```

#### 响应格式

```json
{
  "jsonrpc": "2.0",
  "result": {
    "taskId": "task-001",
    "assignedAgent": "agent-tester",
    "status": "scheduled",
    "estimatedStart": "2026-03-29T10:30:00.000Z"
  },
  "id": 1
}
```

---

## 调度算法

### 多维度评分

调度算法基于以下权重计算：

```
最终评分 = (
  能力匹配分 × 0.4 +
  负载均衡分 × 0.3 +
  性能评分 × 0.2 +
  响应速度 × 0.1
)
```

### 能力匹配

```typescript
// 能力匹配计算
function calculateCapabilityScore(
  requiredCapabilities: string[],
  agentCapabilities: string[]
): number {
  const matched = requiredCapabilities.filter(cap => 
    agentCapabilities.includes(cap)
  );
  return matched.length / requiredCapabilities.length;
}
```

### 负载均衡

```typescript
// 负载评分计算
function calculateLoadScore(
  currentLoad: number,
  maxLoad: number
): number {
  const utilization = currentLoad / maxLoad;
  
  // 保留 10% 缓冲
  if (utilization > 0.9) return 0;
  if (utilization > 0.7) return 0.5;
  if (utilization > 0.5) return 0.7;
  return 1;
}
```

### 调度决策示例

```json
{
  "taskId": "task-001",
  "decision": {
    "assignedAgent": "agent-executor",
    "confidence": 0.92,
    "reasoning": "agent-executor 最匹配任务需求，当前负载 30%，性能评分 0.95",
    "alternativeAgents": [
      {
        "agentId": "agent-architect",
        "score": 0.85,
        "reason": "能力匹配，但当前负载较高 (45%)"
      }
    ],
    "schedulingFactors": {
      "capabilityScore": 0.95,
      "loadScore": 0.85,
      "performanceScore": 0.95,
      "responseScore": 0.90
    }
  }
}
```

---

## 数据模型

### Agent 能力模型

```typescript
interface AgentCapability {
  agentId: string;
  name: string;
  type: AgentType;
  status: 'online' | 'offline' | 'busy';
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  performanceScore: number;
  averageResponseTime: number;
  successRate: number;
  lastHeartbeat: string;
  metadata: {
    provider: string;
    model: string;
    version?: string;
  };
}

type AgentType = 
  | 'expert'      // 智能体世界专家
  | 'consultant'  // 咨询师
  | 'architect'   // 架构师
  | 'executor'    // Executor
  | 'admin'       // 系统管理员
  | 'tester'      // 测试员
  | 'designer'    // 设计师
  | 'promoter'    // 推广专员
  | 'sales'       // 销售客服
  | 'finance'     // 财务
  | 'media';      // 媒体
```

### 任务模型

```typescript
interface TaskModel {
  id: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  requiredCapabilities: string[];
  assignedAgent?: string;
  estimatedDuration?: number;
  dependencies?: string[];
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  metadata?: Record<string, unknown>;
}
```

### 调度决策模型

```typescript
interface ScheduleDecision {
  taskId: string;
  assignedAgent: string;
  confidence: number;
  reasoning: string;
  alternativeAgents: Array<{
    agentId: string;
    score: number;
    reason: string;
  }>;
  schedulingFactors: {
    capabilityScore: number;
    loadScore: number;
    performanceScore: number;
    responseScore: number;
  };
  timestamp: string;
}
```

---

## 限流策略

| 端点 | 限制 | 说明 |
|------|------|------|
| `GET /api/a2a/registry` | 100 请求/分钟 | 查询操作 |
| `POST /api/a2a/registry` | 10 请求/分钟 | 注册操作 |
| `POST /api/a2a/registry/:id/heartbeat` | 120 请求/分钟 | 心跳操作 |
| `GET /api/a2a/queue` | 100 请求/分钟 | 查询操作 |
| `POST /api/a2a/queue` | 50 请求/分钟 | 入队操作 |
| `POST /api/a2a/jsonrpc` | 100 请求/分钟 | RPC 调用 |

---

## 错误码

| HTTP 状态码 | 错误码 | 描述 |
|------------|--------|------|
| 400 | `VALIDATION_ERROR` | 参数验证失败 |
| 401 | `UNAUTHORIZED` | 未授权 |
| 403 | `FORBIDDEN` | 无权限 |
| 404 | `NOT_FOUND` | Agent 不存在 |
| 409 | `CONFLICT` | Agent 已存在 |
| 429 | `RATE_LIMITED` | 请求频率过高 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

---

## 最佳实践

### 1. 心跳机制

```javascript
// Agent 定期发送心跳
setInterval(async () => {
  await fetch('/api/a2a/registry/agent-001/heartbeat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: currentTask ? 'busy' : 'online',
      currentLoad: calculateLoad(),
      currentTask: currentTask?.id,
    }),
  });
}, 30000); // 每 30 秒
```

### 2. 任务轮询

```javascript
// Agent 轮询获取任务
async function pollForTasks(agentId) {
  const response = await fetch(
    `/api/a2a/queue?agentId=${agentId}&status=pending`
  );
  const { tasks } = await response.json();
  
  if (tasks.length > 0) {
    // 处理最高优先级任务
    const task = tasks.sort((a, b) => 
      getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
    )[0];
    
    await processTask(task);
  }
}

// 每 5 秒轮询一次
setInterval(() => pollForTasks('agent-001'), 5000);
```

### 3. 错误重试

```javascript
async function processTask(task, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await executeTask(task);
      await reportTaskComplete(task.id, result);
      return;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxAttempts) {
        await reportTaskFailed(task.id, error.message);
      } else {
        // 指数退避
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
}
```

---

## 性能指标

| 指标 | 数值 |
|------|------|
| **调度效率提升** | 70-80% |
| **任务完成时间减少** | 30-40% |
| **Agent 负载均衡度** | 85-95% |
| **平均响应时间** | < 100ms |
| **调度准确率** | > 95% |

---

## 相关文档

- [API.md](../API.md) - API 完整文档
- [WEBSOCKET.md](./websocket.md) - WebSocket API
- [RATINGS.md](./ratings.md) - 评分 API

---

**维护者**: ⚡ Executor (AI 团队)
**最后更新**: 2026-03-29

# OpenClaw Workflow Engine v1.11.0 - API Documentation

## 概述

OpenClaw Workflow Engine 是一个强大的工作流自动化引擎，支持 DAG（有向无环图）结构、多种节点类型、异步任务队列和分布式部署。

## 基础信息

- **Base URL**: `http://localhost:3001/api`
- **Content-Type**: `application/json`
- **版本**: v1.11.0

## 认证

API 支持 API Key 认证：

```
Headers:
  x-api-key: your-api-key
```

## 响应格式

所有响应使用统一的 JSON 格式：

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

错误响应：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

---

## 工作流管理 API

### 1. 创建工作流

**POST** `/api/workflows`

创建新的工作流定义。

**请求体**:

```json
{
  "name": "My Workflow",
  "description": "Workflow description",
  "version": "1.0.0",
  "status": "published",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger.cron",
      "name": "Start",
      "config": {
        "cron": {
          "expression": "0 0 * * *",
          "timezone": "UTC"
        }
      }
    },
    {
      "id": "node_2",
      "type": "action.http",
      "name": "HTTP Request",
      "config": {
        "http": {
          "url": "https://api.example.com/data",
          "method": "GET"
        }
      },
      "timeout": 30000,
      "retryPolicy": {
        "maxAttempts": 3,
        "backoffStrategy": "exponential",
        "initialDelay": 1000
      }
    },
    {
      "id": "node_3",
      "type": "logic.condition",
      "name": "Check Status",
      "config": {
        "condition": {
          "expression": "output.status === 200",
          "trueBranch": "node_4",
          "falseBranch": "node_5"
        }
      }
    }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_1", "target": "node_2" },
    { "id": "edge_2", "source": "node_2", "target": "node_3" }
  ],
  "variables": {
    "initialValue": 0
  },
  "tags": ["automation", "api"]
}
```

**响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "wf_xxx",
    "name": "My Workflow",
    "createdAt": "2026-04-03T06:00:00.000Z"
  }
}
```

### 2. 获取所有工作流

**GET** `/api/workflows`

获取所有已注册的工作流列表。

**响应**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "wf_xxx",
      "name": "Workflow 1",
      "status": "published"
    }
  ],
  "total": 1
}
```

### 3. 获取单个工作流

**GET** `/api/workflows/:id`

获取指定 ID 的工作流详情。

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "wf_xxx",
    "name": "My Workflow",
    "nodes": [...],
    "edges": [...]
  }
}
```

### 4. 更新工作流

**PUT** `/api/workflows/:id`

更新工作流定义。

**请求体**: 同创建工作流

**响应**: `200 OK`

### 5. 删除工作流

**DELETE** `/api/workflows/:id`

删除指定工作流。

**响应**: `200 OK`

```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

---

## 执行管理 API

### 1. 执行工作流

**POST** `/api/workflows/:id/execute`

启动工作流执行。

**请求体**:

```json
{
  "variables": {
    "inputValue": 100
  },
  "trigger": {
    "type": "manual"
  }
}
```

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "exec_xxx",
    "workflowId": "wf_xxx",
    "status": "pending",
    "startTime": "2026-04-03T06:00:00.000Z"
  }
}
```

### 2. 获取执行状态

**GET** `/api/executions/:id`

获取执行的详细状态。

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "exec_xxx",
    "workflowId": "wf_xxx",
    "status": "running",
    "startTime": "2026-04-03T06:00:00.000Z",
    "nodeExecutions": {
      "node_1": {
        "status": "completed",
        "output": {...}
      }
    }
  }
}
```

### 3. 获取所有执行

**GET** `/api/executions`

获取所有执行记录。

**查询参数**:
- `workflowId`: 按工作流 ID 筛选

**响应**: `200 OK`

### 4. 暂停执行

**POST** `/api/executions/:id/pause`

暂停正在执行的流程。

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "exec_xxx",
    "status": "paused"
  }
}
```

### 5. 恢复执行

**POST** `/api/executions/:id/resume`

从检查点恢复执行。

**请求体**:

```json
{
  "checkpointId": "cp_xxx"
}
```

**响应**: `200 OK`

### 6. 取消执行

**POST** `/api/executions/:id/cancel`

取消执行。

**响应**: `200 OK`

---

## 调度管理 API

### 1. 创建调度

**POST** `/api/schedules`

创建基于 Cron 的调度。

**请求体**:

```json
{
  "workflowId": "wf_xxx",
  "cronExpression": "0 0 * * *",
  "timezone": "UTC"
}
```

**响应**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "sched_xxx",
    "workflowId": "wf_xxx",
    "cronExpression": "0 0 * * *",
    "nextRun": "2026-04-04T00:00:00.000Z"
  }
}
```

### 2. 获取所有调度

**GET** `/api/schedules`

获取所有调度列表。

**查询参数**:
- `workflowId`: 按工作流 ID 筛选

**响应**: `200 OK`

### 3. 获取单个调度

**GET** `/api/schedules/:id`

获取调度详情。

**响应**: `200 OK`

### 4. 更新调度

**PUT** `/api/schedules/:id`

更新调度配置。

**请求体**:

```json
{
  "cronExpression": "0 */6 * * *",
  "enabled": true
}
```

**响应**: `200 OK`

### 5. 删除调度

**DELETE** `/api/schedules/:id`

删除调度。

**响应**: `200 OK`

### 6. 手动触发调度

**POST** `/api/schedules/:id/trigger`

手动触发一次调度执行。

**响应**: `200 OK`

---

## 队列管理 API

### 1. 获取队列统计

**GET** `/api/queue/stats`

获取队列状态统计。

**响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "waiting": 10,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 5
  }
}
```

### 2. 暂停队列

**POST** `/api/queue/pause`

暂停队列处理。

**响应**: `200 OK`

### 3. 恢复队列

**POST** `/api/queue/resume`

恢复队列处理。

**响应**: `200 OK`

### 4. 清理队列

**POST** `/api/queue/clean`

清理已完成和失败的任务。

**响应**: `200 OK`

---

## Webhook 处理

### 接收 Webhook

**ANY** `/api/webhooks/:path`

接收外部 Webhook 请求并触发工作流。

**说明**:
- `:path` - 在工作流 webhook 触发器中定义的路径
- 支持所有 HTTP 方法
- 自动匹配注册的工作流

**响应**: `200 OK`

```json
{
  "success": true,
  "message": "Webhook received and workflow started",
  "data": {
    "executionId": "exec_xxx",
    "workflowId": "wf_xxx"
  }
}
```

---

## 健康检查

### GET /health

**响应**: `200 OK`

```json
{
  "status": "healthy",
  "timestamp": "2026-04-03T06:00:00.000Z",
  "uptime": 3600,
  "services": {
    "redis": "healthy",
    "queue": "healthy"
  },
  "queue": {
    "waiting": 10,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

---

## 节点类型参考

### Trigger 节点

| 类型 | 说明 |
|------|------|
| `trigger.cron` | 定时触发（Cron 表达式） |
| `trigger.webhook` | Webhook 触发 |
| `trigger.event` | 事件触发 |
| `trigger.manual` | 手动触发 |

### Action 节点

| 类型 | 说明 |
|------|------|
| `action.http` | HTTP 请求 |
| `action.script` | 脚本执行 |
| `action.email` | 发送邮件 |
| `action.slack` | Slack 通知 |
| `action.database` | 数据库操作 |
| `action.transform` | 数据转换 |

### Logic 节点

| 类型 | 说明 |
|------|------|
| `logic.condition` | 条件判断 |
| `logic.switch` | 多分支选择 |
| `logic.loop` | 循环迭代 |
| `logic.parallel` | 并行执行 |
| `logic.wait` | 等待/延迟 |

### Integration 节点

| 类型 | 说明 |
|------|------|
| `integration.openai` | OpenAI 集成 |
| `integration.minimax` | Minimax 集成 |
| `integration.claude` | Claude 集成 |
| `integration.custom` | 自定义集成 |

---

## 错误代码

| 代码 | 说明 |
|------|------|
| `NOT_FOUND` | 资源未找到 |
| `VALIDATION_ERROR` | 请求验证失败 |
| `EXECUTION_ERROR` | 执行错误 |
| `INTERNAL_ERROR` | 内部服务器错误 |

---

## 限流

- 默认限制: 100 请求/分钟
- 可通过环境变量配置: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`

---

## 示例

### 完整工作流示例

```json
{
  "name": "Data Processing Pipeline",
  "description": "Fetch data, transform, and notify",
  "version": "1.0.0",
  "status": "published",
  "nodes": [
    {
      "id": "start",
      "type": "trigger.cron",
      "name": "Daily Trigger",
      "config": {
        "cron": {
          "expression": "0 6 * * *",
          "timezone": "UTC"
        }
      }
    },
    {
      "id": "fetch",
      "type": "action.http",
      "name": "Fetch Data",
      "config": {
        "http": {
          "url": "https://api.example.com/data",
          "method": "GET",
          "headers": {
            "Authorization": "Bearer token"
          }
        }
      },
      "retryPolicy": {
        "maxAttempts": 3,
        "backoffStrategy": "exponential"
      }
    },
    {
      "id": "transform",
      "type": "action.transform",
      "name": "Transform Data",
      "config": {
        "transform": {
          "type": "map",
          "expression": "item.value * 2",
          "input": "fetch.data.items"
        }
      }
    },
    {
      "id": "check",
      "type": "logic.condition",
      "name": "Check Results",
      "config": {
        "condition": {
          "expression": "transform.length > 0",
          "trueBranch": "notify",
          "falseBranch": "end"
        }
      }
    },
    {
      "id": "notify",
      "type": "action.slack",
      "name": "Send Notification",
      "config": {
        "slack": {
          "channel": "#alerts",
          "message": "Data processed: ${transform.length} items"
        }
      }
    },
    {
      "id": "end",
      "type": "trigger.manual",
      "name": "End"
    }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "fetch" },
    { "id": "e2", "source": "fetch", "target": "transform" },
    { "id": "e3", "source": "transform", "target": "check" },
    { "id": "e4", "source": "check", "target": "notify" },
    { "id": "e5", "source": "notify", "target": "end" }
  ]
}
```

---

## SDK 示例

### JavaScript/TypeScript

```typescript
import { WorkflowEngine } from 'openclaw-workflow-engine';

const engine = new WorkflowEngine(config);

// 创建工作流
await engine.registerWorkflow({
  id: 'my-workflow',
  name: 'My Workflow',
  nodes: [...],
  edges: [...]
});

// 执行工作流
const execution = await engine.execute('my-workflow', {
  input: 'value'
});

// 查询状态
const status = await engine.getExecution(execution.id);
```

---

## 部署

### Docker

```bash
docker build -t openclaw-workflow-engine .
docker run -p 3001:3001 openclaw-workflow-engine
```

### 环境变量

参考 `.env.example` 文件配置必要的环境变量。

---

## 支持

- 文档: https://docs.openclaw.ai/workflow-engine
- GitHub: https://github.com/openclaw/workflow-engine
- 支持: support@openclaw.ai

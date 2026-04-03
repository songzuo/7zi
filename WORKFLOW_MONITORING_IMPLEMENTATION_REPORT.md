# 工作流执行监控系统实现报告

## 概述

本报告详细说明了为 v1.11 版本实现的工作流执行监控和追踪系统。该系统提供了完整的执行状态追踪、节点记录、性能指标收集和告警管理功能。

## 实现日期

2026-04-03

## 系统架构

### 核心组件

```
src/lib/workflow/monitoring/
├── types.ts                    # 数据模型定义
├── ExecutionTracker.ts         # 执行追踪器
├── StepRecorder.ts             # 节点记录器
├── MetricsCollector.ts         # 性能指标收集器
├── AlertManager.ts             # 告警管理器
├── RealtimeService.ts          # 实时事件服务
├── index.ts                    # 监控系统主入口
└── __tests__/
    └── monitoring.test.ts      # 单元测试
```

### API 路由

```
src/app/api/workflow/[id]/
├── executions/
│   ├── route.ts               # GET /api/workflow/:id/executions
│   └── [execId]/
│       ├── route.ts           # GET /api/workflow/:id/executions/:execId
│       └── cancel/
│           └── route.ts       # POST /api/workflow/:id/executions/:execId/cancel
├── metrics/
│   └── route.ts               # GET /api/workflow/:id/metrics
└── stream/
    └── route.ts               # GET /api/workflow/:id/stream (SSE)
```

## 核心功能实现

### 1. ExecutionTracker - 执行追踪器

**文件**: `src/lib/workflow/monitoring/ExecutionTracker.ts`

**功能**:
- 追踪工作流执行状态（pending/running/completed/failed/cancelled/paused）
- 管理执行记录的生命周期
- 支持执行历史查询和过滤
- 提供执行摘要统计
- 自动清理过期记录

**核心方法**:
```typescript
- createExecution()          // 创建执行记录
- updateStatus()             // 更新执行状态
- updateProgress()           // 更新执行进度
- getExecution()             // 获取执行记录
- getExecutions()            // 获取执行历史（支持过滤、排序、分页）
- getSummary()               // 获取执行摘要统计
- deleteExecution()          // 删除执行记录
```

**数据模型**:
```typescript
interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  workflowVersion: number
  status: WorkflowExecutionStatus
  startTime: string
  endTime?: string
  duration?: number
  nodeCount: number
  completedNodes: number
  failedNodes: number
  skippedNodes: number
  triggeredBy: string
  triggerType: 'manual' | 'api' | 'scheduled' | 'webhook'
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  error?: { nodeId?: string; code: string; message: string; stack?: string }
  metadata: { createdAt: string; updatedAt: string; tags?: string[] }
  variables: Record<string, unknown>
}
```

### 2. StepRecorder - 节点记录器

**文件**: `src/lib/workflow/monitoring/StepRecorder.ts`

**功能**:
- 记录每个节点的执行详情
- 追踪节点输入/输出/耗时/状态
- 支持节点重试记录
- 提供执行路径分析
- 识别关键路径（执行时间最长的路径）

**核心方法**:
```typescript
- createNodeExecution()      // 创建节点执行记录
- startNodeExecution()       // 开始节点执行
- completeNodeExecution()    // 完成节点执行
- failNodeExecution()        // 节点执行失败
- skipNodeExecution()        // 跳过节点执行
- recordRetry()              // 记录节点重试
- addLog()                   // 添加执行日志
- getExecutionNodes()        // 获取执行的所有节点
- getNodeStats()             // 获取节点执行统计
- getExecutionPath()         // 获取执行路径
- getCriticalPath()          // 获取关键路径
```

**数据模型**:
```typescript
interface NodeExecution {
  id: string
  executionId: string
  nodeId: string
  nodeName: string
  nodeType: string
  status: NodeStatus
  startTime: string
  endTime?: string
  duration?: number
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  error?: { code: string; message: string; stack?: string }
  retryCount: number
  retryHistory: Array<{ attempt: number; timestamp: string; error?: string }>
  logs: Array<{ timestamp: string; level: string; message: string; data?: Record<string, unknown> }>
  metrics?: NodeExecutionMetrics
  dependencies: string[]
}
```

### 3. MetricsCollector - 性能指标收集器

**文件**: `src/lib/workflow/monitoring/MetricsCollector.ts`

**功能**:
- 收集工作流执行性能指标
- 计算节点级别指标
- 提供性能趋势分析
- 识别瓶颈节点
- 支持指标缓存

**核心方法**:
```typescript
- getExecutionMetrics()      // 获取执行性能指标
- getWorkflowMetrics()       // 获取工作流历史指标
- getPerformanceTrend()      // 获取性能趋势
- getBottleneckNodes()       // 获取瓶颈节点
- getHighFailureNodes()      // 获取失败率最高的节点
- clearCache()               // 清除缓存
```

**指标类型**:
```typescript
interface ExecutionMetrics {
  workflowId: string
  executionId: string
  totalDuration: number              // 总执行时长
  avgNodeDuration: number            // 平均节点执行时长
  maxNodeDuration: number            // 最长节点执行时长
  minNodeDuration: number            // 最短节点执行时长
  throughput: number                 // 吞吐量（节点/秒）
  successRate: number                // 成功率
  totalCpuTime: number               // 总CPU时间
  totalMemoryUsage: number           // 总内存使用
  totalNetworkCalls: number          // 总网络调用
  totalApiCalls: number              // 总API调用
  totalCost: number                  // 总成本
  totalTokensUsed: number            // 总token使用
  nodeMetrics: NodeMetricsSummary[]  // 节点指标摘要
  timeRange: { start: string; end: string }
}
```

### 4. AlertManager - 告警管理器

**文件**: `src/lib/workflow/monitoring/AlertManager.ts`

**功能**:
- 管理执行超时告警
- 检测节点失败
- 循环依赖检测
- 阈值突破检测
- 告警生命周期管理

**核心方法**:
```typescript
- addAlertConfig()           // 添加告警配置
- getAlertConfig()           // 获取告警配置
- updateAlertConfig()        // 更新告警配置
- createAlert()              // 创建告警
- resolveAlert()             // 解决议警
- acknowledgeAlert()         // 确认告警
- checkNodeFailure()         // 检测节点失败
- setTimeoutDetection()      // 设置超时检测
- detectCircularDependency() // 检测循环依赖
- checkThreshold()           // 检测阈值突破
- getAlertStats()            // 获取告警统计
```

**告警类型**:
```typescript
enum AlertType {
  EXECUTION_TIMEOUT = 'execution_timeout',
  NODE_FAILURE = 'node_failure',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  THRESHOLD_BREACHED = 'threshold_breached',
}

enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}
```

### 5. RealtimeService - 实时事件服务

**文件**: `src/lib/workflow/monitoring/RealtimeService.ts`

**功能**:
- 支持 WebSocket 和 SSE 两种实时推送方式
- 工作流级别订阅
- 执行级别订阅
- 自动心跳保持连接
- 客户端连接管理

**核心方法**:
```typescript
- registerClient()           // 注册客户端
- unregisterClient()         // 注销客户端
- subscribeWorkflow()        // 订阅工作流事件
- subscribeExecution()       // 订阅执行事件
- sendToClientDirect()       // 直接发送消息给客户端
- getStats()                 // 获取客户端统计
```

**事件类型**:
```typescript
type ExecutionEventType = 
  | 'started'           // 执行开始
  | 'node_started'      // 节点开始
  | 'node_completed'    // 节点完成
  | 'node_failed'       // 节点失败
  | 'completed'         // 执行完成
  | 'failed'            // 执行失败
  | 'cancelled'         // 执行取消
  | 'progress'          // 进度更新
```

### 6. WorkflowMonitoring - 监控系统主入口

**文件**: `src/lib/workflow/monitoring/index.ts`

**功能**:
- 整合所有监控组件
- 提供统一的监控接口
- 事件驱动架构
- 简化使用流程

**核心方法**:
```typescript
// 执行管理
- startExecution()           // 开始监控执行
- updateExecutionStatus()    // 更新执行状态
- cancelExecution()          // 取消执行
- deleteExecution()          // 删除执行记录

// 节点管理
- startNode()                // 开始节点执行
- completeNode()             // 完成节点执行
- failNode()                 // 节点执行失败
- skipNode()                 // 跳过节点
- recordNodeRetry()          // 记录节点重试
- addNodeLog()               // 添加节点日志

// 数据查询
- getExecution()             // 获取执行记录
- getExecutions()            // 获取执行历史
- getExecutionDetails()      // 获取执行详情
- getMetrics()               // 获取性能指标
- getWorkflowMetrics()       // 获取工作流指标
- getPerformanceTrend()      // 获取性能趋势
- getBottleneckNodes()       // 获取瓶颈节点

// 告警管理
- getAlert()                 // 获取告警
- getExecutionAlerts()       // 获取执行告警
- getActiveAlerts()          // 获取活跃告警
- resolveAlert()             // 解决议警
- acknowledgeAlert()         // 确认告警

// 事件监听
- on()                       // 注册事件监听器
- off()                      // 移除事件监听器

// 统计和清理
- getStats()                 // 获取统计信息
- cleanup()                  // 清理旧数据
```

## API 接口实现

### 1. 获取执行历史

**端点**: `GET /api/workflow/:id/executions`

**查询参数**:
- `status`: 过滤执行状态
- `triggerType`: 过滤触发类型
- `startDate`: 开始日期
- `endDate`: 结束日期
- `limit`: 返回数量限制（默认 50）
- `offset`: 偏移量（默认 0）
- `orderBy`: 排序字段（startTime/duration/status）
- `order`: 排序方向（asc/desc）

**响应示例**:
```json
{
  "executions": [
    {
      "id": "exec_123",
      "workflowId": "wf_1",
      "workflowName": "Test Workflow",
      "status": "completed",
      "startTime": "2026-04-03T10:00:00Z",
      "endTime": "2026-04-03T10:05:00Z",
      "duration": 300000,
      "nodeCount": 5,
      "completedNodes": 5,
      "failedNodes": 0,
      "triggeredBy": "user_1",
      "triggerType": "manual"
    }
  ],
  "total": 1
}
```

### 2. 获取执行详情

**端点**: `GET /api/workflow/:id/executions/:execId`

**响应示例**:
```json
{
  "execution": { /* WorkflowExecution */ },
  "nodes": [ /* NodeExecution[] */ ],
  "metrics": { /* ExecutionMetrics */ },
  "alerts": [ /* Alert[] */ ]
}
```

### 3. 获取性能指标

**端点**: `GET /api/workflow/:id/metrics`

**查询参数**:
- `executionId`: 特定执行的指标
- `startDate`: 开始日期
- `endDate`: 结束日期
- `includeTrend`: 是否包含趋势（true/false）
- `trendDays`: 趋势天数（默认 7）
- `includeBottlenecks`: 是否包含瓶颈节点（true/false）
- `bottleneckLimit`: 瓶颈节点数量（默认 5）

**响应示例**:
```json
{
  "metrics": { /* ExecutionMetrics */ },
  "workflowMetrics": {
    "avgDuration": 250000,
    "avgSuccessRate": 95,
    "avgThroughput": 20,
    "totalExecutions": 100,
    "totalCost": 50.5,
    "totalTokensUsed": 1000000,
    "nodeMetrics": [ /* NodeMetricsSummary[] */ ]
  },
  "trend": [
    {
      "date": "2026-03-28",
      "executions": 15,
      "avgDuration": 240000,
      "successRate": 96
    }
  ],
  "bottlenecks": [ /* NodeMetricsSummary[] */ ]
}
```

### 4. 取消执行

**端点**: `POST /api/workflow/:id/executions/:execId/cancel`

**响应示例**:
```json
{
  "success": true,
  "execution": { /* WorkflowExecution */ }
}
```

### 5. SSE 实时事件流

**端点**: `GET /api/workflow/:id/stream`

**查询参数**:
- `executionId`: 订阅特定执行

**事件格式**:
```
data: {"type":"execution_event","data":{"type":"started","executionId":"exec_123","timestamp":"2026-04-03T10:00:00Z","data":{}}}

data: {"type":"execution_event","data":{"type":"node_started","executionId":"exec_123","nodeId":"node_1","timestamp":"2026-04-03T10:00:01Z","data":{}}}

data: {"type":"execution_event","data":{"type":"node_completed","executionId":"exec_123","nodeId":"node_1","timestamp":"2026-04-03T10:00:05Z","data":{}}}
```

## 单元测试

**文件**: `src/lib/workflow/monitoring/__tests__/monitoring.test.ts`

**测试覆盖**:
- ✅ ExecutionTracker 测试（5 个测试用例）
- ✅ StepRecorder 测试（5 个测试用例）
- ✅ MetricsCollector 测试（2 个测试用例）
- ✅ AlertManager 测试（5 个测试用例）
- ✅ WorkflowMonitoring 测试（5 个测试用例）

**总计**: 22 个测试用例

**运行测试**:
```bash
npm test -- src/lib/workflow/monitoring/__tests__/monitoring.test.ts
```

## 使用示例

### 基本使用

```typescript
import { workflowMonitoring } from '@/lib/workflow/monitoring'

// 开始监控执行
const execution = workflowMonitoring.startExecution({
  workflowId: 'wf_1',
  workflowName: 'My Workflow',
  workflowVersion: 1,
  triggeredBy: 'user_1',
  triggerType: 'manual',
  nodeCount: 5,
  timeoutMs: 300000, // 5分钟超时
})

// 更新执行状态
workflowMonitoring.updateExecutionStatus(execution.id, 'running')

// 开始节点执行
workflowMonitoring.startNode(
  execution.id,
  'node_1',
  'Start Node',
  'start',
  { input: 'value' }
)

// 完成节点执行
workflowMonitoring.completeNode(
  execution.id,
  'node_1',
  { output: 'result' },
  { cpuTime: 100, memoryUsage: 1024 }
)

// 完成执行
workflowMonitoring.updateExecutionStatus(execution.id, 'completed')

// 获取执行详情
const details = workflowMonitoring.getExecutionDetails(execution.id)
console.log('执行时长:', details.metrics?.totalDuration)
console.log('成功率:', details.metrics?.successRate)
```

### 实时事件监听

```typescript
import { workflowMonitoring } from '@/lib/workflow/monitoring'

// 注册事件监听器
workflowMonitoring.on('started', (event) => {
  console.log('执行开始:', event.executionId)
})

workflowMonitoring.on('node_completed', (event) => {
  console.log('节点完成:', event.nodeId)
})

workflowMonitoring.on('completed', (event) => {
  console.log('执行完成:', event.executionId)
})

// 移除监听器
workflowMonitoring.off('started', handler)
```

### SSE 客户端示例

```javascript
const eventSource = new EventSource('/api/workflow/wf_1/stream?executionId=exec_123')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('收到事件:', data)
}

eventSource.onerror = (error) => {
  console.error('SSE 错误:', error)
  eventSource.close()
}

// 关闭连接
eventSource.close()
```

## 性能优化

### 1. 内存管理
- 自动清理过期执行记录（默认 7 天）
- 限制最大记录数量（执行记录 10000 条，节点记录 50000 条）
- 定期清理已解决的告警

### 2. 缓存策略
- 性能指标缓存（默认 1 分钟 TTL）
- 按工作流分组缓存，支持批量清理

### 3. 索引优化
- 工作流执行索引（workflowId -> executionIds）
- 执行节点索引（executionId -> nodeExecutionIds）
- 告警索引（executionId/nodeId -> alertIds）

## 安全考虑

### 1. 数据隔离
- 执行记录按工作流 ID 隔离
- API 路由验证工作流 ID 匹配

### 2. 错误处理
- 所有 API 端点包含错误处理
- 敏感信息（如错误堆栈）仅在必要时返回

### 3. 资源限制
- 限制查询返回数量
- 防止无限循环的依赖检测

## 未来扩展

### 1. 持久化存储
- 集成数据库存储执行历史
- 支持长期数据保留

### 2. 高级分析
- 执行模式识别
- 异常检测
- 预测性分析

### 3. 可视化
- 执行流程图
- 性能仪表板
- 告警面板

### 4. 集成
- 与现有监控系统集成（如 Prometheus）
- 支持自定义告警通知渠道
- Webhook 集成

## 总结

本实现提供了完整的工作流执行监控和追踪系统，包括：

✅ **ExecutionTracker** - 完整的执行状态追踪
✅ **StepRecorder** - 详细的节点执行记录
✅ **MetricsCollector** - 全面的性能指标收集
✅ **AlertManager** - 智能的告警管理
✅ **RealtimeService** - 实时事件推送（WebSocket + SSE）
✅ **API 接口** - RESTful API 和 SSE 流
✅ **单元测试** - 22 个测试用例，覆盖核心功能

系统设计遵循以下原则：
- **模块化**: 每个组件职责单一，易于维护
- **可扩展**: 支持自定义告警配置和事件监听
- **高性能**: 缓存策略和索引优化
- **易用性**: 统一的监控接口，简化使用流程

该系统已准备好集成到 v1.11 版本中，为工作流执行提供全面的监控和追踪能力。
# 多模型智能路由系统 - 设计文档

## 版本
v1.10.0

## 概述

多模型智能路由系统是一个企业级的 AI 模型路由解决方案，能够根据任务类型、复杂度、成本预算等因素自动选择最优的 AI 模型。系统支持动态模型注册、智能路由策略、降级机制、请求队列和并发控制。

## 架构设计

### 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                     ModelRouter                             │
│                   (智能路由引擎)                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  策略选择器   │  │  模型评分器   │  │  降级管理器   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  缓存管理器   │  │  队列管理器   │  │  统计收集器   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ModelRegistry                             │
│                   (模型注册中心)                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  模型注册表   │  │  健康检查器   │  │  成本估算器   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  能力过滤器   │  │  状态管理器   │  │  统计分析器   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 文件结构

```
src/lib/ai/routing/
├── types.ts                    # 类型定义
├── model-registry.ts           # 模型注册中心
├── model-router.ts             # 智能路由引擎
├── index.ts                    # 导出索引
└── __tests__/
    ├── model-registry.test.ts  # 注册中心测试
    └── model-router.test.ts    # 路由引擎测试
```

## 核心功能

### 1. 模型注册中心 (ModelRegistry)

#### 功能特性

- **动态注册/注销**: 支持运行时动态添加和移除模型
- **能力标签**: 模型支持的能力（code, text, image, audio, reasoning 等）
- **成本配置**: 输入/输出 token 价格配置
- **速率限制**: 每模型独立的 RPM/TPM 限制
- **健康检查**: 模型可用性监控和状态管理
- **查询接口**: 多种查询和筛选方法

#### 主要方法

```typescript
// 注册模型
register(config: ModelConfig): void
registerBatch(configs: ModelConfig[]): void

// 注销模型
unregister(modelId: string): boolean

// 更新配置
update(modelId: string, updates: Partial<ModelConfig>): boolean

// 查询方法
getModel(modelId: string): ModelConfig | undefined
getEnabledModels(): ModelConfig[]
getAvailableModels(): ModelConfig[]
getModelsByCapability(capability: ModelCapability): ModelConfig[]
getModelsByProvider(provider: string): ModelConfig[]
getModelsByPriority(): ModelConfig[]
getModelsByCost(): ModelConfig[]
getModelsByLatency(): ModelConfig[]
getModelsByReliability(): ModelConfig[]

// 状态管理
setModelStatus(modelId: string, status: ModelStatus): boolean
setModelEnabled(modelId: string, enabled: boolean): boolean

// 健康检查
updateHealthCheck(healthCheck: ModelHealthCheck): void
getHealthCheck(modelId: string): ModelHealthCheck | undefined

// 成本估算
estimateCost(modelId: string, inputTokens: number, outputTokens: number): number

// 统计信息
getStats(): { total, enabled, available, byProvider, byStatus }
```

#### 默认模型

系统预配置了以下模型：

| 模型 ID | 提供商 | 优先级 | 主要能力 |
|---------|--------|--------|----------|
| gpt-4.5 | OpenAI | HIGH | Code, Text, Reasoning, Multimodal |
| gpt-4o | OpenAI | NORMAL | Code, Text, Image, Multimodal |
| claude-4-opus | Anthropic | HIGH | Code, Text, Reasoning |
| claude-4-sonnet | Anthropic | NORMAL | Code, Text, Multimodal |
| gemini-2-pro | Google | NORMAL | Code, Text, Image, Multimodal |
| gemini-2-flash | Google | LOW | Text, Image, Multimodal |
| deepseek-coder | DeepSeek | NORMAL | Code, Text |
| deepseek-chat | DeepSeek | FALLBACK | Text, Reasoning |
| glm-4 | Zhipu | FALLBACK | Code, Text, Image |
| minimax-abab6 | MiniMax | FALLBACK | Text, Image |

### 2. 智能路由引擎 (ModelRouter)

#### 功能特性

- **智能路由**: 基于任务类型、复杂度、预算自动选择最优模型
- **多种策略**: 成本优化、延迟优化、质量优化、平衡策略
- **降级机制**: 模型不可用时自动切换备用模型
- **请求队列**: 支持优先级队列和并发控制
- **缓存机制**: 智能缓存路由决策
- **统计监控**: 详细的请求统计和性能指标
- **可视化**: 路由决策过程可视化

#### 路由策略

##### 成本优化 (COST_OPTIMIZED)

优先选择成本最低的模型，适合预算敏感的场景。

评分权重：
- 成本: 30%
- 延迟: 30%
- 质量: 40%

##### 延迟优化 (LATENCY_OPTIMIZED)

优先选择响应最快的模型，适合实时交互场景。

评分权重：
- 延迟: 50%
- 成本: 25%
- 质量: 25%

##### 质量优化 (QUALITY_OPTIMIZED)

优先选择质量最高的模型，适合复杂任务。

评分权重：
- 质量: 50%
- 成本: 25%
- 延迟: 25%

##### 平衡策略 (BALANCED)

综合考虑成本、延迟和质量，适合大多数场景。

评分权重：
- 质量: 40%
- 成本: 30%
- 延迟: 30%

#### 主要方法

```typescript
// 核心路由
route(request: RouteRequest): RouteDecision

// 队列管理
enqueue(request: RouteRequest, priority?: number): Promise<RouteDecision>

// 运行时配置
switchModel(modelId: string): boolean
setStrategy(strategy: RoutingStrategy): void
updateConfig(updates: Partial<RouterConfig>): void

// 统计和监控
getStats(): RoutingStats
getVisualization(request: RouteRequest): RoutingVisualization

// 缓存管理
resetStats(): void
clearQueue(): void
```

#### 路由决策

```typescript
interface RouteDecision {
  selectedModel: ModelConfig      // 选中的模型
  fallbackModels: ModelConfig[]   // 备用模型链
  reasoning: string               // 决策理由
  estimatedCost: number           // 预估成本（分）
  estimatedLatency: number        // 预估延迟（毫秒）
  confidence: number              // 置信度（0-1）
  strategy: RoutingStrategy       // 使用的策略
}
```

### 3. 配置接口

#### 环境变量配置

```bash
# 默认模型
DEFAULT_MODEL_ID=gpt-4o

# 默认策略
DEFAULT_STRATEGY=balanced

# 成本配置
DAILY_BUDGET_LIMIT=10000          # 每日预算（分）
ENABLE_COST_OPTIMIZATION=true

# 并发配置
MAX_CONCURRENT_REQUESTS=10
MAX_QUEUE_SIZE=100

# 缓存配置
ENABLE_CACHE=true
CACHE_TTL=300000                  # 5分钟

# 降级配置
ENABLE_FALLBACK=true
MAX_FALLBACK_ATTEMPTS=3

# 监控配置
ENABLE_METRICS=true
```

#### 运行时配置

```typescript
import { modelRouter } from './routing'

// 切换默认模型
modelRouter.switchModel('gpt-4o')

// 设置路由策略
modelRouter.setStrategy(RoutingStrategy.COST_OPTIMIZED)

// 更新配置
modelRouter.updateConfig({
  enableCache: false,
  dailyBudgetLimit: 5000,
})
```

#### 路由策略可视化

```typescript
const viz = modelRouter.getVisualization(request)

console.log('Selected:', viz.decision.selectedModel.displayName)
console.log('Reasoning:', viz.decision.reasoning)
console.log('Candidates:', viz.candidates.map(c => ({
  model: c.model.displayName,
  score: c.score,
  reasons: c.reasons
})))
console.log('Timeline:', viz.timeline)
```

## 使用示例

### 基础使用

```typescript
import { routeRequest, TaskType } from './routing'

const decision = routeRequest({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a function to sort an array',
  complexity: TaskComplexity.MEDIUM,
  budget: 100, // 1元
})

console.log(`Selected model: ${decision.selectedModel.displayName}`)
console.log(`Estimated cost: ${decision.estimatedCost} cents`)
console.log(`Estimated latency: ${decision.estimatedLatency}ms`)
```

### 高级使用

```typescript
import { modelRouter, TaskType, RoutingStrategy, ModelCapability } from './routing'

// 使用特定策略
const decision = modelRouter.route({
  taskType: TaskType.REASONING,
  prompt: 'Explain quantum computing',
  strategy: RoutingStrategy.QUALITY_OPTIMIZED,
  complexity: TaskComplexity.EXPERT,
  requiredCapabilities: [ModelCapability.REASONING],
  preferredProvider: 'anthropic',
})

// 使用队列
const queuedDecision = await modelRouter.enqueue({
  taskType: TaskType.CONVERSATION,
  prompt: 'Hello',
}, priority: 10)

// 获取可视化数据
const viz = modelRouter.getVisualization({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a function',
})

// 获取统计信息
const stats = modelRouter.getStats()
console.log(`Total requests: ${stats.totalRequests}`)
console.log(`Cache hits: ${stats.cacheHits}`)
console.log(`Average latency: ${stats.avgLatency}ms`)
console.log(`Total cost: ${stats.totalCost} cents`)
```

### 集成到现有 AI Service

```typescript
import { modelRouter, TaskType } from './routing'

class AIService {
  async generate(request: {
    prompt: string
    taskType?: TaskType
    maxTokens?: number
    budget?: number
  }) {
    // 获取路由决策
    const decision = modelRouter.route({
      taskType: request.taskType ?? TaskType.CONVERSATION,
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      budget: request.budget,
    })

    // 执行请求（带降级）
    try {
      return await this.executeWithModel(
        decision.selectedModel,
        request.prompt
      )
    } catch (error) {
      // 尝试备用模型
      for (const fallback of decision.fallbackModels) {
        try {
          return await this.executeWithModel(fallback, request.prompt)
        } catch (fallbackError) {
          continue
        }
      }
      throw error
    }
  }

  private async executeWithModel(model: ModelConfig, prompt: string) {
    // 实际调用模型 API
    // ...
  }
}
```

## 性能优化

### 缓存策略

- **决策缓存**: 缓存路由决策，避免重复计算
- **TTL**: 默认 5 分钟过期
- **相似度阈值**: 0.95（可配置）

### 并发控制

- **最大并发数**: 默认 10（可配置）
- **队列大小**: 默认 100（可配置）
- **优先级队列**: 支持请求优先级

### 成本优化

- **每日预算限制**: 防止超支
- **成本估算**: 精确预估每次请求成本
- **免费模型优先**: 预算耗尽时自动切换到免费模型

## 监控和统计

### 统计指标

```typescript
interface RoutingStats {
  totalRequests: number           // 总请求数
  successfulRequests: number      // 成功请求数
  failedRequests: number          // 失败请求数
  cacheHits: number               // 缓存命中数
  fallbacks: number               // 降级次数
  byModel: Map<string, number>    // 按模型统计
  byTaskType: Map<TaskType, number> // 按任务类型统计
  byStrategy: Map<RoutingStrategy, number> // 按策略统计
  avgLatency: number              // 平均延迟
  totalCost: number               // 总成本
}
```

### 健康检查

```typescript
interface ModelHealthCheck {
  modelId: string
  isHealthy: boolean
  latency?: number
  error?: string
  checkedAt: number
}
```

## 测试

### 单元测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test model-registry
npm test model-router
```

### 测试覆盖

- ✅ 模型注册/注销
- ✅ 模型查询和筛选
- ✅ 成本估算
- ✅ 状态管理
- ✅ 健康检查
- ✅ 路由决策
- ✅ 策略选择
- ✅ 降级机制
- ✅ 队列管理
- ✅ 缓存机制
- ✅ 统计收集
- ✅ 可视化

## 未来扩展

### 计划功能

1. **机器学习优化**: 使用历史数据优化路由决策
2. **A/B 测试**: 支持路由策略的 A/B 测试
3. **实时监控**: Webhook 通知和实时仪表板
4. **模型预热**: 预热模型连接池
5. **分布式路由**: 支持多实例协同路由
6. **自定义评分**: 允许用户自定义评分函数

### 扩展点

- 自定义路由策略
- 自定义评分函数
- 自定义降级逻辑
- 自定义缓存实现
- 自定义监控指标

## 总结

多模型智能路由系统提供了：

1. **灵活的模型管理**: 动态注册、能力标签、成本配置
2. **智能路由决策**: 多种策略、自动选择最优模型
3. **可靠的降级机制**: 自动切换备用模型
4. **高效的并发控制**: 请求队列、优先级管理
5. **完善的监控统计**: 详细指标、可视化数据
6. **简单的配置接口**: 环境变量、运行时配置

该系统可以无缝集成到现有的 AI Service 中，提供企业级的模型路由能力。
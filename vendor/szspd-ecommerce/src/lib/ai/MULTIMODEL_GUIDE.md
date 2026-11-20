# 多模型智能路由系统 - 文档

**版本**: v1.12.0
**最后更新**: 2026-04-03

## 📚 目录

1. [快速开始](#快速开始)
2. [架构概览](#架构概览)
3. [核心组件](#核心组件)
4. [API 参考](#api-参考)
5. [配置指南](#配置指南)
6. [最佳实践](#最佳实践)
7. [故障排查](#故障排查)

---

## 快速开始

### 安装

```bash
# 无需额外安装，已集成到 7zi 项目中
```

### 基础使用

```typescript
import { SmartRoutingAIService, TaskType } from '@/lib/ai'

// 创建服务
const service = new SmartRoutingAIService()

// 自动路由请求
const result = await service.generate({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a function to calculate fibonacci',
})

console.log('AI 响应:', result.content)
console.log('使用模型:', result.model.displayName)
console.log('成本:', result.cost / 100, '元')
```

### 流式生成

```typescript
// 流式生成
for await (const chunk of service.generateStream({
  taskType: TaskType.CONVERSATION,
  prompt: 'Tell me a story',
})) {
  console.log(chunk) // 逐块输出
}
```

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     SmartRoutingAIService                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ ModelRouter │  │ CostTracker │  │ Provider    │         │
│  │             │  │             │  │ Factory     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Model       │  │ Cost        │  │ AI          │
│ Registry    │  │ Records     │  │ Providers   │
└─────────────┘  └─────────────┘  └─────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                  │
           ┌────────▼────────┐             ┌────────▼────────┐
           │  OpenAI         │             │  Anthropic      │
           │  Provider       │             │  Provider       │
           └─────────────────┘             └─────────────────┘
                    │                                  │
           ┌────────▼────────┐             ┌────────▼────────┐
           │  GPT-4.5        │             │  Claude 4       │
           │  GPT-4o         │             │  Opus/Sonnet    │
           └─────────────────┘             └─────────────────┘
```

---

## 核心组件

### 1. ModelRouter - 智能路由引擎

**职责**:
- 根据任务特征选择最优模型
- 支持多种路由策略
- 生成备用模型链
- 估算成本和延迟

**路由策略**:
```typescript
enum RoutingStrategy {
  COST_OPTIMIZED = 'cost_optimized',      // 成本优先
  LATENCY_OPTIMIZED = 'latency_optimized', // 延迟优先
  QUALITY_OPTIMIZED = 'quality_optimized', // 质量优先
  BALANCED = 'balanced',                   // 平衡策略
  CUSTOM = 'custom',                       // 自定义策略
}
```

### 2. ModelRegistry - 模型注册表

**职责**:
- 模型动态注册/注销
- 模型能力管理
- 模型状态维护
- 模型健康检查

**核心方法**:
```typescript
// 注册模型
registry.register(config)

// 获取模型
const model = registry.getModel('gpt-4o')

// 按能力筛选
const models = registry.getModelsByCapability(ModelCapability.CODE)

// 按成本排序
const cheapModels = registry.getModelsByCost()
```

### 3. BaseProvider - Provider 基类

**职责**:
- 统一的 AI 模型接口
- HTTP 请求封装
- 重试和错误处理
- 成本计算

**支持的 Provider**:
- OpenAI (GPT-4.5, GPT-4o)
- Anthropic (Claude 4 Opus, Sonnet)
- Google (Gemini 2 Pro, Flash)
- DeepSeek (Coder, Chat)
- Zhipu (GLM-4)

### 4. CostTracker - 成本追踪器

**职责**:
- 记录每次请求的成本
- 统计成本使用情况
- 预算控制
- 按维度统计

**核心方法**:
```typescript
// 记录成本
costTracker.record({
  modelId: 'gpt-4o',
  modelName: 'GPT-4o',
  provider: 'openai',
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
  cost: 50,
  latency: 1500,
})

// 获取统计
const stats = costTracker.getStats()
console.log('总成本:', stats.totalCost / 100, '元')

// 检查预算
if (costTracker.checkBudget(100)) {
  // 执行请求
}
```

---

## API 参考

### SmartRoutingAIService

#### 构造函数

```typescript
constructor(config?: SmartAIServiceConfig)
```

**参数**:
- `enableCostTracking` - 启用成本追踪（默认: true）
- `enableCaching` - 启用缓存（默认: true）
- `enableFallback` - 启用降级（默认: true）
- `costTrackerConfig` - 成本追踪器配置

#### generate

```typescript
async generate(request: RouteRequest): Promise<GenerateResult>
```

**参数**:
- `taskType` - 任务类型
- `prompt` - 提示词
- `maxTokens` - 最大 token 数（可选）
- `temperature` - 温度参数（可选）
- `systemPrompt` - 系统提示（可选）
- `history` - 历史消息（可选）
- `budget` - 最大预算（可选）
- `strategy` - 路由策略（可选）

**返回**:
```typescript
{
  content: string,         // AI 响应
  model: ModelConfig,      // 使用的模型
  cost: number,           // 成本（分）
  latency: number,         // 延迟（毫秒）
  usage: {
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
  },
  decision: RouteDecision, // 路由决策
  fromCache: boolean,      // 是否来自缓存
  retries: number,         // 重试次数
}
```

#### generateStream

```typescript
async *generateStream(request: RouteRequest): AsyncGenerator<string>
```

**参数**: 同 `generate`

**返回**: 异步生成器，逐块输出文本

---

## 配置指南

### 环境变量

```bash
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google
GOOGLE_API_KEY=your-google-api-key

# DeepSeek
DEEPSEEK_API_KEY=your-deepseek-api-key

# Zhipu
ZHIPU_API_KEY=your-zhipu-api-key

# MiniMax
MINIMAX_API_KEY=your-minimax-api-key
```

### 服务配置

```typescript
const service = new SmartRoutingAIService({
  enableCostTracking: true,
  enableCaching: true,
  enableFallback: true,
  costTrackerConfig: {
    maxRecords: 10000,
    enablePersistence: true,
    persistencePath: '/data/cost-tracker.json',
    dailyBudgetLimit: 10000, // 100 元
  },
  routerConfig: {
    defaultStrategy: RoutingStrategy.BALANCED,
    defaultModelId: 'gpt-4o',
    enableCache: true,
    cacheTTL: 300000, // 5 分钟
    enableFallback: true,
    maxFallbackAttempts: 3,
  },
})
```

---

## 最佳实践

### 1. 合理设置预算

```typescript
// 根据业务量设置合理的每日预算
const service = new SmartRoutingAIService({
  costTrackerConfig: {
    dailyBudgetLimit: 10000, // 100 元/天
  },
})

// 定期检查预算
const remaining = service.getRemainingBudget()
if (remaining < 1000) { // 剩余 < 10 元
  // 发送告警
  console.warn('预算即将耗尽')
}
```

### 2. 选择合适的路由策略

```typescript
// 成本敏感场景
service.setStrategy(RoutingStrategy.COST_OPTIMIZED)

// 质量优先场景
service.setStrategy(RoutingStrategy.QUALITY_OPTIMIZED)

// 速度优先场景
service.setStrategy(RoutingStrategy.LATENCY_OPTIMIZED)

// 默认平衡策略
service.setStrategy(RoutingStrategy.BALANCED)
```

### 3. 利用缓存

```typescript
// 相似请求会被缓存
const result1 = await service.generate({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a function to add numbers',
})

// 第二次相同请求会命中缓存
const result2 = await service.generate({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a function to add numbers',
})

console.log(result2.fromCache) // true
```

### 4. 监控和统计

```typescript
// 定期获取统计
setInterval(() => {
  const routingStats = service.getRoutingStats()
  const costStats = service.getCostStats()

  console.log('路由统计:', {
    总请求数: routingStats.totalRequests,
    缓存命中: routingStats.cacheHits,
    降级次数: routingStats.fallbacks,
  })

  console.log('成本统计:', {
    总成本: costStats.totalCost / 100 + '元',
    平均成本: costStats.avgCostPerRequest / 100 + '元',
    平均延迟: costStats.avgLatency + 'ms',
  })
}, 60000) // 每分钟
```

---

## 故障排查

### 1. 所有模型都失败

**问题**: 所有模型都返回错误

**解决方案**:
1. 检查 API Key 是否正确
2. 检查网络连接
3. 查看模型状态
```typescript
const viz = service.getVisualization({
  taskType: TaskType.CONVERSATION,
  prompt: 'Hello',
})
console.log('候选模型:', viz.candidates)
```

### 2. 成本超出预算

**问题**: 请求失败，提示超出预算

**解决方案**:
1. 增加预算限制
2. 切换到成本优化策略
3. 使用免费模型（如 Gemini 2 Flash）
```typescript
service.setStrategy(RoutingStrategy.COST_OPTIMIZED)
```

### 3. 响应时间过长

**问题**: 请求响应时间过长

**解决方案**:
1. 切换到延迟优化策略
2. 减少最大 token 数
3. 使用更快的模型
```typescript
const result = await service.generate({
  taskType: TaskType.CONVERSATION,
  prompt: 'Hello',
  maxTokens: 500, // 减少 token 数
})
```

### 4. 模型选择不合理

**问题**: 选择的模型不适合任务

**解决方案**:
1. 查看路由决策理由
2. 手动指定任务类型
3. 设置首选提供商
```typescript
const result = await service.generate({
  taskType: TaskType.CODE_GENERATION, // 明确指定任务类型
  prompt: 'Write code',
  preferredProvider: 'anthropic', // 首选 Anthropic
})
```

---

## 总结

多模型智能路由系统提供了：

✅ **自动路由** - 根据任务特征自动选择最优模型
✅ **成本优化** - 智能成本控制和预算管理
✅ **高可用性** - 完善的 fallback 机制
✅ **可观测性** - 完整的统计和监控
✅ **易用性** - 简单的 API 接口

通过合理配置和最佳实践，可以显著降低成本、提升性能、改善用户体验。

# 多模型智能路由系统

## 概述

这是一个智能的多模型路由引擎，可以根据任务类型、复杂度、成本预算等因素自动选择最优的 AI 模型。

## 核心功能

### 1. 模型选择策略

支持多种主流 AI 模型：
- **OpenAI**: GPT-4.5, GPT-4o
- **Anthropic**: Claude 4 Opus, Claude 4 Sonnet
- **Google**: Gemini 2 Pro, Gemini 2 Flash
- **DeepSeek**: DeepSeek Coder, DeepSeek Chat
- **Zhipu**: GLM-4, GLM-4 Flash
- **其他**: MiniMax, Baillian, Self-hosted Claude

### 2. 任务分类器

自动识别 12 种任务类型：
- `code_generation` - 代码生成
- `code_completion` - 代码补全
- `conversation` - 对话
- `analysis` - 分析
- `translation` - 翻译
- `summarization` - 摘要
- `creative_writing` - 创意写作
- `math` - 数学
- `reasoning` - 推理
- `qa` - 问答
- `instruction_following` - 指令执行
- `multimodal` - 多模态

### 3. 复杂度评估

根据多个因素评估任务复杂度：
- 输入长度
- 关键词特征
- 历史上下文
- 代码块数量

### 4. 成本控制

- 预算限制 (单次请求 / 每日)
- 自动选择性价比最高的模型
- 成本预估

### 5. 降级机制

- 熔断器保护
- 自动切换备用模型
- 重试机制

### 6. 语义缓存

- 相似请求缓存
- 相似度阈值 95%
- LRU 淘汰策略

### 7. 限流控制

- RPM (Requests Per Minute)
- TPM (Tokens Per Minute)
- 突发流量处理

## 快速开始

### 基本使用

```typescript
import { routeRequest, TaskType } from '@/lib/ai'

// 路由请求
const decision = routeRequest({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a function to calculate fibonacci',
})

console.log(decision.selectedModel.displayName) // e.g., "GPT-4.5"
console.log(decision.estimatedCost) // 预估成本 (分)
console.log(decision.reasoning) // 决策理由
```

### 自动分类

```typescript
import { classifyTask } from '@/lib/ai'

const result = classifyTask('Write a function to add numbers')
console.log(result.taskType) // "code_generation"
console.log(result.confidence) // 0.85
```

### 复杂度评估

```typescript
import { evaluateComplexity } from '@/lib/ai'

const result = evaluateComplexity('Design a distributed system')
console.log(result.level) // "high"
console.log(result.score) // 75
```

### 使用路由器实例

```typescript
import { ModelRouter, TaskType, AIModelProvider } from '@/lib/ai'

const router = new ModelRouter({
  defaultModelId: 'gpt-4o',
  enableCostOptimization: true,
  budgetLimits: {
    dailyLimit: 10000, // 100 元
    perRequestLimit: 1000, // 10 元
  },
})

const decision = router.route({
  taskType: TaskType.CODE_GENERATION,
  prompt: 'Write a complex algorithm',
  budget: 500, // 5 元预算
  preferredProvider: AIModelProvider.ANTHROPIC,
})
```

### 集成到 Agent 系统

```typescript
import { AgentWithSmartRouting } from '@/lib/ai'

// 创建带智能路由的 Agent
const agent = new AgentWithSmartRouting('agent-1', aiService)

// 处理消息 (自动分类和路由)
const response = await agent.handleMessage('Write a function')
```

## API 参考

### RouteRequest

```typescript
interface RouteRequest {
  taskType?: TaskType // 可选，自动检测
  prompt: string
  maxTokens?: number
  complexity?: ComplexityLevel
  budget?: number // 最大预算 (分)
  preferredProvider?: AIModelProvider
  requiredCapabilities?: string[]
  temperature?: number
  systemPrompt?: string
  history?: MessageContext[]
  requireStreaming?: boolean
  requireVision?: boolean
  requireFunctionCalling?: boolean
}
```

### RouteDecision

```typescript
interface RouteDecision {
  selectedModel: AIModel
  fallbackModels: AIModel[]
  reasoning: string
  estimatedCost: number // 分
  estimatedLatency: number // ms
  confidence: number // 0-1
}
```

## 文件结构

```
src/lib/ai/
├── index.ts           # 统一导出
├── types.ts           # 类型定义
├── models.ts          # 模型配置
├── classifier.ts      # 任务分类器
├── complexity.ts      # 复杂度评估
├── router.ts          # 核心路由引擎
├── cache.ts           # 语义缓存
├── rate-limiter.ts    # 限流控制
├── fallback.ts        # 降级机制
├── integration.ts     # 集成工具
└── __tests__/
    ├── classifier.test.ts
    ├── complexity.test.ts
    ├── cache.test.ts
    └── router.test.ts
```

## 测试

```bash
# 运行所有测试
npm run test:run -- src/lib/ai/__tests__/

# 运行单个测试文件
npm run test:run -- src/lib/ai/__tests__/router.test.ts
```

## 版本历史

### v1.10.0 (2026-04-03)

- 初始实现
- 支持 12 种任务类型
- 支持 13+ 模型
- 73 个单元测试全部通过

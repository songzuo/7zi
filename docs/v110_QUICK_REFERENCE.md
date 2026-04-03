# v1.10.0 AI 增强 - 快速参考卡

## 模型选择速查表

| 任务类型 | 首选模型 | 备选模型 | 成本级别 |
|----------|----------|----------|----------|
| 复杂代码生成 | GPT-4.5 | Claude 4 | 高 |
| 简单代码补全 | DeepSeek-Coder | CodeLlama | 低 |
| 长文档分析 | Claude 4 | Gemini 2 Pro | 中 |
| 简单问答 | Gemini 2 Flash | GPT-4o-mini | 很低 |
| 中文内容 | GLM-4 | Claude 4 | 中 |
| 图像理解 | GPT-4V | Gemini 2 Pro | 高 |
| 数学推理 | o1 | Claude 4 | 高 |

## API 调用示例

### 统一接口

```typescript
import { ai } from '@/lib/ai'

// 自动选择最优模型
const response = await ai.complete({
  messages: [{ role: 'user', content: '生成一个 React 组件' }],
  routing: { preferQuality: true }
})

// 指定模型
const response = await ai.complete({
  messages: [{ role: 'user', content: '...' }],
  model: 'claude-4'
})

// 流式响应
for await (const chunk of ai.completeStream({ ... })) {
  console.log(chunk.content)
}
```

### 代码生成

```typescript
import { codeEngine } from '@/lib/ai/code-engine'

// 从自然语言生成代码
const code = await codeEngine.generateFromNL(
  '创建一个 debounce 函数',
  { language: 'typescript' }
)

// 智能补全
const suggestions = await codeEngine.complete(codeContext, position)

// 生成测试
const tests = await codeEngine.generateTests(code, 'vitest')
```

### 调试助手

```typescript
import { debugAssistant } from '@/lib/ai/debug-assistant'

// 分析错误
const analysis = await debugAssistant.analyzeError(error, {
  codeContext,
  stackTrace
})

// 获取修复建议
const fixes = await debugAssistant.suggestFixes(analysis)

// 一键应用
await debugAssistant.applyFix(fixes[0])
```

### 报表生成

```typescript
import { reportGenerator } from '@/lib/ai/report-generator'

// 从自然语言生成报表
const report = await reportGenerator.generateFromNL({
  description: '生成上个月销售报表，按产品分类',
  format: 'pdf'
})
```

## 成本优化技巧

### 1. 使用缓存

```typescript
// 相似请求会命中缓存，不消耗 API
const response = await ai.complete({
  messages: [...],
  cache: { enabled: true, ttl: 3600 }
})
```

### 2. 选择合适模型

```typescript
// 简单任务用轻量模型
const response = await ai.complete({
  messages: [...],
  routing: { preferCost: true }  // 自动选择低成本模型
})
```

### 3. 批量处理

```typescript
// 多个请求合并处理
const responses = await ai.batch([
  { messages: [...] },
  { messages: [...] }
])
```

## 限流配置

```typescript
// 检查当前配额
const quota = await ai.getQuota()
// { used: 1000, limit: 5000, remaining: 4000 }

// 设置预算告警
await ai.setBudgetAlert({
  daily: 10,    // USD
  alertAt: 0.8  // 80% 告警
})
```

## 错误处理

```typescript
try {
  const response = await ai.complete({ ... })
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // 自动降级到备选模型
    const fallback = await ai.complete({ ..., model: 'fallback' })
  }
  if (error.code === 'QUOTA_EXCEEDED') {
    // 今日配额已用尽
  }
}
```

## 环境变量

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...
ZHIPU_API_KEY=...

# 路由配置
AI_ROUTING_ENABLED=true
AI_COST_OPTIMIZATION=true
AI_CACHE_ENABLED=true
```

## 更多资源

- 完整路线图: `v110_AI_ENHANCEMENT_ROADMAP.md`
- 执行摘要: `docs/v110_AI_ENHANCEMENT_SUMMARY.md`
- API 文档: `docs/api/AI_API.md` (待创建)

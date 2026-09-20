# 智能调试系统 (Smart Debug System)

**版本:** v1.10.0

智能调试和根因分析系统，自动分析错误并提供修复方案。

## 功能特性

### 核心功能

1. **错误分类** - 将错误分类（语法/运行时/逻辑/系统/网络/数据库/验证/认证/资源）
2. **堆栈分析** - 解析错误堆栈，定位问题源头
3. **上下文关联** - 结合代码上下文分析错误原因
4. **修复方案** - 生成多个修复方案并按优先级排序
5. **根因挖掘** - 不仅仅是修复表面错误，而是找到根本原因

### 集成功能

6. **日志分析** - 分析日志文件，识别错误模式
7. **告警集成** - 与监控告警系统集成，自动触发告警

## 快速开始

### 基础使用

```typescript
import { diagnose, classify, analyzeStack } from '@/lib/debug'

// 快速诊断错误
const error = new Error("Cannot read property 'user' of null")
const report = await diagnose(error)

console.log('错误分类:', report.classification)
console.log('根因:', report.rootCauseAnalysis.description)
console.log('修复建议:', report.fixSuggestions.map(s => s.title))
```

### 错误分类

```typescript
import { classify } from '@/lib/debug'

const error = new Error('ETIMEDOUT: Connection timeout')
const classification = classify(error)

console.log('类别:', classification.category) // 'network'
console.log('子类型:', classification.subtype) // 'timeout'
console.log('严重程度:', classification.severity) // 'medium'
console.log('置信度:', classification.confidence) // 0.85
```

### 堆栈分析

```typescript
import { analyzeStack } from '@/lib/debug'

const error = new Error('Test error')
const analysis = analyzeStack(error)

console.log('错误源头:', analysis.rootFrame)
console.log('错误链:', analysis.errorChain)
console.log('是否可恢复:', analysis.isRecoverable)
console.log('建议:', analysis.suggestions)
```

### 完整诊断

```typescript
import { DiagnosticEngine } from '@/lib/debug'

const engine = new DiagnosticEngine({
  maxFixSuggestions: 10,
  minConfidence: 0.3,
  logAnalysis: true,
})

const report = await engine.analyze(error, {
  sourceCode: new Map([
    ['src/app.ts', 'const code = "..."'],
  ]),
  logs: [...],
  metrics: [...],
})
```

## 高级功能

### 日志分析

```typescript
import { logAnalyzer } from '@/lib/debug'

const logEntries = [
  {
    timestamp: '2024-01-01T00:00:00Z',
    level: 'error',
    message: 'Cannot read property of null',
  },
  // ...
]

const result = await logAnalyzer.analyzeLogs(logEntries)

console.log('错误总数:', result.errorCount)
console.log('Top 错误:', result.topErrors)
console.log('模式:', result.patterns)
console.log('建议:', result.recommendations)
```

### 告警集成

```typescript
import {
  alertIntegration,
  consoleAlertHandler,
  SlackAlertHandler,
} from '@/lib/debug'

// 注册处理器
alertIntegration.registerHandler(consoleAlertHandler)
alertIntegration.registerHandler(
  new SlackAlertHandler('https://hooks.slack.com/...')
)

// 处理错误并触发告警
await alertIntegration.handleError(error, 'api-service')
```

### 自定义告警处理器

```typescript
import type { AlertHandler, AlertIntegration } from '@/lib/debug'

const customHandler: AlertHandler = {
  name: 'custom',
  async handle(alert: AlertIntegration) {
    // 自定义处理逻辑
    await sendToCustomService(alert)
  },
}

alertIntegration.registerHandler(customHandler)
```

## 错误分类

系统支持以下错误类别：

| 类别 | 子类型 | 说明 |
|------|--------|------|
| `syntax` | `unexpected-token`, `missing-bracket`, `type-mismatch` | 语法错误 |
| `runtime` | `null-reference`, `undefined-reference`, `type-error`, `range-error` | 运行时错误 |
| `logic` | `infinite-loop`, `race-condition`, `deadlock` | 逻辑错误 |
| `system` | `out-of-memory`, `stack-overflow`, `permission-denied`, `file-not-found` | 系统错误 |
| `network` | `timeout`, `connection-refused`, `dns-error`, `ssl-error` | 网络错误 |
| `database` | `query-timeout`, `connection-pool-exhausted`, `deadlock-detected`, `constraint-violation` | 数据库错误 |
| `validation` | - | 验证错误 |
| `auth` | - | 认证错误 |
| `resource` | - | 资源错误 |

## 修复方案

系统会生成多个修复方案，按以下优先级排序：

1. **immediate** - 立即修复（关键错误）
2. **high** - 高优先级
3. **medium** - 中等优先级
4. **low** - 低优先级

每个修复方案包含：
- 标题和描述
- 优先级和难度
- 具体步骤
- 代码变更建议（如果适用）
- 相关文档链接

## 根因分析

系统会深入分析错误的根本原因：

- **code-defect** - 代码缺陷
- **configuration-error** - 配置错误
- **dependency-issue** - 依赖问题
- **environment-issue** - 环境问题
- **resource-exhaustion** - 资源耗尽
- **concurrency-issue** - 并发问题
- **data-issue** - 数据问题
- **integration-issue** - 集成问题
- **design-flaw** - 设计缺陷

## 配置选项

```typescript
import { DiagnosticEngine } from '@/lib/debug'

const engine = new DiagnosticEngine({
  enableSourceContext: true,      // 启用源代码上下文
  maxStackFrames: 50,             // 最大堆栈帧数
  maxFixSuggestions: 5,           // 最大修复建议数
  minConfidence: 0.3,             // 最小置信度
  includeExperimentalFixes: false, // 包含实验性修复
  logAnalysis: true,              // 记录分析日志
  traceIntegration: true,         // 集成追踪
  alertIntegration: true,         // 集成告警
})
```

## API 参考

### DiagnosticEngine

```typescript
class DiagnosticEngine {
  constructor(config?: Partial<DebugSystemConfig>)

  analyze(error: Error | string, context?: AnalysisContext): Promise<DiagnosticReport>
  analyzeBatch(errors: (Error | string)[], context?: AnalysisContext): Promise<DiagnosticReport[]>
  classify(error: Error | string): ErrorClassification
  analyzeStack(error: Error): StackAnalysis
}
```

### DiagnosticReport

```typescript
interface DiagnosticReport {
  id: string
  timestamp: string
  error: ErrorSummary
  classification: ErrorClassification
  stackAnalysis: StackAnalysis
  contextAnalysis: ContextAnalysis
  rootCauseAnalysis: RootCauseAnalysis
  fixSuggestions: FixSuggestion[]
  metadata: ReportMetadata
}
```

## 使用示例

### React 错误边界

```typescript
import { diagnose } from '@/lib/debug'

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    diagnose(error).then(report => {
      console.log('诊断报告:', report)
      // 发送到监控服务
      sendToMonitoring(report)
    })
  }
}
```

### Express 错误处理

```typescript
import { diagnose } from '@/lib/debug'

app.use(async (err, req, res, next) => {
  const report = await diagnose(err)

  // 记录诊断报告
  logger.error('Error diagnosed:', report)

  // 返回用户友好的错误信息
  res.status(500).json({
    error: report.error.message,
    suggestions: report.fixSuggestions.map(s => s.title),
  })
})
```

### Next.js API 路由

```typescript
import { diagnose } from '@/lib/debug'

export default async function handler(req, res) {
  try {
    // API 逻辑
  } catch (error) {
    const report = await diagnose(error)

    // 记录错误
    console.error('API Error:', report)

    // 返回错误响应
    res.status(500).json({
      error: report.error.message,
      rootCause: report.rootCauseAnalysis.description,
    })
  }
}
```

## 测试

```bash
# 运行测试
npm test src/lib/debug/__tests__/debug.test.ts

# 运行测试覆盖率
npm test -- --coverage src/lib/debug
```

## 性能

- 分析速度: < 100ms (典型错误)
- 内存占用: < 10MB
- 支持批量分析: 100+ 错误/秒

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
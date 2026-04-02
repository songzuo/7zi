# v1.8.0 根因分析自动化测试框架设计

## 1. 概述

本文档定义了 v1.8.0 版本中 Automated Root Cause Analysis（根因分析自动化）的测试框架设计。该框架基于现有的 Vitest 测试基础设施，专门针对根因分析功能进行测试场景设计、断言策略规划以及 Mock 数据生成方案制定。

### 1.1 现有测试基础设施

经过调研，当前项目的测试框架结构如下：

- **测试运行器**: Vitest v4.x
- **测试环境**: jsdom（支持 React 组件测试）
- **测试文件位置**:
  - `src/test/` - 主测试目录
  - `src/lib/__tests__/` - 库函数测试
  - `src/lib/performance/root-cause-analysis/` - 根因分析核心模块
- **配置文件**: `vitest.config.ts`
- **Mock 基础设施**: `src/test/mocks/`

### 1.2 根因分析现有模块

v1.8.0 计划实现的根因分析自动化功能基于以下核心模块：

- **CallChainTracer**: 调用链追踪器（已实现完整测试）
- **CausalityAnalyzer**: 因果关系分析器（已实现测试）
- **CorrelationEngine**: 关联分析引擎（已实现测试）
- **RootCauseAnalyzer**: 根因分析器（已实现测试）
- **TraceManager**: 分布式追踪管理器

---

## 2. 测试场景设计

根因分析自动化测试框架将覆盖以下主要故障场景，每个场景都设计为可独立运行和自动化执行。

### 2.1 异常注入场景

#### 2.1.1 数据库异常场景

| 场景 ID | 场景名称   | 注入方式               | 预期根因                     |
| ------- | ---------- | ---------------------- | ---------------------------- |
| DB-001  | 查询超时   | 模拟慢查询 (>5s)       | 数据库索引缺失或查询优化不足 |
| DB-002  | 连接池耗尽 | 限制连接数             | 连接池配置不当或连接泄漏     |
| DB-003  | 死锁       | 循环依赖锁             | 事务顺序不当或锁粒度过大     |
| DB-004  | N+1 查询   | 批量查询拆分为单条     | ORM 查询模式问题             |
| DB-005  | 大结果集   | 返回超过内存阈值的数据 | 分页缺失或 LIMIT 未设置      |

#### 2.1.2 API 异常场景

| 场景 ID | 场景名称       | 注入方式               | 预期根因                 |
| ------- | -------------- | ---------------------- | ------------------------ |
| API-001 | 请求超时       | 延迟响应 (>30s)        | 外部服务响应慢或网络问题 |
| API-002 | 503 服务不可用 | 返回 503 状态码        | 服务端资源不足或维护状态 |
| API-003 | 429 限流       | 返回 429 + Retry-After | 客户端请求频率超限       |
| API-004 | 401 认证失败   | 返回 401 状态码        | Token 过期或权限配置错误 |
| API-005 | 响应体过大     | 返回 >10MB 响应        | 未实现分页或流式处理     |

#### 2.1.3 前端异常场景

| 场景 ID | 场景名称       | 注入方式          | 预期根因                      |
| ------- | -------------- | ----------------- | ----------------------------- |
| FE-001  | React 组件崩溃 | 抛出未捕获异常    | 组件状态异常或 undefined 访问 |
| FE-002  | 内存泄漏       | 累积未释放的引用  | 事件监听器未清理或闭包引用    |
| FE-003  | 渲染阻塞       | 长任务 (>50ms)    | 大数据渲染或计算密集型操作    |
| FE-004  | LCP 超过阈值   | 延迟加载首屏资源  | 资源加载顺序不当              |
| FE-005  | CLS 突变       | 动态插入 DOM 元素 | 图片/广告未指定尺寸           |

### 2.2 日志分析场景

#### 2.2.1 日志模式识别

| 场景 ID | 场景名称     | 测试目标               | 断言策略                 |
| ------- | ------------ | ---------------------- | ------------------------ |
| LOG-001 | 错误日志聚类 | 将相似错误日志归类     | 验证聚类结果包含正确模式 |
| LOG-002 | 时序异常检测 | 识别时间序列中的异常点 | 验证异常点标记正确       |
| LOG-003 | 日志根因追溯 | 从错误日志追溯到根因   | 验证根因推断链完整性     |
| LOG-004 | 多源日志关联 | 关联不同服务的日志     | 验证关联正确性和覆盖率   |
| LOG-005 | 日志模式学习 | 从历史日志学习正常模式 | 验证异常检测准确率       |

### 2.3 端到端根因分析场景

| 场景 ID | 场景名称     | 涉及组件                         | 预期输出                  |
| ------- | ------------ | -------------------------------- | ------------------------- |
| E2E-001 | 用户请求慢   | TraceManager → RootCauseAnalyzer | 完整调用链 + 性能瓶颈分析 |
| E2E-002 | API 调用失败 | API Tracker → CorrelationEngine  | 失败原因 + 重试建议       |
| E2E-003 | 数据库死锁   | DB Tracker → CausalityAnalyzer   | 死锁图 + 解决方案         |
| E2E-004 | 前端性能下降 | Rendering Tracker → Analyzer     | 性能趋势 + 优化建议       |
| E2E-005 | 分布式追踪   | TraceManager → CallChainTracer   | 全链路拓扑 + 依赖分析     |

---

## 3. 断言策略设计

### 3.1 断言层次结构

```
根因分析断言
├── 1. 数据完整性断言
│   ├── 追踪数据完整性（无数据丢失）
│   ├── 日志数据完整性（时间戳连续）
│   └── 指标数据完整性（数值有效）
│
├── 2. 分析正确性断言
│   ├── 根因识别准确性（与预设根因匹配）
│   ├── 关联关系正确性（图结构正确）
│   └── 建议可行性（建议可实施）
│
├── 3. 性能断言
│   ├── 分析耗时（<5s for typical cases）
│   ├── 内存占用（<512MB）
│   └── 并发处理能力（支持 100+ 并发）
│
└── 4. 边界条件断言
    ├── 空输入处理（不崩溃）
    ├── 极端数据处理（大规模数据）
    └── 错误传播（错误正确传播）
```

### 3.2 断言示例

```typescript
// 数据完整性断言示例
expect(traceData.spans).toBeDefined()
expect(traceData.spans.size).toBeGreaterThan(0)

// 时序连续性
const sortedSpans = Array.from(traceData.spans.values()).sort((a, b) => a.startTime - b.startTime)
sortedSpans.forEach((span, idx) => {
  if (idx > 0) {
    expect(span.startTime).toBeGreaterThanOrEqual(sortedSpans[idx - 1].endTime)
  }
})

// 根因准确性断言
const analysisResult = analyzer.analyze(traceData)
expect(analysisResult.rootCauses).toContain('database-query-optimization')
expect(analysisResult.confidence).toBeGreaterThan(0.7)

// 性能断言
const startTime = performance.now()
analyzer.analyze(traceData)
const duration = performance.now() - startTime
expect(duration).toBeLessThan(5000) // 5秒内完成

// 建议可行性断言
analysisResult.recommendations.forEach(rec => {
  expect(rec.action).toBeDefined()
  expect(rec.priority).toMatch(/high|medium|low/)
  expect(rec.estimatedImpact).toBeGreaterThan(0)
})
```

### 3.3 断言辅助函数

创建 `src/test/assertions/root-cause-assertions.ts` 断言库：

```typescript
import { type CallChain, type AnalysisReport } from '@/lib/performance/root-cause-analysis/types'

/**
 * 断言调用链的完整性
 */
export function assertCallChainComplete(chain: CallChain): void {
  expect(chain.id).toBeDefined()
  expect(chain.root).toBeDefined()
  expect(chain.nodes.size).toBeGreaterThan(0)

  // 验证父子关系
  chain.nodes.forEach(node => {
    if (node.parent) {
      expect(chain.nodes.has(node.parent)).toBe(true)
    }
  })
}

/**
 * 断言分析报告质量
 */
export function assertAnalysisQuality(report: AnalysisReport): void {
  // 根因数量合理
  expect(report.rootCauses.length).toBeLessThanOrEqual(10)

  // 每个根因有置信度
  report.rootCauses.forEach(cause => {
    expect(cause.confidence).toBeGreaterThanOrEqual(0)
    expect(cause.confidence).toBeLessThanOrEqual(1)
  })

  // 建议可执行
  report.recommendations.forEach(rec => {
    expect(rec.action).toBeDefined()
    expect(rec.action.type).toMatch(/optimization|configuration|refactor/)
  })
}

/**
 * 断言时序正确性
 */
export function assertTemporalOrder(chain: CallChain): void {
  const nodes = Array.from(chain.nodes.values())
  nodes.forEach(node => {
    if (node.startTime && node.endTime) {
      expect(node.endTime).toBeGreaterThanOrEqual(node.startTime)
    }
  })
}
```

---

## 4. Mock 数据生成方案

### 4.1 Mock 数据架构

```
src/test/
├── mocks/
│   └── root-cause/
│       ├── index.ts              # 导出所有 Mock 生成器
│       ├── trace-mock.ts         # Trace 数据生成器
│       ├── log-mock.ts           # 日志数据生成器
│       ├── metrics-mock.ts       # 指标数据生成器
│       └── anomaly-mock.ts       # 异常场景生成器
```

### 4.2 Trace Mock 生成器

```typescript
// src/test/mocks/root-cause/trace-mock.ts
import type { CallChain, CallNode, CallNodeType } from '@/lib/performance/root-cause-analysis/types'

export interface TraceMockOptions {
  depth?: number
  breadth?: number
  errorRate?: number
  slowCalls?: number
  includeNested?: boolean
}

export function generateMockTrace(options: TraceMockOptions = {}): CallChain {
  const { depth = 3, breadth = 3, errorRate = 0.1, slowCalls = 1, includeNested = true } = options

  const chain: CallChain = {
    id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    root: createMockNode('root', 'api', 0),
    nodes: new Map(),
    startedAt: Date.now() - 10000,
    endedAt: Date.now(),
    status: errorRate > Math.random() ? 'error' : 'success',
    parentSpanId: null,
  }

  // 构建调用树
  buildCallTree(chain.root, chain.nodes, depth, breadth, 0)

  // 标记错误节点
  if (chain.status === 'error') {
    const nodes = Array.from(chain.nodes.values())
    const errorNode = nodes[Math.floor(Math.random() * nodes.length)]
    errorNode.status = 'error'
    errorNode.error = {
      name: 'DatabaseError',
      message: 'Connection timeout after 5000ms',
      stack: 'Error: Connection timeout...',
    }
  }

  // 标记慢调用
  let slowCount = 0
  chain.nodes.forEach(node => {
    if (slowCount < slowCalls && Math.random() > 0.7) {
      node.duration = 5000 + Math.random() * 10000
      slowCount++
    }
  })

  return chain
}

function createMockNode(name: string, type: CallNodeType, level: number): CallNode {
  return {
    id: `node-${level}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    status: 'success',
    startTime: Date.now() - 5000 + Math.random() * 1000,
    endTime: Date.now() + Math.random() * 1000,
    duration: Math.random() * 1000,
    parent: null,
    children: [],
    metadata: {},
    metrics: {},
  }
}

function buildCallTree(
  parent: CallNode,
  nodes: Map<string, CallNode>,
  maxDepth: number,
  breadth: number,
  currentDepth: number
): void {
  if (currentDepth >= maxDepth) return

  const childCount = Math.floor(Math.random() * breadth) + 1
  const nodeTypes: CallNodeType[] = ['database', 'api', 'cache', 'function']

  for (let i = 0; i < childCount; i++) {
    const node = createMockNode(
      `${parent.name}-child-${i}`,
      nodeTypes[currentDepth % nodeTypes.length],
      currentDepth + 1
    )
    node.parent = parent.id
    parent.children.push(node.id)
    nodes.set(node.id, node)

    if (currentDepth < maxDepth - 1) {
      buildCallTree(node, nodes, maxDepth, breadth, currentDepth + 1)
    }
  }
}
```

### 4.3 日志 Mock 生成器

```typescript
// src/test/mocks/root-cause/log-mock.ts
export interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  service: string
  traceId?: string
  metadata?: Record<string, unknown>
}

export function generateMockLogs(options: {
  count?: number
  errorRate?: number
  timeRange?: number
  services?: string[]
}): LogEntry[] {
  const {
    count = 100,
    errorRate = 0.1,
    timeRange = 60000, // 1 minute
    services = ['api-gateway', 'user-service', 'database'],
  } = options

  const logs: LogEntry[] = []
  const baseTime = Date.now() - timeRange

  const errorPatterns = [
    'Connection timeout',
    'Out of memory',
    'NullPointerException',
    'Database locked',
    'Request failed with status 500',
  ]

  const infoPatterns = [
    'Request processed successfully',
    'User authenticated',
    'Cache hit',
    'Database query completed',
  ]

  for (let i = 0; i < count; i++) {
    const isError = Math.random() < errorRate
    const timeOffset = Math.random() * timeRange

    logs.push({
      timestamp: baseTime + timeOffset,
      level: isError ? 'error' : Math.random() > 0.3 ? 'info' : 'warn',
      message: isError
        ? errorPatterns[Math.floor(Math.random() * errorPatterns.length)]
        : infoPatterns[Math.floor(Math.random() * infoPatterns.length)],
      service: services[Math.floor(Math.random() * services.length)],
      traceId: `trace-${Math.random().toString(36).substr(2, 9)}`,
      metadata: isError ? { stack: 'Error stack trace...' } : undefined,
    })
  }

  return logs.sort((a, b) => a.timestamp - b.timestamp)
}
```

### 4.4 异常场景生成器

```typescript
// src/test/mocks/root-cause/anomaly-mock.ts
import type {
  AnalysisReport,
  RootCause,
  PerformanceAnomaly,
} from '@/lib/performance/root-cause-analysis/types'

export type AnomalyType =
  | 'slow-query'
  | 'connection-pool-exhaustion'
  | 'deadlock'
  | 'n-plus-1'
  | 'memory-leak'
  | 'api-timeout'
  | 'rate-limit'
  | 'render-blocking'

export interface AnomalyScenario {
  type: AnomalyType
  name: string
  description: string
  generateTrace: () => ReturnType<typeof import('./trace-mock').generateMockTrace>
  expectedRootCauses: string[]
}

export const anomalyScenarios: Record<AnomalyType, AnomalyScenario> = {
  'slow-query': {
    type: 'slow-query',
    name: '数据库慢查询',
    description: '模拟查询执行时间超过 5 秒的场景',
    generateTrace: () => generateSlowQueryTrace(),
    expectedRootCauses: ['missing-index', 'inefficient-query', 'large-result-set'],
  },
  'connection-pool-exhaustion': {
    type: 'connection-pool-exhaustion',
    name: '连接池耗尽',
    description: '模拟数据库连接池耗尽的场景',
    generateTrace: () => generateConnectionPoolTrace(),
    expectedRootCauses: ['pool-size-too-small', 'connection-leak', 'long-running-query'],
  },
  // ... 其他异常场景
}

function generateSlowQueryTrace() {
  // 实现：生成包含慢查询的调用链
}

function generateConnectionPoolTrace() {
  // 实现：生成包含连接池问题的调用链
}
```

---

## 5. 测试文件结构

### 5.1 测试目录设计

```
src/lib/performance/root-cause-analysis/
├── __tests__/
│   ├── root-cause-analysis.integration.test.ts  # 集成测试
│   ├── root-cause-analysis.e2e.test.ts          # 端到端测试
│   ├── trace-manager.test.ts                     # TraceManager 单元测试
│   ├── analyzers/
│   │   ├── database-analyzer.test.ts
│   │   ├── api-analyzer.test.ts
│   │   └── rendering-analyzer.test.ts
│   └── scenarios/
│       ├── slow-query.test.ts
│       ├── memory-leak.test.ts
│       └── deadlock.test.ts
│
├── test/
│   ├── fixtures/
│   │   ├── traces/              # 预生成的 trace 数据
│   │   ├── logs/                # 预生成的日志数据
│   │   └── reports/             # 预期的分析报告
│   │
│   └── scenarios/
│       ├── index.ts             # 场景定义导出
│       ├── database-scenarios.ts
│       ├── api-scenarios.ts
│       └── frontend-scenarios.ts
```

### 5.2 测试分类

| 测试类型   | 文件后缀               | 目的             | 运行频率 |
| ---------- | ---------------------- | ---------------- | -------- |
| 单元测试   | `.test.ts`             | 验证单个模块功能 | 每次提交 |
| 集成测试   | `.integration.test.ts` | 验证模块间协作   | 每次 PR  |
| 端到端测试 | `.e2e.test.ts`         | 验证完整业务流程 | 每日构建 |
| 性能测试   | `.performance.test.ts` | 验证性能指标     | 每周构建 |

---

## 6. 测试执行与报告

### 6.1 执行命令

```bash
# 运行所有根因分析测试
npm test -- --grep "RootCauseAnalyzer"

# 运行集成测试
npm test -- --grep "integration"

# 运行端到端测试
npm test -- --grep "e2e"

# 运行特定场景
npm test -- --grep "slow-query"

# 生成覆盖率报告
npm test -- --coverage --coverage.provider=v8
```

### 6.2 CI/CD 集成

在 `.github/workflows/test.yml` 中添加：

```yaml
root-cause-analysis:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Run Root Cause Analysis Tests
      run: npm test -- --grep "root-cause" --coverage

    - name: Upload Coverage Report
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: root-cause-analysis

    - name: Generate Test Report
      if: always()
      run: |
        npx vitest --reporter=html --output-file=test-report.html
```

### 6.3 测试报告输出

生成的测试报告应包含：

```json
{
  "testSuite": "Root Cause Analysis v1.8.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "total": 150,
    "passed": 145,
    "failed": 5,
    "skipped": 0,
    "duration": "45.2s"
  },
  "coverage": {
    "lines": "85%",
    "branches": "78%",
    "functions": "90%"
  },
  "scenarios": {
    "database": { "tested": 40, "passed": 38 },
    "api": { "tested": 35, "passed": 35 },
    "frontend": { "tested": 25, "passed": 22 }
  },
  "performance": {
    "avgAnalysisTime": "1.2s",
    "maxMemoryUsage": "256MB"
  }
}
```

---

## 7. 实施计划

### 7.1 阶段 1：基础设施（Week 1）

- [ ] 创建 Mock 数据生成器 (`src/test/mocks/root-cause/`)
- [ ] 实现断言辅助函数库
- [ ] 配置测试环境

### 7.2 阶段 2：单元测试（Week 2）

- [ ] 为 RootCauseAnalyzer 补充单元测试
- [ ] 为 TraceManager 补充单元测试
- [ ] 实现各分析器的专项测试

### 7.3 阶段 3：集成测试（Week 3）

- [ ] 实现端到端根因分析流程测试
- [ ] 实现多服务日志关联测试
- [ ] 添加性能基准测试

### 7.4 阶段 4：场景覆盖（Week 4）

- [ ] 实现所有异常场景注入
- [ ] 实现边界条件测试
- [ ] 生成完整的测试报告

---

## 8. 验收标准

测试框架完成后，应满足以下标准：

1. **覆盖率**: 根因分析核心模块覆盖率达到 80% 以上
2. **场景覆盖**: 覆盖所有设计的 15+ 异常场景
3. **自动化**: 所有测试可通过 `npm test` 自动执行
4. **报告生成**: 自动生成包含覆盖率、性能指标的测试报告
5. **CI 集成**: 测试自动集成到 CI/CD 流程

---

## 附录

### A. 现有测试参考

- `src/lib/performance/root-cause-analysis/call-chain-tracer.test.ts` - 已有完整测试示例
- `src/lib/performance/root-cause-analysis/analyzer.test.ts` - 已有分析器测试
- `src/test/vi-mocks.ts` - Mock 基础设施

### B. 相关配置文件

- `vitest.config.ts` - 测试运行配置
- `src/test/setup.ts` - 测试环境初始化

---

**文档版本**: v1.0  
**创建日期**: 2024-01-15  
**作者**: AI Test Engineer  
**版本**: v1.8.0

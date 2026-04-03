# Performance Module

性能监控和异常检测模块 - 提供增量式异常检测、智能告警和多渠道通知能力。

## 📖 概述 / Overview

Performance 模块提供：

- **增量式异常检测** - 使用 Welford's Online Algorithm 实现高效 Z-Score 计算
- **流式 Isolation Forest** - 增量训练，无需存储全部历史数据
- **组合检测器** - 融合多种算法，提高检测准确性
- **增强版 Slack 告警** - 级别路由、节流控制、自动重试

## 🚀 快速开始 / Quick Start

### 异常检测

```typescript
import { StreamingAnomalyDetector } from '@/lib/performance/incremental-anomaly-detector'

// 创建检测器
const detector = new StreamingAnomalyDetector({
  zscore: { threshold: 3, minSamples: 10 },
  isolationForest: { treeSize: 256, maxTrees: 100 },
  windowSize: 1000
})

// 检测数据点
const result = detector.detect(42.5)
console.log(result.isAnomaly, result.confidence)
```

### Slack 告警

```typescript
import { EnhancedSlackChannel } from '@/lib/performance/alerting/channels/slack-enhanced'

const channel = new EnhancedSlackChannel(
  {
    webhookUrl: process.env.SLACK_WEBHOOK_URL!,
    levelChannels: {
      critical: '#incidents',
      error: '#alerts-error',
      warning: '#alerts-warning'
    }
  },
  {
    mention: '@oncall',
    throttle: { windowMs: 60000, maxPerWindow: 1 },
    retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
  }
)

// 发送告警
await channel.send(alert)
```

## 📦 核心 API / Core API

---

## 异常检测 / Anomaly Detection

### StreamingAnomalyDetector

组合流式异常检测器，融合 Z-Score 和 Isolation Forest。

#### 构造函数

```typescript
constructor(config?: StreamingAnomalyDetectorConfig)
```

**配置选项**:
```typescript
interface StreamingAnomalyDetectorConfig {
  zscore?: {
    threshold?: number      // Z-Score 阈值，默认 3
    minSamples?: number     // 最小样本数，默认 10
  }
  isolationForest?: {
    treeSize?: number       // 每棵树样本数，默认 256
    maxTrees?: number       // 最大树数，默认 100
  }
  windowSize?: number       // 滑动窗口大小，默认 1000
  zscoreWeight?: number     // Z-Score 权重，默认 0.6
  iforestWeight?: number    // Isolation Forest 权重，默认 0.4
}
```

#### 方法

##### `detect()`

检测单个数据点是否为异常。

```typescript
detect(value: number): AnomalyResult
```

**返回**:
```typescript
interface AnomalyResult {
  value: number              // 原始值
  zScore: number             // Z-Score 值
  isAnomaly: boolean         // 是否异常
  anomalyScore: number       // Isolation Forest 分数 (0-1)
  confidence: number         // 综合置信度 (0-1)
  method: 'zscore' | 'isolation_forest' | 'combined'
}
```

**示例**:
```typescript
const detector = new StreamingAnomalyDetector()

// 实时检测
for (const value of dataStream) {
  const result = detector.detect(value)
  if (result.isAnomaly) {
    console.log(`异常检测: 值=${value}, 置信度=${result.confidence}`)
  }
}
```

##### `detectBatch()`

批量检测多个数据点。

```typescript
detectBatch(values: number[]): AnomalyResult[]
```

##### `getStats()`

获取检测统计信息。

```typescript
getStats(): {
  totalDetections: number
  anomalyCount: number
  anomalyRate: number
  zscoreStats: { count: number; mean: number; variance: number; stdDev: number }
  iforestTreeCount: number
}
```

##### `reset()`

重置检测器状态。

```typescript
reset(): void
```

---

### IncrementalZScore

增量式 Z-Score 检测器（Welford's Online Algorithm）。

**时间复杂度**: O(1) 每次 update  
**空间复杂度**: O(1)

```typescript
import { IncrementalZScore } from '@/lib/performance/incremental-anomaly-detector'

const zscore = new IncrementalZScore({ threshold: 3 })

// 增量更新
const result = zscore.update(42.5)
console.log(`Z-Score: ${result.zScore}, 异常: ${result.isAnomaly}`)

// 获取统计信息
const stats = zscore.getStats()
console.log(`均值: ${stats.mean}, 标准差: ${stats.stdDev}`)
```

---

### StreamingIsolationForest

流式 Isolation Forest 实现。

**特点**:
- 每 256 个点增量训练一棵树
- 保持最多 100 棵树
- 无需存储全部历史数据

```typescript
import { StreamingIsolationForest } from '@/lib/performance/incremental-anomaly-detector'

const forest = new StreamingIsolationForest({
  treeSize: 256,
  maxTrees: 100
})

// 添加数据点
forest.addPoint(42.5)

// 计算异常分数
const score = forest.anomalyScore(42.5)  // 0-1, 越高越异常
```

---

### BatchZScoreDetector

传统批处理 Z-Score 检测器（用于性能对比）。

```typescript
import { BatchZScoreDetector } from '@/lib/performance/incremental-anomaly-detector'

const detector = new BatchZScoreDetector({ threshold: 3 })

const result = detector.detect(42.5)
console.log(`Z-Score: ${result.zScore}, 异常: ${result.isAnomaly}`)
```

---

## 告警渠道 / Alert Channels

### EnhancedSlackChannel

增强版 Slack 告警渠道，支持：

- **级别路由** - 不同级别告警发送到不同频道
- **节流控制** - 防止告警风暴
- **自动重试** - 指数退避重试机制
- **统计追踪** - 发送成功/失败/节流计数

#### 构造函数

```typescript
constructor(config: SlackConfig, options?: SlackAlertOptions)
```

**配置**:
```typescript
interface SlackConfig {
  webhookUrl: string         // Slack webhook URL
  levelChannels?: {          // 级别到频道的映射
    info?: string
    warning?: string
    error?: string
    critical?: string
  }
  channel?: string           // 默认频道
  username?: string          // 机器人用户名
  iconEmoji?: string         // 图标 emoji
  enabled?: boolean          // 是否启用
}

interface SlackAlertOptions {
  channel?: string           // 覆盖频道
  mention?: string           // 提及用户/组
  includeFields?: boolean    // 包含详细字段
  includeMetadata?: boolean  // 包含元数据
  throttle?: {               // 节流配置
    windowMs: number
    maxPerWindow: number
  }
  retry?: {                  // 重试配置
    maxAttempts: number
    baseDelayMs: number
    maxDelayMs: number
  }
  throttleByLevel?: {        // 按级别节流
    [level: string]: { windowMs: number; maxPerWindow: number }
  }
}
```

#### 方法

##### `send()`

发送告警。

```typescript
async send(alert: PerformanceAlert): Promise<SendResult>
```

**返回**:
```typescript
interface SendResult {
  success: boolean
  alertId: string
  channel?: string
  throttled: boolean
  attempts: number
  error?: string
  duration: number
}
```

##### `test()`

测试 webhook 连通性。

```typescript
async test(): Promise<boolean>
```

##### `getStats()`

获取发送统计。

```typescript
getStats(): {
  sent: number
  failed: number
  throttled: number
  totalAttempts: number
}
```

##### `resetThrottler()`

重置节流状态。

```typescript
resetThrottler(key?: string): void
```

---

### LevelRouter

级别路由器，按告警级别路由到不同频道。

```typescript
import { LevelRouter } from '@/lib/performance/alerting/channels/slack-enhanced'

const router = new LevelRouter({
  critical: '#incidents',
  error: '#alerts-error',
  warning: '#alerts-warning',
  info: '#alerts-info'
})

const channel = router.getChannel('critical')  // '#incidents'
```

---

### Throttler

告警节流器，防止告警风暴。

```typescript
import { Throttler } from '@/lib/performance/alerting/channels/slack-enhanced'

const throttler = new Throttler({
  windowMs: 60000,      // 1 分钟窗口
  maxPerWindow: 5       // 最多 5 条
})

// 检查是否应该节流
if (!throttler.shouldThrottle('error:api:latency')) {
  // 发送告警
}
```

---

### Retryer

指数退避重试器。

```typescript
import { Retryer } from '@/lib/performance/alerting/channels/slack-enhanced'

const retryer = new Retryer({
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
})

const result = await retryer.execute(async () => {
  // 可能失败的操作
  await sendToSlack(message)
})
```

---

## 💡 使用场景 / Use Cases

### 场景 1: 实时性能监控

```typescript
// 创建检测器
const latencyDetector = new StreamingAnomalyDetector({
  zscore: { threshold: 2.5 },
  windowSize: 500
})

// 监控 API 延迟
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const latency = Date.now() - start
    const result = latencyDetector.detect(latency)
    
    if (result.isAnomaly && result.confidence > 0.8) {
      // 发送高置信度异常告警
      sendAlert({
        level: 'warning',
        message: `异常延迟检测: ${latency}ms`,
        confidence: result.confidence
      })
    }
  })
  next()
})
```

### 场景 2: 多频道告警路由

```typescript
const channel = new EnhancedSlackChannel(
  {
    webhookUrl: process.env.SLACK_WEBHOOK_URL!,
    levelChannels: {
      critical: '#incidents',      // 严重告警 -> 事故频道
      error: '#alerts-error',      // 错误 -> 错误频道
      warning: '#alerts-warning',  // 警告 -> 警告频道
      info: '#alerts-info'         // 信息 -> 信息频道
    }
  },
  {
    // 严重告警不节流
    throttleByLevel: {
      critical: { windowMs: 0, maxPerWindow: Infinity },
      error: { windowMs: 60000, maxPerWindow: 5 },
      warning: { windowMs: 300000, maxPerWindow: 3 }
    },
    // 严重告警提及值班人员
    mention: '@oncall'
  }
)
```

### 场景 3: 批量历史数据分析

```typescript
// 批量检测历史数据
const historicalData = [/* ... 大量数据点 ... */]
const detector = new StreamingAnomalyDetector()

const results = detector.detectBatch(historicalData)
const anomalies = results.filter(r => r.isAnomaly)

console.log(`检测到 ${anomalies.length} 个异常`)
console.log(`异常率: ${anomalies.length / results.length * 100}%`)
```

---

## 📊 性能优化 / Performance Optimization

### 增量算法优势

| 算法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| Batch Z-Score | O(n) 每次 | O(n) | 离线分析 |
| **Incremental Z-Score** | **O(1) 每次** | **O(1)** | 实时流式 |
| Streaming Isolation Forest | O(log n) | O(treeSize × maxTrees) | 实时流式 |

### 性能目标

- 单次检测: **< 10ms**（从 ~50ms 优化）
- 内存占用: 常量级（仅存储统计量）
- 支持流式处理: 无需等待数据批次

---

## 🧪 测试 / Testing

```typescript
import { StreamingAnomalyDetector, IncrementalZScore } from '@/lib/performance/incremental-anomaly-detector'

describe('Anomaly Detection', () => {
  it('should detect anomalies correctly', () => {
    const detector = new StreamingAnomalyDetector()
    
    // 正常数据
    for (let i = 0; i < 20; i++) {
      detector.detect(100 + Math.random() * 10)
    }
    
    // 异常数据
    const result = detector.detect(1000)
    expect(result.isAnomaly).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should maintain constant memory', () => {
    const zscore = new IncrementalZScore()
    
    // 大量数据点
    for (let i = 0; i < 100000; i++) {
      zscore.update(Math.random() * 100)
    }
    
    const stats = zscore.getStats()
    expect(stats.count).toBe(100000)
  })
})
```

---

## 📁 目录结构 / Directory Structure

```
src/lib/performance/
├── incremental-anomaly-detector.ts    # 增量式异常检测
│   ├── IncrementalZScore              # 增量 Z-Score
│   ├── StreamingIsolationForest       # 流式 Isolation Forest
│   ├── StreamingAnomalyDetector       # 组合检测器
│   └── BatchZScoreDetector            # 批量检测器（对比用）
│
└── alerting/
    └── channels/
        └── slack-enhanced.ts          # 增强版 Slack 告警
            ├── EnhancedSlackChannel   # Slack 渠道
            ├── LevelRouter            # 级别路由器
            ├── Throttler              # 节流器
            └── Retryer                # 重试器
```

---

## 📚 相关模块 / Related Modules

- [`../monitoring`](../monitoring) - 监控数据采集
- [`../utils/formatting`](../utils/formatting.ts) - 格式化工具

---

## 📄 许可证 / License

MIT
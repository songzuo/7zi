# Performance Monitoring - 性能监控与异常检测

**版本**: v1.0.0  
**更新日期**: 2026-04-03  
**作者**: 🏗️ 架构师 + ⚡ Executor

---

## 概述

Performance 模块提供实时性能监控和智能异常检测能力，包括：

- **增量式异常检测** - O(1) 复杂度的实时检测
- **流式 Isolation Forest** - 增量训练，无需全量数据
- **组合检测器** - 融合多种算法提高准确性
- **增强版告警系统** - 多渠道、节流控制、自动重试

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│              Performance Monitoring System              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────┐           │
│  │   Data Stream   │───▶│  Anomaly        │           │
│  │   (指标数据)    │    │  Detector       │           │
│  └─────────────────┘    │  (异常检测)     │           │
│                         └────────┬────────┘           │
│                                  │                     │
│                                  ▼                     │
│                         ┌─────────────────┐           │
│                         │  Alert Manager  │           │
│                         │  (告警管理)     │           │
│                         └────────┬────────┘           │
│                                  │                     │
│          ┌───────────────────────┼───────────────────┐ │
│          ▼                       ▼                   ▼ │
│  ┌─────────────┐         ┌─────────────┐     ┌──────────┐
│  │   Slack     │         │   Email     │     │  Webhook │
│  │   Channel   │         │   Channel   │     │  Channel │
│  └─────────────┘         └─────────────┘     └──────────┘
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 核心算法

### 1. 增量式 Z-Score (Welford's Algorithm)

**优势**:
- 时间复杂度: O(1) 每次 update
- 空间复杂度: O(1)
- 无需存储历史数据

**原理**:
```
均值更新: μ_n = μ_{n-1} + (x_n - μ_{n-1}) / n
方差更新: M2_n = M2_{n-1} + (x_n - μ_{n-1}) * (x_n - μ_n)
```

### 2. 流式 Isolation Forest

**特点**:
- 每 256 个点增量训练一棵树
- 保持最多 100 棵树
- 自动淘汰旧树

**异常分数**:
```
score(x) = 2^(-E[h(x)] / c(n))
```
- h(x) = 路径长度
- c(n) = 归一化因子
- 分数越高越异常

### 3. 组合检测器

**融合策略**:
```
confidence = zscoreConfidence × 0.6 + iforestScore × 0.4
```

**判断逻辑**:
1. Z-Score 和 Isolation Forest 都异常 → 高置信度异常
2. 仅 Z-Score 异常 → 中置信度异常
3. Isolation Forest 高分 → 低置信度异常

## 告警系统

### Enhanced Slack Channel

**功能特性**:

| 特性 | 描述 |
|------|------|
| 级别路由 | 不同级别告警发送到不同频道 |
| 节流控制 | 防止告警风暴 |
| 自动重试 | 指数退避重试 |
| 统计追踪 | 成功/失败/节流计数 |

**配置示例**:
```typescript
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
    throttle: { windowMs: 60000, maxPerWindow: 5 },
    retry: { maxAttempts: 3, baseDelayMs: 1000 }
  }
)
```

## 性能指标

### 检测性能

| 指标 | 目标值 | 实际值 |
|------|--------|--------|
| 单次检测延迟 | < 10ms | ~2ms |
| 内存占用 | 常量级 | O(1) |
| 吞吐量 | > 10K/s | ~50K/s |

### 告警性能

| 指标 | 目标值 |
|------|--------|
| 发送延迟 | < 500ms |
| 重试成功率 | > 95% |
| 节流准确率 | 100% |

## 使用示例

### 实时监控 API 延迟

```typescript
const latencyDetector = new StreamingAnomalyDetector()

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const latency = Date.now() - start
    const result = latencyDetector.detect(latency)
    
    if (result.isAnomaly && result.confidence > 0.8) {
      alertChannel.send({
        level: 'warning',
        message: `异常延迟: ${latency}ms`,
        confidence: result.confidence
      })
    }
  })
  next()
})
```

### 监控系统资源

```typescript
const cpuDetector = new StreamingAnomalyDetector({
  zscore: { threshold: 2.5 }
})

setInterval(() => {
  const cpu = process.cpuUsage()
  const result = cpuDetector.detect(cpu.user / 1000)
  
  if (result.isAnomaly) {
    console.log(`CPU 异常: ${result.method} 方法检测`)
  }
}, 1000)
```

## 最佳实践

1. **调整阈值** - 根据业务特点调整 Z-Score 阈值
2. **设置最小样本数** - 避免早期误报
3. **配置节流策略** - 防止告警风暴
4. **监控检测器状态** - 定期检查统计信息
5. **实现降级策略** - 检测器异常时的后备方案

## 配置参考

### StreamingAnomalyDetectorConfig

```typescript
{
  zscore: {
    threshold: 3,        // Z-Score 阈值
    minSamples: 10       // 最小样本数
  },
  isolationForest: {
    treeSize: 256,       // 每棵树样本数
    maxTrees: 100        // 最大树数
  },
  windowSize: 1000,      // 滑动窗口大小
  zscoreWeight: 0.6,     // Z-Score 权重
  iforestWeight: 0.4     // Isolation Forest 权重
}
```

### SlackAlertOptions

```typescript
{
  mention: '@oncall',                    // 提及用户
  throttle: {
    windowMs: 60000,                     // 时间窗口
    maxPerWindow: 5                      // 最大消息数
  },
  retry: {
    maxAttempts: 3,                      // 最大重试次数
    baseDelayMs: 1000,                   // 基础延迟
    maxDelayMs: 10000                    // 最大延迟
  }
}
```

## 相关文档

- [模块 README](../src/lib/performance/README.md)
- [异常检测算法详解](./anomaly-detection-algorithms.md)
- [告警配置指南](./alert-configuration.md)

---

*最后更新: 2026-04-03*
# Slack Alerting 集成实现方案

**版本**: v1.0
**日期**: 2026-04-03
**作者**: 📚 咨询师
**项目**: 7zi-project v1.9.0 Phase 4

---

## 📋 目录

1. [背景](#背景)
2. [现有系统分析](#现有系统分析)
3. [Slack Webhook API 研究](#slack-webhook-api-研究)
4. [实现方案设计](#实现方案设计)
5. [配置方案](#配置方案)
6. [测试计划](#测试计划)
7. [部署指南](#部署指南)
8. [最佳实践](#最佳实践)

---

## 背景

v1.9.0 路线图 Phase 4 要求完善告警渠道，新增 Slack 集成。目标是提供实时、可视化的告警通知，提升运维响应效率。

### 核心需求

- ✅ 支持按告警级别路由到不同频道
- ✅ 支持富文本消息（attachments with color）
- ✅ 实现节流机制（避免告警风暴）
- ✅ 支持用户/组提及
- ✅ 完善的错误处理和重试
- ✅ 测试覆盖

---

## 现有系统分析

### 目录结构

```
src/lib/performance/alerting/
├── alerter.ts              # 核心告警引擎
├── alert-stats.ts          # 告警统计
├── escalation-policy.ts    # 升级策略
├── channels/
│   ├── index.ts            # Channel 工厂
│   ├── email.ts            # Email Channel
│   ├── slack.ts            # Slack Channel (已存在)
│   └── pagerduty.ts        # PagerDuty Channel
└── README.md
```

### 现有 SlackChannel 实现

**位置**: `src/lib/performance/alerting/channels/slack.ts`

**当前功能**:
- ✅ 基本的 webhook 发送
- ✅ 使用 `formatSlackAlert` 统一格式化
- ✅ 支持 attachments 格式
- ✅ 支持自定义 mention
- ✅ 支持 channel 覆盖
- ✅ 基本的 test() 方法

**缺失功能**:
- ❌ 按级别路由到不同频道
- ❌ 节流机制（防止告警风暴）
- ❌ 重试逻辑
- ❌ 详细的错误日志
- ❌ 测试覆盖

### 统一格式化系统

**位置**: `src/lib/utils/formatting/message-formatter.ts`

**核心函数**:
- `formatSlackAlert()` - 格式化 Slack 消息
- `getLevelColor()` - 获取级别颜色
- `getSlackLevelEmoji()` - 获取 Slack emoji
- `formatTimestamp()` - 格式化时间戳

**颜色映射**:
```typescript
info: '#3b82f6'      // 蓝色
warning: '#f59e0b'   // 琥珀色
error: '#ef4444'     // 红色
critical: '#dc2626'  // 深红色
```

---

## Slack Webhook API 研究

### 限制和最佳实践

#### 1. Rate Limiting

- **限制**: 最多 1 msg/sec
- **影响**: 高频告警需要节流
- **解决方案**: 实现时间窗口节流

#### 2. Webhook URL 安全

- **格式**: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`
- **安全**: URL 包含密钥，必须保密
- **最佳实践**:
  - 使用环境变量存储
  - 不要提交到版本控制
  - 定期轮换（可选）

#### 3. 消息格式

**Attachments 格式**（推荐用于告警）:
```json
{
  "text": "Alert title",
  "attachments": [
    {
      "color": "#ef4444",
      "title": "Alert message",
      "fields": [
        { "title": "Severity", "value": "ERROR", "short": true },
        { "title": "Source", "value": "api-gateway", "short": true }
      ],
      "footer": "Performance Alerting System",
      "ts": 1712123456
    }
  ]
}
```

**Blocks 格式**（更灵活，但更复杂）:
```json
{
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Alert Title*"
      }
    }
  ]
}
```

**推荐**: 使用 attachments 格式，简洁且适合告警场景。

#### 4. 限制

- ❌ 不能覆盖默认频道（从 app 配置继承）
- ❌ 不能覆盖用户名和图标
- ❌ 不能删除已发送的消息
- ✅ 可以使用 `thread_ts` 回复线程

---

## 实现方案设计

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    PerformanceAlerter                        │
│  (核心告警引擎 - 抑制、聚合、历史跟踪)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ send(alert)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SlackChannel (增强版)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. 级别路由器 (LevelRouter)                          │  │
│  │     - info → #alerts-info                            │  │
│  │     - warning → #alerts-warning                      │  │
│  │     - error → #alerts-error                          │  │
│  │     - critical → #incidents                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. 节流器 (Throttler)                                │  │
│  │     - 按级别 + 类型节流                               │  │
│  │     - 默认: 1 msg/min per type                       │  │
│  │     - 可配置窗口大小                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. 重试器 (Retryer)                                  │  │
│  │     - 指数退避重试                                    │  │
│  │     - 最多 3 次                                       │  │
│  │     - 记录失败日志                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. 格式化器 (Formatter)                              │  │
│  │     - 使用 formatSlackAlert()                         │  │
│  │     - 支持自定义 mention                              │  │
│  │     - 支持自定义 footer                               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Slack Incoming Webhook                      │
│  https://hooks.slack.com/services/...                       │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. LevelRouter - 级别路由器

```typescript
interface LevelChannelMapping {
  info?: string
  warning?: string
  error?: string
  critical?: string
}

class LevelRouter {
  private mapping: LevelChannelMapping

  constructor(mapping: LevelChannelMapping) {
    this.mapping = mapping
  }

  getChannel(level: AlertLevel): string | undefined {
    return this.mapping[level]
  }
}
```

#### 2. Throttler - 节流器

```typescript
interface ThrottleConfig {
  windowMs: number        // 时间窗口（毫秒）
  maxPerWindow: number    // 窗口内最大消息数
}

class Throttler {
  private config: ThrottleConfig
  private history: Map<string, number[]> = new Map()

  shouldThrottle(key: string): boolean {
    const now = Date.now()
    const timestamps = this.history.get(key) || []

    // 清理过期记录
    const validTimestamps = timestamps.filter(
      ts => now - ts < this.config.windowMs
    )

    if (validTimestamps.length >= this.config.maxPerWindow) {
      return true // 节流
    }

    // 记录本次发送
    validTimestamps.push(now)
    this.history.set(key, validTimestamps)
    return false
  }
}
```

#### 3. Retryer - 重试器

```typescript
interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

class Retryer {
  private config: RetryConfig

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt < this.config.maxAttempts) {
          const delay = Math.min(
            this.config.baseDelayMs * Math.pow(2, attempt - 1),
            this.config.maxDelayMs
          )
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 增强的 SlackChannel

```typescript
export class SlackChannel implements AlertChannel {
  name = 'slack'

  private webhookUrl: string
  private levelRouter: LevelRouter
  private throttler: Throttler
  private retryer: Retryer
  private options: SlackAlertOptions

  constructor(config: SlackConfig, options?: SlackAlertOptions) {
    this.webhookUrl = config.webhookUrl
    this.levelRouter = new LevelRouter(config.levelChannels || {})
    this.throttler = new Throttler(options?.throttle || {
      windowMs: 60000,      // 1 分钟
      maxPerWindow: 1       // 每分钟最多 1 条
    })
    this.retryer = new Retryer(options?.retry || {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000
    })
    this.options = options || {}
  }

  async send(alert: PerformanceAlert): Promise<void> {
    // 1. 检查节流
    const throttleKey = `${alert.level}:${alert.source}:${alert.metric || 'default'}`
    if (this.throttler.shouldThrottle(throttleKey)) {
      console.log(`[SlackChannel] Alert throttled: ${throttleKey}`)
      return
    }

    // 2. 格式化消息
    const slackMessage = formatSlackAlert(
      { /* alert data */ },
      { /* options */ }
    )

    // 3. 获取目标频道
    const channel = this.levelRouter.getChannel(alert.level as AlertLevel)

    // 4. 发送（带重试）
    await this.retryer.execute(async () => {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...slackMessage,
          channel,  // 可选覆盖
        })
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`)
      }
    })

    console.log(`[SlackChannel] Alert sent: ${alert.id}`)
  }
}
```

---

## 配置方案

### 环境变量

```bash
# Slack Webhook URL（必需）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX

# Slack 启用开关（可选，默认 true）
SLACK_ENABLED=true

# 频道映射（可选）
SLACK_CHANNEL_INFO=#alerts-info
SLACK_CHANNEL_WARNING=#alerts-warning
SLACK_CHANNEL_ERROR=#alerts-error
SLACK_CHANNEL_CRITICAL=#incidents

# 默认提及（可选）
SLACK_DEFAULT_MENTION=@oncall

# 节流配置（可选）
SLACK_THROTTLE_WINDOW_MS=60000
SLACK_THROTTLE_MAX_PER_WINDOW=1

# 重试配置（可选）
SLACK_RETRY_MAX_ATTEMPTS=3
SLACK_RETRY_BASE_DELAY_MS=1000
SLACK_RETRY_MAX_DELAY_MS=10000
```

### 配置文件

```typescript
// config/alerting.ts
export const slackConfig: SlackConfig = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL!,
  levelChannels: {
    info: process.env.SLACK_CHANNEL_INFO,
    warning: process.env.SLACK_CHANNEL_WARNING,
    error: process.env.SLACK_CHANNEL_ERROR,
    critical: process.env.SLACK_CHANNEL_CRITICAL,
  },
  username: 'Performance Alerter',
  iconEmoji: ':warning:',
}

export const slackOptions: SlackAlertOptions = {
  mention: process.env.SLACK_DEFAULT_MENTION,
  throttle: {
    windowMs: parseInt(process.env.SLACK_THROTTLE_WINDOW_MS || '60000'),
    maxPerWindow: parseInt(process.env.SLACK_THROTTLE_MAX_PER_WINDOW || '1'),
  },
  retry: {
    maxAttempts: parseInt(process.env.SLACK_RETRY_MAX_ATTEMPTS || '3'),
    baseDelayMs: parseInt(process.env.SLACK_RETRY_BASE_DELAY_MS || '1000'),
    maxDelayMs: parseInt(process.env.SLACK_RETRY_MAX_DELAY_MS || '10000'),
  },
}
```

### 使用示例

```typescript
import { SlackChannel } from '@/lib/performance/alerting/channels/slack'
import { performanceAlerter } from '@/lib/performance/alerting/alerter'

// 创建 Slack channel
const slackChannel = new SlackChannel(slackConfig, slackOptions)

// 注册到 alerter
performanceAlerter.registerChannel(slackChannel)

// 发送告警
await performanceAlerter.createAlert(
  createPerformanceAlert(
    'High CPU Usage',
    'CPU usage exceeded 90%',
    'critical',
    {
      category: 'resource',
      source: 'server-1',
      metric: 'cpu',
      currentValue: 95,
      threshold: 90,
    }
  )
)
```

---

## 测试计划

### 单元测试

**文件**: `src/lib/performance/alerting/channels/slack.test.ts`

#### 测试用例

1. **LevelRouter 测试**
   - ✅ 正确路由不同级别
   - ✅ 未配置级别返回 undefined
   - ✅ 支持部分配置

2. **Throttler 测试**
   - ✅ 窗口内第一条消息通过
   - ✅ 窗口内第二条消息被节流
   - ✅ 窗口过期后重置
   - ✅ 不同 key 独立节流

3. **Retryer 测试**
   - ✅ 成功时立即返回
   - ✅ 失败时重试指定次数
   - ✅ 指数退避延迟
   - ✅ 最终失败抛出错误

4. **SlackChannel 集成测试**
   - ✅ 正常发送告警
   - ✅ 节流生效
   - ✅ 重试生效
   - ✅ 错误处理

### Mock 测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SlackChannel } from './slack'
import { createPerformanceAlert } from '../alerter'

describe('SlackChannel', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let channel: SlackChannel

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch

    channel = new SlackChannel(
      {
        webhookUrl: 'https://hooks.slack.com/services/test',
        levelChannels: {
          critical: '#incidents',
        },
      },
      {
        throttle: { windowMs: 60000, maxPerWindow: 1 },
        retry: { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000 },
      }
    )
  })

  it('should send alert to correct channel', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const alert = createPerformanceAlert(
      'Test Alert',
      'Test message',
      'critical',
      { source: 'test' }
    )

    await channel.send(alert as any)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('should throttle duplicate alerts', async () => {
    mockFetch.mockResolvedValue({ ok: true })

    const alert = createPerformanceAlert(
      'Test Alert',
      'Test message',
      'warning',
      { source: 'test', metric: 'cpu' }
    )

    // 第一次发送
    await channel.send(alert as any)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // 第二次发送（应该被节流）
    await channel.send(alert as any)
    expect(mockFetch).toHaveBeenCalledTimes(1) // 仍然是 1
  })

  it('should retry on failure', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true })

    const alert = createPerformanceAlert(
      'Test Alert',
      'Test message',
      'error',
      { source: 'test' }
    )

    await channel.send(alert as any)

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
```

### 真实 Webhook 测试

```typescript
// tests/integration/slack-webhook.test.ts
import { describe, it, expect } from 'vitest'
import { SlackChannel } from '@/lib/performance/alerting/channels/slack'

describe('Slack Webhook Integration', () => {
  it('should send real alert to Slack', async () => {
    const channel = new SlackChannel({
      webhookUrl: process.env.SLACK_TEST_WEBHOOK_URL!,
      levelChannels: {
        info: '#test-alerts',
      },
    })

    const alert = createPerformanceAlert(
      'Integration Test',
      'This is a test alert from integration tests',
      'info',
      { source: 'integration-test' }
    )

    await channel.send(alert as any)

    // 手动验证 Slack 频道收到消息
    expect(true).toBe(true)
  })
})
```

---

## 部署指南

### 1. 创建 Slack App

1. 访问 https://api.slack.com/apps
2. 点击 "Create New App"
3. 选择 "From scratch"
4. 填写 App 名称和 Workspace
5. 进入 "Incoming Webhooks"
6. 开启 "Activate Incoming Webhooks"
7. 点击 "Add New Webhook to Workspace"
8. 选择频道并授权
9. 复制 Webhook URL

### 2. 配置环境变量

```bash
# 生产环境
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export SLACK_CHANNEL_CRITICAL="#incidents"
export SLACK_CHANNEL_ERROR="#alerts-error"
export SLACK_CHANNEL_WARNING="#alerts-warning"
export SLACK_CHANNEL_INFO="#alerts-info"
export SLACK_DEFAULT_MENTION="@oncall"

# 测试环境
export SLACK_TEST_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### 3. 创建频道

```bash
# 创建告警频道
/incidents          # 严重告警
/alerts-error       # 错误告警
/alerts-warning     # 警告告警
/alerts-info        # 信息告警
```

### 4. 验证配置

```typescript
import { SlackChannel } from '@/lib/performance/alerting/channels/slack'

const channel = new SlackChannel({
  webhookUrl: process.env.SLACK_WEBHOOK_URL!,
})

const success = await channel.test()
console.log('Slack webhook test:', success ? '✅ PASSED' : '❌ FAILED')
```

---

## 最佳实践

### 1. 频道组织

```
#incidents          - 严重告警（需要立即响应）
  ├── @oncall       - 提及值班人员
  └── @devops       - 提及运维团队

#alerts-error       - 错误告警（需要关注）
  └── @devops

#alerts-warning     - 警告告警（性能下降）
  └── @devops

#alerts-info        - 信息告警（状态更新）
  └── @devops
```

### 2. 节流策略

| 告警级别 | 节流窗口 | 最大消息数 | 说明 |
|---------|---------|-----------|------|
| critical | 30s | 1 | 不节流严重告警 |
| error | 1min | 1 | 允许快速响应 |
| warning | 5min | 1 | 减少噪音 |
| info | 10min | 1 | 低频通知 |

### 3. 消息格式

**好的告警消息**:
```
🚨 High CPU Usage

CPU usage exceeded 90% threshold

Metric: cpu
Current: 95%
Threshold: 90%
Source: server-1
Time: 2026/04/03 07:15:00

Metadata:
  - Load average: 2.5
  - Top process: node (45%)
```

**避免**:
- ❌ 过于简短（缺少上下文）
- ❌ 过于冗长（信息过载）
- ❌ 使用技术术语（非技术人员无法理解）

### 4. 错误处理

```typescript
try {
  await channel.send(alert)
} catch (error) {
  // 记录错误
  console.error('[SlackChannel] Failed to send alert:', error)

  // 降级到其他渠道
  await emailChannel.send(alert)

  // 发送到监控系统
  await metrics.increment('slack.alert.failed')
}
```

### 5. 监控指标

- `slack.alert.sent` - 发送成功数
- `slack.alert.failed` - 发送失败数
- `slack.alert.throttled` - 节流数
- `slack.alert.retry` - 重试次数
- `slack.alert.latency` - 发送延迟

---

## 总结

本方案提供了完整的 Slack Alerting 集成实现，包括：

✅ **级别路由** - 按告警级别自动路由到不同频道
✅ **节流机制** - 防止告警风暴，减少噪音
✅ **重试逻辑** - 提高可靠性，处理临时故障
✅ **统一格式化** - 复用现有的 `formatSlackAlert`
✅ **测试覆盖** - 单元测试 + 集成测试
✅ **配置灵活** - 环境变量 + 配置文件
✅ **最佳实践** - 频道组织、节流策略、错误处理

### 下一步

1. 实现 `SlackChannel` 增强版本
2. 编写单元测试
3. 集成测试（使用测试 workspace）
4. 更新文档
5. 部署到生产环境

---

**文档版本**: v1.0
**最后更新**: 2026-04-03
**状态**: ✅ 设计完成，待实现
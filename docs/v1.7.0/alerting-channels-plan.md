# 性能监控告警渠道技术方案

**版本**: 1.7.0  
**日期**: 2026-04-01  
**状态**: 草稿  
**负责**: 📚 咨询师（研究分析师）

---

## 📋 目录

- [1. 执行摘要](#1-执行摘要)
- [2. 现状分析](#2-现状分析)
- [3. 邮件服务选型](#3-邮件服务选型)
- [4. Slack 集成方案](#4-slack-集成方案)
- [5. 统一告警框架设计](#5-统一告警框架设计)
- [6. 成本估算](#6-成本估算)
- [7. 实施步骤](#7-实施步骤)
- [8. 风险评估](#8-风险评估)

---

## 1. 执行摘要

### 1.1 项目目标

为 7zi v1.7.0 添加邮件和 Slack 告警渠道，完善现有的性能监控系统，实现多渠道告警通知。

### 1.2 推荐方案

| 渠道      | 推荐方案                           | 理由                                |
| --------- | ---------------------------------- | ----------------------------------- |
| **邮件**  | Nodemailer + 自建 SMTP/第三方 SMTP | 零成本、完全可控、易集成            |
| **Slack** | Incoming Webhooks                  | 简单、可靠、低延迟、无 API 配额限制 |

### 1.3 预期效果

- ✅ 支持 P0/P1/P2/P3 告警级别差异化通知
- ✅ 实现多渠道路由规则（不同级别发往不同渠道）
- ✅ 告警去重和聚合，避免告警风暴
- ✅ 灵活的告警策略配置
- ✅ 月成本 < $10（仅邮件服务费）

---

## 2. 现状分析

### 2.1 现有 APM 集成

#### Sentry 集成

- **版本**: `@sentry/nextjs` v10.44.0
- **功能**:
  - 错误追踪
  - 性能监控
  - 分布式追踪
  - 自定义事务管理
  - 采样率控制（生产环境 10%）
- **配置位置**: `src/lib/monitoring/sentry-client.ts`

#### 监控系统架构

```
src/lib/monitoring/
├── sentry-client.ts              # Sentry 客户端（APM 核心层）
├── performance-monitor.ts         # 性能监控器
├── alert-manager.ts              # 告警管理器（核心）
├── alerts.ts                     # 告警服务（多渠道发送）
├── alert/                        # 告警模块（空目录，需实现）
└── channels/                     # 通道模块（空目录，需实现）
```

### 2.2 现有告警系统

#### 告警级别定义

| 级别   | 优先级 | 颜色    | 场景                         |
| ------ | ------ | ------- | ---------------------------- |
| **P0** | 最高   | 🔴 红色 | 系统宕机、数据丢失、安全漏洞 |
| **P1** | 高     | 🟠 橙色 | 服务降级、性能严重下降       |
| **P2** | 中     | 🟡 黄色 | 性能轻度下降、资源使用高     |
| **P3** | 低     | 🟢 绿色 | 信息性通知、趋势预警         |

#### 现有通道

| 通道       | 状态      | 说明              |
| ---------- | --------- | ----------------- |
| `console`  | ✅ 已实现 | 控制台日志输出    |
| `webhook`  | ✅ 已实现 | 通用 HTTP Webhook |
| `discord`  | ✅ 已实现 | Discord Webhook   |
| `telegram` | ✅ 已实现 | Telegram Bot API  |

#### 现有功能

**AlertDeduplication 类** - 告警去重：

- TTL: 1 小时
- 冷却期: 5 分钟
- 避免重复告警风暴

**AlertAggregator 类** - 告警聚合：

- 聚合窗口: 1 分钟
- 按标签分组
- 统计告警次数

### 2.3 待实现功能

| 功能               | 状态      | 说明                 |
| ------------------ | --------- | -------------------- |
| **邮件通道**       | ❌ 未实现 | 需集成邮件发送服务   |
| **Slack 通道**     | ❌ 未实现 | 需集成 Slack Webhook |
| **通道策略配置**   | ⚠️ 部分   | 有基础，需完善       |
| **多渠道路由规则** | ❌ 未实现 | 不同级别发往不同渠道 |
| **告警抑制规则**   | ✅ 已实现 | 时间窗口抑制         |
| **告警静默规则**   | ✅ 已实现 | 匹配规则静默         |

---

## 3. 邮件服务选型

### 3.1 候选方案对比

| 方案                       | 月成本（1万封） | 实施复杂度 | 依赖性 | 可靠性 | 推荐度     |
| -------------------------- | --------------- | ---------- | ------ | ------ | ---------- |
| **Nodemailer + 自建 SMTP** | $0              | 低         | 无     | 中     | ⭐⭐⭐⭐⭐ |
| **Nodemailer + Resend**    | $15             | 低         | 低     | 高     | ⭐⭐⭐⭐   |
| **Nodemailer + SendGrid**  | $19             | 低         | 中     | 高     | ⭐⭐⭐⭐   |
| **AWS SES**                | $1              | 高         | 高     | 高     | ⭐⭐⭐     |

### 3.2 方案详解

#### 方案 A: Nodemailer + 自建 SMTP

**优点**:

- ✅ 零成本
- ✅ 完全可控
- ✅ 无第三方依赖
- ✅ 数据隐私性好
- ✅ 已有 `@types/nodemailer` 依赖

**缺点**:

- ⚠️ 需要自行维护 SMTP 服务器
- ⚠️ 送达率可能不如专业服务
- ⚠️ 需要配置 SPF/DKIM/DMARC

**适用场景**:

- 预算有限的小型项目
- 告警邮件量不大（< 1000 封/月）
- 技术团队有能力自建 SMTP

**实施要点**:

1. 选择 SMTP 方案：
   - Postfix（推荐）
   - Exim
   - 或使用现有邮件服务器

2. 配置 SPF/DKIM/DMARC：

   ```
   SPF: v=spf1 ip4:165.99.43.61 ~all
   DKIM: 配置域名 DKIM 签名
   DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@7zi.com
   ```

3. 代码集成：

   ```typescript
   import nodemailer from 'nodemailer'

   const transporter = nodemailer.createTransport({
     host: 'localhost',
     port: 25,
     secure: false,
   })
   ```

**成本**: $0

---

#### 方案 B: Nodemailer + Resend

**优点**:

- ✅ 送达率高（专业 SMTP 池）
- ✅ API 简单易用
- ✅ 邮件模板支持
- ✅ 实时投递追踪
- ✅ 免费 3000 封/月

**缺点**:

- ⚠️ 有月费
- ⚠️ 依赖第三方服务

**价格**:

- 免费额度: 3000 封/月
- 付费计划: $20/月（10 万封）

**实施要点**:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'alerts@7zi.com',
  to: 'admin@7zi.com',
  subject: '🔴 P0 Alert: System Down',
  html: '<p>...</p>',
})
```

**成本**:

- <3000 封/月: $0
- 10 万封/月: $20

---

#### 方案 C: Nodemailer + SendGrid

**优点**:

- ✅ 行业标准，可靠性高
- ✅ 丰富的模板引擎
- ✅ 详细的投递报告
- ✅ 免费额度 100 封/天

**缺点**:

- ⚠️ 月费较高
- ⚠️ 配置相对复杂

**价格**:

- 免费版: 100 封/天
- Basic: $19/月（5 万封）
- Pro: $89/月（10 万封）

**实施要点**:

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

await sgMail.send({
  to: 'admin@7zi.com',
  from: 'alerts@7zi.com',
  subject: '🔴 P0 Alert: System Down',
  html: '<p>...</p>',
})
```

**成本**:

- 免费: 3000 封/月
- 5 万封/月: $19

---

#### 方案 D: AWS SES

**优点**:

- ✅ 成本最低
- ✅ 与 AWS 生态系统集成
- ✅ 高可靠性

**缺点**:

- ❌ 实施复杂度高
- ❌ 需要设置 DNS 验证
- ❌ 冷启动有配额限制

**价格**:

- 首月免费: 62,000 封
- 之后: $0.10/1000 封（EC2 内免费）

**成本**:

- <6.2 万封/月: $0
- 10 万封/月: $4

---

### 3.3 推荐方案

**阶段一（快速启动）**: Nodemailer + Resend

- 免费额度 3000 封/月
- 实施简单，1-2 天完成
- 送达率高

**阶段二（生产优化）**: Nodemailer + 自建 SMTP

- 零成本长期运行
- 完全可控

**理由**:

1. Resend 免费额度满足告警需求（告警邮件通常 < 1000 封/月）
2. 自建 SMTP 适合长期降本
3. 可随时切换，代码改动小

---

## 4. Slack 集成方案

### 4.1 候选方案对比

| 方案                                 | 复杂度      | 延迟 | 配额限制       | 推荐度     |
| ------------------------------------ | ----------- | ---- | -------------- | ---------- |
| **Incoming Webhooks**                | ⭐ 极低     | <1s  | 无限制         | ⭐⭐⭐⭐⭐ |
| **Slack Web API (chat.postMessage)** | ⭐⭐ 低     | <1s  | 有（免费版有） | ⭐⭐⭐⭐   |
| **Slack Events API**                 | ⭐⭐⭐⭐ 高 | N/A  | N/A            | ⭐⭐       |

### 4.2 方案详解

#### 方案 A: Incoming Webhooks（推荐）

**优点**:

- ✅ 实施最简单（HTTP POST 即可）
- ✅ 无需认证 Token 管理
- ✅ 实时性高（<1s）
- ✅ 无 API 配额限制
- ✅ 支持富消息格式

**缺点**:

- ⚠️ 只能发送，不能接收
- ⚠️ 每个 Webhook URL 绑定到一个频道

**实施步骤**:

1. **创建 Slack App**:
   - 访问 https://api.slack.com/apps
   - 点击 "Create New App"
   - 选择 "From scratch"
   - 填写 App 名称和 Workspace

2. **配置 Incoming Webhooks**:
   - 进入 "Incoming Webhooks"
   - 点击 "Add New Webhook to Workspace"
   - 选择频道（如 `#alerts`）
   - 复制 Webhook URL

3. **代码集成**:

```typescript
interface SlackMessage {
  text: string
  attachments?: Array<{
    color: string
    title: string
    text: string
    fields?: Array<{
      title: string
      value: string
      short: boolean
    }>
    footer?: string
    ts?: number
  }>
}

async function sendSlackAlert(webhookUrl: string, message: SlackMessage) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`)
  }
}

// 使用示例
await sendSlackAlert(process.env.SLACK_WEBHOOK_URL, {
  text: '🔴 P0 Alert: System Down',
  attachments: [
    {
      color: '#FF0000',
      title: 'System Down',
      text: '7zi.com is not responding',
      fields: [
        { title: 'Severity', value: 'P0', short: true },
        { title: 'Time', value: new Date().toISOString(), short: true },
      ],
      footer: 'Performance Monitor',
      ts: Math.floor(Date.now() / 1000),
    },
  ],
})
```

**环境变量**:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXX
```

**成本**: $0

---

#### 方案 B: Slack Web API

**优点**:

- ✅ 可动态指定频道
- ✅ 支持更丰富的功能
- ✅ 可获取消息历史

**缺点**:

- ⚠️ 需要管理 OAuth Token
- ⚠️ 免费版有 API 配额限制
- ⚠️ 实施稍复杂

**价格**:

- 免费版: 每月 1 万条消息
- Pro 版: 无限制（$8/用户/月）

**实施要点**:

```typescript
import { WebClient } from '@slack/web-api'

const client = new WebClient(process.env.SLACK_BOT_TOKEN)

await client.chat.postMessage({
  channel: '#alerts',
  text: '🔴 P0 Alert: System Down',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🔴 *P0 Alert: System Down*',
      },
    },
  ],
})
```

**环境变量**:

```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
```

---

### 4.3 推荐方案

**Incoming Webhooks**

**理由**:

1. 告警场景只需发送，无需接收
2. 无 API 配额限制
3. 实施最简单（30 分钟完成）
4. 实时性高
5. 可随时升级到 Web API

**扩展性**:

- 多频道: 创建多个 Webhook URL
- 私密频道: 支持
- 用户组: 通过 Webhook 支持

---

## 5. 统一告警框架设计

### 5.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    监控触发源                                 │
│  Sentry • Web Vitals • Prometheus • 自定义指标              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AlertManager (核心)                        │
│  - 告警规则引擎                                              │
│  - 告警级别判定                                              │
│  - 告警去重                                                  │
│  - 告警聚合                                                  │
│  - 告警抑制                                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               告警路由策略 (Alert Router)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐     ┌─────────┐
   │ Console │      │  Email  │     │  Slack  │
   │ Channel │      │ Channel │     │ Channel │
   └─────────┘      └─────────┘     └─────────┘
        │                │                │
        └────────────────┴────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ 告警历史存储  │
                  │ (Redis/DB)   │
                  └──────────────┘
```

### 5.2 告警级别定义

| 级别   | 优先级 | 触发条件                     | 默认通道      | 响应时效 |
| ------ | ------ | ---------------------------- | ------------- | -------- |
| **P0** | 0      | 系统宕机、数据丢失、安全漏洞 | Email + Slack | 立即     |
| **P1** | 1      | 服务降级、性能严重下降       | Slack         | 15 分钟  |
| **P2** | 2      | 性能轻度下降、资源使用高     | Slack         | 1 小时   |
| **P3** | 3      | 信息性通知、趋势预警         | Console       | 4 小时   |

### 5.3 告警策略配置

```typescript
// src/lib/monitoring/alert/config.ts

export interface AlertStrategy {
  severity: AlertSeverity
  channels: AlertChannel[]
  throttleMs: number // 同一告警冷却时间
  aggregateWindowMs: number // 聚合窗口
  escalationAfter?: number // 升级时间（未处理）
  notifyUsers?: string[] // 通知用户列表
}

export const ALERT_STRATEGIES: Record<AlertSeverity, AlertStrategy> = {
  p0: {
    severity: 'p0',
    channels: ['email', 'slack', 'console'],
    throttleMs: 60000, // 1 分钟
    aggregateWindowMs: 30000, // 30 秒
    escalationAfter: 900000, // 15 分钟升级
    notifyUsers: ['admin@7zi.com'],
  },
  p1: {
    severity: 'p1',
    channels: ['slack', 'console'],
    throttleMs: 300000, // 5 分钟
    aggregateWindowMs: 60000, // 1 分钟
    notifyUsers: ['ops-team'],
  },
  p2: {
    severity: 'p2',
    channels: ['slack', 'console'],
    throttleMs: 900000, // 15 分钟
    aggregateWindowMs: 300000, // 5 分钟
  },
  p3: {
    severity: 'p3',
    channels: ['console'],
    throttleMs: 1800000, // 30 分钟
    aggregateWindowMs: 900000, // 15 分钟
  },
}
```

### 5.4 通道实现设计

#### 邮件通道实现

```typescript
// src/lib/monitoring/alert/channels/email.ts

import nodemailer from 'nodemailer'
import type { AlertConfig } from '../alerts'

interface EmailConfig {
  smtp: {
    host: string
    port: number
    secure: boolean
    auth?: {
      user: string
      pass: string
    }
  }
  from: string
  to: string[]
}

class EmailChannel {
  private transporter: nodemailer.Transporter
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    })
  }

  async send(alert: AlertConfig): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: this.config.to.join(', '),
        subject: this.formatSubject(alert),
        html: this.formatBody(alert),
        priority: this.getPriority(alert.severity),
      })

      return true
    } catch (error) {
      console.error('[EmailChannel] Failed to send alert:', error)
      return false
    }
  }

  private formatSubject(alert: AlertConfig): string {
    const emoji = this.getEmoji(alert.severity)
    return `${emoji} [${alert.severity.toUpperCase()}] ${alert.title}`
  }

  private formatBody(alert: AlertConfig): string {
    const color = this.getColor(alert.severity)

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2>${this.getEmoji(alert.severity)} ${alert.title}</h2>
          <p>Severity: <strong>${alert.severity.toUpperCase()}</strong></p>
        </div>
        <div style="padding: 20px; background: #f5f5f5; border-radius: 0 0 8px 8px;">
          <p>${alert.message}</p>
          ${alert.details ? this.renderDetails(alert.details) : ''}
          <p style="color: #999; margin-top: 20px;">
            Time: ${alert.timestamp?.toISOString() || new Date().toISOString()}<br>
            From: Performance Monitor
          </p>
        </div>
      </div>
    `
  }

  private renderDetails(details: Record<string, string | number>): string {
    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Metric</th>
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #ddd;">Value</th>
        </tr>
        ${Object.entries(details)
          .map(
            ([key, value]) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${key}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; font-family: monospace;">${value}</td>
          </tr>
        `
          )
          .join('')}
      </table>
    `
  }

  private getPriority(severity: AlertSeverity): 'high' | 'normal' | 'low' {
    switch (severity) {
      case 'p0':
      case 'p1':
        return 'high'
      case 'p2':
        return 'normal'
      case 'p3':
        return 'low'
    }
  }

  private getEmoji(severity: AlertSeverity): string {
    const emojis: Record<AlertSeverity, string> = {
      p0: '🔴',
      p1: '🟠',
      p2: '🟡',
      p3: '🟢',
    }
    return emojis[severity]
  }

  private getColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      p0: '#dc2626',
      p1: '#f97316',
      p2: '#eab308',
      p3: '#22c55e',
    }
    return colors[severity]
  }
}

export { EmailChannel }
```

#### Slack 通道实现

```typescript
// src/lib/monitoring/alert/channels/slack.ts

import type { AlertConfig } from '../alerts'

interface SlackMessage {
  text: string
  blocks?: Array<Record<string, unknown>>
  attachments?: Array<{
    color: string
    title: string
    text: string
    fields?: Array<{
      title: string
      value: string
      short: boolean
    }>
    footer?: string
    ts?: number
    actions?: Array<{
      type: string
      text: string
      url?: string
      action_id?: string
    }>
  }>
}

class SlackChannel {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async send(alert: AlertConfig): Promise<boolean> {
    try {
      const message = this.formatMessage(alert)

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('[SlackChannel] Failed to send alert:', error)
      return false
    }
  }

  private formatMessage(alert: AlertConfig): SlackMessage {
    const color = this.getColor(alert.severity)
    const emoji = this.getEmoji(alert.severity)

    return {
      text: `${emoji} ${alert.title}`,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: this.formatFields(alert),
          footer: '7zi Performance Monitor',
          ts: Math.floor((alert.timestamp?.getTime() || Date.now()) / 1000),
          actions: alert.url
            ? [
                {
                  type: 'button',
                  text: 'View Details',
                  url: alert.url,
                },
              ]
            : undefined,
        },
      ],
    }
  }

  private formatFields(
    alert: AlertConfig
  ): Array<{ title: string; value: string; short: boolean }> {
    const fields = [
      {
        title: 'Severity',
        value: `${this.getEmoji(alert.severity)} ${alert.severity.toUpperCase()}`,
        short: true,
      },
      {
        title: 'Time',
        value: alert.timestamp?.toLocaleString() || new Date().toLocaleString(),
        short: true,
      },
    ]

    if (alert.details) {
      Object.entries(alert.details).forEach(([key, value]) => {
        fields.push({
          title: key,
          value: String(value),
          short: true,
        })
      })
    }

    return fields
  }

  private getEmoji(severity: AlertSeverity): string {
    const emojis: Record<AlertSeverity, string> = {
      p0: '🔴',
      p1: '🟠',
      p2: '🟡',
      p3: '🟢',
    }
    return emojis[severity]
  }

  private getColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      p0: '#dc2626', // Red
      p1: '#f97316', // Orange
      p2: '#eab308', // Yellow
      p3: '#22c55e', // Green
    }
    return colors[severity]
  }
}

export { SlackChannel }
```

### 5.5 告警路由器实现

```typescript
// src/lib/monitoring/alert/router.ts

import type { AlertConfig, AlertSeverity } from '../alerts'
import { EmailChannel } from './channels/email'
import { SlackChannel } from './channels/slack'
import { ConsoleChannel } from './channels/console'
import { ALERT_STRATEGIES } from './config'

interface ChannelConfig {
  email: {
    enabled: boolean
    smtp: {
      host: string
      port: number
      secure: boolean
      auth?: {
        user: string
        pass: string
      }
    }
    from: string
    to: string[]
  }
  slack: {
    enabled: boolean
    webhookUrl: string
  }
  console: {
    enabled: boolean
  }
}

class AlertRouter {
  private channels: Map<string, EmailChannel | SlackChannel | ConsoleChannel> = new Map()
  private config: ChannelConfig

  constructor(config: ChannelConfig) {
    this.config = config
    this.initChannels()
  }

  private initChannels() {
    if (this.config.email.enabled) {
      this.channels.set(
        'email',
        new EmailChannel({
          smtp: this.config.email.smtp,
          from: this.config.email.from,
          to: this.config.email.to,
        })
      )
    }

    if (this.config.slack.enabled) {
      this.channels.set('slack', new SlackChannel(this.config.slack.webhookUrl))
    }

    if (this.config.console.enabled) {
      this.channels.set('console', new ConsoleChannel())
    }
  }

  async route(alert: AlertConfig): Promise<Record<string, boolean>> {
    const strategy = ALERT_STRATEGIES[alert.severity]
    const results: Record<string, boolean> = {}

    // Send to configured channels
    for (const channelType of strategy.channels) {
      const channel = this.channels.get(channelType)

      if (!channel) {
        console.warn(`[AlertRouter] Channel ${channelType} not configured`)
        continue
      }

      try {
        const success = await channel.send(alert)
        results[channelType] = success
      } catch (error) {
        console.error(`[AlertRouter] Failed to send to ${channelType}:`, error)
        results[channelType] = false
      }
    }

    return results
  }

  async routeToSpecificChannels(
    alert: AlertConfig,
    channels: string[]
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    for (const channelType of channels) {
      const channel = this.channels.get(channelType)

      if (!channel) {
        console.warn(`[AlertRouter] Channel ${channelType} not configured`)
        continue
      }

      try {
        const success = await channel.send(alert)
        results[channelType] = success
      } catch (error) {
        console.error(`[AlertRouter] Failed to send to ${channelType}:`, error)
        results[channelType] = false
      }
    }

    return results
  }
}

export { AlertRouter }
```

### 5.6 环境变量配置

```env
# ============================================
# 邮件配置
# ============================================

# SMTP 配置（自建或第三方）
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.7zi.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_SMTP_SECURE=false
ALERT_EMAIL_SMTP_USER=alerts@7zi.com
ALERT_EMAIL_SMTP_PASS=your_smtp_password
ALERT_EMAIL_FROM=alerts@7zi.com
ALERT_EMAIL_TO=admin@7zi.com,ops-team@7zi.com

# Resend 配置（可选）
# ALERT_EMAIL_RESEND_API_KEY=re_xxxxxxxxxxxx

# ============================================
# Slack 配置
# ============================================

ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXX

# ============================================
# 告警策略配置
# ============================================

# P0 告警冷却时间（毫秒）
ALERT_P0_THROTTLE_MS=60000

# P1 告警冷却时间（毫秒）
ALERT_P1_THROTTLE_MS=300000

# P2 告警冷却时间（毫秒）
ALERT_P2_THROTTLE_MS=900000

# P3 告警冷却时间（毫秒）
ALERT_P3_THROTTLE_MS=1800000
```

---

## 6. 成本估算

### 6.1 方案成本对比

| 项目            | 方案 A（自建 SMTP） | 方案 B（Resend） | 方案 C（SendGrid） |
| --------------- | ------------------- | ---------------- | ------------------ |
| **邮件服务**    | $0/月               | $0-20/月         | $0-19/月           |
| **Slack**       | $0/月               | $0/月            | $0/月              |
| **SMTP 服务器** | 服务器成本已计入    | -                | -                  |
| **合计**        | **$0/月**           | **$0-20/月**     | **$0-19/月**       |

### 6.2 告警流量估算

**假设场景**:

- P0 告警: 2 次/月
- P1 告警: 5 次/月
- P2 告警: 15 次/月
- P3 告警: 30 次/月
- **总计**: ~52 次告警/月

**邮件发送量**:

- P0: 2 封（Email + Slack）
- P1: 5 封（Slack）
- P2: 15 封（Slack）
- P3: 30 封（Console）
- **邮件总计**: 2 封/月

**结论**:

- Resend 免费额度（3000 封/月）绰绰有余
- SendGrid 免费额度（3000 封/月）绰绰有余
- 自建 SMTP 零成本

### 6.3 年度成本预测

| 方案          | 第一年 | 第二年 | 第三年 | 三年总计 |
| ------------- | ------ | ------ | ------ | -------- |
| **自建 SMTP** | $0     | $0     | $0     | $0       |
| **Resend**    | $0     | $0     | $0     | $0       |
| **SendGrid**  | $0     | $0     | $0     | $0       |

_注：上述成本基于预计告警流量（< 1000 封/月）_

---

## 7. 实施步骤

### 7.1 阶段一：基础设施准备（1 天）

#### 任务清单

- [ ] **1.1 邮件服务准备**
  - [ ] 选择邮件服务（推荐：Resend）
  - [ ] 注册账号并获取 API Key
  - [ ] 验证发件域名（alerts@7zi.com）
  - [ ] 配置 SPF/DKIM/DMARC

- [ ] **1.2 Slack 集成准备**
  - [ ] 创建 Slack App
  - [ ] 配置 Incoming Webhook
  - [ ] 创建 `#alerts` 频道（如需要）
  - [ ] 获取 Webhook URL

- [ ] **1.3 环境变量配置**
  - [ ] 更新 `.env.local` 或环境变量
  - [ ] 配置邮件 SMTP 或 API Key
  - [ ] 配置 Slack Webhook URL

#### 验收标准

- [ ] 能发送测试邮件
- [ ] 能发送测试 Slack 消息
- [ ] 环境变量正确加载

---

### 7.2 阶段二：邮件通道实现（2 天）

#### 任务清单

- [ ] **2.1 安装依赖**

  ```bash
  npm install nodemailer
  # 或
  npm install resend
  ```

- [ ] **2.2 实现 EmailChannel**
  - [ ] 创建 `src/lib/monitoring/alert/channels/email.ts`
  - [ ] 实现邮件发送逻辑
  - [ ] 实现邮件模板（HTML）
  - [ ] 实现邮件优先级

- [ ] **2.3 单元测试**
  - [ ] 创建 `src/lib/monitoring/alert/channels/email.test.ts`
  - [ ] 测试邮件发送成功
  - [ ] 测试邮件发送失败
  - [ ] 测试邮件模板渲染

- [ ] **2.4 集成到 AlertRouter**
  - [ ] 更新 `src/lib/monitoring/alert/router.ts`
  - [ ] 注册 EmailChannel

#### 验收标准

- [ ] 单元测试通过
- [ ] 能成功发送测试邮件
- [ ] 邮件格式正确（HTML + Plain Text）
- [ ] 不同告警级别显示不同颜色

---

### 7.3 阶段三：Slack 通道实现（2 天）

#### 任务清单

- [ ] **3.1 实现 SlackChannel**
  - [ ] 创建 `src/lib/monitoring/alert/channels/slack.ts`
  - [ ] 实现消息发送逻辑
  - [ ] 实现消息格式化（Blocks + Attachments）
  - [ ] 实现操作按钮（View Details）

- [ ] **3.2 单元测试**
  - [ ] 创建 `src/lib/monitoring/alert/channels/slack.test.ts`
  - [ ] 测试消息发送成功
  - [ ] 测试消息发送失败
  - [ ] 测试消息格式化

- [ ] **3.3 集成到 AlertRouter**
  - [ ] 更新 `src/lib/monitoring/alert/router.ts`
  - [ ] 注册 SlackChannel

#### 验收标准

- [ ] 单元测试通过
- [ ] 能成功发送测试 Slack 消息
- [ ] 消息格式正确（颜色、字段、按钮）
- [ ] 不同告警级别显示不同颜色

---

### 7.4 阶段四：告警策略配置（1 天）

#### 任务清单

- [ ] **4.1 创建告警策略配置**
  - [ ] 创建 `src/lib/monitoring/alert/config.ts`
  - [ ] 定义告警策略接口
  - [ ] 配置 P0/P1/P2/P3 策略
  - [ ] 支持自定义策略

- [ ] **4.2 实现告警路由器**
  - [ ] 创建 `src/lib/monitoring/alert/router.ts`
  - [ ] 实现多渠道路由逻辑
  - [ ] 实现告警级别到通道映射
  - [ ] 实现失败重试逻辑

- [ ] **4.3 集成到 AlertManager**
  - [ ] 更新 `src/lib/monitoring/alert-manager.ts`
  - [ ] 集成 AlertRouter
  - [ ] 更新告警发送逻辑

#### 验收标准

- [ ] P0 告警发送到 Email + Slack
- [ ] P1 告警发送到 Slack
- [ ] P2 告警发送到 Slack
- [ ] P3 告警发送到 Console

---

### 7.5 阶段五：测试与优化（2 天）

#### 任务清单

- [ ] **5.1 集成测试**
  - [ ] 测试完整告警流程
  - [ ] 测试多渠道同时发送
  - [ ] 测试失败重试
  - [ ] 测试告警去重

- [ ] **5.2 性能测试**
  - [ ] 测试并发告警发送（100 个/分钟）
  - [ ] 测试内存占用
  - [ ] 测试响应时间

- [ ] **5.3 用户体验优化**
  - [ ] 优化邮件模板
  - [ ] 优化 Slack 消息格式
  - [ ] 添加告警分类标签

#### 验收标准

- [ ] 集成测试通过
- [ ] 性能测试通过（< 100ms/告警）
- [ ] 邮件和 Slack 消息格式美观
- [ ] 无内存泄漏

---

### 7.6 阶段六：文档与部署（1 天）

#### 任务清单

- [ ] **6.1 更新文档**
  - [ ] 更新 `src/lib/monitoring/README.md`
  - [ ] 添加邮件通道文档
  - [ ] 添加 Slack 通道文档
  - [ ] 添加告警策略文档

- [ ] **6.2 部署准备**
  - [ ] 环境变量清单
  - [ ] 部署检查清单
  - [ ] 回滚计划

- [ ] **6.3 灰度发布**
  - [ ] 部署到测试环境
  - [ ] 小范围验证
  - [ ] 生产环境灰度

#### 验收标准

- [ ] 文档完整且准确
- [ ] 测试环境部署成功
- [ ] 生产环境灰度成功

---

### 7.7 实施时间表

| 阶段     | 任务           | 预计工时 | 负责人      | 完成日期 |
| -------- | -------------- | -------- | ----------- | -------- |
| 阶段一   | 基础设施准备   | 1 天     | ⚡ Executor | Day 1    |
| 阶段二   | 邮件通道实现   | 2 天     | ⚡ Executor | Day 2-3  |
| 阶段三   | Slack 通道实现 | 2 天     | ⚡ Executor | Day 4-5  |
| 阶段四   | 告警策略配置   | 1 天     | ⚡ Executor | Day 6    |
| 阶段五   | 测试与优化     | 2 天     | 🧪 测试员   | Day 7-8  |
| 阶段六   | 文档与部署     | 1 天     | ⚡ Executor | Day 9    |
| **合计** |                | **9 天** |             |          |

---

## 8. 风险评估

### 8.1 技术风险

| 风险                 | 概率 | 影响 | 缓解措施                              |
| -------------------- | ---- | ---- | ------------------------------------- |
| 邮件送达率低         | 中   | 中   | 使用专业 SMTP 服务（Resend/SendGrid） |
| Slack Webhook 被限流 | 低   | 中   | 使用 Incoming Webhook（无配额限制）   |
| 告警风暴             | 中   | 高   | 告警去重 + 聚合 + 冷却期              |
| 邮件服务故障         | 低   | 高   | 多渠道备份（Slack）                   |
| 配置错误             | 中   | 低   | 充分测试 + 灰度发布                   |

### 8.2 运营风险

| 风险         | 概率 | 影响 | 缓解措施                      |
| ------------ | ---- | ---- | ----------------------------- |
| 告警噪音     | 高   | 中   | 精细化告警策略 + 告警静默规则 |
| 误报         | 中   | 中   | 根因分析 + 智能阈值           |
| 遗漏重要告警 | 低   | 高   | 告警级别分类 + 升级机制       |
| 通道故障     | 低   | 中   | 多渠道冗余                    |

### 8.3 成本风险

| 风险         | 概率 | 影响 | 缓解措施                    |
| ------------ | ---- | ---- | --------------------------- |
| 邮件服务涨价 | 低   | 低   | 自建 SMTP 备选方案          |
| 告警量激增   | 低   | 低   | 告警聚合 + 冷却期           |
| Slack 付费   | 低   | 中   | Incoming Webhook 无配额限制 |

---

## 9. 附录

### 9.1 相关文档

- **Sentry 集成**: `src/lib/monitoring/sentry-client.ts`
- **告警管理器**: `src/lib/monitoring/alert-manager.ts`
- **告警服务**: `src/lib/monitoring/alerts.ts`
- **监控文档**: `src/lib/monitoring/README.md`

### 9.2 代码示例

#### 发送告警示例

```typescript
import { alertManager } from '@/lib/monitoring/alert-manager'
import type { AlertConfig } from '@/lib/monitoring/alerts'

// 发送 P0 告警
const alert: AlertConfig = {
  severity: 'p0',
  title: 'System Down',
  message: '7zi.com is not responding',
  details: {
    'Error Code': '503',
    'Response Time': '5000ms',
    URL: 'https://7zi.com',
  },
  url: 'https://sentry.io/organizations/7zi/issues/12345',
  timestamp: new Date(),
  tags: ['system', 'critical'],
  channels: ['email', 'slack'], // 覆盖默认策略
}

await alertManager.sendAlert(alert)
```

#### 自定义告警规则

```typescript
import { AlertManager, type AlertRule } from '@/lib/monitoring/alert-manager'

const customRule: AlertRule = {
  id: 'custom-rule-1',
  name: 'Custom High Memory Alert',
  description: 'Alert when memory usage exceeds 80%',
  condition: (metrics: Record<string, unknown>) => {
    const memoryUsage = metrics.memoryUsage as number
    return memoryUsage > 80
  },
  level: 'p1',
  channels: ['slack', 'email'],
  enabled: true,
  throttleMs: 300000, // 5 分钟
  tags: ['memory', 'custom'],
}

alertManager.registerRule(customRule)
```

### 9.3 监控指标

#### 告警统计

- 总告警数
- 活跃告警数
- 按级别分类统计
- 按渠道分类统计
- 告警响应时间
- 告警确认率

#### 通道健康度

- 邮件发送成功率
- Slack 发送成功率
- 平均发送时间
- 失败重试次数

### 9.4 故障处理

#### 邮件发送失败

1. 检查 SMTP 配置
2. 检查网络连接
3. 检查发件域名验证（SPF/DKIM/DMARC）
4. 查看邮件服务日志
5. 切换到 Slack 备份通道

#### Slack Webhook 失败

1. 检查 Webhook URL
2. 检查网络连接
3. 检查 Slack Workspace 状态
4. 查看错误日志
5. 切换到邮件备份通道

#### 告警风暴

1. 检查告警去重逻辑
2. 增加冷却期时间
3. 检查告警规则配置
4. 启用告警静默规则
5. 分析根因

---

## 10. 总结

本方案为 7zi v1.7.0 提供了完整的邮件和 Slack 告警渠道技术方案：

### 推荐方案

- **邮件**: Nodemailer + Resend（免费）
- **Slack**: Incoming Webhooks

### 预期收益

- ✅ 多渠道告警通知
- ✅ 告警级别差异化处理
- ✅ 告警去重和聚合
- ✅ 灵活的告警策略配置
- ✅ 月成本 < $10

### 实施周期

- **总工时**: 9 天
- **团队**: ⚡ Executor（开发）、🧪 测试员（测试）

### 下一步行动

1. 主人评审并批准此方案
2. ⚡ Executor 开始实施阶段一（基础设施准备）
3. 定期汇报进度（每日站会）

---

## 11. 待实现功能

基于告警历史记录和统计功能分析报告（2026-04-04），以下功能需要在未来版本中实现：

### 11.1 高优先级功能

#### 11.1.1 持久化存储

**当前状态**: ❌ 缺失

**问题描述**:
- 告警历史仅存储在内存中
- 服务重启后数据丢失
- 无法满足长期数据管理和合规要求

**推荐方案**:

**方案 A: SQLite（推荐用于中小规模）**

```typescript
// 数据库表定义
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  level TEXT NOT NULL,  -- 'p0' | 'p1' | 'p2' | 'p3'
  message TEXT NOT NULL,
  details TEXT,  -- JSON
  timestamp INTEGER NOT NULL,
  resolved_at INTEGER,
  acknowledged_at INTEGER,
  acknowledged_by TEXT,
  count INTEGER DEFAULT 1,
  suppressed INTEGER DEFAULT 0,
  suppression_reason TEXT,
  channels TEXT,  -- JSON array
  send_results TEXT,  -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_alerts_level ON alerts(level);
CREATE INDEX idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX idx_alerts_status ON alerts(resolved_at, acknowledged_at);
```

**方案 B: PostgreSQL（推荐用于大规模）**

```sql
-- 主表
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL,
  level alert_level NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  count INTEGER DEFAULT 1,
  suppressed BOOLEAN DEFAULT FALSE,
  suppression_reason TEXT,
  channels TEXT[],
  send_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 枚举类型
CREATE TYPE alert_level AS ENUM ('p0', 'p1', 'p2', 'p3');

-- 索引
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX idx_alerts_level ON alerts(level);
CREATE INDEX idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX idx_alerts_status ON alerts(resolved_at, acknowledged_at);

-- 分区表（按月分区）
CREATE TABLE alerts_2026_04 PARTITION OF alerts
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

**实现要点**:

```typescript
// src/lib/monitoring/alert/storage.ts

import Database from 'better-sqlite3'
// 或
import { Pool } from 'pg'

interface AlertStorage {
  saveAlert(alert: AlertRecord): Promise<void>
  loadAlerts(query: AlertHistoryQuery): Promise<AlertRecord[]>
  getStats(timeRange: TimeRange): Promise<AlertStats>
  deleteOldAlerts(beforeDate: Date): Promise<number>
}

class SQLiteAlertStorage implements AlertStorage {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.initTables()
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        timestamp INTEGER NOT NULL,
        resolved_at INTEGER,
        acknowledged_at INTEGER,
        acknowledged_by TEXT,
        count INTEGER DEFAULT 1,
        suppressed INTEGER DEFAULT 0,
        suppression_reason TEXT,
        channels TEXT,
        send_results TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
      CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON alerts(rule_id);
    `)
  }

  async saveAlert(alert: AlertRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO alerts (
        id, rule_id, level, message, details, timestamp,
        resolved_at, acknowledged_at, acknowledged_by, count,
        suppressed, suppression_reason, channels, send_results,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        resolved_at = excluded.resolved_at,
        acknowledged_at = excluded.acknowledged_at,
        acknowledged_by = excluded.acknowledged_by,
        count = excluded.count,
        suppressed = excluded.suppressed,
        suppression_reason = excluded.suppression_reason,
        send_results = excluded.send_results,
        updated_at = excluded.updated_at
    `)

    stmt.run(
      alert.id,
      alert.ruleId,
      alert.level,
      alert.message,
      JSON.stringify(alert.details),
      alert.timestamp.getTime(),
      alert.resolvedAt?.getTime(),
      alert.acknowledgedAt?.getTime(),
      alert.acknowledgedBy,
      alert.count,
      alert.suppressed ? 1 : 0,
      alert.suppressionReason,
      JSON.stringify(alert.channels),
      JSON.stringify(alert.sendResults),
      Date.now(),
      Date.now()
    )
  }

  async loadAlerts(query: AlertHistoryQuery): Promise<AlertRecord[]> {
    const { timeRange, severity, status, ruleId, limit = 100 } = query

    let sql = 'SELECT * FROM alerts WHERE timestamp >= ? AND timestamp <= ?'
    const params: any[] = [timeRange.from.getTime(), timeRange.to.getTime()]

    if (severity && severity.length > 0) {
      sql += ` AND level IN (${severity.map(() => '?').join(',')})`
      params.push(...severity)
    }

    if (ruleId) {
      sql += ' AND rule_id = ?'
      params.push(ruleId)
    }

    if (status) {
      if (status.includes('active')) {
        sql += ' AND resolved_at IS NULL'
      }
      if (status.includes('resolved')) {
        sql += ' AND resolved_at IS NOT NULL'
      }
      if (status.includes('acknowledged')) {
        sql += ' AND acknowledged_at IS NOT NULL'
      }
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?'
    params.push(limit)

    const stmt = this.db.prepare(sql)
    const rows = stmt.all(...params)

    return rows.map(this.rowToAlert)
  }

  private rowToAlert(row: any): AlertRecord {
    return {
      id: row.id,
      ruleId: row.rule_id,
      level: row.level,
      message: row.message,
      details: JSON.parse(row.details || '{}'),
      timestamp: new Date(row.timestamp),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
      acknowledgedBy: row.acknowledged_by,
      count: row.count,
      suppressed: row.suppressed === 1,
      suppressionReason: row.suppression_reason,
      channels: JSON.parse(row.channels || '[]'),
      sendResults: JSON.parse(row.send_results || '{}'),
    }
  }

  async getStats(timeRange: TimeRange): Promise<AlertStats> {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_alerts,
        SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) as active_alerts,
        SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved_alerts,
        SUM(CASE WHEN suppressed = 1 THEN 1 ELSE 0 END) as suppressed_alerts
      FROM alerts
      WHERE timestamp >= ? AND timestamp <= ?
    `)

    const row = stmt.get(timeRange.from.getTime(), timeRange.to.getTime()) as any

    // 按级别统计
    const levelStmt = this.db.prepare(`
      SELECT level, COUNT(*) as count
      FROM alerts
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY level
    `)

    const levelRows = levelStmt.all(timeRange.from.getTime(), timeRange.to.getTime())
    const byLevel: Record<string, number> = {}
    levelRows.forEach((r: any) => {
      byLevel[r.level] = r.count
    })

    return {
      totalAlerts: row.total_alerts,
      activeAlerts: row.active_alerts,
      resolvedAlerts: row.resolved_alerts,
      suppressedAlerts: row.suppressed_alerts,
      byLevel,
      byChannel: {},
      avgResponseTime: 0,
      topAlerts: [],
    }
  }

  async deleteOldAlerts(beforeDate: Date): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM alerts WHERE timestamp < ?')
    const result = stmt.run(beforeDate.getTime())
    return result.changes
  }
}

export { SQLiteAlertStorage }
```

**环境变量**:

```env
# SQLite 配置
ALERT_STORAGE_TYPE=sqlite
ALERT_STORAGE_PATH=/var/lib/7zi/alerts.db

# PostgreSQL 配置（可选）
# ALERT_STORAGE_TYPE=postgresql
# ALERT_STORAGE_PG_HOST=localhost
# ALERT_STORAGE_PG_PORT=5432
# ALERT_STORAGE_PG_DATABASE=7zi
# ALERT_STORAGE_PG_USER=7zi
# ALERT_STORAGE_PG_PASSWORD=your_password
```

---

#### 11.1.2 时间基础保留策略

**当前状态**: ❌ 缺失

**问题描述**:
- 仅依赖内存数组大小限制（maxHistorySize）
- 无法按时间自动清理过期数据
- 无法满足合规要求（如保留 90 天）

**推荐方案**:

```typescript
// src/lib/monitoring/alert/retention.ts

export interface RetentionPolicy {
  keepDays: number           // 保留天数（活跃数据）
  archiveAfterDays: number   // 归档天数（超过此天数归档）
  maxStorageSize: number     // 最大存储大小（MB）
  archiveStorageSize: number // 归档存储大小（MB）
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  keepDays: 90,              // 活跃数据保留 90 天
  archiveAfterDays: 30,      // 30 天后归档
  maxStorageSize: 1024,      // 最大 1GB
  archiveStorageSize: 5120,  // 归档最大 5GB
}

export class RetentionManager {
  private policy: RetentionPolicy
  private storage: AlertStorage

  constructor(policy: RetentionPolicy, storage: AlertStorage) {
    this.policy = policy
    this.storage = storage
  }

  async applyRetentionPolicy(): Promise<RetentionResult> {
    const now = new Date()
    const keepDate = new Date(now.getTime() - this.policy.keepDays * 24 * 60 * 60 * 1000)
    const archiveDate = new Date(now.getTime() - this.policy.archiveAfterDays * 24 * 60 * 60 * 1000)

    // 1. 归档过期数据
    const archivedCount = await this.archiveOldAlerts(archiveDate)

    // 2. 删除超期数据
    const deletedCount = await this.storage.deleteOldAlerts(keepDate)

    // 3. 检查存储大小
    const storageSize = await this.getStorageSize()
    if (storageSize > this.policy.maxStorageSize) {
      // 如果超过最大存储，删除更早的数据
      const extraDays = Math.ceil((storageSize - this.policy.maxStorageSize) / (storageSize / this.policy.keepDays))
      const aggressiveKeepDate = new Date(keepDate.getTime() - extraDays * 24 * 60 * 60 * 1000)
      const aggressiveDeletedCount = await this.storage.deleteOldAlerts(aggressiveKeepDate)
      return {
        archivedCount,
        deletedCount: deletedCount + aggressiveDeletedCount,
        storageSize,
        aggressiveCleanup: true,
      }
    }

    return {
      archivedCount,
      deletedCount,
      storageSize,
      aggressiveCleanup: false,
    }
  }

  private async archiveOldAlerts(beforeDate: Date): Promise<number> {
    // 实现归档逻辑（导出到文件或归档表）
    const alerts = await this.storage.loadAlerts({
      timeRange: { from: new Date(0), to: beforeDate },
      limit: 10000,
    })

    // 导出为 JSON
    const archivePath = `/var/lib/7zi/archives/alerts_${Date.now()}.json`
    await fs.writeFile(archivePath, JSON.stringify(alerts, null, 2))

    // 压缩
    await exec(`gzip ${archivePath}`)

    return alerts.length
  }

  private async getStorageSize(): Promise<number> {
    // 获取数据库文件大小（MB）
    const stats = await fs.stat('/var/lib/7zi/alerts.db')
    return stats.size / (1024 * 1024)
  }
}

interface RetentionResult {
  archivedCount: number
  deletedCount: number
  storageSize: number
  aggressiveCleanup: boolean
}
```

**定时任务**:

```typescript
// src/lib/monitoring/alert/cron.ts

import cron from 'node-cron'

export function startRetentionCron(retentionManager: RetentionManager) {
  // 每日凌晨 3 点执行保留策略
  cron.schedule('0 3 * * *', async () => {
    console.log('[Retention] Applying retention policy...')
    const result = await retentionManager.applyRetentionPolicy()
    console.log('[Retention] Result:', result)
  })

  // 每小时检查存储大小
  cron.schedule('0 * * * *', async () => {
    const storageSize = await retentionManager.getStorageSize()
    if (storageSize > DEFAULT_RETENTION_POLICY.maxStorageSize * 0.9) {
      console.warn(`[Retention] Storage size ${storageSize}MB approaching limit`)
    }
  })
}
```

---

#### 11.1.3 导出功能

**当前状态**: ❌ 缺失

**问题描述**:
- 无法导出告警历史数据
- 无法进行离线分析
- 无法满足审计要求

**推荐方案**:

**API 端点**:

```typescript
// src/app/api/alerts/export/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { alertStorage } from '@/lib/monitoring/alert/storage'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'json'
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const level = searchParams.get('level')
  const ruleId = searchParams.get('ruleId')

  const timeRange = {
    from: from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: to ? new Date(to) : new Date(),
  }

  const alerts = await alertStorage.loadAlerts({
    timeRange,
    severity: level ? [level] : undefined,
    ruleId: ruleId || undefined,
    limit: 10000,
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `alerts_${timestamp}`

  switch (format) {
    case 'csv':
      const csv = convertToCSV(alerts)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })

    case 'json':
    default:
      const json = JSON.stringify(alerts, null, 2)
      return new NextResponse(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
  }
}

function convertToCSV(alerts: AlertRecord[]): string {
  const headers = [
    'id',
    'rule_id',
    'level',
    'message',
    'timestamp',
    'resolved_at',
    'acknowledged_at',
    'acknowledged_by',
    'count',
    'suppressed',
    'channels',
  ]

  const rows = alerts.map((alert) => [
    alert.id,
    alert.ruleId,
    alert.level,
    `"${alert.message.replace(/"/g, '""')}"`,
    alert.timestamp.toISOString(),
    alert.resolvedAt?.toISOString() || '',
    alert.acknowledgedAt?.toISOString() || '',
    alert.acknowledgedBy || '',
    alert.count,
    alert.suppressed ? 'true' : 'false',
    `"${alert.channels.join(',')}"`,
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
```

**使用示例**:

```bash
# 导出最近 7 天的告警（JSON）
curl "https://7zi.com/api/alerts/export?format=json&from=2026-03-28&to=2026-04-04" -o alerts.json

# 导出 P0 告警（CSV）
curl "https://7zi.com/api/alerts/export?format=csv&level=p0" -o p0_alerts.csv

# 导出特定规则的告警
curl "https://7zi.com/api/alerts/export?ruleId=high-memory-usage" -o memory_alerts.json
```

---

### 11.2 中优先级功能

#### 11.2.1 增强统计 API

**当前状态**: ⚠️ 基本完善

**待增强功能**:

```typescript
// src/lib/monitoring/alert/stats.ts

export interface EnhancedAlertStats extends AlertStats {
  mttr: number                    // Mean Time To Resolve (平均解决时间)
  mtta: number                    // Mean Time To Acknowledge (平均确认时间)
  trend: AlertTrend               // 告警趋势
  distribution: AlertDistribution // 告警分布
  topRules: Array<{               // Top 告警规则
    ruleId: string
    count: number
    avgResolutionTime: number
  }>
}

export interface AlertTrend {
  hourly: number[]      // 最近 24 小时
  daily: number[]       // 最近 7 天
  weekly: number[]      // 最近 4 周
  direction: 'up' | 'down' | 'stable'
  changePercent: number
}

export interface AlertDistribution {
  byHour: number[]      // 按小时分布（0-23）
  byDayOfWeek: number[] // 按星期分布（0-6）
  byMonth: number[]     // 按月分布（1-12）
}

export class EnhancedStatsCalculator {
  async calculateStats(timeRange: TimeRange): Promise<EnhancedAlertStats> {
    const alerts = await this.storage.loadAlerts({ timeRange, limit: 10000 })

    const baseStats = await this.storage.getStats(timeRange)

    return {
      ...baseStats,
      mttr: this.calculateMTTR(alerts),
      mtta: this.calculateMTTA(alerts),
      trend: await this.calculateTrend(timeRange),
      distribution: this.calculateDistribution(alerts),
      topRules: this.calculateTopRules(alerts),
    }
  }

  private calculateMTTR(alerts: AlertRecord[]): number {
    const resolvedAlerts = alerts.filter((a) => a.resolvedAt && a.timestamp)
    if (resolvedAlerts.length === 0) return 0

    const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime())
    }, 0)

    return totalResolutionTime / resolvedAlerts.length
  }

  private calculateMTTA(alerts: AlertRecord[]): number {
    const acknowledgedAlerts = alerts.filter((a) => a.acknowledgedAt && a.timestamp)
    if (acknowledgedAlerts.length === 0) return 0

    const totalAckTime = acknowledgedAlerts.reduce((sum, alert) => {
      return sum + (alert.acknowledgedAt!.getTime() - alert.timestamp.getTime())
    }, 0)

    return totalAckTime / acknowledgedAlerts.length
  }

  private async calculateTrend(timeRange: TimeRange): Promise<AlertTrend> {
    const now = new Date()

    // 最近 24 小时
    const hourly: number[] = []
    for (let i = 23; i >= 0; i--) {
      const from = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000)
      const to = new Date(now.getTime() - i * 60 * 60 * 1000)
      const stats = await this.storage.getStats({ from, to })
      hourly.push(stats.totalAlerts)
    }

    // 最近 7 天
    const daily: number[] = []
    for (let i = 6; i >= 0; i--) {
      const from = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000)
      const to = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const stats = await this.storage.getStats({ from, to })
      daily.push(stats.totalAlerts)
    }

    // 计算趋势方向
    const recentAvg = daily.slice(-3).reduce((a, b) => a + b, 0) / 3
    const previousAvg = daily.slice(0, 3).reduce((a, b) => a + b, 0) / 3
    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100

    let direction: 'up' | 'down' | 'stable' = 'stable'
    if (changePercent > 10) direction = 'up'
    if (changePercent < -10) direction = 'down'

    return {
      hourly,
      daily,
      weekly: [], // TODO
      direction,
      changePercent,
    }
  }

  private calculateDistribution(alerts: AlertRecord[]): AlertDistribution {
    const byHour = new Array(24).fill(0)
    const byDayOfWeek = new Array(7).fill(0)
    const byMonth = new Array(12).fill(0)

    alerts.forEach((alert) => {
      const date = alert.timestamp
      byHour[date.getHours()]++
      byDayOfWeek[date.getDay()]++
      byMonth[date.getMonth()]++
    })

    return { byHour, byDayOfWeek, byMonth }
  }

  private calculateTopRules(alerts: AlertRecord[]): Array<{ ruleId: string; count: number; avgResolutionTime: number }> {
    const ruleMap = new Map<string, { count: number; totalResolutionTime: number }>()

    alerts.forEach((alert) => {
      const existing = ruleMap.get(alert.ruleId) || { count: 0, totalResolutionTime: 0 }
      existing.count++

      if (alert.resolvedAt && alert.timestamp) {
        existing.totalResolutionTime += alert.resolvedAt.getTime() - alert.timestamp.getTime()
      }

      ruleMap.set(alert.ruleId, existing)
    })

    return Array.from(ruleMap.entries())
      .map(([ruleId, data]) => ({
        ruleId,
        count: data.count,
        avgResolutionTime: data.count > 0 ? data.totalResolutionTime / data.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
}
```

---

#### 11.2.2 归档 API

**当前状态**: ❌ 缺失

**推荐方案**:

```typescript
// src/app/api/alerts/archive/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { retentionManager } from '@/lib/monitoring/alert/retention'

// 手动触发归档
export async function POST(request: NextRequest) {
  const body = await request.json()
  const beforeDate = body.beforeDate ? new Date(body.beforeDate) : undefined

  const result = await retentionManager.applyRetentionPolicy()

  return NextResponse.json({
    success: true,
    archivedCount: result.archivedCount,
    deletedCount: result.deletedCount,
    storageSize: result.storageSize,
    aggressiveCleanup: result.aggressiveCleanup,
  })
}

// 查询归档数据
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const archiveFile = searchParams.get('file')

  if (!archiveFile) {
    // 列出所有归档文件
    const archiveDir = '/var/lib/7zi/archives'
    const files = await fs.readdir(archiveDir)
    const archives = files.filter((f) => f.endsWith('.json.gz'))

    return NextResponse.json({
      archives: archives.map((f) => ({
        filename: f,
        size: (await fs.stat(`${archiveDir}/${f}`)).size,
        createdAt: new Date(f.match(/alerts_(\d+)/)?.[1] || 0),
      })),
    })
  }

  // 读取特定归档文件
  const archivePath = `/var/lib/7zi/archives/${archiveFile}`
  const compressed = await fs.readFile(archivePath)
  const decompressed = await gunzip(compressed)
  const alerts = JSON.parse(decompressed.toString())

  return NextResponse.json(alerts)
}

// 清理过期归档
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const beforeDate = searchParams.get('beforeDate')

  if (!beforeDate) {
    return NextResponse.json({ error: 'Missing beforeDate parameter' }, { status: 400 })
  }

  const archiveDir = '/var/lib/7zi/archives'
  const files = await fs.readdir(archiveDir)
  const before = new Date(beforeDate)

  let deletedCount = 0
  for (const file of files) {
    const match = file.match(/alerts_(\d+)/)
    if (match) {
      const fileDate = new Date(parseInt(match[1]))
      if (fileDate < before) {
        await fs.unlink(`${archiveDir}/${file}`)
        deletedCount++
      }
    }
  }

  return NextResponse.json({
    success: true,
    deletedCount,
  })
}
```

---

#### 11.2.3 自动归档任务

**当前状态**: ❌ 缺失

**推荐方案**:

```typescript
// src/lib/monitoring/alert/archive-cron.ts

import cron from 'node-cron'
import { retentionManager } from './retention'

export function startArchiveCron() {
  // 每日凌晨 3 点执行归档
  cron.schedule('0 3 * * *', async () => {
    console.log('[Archive] Starting archive job...')

    try {
      const result = await retentionManager.applyRetentionPolicy()

      console.log('[Archive] Archive completed:', {
        archived: result.archivedCount,
        deleted: result.deletedCount,
        storageSize: `${result.storageSize.toFixed(2)}MB`,
        aggressiveCleanup: result.aggressiveCleanup,
      })

      // 发送归档报告
      if (result.archivedCount > 0 || result.deletedCount > 0) {
        await sendArchiveReport(result)
      }
    } catch (error) {
      console.error('[Archive] Archive job failed:', error)
      // 发送告警
      await alertManager.sendAlert({
        severity: 'p2',
        title: 'Archive Job Failed',
        message: `Alert archive job failed: ${error}`,
        details: { error: String(error) },
      })
    }
  })

  // 每周日凌晨 4 点执行深度清理
  cron.schedule('0 4 * * 0', async () => {
    console.log('[Archive] Starting deep cleanup...')

    try {
      // 清理 6 个月前的归档文件
      const beforeDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      const archiveDir = '/var/lib/7zi/archives'
      const files = await fs.readdir(archiveDir)

      let deletedCount = 0
      for (const file of files) {
        const match = file.match(/alerts_(\d+)/)
        if (match) {
          const fileDate = new Date(parseInt(match[1]))
          if (fileDate < beforeDate) {
            await fs.unlink(`${archiveDir}/${file}`)
            deletedCount++
          }
        }
      }

      console.log('[Archive] Deep cleanup completed:', { deletedCount })
    } catch (error) {
      console.error('[Archive] Deep cleanup failed:', error)
    }
  })
}

async function sendArchiveReport(result: RetentionResult) {
  const message = `
📦 Alert Archive Report

Archived: ${result.archivedCount} alerts
Deleted: ${result.deletedCount} alerts
Storage Size: ${result.storageSize.toFixed(2)}MB
Aggressive Cleanup: ${result.aggressiveCleanup ? 'Yes' : 'No'}

Time: ${new Date().toISOString()}
  `.trim()

  // 发送到 Slack
  await slackChannel.send({
    text: '📦 Alert Archive Report',
    attachments: [
      {
        color: '#22c55e',
        title: 'Archive Completed',
        text: message,
        fields: [
          { title: 'Archived', value: String(result.archivedCount), short: true },
          { title: 'Deleted', value: String(result.deletedCount), short: true },
          { title: 'Storage', value: `${result.storageSize.toFixed(2)}MB`, short: true },
        ],
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  })
}
```

---

### 11.3 低优先级功能

#### 11.3.1 告警趋势预测

**推荐方案**:

```typescript
// src/lib/monitoring/alert/prediction.ts

export interface AlertPrediction {
  predictedCount: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  recommendations: string[]
}

export class AlertPredictor {
  async predictNextWeek(timeRange: TimeRange): Promise<AlertPrediction> {
    const alerts = await this.storage.loadAlerts({ timeRange, limit: 10000 })

    // 简单线性回归
    const dailyCounts = this.groupByDay(alerts)
    const trend = this.calculateLinearTrend(dailyCounts)

    const predictedCount = Math.max(0, Math.round(trend.slope * 7 + trend.intercept))
    const confidence = this.calculateConfidence(dailyCounts, trend)

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (trend.slope > 0.5) trendDirection = 'increasing'
    if (trend.slope < -0.5) trendDirection = 'decreasing'

    const recommendations = this.generateRecommendations(trendDirection, predictedCount)

    return {
      predictedCount,
      confidence,
      trend: trendDirection,
      recommendations,
    }
  }

  private groupByDay(alerts: AlertRecord[]): number[] {
    const dayMap = new Map<number, number>()

    alerts.forEach((alert) => {
      const day = Math.floor(alert.timestamp.getTime() / (24 * 60 * 60 * 1000))
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    })

    return Array.from(dayMap.values())
  }

  private calculateLinearTrend(data: number[]): { slope: number; intercept: number } {
    const n = data.length
    const x = Array.from({ length: n }, (_, i) => i)
    const y = data

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return { slope, intercept }
  }

  private calculateConfidence(data: number[], trend: { slope: number; intercept: number }): number {
    // 计算R²
    const yMean = data.reduce((a, b) => a + b, 0) / data.length
    const ssTotal = data.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0)

    const ssResidual = data.reduce((sum, y, i) => {
      const predicted = trend.slope * i + trend.intercept
      return sum + Math.pow(y - predicted, 2)
    }, 0)

    const r2 = 1 - ssResidual / ssTotal
    return Math.max(0, Math.min(1, r2))
  }

  private generateRecommendations(trend: string, predictedCount: number): string[] {
    const recommendations: string[] = []

    if (trend === 'increasing') {
      recommendations.push('告警数量呈上升趋势，建议检查系统健康状况')
      recommendations.push('考虑增加监控频率或调整告警阈值')
    } else if (trend === 'decreasing') {
      recommendations.push('告警数量呈下降趋势，系统稳定性改善')
    }

    if (predictedCount > 100) {
      recommendations.push('预计下周告警数量较高，建议提前准备')
    }

    return recommendations
  }
}
```

---

### 11.4 实施优先级和时间表

| 功能                     | 优先级 | 预计工时 | 负责人      | 完成日期 |
| ------------------------ | ------ | -------- | ----------- | -------- |
| 持久化存储（SQLite）     | 高     | 3 天     | ⚡ Executor | Week 1-2 |
| 时间基础保留策略         | 高     | 2 天     | ⚡ Executor | Week 2   |
| 导出功能（CSV/JSON）     | 高     | 2 天     | ⚡ Executor | Week 2-3 |
| 增强统计 API             | 中     | 3 天     | ⚡ Executor | Week 3-4 |
| 归档 API                 | 中     | 2 天     | ⚡ Executor | Week 4   |
| 自动归档任务             | 中     | 1 天     | ⚡ Executor | Week 4   |
| 告警趋势预测             | 低     | 3 天     | 📚 咨询师   | Week 5-6 |

---

### 11.5 总结

本章节列出了基于告警历史记录分析报告的待实现功能，主要包括：

**高优先级**（必须实现）:
1. ✅ 持久化存储（SQLite/PostgreSQL）
2. ✅ 时间基础保留策略
3. ✅ 导出功能（CSV/JSON）

**中优先级**（建议实现）:
4. ✅ 增强统计 API（MTTR、趋势分析）
5. ✅ 归档 API
6. ✅ 自动归档任务

**低优先级**（可选实现）:
7. ✅ 告警趋势预测

这些功能将显著提升告警系统的数据管理能力，满足长期存储、合规要求和离线分析需求。

---

**文档版本**: v1.1  
**最后更新**: 2026-04-04  
**作者**: 📚 咨询师（研究分析师）

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

**文档版本**: v1.0  
**最后更新**: 2026-04-01  
**作者**: 📚 咨询师（研究分析师）

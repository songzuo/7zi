# 监控告警系统设计方案

## 1. 监控体系概述

### 1.1 监控目标

```
┌─────────────────────────────────────────────────────────────┐
│                      监控金字塔                              │
├─────────────────────────────────────────────────────────────┤
│  Level 4: 业务指标    │ 转化率、用户活跃度、功能使用率       │
├─────────────────────────────────────────────────────────────┤
│  Level 3: 应用性能    │ 页面加载、API 响应、资源加载         │
├─────────────────────────────────────────────────────────────┤
│  Level 2: 错误追踪    │ JS 错误、API 错误、资源加载失败      │
├─────────────────────────────────────────────────────────────┤
│  Level 1: 可用性监控  │ 服务存活、SSL 证书、DNS 解析         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 监控指标分类

| 类别 | 指标 | 重要性 | 采集方式 |
|------|------|--------|----------|
| **可用性** | 服务在线率 | P0 | 外部拨测 |
| | HTTP 可用性 | P0 | 外部拨测 |
| | SSL 证书有效期 | P1 | 外部拨测 |
| **性能** | LCP (Largest Contentful Paint) | P1 | RUM + 合成监控 |
| | FID (First Input Delay) | P1 | RUM |
| | CLS (Cumulative Layout Shift) | P1 | RUM |
| | TTFB (Time to First Byte) | P1 | RUM + 服务端 |
| | API 响应时间 | P1 | APM |
| **错误** | JS 错误率 | P0 | 错误追踪 |
| | API 错误率 | P0 | 错误追踪 |
| | 资源加载失败 | P1 | 错误追踪 |
| **业务** | 页面 PV/UV | P2 | 分析工具 |
| | 转化漏斗 | P2 | 分析工具 |
| | 用户路径 | P2 | 分析工具 |

---

## 2. 方案对比评估

### 2.1 Sentry vs DataDog vs 自建方案

#### Sentry (推荐 - 错误追踪首选)

| 维度 | 评分 | 说明 |
|------|------|------|
| **错误追踪** | ⭐⭐⭐⭐⭐ | 行业标准，SourceMap 支持，错误聚合 |
| **性能监控** | ⭐⭐⭐⭐ | 支持 Web Vitals，Transaction 追踪 |
| **用户体验** | ⭐⭐⭐⭐⭐ | 开箱即用，UI 友好 |
| **价格** | ⭐⭐⭐⭐ | 有免费层，团队版 $26/月 |
| **集成成本** | ⭐⭐⭐⭐⭐ | Next.js 原生支持，配置简单 |
| **告警能力** | ⭐⭐⭐⭐ | 灵活的告警规则，多渠道通知 |

**适用场景**: 错误追踪 + 基础性能监控

#### DataDog (全面但昂贵)

| 维度 | 评分 | 说明 |
|------|------|------|
| **错误追踪** | ⭐⭐⭐⭐ | 功能完整，但不如 Sentry 专注 |
| **性能监控** | ⭐⭐⭐⭐⭐ | 全栈 APM，RUM 强大 |
| **日志管理** | ⭐⭐⭐⭐⭐ | ELK 替代方案 |
| **基础设施** | ⭐⭐⭐⭐⭐ | 服务器、容器、云资源监控 |
| **价格** | ⭐⭐ | 起步 $15/月，快速叠加 |
| **集成成本** | ⭐⭐⭐ | 功能多，配置复杂 |

**适用场景**: 大型企业，需要全栈可观测性

#### 自建方案 (Grafana + Prometheus + Loki)

| 维度 | 评分 | 说明 |
|------|------|------|
| **灵活性** | ⭐⭐⭐⭐⭐ | 完全可控 |
| **成本** | ⭐⭐⭐⭐ | 自托管，服务器成本 |
| **维护成本** | ⭐⭐ | 需要运维团队 |
| **错误追踪** | ⭐⭐⭐ | 需要额外组件 |
| **前端监控** | ⭐⭐⭐ | 需要自建 RUM |

**适用场景**: 有运维能力，需要数据主权

### 2.2 推荐方案

```
┌─────────────────────────────────────────────────────────────┐
│                    7zi-frontend 监控架构                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│  │   Sentry    │   │  UptimeRobot │   │   Umami     │        │
│  │  (错误+性能) │   │  (可用性)    │   │  (用户行为)  │        │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘        │
│         │                 │                  │               │
│         └────────────────┬┴──────────────────┘               │
│                          ▼                                   │
│                  ┌───────────────┐                          │
│                  │   告警中心    │                          │
│                  │ (Slack/Email) │                          │
│                  └───────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**最终选择**:
- **错误追踪**: Sentry (免费层足够使用)
- **性能监控**: Sentry Performance + Vercel Analytics
- **可用性监控**: UptimeRobot (免费) / Better Uptime
- **用户分析**: Umami (已配置，开源隐私友好)

---

## 3. Sentry 配置方案

### 3.1 SDK 集成

```typescript
// sentry.client.config.ts (客户端)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 采样率配置
  tracesSampleRate: 0.1, // 10% 性能追踪
  replaysSessionSampleRate: 0.1, // 10% Session Replay
  replaysOnErrorSampleRate: 1.0, // 错误时 100% 录制
  
  // 环境标识
  environment: process.env.NODE_ENV,
  
  // 发布版本
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  // 忽略特定错误
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'cancelled',
  ],
  
  // 面包屑配置
  maxBreadcrumbs: 50,
  
  // 用户反馈
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
```

### 3.2 性能指标采集

```typescript
// lib/monitoring/webVitals.ts
import { onCLS, onFID, onLCP, onTTFB, onFCP } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

export function reportWebVitals() {
  onLCP((metric) => {
    Sentry.metrics.distribution('web-vitals-lcp', metric.value, {
      tags: { route: window.location.pathname },
    });
  });

  onFID((metric) => {
    Sentry.metrics.distribution('web-vitals-fid', metric.value, {
      tags: { route: window.location.pathname },
    });
  });

  onCLS((metric) => {
    Sentry.metrics.distribution('web-vitals-cls', metric.value, {
      tags: { route: window.location.pathname },
    });
  });

  onTTFB((metric) => {
    Sentry.metrics.distribution('web-vitals-ttfb', metric.value, {
      tags: { route: window.location.pathname },
    });
  });

  onFCP((metric) => {
    Sentry.metrics.distribution('web-vitals-fcp', metric.value, {
      tags: { route: window.location.pathname },
    });
  });
}
```

### 3.3 自定义错误边界

```typescript
// components/ErrorBoundary.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">出错了</h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 4. 可用性监控方案

### 4.1 外部拨测配置

```yaml
# UptimeRobot 配置建议
monitors:
  - name: "7zi.studio - 主页"
    url: "https://7zi.studio"
    type: "https"
    interval: 300 # 5分钟
    timeout: 30
    expected_status: 200
    keyword: "" # 可选：检查页面关键词
    
  - name: "7zi.studio - API Health"
    url: "https://7zi.studio/api/health"
    type: "https"
    interval: 60 # 1分钟
    timeout: 10
    expected_status: 200
    
  - name: "7zi.studio - SSL"
    type: "ssl"
    url: "7zi.studio"
    interval: 3600 # 1小时检查 SSL
```

### 4.2 健康检查端点

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_SENTRY_RELEASE || 'unknown',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  return NextResponse.json(health, { status: 200 });
}
```

### 4.3 详细健康检查（可选）

```typescript
// app/api/health/detailed/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    external_api: await checkExternalAPI(),
  };

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}

async function checkDatabase() {
  // 如果有数据库连接，检查状态
  return { status: 'ok', latency: 0 };
}

async function checkRedis() {
  // 如果有 Redis，检查状态
  return { status: 'ok', latency: 0 };
}

async function checkExternalAPI() {
  try {
    const start = Date.now();
    const response = await fetch('https://api.github.com/zen', {
      signal: AbortSignal.timeout(5000),
    });
    return {
      status: response.ok ? 'ok' : 'error',
      latency: Date.now() - start,
    };
  } catch {
    return { status: 'error', latency: 0 };
  }
}
```

---

## 5. 告警规则设计

### 5.1 告警级别定义

| 级别 | 名称 | 响应时间 | 通知方式 | 示例 |
|------|------|----------|----------|------|
| P0 | 紧急 | 5 分钟 | 电话 + SMS + Slack | 服务宕机 |
| P1 | 严重 | 15 分钟 | Slack + Email | 错误率 > 5% |
| P2 | 警告 | 1 小时 | Slack | 性能下降 |
| P3 | 信息 | 24 小时 | Email | 证书即将过期 |

### 5.2 Sentry 告警规则

```yaml
# Sentry 告警规则配置

rules:
  # P0: 服务完全不可用
  - name: "服务宕机"
    conditions:
      - type: "event_threshold"
        level: "error"
        threshold: 100
        time_window: 5m
    actions:
      - type: "slack"
        channel: "#alerts-p0"
      - type: "email"
        recipients: ["admin@7zi.studio"]
    
  # P1: 错误率异常
  - name: "错误率飙升"
    conditions:
      - type: "event_rate"
        baseline: "1w"
        threshold_percent: 300  # 比上周增长 3 倍
    actions:
      - type: "slack"
        channel: "#alerts-p1"
        
  # P1: 特定错误首次出现
  - name: "新错误类型"
    conditions:
      - type: "new_issue"
    actions:
      - type: "slack"
        channel: "#alerts-p1"
        
  # P2: 性能下降
  - name: "LCP 超过阈值"
    conditions:
      - type: "transaction_threshold"
        metric: "lcp"
        threshold: 4000  # 4 秒
        percentile: 75
    actions:
      - type: "slack"
        channel: "#alerts-p2"
```

### 5.3 UptimeRobot 告警配置

```yaml
# 通知渠道配置
alert_contacts:
  - name: "Slack Alert"
    type: "slack"
    webhook_url: "${SLACK_WEBHOOK_URL}"
    
  - name: "Email Alert"
    type: "email"
    address: "admin@7zi.studio"
    
  - name: "SMS Alert (P0 only)"
    type: "sms"
    number: "+86-xxx-xxxx-xxxx"

# 告警策略
alert_policies:
  p0:
    channels: ["Slack Alert", "Email Alert", "SMS Alert"]
    repeat_after: 5m  # 每 5 分钟提醒一次
    
  p1:
    channels: ["Slack Alert", "Email Alert"]
    repeat_after: 15m
```

---

## 6. 通知渠道配置

### 6.1 Slack 集成

```typescript
// lib/alerting/slack.ts
interface SlackMessage {
  level: 'p0' | 'p1' | 'p2' | 'p3';
  title: string;
  message: string;
  details?: Record<string, string>;
  url?: string;
}

export async function sendSlackAlert(msg: SlackMessage) {
  const colorMap = {
    p0: '#FF0000', // 红色
    p1: '#FFA500', // 橙色
    p2: '#FFFF00', // 黄色
    p3: '#00FF00', // 绿色
  };

  const payload = {
    attachments: [
      {
        color: colorMap[msg.level],
        title: `[${msg.level.toUpperCase()}] ${msg.title}`,
        text: msg.message,
        fields: Object.entries(msg.details || {}).map(([key, value]) => ({
          title: key,
          value: value,
          short: true,
        })),
        actions: msg.url
          ? [
              {
                type: 'button',
                text: '查看详情',
                url: msg.url,
              },
            ]
          : undefined,
        footer: '7zi-frontend Monitoring',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

### 6.2 邮件告警模板

```html
<!-- emails/alert.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    .alert { padding: 20px; font-family: sans-serif; }
    .p0 { background: #ffebee; border-left: 4px solid #f44336; }
    .p1 { background: #fff3e0; border-left: 4px solid #ff9800; }
    .p2 { background: #fffde7; border-left: 4px solid #ffeb3b; }
    .p3 { background: #e8f5e9; border-left: 4px solid #4caf50; }
  </style>
</head>
<body>
  <div class="alert {{level}}">
    <h2>[{{level}}] {{title}}</h2>
    <p>{{message}}</p>
    <hr>
    <p><strong>时间:</strong> {{timestamp}}</p>
    <p><strong>环境:</strong> {{environment}}</p>
    <a href="{{url}}">查看详情</a>
  </div>
</body>
</html>
```

---

## 7. 监控仪表板

### 7.1 Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "7zi-frontend Monitoring",
    "panels": [
      {
        "title": "服务可用性",
        "type": "stat",
        "targets": [
          {
            "expr": "avg_over_time(up{job=\"7zi-frontend\"}[24h]) * 100"
          }
        ],
        "thresholds": {
          "mode": "absolute",
          "steps": [
            { "value": 0, "color": "red" },
            { "value": 99, "color": "yellow" },
            { "value": 99.9, "color": "green" }
          ]
        }
      },
      {
        "title": "错误率趋势",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(sentry_errors_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Web Vitals (P75)",
        "type": "graph",
        "targets": [
          { "expr": "histogram_quantile(0.75, web_vitals_lcp_bucket)" },
          { "expr": "histogram_quantile(0.75, web_vitals_fid_bucket)" },
          { "expr": "histogram_quantile(0.75, web_vitals_cls_bucket)" }
        ]
      }
    ]
  }
}
```

### 7.2 状态页面

```typescript
// app/status/page.tsx
export default async function StatusPage() {
  const status = await fetchStatus();

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">系统状态</h1>

      <div className="grid gap-6">
        <StatusCard
          name="网站可用性"
          status={status.uptime}
          uptime="99.99%"
        />
        <StatusCard
          name="API 响应"
          status={status.api}
          latency="120ms"
        />
        <StatusCard
          name="CDN 状态"
          status={status.cdn}
          latency="45ms"
        />
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">事件历史</h2>
        <IncidentTimeline incidents={status.incidents} />
      </div>
    </div>
  );
}
```

---

## 8. 实施计划

### Phase 1: 基础监控 (Week 1)

- [ ] 创建 Sentry 项目并配置 DSN
- [ ] 集成 Sentry SDK 到 Next.js
- [ ] 配置 UptimeRobot 监控
- [ ] 设置基础告警规则

### Phase 2: 性能监控 (Week 2)

- [ ] 启用 Sentry Performance
- [ ] 集成 Web Vitals 采集
- [ ] 配置 SourceMap 上传
- [ ] 创建性能仪表板

### Phase 3: 告警优化 (Week 3)

- [ ] 配置 Slack 通知
- [ ] 设置告警升级策略
- [ ] 编写运维手册
- [ ] 进行告警演练

### Phase 4: 持续改进

- [ ] 分析告警噪音率
- [ ] 优化告警阈值
- [ ] 添加自定义指标
- [ ] 建立 SLA 目标

---

## 9. 运维手册

### 9.1 常见告警处理流程

#### 服务宕机 (P0)

```
1. 检查 UptimeRobot 确认影响范围
2. SSH 登录服务器
3. 检查 Docker 容器状态: docker ps -a
4. 查看日志: docker logs 7zi-frontend
5. 重启服务: docker-compose restart
6. 确认恢复后，记录事件
```

#### 错误率飙升 (P1)

```
1. 打开 Sentry 查看错误详情
2. 分析错误堆栈和用户影响
3. 判断是否为代码问题
   - 是: 回滚或热修复
   - 否: 检查第三方服务
4. 更新 Sentry Issue 状态
```

#### 性能下降 (P2)

```
1. 检查 Sentry Performance
2. 分析慢事务和瓶颈
3. 检查服务器资源使用
4. 考虑 CDN 缓存策略
5. 记录优化建议
```

---

## 10. 成本估算

| 服务 | 套餐 | 月费用 | 说明 |
|------|------|--------|------|
| Sentry | Team | $26 | 错误+性能监控 |
| UptimeRobot | Free | $0 | 可用性监控 |
| Umami | Self-hosted | $0 | 用户分析 |
| Grafana Cloud | Free | $0 | 指标可视化 |
| **总计** | - | **$26/月** | - |

---

*文档版本: 1.0*
*最后更新: 2026-03-06*
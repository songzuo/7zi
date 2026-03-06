# 监控告警系统实施总结

## 已完成的工作

### 1. 设计文档
- **位置**: `docs/MONITORING_DESIGN.md`
- **内容**:
  - 监控体系概述（4层金字塔）
  - 监控指标分类
  - 方案对比评估（Sentry vs DataDog vs 自建）
  - 推荐架构（Sentry + UptimeRobot + Umami）
  - 实施计划（4个阶段）
  - 运维手册
  - 成本估算

### 2. Sentry 配置文件

| 文件 | 用途 |
|------|------|
| `sentry.client.config.ts` | 浏览器端配置 |
| `sentry.server.config.ts` | 服务端配置 |
| `sentry.edge.config.ts` | Edge Runtime 配置 |
| `.env.sentry.example` | 环境变量模板 |

### 3. 监控工具库 (`src/lib/monitoring/`)

| 模块 | 功能 |
|------|------|
| `web-vitals.ts` | Core Web Vitals 采集和上报 |
| `errors.ts` | 错误追踪和分类 |
| `alerts.ts` | 告警服务（Slack/Email） |
| `health.ts` | 健康检查工具 |
| `index.ts` | 统一导出 |

### 4. API 端点

| 端点 | 用途 |
|------|------|
| `/api/health` | 基础健康检查 |
| `/api/health/detailed` | 详细健康状态 |
| `/api/health/live` | K8s Liveness Probe |
| `/api/health/ready` | K8s Readiness Probe |
| `/api/status` | 公开状态 API |

### 5. 告警配置

- **位置**: `docs/ALERT_RULES.yaml`
- **内容**:
  - P0-P3 告警规则定义
  - 通知渠道配置
  - 升级策略
  - SLA 目标

### 6. 运维手册

- **位置**: `docs/OPERATIONS_MANUAL.md`
- **内容**:
  - 常见告警处理流程
  - 回滚方案
  - 健康检查端点
  - 部署后检查清单
  - 定期维护任务

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# 复制模板
cp .env.sentry.example .env.local

# 编辑并填入实际值
# 必需:
# - NEXT_PUBLIC_SENTRY_DSN (从 Sentry 获取)
# - SENTRY_AUTH_TOKEN (用于 SourceMap 上传)
```

### 3. 创建 Sentry 项目

1. 访问 https://sentry.io
2. 创建新项目 "7zi-frontend"
3. 获取 DSN 和 Auth Token
4. 配置告警规则（参考 `docs/ALERT_RULES.yaml`）

### 4. 配置 UptimeRobot

1. 访问 https://uptimerobot.com
2. 添加监控:
   - `https://7zi.studio` (5分钟间隔)
   - `https://7zi.studio/api/health` (1分钟间隔)
3. 配置 Slack 通知

### 5. 验证部署

```bash
# 本地测试
npm run build
npm run start

# 检查健康端点
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/detailed

# 检查 Sentry 连接
# 在浏览器中触发一个测试错误
```

---

## 推荐监控架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     7zi-frontend 监控架构                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   用户访问                                                       │
│       │                                                          │
│       ▼                                                          │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │   Browser   │────▶│   Sentry    │────▶│   Slack     │       │
│   │  (RUM SDK)  │     │ (错误+性能)  │     │  (告警)     │       │
│   └─────────────┘     └─────────────┘     └─────────────┘       │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │ UptimeRobot │────▶│  Dashboard  │────▶│   Email     │       │
│   │ (可用性)     │     │  (可视化)    │     │  (通知)     │       │
│   └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
│   ┌─────────────┐                                               │
│   │   Umami     │  用户行为分析 (已配置)                         │
│   └─────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 成本估算

| 服务 | 套餐 | 月费用 | 说明 |
|------|------|--------|------|
| Sentry | Team | $26 | 错误+性能监控 |
| UptimeRobot | Free | $0 | 可用性监控 |
| Umami | Self-hosted | $0 | 用户分析 |
| **总计** | | **$26/月** | |

---

## 下一步

1. **获取 Sentry DSN**
   - 注册 Sentry 账号
   - 创建项目
   - 复制 DSN

2. **配置 Slack Webhook**
   - 创建 Slack App
   - 获取 Webhook URL
   - 添加到环境变量

3. **设置 UptimeRobot**
   - 添加监控项
   - 配置通知

4. **部署验证**
   - 部署到生产环境
   - 触发测试告警
   - 验证通知渠道

---

## 文件清单

```
7zi-frontend/
├── .env.sentry.example          # Sentry 环境变量模板
├── sentry.client.config.ts      # 客户端 Sentry 配置
├── sentry.server.config.ts      # 服务端 Sentry 配置
├── sentry.edge.config.ts        # Edge Sentry 配置
├── next.config.ts               # 已集成 Sentry
├── package.json                 # 已添加依赖
│
├── src/
│   ├── app/api/
│   │   ├── health/route.ts      # 基础健康检查
│   │   ├── health/detailed/route.ts
│   │   ├── health/live/route.ts # K8s Liveness
│   │   ├── health/ready/route.ts # K8s Readiness
│   │   └── status/route.ts      # 公开状态 API
│   │
│   └── lib/monitoring/
│       ├── index.ts             # 统一导出
│       ├── web-vitals.ts        # Web Vitals 采集
│       ├── errors.ts            # 错误追踪
│       ├── alerts.ts            # 告警服务
│       └── health.ts            # 健康检查工具
│
└── docs/
    ├── MONITORING_DESIGN.md     # 监控设计文档
    ├── ALERT_RULES.yaml         # 告警规则配置
    └── OPERATIONS_MANUAL.md     # 运维手册
```

---

*文档版本: 1.0*
*创建日期: 2026-03-06*
*作者: 架构师子代理*
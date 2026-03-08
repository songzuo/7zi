# 监控告警系统实施报告

## 📊 执行摘要

**任务完成时间**: 2026-03-08  
**实施状态**: ✅ 完成  
**系统状态**: 准备就绪

---

## 1️⃣ Prometheus 配置检查

### 已创建文件

| 文件 | 路径 | 说明 |
|------|------|------|
| Prometheus 主配置 | `monitoring/prometheus/prometheus.yml` | 采集配置、告警管理 |
| 告警规则 | `monitoring/prometheus/rules/alerts.yml` | P0-P3 告警规则定义 |

### 监控目标配置

| Job | Target | 采集间隔 | 说明 |
|-----|--------|----------|------|
| `prometheus` | localhost:9090 | 15s | Prometheus 自监控 |
| `node` | node-exporter:9100 | 15s | 系统指标 (CPU/内存/磁盘) |
| `7zi-frontend` | 7zi-frontend:3000 | 10s | 应用指标 |
| `nginx` | nginx:80 | 15s | Nginx 状态 |
| `blackbox` | blackbox:9115 | 60s | 外部 HTTP/HTTPS 探测 |
| `blackbox-ssl` | blackbox:9115 | 3600s | SSL 证书检查 |

### 告警规则统计

| 级别 | 数量 | 响应时间 | 示例 |
|------|------|----------|------|
| **P0 - Critical** | 4 | 5 分钟 | ServiceDown, SSLCertificateExpired |
| **P1 - High** | 6 | 15 分钟 | HighErrorRate, HighCPUUsage |
| **P2 - Warning** | 5 | 1 小时 | ElevatedResponseTime, DiskSpaceWarning |
| **P3 - Info** | 2 | 24 小时 | SSLCertificateReminder, TrafficSpike |
| **Recording Rules** | 7 | - | 性能优化预计算 |

---

## 2️⃣ 告警规则添加

### 核心告警规则

#### P0 - 紧急告警

```yaml
- ServiceDown: 服务宕机超过 2 分钟
- AllInstancesDown: 所有实例不可用
- HighErrorRate: 错误率超过 10%
- SSLCertificateExpired: SSL 证书已过期
```

#### P1 - 高优先级告警

```yaml
- ElevatedErrorRate: 错误率超过 5%
- HighResponseTime: P95 响应时间超过 2 秒
- SSLCertificateExpiringSoon: SSL 证书 7 天内过期
- HighMemoryUsage: 内存使用率超过 85%
- HighCPUUsage: CPU 使用率超过 90%
- DiskSpaceLow: 磁盘空间低于 15%
```

#### P2 - 警告告警

```yaml
- ElevatedResponseTime: P95 响应时间超过 1 秒
- MemoryUsageElevated: 内存使用率超过 75%
- DiskSpaceWarning: 磁盘空间低于 25%
- SSLCertificateExpiring: SSL 证书 30 天内过期
- ContainerRestartHigh: 容器频繁重启
```

### 告警抑制规则

- 服务宕机时抑制其他告警
- 所有实例宕机时抑制单实例告警
- 维护窗口期间静默告警

---

## 3️⃣ 通知渠道配置

### Alertmanager 配置

**文件**: `monitoring/alertmanager/alertmanager.yml`

### 通知路由

| 级别 | Slack 频道 | 邮件接收者 | 重复间隔 |
|------|-----------|-----------|----------|
| P0 - Critical | #alerts-critical | admin@7zi.studio, ops@7zi.studio | 5 分钟 |
| P1 - High | #alerts-high | admin@7zi.studio | 30 分钟 |
| P2 - Warning | #alerts-warning | - | 2 小时 |
| P3 - Info | - | dev@7zi.studio | 24 小时 |

### 通知模板

**文件**: `monitoring/alertmanager/templates/notifications.tmpl`

- ✅ Slack 通知模板 (带按钮链接)
- ✅ HTML 邮件模板 (带颜色编码)
- ✅ 告警分组和去重

### 维护窗口

- 每周日 02:00-04:00 UTC 静默告警

---

## 4️⃣ 仪表盘添加

### Grafana 仪表盘

**文件**: `monitoring/grafana/dashboards/7zi-overview.json`

### 面板布局

```
┌─────────────────────────────────────────────────────────────┐
│  [Service Status]  [Uptime 24h]  [Error Rate]  [Alerts]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Request Rate (6h)]           [Response Time Percentiles] │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Memory Usage]  [CPU Usage]   [Disk Usage]                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Active Alerts Table]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 关键指标

| 指标 | 类型 | 阈值 |
|------|------|------|
| Service Status | Stat | UP/DOWN |
| Uptime (24h) | Stat | >99.9% 🟢 |
| Error Rate | Stat | <1% 🟢, <5% 🟡, >5% 🔴 |
| Request Rate | TimeSeries | req/s |
| Response Time (P50/P95/P99) | TimeSeries | <1s 🟢, <2s 🟡, >2s 🔴 |
| Memory Usage | TimeSeries | <75% 🟢, <85% 🟡, >85% 🔴 |
| CPU Usage | TimeSeries | <75% 🟢, <90% 🟡, >90% 🔴 |
| Disk Usage | TimeSeries | >25% 🟢, >15% 🟡, <15% 🔴 |

### 访问地址

| 服务 | 端口 | URL |
|------|------|-----|
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |
| Alertmanager | 9093 | http://localhost:9093 |

---

## 5️⃣ 监控报告

### 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     7zi-frontend 监控架构                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │  Prometheus  │───▶│ Alertmanager │───▶│    Slack     │     │
│   │  (采集存储)   │    │  (路由告警)   │    │   (通知)     │     │
│   └──────┬───────┘    └──────────────┘    └──────────────┘     │
│          │                                      │               │
│          ▼                                      ▼               │
│   ┌──────────────┐                       ┌──────────────┐     │
│   │   Grafana    │                       │    Email     │     │
│   │  (可视化)    │                       │   (通知)     │     │
│   └──────────────┘                       └──────────────┘     │
│          ▲                                                     │
│          │                                                     │
│   ┌──────┴──────────────────────────────────────────────┐     │
│   │                   数据源                              │     │
│   ├──────────┬──────────┬──────────┬──────────┬─────────┤     │
│   │   Node   │  7zi-    │  Blackbox │  cAdvisor │  Nginx  │     │
│   │ Exporter │ Frontend │ Exporter  │          │         │     │
│   └──────────┴──────────┴──────────┴──────────┴─────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 监控组件

| 组件 | 版本 | 用途 |
|------|------|------|
| Prometheus | v2.52.0 | 指标采集和存储 |
| Alertmanager | v0.27.0 | 告警路由和通知 |
| Grafana | v11.0.0 | 数据可视化 |
| Node Exporter | v1.8.0 | 系统指标 |
| Blackbox Exporter | v0.25.0 | 外部探测 |
| cAdvisor | v0.49.0 | 容器指标 |

### SLA 目标

| 指标 | 目标 | 测量周期 |
|------|------|----------|
| 可用性 | 99.9% | 30 天 |
| 错误率 | <0.1% | 实时 |
| P50 响应时间 | <200ms | 实时 |
| P95 响应时间 | <500ms | 实时 |
| P99 响应时间 | <1000ms | 实时 |
| MTTR (P0) | <15 分钟 | 事件 |

---

## 📁 文件清单

```
monitoring/
├── docker-compose.yml              # 监控栈编排
├── .env.example                    # 环境变量模板
│
├── prometheus/
│   ├── prometheus.yml              # 主配置
│   └── rules/
│       └── alerts.yml              # 告警规则
│
├── alertmanager/
│   ├── alertmanager.yml            # 告警路由配置
│   └── templates/
│       └── notifications.tmpl      # 通知模板
│
├── grafana/
│   ├── datasources/
│   │   └── datasources.yml         # 数据源配置
│   └── dashboards/
│       ├── dashboards.yml          # 仪表盘配置
│       └── 7zi-overview.json       # 主仪表盘
│
└── blackbox/
    └── blackbox.yml                # 探测模块配置
```

---

## 🚀 快速启动

### 1. 配置环境变量

```bash
cd monitoring
cp .env.example .env
# 编辑 .env 填入实际值
```

### 2. 启动监控栈

```bash
docker-compose up -d
```

### 3. 验证服务

```bash
# 检查容器状态
docker-compose ps

# 访问 Prometheus
curl http://localhost:9090/-/healthy

# 访问 Grafana
curl http://localhost:3001/api/health

# 访问 Alertmanager
curl http://localhost:9093/-/healthy
```

### 4. 登录 Grafana

- URL: http://localhost:3001
- 用户名：admin
- 密码：admin123 (首次登录后修改)

---

## 🔧 集成到现有系统

### 添加到主 docker-compose

在 `docker-compose.yml` 中添加网络:

```yaml
networks:
  7zi-network:
    external: true
    name: monitoring
```

### 应用指标端点

在 Next.js 应用中添加 `/api/metrics` 端点:

```typescript
// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { register } from 'prom-client';

export async function GET() {
  const metrics = await register.metrics();
  return new NextResponse(metrics, {
    headers: { 'Content-Type': register.contentType },
  });
}
```

### 安装依赖

```bash
npm install prom-client
```

---

## 📋 运维手册

### 日常检查

```bash
# 查看 Prometheus 状态
curl http://localhost:9090/-/healthy

# 查看活跃告警
curl http://localhost:9093/api/v2/alerts

# 查看 Grafana 仪表盘
open http://localhost:3001
```

### 告警处理流程

1. **收到告警** → 查看 Slack/邮件通知
2. **确认告警** → 访问 Grafana 仪表盘
3. **诊断问题** → 查看相关指标和日志
4. **执行修复** → 参考 Runbook
5. **记录事件** → 更新事件日志

### 维护操作

```bash
# 重启 Prometheus
docker-compose restart prometheus

# 备份 Prometheus 数据
docker-compose stop prometheus
tar -czf prometheus-backup.tar.gz prometheus_data/
docker-compose start prometheus

# 清理旧数据
curl -X POST http://localhost:9090/api/v1/admin/tsdb/delete_series?match[]={job="7zi-frontend"}
```

---

## ✅ 验收标准

- [x] Prometheus 配置完成，包含所有监控目标
- [x] 告警规则覆盖 P0-P3 所有级别
- [x] 通知渠道配置 (Slack + Email)
- [x] Grafana 仪表盘创建并配置
- [x] 数据源自动配置
- [x] 维护窗口和告警抑制规则
- [x] 文档完整 (配置、运维、快速开始)

---

## 🎯 后续优化建议

1. **日志集成**: 添加 Loki 用于日志聚合
2. **链路追踪**: 集成 Jaeger/Tempo 用于分布式追踪
3. **自动扩缩容**: 基于指标配置 HPA
4. **SLO 监控**: 添加 SLO 燃烧率告警
5. **合成监控**: 添加更多黑盒测试场景

---

**报告生成时间**: 2026-03-08 17:30 GMT+1  
**系统状态**: ✅ 监控告警系统已完善，确保系统稳定！

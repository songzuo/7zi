# 7zi 监控系统实现总结 v1.9.1

## 项目概述

为 7zi 平台 v1.9.1 版本实现了完整的监控和告警系统，包括基础设施监控、应用监控、告警系统和可视化仪表盘。

## 实现内容

### 1. 基础设施监控

#### 监控组件
- **Prometheus** (v2.48.0) - 指标收集和存储
- **Grafana** (v10.2.2) - 可视化仪表盘
- **AlertManager** (v0.26.0) - 告警管理
- **Loki** (v2.9.3) - 日志聚合
- **Promtail** (v2.9.3) - 日志收集
- **Node Exporter** (v1.7.0) - 系统指标采集
- **cAdvisor** (v0.47.2) - Docker 容器监控
- **Pushgateway** (v1.6.1) - 短时任务指标

#### 监控指标

**系统指标:**
- CPU 使用率 (单核/多核)
- 内存使用率 (总量/堆内存)
- 磁盘使用率 (各挂载点)
- 系统负载 (1m/5m/15m)
- 网络流量 (入站/出站)
- 网络错误率
- 磁盘 I/O (读/写)
- 文件描述符使用

**容器指标:**
- 容器 CPU 使用率
- 容器内存使用
- 容器网络流量
- 容器磁盘 I/O
- 容器重启次数
- 容器状态

### 2. 应用监控

#### API 监控
- HTTP 请求总数 (按方法/路径/状态码)
- HTTP 请求持续时间 (P50/P95/P99)
- HTTP 请求/响应大小
- API 错误率 (4xx/5xx)
- API QPS (每秒请求数)

#### 子代理监控
- 子代理执行次数 (成功/失败)
- 子代理执行时间 (P50/P95/P99)
- 子代理队列大小
- 子代理错误率

#### 数据库监控
- 数据库连接池使用率
- 数据库查询时间
- 慢查询计数
- 查询类型分布

#### 缓存监控
- 缓存命中率
- 缓存大小
- 缓存命中/未命中计数

#### WebSocket 监控
- 活跃连接数
- 消息计数 (入站/出站)
- 消息类型分布

### 3. 告警系统

#### 告警规则 (共 30+ 条规则)

**系统告警:**
- CPU 使用率 > 80% (警告) / > 95% (严重)
- 内存使用率 > 80% (警告) / > 95% (严重)
- 磁盘使用率 > 80% (警告) / > 95% (严重)
- 系统负载 > 2x CPU 核心数
- 网络流量 > 100 MB/s
- 网络错误率 > 10/s

**容器告警:**
- 容器 CPU 使用率 > 80%
- 容器内存使用率 > 80%
- 容器重启次数 > 3/小时
- 容器未运行 > 60s

**应用告警:**
- API 响应时间 P95 > 1s (警告) / > 3s (严重)
- API 错误率 > 5% (警告) / > 10% (严重)
- API QPS < 1 (过低) / > 1000 (过高)

**子代理告警:**
- 子代理执行时间 P95 > 30s
- 子代理错误率 > 5%
- 子代理队列积压 > 100

**可用性告警:**
- 服务宕机 (up == 0)
- Prometheus 抓取失败

**数据库告警:**
- 数据库连接池使用率 > 80%
- 慢查询 > 10/5分钟

#### 告警路由

```
严重告警 (critical) → critical-receiver → 邮件 + Slack + Telegram (紧急)
系统告警 (system) → system-receiver → 邮件 + Slack
应用告警 (application) → app-receiver → 邮件 + Slack
子代理告警 (subagent) → app-receiver → 邮件 + Slack
```

#### 告警抑制

- 严重告警抑制警告告警
- 服务宕机时抑制相关告警
- 容器宕机时抑制容器相关告警

#### 告警通知渠道

- **邮件**: SMTP (Gmail)
- **Slack**: Webhook
- **Telegram**: Bot API

### 4. 仪表盘

#### Grafana 仪表盘 (2 个)

**主仪表盘** (`7zi-main-dashboard.json`):
- 系统概览 (CPU/内存/磁盘/负载/状态)
- CPU 使用率趋势
- 内存使用率趋势
- 网络流量监控
- 磁盘 I/O 监控
- 容器 CPU/内存使用
- API QPS
- API 响应时间 (P50/P95/P99)
- HTTP 状态码分布

**子代理仪表盘** (`7zi-subagent-dashboard.json`):
- 子代理执行概览 (成功/失败/队列/P95)
- 子代理执行速率
- 执行时间分布
- 子代理成功率
- 队列大小

### 5. 日志收集

#### Loki 配置
- 数据保留: 31 天
- 索引周期: 24 小时
- 存储后端: 文件系统
- 压缩: 启用

#### Promtail 配置
- Docker 容器日志
- 系统日志 (/var/log/syslog)
- 应用日志 (/var/log/7zi/*.log)
- Nginx 访问日志
- Nginx 错误日志
- OpenClaw 日志

#### 日志解析
- JSON 格式解析
- 正则表达式提取
- 标签自动添加

### 6. 应用集成

#### Metrics Exporter (TypeScript)

文件: `monitoring/scripts/metrics-exporter.ts`

**导出指标:**
- 系统指标 (CPU/内存/堆)
- HTTP 指标 (请求/响应/持续时间)
- API 指标 (QPS/错误率/响应时间)
- 子代理指标 (执行/队列/错误)
- 数据库指标 (连接池/查询时间)
- 缓存指标 (命中率/大小)
- WebSocket 指标 (连接/消息)

**使用示例:**
```typescript
import { recordHttpRequest, recordSubagentExecution } from '@/lib/monitoring/metrics-exporter'

// 记录 HTTP 请求
recordHttpRequest('GET', '/api/users', 200, 150)

// 记录子代理执行
recordSubagentExecution('consultant', 'success', 5000)
```

## 文件结构

```
monitoring/
├── docker-compose.yml              # Docker Compose 配置
├── .env                            # 环境变量 (需手动配置)
├── README.md                       # 部署文档
├── IMPLEMENTATION_SUMMARY.md       # 实现总结 (本文件)
├── prometheus/
│   ├── prometheus.yml              # Prometheus 配置
│   └── rules/
│       └── alert_rules.yml         # 告警规则
├── alertmanager/
│   └── alertmanager.yml            # AlertManager 配置
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml     # 数据源配置
│   │   └── dashboards/
│   │       └── dashboards.yml      # 仪表盘配置
│   └── dashboards/
│       ├── 7zi-main-dashboard.json         # 主仪表盘
│       └── 7zi-subagent-dashboard.json     # 子代理仪表盘
├── loki/
│   └── loki-config.yaml            # Loki 配置
├── promtail/
│   └── promtail-config.yaml        # Promtail 配置
└── scripts/
    ├── deploy.sh                   # 部署脚本
    ├── health-check.sh             # 健康检查脚本
    └── metrics-exporter.ts         # Metrics 导出器
```

## 部署步骤

### 1. 快速部署

```bash
cd /root/.openclaw/workspace/monitoring
chmod +x scripts/deploy.sh
./scripts/deploy.sh deploy
```

### 2. 配置告警通知

编辑 `.env` 文件:

```bash
SMTP_PASSWORD=your_smtp_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. 访问界面

- **Grafana**: http://localhost:3001 (admin/7zi_monitor_2026)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **cAdvisor**: http://localhost:8080

### 4. 健康检查

```bash
./scripts/health-check.sh
```

## 技术特性

### 高可用性
- 所有服务自动重启
- 健康检查机制
- 数据持久化

### 可扩展性
- 支持添加更多监控目标
- 支持自定义告警规则
- 支持自定义仪表盘

### 性能优化
- Prometheus 数据保留 30 天
- Loki 数据保留 31 天
- 指标采样率可配置
- 日志压缩存储

### 安全性
- 网络隔离 (Docker 网络)
- 访问控制 (Grafana 认证)
- 告警加密传输

## 监控覆盖范围

### 已覆盖
- ✅ 服务器 CPU/内存/磁盘
- ✅ 网络流量和连接数
- ✅ Docker 容器状态
- ✅ API 响应时间和 QPS
- ✅ 错误率和异常追踪
- ✅ 子代理执行状态
- ✅ 数据库连接池
- ✅ 缓存命中率
- ✅ WebSocket 连接
- ✅ 系统日志

### 待扩展
- ⏳ 分布式追踪 (Jaeger/Zipkin)
- ⏳ APM 集成 (Sentry/New Relic)
- ⏳ 业务指标 (用户活跃度/转化率)
- ⏳ 链路追踪 (OpenTelemetry)

## 维护建议

### 日常维护
1. 每日检查告警状态
2. 每周检查磁盘空间
3. 每月检查日志保留策略
4. 定期更新监控组件版本

### 备份策略
- Prometheus 数据: 每周备份
- Grafana 配置: 每周备份
- 告警规则: 版本控制

### 扩容建议
- 监控目标 > 100: 考虑分片
- 数据保留 > 90 天: 使用远程存储
- 高并发场景: 使用 Thanos/VictoriaMetrics

## 性能指标

### 资源占用
- Prometheus: ~2GB 内存
- Grafana: ~1GB 内存
- Loki: ~1GB 内存
- 其他组件: ~500MB 内存
- 总计: ~4.5GB 内存

### 数据保留
- Prometheus: 30 天 / 10GB
- Loki: 31 天 / 5GB
- 总计: ~15GB 磁盘空间

### 延迟
- 指标采集: 15 秒
- 告警触发: 30 秒
- 仪表盘刷新: 30 秒

## 故障排除

### 常见问题

1. **Prometheus 无法抓取目标**
   - 检查网络连通性
   - 检查目标服务状态
   - 检查防火墙规则

2. **Grafana 无法连接数据源**
   - 检查数据源配置
   - 检查 Prometheus 状态
   - 检查网络连接

3. **告警未发送**
   - 检查 AlertManager 配置
   - 检查通知渠道配置
   - 检查告警规则状态

### 日志查看

```bash
# 查看所有服务日志
./scripts/deploy.sh logs

# 查看特定服务日志
./scripts/deploy.sh logs prometheus
```

## 总结

成功实现了完整的监控和告警系统，包括：

- ✅ **8 个监控组件** (Prometheus/Grafana/AlertManager/Loki/Promtail/Node Exporter/cAdvisor/Pushgateway)
- ✅ **30+ 条告警规则** (系统/容器/应用/子代理/可用性/数据库)
- ✅ **2 个 Grafana 仪表盘** (主仪表盘/子代理仪表盘)
- ✅ **多渠道告警通知** (邮件/Slack/Telegram)
- ✅ **完整的日志收集** (Docker/系统/应用/Nginx/OpenClaw)
- ✅ **应用集成方案** (Metrics Exporter)
- ✅ **自动化部署脚本** (deploy.sh)
- ✅ **健康检查脚本** (health-check.sh)
- ✅ **详细的部署文档** (README.md)

系统已准备好投入使用，可以立即部署到生产环境。

---

**版本**: 1.9.1  
**更新日期**: 2026-04-03  
**维护者**: 7zi DevOps Team
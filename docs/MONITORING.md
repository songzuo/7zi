# 监控和日志系统

**最后更新**: 2026-03-06  
**状态**: ✅ 运行中  
**监控范围**: 服务器、应用、API、数据库

---

## 📋 目录

1. [概述](#概述)
2. [监控指标](#监控指标)
3. [告警配置](#告警配置)
4. [日志系统](#日志系统)
5. [仪表板](#仪表板)
6. [故障排查](#故障排查)

---

## 概述

7zi Studio 监控系统覆盖：

- ✅ 服务器资源 (CPU、内存、磁盘、网络)
- ✅ 应用性能 (响应时间、错误率、吞吐量)
- ✅ API 健康 (可用性、延迟、状态码)
- ✅ 数据库 (连接数、查询性能、慢查询)
- ✅ 业务指标 (用户数、订单量、转化率)

### 监控架构

```
┌─────────────┐
│  数据收集   │
│  (Agent)    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  数据处理   │
│  (Pipeline) │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  数据存储   │
│  (TSDB)     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  可视化     │
│  (Dashboard)│
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  告警通知   │
│  (Alert)    │
└─────────────┘
```

---

## 监控指标

### 服务器指标

| 指标 | 说明 | 阈值 | 告警级别 |
|------|------|------|---------|
| CPU 使用率 | 处理器使用百分比 | >80% | ⚠️ 警告 |
| CPU 使用率 | 处理器使用百分比 | >95% | 🔴 严重 |
| 内存使用率 | RAM 使用百分比 | >85% | ⚠️ 警告 |
| 内存使用率 | RAM 使用百分比 | >95% | 🔴 严重 |
| 磁盘使用率 | 存储空间使用百分比 | >80% | ⚠️ 警告 |
| 磁盘使用率 | 存储空间使用百分比 | >90% | 🔴 严重 |
| 网络流入 | 入站流量 (Mbps) | - | 📊 监控 |
| 网络流出 | 出站流量 (Mbps) | - | 📊 监控 |
| 系统负载 | 1 分钟平均负载 | >核心数×2 | ⚠️ 警告 |

### 应用指标

| 指标 | 说明 | 阈值 | 告警级别 |
|------|------|------|---------|
| 响应时间 | P95 响应时间 (ms) | >500ms | ⚠️ 警告 |
| 响应时间 | P95 响应时间 (ms) | >2000ms | 🔴 严重 |
| 错误率 | HTTP 5xx 错误百分比 | >1% | ⚠️ 警告 |
| 错误率 | HTTP 5xx 错误百分比 | >5% | 🔴 严重 |
| QPS | 每秒请求数 | - | 📊 监控 |
| 活跃连接 | 当前活跃连接数 | >1000 | ⚠️ 警告 |

### API 指标

| 指标 | 说明 | 阈值 | 告警级别 |
|------|------|------|---------|
| 可用性 | API 可用百分比 | <99.9% | ⚠️ 警告 |
| 可用性 | API 可用百分比 | <99% | 🔴 严重 |
| P50 延迟 | 中位数延迟 (ms) | >200ms | ⚠️ 警告 |
| P99 延迟 | 99 百分位延迟 (ms) | >1000ms | ⚠️ 警告 |

### 数据库指标

| 指标 | 说明 | 阈值 | 告警级别 |
|------|------|------|---------|
| 连接数 | 当前连接数 | >80% 上限 | ⚠️ 警告 |
| 慢查询 | >1s 的查询数 | >10/分钟 | ⚠️ 警告 |
| 锁等待 | 锁等待时间 | >100ms | ⚠️ 警告 |
| 复制延迟 | 主从复制延迟 (秒) | >30s | ⚠️ 警告 |

---

## 告警配置

### 告警级别

| 级别 | 颜色 | 响应时间 | 通知方式 |
|------|------|---------|---------|
| 🔴 严重 | 红色 | 立即 | Telegram + 电话 |
| ⚠️ 警告 | 黄色 | 30 分钟内 | Telegram |
| 📊 信息 | 蓝色 | 工作时间 | 邮件/日报 |

### 告警规则

```yaml
# alerting-rules.yml
groups:
  - name: server-alerts
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage > 0.95
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CPU 使用率过高"
          description: "{{ $labels.instance }} CPU 使用率 {{ $value | humanizePercentage }}"

      - alert: HighMemoryUsage
        expr: memory_usage > 0.95
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "内存使用率过高"
          description: "{{ $labels.instance }} 内存使用率 {{ $value | humanizePercentage }}"

      - alert: HighDiskUsage
        expr: disk_usage > 0.90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "磁盘空间不足"
          description: "{{ $labels.instance }} 磁盘使用率 {{ $value | humanizePercentage }}"

  - name: application-alerts
    rules:
      - alert: HighErrorRate
        expr: http_errors_total / http_requests_total > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "错误率过高"
          description: "错误率 {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: http_request_duration_seconds_p95 > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "响应时间过长"
          description: "P95 延迟 {{ $value }}s"
```

### 通知配置

```yaml
# notification-config.yml
receivers:
  - name: telegram-critical
    telegram_configs:
      - bot_token: "${TELEGRAM_BOT_TOKEN}"
        chat_id: "${TELEGRAM_CHANNEL_ID}"
        message: |
          🔴 严重告警

          告警：{{ .GroupLabels.alertname }}
          实例：{{ .CommonLabels.instance }}
          时间：{{ .StartsAt.Format "2006-01-02 15:04:05" }}
          描述：{{ .CommonAnnotations.description }}

  - name: telegram-warning
    telegram_configs:
      - bot_token: "${TELEGRAM_BOT_TOKEN}"
        chat_id: "${TELEGRAM_CHANNEL_ID}"
        message: |
          ⚠️ 警告

          告警：{{ .GroupLabels.alertname }}
          实例：{{ .CommonLabels.instance }}
          时间：{{ .StartsAt.Format "2006-01-02 15:04:05" }}

route:
  receiver: telegram-warning
  routes:
    - match:
        severity: critical
      receiver: telegram-critical
    - match:
        severity: warning
      receiver: telegram-warning
```

---

## 日志系统

### 日志级别

| 级别 | 说明 | 示例 |
|------|------|------|
| ERROR | 错误，需要立即处理 | 数据库连接失败 |
| WARN | 警告，可能有问题 | 重试次数过多 |
| INFO | 信息，正常操作 | 用户登录成功 |
| DEBUG | 调试，详细信息 | SQL 查询语句 |

### 日志格式

```json
{
  "timestamp": "2026-03-06T10:30:00.000Z",
  "level": "ERROR",
  "service": "api-gateway",
  "message": "Database connection failed",
  "context": {
    "userId": "12345",
    "requestId": "abc-123",
    "error": "Connection timeout"
  },
  "trace": {
    "traceId": "trace-xyz",
    "spanId": "span-123"
  }
}
```

### 日志收集

```typescript
// 结构化日志
import { logger } from './logger';

logger.info('User logged in', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

logger.error('Payment failed', {
  userId: user.id,
  amount: order.total,
  error: error.message,
  stack: error.stack
});
```

### 日志存储

```
/logs/
├── application/
│   ├── 2026-03-06.log
│   ├── 2026-03-06.error.log
│   └── ...
├── access/
│   ├── 2026-03-06.log
│   └── ...
└── system/
    ├── syslog
    └── ...
```

### 日志查询

```bash
# 查看错误日志
tail -f /logs/application/2026-03-06.error.log

# 搜索特定用户日志
grep "userId=12345" /logs/application/*.log

# 统计错误数量
grep -c "ERROR" /logs/application/2026-03-06.log

# 使用 jq 分析 JSON 日志
cat /logs/application/*.log | jq 'select(.level == "ERROR")'
```

---

## 仪表板

### 服务器监控仪表板

```
┌─────────────────────────────────────────────────────┐
│  服务器监控 - 7zi.com                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CPU 使用率          内存使用率                      │
│  ████████░░ 78%      █████████░ 85%                │
│                                                     │
│  磁盘使用率          网络流量                        │
│  ██████░░░░ 62%      ↑120 Mbps ↓45 Mbps           │
│                                                     │
│  系统负载：2.5, 2.8, 3.1                           │
│  运行时间：15 天 6 小时 23 分钟                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 应用性能仪表板

```
┌─────────────────────────────────────────────────────┐
│  应用性能监控                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  QPS: 1,234                                         │
│  响应时间 (P95): 156ms                             │
│  错误率：0.23%                                      │
│  活跃连接：456                                      │
│                                                     │
│  请求量趋势 (24h)                                   │
│  ████▁▁████████▁▁███████▁▁█████████               │
│                                                     │
│  Top 慢接口:                                        │
│  1. POST /api/orders - 890ms                       │
│  2. GET /api/products - 456ms                      │
│  3. POST /api/payment - 234ms                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 业务指标仪表板

```
┌─────────────────────────────────────────────────────┐
│  业务指标监控                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  今日数据 (vs 昨日)                                 │
│  新增用户：+123 (+15%)                             │
│  订单数：456 (+8%)                                 │
│  销售额：¥78,900 (+12%)                            │
│  转化率：3.2% (+0.5%)                              │
│                                                     │
│  本周趋势                                           │
│  ████████▁▁████████████▁▁███████████              │
│                                                     │
│  用户来源:                                          │
│  搜索引擎：45%                                      │
│  社交媒体：30%                                      │
│  直接访问：15%                                      │
│  其他：10%                                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 故障排查

### 常见问题排查流程

#### 1. 网站无法访问

```
1. 检查服务器状态
   $ ping 7zi.com
   $ curl -I https://7zi.com

2. 检查服务运行
   $ systemctl status nginx
   $ systemctl status node

3. 查看错误日志
   $ tail -f /var/log/nginx/error.log
   $ tail -f /logs/application/error.log

4. 检查资源使用
   $ top
   $ df -h
   $ free -m

5. 检查网络连接
   $ netstat -tlnp
   $ ss -tlnp
```

#### 2. API 响应慢

```
1. 检查 API 延迟
   $ curl -w "@curl-format.txt" https://7zi.com/api/health

2. 查看慢查询日志
   $ grep "duration>1000" /logs/database/slow-query.log

3. 检查数据库连接
   $ psql -c "SELECT count(*) FROM pg_stat_activity"

4. 分析性能瓶颈
   - CPU 使用率
   - 内存使用率
   - 磁盘 IO
   - 网络带宽
```

#### 3. 数据库连接失败

```
1. 检查数据库服务
   $ systemctl status postgresql

2. 检查连接数
   $ psql -c "SELECT count(*) FROM pg_stat_activity"

3. 查看数据库日志
   $ tail -f /var/log/postgresql/postgresql.log

4. 检查磁盘空间
   $ df -h /var/lib/postgresql

5. 重启数据库 (谨慎)
   $ systemctl restart postgresql
```

### 故障排查清单

```
□ 1. 确认问题现象
□ 2. 检查监控仪表板
□ 3. 查看相关日志
□ 4. 检查资源使用
□ 5. 检查网络连接
□ 6. 检查服务状态
□ 7. 查看最近的变更
□ 8. 尝试复现问题
□ 9. 制定解决方案
□ 10. 实施并验证
```

---

## 最佳实践

### 1. 监控覆盖

```
✅ 好的做法:
- 关键指标全覆盖
- 设置合理阈值
- 分级告警
- 定期审查告警规则

❌ 不好的做法:
- 只监控部分指标
- 阈值过高或过低
- 告警疲劳
- 从不更新规则
```

### 2. 日志规范

```
✅ 好的做法:
- 结构化日志 (JSON)
- 包含上下文信息
- 统一的日志级别
- 敏感信息脱敏

❌ 不好的做法:
- 纯文本日志
- 缺少关键信息
- 日志级别混乱
- 明文记录密码
```

### 3. 告警优化

```
✅ 好的做法:
- 告警有明确含义
- 包含处理建议
- 避免告警风暴
- 定期清理无效告警

❌ 不好的做法:
- 告警信息模糊
- 只有问题没有方案
- 频繁误报
- 告警堆积
```

---

## 参考资源

- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)
- [ELK Stack](https://www.elastic.co/elk-stack)
- [OpenClaw 监控技能](../skills/monitoring/SKILL.md)

---

*本系统由 7zi Studio AI 团队维护*

# 7zi 监控系统配置指南

## 监控架构

```
┌─────────────────────────────────────────────────────────────┐
│                    7zi 监控系统架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Node       │    │  Prometheus  │    │ Alertmanager │  │
│  │  Exporter    │───▶│    Server    │───▶│              │  │
│  │  (9110)      │    │    (9090)    │    │    (9093)    │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│                                                  │          │
│                                                  ▼          │
│                                         ┌──────────────┐   │
│                                         │   Webhook    │   │
│                                         │  Receiver    │   │
│                                         │   (5001)     │   │
│                                         └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 服务状态

| 服务 | 端口 | 状态 | 说明 |
|------|------|------|------|
| Prometheus | 9090 | ✅ 运行中 | 监控数据存储和查询 |
| Node Exporter | 9110 | ✅ 运行中 | 系统指标采集 |
| Alertmanager | 9093 | ✅ 运行中 | 告警管理和路由 |
| Webhook Receiver | 5001 | ✅ 运行中 | 告警通知接收器 |

## 访问地址

- **Prometheus UI**: http://localhost:9090
- **Alertmanager UI**: http://localhost:9093
- **Node Exporter Metrics**: http://localhost:9110/metrics
- **Webhook Health**: http://localhost:5001/

## 告警规则

### Node 级别告警 (`/etc/prometheus/rules/node_alerts.yml`)

| 告警名称 | 阈值 | 持续时间 | 严重级别 |
|----------|------|----------|----------|
| HighCPUUsage | CPU > 80% | 5 分钟 | warning |
| HighMemoryUsage | 内存 > 85% | 5 分钟 | warning |
| HighDiskUsage | 磁盘 < 15% | 5 分钟 | warning |
| NodeDown | 节点宕机 | 1 分钟 | critical |
| HighLoadAverage | 负载 > 0.8 | 5 分钟 | warning |
| HighNetworkConnections | TCP > 1000 | 5 分钟 | info |

### 系统高级告警 (`/etc/prometheus/rules/system_alerts.yml`)

| 告警名称 | 条件 | 严重级别 |
|----------|------|----------|
| ServiceFailed | systemd 服务失败 | critical |
| FilesystemReadOnly | 文件系统只读 | critical |
| HighSwapUsage | SWAP > 80% | warning |
| TCPConnectionsNearLimit | TCP > 50000 | critical |
| HighDiskIOWait | I/O wait > 20% | warning |
| ClockSkew | 时间偏移 > 30s | warning |
| PrometheusConfigReloadFailed | 配置重载失败 | warning |
| PrometheusTSDBCompactionsFailing | TSDB 压缩失败 | warning |

## 告警通知渠道

### 配置位置
`/etc/prometheus/alertmanager.yml`

### 通知路由

```yaml
severity: critical → critical-receiver → Slack + Email + SMS
severity: warning  → warning-receiver  → Slack + Email
severity: info     → info-receiver     → Slack
```

### 接收器配置

| 接收器 | 通知方式 | 接收人 |
|--------|----------|--------|
| critical-receiver | Webhook + Email | admin@7zi.studio |
| warning-receiver | Webhook + Email | dev@7zi.studio |
| info-receiver | Webhook + Email | dev@7zi.studio |

## 日志文件

- **Webhook 日志**: `/var/log/alertmanager/webhook.log`
- **Prometheus 日志**: `journalctl -u prometheus`
- **Alertmanager 日志**: `journalctl -u alertmanager`
- **Node Exporter 日志**: `journalctl -u node_exporter`

## 常用命令

### 查看服务状态
```bash
systemctl status prometheus
systemctl status alertmanager
systemctl status node_exporter
systemctl status 7zi-alert-webhook
```

### 查看告警
```bash
# 当前活跃告警
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts'

# 告警规则
curl -s http://localhost:9090/api/v1/rules | jq '.data.groups'
```

### 测试告警
```bash
# 发送测试告警
curl -X POST -H "Content-Type: application/json" \
  -d '{"alerts":[{"labels":{"alertname":"TestAlert","severity":"warning"},"annotations":{"summary":"Test"}}]}' \
  http://localhost:5001/webhook/test
```

### 重新加载配置
```bash
# Prometheus 配置检查
promtool check config /etc/prometheus/prometheus.yml

# 重新加载 Prometheus
kill -HUP $(pidof prometheus)

# 重启 Alertmanager
systemctl restart alertmanager
```

## 维护任务

### 每日检查
- [ ] 检查 Prometheus 目标状态
- [ ] 查看是否有持续告警
- [ ] 检查磁盘空间使用

### 每周检查
- [ ] 审查告警规则有效性
- [ ] 清理过期告警日志
- [ ] 更新监控文档

### 每月检查
- [ ] 评估告警噪音
- [ ] 优化告警阈值
- [ ] 审查通知渠道

## 故障排除

### Prometheus 无法抓取目标
```bash
# 检查目标状态
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# 检查网络连接
curl -v http://localhost:9110/metrics
```

### 告警未发送
```bash
# 检查 Alertmanager 状态
curl -s http://localhost:9093/api/v2/status | jq

# 查看 Alertmanager 日志
journalctl -u alertmanager -n 50
```

### Webhook 未收到通知
```bash
# 检查 Webhook 服务
systemctl status 7zi-alert-webhook

# 查看 Webhook 日志
tail -f /var/log/alertmanager/webhook.log
```

## 扩展监控

### 添加新的抓取目标
编辑 `/etc/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: '7zi-app'
    static_configs:
      - targets: ['localhost:3000']
```

### 添加新的告警规则
在 `/etc/prometheus/rules/` 创建新的 `.yml` 文件:

```yaml
groups:
- name: application_rules
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High error rate detected"
```

## SLA 目标

| 指标 | 目标值 | 测量周期 |
|------|--------|----------|
| 可用性 | 99.9% | 30 天 |
| P50 响应时间 | < 200ms | 实时 |
| P95 响应时间 | < 500ms | 实时 |
| P99 响应时间 | < 1000ms | 实时 |
| 错误率 | < 0.1% | 实时 |
| MTTR (P0) | < 15 分钟 | 每次事件 |

---

*最后更新：2026-03-08*
*维护团队：7zi DevOps*

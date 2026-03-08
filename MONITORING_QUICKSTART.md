# 监控告警系统快速参考

## 🚀 快速启动

```bash
# 1. 配置环境变量
cd monitoring
cp .env.example .env
# 编辑 .env 填入实际配置

# 2. 启动监控栈
./scripts/deploy-monitoring.sh

# 或手动启动
docker-compose up -d
```

## 🌐 服务访问

| 服务 | URL | 说明 |
|------|-----|------|
| Prometheus | http://localhost:9090 | 指标查询 |
| Grafana | http://localhost:3001 | 仪表盘 (admin/admin123) |
| Alertmanager | http://localhost:9093 | 告警管理 |
| Node Exporter | http://localhost:9100 | 系统指标 |
| cAdvisor | http://localhost:8080 | 容器指标 |

## 📊 PromQL 常用查询

```promql
# 请求速率
sum(rate(http_requests_total[5m]))

# 错误率
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# P95 响应时间
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# 内存使用率
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes

# CPU 使用率
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 磁盘使用率
(node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100
```

## 🔔 告警级别

| 级别 | 颜色 | 响应时间 | 通知渠道 |
|------|------|----------|----------|
| P0 - Critical | 🔴 红色 | 5 分钟 | Slack + Email + SMS |
| P1 - High | 🟠 橙色 | 15 分钟 | Slack + Email |
| P2 - Warning | 🟡 黄色 | 1 小时 | Slack |
| P3 - Info | 🔵 蓝色 | 24 小时 | Email |

## 🛠️ 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f prometheus
docker-compose logs -f alertmanager
docker-compose logs -f grafana

# 重启服务
docker-compose restart prometheus

# 停止监控栈
docker-compose down

# 清理数据 (谨慎使用!)
docker-compose down -v

# 备份 Prometheus 数据
docker-compose stop prometheus
tar -czf prometheus-backup.tar.gz prometheus_data/
docker-compose start prometheus
```

## 📱 通知配置

### Slack Webhook
1. 访问 https://api.slack.com/apps
2. 创建新 App
3. 添加 Incoming Webhooks
4. 复制 Webhook URL 到 .env

### SendGrid Email
1. 访问 https://app.sendgrid.com
2. 创建 API Key
3. 复制 API Key 到 .env

## 🔍 故障排查

### Prometheus 不工作
```bash
# 检查配置
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# 查看目标状态
curl http://localhost:9090/api/v1/targets

# 查看规则状态
curl http://localhost:9090/api/v1/rules
```

### 告警不发送
```bash
# 检查 Alertmanager 状态
curl http://localhost:9093/api/v2/status

# 查看活跃告警
curl http://localhost:9093/api/v2/alerts

# 查看告警历史
curl http://localhost:9093/api/v2/alerts?silenced=false&inhibited=false
```

### Grafana 无法连接 Prometheus
```bash
# 检查网络
docker network ls
docker network inspect monitoring

# 测试连接
docker-compose exec grafana wget -qO- http://prometheus:9090/-/healthy
```

## 📈 SLA 目标

| 指标 | 目标 |
|------|------|
| 可用性 | 99.9% |
| 错误率 | <0.1% |
| P50 响应时间 | <200ms |
| P95 响应时间 | <500ms |
| P99 响应时间 | <1000ms |
| MTTR (P0) | <15 分钟 |

## 📁 重要文件

```
monitoring/
├── prometheus/prometheus.yml      # 主配置
├── prometheus/rules/alerts.yml    # 告警规则
├── alertmanager/alertmanager.yml  # 告警路由
├── grafana/dashboards/            # 仪表盘
└── .env                           # 环境变量
```

## 🔗 相关文档

- [监控设计文档](./docs/MONITORING_DESIGN.md)
- [告警规则配置](./docs/ALERT_RULES.yaml)
- [运维手册](./docs/OPERATIONS_MANUAL.md)
- [实施报告](./docs/MONITORING_IMPLEMENTATION_REPORT.md)

---

*最后更新：2026-03-08*

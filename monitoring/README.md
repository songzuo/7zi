# 7zi 监控系统部署文档 v1.9.1

## 概述

本文档描述了 7zi 平台监控系统的完整部署流程，包括：
- Prometheus (指标收集)
- Grafana (可视化仪表盘)
- AlertManager (告警管理)
- Loki + Promtail (日志收集)
- Node Exporter (系统指标)
- cAdvisor (容器监控)

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        监控架构                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Node        │    │ cAdvisor    │    │ 应用指标    │         │
│  │ Exporter    │    │             │    │ /api/metrics│         │
│  │ (9100)      │    │ (8080)      │    │ (3000)      │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                 │
│                           │                                    │
│                           ▼                                    │
│                  ┌─────────────────┐                           │
│                  │   Prometheus    │                           │
│                  │    (9090)       │                           │
│                  └────────┬────────┘                           │
│                           │                                    │
│         ┌─────────────────┼─────────────────┐                  │
│         │                 │                 │                  │
│         ▼                 ▼                 ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ AlertManager│  │   Grafana   │  │    Loki     │            │
│  │   (9093)    │  │   (3001)    │  │   (3100)    │            │
│  └─────────────┘  └─────────────┘  └──────┬──────┘            │
│                                           │                    │
│                                  ┌────────┴────────┐           │
│                                  │   Promtail      │           │
│                                  │   (日志采集)     │           │
│                                  └─────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 前置要求

### 系统要求

- Docker 20.10+
- Docker Compose 1.29+
- 至少 4GB 可用内存
- 至少 20GB 可用磁盘空间

### 端口要求

| 服务 | 端口 | 说明 |
|------|------|------|
| Prometheus | 9090 | 指标查询界面 |
| Grafana | 3001 | 仪表盘界面 |
| AlertManager | 9093 | 告警管理界面 |
| Loki | 3100 | 日志查询 API |
| Node Exporter | 9100 | 系统指标端点 |
| cAdvisor | 8080 | 容器监控界面 |
| Pushgateway | 9091 | 短时任务指标 |

## 快速部署

### 1. 部署监控栈

```bash
# 进入监控目录
cd /root/.openclaw/workspace/monitoring

# 添加执行权限
chmod +x scripts/deploy.sh

# 执行部署
./scripts/deploy.sh deploy
```

### 2. 验证服务

```bash
# 检查服务状态
./scripts/deploy.sh status

# 查看日志
./scripts/deploy.sh logs prometheus
```

### 3. 访问界面

- **Grafana**: http://localhost:3001
  - 用户名: `admin`
  - 密码: `7zi_monitor_2026`
  
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093
- **cAdvisor**: http://localhost:8080

## 配置说明

### Prometheus 配置

配置文件: `monitoring/prometheus/prometheus.yml`

#### 添加监控目标

```yaml
scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8080']
        labels:
          service: 'my-service'
```

#### 配置远程服务器监控

```yaml
scrape_configs:
  - job_name: 'remote-server'
    static_configs:
      - targets: ['165.99.43.61:9100']
        labels:
          instance: 'production'
          role: 'web'
```

### AlertManager 配置

配置文件: `monitoring/alertmanager/alertmanager.yml`

#### 配置邮件告警

编辑环境变量文件 `.env`:

```bash
SMTP_PASSWORD=your_email_password
```

#### 配置 Telegram 告警

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

#### 配置 Slack 告警

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

### 告警规则

告警规则文件: `monitoring/prometheus/rules/alert_rules.yml`

#### 告警阈值说明

| 告警类型 | 警告阈值 | 严重阈值 | 持续时间 |
|---------|---------|---------|---------|
| CPU 使用率 | 80% | 95% | 5分钟 / 2分钟 |
| 内存使用率 | 80% | 95% | 5分钟 / 2分钟 |
| 磁盘使用率 | 80% | 95% | 5分钟 / 2分钟 |
| API 错误率 | 5% | 10% | 5分钟 / 2分钟 |
| API 响应时间 | 1s | 3s | 5分钟 / 2分钟 |

#### 添加自定义告警规则

```yaml
groups:
  - name: custom_alerts
    rules:
      - alert: CustomAlert
        expr: my_custom_metric > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "自定义告警"
          description: "指标值: {{ $value }}"
```

### Grafana 仪表盘

仪表盘配置: `monitoring/grafana/dashboards/`

#### 导入自定义仪表盘

1. 访问 Grafana -> Dashboards -> Import
2. 上传 JSON 文件或粘贴 ID
3. 选择 Prometheus 数据源
4. 点击 Import

#### 创建告警面板

1. 编辑仪表盘面板
2. 切换到 Alert 标签
3. 配置告警条件
4. 设置通知渠道

## 应用集成

### Next.js 应用指标导出

1. 安装依赖:

```bash
npm install prom-client
```

2. 创建 API 路由:

```typescript
// app/api/metrics/route.ts
import { GET } from '@/lib/monitoring/metrics-exporter'
export { GET }
```

3. 记录指标:

```typescript
import { recordHttpRequest, recordApiRequest } from '@/lib/monitoring/metrics-exporter'

// 在中间件中记录
export function middleware(request: NextRequest) {
  const start = Date.now()
  // ... 处理请求
  const duration = Date.now() - start
  recordHttpRequest(request.method, request.nextUrl.pathname, 200, duration)
}
```

### 子代理监控

```typescript
import { recordSubagentExecution } from '@/lib/monitoring/metrics-exporter'

// 执行子代理
const start = Date.now()
try {
  await executeSubagent('consultant', task)
  recordSubagentExecution('consultant', 'success', Date.now() - start)
} catch (error) {
  recordSubagentExecution('consultant', 'failed', Date.now() - start)
}
```

## 远程服务器监控

### 在远程服务器安装 Node Exporter

```bash
# 下载
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz

# 解压
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
cd node_exporter-1.7.0.linux-amd64

# 启动
./node_exporter &

# 或使用 systemd
cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter
```

### 在 Prometheus 添加配置

```yaml
scrape_configs:
  - job_name: 'remote-node'
    static_configs:
      - targets: ['165.99.43.61:9100']
        labels:
          instance: 'production-server'
```

## 日志收集配置

### 应用日志格式

推荐使用 JSON 格式:

```json
{
  "timestamp": "2026-04-03T00:00:00Z",
  "level": "info",
  "message": "Request processed",
  "service": "api",
  "request_id": "abc123"
}
```

### Promtail 配置

编辑 `monitoring/promtail/promtail-config.yaml`:

```yaml
scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          __path__: /var/log/7zi/*.log
```

## 告警通知测试

### 测试邮件告警

```bash
curl -X POST http://localhost:9093/api/v2/alerts -H "Content-Type: application/json" -d '[
  {
    "labels": {"alertname": "TestAlert", "severity": "warning"},
    "annotations": {"summary": "测试告警"}
  }
]'
```

### 测试 Telegram 告警

```bash
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "text=测试告警消息"
```

## 维护操作

### 备份数据

```bash
# 备份 Prometheus 数据
docker exec 7zi-prometheus tar czf /tmp/prometheus-backup.tar.gz /prometheus
docker cp 7zi-prometheus:/tmp/prometheus-backup.tar.gz ./backups/

# 备份 Grafana 数据
docker exec 7zi-grafana tar czf /tmp/grafana-backup.tar.gz /var/lib/grafana
docker cp 7zi-grafana:/tmp/grafana-backup.tar.gz ./backups/
```

### 清理旧数据

```bash
# Prometheus 数据保留 30 天（配置中已设置）
# 手动清理
curl -X POST http://localhost:9090/api/v1/admin/tsdb/clean_tombstones

# Loki 数据保留 31 天（配置中已设置）
```

### 扩容建议

当监控目标增加时：

1. **增加 Prometheus 资源**:
   ```yaml
   services:
     prometheus:
       deploy:
         resources:
           limits:
             memory: 8G
   ```

2. **使用远程存储**:
   - Thanos
   - VictoriaMetrics
   - Cortex

3. **分片监控**:
   - 按服务分组
   - 多个 Prometheus 实例

## 故障排除

### Prometheus 无法抓取目标

```bash
# 检查目标状态
curl http://localhost:9090/api/v1/targets

# 检查网络连通性
docker exec 7zi-prometheus ping node-exporter
```

### Grafana 无法连接数据源

```bash
# 检查数据源配置
curl http://localhost:3001/api/datasources

# 测试 Prometheus 连接
curl http://localhost:9090/api/v1/query?query=up
```

### AlertManager 未发送告警

```bash
# 检查告警状态
curl http://localhost:9093/api/v2/alerts

# 检查 silences
curl http://localhost:9093/api/v2/silences
```

## 安全建议

1. **启用认证**:
   - Grafana: 配置 OAuth/LDAP
   - Prometheus: 启用 basic auth

2. **网络隔离**:
   - 使用内网暴露服务
   - 配置防火墙规则

3. **定期更新**:
   - 定期更新镜像版本
   - 关注安全公告

## 联系支持

- 文档更新: 2026-04-03
- 版本: 1.9.1
- 维护者: 7zi DevOps Team

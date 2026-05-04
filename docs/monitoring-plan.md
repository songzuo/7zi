# 服务器集群监控方案

**版本**: v1.0  
**日期**: 2026-05-03  
**状态**: 规划中

---

## 一、现状分析

### 1.1 服务器概览

| 服务器 | SSH状态 | 外网访问 | 备注 |
|--------|---------|---------|------|
| **7zi.com** | ❌ 关闭 | 需通过 Cloudflare | 主机名 `ecm-cd59`，可能在内网 |
| **bot5.szspd.cn** | ✅ 正常 | 直接访问 | 已部署 node_exporter |

### 1.2 bot5.szspd.cn 当前监控状态

- ✅ **node_exporter** 已安装并运行（端口 9100）
- ✅ **nginx** 已安装
- ❌ Prometheus 未安装
- ❌ Grafana 未安装
- ❌ alertmanager 未安装

```
系统资源:
- CPU: 1 核心
- 内存: 2GB (使用 1GB, 可用 670MB)
- 磁盘: 40GB (已使用 68%)
```

### 1.3 7zi.com 当前监控状态

- ❌ 无法直接 SSH（Cloudflare 代理层限制）
- 需通过 Cloudflare Tunnel 或其他方式访问

---

## 二、轻量级监控方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Grafana Dashboard                     │
│                   (展示 + 告警触发)                       │
└─────────────────────┬───────────────────────────────────┘
                      │ :3000
┌─────────────────────▼───────────────────────────────────┐
│              Prometheus Server (本机)                    │
│         端口: 9090 / 数据保留: 15天                       │
└───────┬─────────────────┬──────────────────┬────────────┘
        │ :9100          │ :8080            │ :9115
   ┌────▼────┐      ┌────▼────┐        ┌────▼─────┐
   │node_    │      │业务进程│        │nginx_    │
   │exporter │      │Metrics │        │exporter  │
   └─────────┘      └─────────┘        └──────────┘
        ▲               ▲
        │               │
   ┌────┴────────────────┴────┐
   │      两台服务器           │
   │  bot5  │  │  7zi.com    │
   └────────┴─────────────────┘
```

### 2.2 组件选型（轻量级）

| 组件 | 用途 | 推荐版本 | 资源占用 |
|------|------|---------|---------|
| **node_exporter** | 服务器资源监控 | v1.7.0 | ~50MB RAM |
| **Prometheus** | 指标收集存储 | v2.48 | ~200MB RAM |
| **Grafana** | 可视化面板 | v10.2 | ~100MB RAM |
| **blackbox_exporter** | 网站可用性监控 | v0.23.0 | ~30MB RAM |

**总资源占用**: ~400MB RAM（适合 2GB 小主机）

---

## 三、服务器资源监控

### 3.1 监控指标

| 指标 | 说明 | 采集方式 |
|------|------|---------|
| CPU 使用率 | 每核/总体 | node_exporter |
| 内存使用率 | used/available/cached | node_exporter |
| 磁盘空间 | 每个挂载点 | node_exporter |
| 磁盘 IO | read/write bytes | node_exporter |
| 网络流量 | 入/出带宽 | node_exporter |
| 进程数 | running/sleeping | node_exporter |
| 系统负载 | 1m/5m/15m | node_exporter |

### 3.2 告警阈值建议

```yaml
groups:
  - name: server_resources
    rules:
      - alert: HighCPU
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率超过 80%"

      - alert: HighMemory
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存可用率低于 20%"

      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "磁盘空间低于 20%"
```

---

## 四、网站可用性监控

### 4.1 监控方式

使用 **blackbox_exporter** 进行 HTTP/HTTPS 检查：

```yaml
modules:
  http_2xx:
    prober: http
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2"]
      valid_status_codes: [200, 201, 204]
      method: GET
      timeout: 5s
```

### 4.2 监控目标

| 网站 | URL | 检查内容 |
|------|-----|---------|
| 主站 | https://7zi.com | HTTP 200, 响应时间 < 2s |
| API | https://7zi.com/api/health | JSON 返回正常 |
| 测试站 | https://bot5.szspd.cn | HTTP 200 |

### 4.3 可用性告警

```yaml
  - alert: SiteDown
    expr: probe_success{job="http"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "网站无法访问"

  - alert: SlowResponse
    expr: probe_duration_seconds{job="http"} > 2
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "响应时间超过 2 秒"
```

---

## 五、日志收集方案

### 5.1 日志类型

| 日志 | 位置 | 重要性 | 保留时间 |
|------|------|--------|---------|
| nginx access | /var/log/nginx/access.log | 高 | 7天 |
| nginx error | /var/log/nginx/error.log | 高 | 30天 |
| 系统日志 | /var/log/syslog | 中 | 7天 |
| 应用日志 | /app/logs/*.log | 高 | 14天 |

### 5.2 日志收集架构

```
服务器 (Filebeat) ──→ Redis Queue ──→ Logstash ──→ Elasticsearch
                                    │
                                    └──→ Kibana (查看)
```

**轻量级替代方案** (资源受限情况):

```
服务器 (日志文件) ──→ 本机 grep/awk 分析 ──→ 告警
```

### 5.3 关键日志监控规则

```bash
# nginx 错误率监控
grep " 5[0-9][0-9] " /var/log/nginx/access.log | wc -l

# 错误关键字检测
tail -100 /var/log/nginx/error.log | grep -E "error|timeout|failed"
```

---

## 六、部署计划

### 6.1 第一阶段：修复 7zi.com SSH

由于 7zi.com SSH 被 Cloudflare 关闭，需要：

1. 在 Cloudflare Zero Trust 中添加 SSH 访问策略
2. 或通过 Cloudflare Tunnel 暴露 SSH
3. 或使用 Cloudflare Access 启用堡机模式

**推荐方案**: 使用 Cloudflare Tunnel + 验证码认证

### 6.2 第二阶段：部署监控组件到 bot5.szspd.cn

```bash
# 1. 安装 Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar xzf prometheus-*.linux-amd64.tar.gz
mv prometheus-*/prometheus /usr/local/bin/

# 2. 安装 Grafana
wget https://dl.grafana.com/oss/release/grafana-10.2.0.linux-amd64.tar.gz
tar xzf grafana-*.linux-amd64.tar.gz
mv grafana-*/bin/grafana-server /usr/local/bin/

# 3. 安装 blackbox_exporter
wget https://github.com/prometheus/blackbox_exporter/releases/download/v0.23.0/blackbox_exporter-0.23.0.linux-amd64.tar.gz
tar xzf blackbox_exporter-*.linux-amd64.tar.gz
mv blackbox_exporter /usr/local/bin/

# 4. 配置 systemd 服务 (prometheus 为例)
cat > /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus Server
After=network.target

[Service]
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus
Restart=always

[Install]
WantedBy=multi-user.target
EOF
```

### 6.3 Prometheus 配置

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bot5'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: '7zi'
    static_configs:
      - targets: ['<7zi-internal-ip>:9100']
    # 通过内网 IP 采集（SSH 修复后）

  - job_name: 'blackbox_http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://7zi.com
          - https://bot5.szspd.cn
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: instance
        replacement: https://${1}
```

### 6.4 Grafana 面板配置

导入预制面板:
- **Node Exporter Full**: ID `1860`
- **NGINX**: ID `10542`

自定义面板:
```
├── 系统概览
│   ├── CPU 使用率 (折线图)
│   ├── 内存使用率 (仪表盘)
│   └── 磁盘空间 (仪表盘)
├── 网络监控
│   ├── 带宽使用 (入/出)
│   └── 连接数统计
├── 网站可用性
│   ├── 探测成功率 (百分比)
│   └── 响应时间 (折线图)
└── 日志概览
    └── 错误率趋势
```

---

## 七、告警通知

### 7.1 告警渠道

| 渠道 | 用途 | 配置难度 |
|------|------|---------|
| **Telegram Bot** | 实时通知 | ⭐ 简单 |
| **Email** | 重要告警 | ⭐⭐ 中等 |
| **钉钉/飞书** | 团队通知 | ⭐⭐ 中等 |

### 7.2 Telegram 告警配置

```yaml
# alertmanager.yml
route:
  group_by: ['alertname']
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: 'YOUR_BOT_TOKEN'
        chat_id: 'YOUR_CHAT_ID'
        parse_mode: 'HTML'
```

---

## 八、资源估算

### 8.1 bot5.szspd.cn (当前 2GB RAM)

| 组件 | 内存 | CPU | 磁盘 |
|------|------|-----|------|
| node_exporter | 50MB | <1% | <100MB |
| Prometheus | 200MB | <5% | 5-10GB |
| Grafana | 100MB | <3% | <500MB |
| blackbox_exporter | 30MB | <1% | <50MB |
| **总计** | **~380MB** | **<10%** | **~15GB** |

---

## 九、优先级与时间表

| 优先级 | 任务 | 工时 | 状态 |
|--------|------|------|------|
| P0 | 修复 7zi.com SSH 访问 | 2h | 🔴 待处理 |
| P1 | Prometheus + Grafana 部署 | 2h | 🔴 待处理 |
| P1 | node_exporter 7zi.com 部署 | 1h | ⏸ 等待 SSH |
| P2 | blackbox_exporter 部署 | 1h | 🔴 待处理 |
| P2 | 告警规则配置 | 2h | 🔴 待处理 |
| P3 | 日志收集方案 | 3h | 🟡 规划中 |

---

## 十、后续扩展

当服务器扩展到 8 台时:

1. **集中式**: Prometheus 保持单点，Grafana 支持多数据源
2. **分布式**: 考虑 Thanos / VictoriaMetrics 长期存储
3. **服务发现**: 用 Consul/Etcd 自动发现新节点
4. **日志**: 升级到 ELK Stack (Elasticsearch + Logstash + Kibana)

---

*文档版本: 1.0.0 | 最后更新: 2026-05-03*
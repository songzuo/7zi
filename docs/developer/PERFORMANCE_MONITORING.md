# 性能监控最佳实践

本文档提供 7zi 项目性能监控的完整指南，包括监控指标说明、异常检测配置和告警设置指南。

## 目录

- [概述](#概述)
- [监控指标说明](#监控指标说明)
- [异常检测配置](#异常检测配置)
- [告警设置指南](#告警设置指南)
- [监控仪表盘](#监控仪表盘)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 概述

性能监控是保障 7zi 平台稳定运行的关键基础设施。本系统提供全面的性能数据采集、实时分析、异常检测和告警通知能力。

### 核心特性

- **全栈监控**：从前端到后端、从应用到基础设施的完整监控链路
- **实时采集**：毫秒级指标采集，支持高并发场景
- **智能告警**：基于机器学习的异常检测，减少误报和漏报
- **可视化**：丰富的仪表盘和图表，快速定位问题
- **历史分析**：长期数据存储，支持趋势分析和容量规划

### 监控架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           数据采集层                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 前端指标    │  │ 后端指标    │  │ 系统指标    │  │ 业务指标    │   │
│  │ (Web Vitals)│  │ (Prometheus)│  │ (Node Expo) │  │ (Custom)    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         数据处理层                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Prometheus Server                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │ 数据聚合    │  │ 数据存储    │  │ 数据查询    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         分析告警层                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Alertmanager│  │ 异常检测    │  │ 趋势分析    │  │ 容量预测    │   │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼───────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         展示通知层                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Grafana     │  │ PagerDuty   │  │ Slack/Email │  │ Webhook     │   │
│  │ 仪表盘      │  │ 值班系统    │  │ 通知渠道    │  │ 自定义集成  │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 技术栈

```yaml
监控栈:
  采集:
    - Prometheus (指标采集)
    - OpenTelemetry (追踪)
    - Loki (日志)

  存储:
    - Prometheus TSDB (短期存储)
    - Thanos/Cortex (长期存储)

  可视化:
    - Grafana (仪表盘)
    - Jaeger (追踪视图)

  告警:
    - Alertmanager (告警路由)
    - PagerDuty (值班管理)
```

---

## 监控指标说明

### 指标分类

| 分类         | 说明                 | 示例指标                      |
| ------------ | -------------------- | ----------------------------- |
| **RED**      | 请求率、错误率、延迟 | 请求QPS、错误率、P99延迟      |
| **USE**      | 使用率、饱和度、错误 | CPU使用率、内存饱和度、IO错误 |
| **业务**     | 业务相关指标         | 活跃用户、订单数、转化率      |
| **基础设施** | 基础设施状态         | 容器状态、网络延迟、磁盘空间  |

### 核心指标详解

#### 1. 应用层指标

##### 请求指标 (Request Metrics)

```yaml
# 请求率 (Rate)
- name: http_requests_total
  type: counter
  description: HTTP 请求总数
  labels:
    - method # GET, POST, PUT, DELETE
    - path # API 路径
    - status # HTTP 状态码
  query: |
    rate(http_requests_total[5m])

# 请求延迟 (Latency)
- name: http_request_duration_seconds
  type: histogram
  description: HTTP 请求延迟分布
  labels:
    - method
    - path
    - status
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  query: |
    histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# 错误率 (Error Rate)
- name: http_requests_errors_total
  type: counter
  description: HTTP 错误请求数
  labels:
    - method
    - path
    - status
    - error_type
  query: |
    sum(rate(http_requests_errors_total[5m])) by (path, status)
```

##### Agent 指标 (Agent Metrics)

```yaml
# Agent 活跃数
- name: agents_active_total
  type: gauge
  description: 当前活跃的 Agent 数量
  labels:
    - type # Agent 类型
    - status # active, idle, busy

# Agent 任务执行
- name: agent_tasks_total
  type: counter
  description: Agent 执行的任务数
  labels:
    - agent_id
    - task_type
    - status # success, failure
  query: |
    sum(rate(agent_tasks_total{status="success"}[5m])) by (task_type)

# Agent 响应时间
- name: agent_response_time_seconds
  type: histogram
  description: Agent 响应时间
  labels:
    - agent_id
    - task_type
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]

# Agent 队列长度
- name: agent_queue_length
  type: gauge
  description: Agent 任务队列长度
  labels:
    - agent_id
    - priority # critical, high, normal, low
```

##### WebSocket 指标

```yaml
# WebSocket 连接数
- name: websocket_connections_active
  type: gauge
  description: 活跃 WebSocket 连接数
  labels:
    - server_id

# WebSocket 消息数
- name: websocket_messages_total
  type: counter
  description: WebSocket 消息总数
  labels:
    - type # join, leave, message, action
    - direction # inbound, outbound

# WebSocket 房间数
- name: websocket_rooms_active
  type: gauge
  description: 活跃房间数

# WebSocket 房间成员数
- name: websocket_room_members
  type: gauge
  description: 房间成员数
  labels:
    - room_id
```

#### 2. 系统层指标

##### CPU 指标

```yaml
# CPU 使用率
- name: process_cpu_seconds_total
  type: counter
  description: 进程 CPU 时间

# CPU 核心数
- name: process_cpu_cores
  type: gauge
  description: CPU 核心数

# 查询：CPU 使用率
query: |
  100 * rate(process_cpu_seconds_total[5m]) / process_cpu_cores
```

##### 内存指标

```yaml
# 内存使用
- name: process_resident_memory_bytes
  type: gauge
  description: 进程常驻内存 (RSS)

- name: process_virtual_memory_bytes
  type: gauge
  description: 进程虚拟内存

- name: nodejs_heap_size_total_bytes
  type: gauge
  description: Node.js 堆总大小

- name: nodejs_heap_size_used_bytes
  type: gauge
  description: Node.js 堆已使用

- name: nodejs_external_memory_bytes
  type: gauge
  description: Node.js 外部内存

# 查询：内存使用率
query: |
  100 * nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

##### 网络/IO 指标

```yaml
# 网络流量
- name: node_network_receive_bytes_total
  type: counter
  description: 网络接收字节数

- name: node_network_transmit_bytes_total
  type: counter
  description: 网络发送字节数

# 磁盘 I/O
- name: node_disk_read_bytes_total
  type: counter
  description: 磁盘读取字节数

- name: node_disk_written_bytes_total
  type: counter
  description: 磁盘写入字节数

# 文件描述符
- name: process_open_fds
  type: gauge
  description: 打开的文件描述符数
```

#### 3. 数据库指标

##### PostgreSQL 指标

```yaml
# 连接数
- name: pg_stat_activity_count
  type: gauge
  description: 当前连接数
  labels:
    - database
    - state # active, idle, idle_in_transaction

# 查询数
- name: pg_stat_database_queries_total
  type: counter
  description: 执行的查询数
  labels:
    - database
    - type # select, insert, update, delete

# 事务数
- name: pg_stat_database_transactions_total
  type: counter
  description: 事务数
  labels:
    - database
    - status # committed, rolled_back

# 慢查询
- name: pg_stat_statements_mean_exec_time_seconds
  type: gauge
  description: 平均查询执行时间
  labels:
    - query_id
```

##### Redis 指标

```yaml
# 连接数
- name: redis_connected_clients
  type: gauge
  description: Redis 客户端连接数

# 内存使用
- name: redis_memory_used_bytes
  type: gauge
  description: Redis 内存使用

- name: redis_memory_max_bytes
  type: gauge
  description: Redis 最大内存

# 键操作
- name: redis_keyspace_keys_total
  type: gauge
  description: 键总数
  labels:
    - database

# 命令统计
- name: redis_commands_total
  type: counter
  description: 执行的命令数
  labels:
    - command # get, set, hget, etc.
```

#### 4. 前端指标 (Web Vitals)

```yaml
# Largest Contentful Paint (LCP)
- name: web_vital_lcp_seconds
  type: histogram
  description: 最大内容绘制时间
  buckets: [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]
  threshold:
    good: < 2.5s
    needs_improvement: 2.5s - 4s
    poor: > 4s

# First Input Delay (FID)
- name: web_vital_fid_seconds
  type: histogram
  description: 首次输入延迟
  buckets: [0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.3]
  threshold:
    good: < 100ms
    needs_improvement: 100ms - 300ms
    poor: > 300ms

# Cumulative Layout Shift (CLS)
- name: web_vital_cls
  type: histogram
  description: 累积布局偏移
  buckets: [0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]
  threshold:
    good: < 0.1
    needs_improvement: 0.1 - 0.25
    poor: > 0.25

# First Contentful Paint (FCP)
- name: web_vital_fcp_seconds
  type: histogram
  description: 首次内容绘制时间
  buckets: [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3]

# Time to First Byte (TTFB)
- name: web_vital_ttfb_seconds
  type: histogram
  description: 首字节时间
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 2]
```

### 指标采集配置

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # 应用服务
  - job_name: '7zi-api'
    static_configs:
      - targets: ['api:9090']
    metrics_path: '/metrics'

  # Agent 服务
  - job_name: '7zi-agents'
    static_configs:
      - targets: ['agent-code:9090', 'agent-chat:9090']

  # WebSocket 服务
  - job_name: '7zi-websocket'
    static_configs:
      - targets: ['websocket:9090']

  # PostgreSQL Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis Exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node Exporter (系统指标)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

---

## 异常检测配置

### 异常检测方法

#### 1. 静态阈值检测

最基础的异常检测方式，基于预设阈值判断。

```yaml
# 告警规则示例
groups:
  - name: static_thresholds
    rules:
      # CPU 使用率 > 80%
      - alert: HighCPUUsage
        expr: 100 * rate(process_cpu_seconds_total[5m]) / process_cpu_cores > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'CPU 使用率过高'
          description: '实例 {{ $labels.instance }} CPU 使用率 {{ $value }}%'

      # 内存使用率 > 85%
      - alert: HighMemoryUsage
        expr: 100 * nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 85
        for: 5m
        labels:
          severity: warning

      # 错误率 > 5%
      - alert: HighErrorRate
        expr: 100 * sum(rate(http_requests_errors_total[5m])) / sum(rate(http_requests_total[5m])) > 5
        for: 2m
        labels:
          severity: critical
```

#### 2. 趋势检测

基于历史趋势判断异常。

```yaml
# 趋势告警规则
groups:
  - name: trend_detection
    rules:
      # 请求量突降 (> 50% 下降)
      - alert: RequestRateDrop
        expr: |
          (
            rate(http_requests_total[5m]) 
            < 
            rate(http_requests_total[5m] offset 1h) * 0.5
          )
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: '请求量突降'
          description: '请求量比 1 小时前下降了超过 50%'

      # 响应时间持续增长
      - alert: LatencyTrendIncrease
        expr: |
          (
            histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
            >
            histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m] offset 1h)) * 1.5
          )
        for: 15m
        labels:
          severity: warning
```

#### 3. 统计异常检测

基于统计方法检测异常值。

```yaml
# 使用 Prometheus 的 predict_linear 函数
groups:
  - name: statistical_detection
    rules:
      # 预测磁盘空间将在 24 小时内耗尽
      - alert: DiskSpacePredictedExhaustion
        expr: |
          predict_linear(node_filesystem_avail_bytes[1h], 24*3600) < 0
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: '磁盘空间即将耗尽'
          description: '预测实例 {{ $labels.instance }} 的磁盘将在 24 小时内耗尽'

      # 基于标准差检测异常
      - alert: ResponseTimeAnomaly
        expr: |
          (
            http_request_duration_seconds 
            > 
            avg_over_time(http_request_duration_seconds[7d]) 
            + 
            3 * stddev_over_time(http_request_duration_seconds[7d])
          )
        for: 5m
        labels:
          severity: warning
```

### 异常检测配置文件

```yaml
# /config/monitoring/anomaly_detection.yaml

anomaly_detection:
  enabled: true

  # 检测方法
  methods:
    - name: static_threshold
      enabled: true
      config_file: /config/alerts/static_thresholds.yaml

    - name: trend_analysis
      enabled: true
      sensitivity: medium # low, medium, high

    - name: statistical
      enabled: true
      algorithms:
        - z_score
        - iqr
      window: 7d
      threshold: 3 # 标准差倍数

  # 检测指标配置
  metrics:
    - name: http_request_duration_seconds
      methods: [static_threshold, trend_analysis, statistical]
      baseline_window: 7d

    - name: error_rate
      methods: [static_threshold, trend_analysis]
      threshold: 0.05

    - name: cpu_usage
      methods: [static_threshold, trend_analysis]

    - name: memory_usage
      methods: [static_threshold, statistical]
```

---

## 告警设置指南

### 告警规则配置

#### 完整告警规则文件

```yaml
# /config/alerts/rules.yaml

groups:
  # ============ 系统层告警 ============
  - name: system_alerts
    interval: 30s
    rules:
      # CPU 告警
      - alert: CPUUsageWarning
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 70
        for: 5m
        labels:
          severity: warning
          category: system
        annotations:
          summary: 'CPU 使用率警告'
          description: '实例 {{ $labels.instance }} CPU 使用率 {{ $value }}%'

      - alert: CPUUsageCritical
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 90
        for: 2m
        labels:
          severity: critical
          category: system

      # 内存告警
      - alert: MemoryUsageWarning
        expr: 100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 80
        for: 5m
        labels:
          severity: warning
          category: system

      # 磁盘告警
      - alert: DiskSpaceWarning
        expr: 100 * (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) > 80
        for: 5m
        labels:
          severity: warning
          category: system

      - alert: DiskSpaceCritical
        expr: 100 * (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) > 95
        for: 1m
        labels:
          severity: critical
          category: system

  # ============ 应用层告警 ============
  - name: application_alerts
    interval: 30s
    rules:
      # 服务可用性
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
          category: availability
        annotations:
          summary: '服务不可用'
          description: '服务 {{ $labels.job }} 实例 {{ $labels.instance }} 已宕机'

      # 请求错误率
      - alert: HighErrorRate
        expr: |
          100 * sum(rate(http_requests_errors_total[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 5
        for: 2m
        labels:
          severity: critical
          category: application

      # 请求延迟
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 2
        for: 5m
        labels:
          severity: warning
          category: performance

      - alert: CriticalLatency
        expr: |
          histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 5
        for: 2m
        labels:
          severity: critical
          category: performance

  # ============ Agent 告警 ============
  - name: agent_alerts
    interval: 30s
    rules:
      # Agent 离线
      - alert: AgentOffline
        expr: agents_active_total{status="active"} == 0
        for: 2m
        labels:
          severity: critical
          category: agent
        annotations:
          summary: 'Agent 离线'
          description: '{{ $labels.type }} 类型 Agent 已全部离线'

      # Agent 任务失败率高
      - alert: AgentHighFailureRate
        expr: |
          100 * sum(rate(agent_tasks_total{status="failure"}[5m])) by (agent_id)
          / sum(rate(agent_tasks_total[5m])) by (agent_id) > 10
        for: 5m
        labels:
          severity: warning
          category: agent

      # Agent 队列积压
      - alert: AgentQueueBacklog
        expr: agent_queue_length > 100
        for: 10m
        labels:
          severity: warning
          category: agent

  # ============ 数据库告警 ============
  - name: database_alerts
    interval: 30s
    rules:
      # PostgreSQL 连接数
      - alert: PostgresTooManyConnections
        expr: pg_stat_activity_count > 100
        for: 2m
        labels:
          severity: warning
          category: database

      # PostgreSQL 慢查询
      - alert: PostgresSlowQueries
        expr: pg_stat_statements_mean_exec_time_seconds > 1
        for: 5m
        labels:
          severity: warning
          category: database

      # Redis 内存
      - alert: RedisHighMemory
        expr: 100 * redis_memory_used_bytes / redis_memory_max_bytes > 80
        for: 5m
        labels:
          severity: warning
          category: database

  # ============ WebSocket 告警 ============
  - name: websocket_alerts
    interval: 30s
    rules:
      # WebSocket 连接数过多
      - alert: TooManyWebSocketConnections
        expr: websocket_connections_active > 10000
        for: 5m
        labels:
          severity: warning
          category: websocket

      # WebSocket 消息延迟
      - alert: WebSocketMessageLatency
        expr: |
          histogram_quantile(0.99, rate(websocket_message_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
          category: websocket

  # ============ 前端性能告警 ============
  - name: frontend_alerts
    interval: 1m
    rules:
      # LCP 过大
      - alert: PoorLCP
        expr: |
          histogram_quantile(0.75, rate(web_vital_lcp_seconds_bucket[5m])) > 4
        for: 10m
        labels:
          severity: warning
          category: frontend
        annotations:
          summary: 'LCP 性能差'
          description: '75% 的用户 LCP 超过 4 秒'
```

### Alertmanager 配置

```yaml
# /config/alertmanager/alertmanager.yml

global:
  # 默认发送者
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@7zi.com'
  smtp_auth_username: 'alerts@7zi.com'
  smtp_auth_password: '<password>'

  # Slack 配置
  slack_api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'

# 路由规则
route:
  # 默认接收者
  receiver: 'default-receiver'

  # 分组依据
  group_by: ['alertname', 'severity', 'service']

  # 等待时间（合并同类告警）
  group_wait: 30s

  # 同组告警间隔
  group_interval: 5m

  # 重复告警间隔
  repeat_interval: 4h

  # 子路由
  routes:
    # 关键告警 -> PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    - match:
        severity: critical
      receiver: 'slack-critical'

    # 警告级别 -> Slack
    - match:
        severity: warning
      receiver: 'slack-warning'

    # 系统告警 -> 运维团队
    - match:
        category: system
      receiver: 'ops-team'

    # Agent 告警 -> AI 团队
    - match:
        category: agent
      receiver: 'ai-team'

# 接收者配置
receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'team@7zi.com'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
        severity: critical

  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        title: '🚨 {{ .GroupLabels.alertname }}'
        color: 'danger'

  - name: 'slack-warning'
    slack_configs:
      - channel: '#alerts-warning'
        title: '⚠️ {{ .GroupLabels.alertname }}'
        color: 'warning'

  - name: 'ops-team'
    email_configs:
      - to: 'ops@7zi.com'
    slack_configs:
      - channel: '#ops-alerts'

  - name: 'ai-team'
    slack_configs:
      - channel: '#ai-alerts'

# 静默规则
inhibit_rules:
  # 如果服务宕机，抑制相关的告警
  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: '.*'
    equal: ['service']

  # 如果有 critical 告警，抑制同类的 warning
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
```

---

## 监控仪表盘

### Grafana 仪表盘配置

#### 主概览仪表盘

```json
{
  "dashboard": {
    "title": "7zi Platform Overview",
    "uid": "7zi-overview",
    "panels": [
      {
        "title": "请求速率",
        "type": "graph",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ]
      },
      {
        "title": "错误率",
        "type": "stat",
        "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "100 * sum(rate(http_requests_errors_total[5m])) / sum(rate(http_requests_total[5m]))",
            "legendFormat": "Error %"
          }
        ]
      },
      {
        "title": "P99 延迟",
        "type": "stat",
        "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "P99"
          }
        ]
      }
    ]
  }
}
```

### 常用 Grafana 查询

```promql
# 请求速率 (QPS)
sum(rate(http_requests_total[5m])) by (service)

# 错误率
100 * sum(rate(http_requests_errors_total[5m])) by (service)
  / sum(rate(http_requests_total[5m])) by (service)

# P99 延迟
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service))

# CPU 使用率
100 * rate(process_cpu_seconds_total[5m]) / process_cpu_cores

# 内存使用率
100 * nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes

# 活跃 Agent 数量
sum(agents_active_total{status="active"}) by (type)

# WebSocket 连接数
sum(websocket_connections_active)

# 数据库连接数
pg_stat_activity_count
```

---

## 最佳实践

### 1. 监控分层

- **基础设施层**：监控服务器、网络、存储
- **平台层**：监控数据库、缓存、消息队列
- **应用层**：监控服务健康、性能、错误
- **业务层**：监控业务指标、用户体验

### 2. 告警设计原则

- **可操作性**：每个告警都应该有明确的处理方法
- **去重**：避免重复告警淹没重要信息
- **分级**：合理设置告警级别（critical/warning/info）
- **静默**：为维护窗口配置静默规则

### 3. 指标命名规范

```yaml
# 推荐格式: namespace_subsystem_name_unit

# Counter 示例
http_requests_total
http_request_duration_seconds_total

# Gauge 示例
node_memory_available_bytes
process_open_fds

# Histogram 示例
http_request_duration_seconds_bucket
http_request_duration_seconds_sum
http_request_duration_seconds_count
```

### 4. 性能优化建议

```yaml
# Prometheus 性能优化
prometheus:
  storage:
    retention: 15d
    tsdb:
      compaction: true

  # 减少高基数标签
  metric_relabel_configs:
    - source_labels: [path]
      regex: '/api/.*'
      target_label: path
      replacement: '/api/:path'

  # 远程写入（长期存储）
  remote_write:
    - url: http://thanos-receive:19291/api/v1/receive
```

---

## 故障排除

### 常见问题

#### 1. 指标采集失败

**症状**：Prometheus targets 显示 down

**排查步骤**：

```bash
# 检查 target 端点
curl http://target-host:9090/metrics

# 检查网络连通性
telnet target-host 9090

# 查看日志
kubectl logs -l app=prometheus -c prometheus
```

#### 2. 告警未触发

**症状**：指标已超阈值但未收到告警

**排查步骤**：

```bash
# 检查告警规则
curl http://prometheus:9090/api/v1/rules

# 检查 Alertmanager 状态
curl http://alertmanager:9093/api/v2/status

# 查看静默配置
curl http://alertmanager:9093/api/v2/silences
```

#### 3. Grafana 面板无数据

**症状**：仪表盘显示 N/A

**排查步骤**：

```bash
# 测试查询
curl 'http://prometheus:9090/api/v1/query?query=up'

# 检查数据源配置
# Grafana -> Configuration -> Data Sources

# 检查时间范围
# 确保查询时间范围正确
```

### 诊断命令

```bash
# Prometheus 健康检查
curl http://prometheus:9090/-/healthy

# 检查 TSDB 状态
curl http://prometheus:9090/api/v1/status/tsdb

# 重新加载配置
curl -X POST http://prometheus:9090/-/reload

# Alertmanager 健康检查
curl http://alertmanager:9093/-/healthy
```

---

## 参考资料

- [Agent Scheduler 完整使用指南](./AGENT_SCHEDULER_GUIDE.md)
- [WebSocket 房间系统教程](./WEBSOCKET_ROOMS_GUIDE.md)
- [API 参考文档](../API.md)
- [部署指南](../DEPLOYMENT.md)
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)

---

_最后更新: 2026-03-31_
_版本: 1.5.0_

# AgentScheduler 性能基准测试计划

> 📚 咨询师 + 🌟 智能体世界专家 联合制定
>
> 日期: 2026-03-29

## 执行摘要

本文档制定 AgentScheduler 的性能基准测试计划，涵盖 100+ 并发任务、调度延迟、系统吞吐量和资源利用率四大核心测试场景，确保系统在高负载下的稳定性和可靠性。

---

## 1. 测试目标

### 1.1 核心指标

| 指标类别       | 具体指标     | 目标值         | 重要性  |
| -------------- | ------------ | -------------- | ------- |
| **调度延迟**   | P50 调度延迟 | < 10ms         | 🔴 关键 |
|                | P99 调度延迟 | < 50ms         | 🔴 关键 |
|                | 最大调度延迟 | < 200ms        | 🟡 重要 |
| **吞吐量**     | 任务提交速率 | 1000 tasks/s   | 🔴 关键 |
|                | 任务完成速率 | 500 tasks/s    | 🔴 关键 |
|                | 系统容量     | 10000 并发任务 | 🟡 重要 |
| **资源利用率** | CPU 利用率   | < 70%          | 🟡 重要 |
|                | 内存利用率   | < 80%          | 🟡 重要 |
|                | 网络带宽     | < 50%          | 🟢 一般 |
| **可靠性**     | 任务成功率   | > 99.9%        | 🔴 关键 |
|                | 错误恢复时间 | < 5s           | 🟡 重要 |
|                | 系统可用性   | > 99.95%       | 🔴 关键 |

### 1.2 测试场景

```
┌─────────────────────────────────────────────────────────────────┐
│                    性能测试场景矩阵                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   并发度         ▲                                              │
│                  │                                              │
│   1000+ tasks    │     ┌─────────┐                             │
│                  │     │ Stress  │ 压力测试                    │
│   500 tasks      │  ┌──┴─────────┴──┐                          │
│                  │  │    Load       │ 负载测试                  │
│   100 tasks      │──┴───────────────┴───                       │
│                  │      Soak        挍久测试                    │
│   10 tasks       │────────────────────                          │
│                  │     Smoke       冒烟测试                     │
│                  └──────────────────────────────────▶ 时间      │
│                     1min    10min    1h    24h                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 测试环境

### 2.1 硬件配置

#### 2.1.1 生产级配置

| 组件            | 配置                      | 数量 | 用途         |
| --------------- | ------------------------- | ---- | ------------ |
| **Coordinator** | 8 Core / 16GB / 100GB SSD | 3    | 调度主节点   |
| **Worker**      | 4 Core / 8GB / 50GB SSD   | 10   | 任务执行节点 |
| **Redis**       | 4 Core / 8GB / 50GB SSD   | 3    | 任务队列     |
| **PostgreSQL**  | 8 Core / 32GB / 500GB SSD | 2    | 状态存储     |
| **etcd**        | 4 Core / 8GB / 50GB SSD   | 3    | 分布式状态   |

#### 2.1.2 测试环境配置

| 组件           | 配置          | 数量 | 备注                 |
| -------------- | ------------- | ---- | -------------------- |
| **测试客户端** | 4 Core / 8GB  | 5    | 模拟并发请求         |
| **监控服务**   | 4 Core / 8GB  | 1    | Prometheus + Grafana |
| **日志服务**   | 4 Core / 16GB | 1    | ELK Stack            |

### 2.2 软件版本

```yaml
# 软件版本矩阵
software:
  os: Ubuntu 22.04 LTS
  kernel: 5.15.x

  runtime:
    go: 1.21+
    node: 18.x

  infrastructure:
    redis: 7.0+
    postgresql: 15+
    etcd: 3.5+
    prometheus: 2.45+
    grafana: 10.0+

  agentscheduler:
    version: 2.0.0-beta
    build: latest
```

### 2.3 网络拓扑

```
                        Internet
                            │
                    ┌───────┴───────┐
                    │  Load Balancer │
                    └───────┬───────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐
    │Coord 1  │        │Coord 2  │        │Coord 3  │
    └────┬────┘        └────┬────┘        └────┬────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
         │ Worker  │...│ Worker  │...│ Worker  │
         │   1     │   │   5     │   │   10    │
         └─────────┘   └─────────┘   └─────────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
         │  Redis  │   │Postgres │   │  etcd   │
         │ Cluster │   │   HA    │   │ Cluster │
         └─────────┘   └─────────┘   └─────────┘
```

---

## 3. 测试工具

### 3.1 负载生成工具

#### 3.1.1 自研负载生成器

```go
// LoadGenerator - 负载生成器
package main

import (
    "context"
    "fmt"
    "math/rand"
    "sync"
    "sync/atomic"
    "time"

    "github.com/prometheus/client_golang/api"
    "github.com/prometheus/client_golang/api/prometheus/v1"
)

type LoadGenerator struct {
    config       *LoadConfig
    client       *SchedulerClient
    metrics      *MetricsCollector
    taskTemplates []*TaskTemplate

    // 统计
    totalTasks   int64
    successCount int64
    failCount    int64
    latencies    []time.Duration
}

type LoadConfig struct {
    // 并发配置
    ConcurrentUsers    int
    TasksPerUser       int

    // 时间配置
    RampUpDuration     time.Duration
    TestDuration       time.Duration
    RampDownDuration   time.Duration

    // 任务分布
    TaskDistribution   map[string]float64  // taskType -> weight

    // 优先级分布
    PriorityDistribution map[int]float64

    // 思考时间
    ThinkTimeMin       time.Duration
    ThinkTimeMax       time.Duration
}

// 运行负载测试
func (g *LoadGenerator) Run(ctx context.Context) *LoadTestResult {
    // 1. 预热阶段
    g.rampUp(ctx, g.config.RampUpDuration)

    // 2. 稳定负载阶段
    var wg sync.WaitGroup
    stopCh := make(chan struct{})

    for i := 0; i < g.config.ConcurrentUsers; i++ {
        wg.Add(1)
        go func(userID int) {
            defer wg.Done()
            g.userWorker(ctx, userID, stopCh)
        }(i)
    }

    // 运行指定时间
    select {
    case <-time.After(g.config.TestDuration):
        close(stopCh)
    case <-ctx.Done():
        close(stopCh)
    }

    wg.Wait()

    // 3. 收尾阶段
    g.rampDown(ctx, g.config.RampDownDuration)

    return g.generateResult()
}

// 用户工作线程
func (g *LoadGenerator) userWorker(ctx context.Context, userID int, stopCh <-chan struct{}) {
    for {
        select {
        case <-stopCh:
            return
        default:
            // 选择任务模板
            template := g.selectTemplate()

            // 生成任务
            task := g.generateTask(template, userID)

            // 执行任务
            start := time.Now()
            result, err := g.client.SubmitTask(ctx, task)
            latency := time.Since(start)

            // 记录结果
            atomic.AddInt64(&g.totalTasks, 1)
            if err != nil {
                atomic.AddInt64(&g.failCount, 1)
            } else {
                atomic.AddInt64(&g.successCount, 1)
            }
            g.recordLatency(latency)

            // 思考时间
            thinkTime := g.randomThinkTime()
            time.Sleep(thinkTime)
        }
    }
}

// 测试结果
type LoadTestResult struct {
    Duration         time.Duration
    TotalTasks       int64
    SuccessCount     int64
    FailCount        int64
    SuccessRate      float64
    Throughput       float64  // tasks/s

    LatencyStats     LatencyStats
    ErrorBreakdown   map[string]int
    ResourceUsage    []ResourceSnapshot
}

type LatencyStats struct {
    Min    time.Duration
    Max    time.Duration
    Mean   time.Duration
    StdDev time.Duration
    P50    time.Duration
    P90    time.Duration
    P95    time.Duration
    P99    time.Duration
}
```

#### 3.1.2 集成 k6

```javascript
// k6 测试脚本 - scheduler_load_test.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// 自定义指标
const successRate = new Rate('success_rate')
const scheduleLatency = new Trend('schedule_latency')
const taskCompleteLatency = new Trend('task_complete_latency')
const taskCount = new Counter('task_count')

// 测试配置
export const options = {
  scenarios: {
    // 场景1: 稳定负载
    steady_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      startTime: '0s',
    },
    // 场景2: 阶梯负载
    ramping_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 50 },
      ],
      startTime: '10m',
    },
    // 场景3: 峰值测试
    spike: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 50 },
      ],
      startTime: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    success_rate: ['rate>0.99'],
    schedule_latency: ['p(95)<50', 'p(99)<100'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080'

export default function () {
  // 1. 提交任务
  const taskPayload = JSON.stringify({
    type: randomTaskType(),
    priority: randomPriority(),
    input: generateRandomInput(),
  })

  const submitStart = new Date()
  const submitRes = http.post(`${BASE_URL}/api/v1/tasks`, taskPayload, {
    headers: { 'Content-Type': 'application/json' },
  })

  const submitLatency = new Date() - submitStart
  scheduleLatency.add(submitLatency)

  check(submitRes, {
    'task submitted': r => r.status === 201,
    'has task ID': r => r.json('task_id') !== undefined,
  })

  successRate.add(submitRes.status === 201)
  taskCount.add(1)

  if (submitRes.status === 201) {
    const taskId = submitRes.json('task_id')

    // 2. 等待任务完成
    const completeLatency = waitForTaskCompletion(taskId)
    if (completeLatency > 0) {
      taskCompleteLatency.add(completeLatency)
    }
  }

  // 思考时间
  sleep(randomInt(1, 3))
}

function randomTaskType() {
  const types = ['llm_chat', 'tool_call', 'workflow', 'batch']
  return types[Math.floor(Math.random() * types.length)]
}

function randomPriority() {
  const weights = [0.1, 0.2, 0.5, 0.15, 0.05] // critical, high, normal, low, background
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i]
    if (r < cumulative) return 1000 - i * 250
  }
  return 500
}

function waitForTaskCompletion(taskId) {
  const maxAttempts = 60
  const pollInterval = 1000
  const start = new Date()

  for (let i = 0; i < maxAttempts; i++) {
    const res = http.get(`${BASE_URL}/api/v1/tasks/${taskId}`)
    if (res.status === 200) {
      const status = res.json('status')
      if (status === 'completed' || status === 'failed') {
        return new Date() - start
      }
    }
    sleep(pollInterval / 1000)
  }
  return -1 // 超时
}
```

### 3.2 监控工具

#### 3.2.1 Prometheus 指标

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'agentscheduler'
    static_configs:
      - targets: ['coordinator:9090', 'worker1:9090', 'worker2:9090']
    metrics_path: /metrics

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'etcd'
    static_configs:
      - targets: ['etcd:2379']
```

```go
// 内置 Prometheus 指标
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // 任务指标
    TasksSubmitted = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "scheduler_tasks_submitted_total",
        Help: "Total number of tasks submitted",
    }, []string{"type", "priority"})

    TasksCompleted = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "scheduler_tasks_completed_total",
        Help: "Total number of tasks completed",
    }, []string{"type", "status"})

    // 延迟指标
    ScheduleLatency = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "scheduler_schedule_latency_seconds",
        Help:    "Time taken to schedule a task",
        Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},
    }, []string{"strategy"})

    TaskDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "scheduler_task_duration_seconds",
        Help:    "Time taken to complete a task",
        Buckets: []float64{.1, .5, 1, 2.5, 5, 10, 30, 60, 120, 300},
    }, []string{"type", "agent"})

    // 队列指标
    QueueSize = promauto.NewGaugeVec(prometheus.GaugeOpts{
        Name: "scheduler_queue_size",
        Help: "Current queue size",
    }, []string{"queue", "priority"})

    // Agent 指标
    AgentActive = promauto.NewGaugeVec(prometheus.GaugeOpts{
        Name: "scheduler_agent_active",
        Help: "Number of active agents",
    }, []string{"type"})

    AgentLoad = promauto.NewGaugeVec(prometheus.GaugeOpts{
        Name: "scheduler_agent_load",
        Help: "Current load of agents",
    }, []string{"agent_id", "type"})
)
```

#### 3.2.2 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "AgentScheduler Performance",
    "panels": [
      {
        "title": "Task Throughput",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(scheduler_tasks_submitted_total[1m])",
            "legendFormat": "Submitted"
          },
          {
            "expr": "rate(scheduler_tasks_completed_total[1m])",
            "legendFormat": "Completed"
          }
        ]
      },
      {
        "title": "Schedule Latency",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(scheduler_schedule_latency_seconds_bucket[1m])",
            "format": "heatmap"
          }
        ]
      },
      {
        "title": "Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "scheduler_queue_size",
            "legendFormat": "{{queue}} - {{priority}}"
          }
        ]
      },
      {
        "title": "Agent Load Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "scheduler_agent_load",
            "format": "heatmap"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(scheduler_tasks_completed_total{status=\"failed\"}[5m]) / rate(scheduler_tasks_completed_total[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "thresholds": [
          { "value": 0.001, "color": "green" },
          { "value": 0.01, "color": "yellow" },
          { "value": 0.05, "color": "red" }
        ]
      }
    ]
  }
}
```

---

## 4. 测试场景详解

### 4.1 场景一：100+ 并发任务测试

#### 4.1.1 测试配置

```yaml
# concurrent_test.yaml
name: concurrent_100_plus
description: 测试系统在 100+ 并发任务下的表现

phases:
  - name: ramp_up
    duration: 2m
    users:
      start: 0
      end: 100
    think_time: 1s

  - name: steady_state
    duration: 10m
    users: 100
    think_time: 1s

  - name: stress_test
    duration: 5m
    users:
      start: 100
      end: 500
    think_time: 0.5s

  - name: cool_down
    duration: 2m
    users:
      start: 500
      end: 0
    think_time: 1s

task_mix:
  llm_chat: 40%
  tool_call: 30%
  workflow: 20%
  batch: 10%

priority_mix:
  critical: 10%
  high: 20%
  normal: 50%
  low: 15%
  background: 5%
```

#### 4.1.2 预期结果

| 指标           | 预期值        | 可接受范围    | 失败阈值      |
| -------------- | ------------- | ------------- | ------------- |
| 任务提交成功率 | > 99.9%       | > 99.5%       | < 99%         |
| P50 调度延迟   | < 10ms        | < 20ms        | > 50ms        |
| P99 调度延迟   | < 50ms        | < 100ms       | > 200ms       |
| 系统吞吐量     | > 500 tasks/s | > 300 tasks/s | < 100 tasks/s |
| CPU 使用率     | < 60%         | < 75%         | > 90%         |
| 内存使用率     | < 70%         | < 80%         | > 95%         |

#### 4.1.3 测试脚本

```bash
#!/bin/bash
# run_concurrent_test.sh

# 设置环境变量
export BASE_URL="http://coordinator:8080"
export TEST_ID="concurrent_$(date +%Y%m%d_%H%M%S)"

# 启动监控
./start_monitoring.sh $TEST_ID

# 运行 k6 测试
k6 run --out influxdb=http://influxdb:8086/k6 \
       --tag test_id=$TEST_ID \
       concurrent_test.js

# 收集结果
./collect_results.sh $TEST_ID

# 生成报告
./generate_report.sh $TEST_ID
```

### 4.2 场景二：调度延迟测试

#### 4.2.1 测试配置

```yaml
# latency_test.yaml
name: schedule_latency
description: 测试调度延迟的各个维度

test_cases:
  # 测试1: 空队列延迟
  - name: empty_queue_latency
    description: 队列为空时的调度延迟
    pre_condition:
      queue_size: 0
    load:
      concurrent: 1
      rate: 10/s
    duration: 5m

  # 测试2: 轻负载延迟
  - name: light_load_latency
    description: 轻负载下的调度延迟
    pre_condition:
      queue_size: 10
    load:
      concurrent: 10
      rate: 50/s
    duration: 5m

  # 测试3: 中等负载延迟
  - name: medium_load_latency
    description: 中等负载下的调度延迟
    pre_condition:
      queue_size: 100
    load:
      concurrent: 50
      rate: 200/s
    duration: 5m

  # 测试4: 高负载延迟
  - name: high_load_latency
    description: 高负载下的调度延迟
    pre_condition:
      queue_size: 500
    load:
      concurrent: 200
      rate: 500/s
    duration: 5m

  # 测试5: 不同优先级延迟
  - name: priority_latency
    description: 不同优先级的调度延迟差异
    load:
      - priority: critical
        rate: 10/s
      - priority: high
        rate: 20/s
      - priority: normal
        rate: 50/s
      - priority: low
        rate: 20/s
    duration: 10m
```

#### 4.2.2 延迟分析方法

```python
# latency_analysis.py
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

def analyze_latency(data_path: str):
    """分析调度延迟数据"""

    # 加载数据
    df = pd.read_csv(data_path)

    # 基础统计
    stats = {
        'count': len(df),
        'mean': df['latency_ms'].mean(),
        'std': df['latency_ms'].std(),
        'min': df['latency_ms'].min(),
        'max': df['latency_ms'].max(),
        'p50': df['latency_ms'].quantile(0.50),
        'p90': df['latency_ms'].quantile(0.90),
        'p95': df['latency_ms'].quantile(0.95),
        'p99': df['latency_ms'].quantile(0.99),
    }

    # 分布分析
    plt.figure(figsize=(12, 8))

    # 直方图
    plt.subplot(2, 2, 1)
    plt.hist(df['latency_ms'], bins=50, edgecolor='black')
    plt.xlabel('Latency (ms)')
    plt.ylabel('Frequency')
    plt.title('Latency Distribution')

    # CDF
    plt.subplot(2, 2, 2)
    sorted_latency = np.sort(df['latency_ms'])
    cdf = np.arange(1, len(sorted_latency) + 1) / len(sorted_latency)
    plt.plot(sorted_latency, cdf)
    plt.xlabel('Latency (ms)')
    plt.ylabel('CDF')
    plt.title('Cumulative Distribution')

    # 按优先级分组
    plt.subplot(2, 2, 3)
    priority_groups = df.groupby('priority')['latency_ms'].mean()
    priority_groups.plot(kind='bar')
    plt.xlabel('Priority')
    plt.ylabel('Mean Latency (ms)')
    plt.title('Latency by Priority')

    # 时间序列
    plt.subplot(2, 2, 4)
    plt.plot(df['timestamp'], df['latency_ms'], 'b.', alpha=0.5)
    plt.xlabel('Time')
    plt.ylabel('Latency (ms)')
    plt.title('Latency Over Time')

    plt.tight_layout()
    plt.savefig('latency_analysis.png')

    return stats

def detect_outliers(df: pd.DataFrame) -> pd.DataFrame:
    """检测延迟异常值"""

    # IQR 方法
    Q1 = df['latency_ms'].quantile(0.25)
    Q3 = df['latency_ms'].quantile(0.75)
    IQR = Q3 - Q1

    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    outliers = df[(df['latency_ms'] < lower_bound) | (df['latency_ms'] > upper_bound)]

    return outliers
```

### 4.3 场景三：系统吞吐量测试

#### 4.3.1 测试配置

```yaml
# throughput_test.yaml
name: system_throughput
description: 测试系统最大吞吐量

method: binary_search # 二分查找最大吞吐量

initial_rate: 100 # 初始请求速率
max_rate: 5000 # 最大请求速率
rate_step: 100 # 速率递增步长

success_criteria:
  success_rate: 0.999
  p99_latency_ms: 100
  error_rate: 0.001

duration_per_step: 3m
ramp_up_per_step: 30s

test_cases:
  - name: llm_chat_throughput
    task_type: llm_chat
    initial_rate: 50
    max_rate: 1000

  - name: tool_call_throughput
    task_type: tool_call
    initial_rate: 100
    max_rate: 2000

  - name: mixed_throughput
    task_mix:
      llm_chat: 40%
      tool_call: 30%
      workflow: 20%
      batch: 10%
    initial_rate: 100
    max_rate: 2000
```

#### 4.3.2 吞吐量测试脚本

```go
// throughput_test.go
package benchmark

import (
    "context"
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

type ThroughputTest struct {
    config      *ThroughputConfig
    client      *SchedulerClient
    results     []*ThroughputResult
}

type ThroughputConfig struct {
    InitialRate     int
    MaxRate         int
    RateStep        int
    DurationPerStep time.Duration
    SuccessCriteria SuccessCriteria
}

type ThroughputResult struct {
    Rate          int
    Duration      time.Duration
    TotalTasks    int64
    SuccessCount  int64
    FailCount     int64
    ActualRate    float64
    SuccessRate   float64
    P99Latency    time.Duration
    MetCriteria   bool
}

// 运行吞吐量测试
func (t *ThroughputTest) Run(ctx context.Context) error {
    currentRate := t.config.InitialRate

    for currentRate <= t.config.MaxRate {
        result := t.runAtRate(ctx, currentRate)
        t.results = append(t.results, result)

        fmt.Printf("Rate: %d/s, Actual: %.2f/s, Success: %.2f%%, P99: %v, Met: %v\n",
            currentRate, result.ActualRate, result.SuccessRate*100,
            result.P99Latency, result.MetCriteria)

        if !result.MetCriteria {
            // 找到上限，进行精细搜索
            return t.fineSearch(ctx, currentRate-t.config.RateStep, currentRate)
        }

        currentRate += t.config.RateStep
    }

    return nil
}

// 精细搜索
func (t *ThroughputTest) fineSearch(ctx context.Context, lower, upper int) error {
    for lower < upper-10 {
        mid := (lower + upper) / 2
        result := t.runAtRate(ctx, mid)

        if result.MetCriteria {
            lower = mid
        } else {
            upper = mid
        }
    }

    fmt.Printf("Maximum sustainable throughput: %d tasks/s\n", lower)
    return nil
}

// 在指定速率运行测试
func (t *ThroughputTest) runAtRate(ctx context.Context, rate int) *ThroughputResult {
    result := &ThroughputResult{
        Rate:     rate,
        Duration: t.config.DurationPerStep,
    }

    // 计算需要的并发数
    concurrency := rate * int(t.config.DurationPerStep.Seconds())

    var wg sync.WaitGroup
    var successCount, failCount int64
    latencies := make([]time.Duration, 0, concurrency)
    latenciesMu := sync.Mutex{}

    // 创建速率限制器
    ticker := time.NewTicker(time.Second / time.Duration(rate))
    defer ticker.Stop()

    startTime := time.Now()

    for i := 0; i < concurrency; i++ {
        <-ticker.C

        wg.Add(1)
        go func() {
            defer wg.Done()

            taskStart := time.Now()
            _, err := t.client.SubmitTask(ctx, generateTask())
            latency := time.Since(taskStart)

            if err != nil {
                atomic.AddInt64(&failCount, 1)
            } else {
                atomic.AddInt64(&successCount, 1)
            }

            latenciesMu.Lock()
            latencies = append(latencies, latency)
            latenciesMu.Unlock()
        }()
    }

    wg.Wait()
    totalDuration := time.Since(startTime)

    result.TotalTasks = successCount + failCount
    result.SuccessCount = successCount
    result.FailCount = failCount
    result.SuccessRate = float64(successCount) / float64(result.TotalTasks)
    result.ActualRate = float64(result.TotalTasks) / totalDuration.Seconds()
    result.P99Latency = percentile(latencies, 99)
    result.MetCriteria = t.evaluateCriteria(result)

    return result
}

func (t *ThroughputTest) evaluateCriteria(result *ThroughputResult) bool {
    return result.SuccessRate >= t.config.SuccessCriteria.SuccessRate &&
        result.P99Latency.Milliseconds() <= t.config.SuccessCriteria.P99LatencyMs
}
```

### 4.4 场景四：资源利用率测试

#### 4.4.1 测试配置

```yaml
# resource_test.yaml
name: resource_utilization
description: 测试资源利用效率

metrics:
  - cpu_usage
  - memory_usage
  - goroutine_count
  - gc_pause_ms
  - network_io
  - disk_io

test_phases:
  - name: idle
    duration: 5m
    load: 0

  - name: low_load
    duration: 10m
    load:
      concurrent: 20
      rate: 50/s

  - name: medium_load
    duration: 10m
    load:
      concurrent: 100
      rate: 200/s

  - name: high_load
    duration: 10m
    load:
      concurrent: 500
      rate: 500/s

  - name: recovery
    duration: 5m
    load: 0

profiling:
  enabled: true
  interval: 30s
  output:
    - cpu_profile
    - mem_profile
    - goroutine_profile
    - trace
```

#### 4.4.2 资源监控脚本

```bash
#!/bin/bash
# resource_monitor.sh

TEST_ID=$1
DURATION=$2
OUTPUT_DIR="results/$TEST_ID/resources"

mkdir -p $OUTPUT_DIR

# 记录系统资源
echo "timestamp,cpu_usage,mem_usage,goroutines,gc_pause" > $OUTPUT_DIR/system.csv

start_time=$(date +%s)
end_time=$((start_time + DURATION))

while [ $(date +%s) -lt $end_time ]; do
    timestamp=$(date +%s%3N)

    # CPU 使用率
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

    # 内存使用率
    mem_usage=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')

    # Go 运行时指标
    goroutines=$(curl -s http://localhost:6060/debug/vars | jq '.cmdline' | wc -l)

    # GC 暂停
    gc_pause=$(curl -s http://localhost:6060/debug/vars | jq '.memstats.PauseTotalNs')

    echo "$timestamp,$cpu_usage,$mem_usage,$goroutines,$gc_pause" >> $OUTPUT_DIR/system.csv

    sleep 1
done

# 生成 pprof 快照
curl -s http://localhost:6060/debug/pprof/profile?seconds=30 > $OUTPUT_DIR/cpu.prof &
curl -s http://localhost:6060/debug/pprof/heap > $OUTPUT_DIR/heap.prof &
curl -s http://localhost:6060/debug/pprof/goroutine > $OUTPUT_DIR/goroutine.prof &
```

#### 4.4.3 资源分析报告

```python
# resource_analysis.py
import pandas as pd
import matplotlib.pyplot as plt

def analyze_resources(test_id: str):
    """分析资源使用情况"""

    df = pd.read_csv(f'results/{test_id}/resources/system.csv')

    # 时间序列图
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))

    # CPU 使用率
    axes[0, 0].plot(df['timestamp'], df['cpu_usage'])
    axes[0, 0].set_title('CPU Usage Over Time')
    axes[0, 0].set_ylabel('CPU Usage (%)')
    axes[0, 0].axhline(y=70, color='r', linestyle='--', label='Warning threshold')
    axes[0, 0].legend()

    # 内存使用率
    axes[0, 1].plot(df['timestamp'], df['mem_usage'])
    axes[0, 1].set_title('Memory Usage Over Time')
    axes[0, 1].set_ylabel('Memory Usage (%)')
    axes[0, 1].axhline(y=80, color='r', linestyle='--', label='Warning threshold')
    axes[0, 1].legend()

    # Goroutines 数量
    axes[1, 0].plot(df['timestamp'], df['goroutines'])
    axes[1, 0].set_title('Goroutines Count')
    axes[1, 0].set_ylabel('Count')

    # GC 暂停时间
    axes[1, 1].plot(df['timestamp'], df['gc_pause'] / 1e6)  # 转换为毫秒
    axes[1, 1].set_title('GC Pause Time')
    axes[1, 1].set_ylabel('Pause (ms)')

    plt.tight_layout()
    plt.savefig(f'results/{test_id}/resource_analysis.png')

    # 统计摘要
    summary = {
        'cpu_mean': df['cpu_usage'].mean(),
        'cpu_max': df['cpu_usage'].max(),
        'mem_mean': df['mem_usage'].mean(),
        'mem_max': df['mem_usage'].max(),
        'goroutines_max': df['goroutines'].max(),
        'gc_pause_total_ms': df['gc_pause'].sum() / 1e6,
    }

    return summary
```

---

## 5. 测试执行流程

### 5.1 准备阶段

```bash
#!/bin/bash
# prepare_test.sh

set -e

echo "=== AgentScheduler 性能测试准备 ==="

# 1. 环境检查
echo "[1/5] 检查环境..."
command -v k6 >/dev/null 2>&1 || { echo "需要安装 k6"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "需要安装 Docker"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "需要安装 jq"; exit 1; }

# 2. 部署测试环境
echo "[2/5] 部署测试环境..."
docker-compose -f docker-compose.test.yml up -d

# 3. 等待服务就绪
echo "[3/5] 等待服务就绪..."
sleep 30
curl -s http://localhost:8080/health | jq '.status' | grep -q "healthy" || { echo "服务未就绪"; exit 1; }

# 4. 预热系统
echo "[4/5] 预热系统..."
./warmup.sh

# 5. 创建结果目录
echo "[5/5] 创建结果目录..."
TEST_ID="perf_$(date +%Y%m%d_%H%M%S)"
mkdir -p "results/$TEST_ID"

echo "测试环境准备完成，测试 ID: $TEST_ID"
echo $TEST_ID > .current_test_id
```

### 5.2 执行阶段

```bash
#!/bin/bash
# run_all_tests.sh

set -e

TEST_ID=$(cat .current_test_id)

echo "=== 执行性能测试套件 ==="

# 1. 并发测试
echo "[1/4] 执行并发测试..."
k6 run --out influxdb=http://localhost:8086/k6 \
       --tag test_id=$TEST_ID,scenario=concurrent \
       tests/concurrent_test.js | tee "results/$TEST_ID/concurrent.log"

# 2. 延迟测试
echo "[2/4] 执行延迟测试..."
k6 run --out influxdb=http://localhost:8086/k6 \
       --tag test_id=$TEST_ID,scenario=latency \
       tests/latency_test.js | tee "results/$TEST_ID/latency.log"

# 3. 吞吐量测试
echo "[3/4] 执行吞吐量测试..."
go run tests/throughput_test.go | tee "results/$TEST_ID/throughput.log"

# 4. 资源测试
echo "[4/4] 执行资源测试..."
./resource_monitor.sh $TEST_ID 3600 &
k6 run --out influxdb=http://localhost:8086/k6 \
       --tag test_id=$TEST_ID,scenario=resource \
       tests/resource_test.js | tee "results/$TEST_ID/resource.log"

echo "=== 所有测试完成 ==="
```

### 5.3 分析阶段

```bash
#!/bin/bash
# analyze_results.sh

TEST_ID=$1

echo "=== 分析测试结果 ==="

# 1. 从 Prometheus 提取指标
echo "[1/3] 提取 Prometheus 指标..."
python scripts/extract_metrics.py $TEST_ID

# 2. 生成分析报告
echo "[2/3] 生成分析报告..."
python scripts/analyze_latency.py $TEST_ID
python scripts/analyze_throughput.py $TEST_ID
python scripts/analyze_resources.py $TEST_ID

# 3. 生成综合报告
echo "[3/3] 生成综合报告..."
python scripts/generate_report.py $TEST_ID

echo "报告已生成: results/$TEST_ID/report.html"
```

---

## 6. 结果分析与报告

### 6.1 报告模板

```html
<!-- report_template.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>AgentScheduler Performance Report</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 40px;
      }
      .metric {
        margin: 20px 0;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 5px;
      }
      .pass {
        color: green;
      }
      .fail {
        color: red;
      }
      .warn {
        color: orange;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #4caf50;
        color: white;
      }
    </style>
  </head>
  <body>
    <h1>AgentScheduler 性能测试报告</h1>

    <div class="metric">
      <h2>测试概要</h2>
      <p>测试 ID: {{test_id}}</p>
      <p>测试时间: {{test_time}}</p>
      <p>测试时长: {{duration}}</p>
    </div>

    <div class="metric">
      <h2>核心指标</h2>
      <table>
        <tr>
          <th>指标</th>
          <th>目标值</th>
          <th>实际值</th>
          <th>状态</th>
        </tr>
        <tr>
          <td>P50 调度延迟</td>
          <td>< 10ms</td>
          <td>{{p50_latency}}</td>
          <td class="{{p50_status}}">{{p50_status}}</td>
        </tr>
        <tr>
          <td>P99 调度延迟</td>
          <td>< 50ms</td>
          <td>{{p99_latency}}</td>
          <td class="{{p99_status}}">{{p99_status}}</td>
        </tr>
        <tr>
          <td>系统吞吐量</td>
          <td>> 500 tasks/s</td>
          <td>{{throughput}}</td>
          <td class="{{throughput_status}}">{{throughput_status}}</td>
        </tr>
        <tr>
          <td>成功率</td>
          <td>> 99.9%</td>
          <td>{{success_rate}}</td>
          <td class="{{success_status}}">{{success_status}}</td>
        </tr>
      </table>
    </div>

    <div class="metric">
      <h2>详细分析</h2>
      <h3>延迟分布</h3>
      <img src="latency_distribution.png" alt="Latency Distribution" />

      <h3>吞吐量趋势</h3>
      <img src="throughput_trend.png" alt="Throughput Trend" />

      <h3>资源使用</h3>
      <img src="resource_usage.png" alt="Resource Usage" />
    </div>

    <div class="metric">
      <h2>结论与建议</h2>
      <ul>
        {{#recommendations}}
        <li>{{.}}</li>
        {{/recommendations}}
      </ul>
    </div>
  </body>
</html>
```

### 6.2 性能基准线

```yaml
# baseline.yaml
# 性能基准线 - 用于对比测试结果

version: '1.0'
updated: '2026-03-29'

metrics:
  latency:
    p50_ms:
      target: 10
      acceptable: 20
      warning: 50
    p99_ms:
      target: 50
      acceptable: 100
      warning: 200
    max_ms:
      target: 200
      acceptable: 500
      warning: 1000

  throughput:
    tasks_per_second:
      target: 500
      acceptable: 300
      warning: 100
    concurrent_tasks:
      target: 1000
      acceptable: 500
      warning: 100

  reliability:
    success_rate:
      target: 0.999
      acceptable: 0.995
      warning: 0.99
    error_rate:
      target: 0.001
      acceptable: 0.005
      warning: 0.01

  resources:
    cpu_usage_percent:
      target: 60
      acceptable: 75
      warning: 90
    memory_usage_percent:
      target: 70
      acceptable: 80
      warning: 95
```

---

## 7. 回归测试策略

### 7.1 CI/CD 集成

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # 每天凌晨 2 点运行

jobs:
  performance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Setup k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz -L | tar xz
          sudo mv k6-*/k6 /usr/local/bin/

      - name: Start Services
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for Services
        run: |
          sleep 30
          curl --retry 10 --retry-delay 5 --retry-connrefused http://localhost:8080/health

      - name: Run Quick Performance Tests
        run: |
          k6 run --duration 5m --vus 50 tests/quick_perf_test.js

      - name: Compare with Baseline
        run: |
          python scripts/compare_baseline.py results/latest baseline.yaml

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: results/
```

### 7.2 性能回归检测

```python
# regression_detector.py
import json
import sys
from typing import Dict, Any

def detect_regression(current: Dict[str, Any], baseline: Dict[str, Any], threshold: float = 0.1) -> list:
    """检测性能回归"""
    regressions = []

    def compare(current_val, baseline_val, metric_name, higher_is_better=True):
        if baseline_val == 0:
            return

        change = (current_val - baseline_val) / baseline_val

        if higher_is_better:
            if change < -threshold:  # 性能下降超过阈值
                regressions.append({
                    'metric': metric_name,
                    'baseline': baseline_val,
                    'current': current_val,
                    'change': f"{change*100:.1f}%",
                    'severity': 'high' if change < -0.2 else 'medium'
                })
        else:
            if change > threshold:  # 数值上升（延迟增加等）
                regressions.append({
                    'metric': metric_name,
                    'baseline': baseline_val,
                    'current': current_val,
                    'change': f"+{change*100:.1f}%",
                    'severity': 'high' if change > 0.2 else 'medium'
                })

    # 检查延迟
    compare(current['p50_latency_ms'], baseline['metrics']['latency']['p50_ms']['target'], 'P50 Latency', False)
    compare(current['p99_latency_ms'], baseline['metrics']['latency']['p99_ms']['target'], 'P99 Latency', False)

    # 检查吞吐量
    compare(current['throughput'], baseline['metrics']['throughput']['tasks_per_second']['target'], 'Throughput', True)

    # 检查成功率
    compare(current['success_rate'], baseline['metrics']['reliability']['success_rate']['target'], 'Success Rate', True)

    return regressions

if __name__ == '__main__':
    with open(sys.argv[1]) as f:
        current = json.load(f)
    with open(sys.argv[2]) as f:
        baseline = json.load(f)

    regressions = detect_regression(current, baseline)

    if regressions:
        print("⚠️ 检测到性能回归:")
        for r in regressions:
            print(f"  - {r['metric']}: {r['baseline']} -> {r['current']} ({r['change']})")
        sys.exit(1)
    else:
        print("✅ 未检测到性能回归")
        sys.exit(0)
```

---

## 8. 中国市场适配

### 8.1 网络延迟测试

```yaml
# network_test.yaml
name: network_latency_china
description: 测试中国主要区域的网络延迟

regions:
  - name: beijing
    endpoints:
      - api.scheduler.cn-north-1.example.com
  - name: shanghai
    endpoints:
      - api.scheduler.cn-east-1.example.com
  - name: guangzhou
    endpoints:
      - api.scheduler.cn-south-1.example.com
  - name: chengdu
    endpoints:
      - api.scheduler.cn-west-1.example.com

test_cases:
  - name: cross_region_latency
    description: 跨区域延迟测试
    from: beijing
    to: [shanghai, guangzhou, chengdu]

  - name: multi_region_concurrent
    description: 多区域并发测试
    regions: [beijing, shanghai, guangzhou, chengdu]
    concurrent_per_region: 50
```

### 8.2 国产云平台测试

| 平台         | 区域             | 测试内容 | 备注         |
| ------------ | ---------------- | -------- | ------------ |
| **阿里云**   | 华北、华东、华南 | 全量测试 | 主要生产环境 |
| **腾讯云**   | 华北、华东、华南 | 核心测试 | 备用环境     |
| **华为云**   | 华北、华东、华南 | 核心测试 | 政企场景     |
| **火山引擎** | 华北             | 核心测试 | 字节生态     |

---

## 9. 测试时间表

```
┌─────────────────────────────────────────────────────────────────┐
│                    性能测试时间表                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Week 1: 准备阶段                                                │
│  ├── Day 1-2: 环境搭建                                           │
│  ├── Day 3-4: 工具配置                                           │
│  └── Day 5: 预热测试                                             │
│                                                                  │
│  Week 2: 核心测试                                                │
│  ├── Day 1: 并发测试 (100+ tasks)                                │
│  ├── Day 2: 延迟测试                                             │
│  ├── Day 3: 吞吐量测试                                           │
│  ├── Day 4: 资源利用率测试                                       │
│  └── Day 5: 结果分析                                             │
│                                                                  │
│  Week 3: 扩展测试                                                │
│  ├── Day 1-2: 分布式场景测试                                     │
│  ├── Day 3-4: 故障恢复测试                                       │
│  └── Day 5: 回归测试                                             │
│                                                                  │
│  Week 4: 报告与优化                                              │
│  ├── Day 1-2: 报告编写                                           │
│  ├── Day 3-4: 问题修复                                           │
│  └── Day 5: 复测验证                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 参考文献

### 性能测试方法论

1. **"Systems Performance"** - Brendan Gregg
   - 系统性能分析方法

2. **"Web Performance Testing"** - O'Reilly
   - Web 应用性能测试

3. **Google SRE Book** - Chapter: "Practical Alerting"
   - 监控和告警最佳实践

### 工具文档

1. **k6 Documentation** - https://k6.io/docs/
2. **Prometheus Best Practices** - https://prometheus.io/docs/practices/
3. **Grafana Dashboard Guide** - https://grafana.com/docs/grafana/latest/dashboards/

### 相关标准

1. **ISO/IEC 25010** - 软件质量模型
2. **RFC 2544** - 网络设备基准测试
3. **SPEC CPU 2017** - CPU 性能基准

---

## 11. 结论

本性能基准测试计划为 AgentScheduler 提供了全面的测试框架：

### 核心价值

1. **全面覆盖**: 涵盖并发、延迟、吞吐量、资源四大维度
2. **可重复性**: 标准化测试流程，确保结果可复现
3. **自动化**: CI/CD 集成，持续监控性能
4. **可追溯**: 基准线对比，及时发现回归

### 下一步行动

1. ✅ 搭建测试环境
2. ✅ 配置监控工具
3. ✅ 编写测试脚本
4. ⏳ 执行测试计划
5. ⏳ 分析结果并优化

---

_文档完成于 2026-03-29_
_下次更新: 测试执行后_

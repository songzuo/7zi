# AgentScheduler 系统部署文档

**版本**: v1.0.0  
**更新日期**: 2026-03-29  
**维护者**: 🛡️ 系统管理员

---

## 📋 目录

1. [系统概述](#系统概述)
2. [环境要求](#环境要求)
3. [安装步骤](#安装步骤)
4. [配置说明](#配置说明)
5. [部署脚本](#部署脚本)
6. [监控和日志](#监控和日志)
7. [故障排查](#故障排查)
8. [更新维护](#更新维护)

---

## 系统概述

AgentScheduler 是一个 AI 智能调度系统，负责协调和管理 11 位 AI 子代理的任务分配和执行。系统基于智能匹配算法、负载均衡和优先级调度，确保任务高效分配给最合适的代理。

### 核心组件

- **调度器核心** (`scheduler.ts`) - 任务调度和分配逻辑
- **匹配引擎** (`matching.ts`) - 能力匹配和候选排序
- **负载均衡器** (`load-balancer.ts`) - 负载监控和优化
- **状态管理** (`scheduler-store.ts`) - Zustand store 状态管理
- **配置管理** - 多环境配置支持

### 技术栈

- **运行时**: Node.js v18+ / v20+
- **语言**: TypeScript 5.x
- **框架**: Next.js 14+ (App Router)
- **状态管理**: Zustand
- **测试**: Vitest / Jest
- **部署**: Docker / Kubernetes

---

## 环境要求

### 最低要求

| 组件       | 版本要求              | 说明                       |
| ---------- | --------------------- | -------------------------- |
| Node.js    | v18.17.0 或 v20.0.0+  | 推荐使用 LTS 版本          |
| npm        | 9.0.0+ 或 pnpm 8.0.0+ | 包管理器                   |
| TypeScript | 5.0.0+                | 编译目标 ES2020            |
| PostgreSQL | 13.0+                 | 数据库存储                 |
| Redis      | 6.0+                  | 生产环境必需（缓存和队列） |
| 内存       | 2GB+                  | 开发环境最低配置           |
| 磁盘       | 10GB+                 | 包含日志和数据存储         |

### 推荐配置（生产环境）

| 组件       | 规格                      |
| ---------- | ------------------------- |
| CPU        | 4 核心以上                |
| 内存       | 8GB+                      |
| 磁盘       | SSD 50GB+                 |
| PostgreSQL | 15.0+ （独立服务器）      |
| Redis      | 7.0+ （独立服务器或集群） |
| 备份       | 每日自动备份              |

### 依赖软件

```bash
# 必需软件
nodejs, npm, postgresql, redis

# 可选软件
docker, docker-compose, kubectl (Kubernetes 部署)
```

---

## 安装步骤

### 方式一：本地开发环境安装

#### 1. 克隆代码仓库

```bash
# 进入工作目录
cd /root/.openclaw/workspace

# 确认代码已存在（如果是从现有项目安装）
ls -la src/lib/agent-scheduler/
```

#### 2. 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（更快）
pnpm install

# 或使用 yarn
yarn install
```

#### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 应用环境
NODE_ENV=development

# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/agent_scheduler_dev

# Redis 配置（生产环境必需）
REDIS_URL=redis://localhost:6379

# API 配置
PORT=3001
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 日志配置
LOG_LEVEL=debug

# 调度器配置
SCHEDULER_INTERVAL=60000
MAX_CONCURRENCY=2
```

#### 4. 初始化数据库

```bash
# 创建数据库
createdb agent_scheduler_dev

# 运行迁移（如果有）
npm run db:migrate

# 或使用 Prisma
npx prisma migrate dev
```

#### 5. 启动 Redis（开发环境）

```bash
# Linux/Mac
redis-server --port 6379

# 或使用 Docker
docker run -d -p 6379:6379 redis:7-alpine
```

#### 6. 启动开发服务器

```bash
# 启动 Next.js 开发服务器
npm run dev

# 或单独启动调度器服务
npm run scheduler:dev
```

#### 7. 验证安装

```bash
# 运行测试
npm test

# 访问健康检查端点
curl http://localhost:3001/api/health

# 访问调度器状态
curl http://localhost:3001/api/scheduler/status
```

---

### 方式二：生产环境部署（Docker）

#### 1. 构建镜像

```bash
cd /root/.openclaw/workspace

# 构建生产镜像
docker build -t agent-scheduler:1.0.0 -f Dockerfile .

# 或使用 Docker Compose（推荐）
docker-compose build
```

#### 2. 配置生产环境变量

创建 `.env.production`：

```env
NODE_ENV=production

# 数据库配置（生产环境）
DATABASE_URL=postgresql://scheduler_user:secure_password@postgres:5432/agent_scheduler_prod

# Redis 配置
REDIS_URL=redis://redis:6379

# API 配置
PORT=3000
CORS_ORIGINS=https://7zi.com,https://www.7zi.com

# 日志配置
LOG_LEVEL=info

# 调度器配置
SCHEDULER_INTERVAL=30000
MAX_CONCURRENCY=5
```

#### 3. 启动容器

```bash
# 使用 Docker Compose（推荐）
docker-compose -f docker-compose.prod.yml up -d

# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f scheduler
```

#### 4. 健康检查

```bash
# 检查服务健康
curl https://api.7zi.com/api/health

# 检查调度器状态
curl https://api.7zi.com/api/scheduler/status
```

---

### 方式三：Kubernetes 部署

#### 1. 创建命名空间

```bash
kubectl create namespace agent-scheduler
```

#### 2. 部署 PostgreSQL（如果使用外部数据库，跳过此步）

```bash
kubectl apply -f k8s/postgres/
```

#### 3. 部署 Redis（如果使用外部 Redis，跳过此步）

```bash
kubectl apply -f k8s/redis/
```

#### 4. 配置密钥

```bash
# 创建数据库密钥
kubectl create secret generic db-credentials \
  --from-literal=database-url="postgresql://user:pass@postgres:5432/scheduler" \
  -n agent-scheduler

# 创建 Redis 密钥
kubectl create secret generic redis-credentials \
  --from-literal=redis-url="redis://redis:6379" \
  -n agent-scheduler
```

#### 5. 部署应用

```bash
kubectl apply -f k8s/scheduler/
```

#### 6. 验证部署

```bash
# 检查 Pod 状态
kubectl get pods -n agent-scheduler

# 检查服务
kubectl get svc -n agent-scheduler

# 查看日志
kubectl logs -f deployment/agent-scheduler -n agent-scheduler
```

---

## 配置说明

### 1. Agent 能力配置

**文件**: `src/lib/agent-scheduler/config/agent-capabilities.json`

包含 11 个 AI 代理的完整能力配置：

```json
{
  "id": "agent-expert",
  "name": "智能体世界专家",
  "type": "strategic",
  "technicalStack": ["multi-agent-systems", "ai-architecture"],
  "taskTypes": ["architecture", "research", "general"],
  "maxConcurrentTasks": 3,
  "successRate": 0.95,
  "avgResponseTime": 8,
  "availability": true
}
```

**配置项说明**:

| 字段                 | 类型     | 说明                                             |
| -------------------- | -------- | ------------------------------------------------ |
| `id`                 | string   | 代理唯一标识符                                   |
| `name`               | string   | 代理显示名称                                     |
| `type`               | string   | 代理类型（strategic, research, technical, etc.） |
| `technicalStack`     | string[] | 技术栈数组                                       |
| `taskTypes`          | string[] | 可处理的任务类型                                 |
| `maxConcurrentTasks` | number   | 最大并发任务数                                   |
| `successRate`        | number   | 成功率（0-1）                                    |
| `avgResponseTime`    | number   | 平均响应时间（秒）                               |
| `availability`       | boolean  | 是否可用                                         |

### 2. 调度规则配置

**文件**: `src/lib/agent-scheduler/config/scheduling-rules.json`

包含调度系统的核心规则：

```json
{
  "autoScheduleInterval": 30000,
  "maxBatchSize": 10,
  "loadThresholds": {
    "low": 30,
    "medium": 60,
    "high": 80,
    "critical": 95
  },
  "priorityWeights": {
    "urgent": 100,
    "high": 75,
    "medium": 50,
    "low": 25
  },
  "scoreWeights": {
    "capabilityMatch": 0.4,
    "loadBalance": 0.3,
    "successRate": 0.2,
    "responseTime": 0.1
  }
}
```

**配置项说明**:

| 字段                   | 类型   | 说明                      |
| ---------------------- | ------ | ------------------------- |
| `autoScheduleInterval` | number | 自动调度间隔（毫秒）      |
| `maxBatchSize`         | number | 单次批量处理的最大任务数  |
| `loadThresholds`       | object | 负载阈值（低/中/高/危急） |
| `priorityWeights`      | object | 优先级权重                |
| `scoreWeights`         | object | 评分权重（影响调度决策）  |

### 3. 环境配置

**文件**: `src/lib/agent-scheduler/config/environment.ts`

包含开发/测试/生产环境配置：

```typescript
export interface SchedulerEnvironmentConfig {
  env: Environment
  debug: boolean
  scheduleInterval: number
  database: { url: string; poolSize: number }
  redis: { enabled: boolean; url?: string; prefix: string }
  api: { port: number; corsOrigins: string[]; rateLimit: number }
  monitoring: { enabled: boolean; logLevel: 'debug' | 'info' | 'warn' | 'error' }
}
```

**环境说明**:

| 环境          | 调度间隔 | 调试模式 | 监控 |
| ------------- | -------- | -------- | ---- |
| `development` | 60s      | ✅       | 部分 |
| `testing`     | 10s      | ✅       | 关闭 |
| `production`  | 30s      | ❌       | 完整 |

---

## 部署脚本

### 本地开发脚本

创建 `scripts/dev.sh`：

```bash
#!/bin/bash

set -e

echo "🚀 Starting AgentScheduler Development Environment..."

# 检查 Node.js 版本
node_version=$(node -v)
echo "✅ Node.js version: $node_version"

# 安装依赖
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# 检查 PostgreSQL
if ! pg_isready -q; then
  echo "⚠️  PostgreSQL is not running. Starting it..."
  sudo systemctl start postgresql
fi

# 检查 Redis
if ! redis-cli ping > /dev/null 2>&1; then
  echo "⚠️  Redis is not running. Starting it..."
  redis-server --daemonize yes
fi

# 加载环境变量
export $(cat .env.local | xargs)

# 运行数据库迁移
echo "🗄️  Running database migrations..."
npm run db:migrate

# 启动开发服务器
echo "🎯 Starting Next.js development server..."
npm run dev
```

### 生产部署脚本

创建 `scripts/deploy.sh`：

```bash
#!/bin/bash

set -e

echo "🚀 Deploying AgentScheduler to Production..."

# 构建项目
echo "🔨 Building project..."
npm run build

# 运行测试
echo "🧪 Running tests..."
npm test -- --passWithNoTests

# 停止旧容器（如果存在）
echo "🛑 Stopping old containers..."
docker-compose down

# 拉取最新镜像
echo "📥 Pulling latest images..."
docker-compose pull

# 启动新容器
echo "🚀 Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ Waiting for services to start..."
sleep 10

# 健康检查
echo "🏥 Running health checks..."
curl -f http://localhost:3000/api/health || exit 1

echo "✅ Deployment successful!"
```

### 数据库备份脚本

创建 `scripts/backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/agent-scheduler"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/scheduler_$DATE.sql"

mkdir -p $BACKUP_DIR

echo "💾 Backing up database..."
pg_dump $DATABASE_URL > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

echo "✅ Backup created: $BACKUP_FILE.gz"

# 清理 30 天前的备份
find $BACKUP_DIR -name "scheduler_*.sql.gz" -mtime +30 -delete

echo "🧹 Old backups cleaned up"
```

### 监控脚本

创建 `scripts/monitor.sh`：

```bash
#!/bin/bash

echo "📊 AgentScheduler System Status"
echo "================================"

# 检查服务状态
echo -e "\n🔹 Service Status:"
curl -s http://localhost:3000/api/health | jq '.'

# 检查调度器状态
echo -e "\n🔹 Scheduler Status:"
curl -s http://localhost:3000/api/scheduler/status | jq '.'

# 检查数据库连接
echo -e "\n🔹 Database Status:"
pg_isready -h $DB_HOST -p $DB_PORT

# 检查 Redis 连接
echo -e "\n🔹 Redis Status:"
redis-cli ping

# 检查磁盘空间
echo -e "\n🔹 Disk Space:"
df -h /var/lib/postgresql | tail -1

# 检查内存使用
echo -e "\n🔹 Memory Usage:"
free -h | grep Mem

# 检查最近的错误日志
echo -e "\n🔹 Recent Errors:"
journalctl -u agent-scheduler -n 10 --no-pager | grep -i error || echo "No errors found"
```

---

## 监控和日志

### 1. 日志级别

| 级别    | 用途         | 示例场景             |
| ------- | ------------ | -------------------- |
| `debug` | 详细调试信息 | 调度算法详细步骤     |
| `info`  | 一般信息     | 任务分配成功         |
| `warn`  | 警告信息     | 负载接近阈值         |
| `error` | 错误信息     | 任务失败、代理不可用 |

### 2. 日志位置

**开发环境**:

- 控制台输出（使用 Winston）
- 日志目录: `logs/agent-scheduler.log`

**生产环境**:

- 系统日志: `/var/log/agent-scheduler/`
- Docker 日志: `docker-compose logs -f scheduler`
- Kubernetes 日志: `kubectl logs -f deployment/agent-scheduler`

### 3. 监控指标

#### 系统指标

```bash
# 查看 CPU 使用率
top -p $(pgrep -f agent-scheduler)

# 查看内存使用
ps aux | grep agent-scheduler

# 查看磁盘 I/O
iostat -x 1
```

#### 应用指标

**健康检查端点**: `/api/health`

```json
{
  "status": "ok",
  "timestamp": "2026-03-29T09:00:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**调度器状态端点**: `/api/scheduler/status`

```json
{
  "schedulerRunning": true,
  "lastScheduleTime": "2026-03-29T09:00:00Z",
  "activeTasks": 5,
  "pendingTasks": 12,
  "agents": {
    "total": 11,
    "available": 9,
    "busy": 2
  },
  "loadMetrics": {
    "avgLoad": 45,
    "maxLoad": 80
  }
}
```

### 4. 告警配置

#### 告警规则

| 条件                | 严重级别    | 通知方式        |
| ------------------- | ----------- | --------------- |
| 调度器停止运行      | 🔴 Critical | Telegram, Email |
| 数据库连接失败      | 🔴 Critical | Telegram, Email |
| Redis 连接失败      | 🟠 Warning  | Telegram        |
| 任务失败率 > 10%    | 🟠 Warning  | Telegram        |
| 代理负载 > 80%      | 🟡 Info     | 日志            |
| 待处理任务积压 > 50 | 🟡 Info     | 日志            |

#### 告警通知（Telegram）

配置 Webhook 或使用 Telegram Bot API：

```typescript
// 发送告警消息
async function sendAlert(message: string, level: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  const emoji = {
    critical: '🔴',
    warning: '🟠',
    info: '🟡',
  }

  const text = `${emoji[level] || '⚠️'} [AgentScheduler] ${message}`

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
```

### 5. 性能监控

#### 使用 Prometheus + Grafana（可选）

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'agent-scheduler'
    static_configs:
      - targets: ['agent-scheduler:9090']
```

#### 关键指标

- `scheduler_tasks_total` - 总任务数
- `scheduler_tasks_pending` - 待处理任务数
- `scheduler_tasks_active` - 活跃任务数
- `scheduler_agents_available` - 可用代理数
- `scheduler_schedule_duration` - 调度耗时
- `scheduler_task_completion_time` - 任务完成时间

---

## 故障排查

### 常见问题

#### 1. 调度器不运行

**症状**: 任务一直处于 pending 状态

**排查步骤**:

```bash
# 检查调度器进程
ps aux | grep scheduler

# 查看调度器日志
tail -f logs/agent-scheduler.log | grep scheduler

# 检查调度器状态
curl http://localhost:3000/api/scheduler/status
```

**解决方案**:

```bash
# 重启调度器服务
systemctl restart agent-scheduler

# 或手动启动
npm run scheduler:start
```

#### 2. 数据库连接失败

**症状**: 日志中出现 "ECONNREFUSED" 或 "Connection refused"

**排查步骤**:

```bash
# 检查 PostgreSQL 服务
systemctl status postgresql

# 检查数据库连接
pg_isready -h localhost -p 5432

# 检查数据库是否存在
psql -lqt | cut -d \| -f 1 | grep -w agent_scheduler
```

**解决方案**:

```bash
# 启动 PostgreSQL
sudo systemctl start postgresql

# 创建数据库
createdb agent_scheduler

# 检查连接字符串
echo $DATABASE_URL
```

#### 3. Redis 连接失败

**症状**: 生产环境缓存不工作，性能下降

**排查步骤**:

```bash
# 检查 Redis 服务
systemctl status redis

# 测试 Redis 连接
redis-cli ping

# 检查 Redis 日志
tail -f /var/log/redis/redis-server.log
```

**解决方案**:

```bash
# 启动 Redis
sudo systemctl start redis

# 或使用 Docker
docker run -d -p 6379:6379 redis:7-alpine
```

#### 4. 任务分配失败

**症状**: 任务无法分配给任何代理

**排查步骤**:

```bash
# 检查代理可用性
curl http://localhost:3000/api/scheduler/agents | jq '.[] | {id, name, availability}'

# 检查代理负载
curl http://localhost:3000/api/scheduler/agents | jq '.[] | {id, name, currentLoad}'

# 查看任务详情
curl http://localhost:3000/api/scheduler/tasks/{taskId}
```

**解决方案**:

1. 检查任务类型与代理能力是否匹配
2. 检查代理负载是否过高
3. 调整调度规则配置中的 `scoreWeights`

#### 5. 性能问题

**症状**: 调度延迟高，响应慢

**排查步骤**:

```bash
# 检查系统资源
htop

# 检查数据库性能
pg_stat_activity

# 检查慢查询
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"

# 检查应用日志中的性能指标
tail -f logs/agent-scheduler.log | grep "duration\|timing"
```

**解决方案**:

1. 增加数据库连接池大小
2. 启用 Redis 缓存
3. 优化调度算法
4. 增加 `scheduleInterval` 以减少调度频率

---

## 更新维护

### 版本更新

#### 1. 备份数据

```bash
# 备份数据库
./scripts/backup.sh

# 备份配置文件
cp -r config config.backup.$(date +%Y%m%d)
```

#### 2. 拉取更新

```bash
# 获取最新代码
git pull origin main

# 更新依赖
npm update
```

#### 3. 运行迁移

```bash
# 运行数据库迁移
npm run db:migrate

# 更新配置文件（如果有变更）
cp config/*.json.backup config/
```

#### 4. 重启服务

```bash
# 本地开发
npm run scheduler:restart

# Docker
docker-compose restart

# Kubernetes
kubectl rollout restart deployment/agent-scheduler -n agent-scheduler
```

#### 5. 验证更新

```bash
# 检查版本
curl http://localhost:3000/api/health | jq '.version'

# 运行测试
npm test

# 检查日志
tail -f logs/agent-scheduler.log
```

### 定期维护

#### 每日

- 检查日志中的错误和警告
- 监控系统资源使用
- 检查任务积压情况

#### 每周

- 分析性能指标
- 审查代理效率
- 检查备份完整性

#### 每月

- 更新依赖包
- 审查和优化配置
- 清理旧日志和数据
- 安全审计

---

## 支持和联系

### 文档资源

- [AgentScheduler 实现报告](./AGENT_SCHEDULER_IMPLEMENTATION_20260329.md)
- [v1.4.0 规划文档](./V140_PLANNING_20260329.md)
- [AGENTS.md](./AGENTS.md)

### 联系方式

- **维护者**: 🛡️ 系统管理员
- **问题反馈**: 通过 OpenClaw 反馈
- **紧急联系**: Telegram 告警

---

## 附录

### A. 环境变量参考

完整的环境变量列表：

```env
# 应用环境
NODE_ENV=development|testing|production

# 数据库
DATABASE_URL=postgresql://user:password@host:5432/database
DB_POOL_MIN=2
DB_POOL_MAX=20

# Redis
REDIS_URL=redis://host:6379
REDIS_PREFIX=scheduler:

# API
PORT=3000
CORS_ORIGINS=https://example.com
RATE_LIMIT=100

# 调度器
SCHEDULER_INTERVAL=30000
MAX_CONCURRENCY=5
TASK_TIMEOUT=3600000

# 监控
LOG_LEVEL=info
METRICS_PORT=9090
ENABLE_MONITORING=true

# 告警
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
ALERT_ON_FAILURE=true
ALERT_ON_OVERLOAD=true

# 其他
TZ=Asia/Shanghai
NODE_OPTIONS=--max-old-space-size=4096
```

### B. 端口参考

| 端口 | 服务       | 环境               |
| ---- | ---------- | ------------------ |
| 3000 | 生产 API   | Production         |
| 3001 | 开发 API   | Development        |
| 3002 | 测试 API   | Testing            |
| 5432 | PostgreSQL | All                |
| 6379 | Redis      | Production/Testing |
| 9090 | Metrics    | Production         |

### C. 目录结构

```
src/lib/agent-scheduler/
├── config/
│   ├── agent-capabilities.json    # Agent 能力配置
│   ├── scheduling-rules.json      # 调度规则配置
│   └── environment.ts             # 环境配置
├── core/
│   ├── scheduler.ts               # 调度器核心
│   ├── matching.ts                # 任务匹配算法
│   ├── ranking.ts                 # 候选排序
│   └── load-balancer.ts           # 负载均衡
├── models/
│   ├── agent-capability.ts        # Agent 能力模型
│   ├── task-model.ts              # 任务模型
│   └── schedule-decision.ts       # 调度决策模型
└── stores/
    └── scheduler-store.ts         # 调度状态管理

scripts/
├── dev.sh                         # 开发环境启动
├── deploy.sh                      # 生产部署脚本
├── backup.sh                      # 数据库备份
└── monitor.sh                     # 监控脚本

logs/
└── agent-scheduler.log            # 应用日志

k8s/
├── postgres/                      # PostgreSQL 部署
├── redis/                         # Redis 部署
└── scheduler/                     # 调度器部署
```

---

**文档结束**

_最后更新: 2026-03-29_

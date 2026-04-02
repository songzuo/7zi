# 7zi 项目 v1.7.0 部署方案

> 📅 制定日期：2026-04-02
> 🎯 版本：v1.7.0
> 👤 制定者：系统管理员（运维部署专家）
> 📋 文档版本：1.0

---

## 目录

- [1. 概述](#1-概述)
- [2. 服务器资源规划](#2-服务器资源规划)
- [3. Docker 镜像构建和发布流程](#3-docker-镜像构建和发布流程)
- [4. 数据库迁移策略](#4-数据库迁移策略)
- [5. 灰度发布计划](#5-灰度发布计划)
- [6. 监控和告警配置](#6-监控和告警配置)
- [7. 回滚方案](#7-回滚方案)
- [8. 部署检查清单](#8-部署检查清单)

---

## 1. 概述

### 1.1 v1.7.0 版本亮点

| 功能模块 | 完成度 | 影响范围 |
|---------|--------|----------|
| 🔗 **A2A Protocol v2.1** | 100% | Agent 通信协议升级 |
| ⚡ **Workflow Executor 重构** | 100% | 工作流执行性能提升 |
| 🎨 **UI 一致性审计** | 100% | 前端样式优化 |
| 🧪 **分支覆盖率提升** | 100% | 测试覆盖率 98%+ |
| 📣 **SEO 推广** | 100% | SEO 优化 |
| 📺 **媒体内容系统** | 100% | 内容管理功能 |

### 1.2 部署目标

- **零停机部署**：蓝绿部署策略，确保服务不中断
- **灰度发布**：支持按比例灰度，降低风险
- **快速回滚**：< 2 分钟完成回滚
- **自动化验证**：部署后自动健康检查和冒烟测试
- **集群扩展**：从当前 2 台扩展到 8 台服务器

### 1.3 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| Next.js | 16.2.1 | React 全栈框架 |
| Node.js | 22.x LTS | 运行时环境 |
| Docker | 最新 | 容器化 |
| Nginx | 最新 | 反向代理 |
| SQLite | 3.x | 数据库 |
| Redis | 7.x | 缓存（可选） |

---

## 2. 服务器资源规划

### 2.1 当前服务器状态

| 服务器 | IP | 角色 | 状态 | 配置建议 |
|--------|-----|------|------|----------|
| **7zi.com** | 165.99.43.61 | 主服务器 | ✅ 已配置 | 保持不变 |
| **bot5.szspd.cn** | 182.43.36.134 | 测试服务器 | ✅ 已配置 | 保持不变 |

### 2.2 目标集群架构（8 台服务器）

```
┌─────────────────────────────────────────────────────────────┐
│                         用户请求                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    负载均衡层 (2 台)                          │
│  ┌──────────────┐              ┌──────────────┐             │
│  │   lb-01      │   ← 故障转移 →  │   lb-02      │             │
│  │  Keepalived  │              │  Keepalived  │             │
│  │  HAProxy     │              │  HAProxy     │             │
│  └──────────────┘              └──────────────┘             │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    应用服务层 (3 台)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   web-01     │  │   web-02     │  │   web-03     │       │
│  │  Next.js     │  │  Next.js     │  │  Next.js     │       │
│  │  Docker      │  │  Docker      │  │  Docker      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    网关服务层 (2 台)                          │
│  ┌──────────────┐              ┌──────────────┐             │
│  │   gw-01      │   ← 集群 →   │   gw-02      │             │
│  │  OpenClaw    │              │  OpenClaw    │             │
│  │  Gateway     │              │  Gateway     │             │
│  └──────────────┘              └──────────────┘             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据持久层 (1 台)                          │
│  ┌──────────────────────────────────────────────┐           │
│  │                  db-01                       │           │
│  │  SQLite + Litestream (主库)                  │           │
│  │  Redis (缓存)                                │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 服务器配置建议

| 角色 | 数量 | CPU | 内存 | 存储 | 网络 |
|------|------|-----|------|------|------|
| 负载均衡器 (lb) | 2 | 2核 | 4GB | 50GB SSD | 100Mbps |
| Web 服务器 (web) | 3 | 4核 | 8GB | 100GB SSD | 200Mbps |
| API 网关 (gw) | 2 | 4核 | 8GB | 100GB SSD | 200Mbps |
| 数据库 (db) | 1 | 4核 | 16GB | 500GB SSD | 500Mbps |

### 2.4 v1.7.0 部署建议

**当前阶段（单服务器）**：
- 继续使用 7zi.com 作为主服务器
- 资源足够支撑 v1.7.0 的所有功能
- 无需紧急扩展

**下一阶段（集群化）**：
- 优先部署负载均衡器 (lb-01, lb-02)
- 扩展 Web 服务器 (web-01, web-02, web-03)
- 部署网关集群 (gw-01, gw-02)
- 数据库独立部署

---

## 3. Docker 镜像构建和发布流程

### 3.1 镜像构建策略

#### 多阶段构建 Dockerfile

项目已使用优化的多阶段构建：

```dockerfile
# 阶段 1: 依赖安装
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev sqlite-dev
COPY package.json package-lock.json* ./
RUN npm ci --only=production --legacy-peer-deps

# 阶段 2: 构建
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++ vips-dev sqlite-dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 阶段 3: 运行
FROM node:22-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

#### 镜像大小优化

| 优化项 | 优化前 | 优化后 | 改进 |
|--------|--------|--------|------|
| 基础镜像 | node:22 | node:22-alpine | -600MB |
| 多阶段构建 | 单阶段 | 三阶段 | -400MB |
| 依赖分离 | 全量 | 仅生产依赖 | -200MB |
| **最终大小** | ~1.2GB | **~200MB** | **-83%** |

### 3.2 镜像发布流程

#### GitHub Actions 自动构建

```yaml
# .github/workflows/ci.yml (已配置)
docker:
  name: Docker 构建
  runs-on: ubuntu-latest
  needs: [build]
  if: github.ref == 'refs/heads/main'
  steps:
    - name: 构建并推送
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile.optimized
        push: true
        tags: |
          ghcr.io/songzuo/7zi:latest
          ghcr.io/songzuo/7zi:v1.7.0
          ghcr.io/songzuo/7zi:${{ github.run_number }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64,linux/arm64
```

#### 镜像标签策略

| 标签 | 用途 | 示例 |
|------|------|------|
| `latest` | 最新稳定版本 | `ghcr.io/songzuo/7zi:latest` |
| `v{版本号}` | 版本标签 | `ghcr.io/songzuo/7zi:v1.7.0` |
| `{build号}` | 构建标签 | `ghcr.io/songzuo/7zi:123` |
| `{commit}` | 提交标签 | `ghcr.io/songzuo/7zi:abc123` |

### 3.3 手动构建命令

```bash
# 本地构建
docker build -f Dockerfile.optimized -t 7zi-frontend:v1.7.0 .

# 推送到 Registry
docker tag 7zi-frontend:v1.7.0 ghcr.io/songzuo/7zi:v1.7.0
docker push ghcr.io/songzuo/7zi:v1.7.0

# 在服务器上拉取
ssh root@7zi.com "docker pull ghcr.io/songzuo/7zi:v1.7.0"
```

### 3.4 构建缓存优化

#### GitHub Actions 缓存层

```yaml
# 缓存 node_modules
- name: 缓存 node_modules
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}

# 缓存 Next.js 构建缓存
- name: 缓存 Next.js turbo
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-turbo-${{ hashFiles('**/package-lock.json') }}

# Docker GHA cache
- name: 构建并推送
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

#### 构建性能对比

| 指标 | 无缓存 | 有缓存 | 改进 |
|------|--------|--------|------|
| npm install | 2-3 分钟 | < 10 秒 | -95% |
| Next.js 构建 | 5-8 分钟 | 1-3 分钟 | -70% |
| Docker 构建 | 5-10 分钟 | 1-2 分钟 | -80% |
| **总构建时间** | 20-30 分钟 | **8-12 分钟** | **-60%** |

---

## 4. 数据库迁移策略

### 4.1 v1.7.0 数据库变更

根据 v1.7.0 的功能更新，涉及的数据库变更：

| 模块 | 变更类型 | 影响 |
|------|---------|------|
| A2A Protocol v2.1 | Schema 更新 | 新增消息队列表 |
| Workflow Executor | 数据结构变更 | 工作流执行记录 |
| 媒体内容系统 | 新增表 | 媒体资源管理 |

### 4.2 迁移策略

#### SQLite 迁移脚本

```bash
#!/bin/bash
# scripts/migrate-v170.sh

set -e

DB_PATH="/opt/7zi/data/db.sqlite"
BACKUP_PATH="/opt/backups/db-$(date +%Y%m%d-%H%M%S).sqlite"

echo "=== v1.7.0 数据库迁移 ==="

# 1. 备份数据库
echo "📦 备份数据库..."
cp "$DB_PATH" "$BACKUP_PATH"
echo "✓ 备份已创建: $BACKUP_PATH"

# 2. 执行迁移
echo "🔧 执行迁移..."
sqlite3 "$DB_PATH" << 'EOF'
-- A2A Protocol v2.1 消息队列表
CREATE TABLE IF NOT EXISTS a2a_message_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL UNIQUE,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- 工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id TEXT NOT NULL,
    execution_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    input TEXT,
    output TEXT,
    error TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_ms INTEGER
);

-- 媒体资源表
CREATE TABLE IF NOT EXISTS media_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    metadata TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_a2a_message_status ON a2a_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_a2a_message_priority ON a2a_message_queue(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_started ON workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_resources(type);

EOF

echo "✓ 迁移完成"

# 3. 验证迁移
echo "🔍 验证迁移..."
sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table';"

# 4. 优化数据库
echo "⚡ 优化数据库..."
sqlite3 "$DB_PATH" "VACUUM; ANALYZE;"

echo "✅ 数据库迁移完成！"
```

### 4.3 迁移执行步骤

```bash
# 1. 在部署前备份数据库
ssh root@7zi.com "cp /opt/7zi/data/db.sqlite /opt/backups/db-pre-v170.sqlite"

# 2. 部署新版本容器（蓝绿部署）
./deploy-zero-downtime.sh deploy

# 3. 执行数据库迁移（在新容器中）
ssh root@7zi.com "docker exec 7zi-frontend-green /app/scripts/migrate-v170.sh"

# 4. 验证迁移结果
ssh root@7zi.com "docker exec 7zi-frontend-green sqlite3 /app/data/db.sqlite '.tables'"

# 5. 切换流量到新版本
# (蓝绿部署脚本自动完成)
```

### 4.4 回滚时的数据库处理

```bash
#!/bin/bash
# scripts/rollback-db-v170.sh

echo "=== 数据库回滚 ==="

# 1. 停止应用（防止数据不一致）
docker stop 7zi-frontend-blue 7zi-frontend-green

# 2. 恢复数据库备份
BACKUP_FILE="/opt/backups/db-pre-v170.sqlite"
if [ -f "$BACKUP_FILE" ]; then
    cp "$BACKUP_FILE" /opt/7zi/data/db.sqlite
    echo "✓ 数据库已回滚到: $BACKUP_FILE"
else
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 3. 重启旧版本应用
docker start 7zi-frontend-blue

echo "✅ 回滚完成"
```

---

## 5. 灰度发布计划

### 5.1 灰度发布策略

v1.7.0 支持以下灰度发布策略：

| 策略 | 描述 | 适用场景 |
|------|------|----------|
| **蓝绿部署** | 完全切换，旧版本保留 | 低风险更新 |
| **金丝雀发布** | 逐步增加流量比例 | 高风险更新 |
| **A/B 测试** | 按用户特征分流 | 功能验证 |

### 5.2 金丝雀发布配置

#### Nginx 配置（按权重分流）

```nginx
# /etc/nginx/conf.d/canary.conf

upstream backend_v170 {
    server 127.0.0.1:3000 weight=90;  # 旧版本 (90%)
    server 127.0.0.1:3001 weight=10;  # 新版本 (10%)
}

server {
    listen 443 ssl http2;
    server_name 7zi.com;

    location / {
        proxy_pass http://backend_v170;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # 标记版本（用于监控）
        add_header X-Deploy-Version "v1.7.0-canary" always;
    }
}
```

#### 灰度发布时间表

| 阶段 | 流量比例 | 持续时间 | 验证项 |
|------|---------|---------|--------|
| **阶段 1** | 10% | 2 小时 | 错误率、响应时间 |
| **阶段 2** | 30% | 4 小时 | 用户反馈、性能指标 |
| **阶段 3** | 50% | 8 小时 | 全面监控 |
| **阶段 4** | 100% | - | 全量发布 |

### 5.3 灰度发布脚本

```bash
#!/bin/bash
# scripts/deploy/canary-deploy.sh

set -euo pipefail

CANARY_WEIGHT=${1:-10}  # 默认 10%

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 验证参数
if [ "$CANARY_WEIGHT" -lt 0 ] || [ "$CANARY_WEIGHT" -gt 100 ]; then
    log_error "Invalid weight: $CANARY_WEIGHT (0-100)"
    exit 1
fi

# 计算旧版本权重
STABLE_WEIGHT=$((100 - CANARY_WEIGHT))

log_info "🚀 开始灰度发布..."
log_info "  新版本 (v1.7.0): ${CANARY_WEIGHT}%"
log_info "  旧版本: ${STABLE_WEIGHT}%"

# 更新 Nginx 配置
ssh root@7zi.com << EOF
    cat > /etc/nginx/conf.d/upstream.conf << UPSTREAM
upstream backend {
    server 127.0.0.1:3000 weight=${STABLE_WEIGHT};
    server 127.0.0.1:3001 weight=${CANARY_WEIGHT};
}
UPSTREAM

    # 验证并重载
    nginx -t && systemctl reload nginx
EOF

log_info "✅ 灰度发布配置完成"

# 等待并监控
log_info "⏳ 等待流量稳定..."
sleep 60

# 检查健康状态
log_info "🔍 检查服务健康..."
curl -sf https://7zi.com/api/health || log_error "健康检查失败"

log_info "✅ 灰度发布完成！当前流量分配: ${CANARY_WEIGHT}%"
```

### 5.4 灰度发布流程

```bash
# 阶段 1: 10% 流量
./scripts/deploy/canary-deploy.sh 10

# 监控 2 小时后，阶段 2: 30% 流量
./scripts/deploy/canary-deploy.sh 30

# 监控 4 小时后，阶段 3: 50% 流量
./scripts/deploy/canary-deploy.sh 50

# 监控 8 小时后，全量发布
./scripts/deploy/canary-deploy.sh 100
```

---

## 6. 监控和告警配置

### 6.1 监控指标

#### 应用层监控

| 指标 | 阈值 | 告警级别 | 说明 |
|------|------|---------|------|
| 响应时间 (P95) | > 2s | ⚠️ Warning | 用户体验下降 |
| 响应时间 (P95) | > 5s | 🔴 Critical | 严重影响用户 |
| 错误率 | > 1% | ⚠️ Warning | 应用异常 |
| 错误率 | > 5% | 🔴 Critical | 服务不可用 |
| 可用性 | < 99% | 🔴 Critical | 服务中断 |

#### 系统层监控

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| CPU 使用率 | > 80% | ⚠️ Warning |
| CPU 使用率 | > 95% | 🔴 Critical |
| 内存使用率 | > 85% | ⚠️ Warning |
| 内存使用率 | > 95% | 🔴 Critical |
| 磁盘使用率 | > 85% | ⚠️ Warning |
| 磁盘使用率 | > 95% | 🔴 Critical |

### 6.2 监控配置

#### Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: '7zi-frontend'
    static_configs:
      - targets: ['7zi.com:3000']
    metrics_path: '/api/metrics'

  - job_name: 'nginx'
    static_configs:
      - targets: ['7zi.com:9113']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['7zi.com:9100']
```

#### 健康检查端点

```typescript
// src/app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'ok',
    version: '1.7.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
    },
  };

  return Response.json(health);
}
```

### 6.3 告警配置

#### 告警规则

```yaml
# alerts.yml
groups:
  - name: 7zi-frontend
    rules:
      # 响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "响应时间过高"
          description: "P95 响应时间超过 2 秒"

      # 错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "错误率过高"
          description: "5xx 错误率超过 1%"

      # CPU 告警
      - alert: HighCPU
        expr: node_cpu_seconds_total{mode="idle"} < 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "CPU 使用率超过 80%"

      # 内存告警
      - alert: HighMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.15
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "内存不足"
          description: "可用内存低于 15%"
```

#### 告警通知（Telegram）

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: '<BOT_TOKEN>'
        api_url: 'https://api.telegram.org'
        chat_id: <CHAT_ID>
        parse_mode: 'HTML'
```

### 6.4 监控 Dashboard

#### Grafana Dashboard 配置

```json
{
  "dashboard": {
    "title": "7zi v1.7.0 监控",
    "panels": [
      {
        "title": "请求速率",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "响应时间 (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "错误率",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "CPU 使用率",
        "type": "gauge",
        "targets": [
          {
            "expr": "1 - node_cpu_seconds_total{mode=\"idle\"}"
          }
        ]
      },
      {
        "title": "内存使用率",
        "type": "gauge",
        "targets": [
          {
            "expr": "1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes"
          }
        ]
      }
    ]
  }
}
```

### 6.5 日志管理

#### 日志收集配置

```yaml
# docker-compose.yml
services:
  7zi-frontend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service,version"
        tag: "{{.ImageName}}/{{.Name}}/{{.ID}}"
```

#### 日志查询命令

```bash
# 查看最近 100 行日志
docker logs --tail 100 7zi-frontend-blue

# 实时日志
docker logs -f 7zi-frontend-blue

# 过滤错误日志
docker logs 7zi-frontend-blue 2>&1 | grep -i error

# 查看特定时间段的日志
docker logs --since "2024-03-29T10:00:00" --until "2024-03-29T11:00:00" 7zi-frontend-blue
```

---

## 7. 回滚方案

### 7.1 回滚触发条件

| 条件 | 说明 | 回滚策略 |
|------|------|---------|
| 健康检查失败 | 30 次重试后仍失败 | 自动回滚 |
| 错误率 > 5% | 5xx 错误率超过阈值 | 手动回滚 |
| 响应时间 > 10s | 严重影响用户体验 | 手动回滚 |
| 关键功能故障 | 核心功能不可用 | 手动回滚 |
| 用户投诉激增 | 大量用户反馈问题 | 手动回滚 |

### 7.2 自动回滚机制

蓝绿部署脚本已内置自动回滚：

```bash
# scripts/deploy/blue-green-deploy.sh (已实现)

# 健康检查失败时自动回滚
if ! health_check "$container_name" "$deploy_port"; then
    log_error "Health check failed! Rolling back..."
    rollback "$deploy_env" "$deploy_port"
    exit 1
fi
```

### 7.3 手动回滚步骤

#### 方法 1: 使用部署脚本

```bash
# 在服务器上执行
cd /opt/7zi-frontend
./scripts/deploy/rollback.sh

# 或从本地远程执行
ssh root@7zi.com "cd /opt/7zi-frontend && ./scripts/deploy/rollback.sh --force"
```

#### 方法 2: Docker 命令回滚

```bash
# 1. 停止当前版本
docker stop 7zi-frontend-blue

# 2. 启动备份版本
docker start 7zi-frontend-green-backup
# 或
docker rename 7zi-frontend-green-backup 7zi-frontend-green
docker start 7zi-frontend-green

# 3. 更新 Nginx 配置
sed -i 's/127.0.0.1:3000/127.0.0.1:3001/g' /etc/nginx/sites-available/7zi.com
nginx -t && systemctl reload nginx

# 4. 验证回滚
curl -f https://7zi.com/api/health
```

#### 方法 3: 数据库回滚

```bash
# 数据库回滚（如果需要）
./scripts/rollback-db-v170.sh
```

### 7.4 回滚验证

```bash
# 1. 检查容器状态
docker ps | grep 7zi-frontend

# 2. 检查健康状态
curl -s https://7zi.com/api/health | jq .

# 3. 检查日志
docker logs --tail 50 7zi-frontend-blue

# 4. 检查 Nginx 配置
nginx -t

# 5. 验证功能
curl -s https://7zi.com/ | grep -o '<title>.*</title>'
```

### 7.5 回滚时间目标

| 阶段 | 目标时间 | 说明 |
|------|---------|------|
| 发现问题 | < 5 分钟 | 监控告警 |
| 决策回滚 | < 2 分钟 | 人工确认 |
| 执行回滚 | < 1 分钟 | 自动化脚本 |
| 验证恢复 | < 2 分钟 | 健康检查 |
| **总计** | **< 10 分钟** | 端到端 |

---

## 8. 部署检查清单

### 8.1 部署前检查

#### 代码和质量

- [ ] 所有 CI 检查通过（lint, type-check, test）
- [ ] E2E 测试通过
- [ ] 测试覆盖率 ≥ 98%
- [ ] 代码审查通过
- [ ] CHANGELOG.md 已更新

#### 构建和镜像

- [ ] 本地构建成功
- [ ] Docker 镜像构建成功
- [ ] 镜像大小 < 300MB
- [ ] 镜像已推送到 Registry

#### 配置和环境

- [ ] 环境变量配置正确
- [ ] Secrets 已更新（如需要）
- [ ] Nginx 配置已准备
- [ ] SSL 证书有效

#### 备份和回滚准备

- [ ] 数据库已备份
- [ ] 回滚脚本已测试
- [ ] 备份版本可用
- [ ] 回滚流程文档完整

### 8.2 部署中检查

#### 蓝绿部署

- [ ] 新容器启动成功
- [ ] 健康检查通过
- [ ] 流量切换成功
- [ ] 旧容器已停止（但保留备份）

#### 金丝雀发布

- [ ] 灰度比例配置正确
- [ ] 监控指标正常
- [ ] 无异常错误日志
- [ ] 用户反馈正常

#### 数据库迁移

- [ ] 迁移脚本执行成功
- [ ] 数据完整性验证通过
- [ ] 索引创建完成
- [ ] 性能测试通过

### 8.3 部署后检查

#### 功能验证

- [ ] 首页加载正常
- [ ] 登录功能正常
- [ ] 核心功能可用
- [ ] API 端点响应正常

#### 性能验证

- [ ] 响应时间 < 2s (P95)
- [ ] 错误率 < 0.1%
- [ ] CPU 使用率 < 80%
- [ ] 内存使用率 < 85%

#### 监控验证

- [ ] Prometheus 指标正常
- [ ] Grafana Dashboard 显示正常
- [ ] 告警规则生效
- [ ] 日志收集正常

#### 安全验证

- [ ] HTTPS 证书有效
- [ ] 安全头部配置正确
- [ ] 无敏感信息泄露
- [ ] 访问控制正常

### 8.4 部署后监控（前 24 小时）

| 时间 | 检查项 | 状态 |
|------|--------|------|
| +5 分钟 | 健康检查 | [ ] |
| +15 分钟 | 错误率检查 | [ ] |
| +30 分钟 | 性能指标检查 | [ ] |
| +1 小时 | 用户反馈检查 | [ ] |
| +2 小时 | 日志异常检查 | [ ] |
| +4 小时 | 数据库性能检查 | [ ] |
| +8 小时 | 系统资源检查 | [ ] |
| +24 小时 | 全面评估 | [ ] |

---

## 9. 附录

### 9.1 快速参考命令

#### 部署命令

```bash
# 蓝绿部署
./deploy-zero-downtime.sh deploy

# 滚动更新
./deploy-zero-downtime.sh rolling

# 金丝雀发布（10%）
./scripts/deploy/canary-deploy.sh 10

# 回滚
./scripts/deploy/rollback.sh
```

#### 监控命令

```bash
# 健康检查
curl https://7zi.com/api/health | jq .

# 查看容器状态
docker ps | grep 7zi-frontend

# 查看日志
docker logs -f 7zi-frontend-blue

# 检查 Nginx 配置
nginx -t

# 重新加载 Nginx
systemctl reload nginx
```

#### 集群管理

```bash
# 查看集群状态
./deploy-cluster.sh status

# 部署到所有服务器
./deploy-cluster.sh deploy

# 健康检查
./deploy-cluster.sh health
```

### 9.2 常见问题

#### Q1: 健康检查失败怎么办？

A: 检查以下项目：
```bash
# 1. 查看容器日志
docker logs 7zi-frontend-blue

# 2. 进入容器检查
docker exec -it 7zi-frontend-blue sh

# 3. 手动健康检查
curl http://localhost:3000/api/health

# 4. 检查端口占用
netstat -tlnp | grep 3000
```

#### Q2: 数据库迁移失败怎么办？

A: 执行回滚：
```bash
# 1. 恢复数据库备份
cp /opt/backups/db-pre-v170.sqlite /opt/7zi/data/db.sqlite

# 2. 重启容器
docker restart 7zi-frontend-blue

# 3. 验证
curl https://7zi.com/api/health
```

#### Q3: 如何切换到金丝雀发布？

A: 使用灰度发布脚本：
```bash
# 10% 流量到新版本
./scripts/deploy/canary-deploy.sh 10

# 逐步增加
./scripts/deploy/canary-deploy.sh 30
./scripts/deploy/canary-deploy.sh 50

# 全量发布
./scripts/deploy/canary-deploy.sh 100
```

#### Q4: 如何快速回滚？

A: 三种方法：
```bash
# 方法 1: 使用回滚脚本
./scripts/deploy/rollback.sh --force

# 方法 2: 切换 Nginx 配置
sed -i 's/3001/3000/g' /etc/nginx/sites-available/7zi.com
systemctl reload nginx

# 方法 3: 直接切换容器
docker stop 7zi-frontend-green
docker start 7zi-frontend-blue
```

### 9.3 联系和支持

- **文档**: `/root/.openclaw/workspace/docs/`
- **脚本**: `/root/.openclaw/workspace/scripts/deploy/`
- **日志**: `/var/log/nginx/`, Docker logs
- **监控**: Grafana Dashboard

### 9.4 参考资料

- [DEPLOYMENT.md](../DEPLOYMENT.md) - 部署指南
- [README.md](../README.md) - 项目文档
- [CHANGELOG.md](../CHANGELOG.md) - 版本变更
- [A2A_PROTOCOL_V2.1.md](./A2A_PROTOCOL_V2.1.md) - A2A 协议文档

---

## 10. 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2026-04-02 | 初始版本，v1.7.0 部署方案 |

---

**文档维护者**: 🛡️ 系统管理员（运维部署专家）
**最后更新**: 2026-04-02
**适用版本**: v1.7.0
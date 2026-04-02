# AgentScheduler Docker 部署指南

> 📦 独立调度器服务的容器化部署文档

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [部署方式](#部署方式)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)
- [性能优化](#性能优化)

---

## 概述

AgentScheduler 是 7zi 平台的核心调度组件，负责：

- AI 代理任务调度与分配
- 负载均衡与资源优化
- 任务队列管理
- 实时状态监控

### 架构

```
┌─────────────────────────────────────────────────┐
│                  Nginx (反向代理)                 │
│              (SSL/负载均衡/缓存)                  │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼────┐              ┌──────▼───┐
│Scheduler│              │Scheduler │
│Instance1│              │Instance2 │
└───┬────┘              └──────┬───┘
    │                           │
    └───────────┬───────────────┘
                │
        ┌───────▼────────┐
        │  Redis Cluster │
        │  (状态存储)     │
        └────────────────┘
```

---

## 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ 可用内存
- 1CPU+ 核心

### 一键启动

```bash
# 克隆项目
cd /root/.openclaw/workspace

# 启动调度器服务
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d

# 查看日志
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml logs -f scheduler

# 检查服务状态
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml ps
```

### 访问服务

- **Web UI**: http://localhost:3001
- **健康检查**: http://localhost:3001/health
- **API 文档**: http://localhost:3001/api/docs
- **WebSocket**: ws://localhost:3001/ws

---

## 配置说明

### 环境变量

| 变量名                     | 默认值             | 说明           |
| -------------------------- | ------------------ | -------------- |
| `NODE_ENV`                 | production         | 运行环境       |
| `PORT`                     | 3001               | 服务端口       |
| `SCHEDULER_HOST`           | 0.0.0.0            | 监听地址       |
| `REDIS_URL`                | redis://redis:6379 | Redis 连接地址 |
| `REDIS_PREFIX`             | scheduler:         | Redis 键前缀   |
| `SCHEDULER_AUTO_START`     | true               | 自动启动调度   |
| `SCHEDULER_INTERVAL`       | 30000              | 调度间隔 (ms)  |
| `SCHEDULER_MAX_BATCH_SIZE` | 10                 | 批量调度大小   |
| `LOG_LEVEL`                | info               | 日志级别       |
| `LOG_FORMAT`               | json               | 日志格式       |

### Redis 配置

```bash
# 基础配置
redis://localhost:6379

# 带密码
redis://:password@localhost:6379

# 带数据库索引
redis://localhost:6379/1

# Redis Cluster
redis://node1:6379,node2:6379,node3:6379
```

---

## 部署方式

### 方式 1: Docker Compose (推荐)

#### 生产部署

```bash
# 构建镜像
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml build

# 启动服务
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d

# 滚动更新
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d --build scheduler

# 停止服务
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml down
```

#### 带监控部署

```bash
# 启动包含 Prometheus + Grafana
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml --profile monitoring up -d

# 访问监控面板
# Grafana: http://localhost:3002 (admin/admin123)
# Prometheus: http://localhost:9090
```

### 方式 2: Kubernetes

```bash
# 创建命名空间和资源
kubectl apply -f deploy/scheduler/kubernetes-deployment.yml

# 查看部署状态
kubectl get all -n scheduler

# 查看日志
kubectl logs -f deployment/scheduler -n scheduler

# 扩容
kubectl scale deployment scheduler --replicas=5 -n scheduler

# 更新镜像
kubectl set image deployment/scheduler scheduler=7zi/scheduler:v2.0.0 -n scheduler
```

### 方式 3: 手动 Docker

```bash
# 构建镜像
docker build -f deploy/scheduler/Dockerfile.scheduler -t 7zi/scheduler:latest .

# 运行容器
docker run -d \
  --name scheduler \
  -p 3001:3001 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e NODE_ENV=production \
  7zi/scheduler:latest

# 查看日志
docker logs -f scheduler
```

---

## 监控与日志

### 健康检查

```bash
# HTTP 健康检查
curl http://localhost:3001/health

# Docker 健康检查
docker inspect --format='{{.State.Health.Status}}' 7zi-scheduler

# Kubernetes 健康检查
kubectl describe pod -l app=scheduler -n scheduler | grep -A 5 Liveness
```

### Prometheus 指标

访问 `/metrics` 端点获取 Prometheus 格式指标：

```bash
curl http://localhost:3001/metrics
```

关键指标：

- `scheduler_tasks_scheduled_total`: 已调度任务总数
- `scheduler_tasks_completed_total`: 已完成任务总数
- `scheduler_queue_length`: 当前队列长度
- `scheduler_agent_load`: 代理负载
- `scheduler_duration_seconds`: 调度耗时

### 日志查看

```bash
# Docker Compose
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml logs -f --tail=100 scheduler

# Kubernetes
kubectl logs -f deployment/scheduler -n scheduler --tail=100

# 日志文件
tail -f /var/log/scheduler/app.log
```

### Grafana 监控面板

1. 访问 Grafana: http://localhost:3002
2. 添加 Prometheus 数据源: http://prometheus:9090
3. 导入调度器仪表板 (Dashboard ID: 待配置)

---

## 故障排查

### 常见问题

#### 1. 服务无法启动

```bash
# 检查日志
docker logs 7zi-scheduler

# 检查依赖服务
docker ps | grep redis
docker logs 7zi-scheduler-redis

# 检查网络
docker network inspect scheduler-network
```

#### 2. Redis 连接失败

```bash
# 测试 Redis 连接
docker exec -it 7zi-scheduler-redis redis-cli ping

# 检查 Redis 配置
docker exec -it 7zi-scheduler-redis redis-cli CONFIG GET maxmemory

# 重启 Redis
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml restart redis
```

#### 3. 内存不足

```bash
# 检查容器资源使用
docker stats 7zi-scheduler

# 增加内存限制
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d --force-recreate --memory=1g scheduler
```

#### 4. 端口冲突

```bash
# 检查端口占用
lsof -i :3001
netstat -tunlp | grep 3001

# 修改端口
# 编辑 docker-compose.scheduler.yml，修改 ports 配置
```

### 调试模式

```bash
# 启用调试日志
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d \
  -e LOG_LEVEL=debug \
  scheduler

# 进入容器调试
docker exec -it 7zi-scheduler sh

# 实时监控
watch -n 1 'curl -s http://localhost:3001/health | jq'
```

---

## 性能优化

### 1. 资源配置

```yaml
# docker-compose.scheduler.yml
services:
  scheduler:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 2. Redis 优化

```bash
# Redis 配置优化
redis-server \
  --maxmemory 512mb \
  --maxmemory-policy allkeys-lru \
  --save 60 1000 \
  --appendonly yes
```

### 3. Nginx 优化

```nginx
# nginx.scheduler.conf
upstream scheduler_backend {
    least_conn;
    server scheduler:3001;
    keepalive 64;  # 增加连接池
}
```

### 4. 水平扩展

```bash
# Docker Compose 扩容
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d --scale scheduler=3

# Kubernetes HPA
kubectl autoscale deployment scheduler --cpu-percent=70 --min=2 --max=10 -n scheduler
```

---

## 安全配置

### 1. SSL/TLS

```bash
# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deploy/scheduler/ssl/scheduler.key \
  -out deploy/scheduler/ssl/scheduler.crt

# Let's Encrypt (生产环境)
certbot certonly --standalone -d scheduler.7zi.com
```

### 2. 网络隔离

```yaml
# 内部网络
networks:
  scheduler-internal:
    internal: true
    driver: bridge

# 外部网络
networks:
  scheduler-external:
    driver: bridge
```

### 3. 访问控制

```nginx
# 仅允许特定 IP
location /metrics {
    allow 10.0.0.0/8;
    deny all;
    proxy_pass http://scheduler_backend;
}
```

---

## 备份与恢复

### 数据备份

```bash
# Redis 数据备份
docker exec 7zi-scheduler-redis redis-cli BGSAVE
docker cp 7zi-scheduler-redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb

# 调度器配置备份
docker exec 7zi-scheduler cat /app/config.json > ./backups/config-$(date +%Y%m%d).json
```

### 数据恢复

```bash
# 恢复 Redis 数据
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml down
docker cp ./backups/redis-20240329.rdb 7zi-scheduler-redis:/data/dump.rdb
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d
```

---

## 升级指南

### 滚动升级

```bash
# Docker Compose
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml pull
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d --no-deps scheduler

# Kubernetes
kubectl set image deployment/scheduler scheduler=7zi/scheduler:v2.0.0 -n scheduler
kubectl rollout status deployment/scheduler -n scheduler
```

### 回滚

```bash
# Docker Compose
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml down
docker tag 7zi/scheduler:latest 7zi/scheduler:backup
docker tag 7zi/scheduler:v1.0.0 7zi/scheduler:latest
docker-compose -f deploy/scheduler/docker-compose.scheduler.yml up -d

# Kubernetes
kubectl rollout undo deployment/scheduler -n scheduler
```

---

## 附录

### 文件结构

```
deploy/scheduler/
├── Dockerfile.scheduler           # 调度器镜像构建
├── docker-compose.scheduler.yml   # Docker Compose 配置
├── nginx.scheduler.conf           # Nginx 反向代理配置
├── prometheus.yml                 # Prometheus 监控配置
├── kubernetes-deployment.yml      # Kubernetes 部署配置
├── grafana-dashboards/            # Grafana 仪表板
│   └── scheduler-dashboard.json
└── ssl/                           # SSL 证书目录
    ├── scheduler.crt
    └── scheduler.key
```

### 参考链接

- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Kubernetes 文档](https://kubernetes.io/docs/)
- [Redis 配置](https://redis.io/topics/config)
- [Prometheus 配置](https://prometheus.io/docs/prometheus/latest/configuration/)
- [Nginx 配置](https://nginx.org/en/docs/)

---

**最后更新**: 2026-03-29
**版本**: 1.0.0
**维护者**: 7zi Team

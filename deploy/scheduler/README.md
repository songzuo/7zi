# AgentScheduler 部署配置

本目录包含 AgentScheduler 的完整部署配置，支持多种部署方式。

## 📁 文件说明

| 文件                           | 说明                       |
| ------------------------------ | -------------------------- |
| `Dockerfile.scheduler`         | 调度器 Docker 镜像构建文件 |
| `docker-compose.scheduler.yml` | Docker Compose 部署配置    |
| `nginx.scheduler.conf`         | Nginx 反向代理配置         |
| `prometheus.yml`               | Prometheus 监控配置        |
| `kubernetes-deployment.yml`    | Kubernetes 部署配置        |
| `.env.example`                 | 环境变量配置示例           |

## 🚀 快速开始

### Docker Compose 部署（推荐）

```bash
# 启动基础服务
docker-compose -f docker-compose.scheduler.yml up -d

# 启动带监控的服务
docker-compose -f docker-compose.scheduler.yml --profile monitoring up -d

# 查看日志
docker-compose -f docker-compose.scheduler.yml logs -f
```

### Kubernetes 部署

```bash
# 部署到 Kubernetes
kubectl apply -f kubernetes-deployment.yml

# 查看部署状态
kubectl get all -n scheduler
```

## 📚 详细文档

完整部署指南请参考：[../../SCHEDULER_DOCKER_DEPLOY.md](../..//SCHEDULER_DOCKER_DEPLOY.md)

## 🔧 配置说明

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
vi .env
```

## 📊 监控

访问监控面板：

- **Grafana**: http://localhost:3002 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Scheduler UI**: http://localhost:3001

## 🔐 安全建议

生产环境请务必：

1. 修改默认密码
2. 启用 SSL/TLS
3. 配置防火墙规则
4. 限制外部访问

## 🆘 故障排查

详见部署指南的[故障排查](../..//SCHEDULER_DOCKER_DEPLOY.md#故障排查)章节。

---

**版本**: 1.0.0
**更新**: 2026-03-29

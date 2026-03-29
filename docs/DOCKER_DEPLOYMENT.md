# 7zi-frontend Docker 部署指南

## 📦 Docker 化部署方案

本项目提供完整的 Docker 化部署方案，包括多阶段构建、镜像优化、nginx 反向代理、健康检查等。

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────┐
│                     用户请求                          │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│               Nginx (反向代理)                        │
│  - SSL/TLS 终结                                      │
│  - 静态资源缓存                                       │
│  - 限流保护                                          │
│  - Gzip 压缩                                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            Next.js (standalone)                      │
│  - SSR/SSG                                          │
│  - API Routes                                       │
│  - WebSocket (Socket.IO)                            │
└─────────────────────────────────────────────────────┘
```

---

## 📁 文件结构

```
.
├── Dockerfile              # 生产环境 Dockerfile（多阶段构建）
├── Dockerfile.dev          # 开发环境 Dockerfile（热重载）
├── Dockerfile.production   # 生产环境 Dockerfile（优化版）
├── docker-compose.yml      # 基础 Docker Compose
├── docker-compose.dev.yml  # 开发环境配置
├── docker-compose.prod.yml # 生产环境配置
├── .dockerignore           # Docker 构建忽略文件
├── .env.docker.example     # 环境变量模板
├── docker-deploy.sh        # 部署脚本
└── nginx/
    ├── nginx-optimized.conf # 优化的 nginx 配置
    └── ssl/                # SSL 证书目录
```

---

## 🚀 快速开始

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env

# 编辑 .env 文件，填入实际值
nano .env
```

**必须设置的变量：**
- `JWT_SECRET` - JWT 密钥（至少 32 字符）
- `RESEND_API_KEY` - 邮件服务 API 密钥

### 2. 本地开发

```bash
# 启动开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

开发环境特性：
- ✅ 热重载（HMR）
- ✅ Turbopack 加速
- ✅ 源代码挂载
- ✅ 完整的开发工具

### 3. 生产部署

```bash
# 使用部署脚本（推荐）
./docker-deploy.sh

# 或手动部署
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🐳 Dockerfile 说明

### 多阶段构建

```dockerfile
# Stage 1: deps - 安装依赖
# - 利用 Docker 缓存层
# - 最小化基础镜像

# Stage 2: builder - 构建应用
# - 安装 devDependencies
# - 执行 Next.js 构建
# - 生成 standalone 输出

# Stage 3: runner - 运行应用
# - 仅包含必需文件
# - 非 root 用户
# - 健康检查
```

### 镜像大小优化

| 优化项 | 说明 |
|--------|------|
| Alpine 基础镜像 | node:22-alpine (~50MB) |
| 多阶段构建 | 仅复制构建产物 |
| standalone 输出 | 自动包含必需依赖 |
| 删除 devDependencies | 生产环境不需要 |
| 最小化运行时依赖 | 仅安装 sqlite-libs, curl |

**预期镜像大小：** ~200-300MB（比传统方案减少 60%+）

---

## 🔧 Nginx 配置优化

### 主要优化

1. **SSL/TLS**
   - TLS 1.2/1.3
   - OCSP Stapling
   - 会话缓存

2. **缓存策略**
   - 静态资源：1 年（immutable）
   - 图片优化：7 天
   - API：不缓存

3. **性能优化**
   - Gzip 压缩
   - Keep-alive 连接
   - 连接池

4. **安全加固**
   - 安全头（HSTS, X-Frame-Options）
   - 限流保护
   - 最小权限

### 限流配置

```nginx
# API 限流：10 请求/秒
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# 普通请求：30 请求/秒
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;
```

---

## 🏥 健康检查

### 容器健康检查

```yaml
healthcheck:
  test: ["CMD", "/usr/local/bin/healthcheck.sh"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 15s
```

### API 端点

- `GET /health` - 完整健康检查
- `HEAD /health` - 轻量健康检查

**响应示例：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-28T12:00:00.000Z",
    "uptime": 3600,
    "version": "1.2.0",
    "checks": {
      "memory": {
        "status": "ok",
        "used": 128,
        "limit": 512
      },
      "node": {
        "status": "ok",
        "version": "v22.0.0"
      }
    }
  }
}
```

---

## 📊 资源限制

### 生产环境

```yaml
deploy:
  resources:
    limits:
      cpus: "1"
      memory: 512M
    reservations:
      cpus: "0.25"
      memory: 256M
```

### 为什么这些限制？

- **CPU: 1 核心** - Next.js SSR 计算
- **内存: 512MB** - Node.js 堆内存 + 缓存
- **预留 256MB** - 保证基本可用

---

## 🔒 安全配置

### 容器安全

```yaml
security_opt:
  - no-new-privileges:true  # 禁止提权
read_only: true             # 只读文件系统
tmpfs:
  - /tmp                    # 临时目录
  - /app/.next/cache:size=100M
```

### 非 root 用户

```dockerfile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
USER nextjs
```

---

## 📝 日志管理

### 日志轮转

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### 查看日志

```bash
# 实时日志
docker-compose -f docker-compose.prod.yml logs -f

# 特定服务日志
docker-compose -f docker-compose.prod.yml logs -f 7zi-frontend

# 最近 100 行
docker-compose -f docker-compose.prod.yml logs --tail=100
```

---

## 🔧 常用命令

### 镜像管理

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 查看镜像大小
docker images 7zi-frontend

# 清理旧镜像
docker image prune -f
```

### 容器管理

```bash
# 启动
docker-compose -f docker-compose.prod.yml up -d

# 停止
docker-compose -f docker-compose.prod.yml down

# 重启
docker-compose -f docker-compose.prod.yml restart

# 查看状态
docker-compose -f docker-compose.prod.yml ps
```

### 进入容器

```bash
# 进入 Next.js 容器
docker exec -it 7zi-frontend sh

# 进入 Nginx 容器
docker exec -it 7zi-nginx sh
```

### 查看资源使用

```bash
# 实时监控
docker stats

# 特定容器
docker stats 7zi-frontend 7zi-nginx
```

---

## 🚨 故障排查

### 容器无法启动

```bash
# 查看日志
docker-compose -f docker-compose.prod.yml logs 7zi-frontend

# 检查健康状态
docker inspect 7zi-frontend | grep -A 10 "Health"
```

### 内存不足

```bash
# 增加内存限制
# 编辑 docker-compose.prod.yml
# memory: 1G

# 或设置环境变量
NODE_OPTIONS=--max-old-space-size=1024
```

### Nginx 502 错误

```bash
# 检查 Next.js 是否运行
docker ps | grep 7zi-frontend

# 检查网络
docker network inspect 7zi-network

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

---

## 📈 性能优化建议

1. **启用 CDN** - 静态资源通过 CDN 分发
2. **图片优化** - 使用 WebP/AVIF 格式
3. **数据库优化** - 定期清理和索引
4. **监控告警** - 设置 Prometheus/Grafana

---

## 🔄 更新部署

```bash
# 拉取最新代码
git pull

# 重新部署
./docker-deploy.sh

# 或手动
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📞 支持

如有问题，请检查：
1. 日志输出
2. 健康检查状态
3. 资源使用情况
4. 网络连接

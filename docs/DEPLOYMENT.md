# 7zi-frontend 部署方案

## 📋 概述

本文档描述 7zi-frontend 项目的完整部署方案，支持本地部署和 CI/CD 自动部署。

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────┐
│                    7zi.com 服务器                        │
│                                                         │
│  ┌─────────────┐     ┌─────────────────────────────┐   │
│  │   Nginx     │────▶│   7zi-frontend (Next.js)    │   │
│  │   :80/443   │     │   Docker Container :3000    │   │
│  └─────────────┘     └─────────────────────────────┘   │
│        │                                                │
│        ▼                                                │
│   SSL 证书配置                                          │
│   静态资源缓存                                          │
│   Gzip 压缩                                             │
└─────────────────────────────────────────────────────────┘
```

## 📁 文件结构

```
7zi-frontend/
├── Dockerfile                 # Docker 镜像构建文件
├── docker-compose.yml         # 开发环境 Docker Compose
├── docker-compose.prod.yml    # 生产环境 Docker Compose
├── deploy.sh                  # 本地部署脚本
├── deploy-remote.sh           # 远程部署脚本 ⭐
├── .env.example               # 环境变量示例
├── .env.production.example    # 生产环境变量示例
├── nginx/
│   └── nginx.conf             # Nginx 配置
└── .github/workflows/
    ├── ci.yml                 # CI 流水线
    └── deploy.yml             # 自动部署流水线 ⭐
```

## 🚀 部署方式

### 方式一：远程部署脚本（推荐）

从本地机器直接部署到服务器：

```bash
# 进入项目目录
cd ~/7zi-project/7zi-frontend

# 完整部署（首次部署）
./deploy-remote.sh deploy

# 快速部署（仅同步代码和重启）
./deploy-remote.sh quick

# 其他命令
./deploy-remote.sh logs      # 查看日志
./deploy-remote.sh status    # 查看状态
./deploy-remote.sh restart   # 重启服务
./deploy-remote.sh stop      # 停止服务
./deploy-remote.sh rollback  # 回滚
```

### 方式二：CI/CD 自动部署

推送到 main 分支自动触发部署：

```bash
git push origin main
```

手动触发：
1. 进入 GitHub Actions
2. 选择 "Deploy to Production" workflow
3. 点击 "Run workflow"

### 方式三：服务器本地部署

SSH 登录服务器后执行：

```bash
cd /opt/7zi-frontend
./deploy.sh deploy
```

## ⚙️ 服务器配置

### 目标服务器

| 项目 | 值 |
|------|-----|
| 域名 | 7zi.com |
| IP | 165.99.43.61 |
| 用户 | root |
| 部署路径 | /opt/7zi-frontend |

### 前置要求

服务器需要安装：
- Docker
- Docker Compose
- Git（可选）

自动安装脚本会检查并安装缺失的依赖。

## 🔐 环境变量配置

### 必需配置

在服务器上创建 `/opt/7zi-frontend/.env.production`：

```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 网站统计（可选）
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=your-umami-id
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is

# 邮件服务（可选）
RESEND_API_KEY=re_xxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio
```

### GitHub Secrets 配置

在 GitHub 仓库设置中添加：

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 服务器地址 (165.99.43.61) |
| `DEPLOY_USER` | SSH 用户 (root) |
| `DEPLOY_PASS` | SSH 密码 |

## 📦 Docker 配置说明

### Dockerfile 特点

- **多阶段构建**：减小镜像体积
- **Standalone 模式**：独立运行，无需 node_modules
- **非 root 用户**：安全运行
- **健康检查**：自动检测服务状态

### docker-compose.prod.yml 特点

- 资源限制（CPU/内存）
- 自动重启策略
- 日志轮转配置
- 健康检查配置

## 🔄 CI/CD 流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Lint      │────▶│   Test      │────▶│   Build     │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │   Deploy    │
                                        └─────────────┘
```

### 流水线阶段

1. **Lint** - 代码风格检查
2. **Type Check** - TypeScript 类型检查
3. **Test** - 单元测试
4. **Build** - 构建应用
5. **Deploy** - 部署到服务器

## 🛠️ 常用命令速查

### 本地开发

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npm run test         # 运行测试
```

### Docker 操作

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看状态
docker-compose -f docker-compose.prod.yml ps
```

### 远程部署

```bash
./deploy-remote.sh deploy    # 完整部署
./deploy-remote.sh quick     # 快速部署
./deploy-remote.sh logs      # 查看日志
./deploy-remote.sh status    # 查看状态
./deploy-remote.sh restart   # 重启服务
./deploy-remote.sh rollback  # 回滚
```

## 🔧 故障排查

### 服务无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs

# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 检查端口占用
netstat -tlnp | grep 3000
```

### 健康检查失败

```bash
# 手动测试
curl http://localhost:3000/

# 检查容器内部
docker exec -it 7zi-frontend sh
```

### 回滚操作

```bash
# 使用部署脚本回滚
./deploy-remote.sh rollback

# 或手动恢复备份
ls -la /opt/backups/
```

## 📊 监控和日志

### 日志位置

- 应用日志：`docker logs 7zi-frontend`
- Nginx 日志：`/opt/7zi-frontend/nginx/logs/`
- 备份目录：`/opt/backups/`

### 健康检查端点

- 应用：`http://localhost:3000/`
- Nginx：`http://localhost/health`

## 🔒 安全建议

1. **修改默认密码**：部署后修改服务器密码
2. **配置 SSL**：使用 Let's Encrypt 配置 HTTPS
3. **防火墙**：只开放必要端口 (80, 443, 22)
4. **定期备份**：备份会自动保留最近 5 个版本
5. **更新依赖**：定期更新 npm 依赖

## 🔍 高级故障排查

### 内存泄漏排查

```bash
# 监控容器内存使用
docker stats 7zi-frontend --no-stream

# 查看 Node.js 堆内存
docker exec 7zi-frontend node --inspect=0.0.0.0:9229

# 分析内存快照
# 访问 chrome://inspect 连接调试器
```

### 性能问题诊断

```bash
# 检查 CPU 使用
docker stats 7zi-frontend --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}"

# 查看 Next.js 构建分析
npm run build:analyze

# 检查慢查询
docker logs 7zi-frontend | grep "slow query"
```

### 网络连接问题

```bash
# 测试容器网络
docker exec 7zi-frontend curl -I http://localhost:3000/

# 检查 DNS 解析
docker exec 7zi-frontend nslookup api.example.com

# 查看网络统计
docker exec 7zi-frontend netstat -tulpn
```

### 日志分析技巧

```bash
# 实时查看错误日志
docker logs 7zi-frontend --tail 100 --follow | grep -i error

# 按时间过滤
docker logs 7zi-frontend --since 2026-03-08T10:00:00 --until 2026-03-08T12:00:00

# 导出日志到文件
docker logs 7zi-frontend > app-logs-$(date +%Y%m%d).log 2>&1

# 使用 jq 分析 JSON 日志
docker logs 7zi-frontend 2>&1 | jq 'select(.level == "error")'
```

---

## 📈 性能优化建议

### 1. Docker 层优化

```dockerfile
# 使用多阶段构建
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
```

### 2. Next.js 优化

```ts
// next.config.ts
const nextConfig = {
  // 启用静态导出
  output: 'standalone',
  
  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  
  // 压缩
  compress: true,
  
  // 缓存配置
  experimental: {
    optimizePackageImports: ['chart.js', 'three'],
  },
};
```

### 3. Nginx 缓存配置

```nginx
# nginx.conf
location /_next/static {
    expires 365d;
    access_log off;
    add_header Cache-Control "public, immutable";
}

location /images {
    expires 30d;
    add_header Cache-Control "public";
}
```

### 4. 数据库连接池

```ts
// 使用连接池管理
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## 🚨 应急响应流程

### 服务中断处理

```
1. 确认问题范围
   └─→ 检查健康检查端点
   └─→ 查看错误日志
   └─→ 监控告警通知

2. 快速恢复
   └─→ 重启服务：./deploy-remote.sh restart
   └─→ 回滚版本：./deploy-remote.sh rollback
   └─→ 切换备用服务器

3. 问题定位
   └─→ 分析日志
   └─→ 检查最近变更
   └─→ 复现问题

4. 修复验证
   └─→ 开发环境测试
   └─→ 预发布环境验证
   └─→ 生产环境部署

5. 事后总结
   └─→ 编写事故报告
   └─→ 更新监控规则
   └─→ 优化应急预案
```

### 联系人列表

| 角色 | 联系方式 | 职责 |
|------|----------|------|
| 系统管理员 | @sysadmin | 服务器运维、故障处理 |
| 架构师 | @architect | 技术方案、架构调整 |
| 开发者 | @executor | 代码修复、功能开发 |

---

## 📊 监控指标

### 关键指标 (KPI)

| 指标 | 目标值 | 告警阈值 |
|------|--------|----------|
| 响应时间 (P95) | < 500ms | > 1000ms |
| 错误率 | < 0.1% | > 1% |
| 可用性 | > 99.9% | < 99% |
| CPU 使用率 | < 70% | > 90% |
| 内存使用率 | < 80% | > 95% |

### Prometheus 指标

```promql
# 请求速率
rate(http_requests_total[5m])

# 错误率
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 响应时间
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 容器资源
container_memory_usage_bytes{name="7zi-frontend"}
container_cpu_usage_seconds_total{name="7zi-frontend"}
```

---

## 📝 更新日志

### v1.1.0 (2026-03-08)
- 添加高级故障排查章节
- 添加性能优化建议
- 添加应急响应流程
- 添加监控指标说明

### v1.0.0 (2024-03-06)
- 创建部署方案
- 包含完整的 CI/CD 流水线
- 支持远程部署和自动部署
- 包含完整的 CI/CD 流水线
- 支持远程部署和自动部署
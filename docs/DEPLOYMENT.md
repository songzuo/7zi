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

## 📝 更新日志

- 2024-03-06: 创建部署方案
- 包含完整的 CI/CD 流水线
- 支持远程部署和自动部署
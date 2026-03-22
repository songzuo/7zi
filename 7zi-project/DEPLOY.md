# 7zi 部署指南

> 完整的部署指南 - Vercel、Docker、服务器部署

**最后更新**: 2026-03-22
**版本**: v1.0.6

---

## 📋 目录

- [前置要求](#前置要求)
- [环境变量配置](#环境变量配置)
- [部署方式](#部署方式)
  - [Vercel 部署](#vercel-部署-推荐用于演示)
  - [Docker 部署](#docker-部署-推荐用于生产)
  - [服务器部署](#服务器部署)
- [CI/CD 自动部署](#cicd-自动部署)
- [故障排除](#故障排除)

---

## 🚀 前置要求

### 系统要求

| 要求 | 版本 | 说明 |
|------|------|------|
| **Node.js** | 22.x LTS | 运行时环境 |
| **pnpm** | 8.x+ (推荐) | 包管理器 |
| **Docker** | 20.x+ (可选) | 容器化部署 |
| **Git** | 2.x+ | 版本控制 |

### 检查环境

```bash
# 检查 Node.js 版本
node --version
# 应该输出 v22.x.x

# 检查 pnpm 版本
pnpm --version
# 应该输出 8.x.x 或更高

# 检查 Docker 版本（可选）
docker --version
# 应该输出 20.x.x 或更高

# 检查 Git 版本
git --version
# 应该输出 2.x.x
```

---

## ⚙️ 环境变量配置

### 复制环境变量文件

```bash
# 开发环境
cp .env.example .env.local

# 生产环境
cp .env.production.example .env.production
```

### 必需环境变量

```bash
# 应用配置
NODE_ENV=production
PORT=3000

# GitHub 集成（可选）
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
NEXT_PUBLIC_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# 数据库配置
DATABASE_PATH=./data/database.db

# JWT 密钥（生产环境必须）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# WebSocket 配置
WEBSOCKET_PORT=3001

# 通知配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

### 安全建议

**生产环境必须配置**：
- ✅ `JWT_SECRET` - 使用强随机密钥
- ✅ `NEXT_PUBLIC_GITHUB_TOKEN` - GitHub API 认证
- ✅ 数据库备份策略
- ✅ HTTPS 证书

**开发环境**：
- 可以使用默认值
- 不需要配置所有变量

---

## 🚢 部署方式

### 方式 1: Vercel 部署（推荐用于演示）

Vercel 是最简单的部署方式，适合演示和小型项目。

#### 1.1 Vercel 配置文件

项目已包含 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 1.2 部署步骤

**步骤 1: 安装 Vercel CLI**

```bash
npm install -g vercel
```

**步骤 2: 登录 Vercel**

```bash
vercel login
```

**步骤 3: 部署项目**

```bash
# 首次部署 - 预览环境
vercel

# 生产环境部署
vercel --prod
```

**步骤 4: 配置环境变量**

在 Vercel Dashboard 中：
1. 进入项目设置
2. 选择 Environment Variables
3. 添加所有必需的环境变量
4. 重新部署

#### 1.3 项目设置

在 Vercel Dashboard 中配置：

| 设置 | 值 |
|------|-----|
| **Build Command** | `pnpm run build` |
| **Output Directory** | `.next` |
| **Node Version** | `22.x` |
| **Install Command** | `pnpm install` |

#### 1.4 使用 Token 部署 (CI/CD)

```bash
# 获取 Token: https://vercel.com/account/tokens
export VERCEL_TOKEN=<your-token>

# 部署到生产环境
vercel --prod --token=$VERCEL_TOKEN
```

---

### 方式 2: Docker 部署（推荐用于生产）

Docker 提供容器化部署，适合生产环境和自托管。

#### 2.1 构建镜像

```bash
# 构建镜像
docker build -t 7zi:latest .

# 或指定版本
docker build -t 7zi:v1.0.6 .
```

#### 2.2 运行容器

```bash
# 基本运行
docker run -d \
  --name 7zi-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret-key \
  7zi:latest

# 挂载数据卷（持久化数据库）
docker run -d \
  --name 7zi-app \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret-key \
  7zi:latest
```

#### 2.3 使用 Docker Compose

开发环境：

```bash
# 使用 docker-compose.yml
docker-compose up -d

# 查看日志
docker-compose logs -f
```

生产环境：

```bash
# 使用生产配置
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

---

### 方式 3: 服务器部署

使用远程服务器部署，适合完全控制的环境。

#### 3.1 使用部署脚本（推荐）

项目包含自动化部署脚本 `deploy-remote.sh`。

**使用方法**：

```bash
# 进入项目目录
cd ~/7zi-project

# 首次部署（完整部署）
./deploy-remote.sh deploy

# 快速部署（仅同步代码和重启）
./deploy-remote.sh quick

# 查看日志
./deploy-remote.sh logs

# 查看状态
./deploy-remote.sh status

# 重启服务
./deploy-remote.sh restart

# 停止服务
./deploy-remote.sh stop

# 回滚到上一个版本
./deploy-remote.sh rollback
```

#### 3.2 手动部署

**步骤 1: 克隆代码到服务器**

```bash
# SSH 登录服务器
ssh root@7zi.com

# 克隆仓库
git clone https://github.com/songzuo/7zi.git
cd 7zi
```

**步骤 2: 安装依赖**

```bash
# 安装 pnpm（如果未安装）
npm install -g pnpm

# 安装依赖
pnpm install
```

**步骤 3: 配置环境变量**

```bash
# 复制环境变量文件
cp .env.production.example .env.production

# 编辑环境变量
nano .env.production
```

**步骤 4: 构建应用**

```bash
# 生产构建
NODE_ENV=production pnpm build
```

**步骤 5: 启动应用**

```bash
# 使用 PM2（推荐）
pm2 start npm --name "7zi" -- start

# 或直接运行
NODE_ENV=production pnpm start
```

**步骤 6: 配置 Nginx 反向代理**

```nginx
# /etc/nginx/sites-available/7zi.com
server {
    listen 80;
    server_name 7zi.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔄 CI/CD 自动部署

### GitHub Actions

项目已配置 GitHub Actions 工作流：

#### 推送到 main 分支自动触发部署

```bash
git push origin main
```

#### 手动触发部署

```bash
# 使用 GitHub CLI
gh workflow run "Deploy to Production"

# 或在 GitHub Dashboard 中
# Actions → "Deploy to Production" → Run workflow
```

---

## 🐛 故障排除

### Vercel 部署问题

**问题: 构建失败**

```bash
# 查看构建日志
vercel logs <deployment-id>

# 本地测试构建
pnpm build
```

### Docker 部署问题

**问题: 容器启动失败**

```bash
# 查看容器日志
docker logs 7zi-app

# 进入容器调试
docker exec -it 7zi-app sh

# 重新构建
docker build --no-cache -t 7zi:latest .
```

### 服务器部署问题

**问题: SSH 连接失败**

```bash
# 检查 SSH 密钥
ssh -v root@7zi.com

# 检查防火墙
sudo ufw status
sudo ufw allow ssh
```

---

## 📚 相关文档

- **完整部署指南**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **开发指南**: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- **故障排除**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Docker 配置**: [docs/DOCKER-SETUP.md](./docs/DOCKER-SETUP.md)
- **CI/CD 设置**: [docs/CI-CD-SETUP.md](./docs/CI-CD-SETUP.md)

---

**最后更新**: 2026-03-22
**版本**: v1.0.6

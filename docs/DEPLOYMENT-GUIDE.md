# 🚀 7zi Platform - 完整部署指南

> **7zi AI 驱动团队管理平台** - 生产环境部署完整指南

最后更新：2026-03-18

---

## 📋 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [本地开发](#本地开发)
- [生产部署](#生产部署)
- [Docker 部署](#docker-部署)
- [CI/CD 自动化](#cicd-自动化)
- [监控与维护](#监控与维护)
- [故障排查](#故障排查)
- [性能优化](#性能优化)

---

## 🔧 系统要求

### 开发环境

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| **Node.js** | 20.x | 22.x LTS |
| **npm** | 9.x | 10.x |
| **pnpm** | 8.x | 9.x (推荐) |
| **Git** | 2.x | 最新 |
| **Docker** | 20.x | 最新 (可选) |

### 生产环境

| 组件 | 要求 |
|------|------|
| **操作系统** | Linux (Ubuntu 20.04+, Debian 11+) |
| **CPU** | 2+ 核心推荐 |
| **内存** | 4GB+ (8GB+ 推荐) |
| **磁盘** | 20GB+ 可用空间 |
| **Docker** | 20.10+ |
| **Docker Compose** | 2.0+ |

---

## ⚡ 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/songzuo/7zi.git
cd 7zi
```

### 2. 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置文件
nano .env.local
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

---

## 🔐 环境配置

### 环境变量说明

#### 开发环境 (.env.local)

```bash
# ========================================
# 网站统计配置 (可选)
# ========================================

# Google Analytics 4
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Umami Analytics
NEXT_PUBLIC_UMAMI_ID=your-umami-id
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.studio

# 百度统计
NEXT_PUBLIC_BAIDU_ID=

# ========================================
# GitHub API 配置 (服务端)
# ========================================

# GitHub Personal Access Token
# 获取地址: https://github.com/settings/tokens
# 需要的权限: repo, user
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# GitHub 仓库信息 (公开，可使用 NEXT_PUBLIC_)
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace

# ========================================
# 邮件服务配置 (Resend)
# ========================================

# Resend API Key
# 获取地址: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# 邮件接收地址
CONTACT_EMAIL=business@7zi.studio

# 发件人地址
# 开发环境: onboarding@resend.dev
# 生产环境: noreply@yourdomain.com
FROM_EMAIL=onboarding@resend.dev
```

#### 生产环境 (.env.production)

```bash
# ========================================
# 应用基础配置
# ========================================
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# ========================================
# 网站统计 (生产环境)
# ========================================
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=your-umami-id
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.studio
NEXT_PUBLIC_BAIDU_ID=

# ========================================
# GitHub API
# ========================================
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi

# ========================================
# 邮件服务 (Resend)
# ========================================
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio

# ========================================
# Sentry 错误监控 (可选)
# ========================================
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# ========================================
# 应用程序特定配置
# ========================================
NEXT_PUBLIC_APP_URL=https://7zi.com
NEXT_PUBLIC_APP_NAME=7zi AI Platform
```

### 环境变量安全注意事项

⚠️ **重要**：

1. **不要提交 .env 文件到 Git** - 它们在 .gitignore 中
2. **使用不同的密钥** - 开发/测试/生产环境使用不同的 API 密钥
3. **定期轮换密钥** - 特别是生产环境的敏感密钥
4. **限制密钥权限** - 只授予必需的最小权限

---

## 💻 本地开发

### 开发命令

```bash
# 启动开发服务器 (热重载)
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码质量检查
pnpm lint              # ESLint 检查
pnpm lint:fix          # ESLint 自动修复
pnpm type-check        # TypeScript 类型检查
pnpm format            # Prettier 格式化
pnpm format:check      # Prettier 检查

# 测试
pnpm test              # 测试监视模式
pnpm test:run          # 运行所有测试
pnpm test:coverage     # 生成覆盖率报告

# E2E 测试
pnpm test:e2e          # 运行 E2E 测试
pnpm test:e2e:ui       # E2E 测试 UI
pnpm test:e2e:debug    # 调试 E2E 测试
```

### 开发工具推荐

- **VS Code** - 推荐的代码编辑器
- **ESLint** - 代码规范检查
- **Prettier** - 代码格式化
- **Vitest** - 单元测试框架
- **Playwright** - E2E 测试框架
- **React DevTools** - React 开发调试

### 目录结构

```
7zi/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API 路由
│   │   ├── dashboard/    # Dashboard 页面
│   │   ├── layout.tsx    # 根布局
│   │   └── page.tsx      # 首页
│   ├── components/       # React 组件
│   │   ├── ui/           # 基础 UI 组件
│   │   ├── dashboard/    # Dashboard 组件
│   │   ├── forms/        # 表单组件
│   │   └── ...           # 其他组件
│   ├── hooks/            # 自定义 Hooks
│   ├── lib/              # 工具库
│   ├── types/            # TypeScript 类型
│   └── styles/           # 样式文件
├── public/               # 静态资源
├── docs/                 # 文档
├── tests/                # 测试文件
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## 🏗️ 生产部署

### 方式一：直接部署到服务器

#### 1. 准备服务器

```bash
# SSH 登录到服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 22.x (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | bash -
apt install -y docker-compose

# 创建部署目录
mkdir -p /opt/7zi
cd /opt/7zi
```

#### 2. 上传代码

**方式 A：使用 Git**

```bash
# 克隆仓库
git clone https://github.com/songzuo/7zi.git .
git checkout main
```

**方式 B：使用 SCP/Rsync**

```bash
# 在本地机器执行
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='coverage' \
  ./ root@your-server-ip:/opt/7zi/
```

#### 3. 配置生产环境

```bash
# 复制环境变量模板
cp .env.production.example .env.production

# 编辑配置
nano .env.production
```

#### 4. 构建和启动

```bash
# 安装依赖
pnpm install --prod

# 构建应用
pnpm build

# 启动服务 (使用 PM2)
npm install -g pm2
pm2 start .next/standalone/server.js --name 7zi

# 或直接启动
pnpm start
```

#### 5. 配置 Nginx 反向代理

```bash
# 安装 Nginx
apt install -y nginx

# 创建站点配置
cat > /etc/nginx/sites-available/7zi << 'EOF'
server {
    listen 80;
    server_name 7zi.com www.7zi.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 7zi.com www.7zi.com;

    # SSL 证书 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/7zi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/7zi.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/7zi-access.log;
    error_log /var/log/nginx/7zi-error.log;

    # 反向代理到 Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# 启用站点
ln -s /etc/nginx/sites-available/7zi /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

#### 6. 配置 SSL 证书 (Let's Encrypt)

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书 (自动配置 Nginx)
certbot --nginx -d 7zi.com -d www.7zi.com

# 设置自动续期
certbot renew --dry-run
```

---

## 🐳 Docker 部署

### 方式一：Docker Compose (推荐)

#### 1. 准备 Docker Compose 配置

项目已提供 `docker-compose.yml` 和 `docker-compose.prod.yml`。

```bash
# 复制环境变量
cp .env.production .env

# 构建并启动
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 2. 查看状态

```bash
# 查看容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 进入容器
docker exec -it 7zi-frontend sh
```

#### 3. 重启和停止

```bash
# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 完全清理 (包括数据卷)
docker-compose -f docker-compose.prod.yml down -v
```

### 方式二：使用提供的部署脚本

#### 使用 `deploy-remote.sh` 脚本 (从本地部署到远程)

```bash
# 完整部署
./deploy-remote.sh deploy

# 快速部署 (仅同步代码和重启)
./deploy-remote.sh quick

# 查看日志
./deploy-remote.sh logs

# 查看状态
./deploy-remote.sh status

# 回滚
./deploy-remote.sh rollback
```

### Docker 配置说明

#### Dockerfile 特点

```dockerfile
# 多阶段构建
# Stage 1: 构建
FROM node:22-alpine AS builder
# ... 构建步骤 ...

# Stage 2: 运行
FROM node:22-alpine AS runner
# ... 运行时配置 ...
```

**优势**：
- 减小最终镜像大小
- 只包含运行时依赖
- 提高安全性

#### Docker Compose 特性

```yaml
version: '3.8'

services:
  7zi-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 🔄 CI/CD 自动化

### GitHub Actions 配置

项目使用 GitHub Actions 实现自动化部署。

#### 工作流程

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

#### 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret | 说明 | 示例 |
|--------|------|------|
| `DEPLOY_HOST` | 服务器地址 | 165.99.43.61 |
| `DEPLOY_USER` | SSH 用户 | root |
| `DEPLOY_KEY` | SSH 私钥 | -----BEGIN RSA PRIVATE KEY----- |
| `DEPLOY_PORT` | SSH 端口 | 22 |

#### 触发部署

**自动触发**：

```bash
# 推送到 main 分支
git push origin main
```

**手动触发**：

1. 进入 GitHub → Actions
2. 选择 "Deploy to Production" workflow
3. 点击 "Run workflow"

#### 工作流文件位置

- `.github/workflows/ci.yml` - CI 检查
- `.github/workflows/deploy.yml` - 部署流水线

---

## 📊 监控与维护

### 日志管理

#### 应用日志

```bash
# PM2 日志
pm2 logs 7zi

# Docker 日志
docker logs -f 7zi-frontend

# Nginx 日志
tail -f /var/log/nginx/7zi-access.log
tail -f /var/log/nginx/7zi-error.log
```

#### 日志轮转

配置 logrotate 自动轮转日志：

```bash
# /etc/logrotate.d/7zi
/var/log/nginx/7zi-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
```

### 性能监控

#### 使用 PM2 监控

```bash
# 安装 PM2 Plus (可选)
pm2 plus

# 查看监控面板
pm2 monit
```

#### 使用 Docker Stats

```bash
docker stats 7zi-frontend
```

### 健康检查

配置健康检查端点：

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
}
```

访问 `http://your-domain/api/health` 检查服务状态。

### 备份策略

#### 数据备份

```bash
# 创建备份目录
mkdir -p /opt/backups/7zi

# 备份脚本
cat > /opt/scripts/backup-7zi.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/backups/7zi
APP_DIR=/opt/7zi

# 创建备份
tar -czf $BACKUP_DIR/7zi-backup-$DATE.tar.gz \
  -C /opt 7zi/

# 保留最近 7 天的备份
find $BACKUP_DIR -name "7zi-backup-*.tar.gz" \
  -mtime +7 -delete

echo "Backup completed: 7zi-backup-$DATE.tar.gz"
EOF

# 添加到 crontab (每天凌晨 2 点)
crontab -e
0 2 * * * /opt/scripts/backup-7zi.sh
```

---

## 🔍 故障排查

### 常见问题

#### 1. 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3000

# 终止进程
kill -9 <PID>
```

#### 2. 内存不足

```bash
# 检查内存使用
free -h

# 增加 swap 空间
dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

#### 3. 构建失败

```bash
# 清除缓存
rm -rf .next
rm -rf node_modules
pnpm install
pnpm build
```

#### 4. Docker 容器无法启动

```bash
# 查看详细日志
docker-compose -f docker-compose.prod.yml logs

# 重建容器
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 5. SSL 证书问题

```bash
# 检查证书有效期
certbot certificates

# 手动续期
certbot renew

# 强制续期
certbot renew --force-renewal
```

### 调试模式

#### 启用 Next.js 调试

```bash
NODE_ENV=development pnpm dev
```

#### 查看 Docker 容器内部

```bash
docker exec -it 7zi-frontend sh
```

---

## ⚡ 性能优化

### 构建优化

#### 使用 Next.js 优化

```typescript
// next.config.ts
export default {
  // 启用 SWC minification
  swcMinify: true,

  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },

  // 压缩
  compress: true,

  // 实验性功能
  experimental: {
    optimizeCss: true,
  },
}
```

### 运行时优化

#### 启用缓存

```typescript
// 在 API 路由中启用缓存
export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
```

#### 使用 CDN

将静态资源上传到 CDN：

```bash
# 使用 Vercel Blob 或其他 CDN 服务
```

### 数据库优化

如果有数据库连接：

```typescript
// 使用连接池
const pool = createPool({
  max: 10,
  min: 2,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000
});
```

---

## 📝 维护检查清单

### 每日检查

- [ ] 检查服务状态
- [ ] 查看错误日志
- [ ] 监控资源使用

### 每周检查

- [ ] 更新依赖
- [ ] 检查安全漏洞
- [ ] 清理日志文件

### 每月检查

- [ ] 备份验证
- [ ] 性能评估
- [ ] SSL 证书续期检查

---

## 📞 支持与帮助

### 获取帮助

- 📧 Email: support@7zi.com
- 📚 文档: https://docs.7zi.com
- 🐛 Issue: https://github.com/songzuo/7zi/issues

### 相关文档

- [API 文档](./docs/API-REFERENCE.md)
- [架构设计](./docs/ARCHITECTURE.md)
- [开发指南](./docs/DEVELOPMENT.md)
- [测试指南](./docs/TESTING.md)

---

## 📄 许可证

[MIT License](./LICENSE)

---

**Made with ❤️ by 7zi AI Team**

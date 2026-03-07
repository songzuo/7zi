# 🚀 部署指南 (Deployment Guide)

本指南提供 7zi 项目的完整部署方案，包括 Docker、本地开发和生产环境部署。

---

## 📋 目录

- [环境要求](#环境要求)
- [本地开发部署](#本地开发部署)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [服务器部署](#服务器部署)
- [CI/CD 自动化](#cicd-自动化)
- [监控与维护](#监控与维护)
- [故障排查](#故障排查)

---

## 环境要求

### 基础环境

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 20.x | 22.x LTS |
| npm | 9.x | 10.x |
| pnpm | 8.x | 9.x (推荐) |
| Git | 2.x | 最新 |
| Docker | 20.x | 最新 |
| Docker Compose | 2.x | 最新 |

### 系统要求

- **操作系统**: Linux (推荐 Ubuntu 22.04+), macOS, Windows (WSL2)
- **内存**: 最低 2GB, 推荐 4GB+
- **存储**: 最低 5GB, 推荐 10GB+
- **CPU**: 最低 2 核，推荐 4 核+

### 环境变量

创建 `.env.local` 文件 (参考 `app/.env.example`)：

```bash
# GitHub API 配置
NEXT_PUBLIC_GITHUB_OWNER=songzhuo
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace
NEXT_PUBLIC_GITHUB_TOKEN=your-github-token  # 可选，但推荐

# 刷新间隔 (毫秒)
NEXT_PUBLIC_REFRESH_INTERVAL=30000

# 认证配置
# 生成强随机密钥：openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 应用配置 (可选)
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://7zi.com

# AI 模型配置 (OpenClaw，如使用)
# OPENCLAW_API_KEY=your-openclaw-api-key
# DEFAULT_MODEL=minimax/MiniMax-M2.5
```

---

## 本地开发部署

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

# 或使用 yarn
yarn install
```

### 3. 配置环境

```bash
# 复制环境配置模板
cp .env.example .env.local

# 编辑配置文件
nano .env.local
# 或
code .env.local
```

### 4. 启动开发服务器

```bash
# 进入 app 目录
cd app

# 启动开发服务器
pnpm dev
# 或
npm run dev
```

访问 http://localhost:3000

### 5. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试 (单次)
pnpm test:run

# 运行特定测试
pnpm test -- __tests__/auth.test.ts
```

### 6. 代码质量检查

```bash
# ESLint 检查
pnpm lint

# ESLint 自动修复
pnpm lint:fix

# Prettier 格式化
pnpm format

# Prettier 检查
pnpm format:check

# TypeScript 类型检查
pnpm type-check
```

---

## Docker 部署

### 快速启动

```bash
# 进入 app 目录
cd app

# 构建并启动
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### Docker 配置详情

#### Dockerfile

项目使用多阶段构建优化镜像大小：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ai-team-dashboard
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### Docker 常用命令

```bash
# 构建镜像
docker build -t 7zi-team .

# 运行容器
docker run -d \
  --name ai-team-dashboard \
  -p 3001:3000 \
  --env-file .env.local \
  7zi-team

# 查看容器状态
docker ps
docker stats ai-team-dashboard

# 查看日志
docker logs -f ai-team-dashboard
docker logs --tail 100 ai-team-dashboard

# 进入容器
docker exec -it ai-team-dashboard sh

# 停止容器
docker stop ai-team-dashboard

# 删除容器
docker rm ai-team-dashboard

# 重启容器
docker restart ai-team-dashboard

# 重新构建 (无缓存)
docker-compose build --no-cache

# 清理资源
docker-compose down
docker system prune -a
```

### 访问地址

- **本地**: http://localhost:3001
- **容器内**: http://127.0.0.1:3000
- **网络**: http://<容器 IP>:3000

---

## 生产环境部署

### 1. 构建生产版本

```bash
cd app

# 构建
pnpm build

# 输出目录
# .next/standalone/
# .next/static/
```

### 2. 启动生产服务

```bash
# 使用 standalone 服务器
NODE_ENV=production node .next/standalone/server.js

# 或使用 npm scripts
pnpm start
```

### 3. 使用 PM2 (推荐)

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start .next/standalone/server.js --name 7zi-team

# 配置开机启动
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs 7zi-team

# 重启
pm2 restart 7zi-team

# 停止
pm2 stop 7zi-team
pm2 delete 7zi-team
```

### 4. Nginx 反向代理

创建 `/etc/nginx/sites-available/7zi`：

```nginx
server {
    listen 80;
    server_name 7zi.com www.7zi.com;

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

    location /_next/static {
        alias /path/to/app/.next/static;
        expires 1y;
        access_log off;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/7zi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 服务器部署

### 目标服务器

| 服务器 | IP | 用途 | 状态 |
|--------|-----|------|------|
| 7zi.com | 165.99.43.61 | 主生产环境 | ⏳ 待部署 |
| bot5.szspd.cn | 182.43.36.134 | 测试环境 | ⏳ 待部署 |

### SSH 部署步骤

```bash
# 1. SSH 连接 (密码含 $ 必须用单引号)
sshpass -p 'ge20993344$ZZ' ssh root@7zi.com

# 2. 上传代码
scp -r app/ root@7zi.com:/opt/7zi/

# 3. 远程部署
ssh root@7zi.com << 'EOF'
cd /opt/7zi/app
npm install
npm run build
pm2 restart 7zi-team
EOF

# 4. 验证部署
curl -I http://7zi.com
```

### 自动化部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

SERVER="7zi.com"
USER="root"
DEPLOY_DIR="/opt/7zi"

echo "🚀 开始部署到 $SERVER..."

# 构建
echo "📦 构建应用..."
cd app
npm run build

# 同步文件
echo "📤 上传文件..."
rsync -avz --delete \
  .next/standalone/ \
  .next/static/ \
  package.json \
  $USER@$SERVER:$DEPLOY_DIR/app/

# 远程安装和重启
echo "🔄 远程部署..."
ssh $USER@$SERVER << EOF
  cd $DEPLOY_DIR/app
  npm install --production
  pm2 restart 7zi-team || pm2 start .next/standalone/server.js --name 7zi-team
EOF

echo "✅ 部署完成!"
echo "🌐 访问：http://$SERVER"
```

---

## CI/CD 自动化

### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: |
          cd app
          npm ci
      
      - name: Build
        run: |
          cd app
          npm run build
      
      - name: Test
        run: |
          cd app
          npm run test:run
      
      - name: Deploy to Server
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.SERVER_HOST }}
          REMOTE_USER: root
          SOURCE: app/.next/standalone/
          TARGET: /opt/7zi/app
```

详见 [`CI-CD-SETUP.md`](./CI-CD-SETUP.md)

---

## 监控与维护

### 健康检查

```bash
# Docker 健康检查
docker inspect --format='{{.State.Health.Status}}' ai-team-dashboard

# HTTP 健康检查
curl -f http://localhost:3000/ || echo "服务异常"

# PM2 监控
pm2 monit
```

### 日志管理

```bash
# 查看实时日志
docker-compose logs -f app

# 查看错误日志
docker-compose logs --tail 100 app | grep ERROR

# 日志轮转 (logrotate)
# /etc/logrotate.d/7zi
/var/log/7zi/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}
```

### 性能监控

```bash
# 容器资源使用
docker stats ai-team-dashboard

# 系统资源
htop
df -h
free -m

# 网络监控
netstat -tulpn | grep 3000
```

### 备份策略

详见 [`BACKUP-POLICY.md`](./BACKUP-POLICY.md)

```bash
# 数据库备份
pg_dump 7zi > backup-$(date +%Y%m%d).sql

# 文件备份
tar -czf workspace-backup-$(date +%Y%m%d).tar.gz /root/.openclaw/workspace

# 上传到云存储
aws s3 cp backup-*.tar.gz s3://7zi-backups/
```

---

## 故障排查

### 常见问题

#### 1. 端口冲突

```bash
# 检查端口占用
lsof -i :3000
netstat -tulpn | grep 3000

# 修改端口
# 编辑 docker-compose.yml
ports:
  - "3001:3000"  # 改为其他端口
```

#### 2. 内存不足

```bash
# 查看内存使用
free -m
docker stats

# 调整资源限制
# 编辑 docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G  # 增加内存限制
```

#### 3. 构建失败

```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules .next
npm install

# 重新构建
npm run build
```

#### 4. SSH 连接问题

详见 [`SSH-TROUBLESHOOTING.md`](./SSH-TROUBLESHOOTING.md)

```bash
# 测试连接
ssh -v root@7zi.com

# 检查密钥
ssh-add -l
ssh-keygen -lf ~/.ssh/id_ed25519.pub

# 重新配置
sshpass -p 'ge20993344$ZZ' ssh-copy-id root@7zi.com
```

### 紧急回滚

```bash
# Docker 回滚
docker-compose down
docker-compose up -d --build

# PM2 回滚
pm2 reload 7zi-team --update-env

# 代码回滚
git revert HEAD
git push
```

---

## 相关文档

- [CI/CD 设置](./CI-CD-SETUP.md)
- [备份策略](./BACKUP-POLICY.md)
- [服务器清单](./SERVERS.md)
- [SSH 配置](./SSH-SETUP.md)
- [故障排查](./SSH-TROUBLESHOOTING.md)
- [GCP 配置](./GCP-CONFIG.md)

---

**最后更新**: 2026-03-06  
**维护者**: 系统管理员 (Bailian)

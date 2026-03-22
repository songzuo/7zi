# 7zi-frontend 部署就绪检查报告

**检查时间**: 2026-03-22 19:46:00 GMT+1
**检查人**: 🛡️ 系统管理员 (子代理)
**项目路径**: `/root/.openclaw/workspace/7zi-project`
**目标服务器**: 7zi.com (165.99.43.61)

---

## 📊 检查概览

| 检查项 | 状态 | 优先级 |
|--------|------|--------|
| .env.production 配置 | ⚠️ 部分配置 | 高 |
| 部署脚本 | ⚠️ 简化版存在 | 高 |
| next.config.ts | ✅ 已创建 | 高 |
| public/ 静态资源 | ✅ 正常 | 中 |
| Dockerfile | ❌ 缺失 | 高 |
| docker-compose.prod.yml | ❌ 缺失 | 高 |

**总体状态**: 🔶 部分就绪 - 需要修复关键问题后才能部署

---

## 1️⃣ .env.production 配置检查

### ✅ 已配置变量 (6/17)

```bash
NODE_ENV=production              # ✅ 基础配置
PORT=3000                        # ✅ 端口配置
HOSTNAME=0.0.0.0                 # ✅ 主机配置
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com # ✅ Plausible Analytics
NEXT_PUBLIC_GITHUB_OWNER=songzhuo # ✅ GitHub Owner
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace # ✅ GitHub Repo
```

### ⚠️ 缺失/注释变量 (11/17)

#### 🔴 高优先级（影响核心功能）

1. **RESEND_API_KEY** - 邮件服务 API Key
   - 状态: 已注释
   - 影响: 联系表单无法发送邮件
   - 建议: 从 https://resend.com/api-keys 获取并配置

2. **CONTACT_EMAIL** - 邮件接收地址
   - 状态: 已注释
   - 影响: 联系表单无法正常工作
   - 建议: 设置为实际业务邮箱 (如 business@7zi.studio)

3. **FROM_EMAIL** - 邮件发送地址
   - 状态: 已注释
   - 影响: 邮件发送失败
   - 建议: 设置为 noreply@7zi.studio 并在 Resend 验证域名

4. **GITHUB_TOKEN** - GitHub API Token
   - 状态: 已注释
   - 影响: Dashboard API 代理功能受限
   - 建议: 从 https://github.com/settings/tokens 获取 (repo 权限)

#### 🟡 中优先级（建议配置）

5. **NEXT_PUBLIC_SENTRY_DSN** - Sentry 错误监控
   - 状态: 已注释
   - 影响: 无法捕获前端错误
   - 建议: 生产环境强烈推荐启用

6. **SENTRY_AUTH_TOKEN** - Sentry 发布跟踪
   - 状态: 已注释
   - 影响: 无法跟踪发布版本
   - 建议: 与 Sentry DSN 配合使用

#### 🟢 低优先级（可选）

7-11. 其他分析服务 (Google Analytics, Umami, 百度统计)
   - 状态: 已注释
   - 影响: 无 (已有 Plausible)
   - 建议: 根据需求选择配置

### 🔐 密钥配置指引

#### Resend API Key 配置

```bash
# 步骤 1: 访问 Resend 控制台
https://resend.com/api-keys

# 步骤 2: 创建 API Key
# 点击 "Create API Key" → 权限选择 "Send emails" → 复制 Key

# 步骤 3: 验证域名
# 在 Resend 添加 7zi.studio → 配置 DNS TXT 和 DKIM 记录

# 步骤 4: 更新 .env.production
RESEND_API_KEY=re_xxxxxxxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio
```

#### GitHub Token 配置

```bash
# 步骤 1: 访问 GitHub Settings
https://github.com/settings/tokens

# 步骤 2: 创建 Personal Access Token (Classic)
# 过期时间: 90 days
# 权限: repo (Full control of private repositories)

# 步骤 3: 更新 .env.production
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

#### Sentry 配置

```bash
# 步骤 1: 访问 Sentry 控制台
https://sentry.io/

# 步骤 2: 创建 Next.js 项目
# 平台选择: Next.js
# 项目名称: 7zi-frontend

# 步骤 3: 获取 DSN
# 在项目设置中找到 "Client Keys (DSN)"

# 步骤 4: 更新 .env.production
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 2️⃣ 部署脚本检查

### ✅ 存在的脚本

1. **deploy-quick.sh** (1886 bytes)
   - 功能: 快速部署（代码同步 + 服务重启）
   - 服务器: 7zi.com
   - 路径: `/opt/7zi-frontend`
   - 包含: 健康检查、日志查看

2. **docker-compose.optimized.yml** (2988 bytes)
   - 功能: 生产环境优化配置
   - 依赖: Dockerfile.production
   - 包含: 7zi-frontend + Nginx 反向代理

3. **docker-compose.staging.yml** (2525 bytes)
   - 功能: Staging 环境配置
   - 依赖: Dockerfile
   - 包含: 7zi-frontend-staging + Nginx-staging

### ❌ 缺失的关键脚本

1. **deploy.sh** - 主部署脚本（蓝绿部署）
   - 状态: 缺失
   - 影响: 无法执行完整部署流程
   - 建议: 参考 DEPLOYMENT_GUIDE.md 创建

2. **docker-compose.prod.yml** - 生产环境 Compose 文件
   - 状态: 缺失
   - 影响: 无法执行生产环境部署
   - 建议: 创建基于 docker-compose.optimized.yml 的版本

3. **docker-compose.zero-downtime.yml** - 零停机部署配置
   - 状态: 缺失
   - 影响: 无法执行蓝绿部署
   - 建议: 根据 DEPLOYMENT_GUIDE.md 创建

### 📋 部署脚本建议

```bash
# 创建主部署脚本 deploy.sh
# 功能:
# - 前置条件检查
# - 环境配置验证
# - 代码同步
# - 备份创建
# - 蓝绿部署
# - 健康检查
# - 回滚机制
# - 日志记录

# 创建 docker-compose.prod.yml
# 基于 docker-compose.optimized.yml
# 添加蓝绿槽位配置:
# - 7zi-frontend-blue
# - 7zi-frontend-green
# - 7zi-nginx (upstream 配置)
```

---

## 3️⃣ next.config.ts 检查

### ✅ 已创建

**文件**: `/root/.openclaw/workspace/7zi-project/next.config.ts`
**状态**: ✅ 新创建 (1376 bytes)
**功能**:

```typescript
✅ 输出模式: standalone (Docker 部署必需)
✅ 图片优化: AVIF/WebP 支持
✅ 安全头: HSTS, X-Frame-Options, X-Content-Type-Options, XSS Protection
✅ 压缩: 启用
✅ 严格模式: 启用
✅ 生产 Source Map: 关闭 (安全)
```

**配置亮点**:
- ✅ Standalone 模式: 优化 Docker 镜像大小
- ✅ 安全头: 符合最佳实践
- ✅ 图片优化: 支持 AVIF/WebP 现代格式
- ✅ 压缩: 自动启用 gzip

**验证命令**:
```bash
cd /root/.openclaw/workspace/7zi-project
npm run build
```

---

## 4️⃣ public/ 静态资源检查

### ✅ 文件状态 (21 个文件)

| 文件类型 | 文件 | 状态 |
|----------|------|------|
| Favicon | favicon.ico | ✅ 正常 |
| Icon | icon-72.png | ✅ 正常 |
| Icon | icon-96.png | ✅ 正常 |
| Icon | icon-128.png | ✅ 正常 |
| Icon | icon-144.png | ✅ 正常 |
| Icon | icon-152.png | ✅ 正常 |
| Icon | icon-192.png | ✅ 正常 |
| Icon | icon-384.png | ✅ 正常 |
| Icon | icon-512.png | ✅ 正常 |
| Maskable Icon | maskable-icon-512.png | ✅ 正常 |
| Screenshot | screenshot-narrow.png | ✅ 正常 |
| Screenshot | screenshot-wide.png | ✅ 正常 |
| Shortcut | shortcut-agents.png | ✅ 正常 |
| Shortcut | shortcut-new.png | ✅ 正常 |
| Shortcut | shortcut-projects.png | ✅ 正常 |
| PWA Manifest | manifest.json | ✅ 正常 |
| Robots Backup | robots.txt.backup.20260322_154218 | ⚠️ 备份文件 |
| Sitemap Backup | sitemap.xml.backup.20260322_154218 | ⚠️ 备份文件 |

### ⚠️ 发现的问题

1. **robots.txt 缺失**
   - 状态: 仅有备份文件
   - 影响: SEO 受影响（搜索引擎爬虫无法获取规则）
   - 建议: 从备份恢复或创建新的 robots.txt

2. **sitemap.xml 缺失**
   - 状态: 仅有备份文件
   - 影响: SEO 受影响（搜索引擎无法发现所有页面）
   - 建议: 从备份恢复或使用 Next.js 生成 sitemap

### 🔧 修复建议

```bash
# 方案 1: 从备份恢复
cd /root/.openclaw/workspace/7zi-project/public
cp robots.txt.backup.20260322_154218 robots.txt
cp sitemap.xml.backup.20260322_154218 sitemap.xml

# 方案 2: 创建基础 robots.txt
cat > public/robots.txt << EOF
# 7zi-frontend Robots.txt
# Last updated: 2026-03-22

User-agent: *
Allow: /

# Sitemap
Sitemap: https://7zi.com/sitemap.xml
EOF

# 方案 3: 使用 Next.js 动态生成 sitemap
# 创建 src/app/sitemap.ts
# 参考: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
```

---

## 5️⃣ Dockerfile 检查

### ❌ 缺失

**状态**: 未找到任何 Dockerfile
**影响**: 无法构建 Docker 镜像
**优先级**: 🔴 高

### 📋 需要创建的 Dockerfile

#### 1. Dockerfile (基础版)

```dockerfile
# ============================================
# 7zi-frontend Dockerfile (基础版)
# ============================================
FROM node:22-alpine AS deps

# 安装依赖
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ============================================
# 构建阶段
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN npm run build

# ============================================
# 运行阶段
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### 2. Dockerfile.production (生产优化版)

```dockerfile
# ============================================
# 7zi-frontend Dockerfile (生产优化版)
# 多阶段构建 + 安全加固
# ============================================
FROM node:22-alpine AS deps

# 安装系统依赖
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# 构建阶段
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 设置环境变量
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN npm run build

# ============================================
# 运行阶段 (Alpine)
# ============================================
FROM node:22-alpine AS runner-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安全加固: 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]

# ============================================
# 运行阶段 (Distroless - 最高安全)
# ============================================
FROM gcr.io/distroless/nodejs22-debian12 AS runner-distroless

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制构建产物 (以非 root 用户)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Distroless 镜像自动使用非 root 用户

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

---

## 6️⃣ docker-compose.prod.yml 检查

### ❌ 缺失

**状态**: 未找到 docker-compose.prod.yml
**影响**: 无法执行生产环境部署
**优先级**: 🔴 高

### 📋 建议创建

```yaml
# ============================================
# 7zi-frontend Docker Compose (生产环境 - 蓝绿部署)
# ============================================
version: "3.8"

services:
  # 蓝色容器 (当前版本)
  7zi-frontend-blue:
    build:
      context: .
      dockerfile: Dockerfile.production
      target: runner-alpine
      args:
        - NODE_ENV=production
    image: registry.7zi.com/7zi-frontend:blue
    container_name: 7zi-frontend-blue
    restart: unless-stopped

    ports:
      - "3001:3000"

    env_file:
      - .env.production

    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_TELEMETRY_DISABLED=1

    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M

    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    networks:
      - 7zi-network

  # 绿色容器 (新版本)
  7zi-frontend-green:
    build:
      context: .
      dockerfile: Dockerfile.production
      target: runner-alpine
      args:
        - NODE_ENV=production
    image: registry.7zi.com/7zi-frontend:green
    container_name: 7zi-frontend-green
    restart: unless-stopped

    ports:
      - "3002:3000"

    env_file:
      - .env.production

    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_TELEMETRY_DISABLED=1

    deploy:
      resources:
        limits:
          cpus: "1"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M

    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

    networks:
      - 7zi-network

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    container_name: 7zi-nginx
    restart: unless-stopped

    ports:
      - "80:80"
      - "443:443"

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /web/ssl_unified:/web/ssl_unified:ro
      - ./nginx/logs:/var/log/nginx

    depends_on:
      - 7zi-frontend-blue
      - 7zi-frontend-green

    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "3"

    networks:
      - 7zi-network

networks:
  7zi-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/16
```

---

## 📋 部署就绪清单

### 🔴 必须修复 (阻塞部署)

- [ ] **创建 Dockerfile** - 基础版或生产优化版
- [ ] **创建 Dockerfile.production** - 生产多阶段构建
- [ ] **创建 docker-compose.prod.yml** - 生产环境配置
- [ ] **创建 deploy.sh** - 主部署脚本（蓝绿部署）
- [ ] **配置 .env.production 高优先级变量**:
  - [ ] RESEND_API_KEY
  - [ ] CONTACT_EMAIL
  - [ ] FROM_EMAIL
  - [ ] GITHUB_TOKEN
- [ ] **恢复 public/robots.txt** - 从备份或新建

### 🟡 建议修复 (优化部署)

- [ ] **配置 Sentry 错误监控**:
  - [ ] NEXT_PUBLIC_SENTRY_DSN
  - [ ] SENTRY_AUTH_TOKEN
- [ ] **恢复 public/sitemap.xml** - 从备份或动态生成
- [ ] **创建 nginx/nginx.conf** - Nginx 反向代理配置
- [ ] **创建 docker-compose.zero-downtime.yml** - 零停机部署

### 🟢 可选配置 (增强功能)

- [ ] **配置 Google Analytics** - 如需使用
- [ ] **配置 Umami Analytics** - 自托管分析
- [ ] **配置百度统计** - 国内流量分析

---

## 🚀 快速修复步骤

### 步骤 1: 创建 Dockerfile

```bash
cd /root/.openclaw/workspace/7zi-project
nano Dockerfile
# 复制上面提供的 Dockerfile 内容
```

### 步骤 2: 创建 Dockerfile.production

```bash
cd /root/.openclaw/workspace/7zi-project
nano Dockerfile.production
# 复制上面提供的 Dockerfile.production 内容
```

### 步骤 3: 创建 docker-compose.prod.yml

```bash
cd /root/.openclaw/workspace/7zi-project
nano docker-compose.prod.yml
# 复制上面提供的 docker-compose.prod.yml 内容
```

### 步骤 4: 恢复 public/robots.txt

```bash
cd /root/.openclaw/workspace/7zi-project/public
cp robots.txt.backup.20260322_154218 robots.txt
```

### 步骤 5: 配置 .env.production

```bash
cd /root/.openclaw/workspace/7zi-project
nano .env.production
# 取消注释并填入实际值:
# RESEND_API_KEY=re_xxxxxxxxxxxxx
# CONTACT_EMAIL=business@7zi.studio
# FROM_EMAIL=noreply@7zi.studio
# GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
```

### 步骤 6: 验证配置

```bash
cd /root/.openclaw/workspace/7zi-project

# 检查 Dockerfile
ls -la Dockerfile*

# 检查 Compose 文件
ls -la docker-compose*.yml

# 验证 next.config.ts
cat next.config.ts

# 验证环境变量
cat .env.production | grep -v "^#" | grep -v "^$"

# 测试构建
npm run build
```

### 步骤 7: 创建部署脚本

```bash
# 参考以下文档创建 deploy.sh:
# - DEPLOYMENT_GUIDE.md
# - DEPLOYMENT_QUICK_REF.md
# - docs/cicd-optimization.md
```

---

## 📊 修复优先级排序

| 优先级 | 任务 | 预计时间 | 影响 |
|--------|------|----------|------|
| P0 | 创建 Dockerfile | 5 分钟 | 阻塞部署 |
| P0 | 创建 Dockerfile.production | 10 分钟 | 阻塞部署 |
| P0 | 创建 docker-compose.prod.yml | 15 分钟 | 阻塞部署 |
| P0 | 配置 .env.production 高优先级变量 | 20 分钟 | 影响核心功能 |
| P0 | 恢复 public/robots.txt | 1 分钟 | 影响 SEO |
| P1 | 创建 deploy.sh | 30 分钟 | 影响部署体验 |
| P1 | 配置 Sentry | 15 分钟 | 影响错误监控 |
| P1 | 恢复 public/sitemap.xml | 5 分钟 | 影响 SEO |
| P2 | 创建 nginx/nginx.conf | 20 分钟 | 影响 Nginx 配置 |
| P3 | 配置其他分析服务 | 30 分钟 | 可选 |

---

## 🎯 部署风险评估

| 风险项 | 当前状态 | 风险等级 | 缓解措施 |
|--------|----------|----------|----------|
| Docker 镜像构建 | 缺失 Dockerfile | 🔴 高 | 创建 Dockerfile |
| 环境变量配置 | 部分缺失 | 🟡 中 | 配置必需变量 |
| 部署脚本 | 简化版存在 | 🟡 中 | 创建主部署脚本 |
| 静态资源 | robots.txt 缺失 | 🟢 低 | 从备份恢复 |
| 错误监控 | 未配置 | 🟢 低 | 配置 Sentry |
| SEO 优化 | sitemap.xml 缺失 | 🟢 低 | 从备份恢复或生成 |

---

## ✅ 检查总结

### 已完成

- ✅ **next.config.ts** - 已创建，包含生产环境优化配置
- ✅ **public/** - 静态资源文件正常（21 个文件）
- ✅ **.env.production** - 基础配置完整（6/17 变量）
- ✅ **docker-compose.optimized.yml** - 生产优化配置存在
- ✅ **docker-compose.staging.yml** - Staging 环境配置存在
- ✅ **deploy-quick.sh** - 快速部署脚本存在

### 需要修复

- ❌ **Dockerfile** - 缺失，阻塞部署
- ❌ **Dockerfile.production** - 缺失，阻塞部署
- ❌ **docker-compose.prod.yml** - 缺失，阻塞部署
- ❌ **deploy.sh** - 主部署脚本缺失
- ⚠️ **.env.production** - 高优先级变量未配置（4 个）
- ⚠️ **public/robots.txt** - 仅存在备份文件
- ⚠️ **public/sitemap.xml** - 仅存在备份文件

### 部署就绪度

**当前就绪度**: 40%
**目标就绪度**: 90%+ (建议配置 Sentry 后)

**关键路径**:
1. 创建 Dockerfile →
2. 创建 Dockerfile.production →
3. 创建 docker-compose.prod.yml →
4. 配置 .env.production 高优先级变量 →
5. 恢复 public/robots.txt →
6. 测试构建 →
7. 部署

---

## 📞 参考文档

- [部署指南](./DEPLOYMENT_GUIDE.md)
- [部署快速参考](./DEPLOYMENT_QUICK_REF.md)
- [环境变量配置检查清单](./.env-production-checklist.md)
- [Next.js 配置文档](https://nextjs.org/docs/app/api-reference/next-config-js)

---

**检查完成时间**: 2026-03-22 19:46:00 GMT+1
**下一步**: 根据优先级修复关键问题，完成部署准备

---

*本报告由 🛡️ 系统管理员 (子代理) 自动生成*

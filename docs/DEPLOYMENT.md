# 部署文档

**版本**: v1.4.0
**更新日期**: 2026-03-29
**Next.js**: 16.2.1
**React**: 19.2.4

---

## 📋 概述

本文档描述 7zi-frontend 项目的完整部署方案，支持本地部署和 CI/CD 自动部署。

## 🏗️ 部署架构

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

## 📁 部署文件结构

```
7zi-project/
├── Dockerfile                 # Docker 镜像构建文件
├── docker-compose.yml         # 开发环境 Docker Compose
├── docker-compose.prod.yml    # 生产环境 Docker Compose
├── deploy.sh                  # 本地部署脚本
├── deploy-remote.sh           # 远程部署脚本 ⭐
├── .env.example               # 环境变量示例
├── .env.production            # 生产环境变量
├── .env.production.example    # 生产环境变量示例
├── nginx/
│   └── nginx.conf             # Nginx 配置
└── .github/workflows/
    ├── ci.yml                 # CI 流水线
    └── deploy.yml             # 自动部署流水线 ⭐
```

---

## 🚀 部署方式

### 方式一：远程部署脚本（推荐）

从本地机器直接部署到服务器：

```bash
# 进入项目目录
cd ~/7zi-project

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

---

## ⚙️ 服务器配置

### 目标服务器

| 项目     | 值                |
| -------- | ----------------- |
| 域名     | 7zi.com           |
| IP       | 165.99.43.61      |
| 用户     | root              |
| 部署路径 | /opt/7zi-frontend |

### 前置要求

服务器需要安装：

- Docker 20.10+
- Docker Compose 2.0+
- Git（可选）

自动安装脚本会检查并安装缺失的依赖。

---

## 🔐 环境变量配置

### 必需配置

在服务器上创建 `/opt/7zi-frontend/.env.production`：

```bash
# ============================================
# 基础配置
# ============================================
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# ============================================
# 网站统计配置
# ============================================
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Umami Analytics
NEXT_PUBLIC_UMAMI_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is

# 百度统计（可选）
NEXT_PUBLIC_BAIDU_ID=

# ============================================
# 邮件服务配置
# ============================================
# Resend API Key（用于发送邮件）
RESEND_API_KEY=re_xxxxxxxxxxxxx

# 联系邮箱
CONTACT_EMAIL=business@7zi.studio

# 发件人邮箱
FROM_EMAIL=noreply@7zi.studio

# ============================================
# API 配置
# ============================================
# API 基础 URL（根据环境调整）
NEXT_PUBLIC_API_URL=https://7zi.com/api

# API 超时时间（毫秒）
NEXT_PUBLIC_API_TIMEOUT=30000

# ============================================
# 性能优化配置
# ============================================
# 禁用 Next.js 遥测
NEXT_TELEMETRY_DISABLED=1

# 启用图片优化
NEXT_PUBLIC_IMAGE_OPTIMIZATION=true

# ============================================
# CDN 配置（生产环境）
# ============================================
# CDN 基础 URL
NEXT_PUBLIC_CDN_URL=https://cdn.7zi.com

# 启用 CDN
NEXT_PUBLIC_ENABLE_CDN=true

# ============================================
# 数据库配置
# ============================================
# SQLite 数据库路径（相对路径）
DATABASE_URL=file:./data/7zi.db

# ============================================
# Redis 配置
# ============================================
# Redis 连接 URL（完整格式）
# 格式: redis://[username:password@]host:port/db
# 示例: redis://:password@localhost:6379/0
REDIS_URL=

# 或者使用以下单独配置（不使用 REDIS_URL 时生效）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis 限流配置
# 启用 Redis 限流（如未设置将使用内存限流）
ENABLE_REDIS_RATE_LIMIT=true

# ============================================
# 安全配置
# ============================================
# 允许的源（CORS）
NEXT_PUBLIC_ALLOWED_ORIGINS=https://7zi.com,https://www.7zi.com

# ============================================
# 功能开关
# ============================================
# 启用分析
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# 启用性能监控
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# 启用错误追踪
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true

# 启用日志
NEXT_PUBLIC_ENABLE_LOGGING=true

# ============================================
# 开发/调试配置（仅开发环境）
# ============================================
# 启用 Source Maps（生产环境应禁用）
NEXT_PUBLIC_SOURCE_MAPS=false

# 启用调试模式（生产环境应禁用）
NEXT_PUBLIC_DEBUG_MODE=false

# ============================================
# 第三方服务配置
# ============================================
# 腾讯云 COS（对象存储）
# NEXT_PUBLIC_COS_BUCKET=
# NEXT_PUBLIC_COS_REGION=
# NEXT_PUBLIC_COS_CDN=

# 阿里云 OSS（对象存储）
# NEXT_PUBLIC_OSS_BUCKET=
# NEXT_PUBLIC_OSS_REGION=
# NEXT_PUBLIC_OSS_ENDPOINT=

# ============================================
# 社交媒体配置
# ============================================
# Twitter
NEXT_PUBLIC_TWITTER_HANDLE=7zi_studio

# GitHub
NEXT_PUBLIC_GITHUB_REPO=7zi-project

# ============================================
# SEO 配置
# ============================================
# 默认标题
NEXT_PUBLIC_DEFAULT_TITLE=7zi Studio

# 默认描述
NEXT_PUBLIC_DEFAULT_DESCRIPTION=专业的 3D Web 体验开发工作室

# 默认关键词
NEXT_PUBLIC_DEFAULT_KEYWORDS=3d,webgl,web,development,studio

# ============================================
# 国际化配置（i18n）
# ============================================
# 默认语言
NEXT_PUBLIC_DEFAULT_LOCALE=zh-CN

# 支持的语言
NEXT_PUBLIC_SUPPORTED_LOCALES=zh-CN,en-US

# ============================================
# 其他配置
# ============================================
# 版本号（自动生成）
NEXT_PUBLIC_APP_VERSION=3.0.0

# 构建时间（自动生成）
NEXT_PUBLIC_BUILD_TIME=
```

### GitHub Secrets 配置

在 GitHub 仓库设置中添加：

| Secret        | 说明                         |
| ------------- | ---------------------------- |
| `DEPLOY_HOST` | 服务器地址 (165.99.43.61)    |
| `DEPLOY_USER` | SSH 用户 (root)              |
| `DEPLOY_PASS` | SSH 密码                     |
| `DEPLOY_PATH` | 部署路径 (/opt/7zi-frontend) |

---

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
- 数据卷持久化

---

## 🔄 CI/CD 流程

### 部署流水线

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Pull      │  │    Test     │  │    Build    │  │   Deploy    │
│   Request   │──▶│   (Vitest)  │──▶│  (Next.js)  │──▶│  (SSH)     │
│   Check     │  └─────────────┘  └─────────────┘  └─────────────┘
└─────────────┘
```

### 流水线阶段

1. **Lint** - ESLint 代码风格检查
2. **Type Check** - TypeScript 类型检查
3. **Test** - Vitest 单元测试
4. **Build** - Next.js 构建
5. **Deploy** - SSH 部署到服务器

### GitHub Actions 配置

文件位置：`.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          password: ${{ secrets.DEPLOY_PASS }}
          script: |
            cd ${{ secrets.DEPLOY_PATH }}
            ./deploy.sh quick
```

---

## 🛠️ 常用命令速查

### 本地开发

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
npm run lint         # 代码检查
npm run lint:fix     # 自动修复问题
npm run test         # 运行测试
npm run test:coverage # 生成覆盖率报告
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

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

### 远程部署

```bash
./deploy-remote.sh deploy    # 完整部署
./deploy-remote.sh quick     # 快速部署
./deploy-remote.sh logs      # 查看日志
./deploy-remote.sh status    # 查看状态
./deploy-remote.sh restart   # 重启服务
./deploy-remote.sh stop      # 停止服务
./deploy-remote.sh rollback  # 回滚
```

### 数据库操作

```bash
# 进入容器
docker-compose -f docker-compose.prod.yml exec 7zi-frontend sh

# 备份数据库
cp data/7zi.db backups/7zi-backup-$(date +%Y%m%d-%H%M%S).db

# 恢复数据库
cp backups/7zi-backup-20240324-120000.db data/7zi.db
```

---

## 🔧 故障排查

### 服务无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs

# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 检查端口占用
netstat -tlnp | grep 3000

# 查看详细日志
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### 健康检查失败

```bash
# 手动测试
curl http://localhost:3000/

# 检查容器内部
docker-compose -f docker-compose.prod.yml exec 7zi-frontend sh

# 检查环境变量
docker-compose -f docker-compose.prod.yml exec 7zi-frontend env

# 检查数据库连接
docker-compose -f docker-compose.prod.yml exec 7zi-frontend ls -la data/
```

### 回滚操作

```bash
# 使用部署脚本回滚
./deploy-remote.sh rollback

# 或手动恢复备份
ls -la /opt/backups/
cp /opt/backups/7zi-backup-20240324-120000.db data/7zi.db

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

### 数据库问题

```bash
# 检查数据库文件
ls -la data/7zi.db

# 数据库优化
curl http://localhost:3000/api/database/optimize

# 数据库健康检查
curl http://localhost:3000/api/database/health
```

---

## 📊 监控和日志

### 日志位置

- **应用日志**：`docker logs 7zi-frontend`
- **Nginx 日志**：`/var/log/nginx/`
- **备份数据**：`/opt/backups/`
- **数据导出**：`./exports/`

### 健康检查端点

- **应用**：`http://localhost:3000/`
- **系统健康**：`http://localhost:3000/api/health`
- **数据库健康**：`http://localhost:3000/api/database/health`
- **详细健康**：`http://localhost:3000/api/health/detailed`

### 性能监控

```bash
# 获取性能指标
curl http://localhost:3000/api/performance/metrics

# 获取性能报告
curl http://localhost:3000/api/performance/report

# 查看 Web Vitals
curl http://localhost:3000/api/vitals
```

---

## 🔒 安全建议

### 基础安全

1. **修改默认密码**：部署后修改服务器密码
2. **配置 SSL**：使用 Let's Encrypt 配置 HTTPS
3. **防火墙**：只开放必要端口 (80, 443, 22)
4. **定期更新**：更新系统和 Docker 镜像
5. **备份策略**：定期备份数据库和配置文件

### 应用安全

1. **环境变量**：不要将敏感信息提交到 Git
2. **JWT Secret**：使用强随机密钥
3. **CORS 配置**：限制允许的源
4. **Rate Limiting**：启用 API 限流
5. **输入验证**：所有输入都需要验证

### 网络安全

1. **HTTPS**：强制使用 HTTPS
2. **CSP 策略**：配置内容安全策略
3. **XSS 防护**：启用 XSS 保护
4. **安全头部**：配置安全相关 HTTP 头

---

## 🚀 性能优化

### 前端优化

1. **代码分割**：Next.js 自动代码分割
2. **懒加载**：动态导入非关键组件
3. **图片优化**：使用 Next.js Image 组件
4. **字体优化**：使用 font-display: swap
5. **缓存策略**：配置适当的缓存头

### 后端优化

1. **缓存机制**：Redis + 内存缓存
2. **数据库索引**：SQLite 索引优化
3. **连接池**：数据库连接管理
4. **Gzip 压缩**：启用响应压缩
5. **CDN**：使用 CDN 加速静态资源

### Nginx 配置

```nginx
# Gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 缓存静态资源
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# 安全头部
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

---

## 📝 备份策略

### 自动备份

- **数据库**：每日备份，保留 7 天
- **配置文件**：每次部署前备份
- **导出数据**：按需备份

### 手动备份

```bash
# 备份数据库
cp data/7zi.db backups/7zi-backup-$(date +%Y%m%d-%H%M%S).db

# 备份配置
cp .env.production backups/env-production-$(date +%Y%m%d).bak

# 导出数据
curl -X POST http://localhost:3000/api/backup/export
```

### 恢复备份

```bash
# 恢复数据库
cp backups/7zi-backup-20240324-120000.db data/7zi.db

# 重启服务
docker-compose -f docker-compose.prod.yml restart
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构
- [API.md](./API.md) - API 文档

---

## 📞 支持

如有问题，请联系：

- **GitHub Issues**: https://github.com/songzuo/7zi/issues
- **Email**: business@7zi.studio

---

**文档维护**: 🛡️ 系统管理员 (AI 团队)
**最后更新**: 2026-03-24

# 🔐 环境变量配置指南

> 7zi Platform 环境变量完整配置说明

最后更新：2026-03-18

---

## 📋 目录

- [概述](#概述)
- [环境变量类型](#环境变量类型)
- [开发环境配置](#开发环境配置)
- [生产环境配置](#生产环境配置)
- [CI/CD 配置](#cicd-配置)
- [安全最佳实践](#安全最佳实践)
- [常见问题](#常见问题)

---

## 📖 概述

### 环境变量文件

7zi Platform 使用以下环境变量文件：

| 文件              | 用途                      | 提交到 Git |
| ----------------- | ------------------------- | ---------- |
| `.env.example`    | 环境变量示例模板          | ✅ 是      |
| `.env.local`      | 本地开发环境 (优先级最高) | ❌ 否      |
| `.env.production` | 生产环境配置              | ❌ 否      |
| `.env.test`       | 测试环境配置              | ❌ 否      |

### 加载顺序

Next.js 按以下顺序加载环境变量（后加载的会覆盖前面的）：

1. `.env` (所有环境)
2. `.env.local` (所有环境，不提交到 Git)
3. `.env.[environment]` (特定环境，如 `.env.production`)
4. `.env.[environment].local` (特定环境 + 本地，如 `.env.production.local`)

**优先级**：`.local` 文件 > 特定环境文件 > 默认 `.env` 文件

---

## 🔧 环境变量类型

### 公开变量 (NEXT*PUBLIC*)

前缀为 `NEXT_PUBLIC_` 的变量会在浏览器端暴露。

**使用场景**：

- 前端直接使用的配置
- API 端点
- 第三方服务的公开密钥
- 应用元信息

**示例**：

```typescript
// 在组件中使用
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

### 私有变量

不使用 `NEXT_PUBLIC_` 前缀的变量只在服务端可用。

**使用场景**：

- API 密钥和密钥
- 数据库连接字符串
- 第三方服务私钥
- 敏感配置信息

**示例**：

```typescript
// 在 API 路由中使用
export async function GET() {
  const apiKey = process.env.API_KEY
  // ...
}
```

---

## 💻 开发环境配置

### 完整配置 (.env.local)

```bash
# ========================================
# 应用基础配置
# ========================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=7zi AI Platform (Dev)

# ========================================
# 网站统计配置 (可选)
# ========================================

# Google Analytics 4
# 格式：G-XXXXXXXXXX
# 获取地址：https://analytics.google.com/
NEXT_PUBLIC_GA_ID=

# Umami Analytics
# 网站 ID (在 Umami 后台获取)
NEXT_PUBLIC_UMAMI_ID=
# Umami 服务器地址
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is

# Plausible Analytics
# 您的域名
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.studio

# 百度统计
# 百度统计 ID (在百度统计后台获取)
NEXT_PUBLIC_BAIDU_ID=

# ========================================
# GitHub API 配置
# ========================================

# GitHub Personal Access Token (服务端)
# ⚠️ 不要使用 NEXT_PUBLIC_ 前缀
# 获取地址：https://github.com/settings/tokens
# 需要权限：repo, user, read:org
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# GitHub 仓库信息 (公开，可使用 NEXT_PUBLIC_)
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi

# ========================================
# 邮件服务配置 (Resend)
# ========================================

# Resend API Key
# 获取地址：https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx

# 邮件接收地址 (接收联系表单的邮箱)
CONTACT_EMAIL=business@7zi.studio

# 发件人地址
# 开发环境：onboarding@resend.dev (免费)
# 生产环境：noreply@yourdomain.com (需要验证域名)
FROM_EMAIL=onboarding@resend.dev

# ========================================
# Sentry 错误监控 (可选)
# ========================================

# Sentry DSN (公开)
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx

# Sentry Auth Token (私有)
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Sentry 环境
SENTRY_ENVIRONMENT=development

# ========================================
# Next.js 配置
# ========================================

# 图片优化域名
NEXT_PUBLIC_IMAGE_DOMAINS=images.unsplash.com,images.unsplash.com

# ========================================
# 国际化配置 (i18n)
# ========================================

# 默认语言
NEXT_PUBLIC_DEFAULT_LOCALE=zh

# 支持的语言列表
NEXT_PUBLIC_LOCALES=zh,en,ja,ko

# ========================================
# WebSocket 配置 (开发环境)
# ========================================
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 最小配置

如果只是本地测试，可以使用最小配置：

```bash
# 必需配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=7zi Dev
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi
FROM_EMAIL=onboarding@resend.dev

# 可选配置 (如果不需要相关功能)
# GITHUB_TOKEN=
# RESEND_API_KEY=
# CONTACT_EMAIL=
# NEXT_PUBLIC_GA_ID=
```

---

## 🏗️ 生产环境配置

### 完整配置 (.env.production)

```bash
# ========================================
# 应用基础配置
# ========================================
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

NEXT_PUBLIC_APP_URL=https://7zi.com
NEXT_PUBLIC_APP_NAME=7zi AI Platform

# ========================================
# 网站统计 (生产环境)
# ========================================
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=your-production-umami-id
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.studio
NEXT_PUBLIC_BAIDU_ID=your-baidu-id

# ========================================
# GitHub API (生产环境)
# ========================================
GITHUB_TOKEN=ghp_production_token_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_OWNER=songzuo
NEXT_PUBLIC_GITHUB_REPO=7zi

# ========================================
# 邮件服务 (Resend - 生产环境)
# ========================================
RESEND_API_KEY=re_production_key_xxxxxxxxxxxxxxxxxxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio

# ========================================
# Sentry 错误监控 (生产环境)
# ========================================
NEXT_PUBLIC_SENTRY_DSN=https://production@sentry.io/xxxx
SENTRY_AUTH_TOKEN=production-auth-token
SENTRY_ENVIRONMENT=production

# ========================================
# 图片优化域名
# ========================================
NEXT_PUBLIC_IMAGE_DOMAINS=7zi.com,cdn.7zi.com,images.unsplash.com

# ========================================
# 国际化配置
# ========================================
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_LOCALES=zh,en,ja,ko

# ========================================
# WebSocket 配置 (生产环境)
# ========================================
NEXT_PUBLIC_WS_URL=wss://api.7zi.com

# ========================================
# 数据库配置 (如果使用)
# ========================================
DATABASE_URL=postgresql://user:password@host:5432/database

# ========================================
# Redis 配置 (如果使用)
# ========================================
REDIS_URL=redis://localhost:6379

# ========================================
# OpenAI 配置 (如果使用)
# ========================================
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ========================================
# 其他第三方服务
# ========================================
# Stripe (支付)
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxx

# Cloudflare (CDN/图片)
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 配置检查清单

部署生产环境前，确保以下配置正确：

- [ ] `NODE_ENV=production`
- [ ] `NEXT_PUBLIC_APP_URL` 设置为生产域名
- [ ] 所有 API 密钥使用生产环境的密钥
- [ ] `FROM_EMAIL` 使用已验证的域名
- [ ] Sentry 配置正确（如果使用）
- [ ] 图片域名已配置
- [ ] 数据库连接字符串正确（如果使用）
- [ ] WebSocket URL 使用 WSS 协议
- [ ] 所有必需的环境变量都已设置
- [ ] 没有使用默认的测试密钥

---

## 🔄 CI/CD 配置

### GitHub Secrets 配置

在 GitHub 仓库设置 (Settings → Secrets and variables → Actions) 中添加以下 Secrets：

#### 必需的 Secrets

| Secret        | 说明       | 示例                                   |
| ------------- | ---------- | -------------------------------------- |
| `DEPLOY_HOST` | 服务器地址 | 165.99.43.61                           |
| `DEPLOY_USER` | SSH 用户   | root                                   |
| `DEPLOY_KEY`  | SSH 私钥   | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `DEPLOY_PORT` | SSH 端口   | 22                                     |

#### 可选的 Secrets

| Secret              | 说明                      | 示例                          |
| ------------------- | ------------------------- | ----------------------------- |
| `GITHUB_TOKEN`      | GitHub Token (用于自动化) | `ghp_xxxxxx`                  |
| `SENTRY_AUTH_TOKEN` | Sentry 认证令牌           | `your-token`                  |
| `SLACK_WEBHOOK_URL` | Slack 通知 Webhook        | `https://hooks.slack.com/...` |

### 在工作流中使用环境变量

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # 部署脚本
```

---

## 🔒 安全最佳实践

### 1. 永远不要提交 .env 文件

确保 `.gitignore` 包含：

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 2. 使用不同的密钥

为不同环境使用不同的 API 密钥：

```bash
# 开发环境
GITHUB_TOKEN=ghp_dev_xxxxxxxxxxxx

# 生产环境
GITHUB_TOKEN=ghp_prod_xxxxxxxxxxxx
```

### 3. 限制密钥权限

只授予密钥所需的最小权限：

- **只读权限**：如果只需要读取数据
- **特定资源**：限制只能访问特定的仓库/数据库
- **时间限制**：为临时密钥设置过期时间

### 4. 定期轮换密钥

建议每 3-6 个月更换一次密钥：

- GitHub Personal Access Tokens
- API 密钥
- 数据库密码
- JWT 密钥

### 5. 使用密钥管理服务

对于生产环境，考虑使用：

- **AWS Secrets Manager**
- **Google Secret Manager**
- **Azure Key Vault**
- **HashiCorp Vault**

### 6. 审计环境变量

定期检查：

```bash
# 查看当前环境变量
printenv | grep NEXT_PUBLIC_
printenv | grep -E "(API_KEY|SECRET|TOKEN|PASSWORD)"

# 检查是否有敏感变量意外暴露为 NEXT_PUBLIC_
grep -r "NEXT_PUBLIC_.*\(KEY\|SECRET\|TOKEN\)" src/
```

### 7. 使用 .env.example 作为模板

`.env.example` 应该包含所有需要的环境变量，但不包含实际值：

```bash
# ✅ 正确的 .env.example
GITHUB_TOKEN=
RESEND_API_KEY=
DATABASE_URL=

# ❌ 不要包含实际值
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

---

## ❓ 常见问题

### Q1: 修改环境变量后需要重启吗？

**开发环境**：

- `NEXT_PUBLIC_*` 变量需要重启 `pnpm dev`
- 其他变量在下次请求时生效

**生产环境**：

- 所有变量都需要重新构建和重启

### Q2: 为什么有些变量在浏览器中是 undefined？

可能的原因：

1. 变量名拼写错误
2. 变量没有前缀 `NEXT_PUBLIC_`（如果是客户端需要）
3. `.env.local` 文件不存在或配置错误
4. 需要重启开发服务器

### Q3: 如何在 Docker 中使用环境变量？

使用 Docker Compose：

```yaml
version: '3.8'
services:
  app:
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://7zi.com
```

### Q4: 如何在 Vercel 中配置环境变量？

在 Vercel Dashboard：

1. 进入项目设置 (Settings)
2. 选择 "Environment Variables"
3. 添加每个环境变量
4. 选择环境 (Production/Preview/Development)

### Q5: 环境变量有长度限制吗？

- **系统限制**：通常 32KB 左右
- **Next.js 限制**：每个变量最大 32KB
- **建议**：如果需要存储大量数据，考虑使用数据库或文件

### Q6: 如何在测试中模拟环境变量？

使用 Vitest：

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('API', () => {
  it('should use environment variable', () => {
    const originalEnv = process.env.API_KEY
    process.env.API_KEY = 'test-key'

    // 测试代码...

    process.env.API_KEY = originalEnv // 恢复
  })
})
```

或使用 `.env.test` 文件。

---

## 📚 相关文档

- [部署指南](./DEPLOYMENT-GUIDE.md)
- [开发指南](./DEVELOPMENT.md)
- [API 文档](./API-REFERENCE.md)
- [安全文档](./SECURITY.md)

---

**Made with ❤️ by 7zi AI Team**

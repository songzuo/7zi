# 🔐 环境变量配置文档

> 7zi Platform 环境变量完整配置说明

**最后更新**: 2026-03-20

---

## 📋 目录

- [概述](#概述)
- [环境变量完整列表](#环境变量完整列表)
- [按类别分类](#按类别分类)
- [环境变量文件说明](#环境变量文件说明)
- [配置示例](#配置示例)
- [安全最佳实践](#安全最佳实践)
- [常见问题](#常见问题)

---

## 📖 概述

### 什么是环境变量？

环境变量是配置应用程序行为的键值对。在 Next.js 中，它们用于存储敏感信息、API 密钥、数据库连接字符串等配置数据。

### 环境变量类型

#### 1. 公开变量 (NEXT*PUBLIC*\*)

前缀为 `NEXT_PUBLIC_` 的变量会在浏览器端暴露，可以在客户端代码中访问。

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

#### 2. 私有变量

不使用 `NEXT_PUBLIC_` 前缀的变量只在服务端可用，不会暴露到浏览器。

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

## 📝 环境变量完整列表

### 应用基础配置

| 变量名                 | 类型 | 必填         | 默认值            | 说明                                 | 示例值                                     |
| ---------------------- | ---- | ------------ | ----------------- | ------------------------------------ | ------------------------------------------ |
| `NODE_ENV`             | 私有 | Optional     | `development`     | Node.js 运行环境                     | `production`, `development`, `test`        |
| `PORT`                 | 私有 | Optional     | `3000`            | 应用运行端口                         | `3000`, `8080`                             |
| `HOSTNAME`             | 私有 | Optional     | `0.0.0.0`         | 应用绑定主机名                       | `0.0.0.0`, `localhost`                     |
| `NEXT_PUBLIC_SITE_URL` | 公开 | **Required** | -                 | **网站完整 URL（生产环境必须配置）** | `https://7zi.com`, `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL`  | 公开 | **Required** | -                 | 应用基础 URL                         | `https://7zi.com`, `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | 公开 | Optional     | `7zi AI Platform` | 应用名称                             | `7zi AI Platform`                          |

### 网站统计配置

#### Google Analytics 4

| 变量名              | 类型 | 必填     | 默认值 | 说明                              | 示例值         |
| ------------------- | ---- | -------- | ------ | --------------------------------- | -------------- |
| `NEXT_PUBLIC_GA_ID` | 公开 | Optional | -      | Google Analytics 4 Measurement ID | `G-XXXXXXXXXX` |

**获取方式**: https://analytics.google.com/

#### Umami Analytics

| 变量名                  | 类型 | 必填     | 默认值                       | 说明             | 示例值                       |
| ----------------------- | ---- | -------- | ---------------------------- | ---------------- | ---------------------------- |
| `NEXT_PUBLIC_UMAMI_ID`  | 公开 | Optional | -                            | Umami 网站 ID    | `your-umami-website-id`      |
| `NEXT_PUBLIC_UMAMI_URL` | 公开 | Optional | `https://analytics.umami.is` | Umami 服务器地址 | `https://analytics.umami.is` |

**获取方式**: https://umami.is/

#### Plausible Analytics

| 变量名                     | 类型 | 必填     | 默认值 | 说明           | 示例值    |
| -------------------------- | ---- | -------- | ------ | -------------- | --------- |
| `NEXT_PUBLIC_PLAUSIBLE_ID` | 公开 | Optional | -      | Plausible 域名 | `7zi.com` |

**获取方式**: https://plausible.io/

#### 百度统计

| 变量名                 | 类型 | 必填     | 默认值 | 说明        | 示例值          |
| ---------------------- | ---- | -------- | ------ | ----------- | --------------- |
| `NEXT_PUBLIC_BAIDU_ID` | 公开 | Optional | -      | 百度统计 ID | `your-baidu-id` |

**获取方式**: https://tongji.baidu.com/

### GitHub API 配置

| 变量名                     | 类型 | 必填         | 默认值 | 说明                                   | 示例值                     |
| -------------------------- | ---- | ------------ | ------ | -------------------------------------- | -------------------------- |
| `GITHUB_TOKEN`             | 私有 | **Required** | -      | GitHub Personal Access Token（服务端） | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `NEXT_PUBLIC_GITHUB_OWNER` | 公开 | **Required** | -      | GitHub 仓库所有者                      | `songzhuo`                 |
| `NEXT_PUBLIC_GITHUB_REPO`  | 公开 | **Required** | -      | GitHub 仓库名称                        | `openclaw-workspace`       |

**GITHUB_TOKEN 获取方式**:

1. 访问 https://github.com/settings/tokens
2. 创建新的 Personal Access Token
3. 授予权限：`repo`, `user`, `read:org`

**重要**: `GITHUB_TOKEN` 不要使用 `NEXT_PUBLIC_` 前缀，否则会暴露到客户端！

### 邮件服务配置 (Resend)

| 变量名           | 类型 | 必填         | 默认值 | 说明                     | 示例值                                                      |
| ---------------- | ---- | ------------ | ------ | ------------------------ | ----------------------------------------------------------- |
| `RESEND_API_KEY` | 私有 | **Required** | -      | Resend API 密钥          | `re_xxxxxxxxxxxxxxxxxxxxxxxx`                               |
| `CONTACT_EMAIL`  | 私有 | **Required** | -      | 邮件接收地址（联系表单） | `business@7zi.studio`                                       |
| `FROM_EMAIL`     | 私有 | **Required** | -      | 发件人地址               | `onboarding@resend.dev` (开发), `noreply@7zi.studio` (生产) |

**RESEND_API_KEY 获取方式**:

1. 访问 https://resend.com/api-keys
2. 创建新的 API Key
3. 复制密钥到环境变量

**发件人地址说明**:

- **开发环境**: 使用 `onboarding@resend.dev`（免费）
- **生产环境**: 使用您验证过的域名，如 `noreply@7zi.studio`

### Sentry 错误监控配置

#### 必需配置

| 变量名                   | 类型 | 必填     | 默认值 | 说明                                  | 示例值                      |
| ------------------------ | ---- | -------- | ------ | ------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | 公开 | Optional | -      | Sentry Data Source Name               | `https://xxx@sentry.io/xxx` |
| `SENTRY_AUTH_TOKEN`      | 私有 | Optional | -      | Sentry 认证令牌（用于上传 SourceMap） | `your-sentry-auth-token`    |
| `SENTRY_ORG`             | 私有 | Optional | -      | Sentry 组织 slug                      | `7zi-studio`                |
| `SENTRY_PROJECT`         | 私有 | Optional | -      | Sentry 项目名称                       | `7zi-frontend`              |

#### 环境和版本配置

| 变量名                           | 类型 | 必填     | 默认值               | 说明        | 示例值                                 |
| -------------------------------- | ---- | -------- | -------------------- | ----------- | -------------------------------------- |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | 公开 | Optional | `production`         | Sentry 环境 | `development`, `staging`, `production` |
| `NEXT_PUBLIC_SENTRY_RELEASE`     | 公开 | Optional | `7zi-frontend@1.0.0` | 发布版本号  | `7zi-frontend@1.0.5`                   |

#### 采样率配置

| 变量名                                | 类型 | 必填     | 默认值 | 说明                           | 示例值                    |
| ------------------------------------- | ---- | -------- | ------ | ------------------------------ | ------------------------- |
| `SENTRY_TRACES_SAMPLE_RATE`           | 私有 | Optional | `0.1`  | 性能追踪采样率 (0.0-1.0)       | `0.1` (10%), `1.0` (100%) |
| `SENTRY_REPLAYS_SESSION_SAMPLE_RATE`  | 私有 | Optional | `0.1`  | 会话重放采样率 (0.0-1.0)       | `0.1` (10%), `1.0` (100%) |
| `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | 私有 | Optional | `1.0`  | 错误时会话重放采样率 (0.0-1.0) | `1.0` (100%)              |

#### 调试配置

| 变量名                     | 类型 | 必填     | 默认值  | 说明                      | 示例值          |
| -------------------------- | ---- | -------- | ------- | ------------------------- | --------------- |
| `NEXT_PUBLIC_SENTRY_DEBUG` | 公开 | Optional | `false` | 是否在开发环境启用 Sentry | `true`, `false` |

**Sentry 快速开始**:

1. 访问 https://sentry.io
2. 创建新项目 > Next.js
3. 在项目设置 > Client Keys 获取 DSN
4. 在 Settings > Account > Auth Tokens 创建认证令牌

### 国际化配置 (i18n)

| 变量名                       | 类型 | 必填     | 默认值        | 说明                       | 示例值                 |
| ---------------------------- | ---- | -------- | ------------- | -------------------------- | ---------------------- |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | 公开 | Optional | `zh`          | 默认语言                   | `zh`, `en`, `ja`, `ko` |
| `NEXT_PUBLIC_LOCALES`        | 公开 | Optional | `zh,en,ja,ko` | 支持的语言列表（逗号分隔） | `zh,en,ja,ko`          |

### 图片优化配置

| 变量名                      | 类型 | 必填     | 默认值 | 说明                           | 示例值                            |
| --------------------------- | ---- | -------- | ------ | ------------------------------ | --------------------------------- |
| `NEXT_PUBLIC_IMAGE_DOMAINS` | 公开 | Optional | -      | 允许优化的图片域名（逗号分隔） | `images.unsplash.com,cdn.7zi.com` |

### WebSocket 配置

| 变量名               | 类型 | 必填     | 默认值 | 说明                 | 示例值                                     |
| -------------------- | ---- | -------- | ------ | -------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_WS_URL` | 公开 | Optional | -      | WebSocket 服务器地址 | `ws://localhost:3001`, `wss://api.7zi.com` |

### 数据库配置 (可选)

| 变量名         | 类型 | 必填     | 默认值 | 说明                  | 示例值                                          |
| -------------- | ---- | -------- | ------ | --------------------- | ----------------------------------------------- |
| `DATABASE_URL` | 私有 | Optional | -      | PostgreSQL 连接字符串 | `postgresql://user:password@host:5432/database` |

### Redis 配置 (可选)

| 变量名      | 类型 | 必填     | 默认值 | 说明             | 示例值                   |
| ----------- | ---- | -------- | ------ | ---------------- | ------------------------ |
| `REDIS_URL` | 私有 | Optional | -      | Redis 连接字符串 | `redis://localhost:6379` |

### OpenAI 配置 (可选)

| 变量名           | 类型 | 必填     | 默认值 | 说明            | 示例值                                        |
| ---------------- | ---- | -------- | ------ | --------------- | --------------------------------------------- |
| `OPENAI_API_KEY` | 私有 | Optional | -      | OpenAI API 密钥 | `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

### Stripe 支付配置 (可选)

| 变量名                  | 类型 | 必填     | 默认值 | 说明                | 示例值                   |
| ----------------------- | ---- | -------- | ------ | ------------------- | ------------------------ |
| `STRIPE_SECRET_KEY`     | 私有 | Optional | -      | Stripe 密钥         | `sk_live_xxxxxxxxxxxxxx` |
| `STRIPE_WEBHOOK_SECRET` | 私有 | Optional | -      | Stripe Webhook 密钥 | `whsec_xxxxxxxxxxxxxx`   |

### Cloudflare 配置 (可选)

| 变量名                  | 类型 | 必填     | 默认值 | 说明                | 示例值                             |
| ----------------------- | ---- | -------- | ------ | ------------------- | ---------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | 私有 | Optional | -      | Cloudflare 账户 ID  | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `CLOUDFLARE_API_TOKEN`  | 私有 | Optional | -      | Cloudflare API 令牌 | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |

---

## 📂 环境变量文件说明

### 文件列表

| 文件                      | 用途                       | 提交到 Git | 优先级 |
| ------------------------- | -------------------------- | ---------- | ------ |
| `.env.example`            | 环境变量示例模板           | ✅ 是      | 1      |
| `.env`                    | 所有环境通用配置           | ❌ 否      | 2      |
| `.env.local`              | 本地开发环境（优先级最高） | ❌ 否      | 3      |
| `.env.production`         | 生产环境配置               | ❌ 否      | 2      |
| `.env.production.example` | 生产环境示例模板           | ✅ 是      | 1      |
| `.env.test`               | 测试环境配置               | ❌ 否      | 2      |
| `.env.sentry.example`     | Sentry 配置示例模板        | ✅ 是      | 1      |

### 加载顺序

Next.js 按以下顺序加载环境变量（后加载的会覆盖前面的）：

1. `.env` (所有环境)
2. `.env.local` (所有环境，不提交到 Git)
3. `.env.[environment]` (特定环境，如 `.env.production`)
4. `.env.[environment].local` (特定环境 + 本地，如 `.env.production.local`)

**优先级**：`.local` 文件 > 特定环境文件 > 默认 `.env` 文件

---

## 💡 配置示例

### 开发环境 (.env.local)

```bash
# ========================================
# 应用基础配置
# ========================================
NODE_ENV=development
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=7zi AI Platform (Dev)

# ========================================
# 网站统计配置 (可选)
# ========================================
# NEXT_PUBLIC_GA_ID=
# NEXT_PUBLIC_UMAMI_ID=
# NEXT_PUBLIC_PLAUSIBLE_ID=7zi.studio
# NEXT_PUBLIC_BAIDU_ID=

# ========================================
# GitHub API 配置
# ========================================
GITHUB_TOKEN=ghp_dev_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_OWNER=songzhuo
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace

# ========================================
# 邮件服务配置 (Resend)
# ========================================
RESEND_API_KEY=re_dev_xxxxxxxxxxxxxxxxxxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=onboarding@resend.dev

# ========================================
# Sentry 配置 (开发环境)
# ========================================
NEXT_PUBLIC_SENTRY_DSN=https://dev@sentry.io/xxx
SENTRY_AUTH_TOKEN=dev-auth-token
SENTRY_ORG=7zi-studio
SENTRY_PROJECT=7zi-frontend
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_DEBUG=true
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=1.0
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0

# ========================================
# 国际化配置
# ========================================
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_LOCALES=zh,en,ja,ko

# ========================================
# WebSocket 配置
# ========================================
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# ========================================
# 图片优化域名
# ========================================
NEXT_PUBLIC_IMAGE_DOMAINS=images.unsplash.com
```

### 生产环境 (.env.production)

```bash
# ========================================
# 应用基础配置
# ========================================
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_SITE_URL=https://7zi.com
NEXT_PUBLIC_APP_URL=https://7zi.com
NEXT_PUBLIC_APP_NAME=7zi AI Platform

# ========================================
# 网站统计配置 (生产环境)
# ========================================
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_UMAMI_ID=your-production-umami-id
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com
NEXT_PUBLIC_BAIDU_ID=your-baidu-id

# ========================================
# GitHub API 配置
# ========================================
GITHUB_TOKEN=ghp_prod_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_GITHUB_OWNER=songzhuo
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace

# ========================================
# 邮件服务配置 (Resend - 生产环境)
# ========================================
RESEND_API_KEY=re_prod_xxxxxxxxxxxxxxxxxxxxxxxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio

# ========================================
# Sentry 配置 (生产环境)
# ========================================
NEXT_PUBLIC_SENTRY_DSN=https://production@sentry.io/xxx
SENTRY_AUTH_TOKEN=production-auth-token
SENTRY_ORG=7zi-studio
SENTRY_PROJECT=7zi-frontend
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_RELEASE=7zi-frontend@1.0.5
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.1
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0

# ========================================
# 国际化配置
# ========================================
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_LOCALES=zh,en,ja,ko

# ========================================
# WebSocket 配置
# ========================================
NEXT_PUBLIC_WS_URL=wss://api.7zi.com

# ========================================
# 图片优化域名
# ========================================
NEXT_PUBLIC_IMAGE_DOMAINS=7zi.com,cdn.7zi.com,images.unsplash.com
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

定期检查是否有敏感变量意外暴露：

```bash
# 检查是否有敏感变量意外暴露为 NEXT_PUBLIC_
grep -r "NEXT_PUBLIC_.*\(KEY\|SECRET\|TOKEN\|PASSWORD\)" src/
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
      - NEXT_PUBLIC_SITE_URL=https://7zi.com
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

### Q7: NEXT_PUBLIC_SITE_URL 和 NEXT_PUBLIC_APP_URL 有什么区别？

- `NEXT_PUBLIC_SITE_URL`: 完整的网站 URL，用于 SEO、社交媒体分享等
- `NEXT_PUBLIC_APP_URL`: 应用基础 URL，用于 API 调用、路由等

**推荐配置**：

```bash
NEXT_PUBLIC_SITE_URL=https://7zi.com
NEXT_PUBLIC_APP_URL=https://7zi.com
```

### Q8: 如何验证环境变量是否正确加载？

在开发环境中，可以在页面中打印：

```typescript
export default function Page() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Environment variables:', {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_GITHUB_OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER,
      // 不要打印敏感变量！
    });
  }
  return <div>Check console</div>;
}
```

---

## 📚 相关文档

- [部署指南](./DEPLOYMENT-GUIDE.md)
- [开发指南](./DEVELOPMENT.md)
- [API 文档](./API-REFERENCE.md)
- [安全文档](./SECURITY-AUDIT-REPORT.md)

---

## 📝 更新日志

| 日期       | 变更内容                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-20 | ✅ 添加 `NEXT_PUBLIC_SITE_URL` 变量说明（审计发现缺失）<br>✅ 完善所有环境变量的完整列表<br>✅ 添加必填/可选标识<br>✅ 添加 Sentry 采样率配置说明<br>✅ 整合所有 .env.example 文件内容 |

---

**Made with ❤️ by 7zi AI Team**

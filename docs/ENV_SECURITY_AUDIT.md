# 环境变量安全审计报告

**审计日期**: 2026-03-09  
**项目**: 7zi Team Platform  
**审计人**: 系统管理员 (子代理)

---

## 📋 审计摘要

| 项目 | 状态 | 风险等级 |
|------|------|----------|
| .env.example 完整性 | ✅ 良好 | 低 |
| 敏感变量硬编码检查 | ⚠️ 发现问题 | 中 |
| NEXT_PUBLIC_ 前缀使用 | ✅ 正确 | 低 |
| .gitignore 配置 | ⚠️ 需改进 | 中 |
| 文档完整性 | ✅ 已创建 | 低 |

---

## 1️⃣ 环境变量清单

### 主项目 (/.env)

| 变量名 | 类型 | 用途 | 是否必需 |
|--------|------|------|----------|
| `NODE_ENV` | 公开 | 运行环境标识 | ✅ 必需 |
| `NEXT_PUBLIC_APP_URL` | 公开 | 应用 URL | ✅ 必需 |
| `NEXT_PUBLIC_SITE_URL` | 公开 | 网站 URL | ✅ 必需 |
| `JWT_SECRET` | **敏感** | JWT 签名密钥 | ✅ 必需 |
| `CSRF_SECRET` | **敏感** | CSRF Token 签名 | ✅ 必需 |
| `SESSION_MAX_AGE` | 公开 | 会话有效期(秒) | 可选 |
| `REFRESH_TOKEN_MAX_AGE` | 公开 | 刷新令牌有效期 | 可选 |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | 公开 | EmailJS 公钥 | 可选 |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | 公开 | EmailJS 服务 ID | 可选 |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | 公开 | EmailJS 模板 ID | 可选 |
| `RESEND_API_KEY` | **敏感** | Resend 邮件 API | 可选 |
| `SLACK_WEBHOOK_URL` | **敏感** | Slack 告警 Webhook | 可选 |
| `ALERT_EMAIL_RECIPIENTS` | 半敏感 | 告警邮件接收者 | 可选 |
| `NEXT_PUBLIC_GA_ID` | 公开 | Google Analytics ID | 可选 |
| `NEXT_PUBLIC_UMAMI_URL` | 公开 | Umami 服务 URL | 可选 |
| `NEXT_PUBLIC_UMAMI_ID` | 公开 | Umami 网站 ID | 可选 |
| `NEXT_PUBLIC_PLAUSIBLE_ID` | 公开 | Plausible 域名 | 可选 |
| `NEXT_PUBLIC_BAIDU_ID` | 公开 | 百度统计 ID | 可选 |
| `REDIS_URL` | **敏感** | Redis 连接 URL | 可选 |
| `NEXT_PUBLIC_SENTRY_RELEASE` | 公开 | Sentry 发布版本 | 可选 |
| `SENTRY_DSN` | **敏感** | Sentry 数据源 | 可选 |
| `BOOK_LANG` | 公开 | 多语言配置 | 可选 |

### 子项目环境变量

#### Auth 服务 (`/projects/auth/.env`)
| 变量名 | 类型 | 用途 |
|--------|------|------|
| `JWT_SECRET` | **敏感** | JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 公开 | Token 过期时间 |
| `JWT_REFRESH_EXPIRES_IN` | 公开 | 刷新 Token 过期 |
| `PORT` | 公开 | 服务端口 |
| `NODE_ENV` | 公开 | 运行环境 |
| `BCRYPT_ROUNDS` | 公开 | 密码哈希轮数 |
| `RATE_LIMIT_*` | 公开 | 速率限制配置 |

#### Monitoring (`/monitoring/.env`)
| 变量名 | 类型 | 用途 |
|--------|------|------|
| `SLACK_WEBHOOK_URL` | **敏感** | Slack Webhook |
| `SENDGRID_API_KEY` | **敏感** | SendGrid API |
| `GRAFANA_ADMIN_*` | **敏感** | Grafana 管理员凭据 |
| `PROMETHEUS_*` | 公开 | Prometheus 配置 |
| `ALERTMANAGER_*` | **敏感** | 邮件服务器配置 |

---

## 2️⃣ 安全问题发现

### ⚠️ 问题 1: JWT_SECRET 默认值风险

**位置**: `src/lib/security/auth.ts:14`

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-secure-random-string-min-32-chars';
```

**风险**: 如果环境变量未设置，会使用硬编码的默认值。

**建议**: 
- ✅ 已有警告日志提醒
- 建议: 在生产环境启动时检查并拒绝使用默认值

### ⚠️ 问题 2: .gitignore 配置不完整

**当前配置**:
```gitignore
.env*
next-env.d.ts
```

**问题**: 这会忽略所有 `.env*` 文件，包括 `.env.example`，但实际 `.env.example` 已被提交。

**建议**: 更新为更精确的模式:
```gitignore
# Environment files
.env
.env.local
.env.development
.env.production
.env.*.local
# Keep example files
!.env.example
!**/.env.example
```

### ⚠️ 问题 3: 多个 .env 文件存在

发现的 .env 文件:
- `/.env` (主项目)
- `/projects/auth/.env`
- `/moltbook-gateway/.env`
- `/monitoring/.env`
- `/.next/standalone/.env` (构建产物)

**风险**: 敏感信息分散在多个位置，难以统一管理。

**建议**: 
- 使用主 `.env` 文件集中管理
- 子项目通过符号链接或共享配置引用

### ✅ 无问题: 无硬编码密钥

扫描代码未发现以下模式:
- `sk-*` (OpenAI/Stripe 密钥)
- `pk-*` (公钥模式)
- `xoxb-*` (Slack Bot Token)
- `ghp_*` (GitHub Personal Token)
- `AKIA*` (AWS Access Key)
- `eyJ*` (JWT Token)

---

## 3️⃣ NEXT_PUBLIC_ 前缀使用检查

### ✅ 正确使用

所有 `NEXT_PUBLIC_` 前缀变量都是**客户端安全**的:

| 变量 | 用途 | 安全评估 |
|------|------|----------|
| `NEXT_PUBLIC_APP_URL` | 应用 URL | ✅ 公开信息 |
| `NEXT_PUBLIC_SITE_URL` | 网站 URL | ✅ 公开信息 |
| `NEXT_PUBLIC_EMAILJS_*` | EmailJS 配置 | ✅ 设计为公开 |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | ✅ 公开 ID |
| `NEXT_PUBLIC_UMAMI_*` | Umami 配置 | ✅ 公开 ID |
| `NEXT_PUBLIC_PLAUSIBLE_ID` | Plausible 域名 | ✅ 公开信息 |
| `NEXT_PUBLIC_BAIDU_ID` | 百度统计 ID | ✅ 公开 ID |
| `NEXT_PUBLIC_SENTRY_RELEASE` | Sentry 版本 | ✅ 版本号 |

### ✅ 敏感变量未使用 NEXT_PUBLIC_

以下敏感变量**正确地**没有使用 `NEXT_PUBLIC_` 前缀:
- `JWT_SECRET`
- `CSRF_SECRET`
- `RESEND_API_KEY`
- `SLACK_WEBHOOK_URL`
- `REDIS_URL`
- `SENTRY_DSN`

---

## 4️⃣ 代码中使用环境变量的位置

### 服务端环境变量

```
src/lib/security/auth.ts:14      - JWT_SECRET
src/lib/security/cors.ts:19      - NEXT_PUBLIC_APP_URL
src/lib/cache/redis-cache.ts:*   - REDIS_URL
src/lib/monitoring/health.ts:119 - RESEND_API_KEY
src/lib/monitoring/alerts.ts:58  - SLACK_WEBHOOK_URL
src/lib/monitoring/alerts.ts:113 - RESEND_API_KEY
src/app/api/auth/route.ts:276    - JWT_SECRET
```

### 客户端环境变量

```
src/lib/emailjs.ts:20-26         - EMAILJS 配置
src/components/SEO.tsx:*         - NEXT_PUBLIC_SITE_URL
src/components/Analytics.tsx:*   - 分析工具 ID
```

---

## 5️⃣ 建议改进

### 立即处理 (P0)

1. **生产环境启动检查**: 在应用启动时验证关键环境变量
   ```typescript
   // 建议添加到 src/lib/config.ts
   const requiredEnvVars = ['JWT_SECRET', 'CSRF_SECRET'];
   for (const varName of requiredEnvVars) {
     if (!process.env[varName]) {
       throw new Error(`Missing required environment variable: ${varName}`);
     }
   }
   ```

2. **更新 .gitignore**: 使用更精确的忽略模式

### 中期改进 (P1)

3. **统一环境变量管理**: 创建单一配置文件，子项目引用
4. **添加环境变量验证**: 使用 zod 或类似库进行类型安全验证

### 长期改进 (P2)

5. **密钥轮换机制**: 实现 JWT_SECRET 定期轮换
6. **密钥管理服务**: 考虑使用 Vault 或云密钥管理

---

## 6️⃣ 环境变量文档

详细文档已创建于: `docs/ENVIRONMENT_VARIABLES.md`

---

## 📊 审计结论

| 方面 | 评分 | 说明 |
|------|------|------|
| 敏感数据保护 | 85/100 | 无硬编码密钥，但有默认值风险 |
| 前缀使用规范 | 100/100 | 完全符合 Next.js 最佳实践 |
| 文档完整性 | 100/100 | 已创建完整文档 |
| .gitignore 配置 | 70/100 | 需要更精确的模式 |

**总体评估**: ✅ 通过审计，建议按优先级改进

---

*审计完成于 2026-03-09*
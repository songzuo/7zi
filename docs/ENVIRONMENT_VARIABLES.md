# 环境变量配置文档

本文档记录 7zi Team Platform 所有环境变量的用途、配置方法和安全要求。

---

## 📖 快速开始

1. 复制示例文件:
   ```bash
   cp .env.example .env
   ```

2. 修改必要的环境变量 (至少设置 `JWT_SECRET` 和 `CSRF_SECRET`)

3. 生成安全的密钥:
   ```bash
   # 方法 1: 使用 openssl
   openssl rand -hex 32
   
   # 方法 2: 使用 Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

---

## 🔐 必需的环境变量

### 安全配置

| 变量名 | 说明 | 生成方法 |
|--------|------|----------|
| `JWT_SECRET` | JWT Token 签名密钥，至少 32 字符 | `openssl rand -hex 32` |
| `CSRF_SECRET` | CSRF Token 签名密钥，至少 32 字符 | `openssl rand -hex 32` |

**⚠️ 警告**: 
- 生产环境**必须**使用强随机密钥
- 不要使用示例值或简单密码
- 建议每 90 天轮换一次

### 基础配置

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` / `production` |
| `NEXT_PUBLIC_APP_URL` | 应用完整 URL | `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | 网站公开 URL | `https://7zi.studio` |

---

## 📧 邮件服务配置

### EmailJS (联系表单)

用于网站联系表单的邮件发送服务。

| 变量名 | 说明 | 获取位置 |
|--------|------|----------|
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | EmailJS 公钥 | [EmailJS Dashboard](https://www.emailjs.com/) |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | 邮件服务 ID | EmailJS Dashboard |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | 邮件模板 ID | EmailJS Dashboard |

**注意**: EmailJS 的公钥设计为客户端可见，这是安全的。

### Resend API (系统邮件)

用于系统通知和告警邮件。

| 变量名 | 说明 | 获取位置 |
|--------|------|----------|
| `RESEND_API_KEY` | Resend API 密钥 | [Resend Dashboard](https://resend.com/) |

**格式**: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 📊 分析工具配置

### Google Analytics

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 ID | `G-XXXXXXXXXX` |

### Umami Analytics

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `NEXT_PUBLIC_UMAMI_URL` | Umami 服务器地址 | `https://umami.7zi.studio` |
| `NEXT_PUBLIC_UMAMI_ID` | 网站 ID | UUID 格式 |

### Plausible Analytics

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `NEXT_PUBLIC_PLAUSIBLE_ID` | 网站域名 | `7zi.studio` |

### 百度统计

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `NEXT_PUBLIC_BAIDU_ID` | 百度统计 ID | 16 位字符 |

---

## 🚨 告警通知配置

### Slack Webhook

| 变量名 | 说明 | 获取位置 |
|--------|------|----------|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | [Slack Apps](https://api.slack.com/apps) |

**格式**: `https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXX`

### 邮件告警

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `ALERT_EMAIL_RECIPIENTS` | 告警邮件接收者 | 逗号分隔的邮箱 |

---

## 🗄️ 数据库与缓存

### Redis (可选)

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379` |

**注意**: 如果 Redis 启用了密码，格式为:
```
redis://:password@host:port/db
```

### PostgreSQL (可选)

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |

---

## 📈 监控配置

### Sentry (错误追踪)

| 变量名 | 说明 | 获取位置 |
|--------|------|----------|
| `SENTRY_DSN` | Sentry 数据源 URL | [Sentry Dashboard](https://sentry.io/) |
| `NEXT_PUBLIC_SENTRY_RELEASE` | 发布版本标识 | 任意字符串 |

---

## 🌐 安全配置

### CORS 设置

| 变量名 | 说明 | 格式 |
|--------|------|------|
| `CORS_ALLOWED_ORIGINS` | 允许的跨域源 | 逗号分隔的 URL |

### 速率限制

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `RATE_LIMIT_WINDOW_MS` | 时间窗口(毫秒) | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | 最大请求数 | `100` |

### 会话配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SESSION_MAX_AGE` | 会话有效期(秒) | `86400` (1天) |
| `REFRESH_TOKEN_MAX_AGE` | 刷新令牌有效期(秒) | `604800` (7天) |

---

## 📝 日志配置

| 变量名 | 说明 | 可选值 |
|--------|------|--------|
| `LOG_LEVEL` | 日志级别 | `debug`, `info`, `warn`, `error` |
| `LOG_DATABASE_ENABLED` | 是否记录到数据库 | `true`, `false` |
| `LOG_RETENTION_DAYS` | 日志保留天数 | 数字 |

---

## 🌍 多语言配置

| 变量名 | 说明 | 可选值 |
|--------|------|--------|
| `BOOK_LANG` | 默认书籍语言 | `zh`, `en` 等 |

---

## 🔧 开发环境示例

```env
# 开发环境最小配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 安全配置 (开发环境可用简单值)
JWT_SECRET=dev-jwt-secret-for-testing-only-min-32-chars
CSRF_SECRET=dev-csrf-secret-for-testing-only-min-32-chars
```

---

## 🚀 生产环境检查清单

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` 使用强随机密钥 (64 字符 hex)
- [ ] `CSRF_SECRET` 使用强随机密钥 (64 字符 hex)
- [ ] `NEXT_PUBLIC_APP_URL` 和 `NEXT_PUBLIC_SITE_URL` 使用 HTTPS
- [ ] `RESEND_API_KEY` 已配置 (如需邮件功能)
- [ ] `REDIS_URL` 已配置 (如需缓存功能)
- [ ] `.env` 文件权限设置为 `600`
- [ ] `.env` 文件已添加到 `.gitignore`

---

## 📁 子项目环境变量

以下子项目有独立的环境配置文件:

| 项目 | 配置文件 | 说明 |
|------|----------|------|
| Auth 服务 | `projects/auth/.env` | 认证服务配置 |
| Moltbook Gateway | `moltbook-gateway/.env` | 网关服务配置 |
| Monitoring | `monitoring/.env` | 监控栈配置 |

---

## ⚠️ 安全最佳实践

1. **永不提交 `.env` 文件到版本控制**
2. **生产环境使用不同的密钥**
3. **定期轮换敏感密钥** (建议每 90 天)
4. **限制 `.env` 文件权限**: `chmod 600 .env`
5. **使用 HTTPS** 防止中间人攻击
6. **备份密钥** 到安全的密码管理器

---

*文档版本: 1.0.0*  
*最后更新: 2026-03-09*
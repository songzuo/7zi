# 环境配置安全检查报告

**检查时间**: 2026-05-12  
**检查范围**: `/root/.openclaw/workspace` 目录下的所有 `.env` 相关文件

---

## 📋 环境变量清单

### 1. `.env.production` (根目录)

| 环境变量 | 敏感 | 默认值 | 说明 |
|---------|------|--------|------|
| `NODE_ENV` | ❌ | production | 运行环境 |
| `PORT` | ❌ | 3000 | 服务端口 |
| `HOSTNAME` | ❌ | 0.0.0.0 | 监听地址 |
| `NEXT_PUBLIC_GA_ID` | ❌ | - | Google Analytics (已注释) |
| `NEXT_PUBLIC_UMAMI_ID` | ❌ | - | Umami Analytics ID (已注释) |
| `NEXT_PUBLIC_UMAMI_URL` | ❌ | - | Umami 服务地址 (已注释) |
| `NEXT_PUBLIC_PLAUSIBLE_ID` | ❌ | 7zi.com | Plausible 分析 |
| `NEXT_PUBLIC_BAIDU_ID` | ❌ | - | 百度统计 (已注释) |
| `RESEND_API_KEY` | ✅ | - | Resend 邮件 API Key (已注释) |
| `CONTACT_EMAIL` | ❌ | - | 联系邮箱 (已注释) |
| `FROM_EMAIL` | ❌ | - | 发件邮箱 (已注释) |
| `GITHUB_TOKEN` | ✅ | - | GitHub PAT (已注释) |
| `NEXT_PUBLIC_GITHUB_OWNER` | ❌ | songzhuo | GitHub 仓库所有者 |
| `NEXT_PUBLIC_GITHUB_REPO` | ❌ | openclaw-workspace | GitHub 仓库名 |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ | - | Sentry DSN (已注释) |
| `SENTRY_AUTH_TOKEN` | ✅ | - | Sentry 认证 Token (已注释) |
| `SENTRY_ORG` | ❌ | - | Sentry 组织名 (已注释) |
| `SENTRY_PROJECT` | ❌ | - | Sentry 项目名 (已注释) |

**状态**: ⚠️ 部分值已注释，但整体结构清晰

---

### 2. `7zi-frontend/.env.production`

| 环境变量 | 敏感 | 默认值 | 说明 |
|---------|------|--------|------|
| `NODE_ENV` | ❌ | production | 运行环境 |
| `NEXT_PUBLIC_APP_URL` | ❌ | https://7zi.com | 应用 URL |
| `JWT_SECRET` | ✅ | **实际值** | JWT 签名密钥 (128字符十六进制) ⚠️ |
| `JWT_EXPIRES_IN` | ❌ | 24h | JWT 过期时间 |
| `JWT_REFRESH_EXPIRES_IN` | ❌ | 7d | 刷新令牌过期时间 |
| `SESSION_SECRET` | ✅ | your-session-secret... | 会话密钥 (弱密钥) ⚠️ |
| `DATABASE_URL` | ✅ | mongodb://localhost:27017/7zi | 数据库连接 URL |
| `DB_POOL_MAX` | ❌ | 10 | 数据库连接池大小 |
| `REDIS_URL` | ❌ | redis://localhost:6379 | Redis 连接 URL |
| `ALLOWED_ORIGINS` | ❌ | https://7zi.com,https://www.7zi.com | CORS 白名单 |
| `ALLOWED_METHODS` | ❌ | GET,POST,PUT,DELETE,PATCH | 允许的 HTTP 方法 |
| `ALLOWED_HEADERS` | ❌ | Content-Type,Authorization,X-Requested-With | 允许的请求头 |
| `RATE_LIMIT_GLOBAL` | ❌ | 100 | 全局速率限制 |
| `RATE_LIMIT_API` | ❌ | 60 | API 速率限制 |
| `RATE_LIMIT_LOGIN` | ❌ | 5 | 登录速率限制 |
| `RATE_LIMIT_REGISTER` | ❌ | 10 | 注册速率限制 |
| `RATE_LIMIT_SEARCH` | ❌ | 30 | 搜索速率限制 |
| `SMTP_HOST` | ❌ | smtp.example.com | SMTP 服务器 |
| `SMTP_PORT` | ❌ | 587 | SMTP 端口 |
| `SMTP_USER` | ❌ | noreply@example.com | SMTP 用户名 |
| `SMTP_PASSWORD` | ✅ | your-smtp-password | SMTP 密码 ⚠️ |
| `MAIL_FROM` | ❌ | noreply@7zi.com | 发件人地址 |
| `MAIL_FROM_NAME` | ❌ | 7zi Team | 发件人名称 |
| `SENTRY_DSN` | ❌ | placeholder@o000000... | Sentry DSN (占位符) |
| `SENTRY_ENVIRONMENT` | ❌ | production | Sentry 环境 |
| `LOG_LEVEL` | ❌ | warn | 日志级别 |
| `AUDIT_LOG_ENABLED` | ❌ | true | 审计日志开关 |
| `NEXT_PUBLIC_GA_ID` | ❌ | (空) | Google Analytics |
| `NEXT_PUBLIC_GTM_ID` | ❌ | (空) | Google Tag Manager |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | ❌ | (空) | Recaptcha Site Key |
| `RECAPTCHA_SECRET_KEY` | ✅ | (空) | Recaptcha Secret Key |
| `MAX_FILE_SIZE` | ❌ | 10485760 | 最大文件大小 |
| `ALLOWED_FILE_TYPES` | ❌ | image/jpeg,image/png... | 允许的文件类型 |
| `UPLOAD_DIR` | ❌ | ./uploads | 上传目录 |
| `SECURITY_MODE` | ❌ | true | 安全模式开关 |
| `CSRF_PROTECTION` | ❌ | true | CSRF 保护开关 |
| `HSTS_ENABLED` | ❌ | true | HSTS 开关 |
| `NEXT_PUBLIC_SITE_URL` | ❌ | https://7zi.com | 站点 URL |
| `NEXT_PUBLIC_IMAGE_DOMAINS` | ❌ | (空) | 图片域名白名单 |
| `TEST_DATABASE_URL` | ✅ | mongodb://localhost:27017/7zi-test | 测试数据库 URL |
| `TESTING` | ❌ | false | 测试模式 |
| `DEBUG` | ❌ | false | 调试模式 |
| `SHOW_STACK_TRACE` | ❌ | false | 显示堆栈跟踪 |

**状态**: ⚠️ **存在真实 JWT_SECRET 硬编码！**

---

### 3. `botmem/.env`

| 环境变量 | 敏感 | 默认值 | 说明 |
|---------|------|--------|------|
| `NODE_ENV` | ❌ | development | 运行环境 |
| `NEXT_PUBLIC_APP_URL` | ❌ | http://localhost:3000 | 应用 URL |
| `NEXT_PUBLIC_SITE_URL` | ❌ | http://localhost:3000 | 站点 URL |
| `JWT_SECRET` | ✅ | **实际值** | JWT 签名密钥 (64字符) ⚠️ |
| `CSRF_SECRET` | ✅ | **实际值** | CSRF 密钥 (64字符) ⚠️ |
| `SESSION_MAX_AGE` | ❌ | 86400 | 会话最大存活时间 |
| `REFRESH_TOKEN_MAX_AGE` | ❌ | 604800 | 刷新令牌最大存活时间 |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | ❌ | your_emailjs_public_key | EmailJS 公钥 |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | ❌ | your_emailjs_service_id | EmailJS 服务 ID |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | ❌ | your_emailjs_template_id | EmailJS 模板 ID |
| `RESEND_API_KEY` | ✅ | re_xxxxxxxx... | Resend API Key ⚠️ |
| `SLACK_WEBHOOK_URL` | ✅ | https://hooks.slack.com/... | Slack Webhook URL |
| `ALERT_EMAIL_RECIPIENTS` | ❌ | admin@example.com | 告警邮箱列表 |
| `NEXT_PUBLIC_GA_ID` | ❌ | G-XXXXXXXXXX | Google Analytics ID |
| `NEXT_PUBLIC_UMAMI_URL` | ❌ | https://umami.7zi.studio | Umami 服务地址 |
| `NEXT_PUBLIC_UMAMI_ID` | ❌ | xxxxxxxx-xxxx-... | Umami Website ID |
| `NEXT_PUBLIC_PLAUSIBLE_ID` | ❌ | 7zi.studio | Plausible ID |
| `NEXT_PUBLIC_BAIDU_ID` | ❌ | xxxxxxxxxx... | 百度统计 ID |
| `REDIS_URL` | ❌ | redis://localhost:6379 | Redis 连接 URL |
| `NEXT_PUBLIC_SENTRY_RELEASE` | ❌ | main | Sentry Release |
| `BOOK_LANG` | ❌ | zh | 书籍语言 |
| `ADMIN_EMAIL` | ❌ | admin@7zi.studio | 管理员邮箱 |
| `ADMIN_PASSWORD` | ✅ | **change_this_password** | ⚠️ **弱密码警告!** |

**状态**: 🔴 **存在多个高风险敏感信息！**

---

### 4. `botmem/moltbook-gateway/.env`

| 环境变量 | 敏感 | 默认值 | 说明 |
|---------|------|--------|------|
| `MOLTBOOK_API_KEY` | ✅ | **实际值** | Moltbook API Key ⚠️ |
| `MOLTBOOK_AGENT_NAME` | ❌ | ClawdAssistant_1769859260 | Agent 名称 |
| `MOLTBOOK_GATEWAY_PORT` | ❌ | 3001 | 网关端口 |

**状态**: 🔴 **存在真实 MOLTBOOK_API_KEY！**

---

### 5. `botmem/monitoring/.env`

| 环境变量 | 敏感 | 默认值 | 说明 |
|---------|------|--------|------|
| `SLACK_WEBHOOK_URL` | ✅ | https://hooks.slack.com/... | Slack Webhook URL |
| `SENDGRID_API_KEY` | ✅ | SG.xxxxxxxxx... | SendGrid API Key ⚠️ |
| `GRAFANA_ADMIN_USER` | ❌ | admin | Grafana 用户名 |
| `GRAFANA_ADMIN_PASSWORD` | ✅ | **ChangeMeInProduction123!** | ⚠️ 弱密码! |
| `PROMETHEUS_RETENTION_DAYS` | ❌ | 15 | 数据保留天数 |
| `PROMETHEUS_RETENTION_SIZE` | ❌ | 5GB | 数据保留大小 |
| `ALERTMANAGER_SMTP_HOST` | ❌ | smtp.sendgrid.net | Alertmanager SMTP 主机 |
| `ALERTMANAGER_SMTP_PORT` | ❌ | 587 | Alertmanager SMTP 端口 |
| `ALERTMANAGER_FROM_EMAIL` | ❌ | alerts@7zi.studio | 告警发件邮箱 |
| `ALERT_EMAIL_CRITICAL` | ❌ | admin@7zi.studio,ops@7zi.studio | 关键告警邮箱 |
| `ALERT_EMAIL_HIGH` | ❌ | admin@7zi.studio | 高优先级告警邮箱 |
| `ALERT_EMAIL_WARNING` | ❌ | dev@7zi.studio | 警告级别告警邮箱 |
| `ALERT_EMAIL_INFO` | ❌ | dev@7zi.studio | 信息级别告警邮箱 |
| `ALERT_SMS_CRITICAL` | ❌ | +86-xxx-xxxx-xxxx | 紧急告警 SMS |
| `DOMAIN` | ❌ | 7zi.studio | 域名 |
| `MONITORING_URL` | ❌ | https://monitoring.7zi.studio | 监控 URL |

**状态**: 🔴 **存在真实 SendGrid API Key 和 Grafana 弱密码！**

---

### 6. `.env.test`

| 环境变量 | 敏感 | 默认值 | 说明 |
|---------|------|--------|------|
| `NODE_ENV` | ❌ | test | 测试环境 |
| `NEXT_PUBLIC_APP_URL` | ❌ | http://localhost:3000 | 应用 URL |
| `DATABASE_PATH` | ❌ | /tmp/test-7zi.db | 测试数据库路径 |
| `TEST_DATABASE_PATH` | ❌ | /tmp/test-7zi.db | 测试数据库路径 |
| `REDIS_URL` | ❌ | redis://localhost:6379/15 | Redis 测试实例 |
| `NEXTAUTH_SECRET` | ✅ | test-secret-key... | 测试用密钥 |
| `NEXTAUTH_URL` | ❌ | http://localhost:3000 | 测试 URL |
| `JWT_SECRET` | ✅ | test-jwt-secret... | 测试用 JWT 密钥 |
| `GITHUB_TOKEN` | ✅ | test_github_token | 测试用 GitHub Token |
| `GITHUB_API_URL` | ❌ | https://api.github.com | GitHub API 地址 |
| `EMAIL_FROM` | ❌ | test@example.com | 测试发件邮箱 |
| `EMAIL_TO` | ❌ | test@example.com | 测试收件邮箱 |
| `A2A_GATEWAY_URL` | ❌ | http://localhost:3001 | A2A 网关 URL |
| `A2A_GATEWAY_TOKEN` | ✅ | test-token | A2A 测试 Token |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ | (空) | Sentry DSN (禁用) |
| `SENTRY_DSN` | ❌ | (空) | Sentry DSN (禁用) |
| `PERFORMANCE_LOG_LEVEL` | ❌ | debug | 性能日志级别 |
| `CACHE_TTL_SECONDS` | ❌ | 60 | 缓存 TTL |
| `CACHE_ENABLED` | ❌ | true | 缓存开关 |
| `RATE_LIMIT_MAX` | ❌ | 100 | 速率限制 |
| `RATE_LIMIT_WINDOW_MS` | ❌ | 60000 | 速率限制窗口 |
| `LOG_LEVEL` | ❌ | debug | 日志级别 |

**状态**: ✅ 测试环境，风险可控

---

## 🔴 安全风险分析

### 高风险 (Critical)

| 风险项 | 位置 | 详情 |
|--------|------|------|
| **JWT_SECRET 硬编码** | `7zi-frontend/.env.production` | 包含真实的 128 字符十六进制 JWT 密钥，一旦泄露可导致会话伪造 |
| **JWT_SECRET 硬编码** | `botmem/.env` | 包含真实的 64 字符十六进制 JWT 密钥 |
| **CSRF_SECRET 硬编码** | `botmem/.env` | 包含真实的 CSRF 保护密钥 |
| **MOLTBOOK_API_KEY 泄露** | `botmem/moltbook-gateway/.env` | 包含真实的 Moltbook API Key |
| **SendGrid API Key 泄露** | `botmem/monitoring/.env` | 包含真实的 SendGrid API Key |
| **弱密码** | `botmem/monitoring/.env` | `GRAFANA_ADMIN_PASSWORD=ChangeMeInProduction123!` 强度不足 |
| **弱密码** | `botmem/.env` | `ADMIN_PASSWORD=change_this_password` 未修改默认值 |
| **Resend API Key** | `botmem/.env` | `RESEND_API_KEY=re_xxxxxxxx...` |

### 中风险 (Medium)

| 风险项 | 位置 | 详情 |
|--------|------|------|
| **SMTP 密码明文** | `7zi-frontend/.env.production` | `SMTP_PASSWORD=your-smtp-password` 占位符但描述不清 |
| **SESSION_SECRET 弱** | `7zi-frontend/.env.production` | `your-session-secret-change-this-at-least-32-characters` 未替换 |
| **Slack Webhook URL** | `botmem/monitoring/.env` | 生产环境 Slack Webhook 可能已配置真实值 |

### 低风险 (Low)

| 风险项 | 位置 | 详情 |
|--------|------|------|
| **测试 Token** | `.env.test` | 测试环境使用的假 Token，可接受 |
| **占位符 DSN** | `7zi-frontend/.env.production` | `SENTRY_DSN=placeholder@...` 为占位符 |

---

## 📊 统计摘要

| 类别 | 数量 |
|------|------|
| `.env` 实际配置文件 | 6 个 |
| `.env.example` 模板文件 | 10 个 |
| 高风险敏感信息 | 8 项 |
| 中风险敏感信息 | 3 项 |
| 低风险项 | 2 项 |

---

## ✅ 配置改进建议

### 1. 紧急修复 (P0)

```bash
# 1. 立即轮换以下密钥:
# - JWT_SECRET (7zi-frontend/.env.production)
# - JWT_SECRET (botmem/.env)
# - CSRF_SECRET (botmem/.env)
# - MOLTBOOK_API_KEY (botmem/moltbook-gateway/.env)
# - SENDGRID_API_KEY (botmem/monitoring/.env)
# - RESEND_API_KEY (botmem/.env)

# 生成新密钥方法:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. 使用 .env.example 模板 (P1)

所有项目应遵循以下模式:

```
project/
├── .env              # 实际配置 (不提交到 Git)
├── .env.example      # 模板 (提交到 Git)
└── .env.local        # 本地覆盖 (不提交到 Git)
```

**示例文件结构**:
- ✅ `7zi-frontend/.env.example` - 已有模板
- ❌ `7zi-frontend/.env.production` - **实际值不应存在**
- ✅ `botmem/.env.example` - **缺少模板**
- ❌ `botmem/.env` - **实际值存在**

### 3. 密钥管理最佳实践 (P1)

```bash
# 使用 .gitignore 排除所有实际 .env 文件
# 在 .gitignore 中添加:
.env
.env.local
.env.*.local
!.env.example
!.env.docker.example
```

### 4. 加强密码策略 (P1)

| 当前密码 | 建议 |
|---------|------|
| `ChangeMeInProduction123!` | 使用 16+ 字符随机密码 |
| `change_this_password` | 立即修改为强密码 |

### 5. 敏感信息检测自动化 (P2)

添加 pre-commit hook 检测敏感信息:

```bash
# 在 .git/hooks/pre-commit 中添加:
#!/bin/bash
grep -r "JWT_SECRET\|API_KEY\|PASSWORD" . --include=".env" | grep -v ".example"
if [ $? -eq 0 ]; then
    echo "❌ 敏感信息检测失败！请检查 .env 文件"
    exit 1
fi
```

### 6. 环境变量命名规范 (P2)

当前命名**良好**，建议保持:
- `NEXT_PUBLIC_*` - 客户端可见
- 无前缀 - 服务端专用
- 大写下划线分隔

### 7. 使用密钥管理服务 (P3)

生产环境建议使用:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Kubernetes Secrets**
- **Doppler**

---

## 📁 目录结构问题

```
/root/.openclaw/workspace/
├── .env.production          ❌ 实际值
├── .env.test               ✅ 测试值 (可接受)
├── .env.example             ✅ 模板
├── .env.production.example  ✅ 模板
├── .env.sentry.example      ✅ 模板
├── .env.docker.example      ✅ 模板
│
├── 7zi-frontend/
│   ├── .env.production      ❌ 实际值 (含 JWT_SECRET)
│   └── .env.example         ✅ 模板
│
├── botmem/
│   ├── .env                 ❌ 实际值 (含 JWT_SECRET, CSRF_SECRET)
│   ├── moltbook-gateway/
│   │   └── .env             ❌ 实际值 (含 MOLTBOOK_API_KEY)
│   └── monitoring/
│       └── .env             ❌ 实际值 (含 SENDGRID_API_KEY)
│
├── deploy/
│   └── .env.example         ✅ 模板
│
└── workflow-engine/
    ├── backend/
    │   └── .env.example     ✅ 模板
    └── v111/
        └── .env.example     ✅ 模板
```

---

## 🎯 总结

| 优先级 | 任务 | 工作量 |
|--------|------|--------|
| P0 | 轮换 `7zi-frontend/.env.production` 中的 JWT_SECRET | 5 分钟 |
| P0 | 轮换 `botmem/.env` 中的 JWT_SECRET, CSRF_SECRET | 5 分钟 |
| P0 | 轮换 `botmem/moltbook-gateway/.env` 中的 MOLTBOOK_API_KEY | 5 分钟 |
| P0 | 轮换 `botmem/monitoring/.env` 中的 SENDGRID_API_KEY | 5 分钟 |
| P1 | 为 `botmem/` 创建 `.env.example` 模板 | 15 分钟 |
| P1 | 修改 Grafana 和 Admin 弱密码 | 5 分钟 |
| P2 | 添加 .gitignore 规则排除实际 .env 文件 | 5 分钟 |
| P2 | 添加 pre-commit hook 检测敏感信息 | 15 分钟 |

---

**报告生成**: 环境配置安全检查子代理  
**建议**: 立即处理 P0 级别的密钥轮换，避免生产环境被攻击

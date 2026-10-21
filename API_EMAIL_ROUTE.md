# Email API Route

**路径**: `POST /api/email`, `GET /api/email`  
**位置**: `7zi-frontend/src/app/api/email/route.ts`  
**客户端 SDK**: `7zi-frontend/src/lib/email/api-client.ts`  
**安全修复**: P0-3 — nodemailer 从客户端 bundle 剥离，仅运行于服务端；SMTP 凭据仅存于服务端环境变量

---

## 概述

邮件发送功能原由客户端直接 import nodemailer，存在凭据泄露风险。重构后：

- 客户端通过 `fetch` 调用 `POST /api/email`（SMTP 凭据对浏览器不可见）
- nodemailer 仅在 Next.js 服务端路由中动态加载（服务端 bundle）
- SMTP 配置完全来源于服务端环境变量（`SMTP_*` 或旧名 `EMAIL_SMTP_*`）

---

## 环境变量

| 变量名 | 旧变量名（兼容） | 必填 | 默认值 | 说明 |
|--------|------------------|------|--------|------|
| `SMTP_HOST` | `EMAIL_SMTP_HOST` | ✅ | — | SMTP 服务器地址 |
| `SMTP_PORT` | `EMAIL_SMTP_PORT` | — | `587` | SMTP 端口（TLS）；465 对应 SSL |
| `SMTP_USER` | `EMAIL_SMTP_USER` | ✅ | — | 用户名 |
| `SMTP_PASS` | `EMAIL_SMTP_PASS` | ✅ | — | 密码 |
| `SMTP_FROM` | `EMAIL_FROM` | — | `SMTP_USER` | 默认发件人地址 |

> `SMTP_SECURE` 由端口自动推导：465 → `true`，其他 → `false`

---

## `POST /api/email`

发送邮件或测试 SMTP 连接。

### 请求体

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `action` | `'send' \| 'test'` | — | `'send'` | `'send'` 发送邮件，`'test'` 仅验证连接 |
| `to` | `string \| string[]` | 发送时 ✅ | — | 收件人（逗号分隔字符串或数组） |
| `subject` | `string` | — | `'Notification'` | 邮件主题 |
| `text` | `string` | — | `''` | 纯文本正文 |
| `html` | `string` | — | — | HTML 正文（可选，与 text 二选一） |
| `from` | `string` | — | `SMTP_FROM` | 自定义发件人（覆盖默认） |
| `timeout` | `number` | — | `10000` | 超时（毫秒），> 0 才生效 |

### 响应体

**成功 (`success: true`)**:

```json
{
  "success": true,
  "data": {
    "messageId": "<abc123@smtp.example.com>",
    "accepted": ["recipient@example.com"],
    "rejected": [],
    "response": "250 OK: message queued",
    "verified": false
  }
}
```

> `action='test'` 时返回 `verified: true` 而 `messageId` 等字段不存在。

**失败 (`success: false`)**:

```json
{
  "success": false,
  "error": "ETIMEDOUT / Invalid login / ..."
}
```

### 状态码

| HTTP 状态码 | 含义 | 触发条件 |
|-------------|------|---------|
| `200` | 成功 | 邮件已提交或连接验证通过 |
| `400` | 请求参数非法 | JSON 解析失败 / `to` 为空（发送时） |
| `500` | 发送失败 | nodemailer 加载失败 / 传输错误（底层错误信息保留在 `error` 字段） |
| `503` | 服务端未配置 SMTP | `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` 任一缺失 |

---

## `GET /api/email`

健康检查 — 返回 SMTP 是否已配置。**不暴露任何凭据**。

### 响应体

```json
{
  "success": true,
  "data": {
    "configured": true,
    "missing": [],
    "host": "smtp.example.com",
    "port": 587
  }
}
```

`configured: false` 时 `missing` 数组列出缺失的环境变量名。

---

## 客户端调用示例

```typescript
import { sendEmailViaApi, testSmtpViaApi } from '@/lib/email/api-client'

// 发送邮件
const result = await sendEmailViaApi({
  to: 'user@example.com',
  subject: 'Alert: Workflow Failed',
  text: 'Your workflow "Daily Backup" has failed at 14:32 UTC.',
  html: '<h1>Workflow Failed</h1><p>Your workflow <strong>Daily Backup</strong> failed.</p>',
})

if (!result.success) {
  console.error('Send failed:', result.error)
} else {
  console.log('Message ID:', result.data?.messageId)
}

// 测试 SMTP 连接（不发送邮件）
const testResult = await testSmtpViaApi(5000)
console.log('SMTP configured:', testResult.data?.verified)
```

---

## 服务端路由完整文件

```typescript
// 7zi-frontend/src/app/api/email/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) { ... }
export async function GET() { ... }
```

> `runtime = 'nodejs'` 确保 nodemailer 可用；`dynamic = 'force-dynamic'` 避免静态优化将 nodemailer 打包进客户端。

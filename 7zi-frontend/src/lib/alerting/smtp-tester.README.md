# SMTP Tester Module

SMTP 邮件发送测试模块，用于测试 SMTP 服务器连接和邮件发送功能。

## 功能特性

- ✅ SMTP 连接测试
- ✅ 邮件发送测试
- ✅ 超时处理（默认 10 秒）
- ✅ 认证失败处理
- ✅ 连接失败处理
- ✅ SSL/TLS 证书错误处理
- ✅ 响应时间测量
- ✅ 凭证验证
- ✅ 常用 SMTP 服务提供商预设配置

## 安装依赖

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

## 使用示例

### 1. 测试 SMTP 连接并发送测试邮件

```typescript
import { testSMTPConnection } from '@/lib/alerting/smtp-tester'

const credentials = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
  },
}

const options = {
  to: 'recipient@example.com',
  subject: 'SMTP Test Email',
  text: 'This is a test email',
}

const result = await testSMTPConnection(credentials, options)

if (result.success) {
  console.log('✅ SMTP connection successful!')
  console.log('Response time:', result.responseTime, 'ms')
  console.log('Message ID:', result.details?.messageId)
} else {
  console.error('❌ SMTP connection failed:', result.error)
}
```

### 2. 仅测试 SMTP 连接（不发送邮件）

```typescript
import { testSMTPConnectionOnly } from '@/lib/alerting/smtp-tester'

const result = await testSMTPConnectionOnly(credentials, 10000)

if (result.success) {
  console.log('✅ Connection verified!')
  console.log('Response time:', result.responseTime, 'ms')
} else {
  console.error('❌ Connection failed:', result.error)
}
```

### 3. 验证 SMTP 凭证

```typescript
import { validateSMTPCredentials } from '@/lib/alerting/smtp-tester'

const validation = validateSMTPCredentials(credentials)

if (validation.valid) {
  console.log('✅ Credentials are valid')
} else {
  console.error('❌ Invalid credentials:', validation.errors)
}
```

### 4. 获取常用 SMTP 服务提供商配置

```typescript
import { getDefaultSMTPConfig } from '@/lib/alerting/smtp-tester'

// 获取 Gmail 配置
const gmailConfig = getDefaultSMTPConfig('gmail')
console.log(gmailConfig)
// { host: 'smtp.gmail.com', port: 587, secure: false }

// 获取 Outlook 配置
const outlookConfig = getDefaultSMTPConfig('outlook')
console.log(outlookConfig)
// { host: 'smtp-mail.outlook.com', port: 587, secure: false }
```

## API 文档

### SMTPCredentials

```typescript
interface SMTPCredentials {
  host: string      // SMTP 服务器地址
  port: number      // SMTP 端口
  secure: boolean   // 是否使用 SSL/TLS
  auth: {
    user: string    // 用户名/邮箱
    pass: string    // 密码/应用密码
  }
}
```

### TestResult

```typescript
interface TestResult {
  success: boolean              // 是否成功
  error?: string               // 错误信息
  responseTime: number         // 响应时间（毫秒）
  details?: {
    serverResponse?: string     // 服务器响应
    messageId?: string         // 邮件 ID
    acceptedRecipients?: string[]  // 接收成功的邮箱
    rejectedRecipients?: string[]  // 接收失败的邮箱
  }
}
```

### TestEmailOptions

```typescript
interface TestEmailOptions {
  from?: string      // 发件人（默认为认证用户）
  to: string         // 收件人
  subject?: string   // 邮件主题
  text?: string      // 纯文本内容
  html?: string      // HTML 内容
  timeout?: number   // 超时时间（毫秒，默认 10000）
}
```

## 支持的 SMTP 服务提供商

| 提供商 | Host | Port | Secure |
|--------|------|------|--------|
| Gmail | smtp.gmail.com | 587 | false |
| Outlook | smtp-mail.outlook.com | 587 | false |
| Yahoo | smtp.mail.yahoo.com | 587 | false |
| SendGrid | smtp.sendgrid.net | 587 | false |
| Mailgun | smtp.mailgun.org | 587 | false |
| AWS SES | email-smtp.us-east-1.amazonaws.com | 587 | false |

## 错误处理

模块会自动处理以下错误类型：

- **连接超时** (ETIMEDOUT)
- **连接被拒绝** (ECONNREFUSED)
- **主机未找到** (ENOTFOUND)
- **认证失败** (Invalid login)
- **SSL/TLS 证书错误** (certificate)

## 测试

运行单元测试：

```bash
npm test -- smtp-tester.test.ts
```

## 注意事项

1. **Gmail 用户**：需要使用应用专用密码，而不是普通密码
2. **端口选择**：
   - 587: STARTTLS（推荐）
   - 465: SSL/TLS
   - 25: 不加密（不推荐）
3. **超时设置**：默认 10 秒，可根据网络情况调整
4. **安全性**：不要在代码中硬编码密码，使用环境变量

## 示例：在 React 组件中使用

```typescript
import { useState } from 'react'
import { testSMTPConnection, validateSMTPCredentials } from '@/lib/alerting/smtp-tester'

export function SMTPTestForm() {
  const [credentials, setCredentials] = useState({
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
  })
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    const validation = validateSMTPCredentials(credentials)
    if (!validation.valid) {
      alert('Invalid credentials: ' + validation.errors.join(', '))
      return
    }

    setLoading(true)
    setResult(null)

    const testResult = await testSMTPConnection(credentials, {
      to: credentials.auth.user,
    })

    setResult(testResult)
    setLoading(false)
  }

  return (
    <div>
      <input
        value={credentials.host}
        onChange={(e) => setCredentials({ ...credentials, host: e.target.value })}
        placeholder="SMTP Host"
      />
      <input
        type="number"
        value={credentials.port}
        onChange={(e) => setCredentials({ ...credentials, port: Number(e.target.value) })}
        placeholder="Port"
      />
      <input
        value={credentials.auth.user}
        onChange={(e) => setCredentials({ ...credentials, auth: { ...credentials.auth, user: e.target.value } })}
        placeholder="Email"
      />
      <input
        type="password"
        value={credentials.auth.pass}
        onChange={(e) => setCredentials({ ...credentials, auth: { ...credentials.auth, pass: e.target.value } })}
        placeholder="Password"
      />
      <button onClick={handleTest} disabled={loading}>
        {loading ? 'Testing...' : 'Test Connection'}
      </button>

      {result && (
        <div>
          {result.success ? (
            <p>✅ Success! Response time: {result.responseTime}ms</p>
          ) : (
            <p>❌ Failed: {result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
```

## 版本历史

- **v1.9.0** - 初始版本
  - SMTP 连接测试
  - 邮件发送测试
  - 错误处理
  - 凭证验证
  - 常用 SMTP 服务提供商配置
/**
 * SMTP Tester Module
 * SMTP 邮件发送测试模块
 *
 * 用于测试 SMTP 服务器连接和邮件发送功能
 *
 * P0-3 安全修复：nodemailer 只在服务端路由 `src/app/api/email/route.ts`
 * 中加载，本模块通过 `POST /api/email` 完成连接测试与邮件发送，
 * 因此不会把 nodemailer / SMTP 凭据带进客户端 bundle。
 */

import { callEmailApi } from '@/lib/email/api-client'

/**
 * SMTP 凭证接口
 */
export interface SMTPCredentials {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

/**
 * 测试结果接口
 */
export interface TestResult {
  success: boolean
  error?: string
  responseTime: number
  details?: {
    serverResponse?: string
    messageId?: string
    acceptedRecipients?: string[]
    rejectedRecipients?: string[]
  }
}

/**
 * 测试邮件选项
 */
export interface TestEmailOptions {
  from?: string
  to: string
  subject?: string
  text?: string
  html?: string
  timeout?: number
}

/**
 * 默认超时时间（毫秒）
 */
const DEFAULT_TIMEOUT = 10000

/**
 * 归一化底层错误信息（与服务端透传的原始错误保持一致）
 */
function normalizeErrorMessage(rawMessage: string): string {
  let errorMessage = rawMessage || 'Unknown error'

  if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
    errorMessage = `Connection timeout: ${errorMessage}`
  } else if (errorMessage.includes('ECONNREFUSED')) {
    errorMessage = `Connection refused: ${errorMessage}`
  } else if (errorMessage.includes('ENOTFOUND')) {
    errorMessage = `Host not found: ${errorMessage}`
  } else if (errorMessage.includes('auth') || errorMessage.includes('Invalid login')) {
    errorMessage = `Authentication failed: ${errorMessage}`
  } else if (errorMessage.includes('certificate')) {
    errorMessage = `SSL/TLS certificate error: ${errorMessage}`
  }

  return errorMessage
}

/**
 * 测试 SMTP 连接并发送测试邮件
 *
 * 通过服务端 `/api/email` 路由执行（服务端负责 nodemailer 交互）。
 *
 * @param credentials - SMTP 凭证（保留参数以兼容既有调用签名，不会上传到服务端）
 * @param options - 测试邮件选项
 * @returns 测试结果
 */
export async function testSMTPConnection(
  credentials: SMTPCredentials,
  options: TestEmailOptions
): Promise<TestResult> {
  const startTime = Date.now()

  // 客户端不再直接连接 SMTP：由服务端依据自身环境变量配置发信。
  // 这里保留 credentials 的使用（仅用于校验与错误提示），不发送凭据到服务端。
  const validation = validateSMTPCredentials(credentials)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(', '),
      responseTime: Date.now() - startTime,
    }
  }

  const html =
    options.html ||
    `
        <html>
          <body>
            <h2>SMTP Test Email</h2>
            <p>This is a test email sent from the SMTP tester module.</p>
            <p><strong>Server:</strong> ${credentials.host}:${credentials.port}</p>
            <p><strong>Secure:</strong> ${credentials.secure ? 'Yes' : 'No'}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </body>
        </html>
      `

  const result = await callEmailApi({
    action: 'send',
    to: options.to,
    subject: options.subject || 'SMTP Test Email',
    text: options.text || 'This is a test email sent from the SMTP tester module.',
    html,
    timeout: options.timeout || DEFAULT_TIMEOUT,
  })

  const responseTime = Date.now() - startTime

  if (!result.success) {
    return {
      success: false,
      error: normalizeErrorMessage(result.error || ''),
      responseTime,
    }
  }

  return {
    success: true,
    responseTime,
    details: {
      serverResponse: result.data?.response,
      messageId: result.data?.messageId,
      acceptedRecipients: result.data?.accepted,
      rejectedRecipients: result.data?.rejected,
    },
  }
}

/**
 * 仅测试 SMTP 连接（不发送邮件）
 *
 * 通过服务端 `/api/email` 路由的 `action: 'test'` 完成。
 *
 * @param credentials - SMTP 凭证（保留参数以兼容既有调用签名）
 * @param timeout - 超时时间（毫秒）
 * @returns 测试结果
 */
export async function testSMTPConnectionOnly(
  credentials: SMTPCredentials,
  timeout: number = DEFAULT_TIMEOUT
): Promise<TestResult> {
  const startTime = Date.now()

  const validation = validateSMTPCredentials(credentials)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join(', '),
      responseTime: Date.now() - startTime,
    }
  }

  const result = await callEmailApi({
    action: 'test',
    timeout,
  })

  const responseTime = Date.now() - startTime

  if (!result.success) {
    return {
      success: false,
      error: normalizeErrorMessage(result.error || ''),
      responseTime,
    }
  }

  return {
    success: true,
    responseTime,
  }
}

/**
 * 验证 SMTP 凭证格式
 *
 * @param credentials - SMTP 凭证
 * @returns 验证结果
 */
export function validateSMTPCredentials(credentials: SMTPCredentials): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!credentials.host || typeof credentials.host !== 'string') {
    errors.push('Host is required and must be a string')
  }

  if (typeof credentials.port !== 'number' || credentials.port < 1 || credentials.port > 65535) {
    errors.push('Port must be a number between 1 and 65535')
  }

  if (typeof credentials.secure !== 'boolean') {
    errors.push('Secure must be a boolean')
  }

  if (!credentials.auth) {
    errors.push('Auth is required')
  } else {
    if (!credentials.auth.user || typeof credentials.auth.user !== 'string') {
      errors.push('Auth user is required and must be a string')
    }
    if (!credentials.auth.pass || typeof credentials.auth.pass !== 'string') {
      errors.push('Auth pass is required and must be a string')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 获取常用 SMTP 服务器的默认配置
 *
 * @param provider - 服务提供商名称
 * @returns SMTP 凭证（不包含密码）
 */
export function getDefaultSMTPConfig(provider: string): Partial<SMTPCredentials> {
  const configs: Record<string, Partial<SMTPCredentials>> = {
    gmail: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    },
    outlook: {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
    },
    yahoo: {
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
    },
    sendgrid: {
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
    },
    mailgun: {
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
    },
    ses: {
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false,
    },
  }

  return configs[provider.toLowerCase()] || {}
}

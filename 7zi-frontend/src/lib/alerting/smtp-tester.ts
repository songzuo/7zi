/**
 * SMTP Tester Module
 * SMTP 邮件发送测试模块
 *
 * 用于测试 SMTP 服务器连接和邮件发送功能
 */

import nodemailer from 'nodemailer'

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
 * 测试 SMTP 连接并发送测试邮件
 *
 * @param credentials - SMTP 凭证
 * @param options - 测试邮件选项
 * @returns 测试结果
 */
export async function testSMTPConnection(
  credentials: SMTPCredentials,
  options: TestEmailOptions
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    // 创建传输器
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.secure,
      auth: {
        user: credentials.auth.user,
        pass: credentials.auth.pass,
      },
      // 设置超时
      connectionTimeout: options.timeout || DEFAULT_TIMEOUT,
      greetingTimeout: options.timeout || DEFAULT_TIMEOUT,
      socketTimeout: options.timeout || DEFAULT_TIMEOUT,
    })

    // 验证连接
    await transporter.verify()

    // 准备测试邮件
    const mailOptions = {
      from: options.from || credentials.auth.user,
      to: options.to,
      subject: options.subject || 'SMTP Test Email',
      text: options.text || 'This is a test email sent from the SMTP tester module.',
      html:
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
      `,
    }

    // 发送测试邮件
    const info = await transporter.sendMail(mailOptions)

    const responseTime = Date.now() - startTime

    return {
      success: true,
      responseTime,
      details: {
        serverResponse: info.response,
        messageId: info.messageId,
        acceptedRecipients: info.accepted,
        rejectedRecipients: info.rejected,
      },
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    // 处理不同类型的错误
    let errorMessage = 'Unknown error'

    if (error instanceof Error) {
      errorMessage = error.message

      // 特定错误处理
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        errorMessage = `Connection timeout: ${error.message}`
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused: ${error.message}`
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = `Host not found: ${error.message}`
      } else if (error.message.includes('auth') || error.message.includes('Invalid login')) {
        errorMessage = `Authentication failed: ${error.message}`
      } else if (error.message.includes('certificate')) {
        errorMessage = `SSL/TLS certificate error: ${error.message}`
      }
    }

    return {
      success: false,
      error: errorMessage,
      responseTime,
    }
  }
}

/**
 * 仅测试 SMTP 连接（不发送邮件）
 *
 * @param credentials - SMTP 凭证
 * @param timeout - 超时时间（毫秒）
 * @returns 测试结果
 */
export async function testSMTPConnectionOnly(
  credentials: SMTPCredentials,
  timeout: number = DEFAULT_TIMEOUT
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.secure,
      auth: {
        user: credentials.auth.user,
        pass: credentials.auth.pass,
      },
      connectionTimeout: timeout,
      greetingTimeout: timeout,
      socketTimeout: timeout,
    })

    // 仅验证连接
    await transporter.verify()

    const responseTime = Date.now() - startTime

    return {
      success: true,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    let errorMessage = 'Unknown error'

    if (error instanceof Error) {
      errorMessage = error.message

      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        errorMessage = `Connection timeout: ${error.message}`
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused: ${error.message}`
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = `Host not found: ${error.message}`
      } else if (error.message.includes('auth') || error.message.includes('Invalid login')) {
        errorMessage = `Authentication failed: ${error.message}`
      } else if (error.message.includes('certificate')) {
        errorMessage = `SSL/TLS certificate error: ${error.message}`
      }
    }

    return {
      success: false,
      error: errorMessage,
      responseTime,
    }
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
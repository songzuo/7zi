/**
 * Email API Client (browser-safe)
 * 邮件 API 客户端（可在浏览器中使用）
 *
 * P0-3 安全修复：
 * 客户端不再 import nodemailer，所有 SMTP 交互都通过服务端路由
 * `POST /api/email` 完成，SMTP 凭据只存在于服务端环境变量中。
 */

export interface EmailApiSendOptions {
  to: string | string[]
  subject?: string
  text?: string
  html?: string
  from?: string
  timeout?: number
  /** 发送前先校验 SMTP 连接（对应 smtp-tester 的“连接并发送”语义） */
  verify?: boolean
}

export interface EmailApiResult {
  success: boolean
  /** HTTP 状态码（网络异常时为 0） */
  status: number
  error?: string
  data?: {
    messageId?: string
    accepted?: string[]
    rejected?: string[]
    response?: string
    verified?: boolean
    host?: string
    port?: number
  }
}

/** API 路由地址 */
export const EMAIL_API_ENDPOINT = '/api/email'

/**
 * 调用服务端邮件 API
 */
export async function callEmailApi(
  body: Record<string, unknown>,
  init?: { signal?: AbortSignal }
): Promise<EmailApiResult> {
  try {
    const response = await fetch(EMAIL_API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(init?.signal ? { signal: init.signal } : {}),
    })

    let payload: {
      success?: boolean
      error?: string
      data?: EmailApiResult['data']
    } = {}

    try {
      payload = (await response.json()) as typeof payload
    } catch {
      payload = {}
    }

    if (!response.ok || payload.success === false) {
      return {
        success: false,
        status: response.status,
        error: payload.error || `Email API request failed with status ${response.status}`,
      }
    }

    return {
      success: true,
      status: response.status,
      data: payload.data,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      status: 0,
      error: `Email API unreachable: ${message}`,
    }
  }
}

/**
 * 通过服务端发送邮件
 */
export async function sendEmailViaApi(options: EmailApiSendOptions): Promise<EmailApiResult> {
  const body: Record<string, unknown> = {
    action: 'send',
    to: options.to,
  }

  if (options.subject) body.subject = options.subject
  if (options.text) body.text = options.text
  if (options.html) body.html = options.html
  if (options.from) body.from = options.from
  if (options.timeout) body.timeout = options.timeout
  if (options.verify) body.verify = true

  return callEmailApi(body)
}

/**
 * 通过服务端测试 SMTP 连接（不发送邮件）
 */
export async function testSmtpViaApi(timeout?: number): Promise<EmailApiResult> {
  return callEmailApi({
    action: 'test',
    ...(timeout ? { timeout } : {}),
  })
}

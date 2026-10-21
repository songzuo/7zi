/**
 * Email API Route (server-only)
 * 邮件发送 API（仅服务端）
 *
 * P0-3 安全修复：nodemailer 只能运行在服务端，
 * 客户端通过 POST /api/email 调用本路由，不再直接 import nodemailer。
 *
 * SMTP 配置来源（环境变量）：
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
 *   （兼容旧变量名：EMAIL_SMTP_HOST / EMAIL_SMTP_PORT / EMAIL_SMTP_USER /
 *     EMAIL_SMTP_PASS / EMAIL_FROM）
 *
 * 请求体：
 *   {
 *     action?: 'send' | 'test',
 *     to?: string | string[],
 *     subject?: string,
 *     text?: string,
 *     html?: string,
 *     from?: string
 *   }
 *
 * 响应体：
 *   成功: { success: true, data: { messageId, accepted, rejected, response, verified } }
 *   失败: { success: false, error: string }
 *
 * 状态码：
 *   400 - 请求参数非法
 *   503 - 服务端未配置 SMTP
 *   500 - 发送失败
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** 默认超时（毫秒） */
const DEFAULT_TIMEOUT = 10000

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

interface SendRequestBody {
  action?: 'send' | 'test'
  to?: string | string[]
  subject?: string
  text?: string
  html?: string
  from?: string
  timeout?: number
}

/**
 * 从环境变量读取 SMTP 配置。
 * 缺失的必需项会记录在 missing 数组中。
 */
export function resolveSmtpConfig(
  env: NodeJS.ProcessEnv = process.env
): { config: SmtpConfig | null; missing: string[] } {
  const host = (env.SMTP_HOST || env.EMAIL_SMTP_HOST || '').trim()
  const portRaw = env.SMTP_PORT || env.EMAIL_SMTP_PORT || ''
  const user = (env.SMTP_USER || env.EMAIL_SMTP_USER || '').trim()
  const pass = (env.SMTP_PASS || env.EMAIL_SMTP_PASS || '').trim()
  const from = (env.SMTP_FROM || env.EMAIL_FROM || '').trim()

  const missing: string[] = []
  if (!host) missing.push('SMTP_HOST')
  if (!user) missing.push('SMTP_USER')
  if (!pass) missing.push('SMTP_PASS')

  const port = portRaw ? Number.parseInt(portRaw, 10) : 587

  if (missing.length > 0) {
    return { config: null, missing }
  }

  return {
    config: {
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: port === 465,
      user,
      pass,
      from: from || user,
    },
    missing,
  }
}

/**
 * 归一化收件人列表
 */
function normalizeRecipients(to?: string | string[] | unknown): string[] {
  if (!to) return []
  const list = Array.isArray(to) ? to : String(to).split(',')
  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object' && 'address' in item) {
        return String((item as { address?: unknown }).address ?? '').trim()
      }
      return String(item).trim()
    })
    .filter(Boolean)
}

/**
 * 错误响应
 */
function errorResponse(status: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * POST /api/email
 * 发送邮件（action='send'）或测试 SMTP 连接（action='test'）
 */
export async function POST(request: NextRequest) {
  // 说明：该文件位于 src/app/api/ 下，Next.js 只会在服务端执行此路由，
  // 客户端 bundle 中不会出现 nodemailer（见构建验证）。

  let body: SendRequestBody
  try {
    body = (await request.json()) as SendRequestBody
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const action = body.action === 'test' ? 'test' : 'send'

  const { config, missing } = resolveSmtpConfig()
  if (!config) {
    return errorResponse(
      503,
      `SMTP is not configured on the server. Missing environment variable(s): ${missing.join(', ')}`
    )
  }

  const timeout = body.timeout && body.timeout > 0 ? body.timeout : DEFAULT_TIMEOUT

  // nodemailer 只在服务端按需加载（服务端 bundle，客户端不可见）
  let nodemailer: typeof import('nodemailer')
  try {
    nodemailer = await import('nodemailer')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return errorResponse(500, `Failed to load nodemailer on server: ${message}`)
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: timeout,
      greetingTimeout: timeout,
      socketTimeout: timeout,
    })

    if (action === 'test') {
      await transporter.verify()
      return NextResponse.json({
        success: true,
        data: { verified: true, host: config.host, port: config.port },
      })
    }

    const recipients = normalizeRecipients(body.to)
    if (recipients.length === 0) {
      return errorResponse(400, 'At least one recipient is required')
    }

    const subject = body.subject || 'Notification'
    const text = body.text || ''
    const html = body.html

    const info = await transporter.sendMail({
      from: body.from || config.from,
      to: recipients,
      subject,
      text,
      ...(html ? { html } : {}),
    })

    return NextResponse.json({
      success: true,
      data: {
        messageId: info.messageId,
        accepted: normalizeRecipients(info.accepted as unknown as string[]),
        rejected: normalizeRecipients(info.rejected as unknown as string[]),
        response: info.response,
        verified: false,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // 保留底层错误信息（ETIMEDOUT / ECONNREFUSED / Invalid login ...），
    // 便于客户端做错误归类与提示。
    return errorResponse(500, message)
  }
}

/**
 * GET /api/email
 * 健康检查：返回 SMTP 是否已配置（不暴露任何凭据）
 */
export async function GET() {
  const { config, missing } = resolveSmtpConfig()
  return NextResponse.json({
    success: true,
    data: {
      configured: Boolean(config),
      missing,
      host: config?.host,
      port: config?.port,
    },
  })
}

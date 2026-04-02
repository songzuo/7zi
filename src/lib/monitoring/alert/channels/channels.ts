/**
 * Alert Channels Configuration Module
 * 统一的多渠道告警配置系统
 *
 * 支持的告警渠道：
 * - Email (Resend/SendGrid/Nodemailer)
 * - Slack
 * - Telegram
 * - Feishu (飞书)
 * - DingTalk (钉钉)
 * - SMS (预留接口)
 * - Webhook
 */

// ========================================
// Types
// ========================================

export type AlertChannelType =
  | 'email'
  | 'slack'
  | 'telegram'
  | 'feishu'
  | 'dingtalk'
  | 'sms'
  | 'webhook'

export interface ChannelConfigBase {
  enabled: boolean
  name: string
  priority?: number // 通道优先级，数字越小优先级越高
  retryAttempts?: number
  timeoutMs?: number
}

export interface EmailChannelConfig extends ChannelConfigBase {
  type: 'email'
  provider: 'resend' | 'sendgrid' | 'nodemailer' | 'custom'
  apiKey?: string
  from: string
  recipients: string[]
  cc?: string[]
  bcc?: string[]
  templateId?: string
  // Nodemailer specific options
  smtp?: {
    host: string
    port: number
    secure?: boolean
    auth?: {
      user: string
      pass: string
    }
  }
}

export interface SlackChannelConfig extends ChannelConfigBase {
  type: 'slack'
  webhookUrl: string
  channel?: string // 使用 Web API 时需要的频道
  username?: string
  iconEmoji?: string
  attachments?: boolean // 是否使用富文本附件
}

export interface TelegramChannelConfig extends ChannelConfigBase {
  type: 'telegram'
  botToken: string
  chatId: string | number
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableWebPagePreview?: boolean
  silent?: boolean
}

export interface WebhookChannelConfig extends ChannelConfigBase {
  type: 'webhook'
  url: string
  method: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  format: 'json' | 'form' | 'text'
}

export interface FeishuChannelConfig extends ChannelConfigBase {
  type: 'feishu'
  webhookUrl: string
  msgType?: 'text' | 'post' | 'interactive'
  title?: string
  text?: string
  btns?: Array<{ title: string; url: string }>
}

export interface DingTalkChannelConfig extends ChannelConfigBase {
  type: 'dingtalk'
  webhookUrl: string
  secret?: string // 加签密钥
  msgType?: 'text' | 'markdown' | 'link' | 'actionCard'
  title?: string
  text?: string
  btns?: Array<{ title: string; actionURL: string }>
  atMobiles?: string[]
  isAtAll?: boolean
}

export interface SMSChannelConfig extends ChannelConfigBase {
  type: 'sms'
  provider: 'aliyun' | 'tencent' | 'twilio' | 'custom'
  apiKey?: string
  apiSecret?: string
  signName?: string // 短信签名
  templateCode?: string // 模板代码
  templateParams?: Record<string, string>
  phones: string[]
  // 预留接口，不实现具体逻辑
  customProvider?: {
    url: string
    method: 'POST' | 'GET'
    headers?: Record<string, string>
  }
}

export type AlertChannelConfig =
  | EmailChannelConfig
  | SlackChannelConfig
  | TelegramChannelConfig
  | WebhookChannelConfig
  | FeishuChannelConfig
  | DingTalkChannelConfig
  | SMSChannelConfig

export interface ChannelRoutingRule {
  match: ChannelMatcher
  channels: AlertChannelType[]
}

export interface ChannelMatcher {
  severity?: Array<'p0' | 'p1' | 'p2' | 'p3'>
  tags?: string[]
  alertName?: string // 正则表达式
}

// ========================================
// Channel Manager
// ========================================

export class AlertChannelManager {
  private channels: Map<string, AlertChannelConfig>
  private routingRules: ChannelRoutingRule[]

  constructor() {
    this.channels = new Map()
    this.routingRules = []
  }

  /**
   * 注册告警渠道
   */
  registerChannel(id: string, config: AlertChannelConfig): void {
    this.channels.set(id, config)
  }

  /**
   * 批量注册渠道
   */
  registerChannels(configs: Array<{ id: string; config: AlertChannelConfig }>): void {
    for (const { id, config } of configs) {
      this.registerChannel(id, config)
    }
  }

  /**
   * 取消注册渠道
   */
  unregisterChannel(id: string): boolean {
    return this.channels.delete(id)
  }

  /**
   * 获取渠道配置
   */
  getChannel(id: string): AlertChannelConfig | undefined {
    return this.channels.get(id)
  }

  /**
   * 获取所有渠道
   */
  getAllChannels(): Array<{ id: string; config: AlertChannelConfig }> {
    return Array.from(this.channels.entries()).map(([id, config]) => ({
      id,
      config,
    }))
  }

  /**
   * 获取启用的渠道
   */
  getEnabledChannels(): Array<{
    id: string
    config: AlertChannelConfig
  }> {
    return this.getAllChannels().filter(item => item.config.enabled)
  }

  /**
   * 按类型获取渠道
   */
  getChannelsByType(type: AlertChannelType): Array<{ id: string; config: AlertChannelConfig }> {
    return this.getAllChannels().filter(item => item.config.type === type)
  }

  /**
   * 添加路由规则
   */
  addRoutingRule(rule: ChannelRoutingRule): void {
    this.routingRules.push(rule)
  }

  /**
   * 根据告警信息匹配目标渠道
   */
  matchChannels(
    severity: 'p0' | 'p1' | 'p2' | 'p3',
    tags: string[] = [],
    alertName = ''
  ): AlertChannelType[] {
    // 默认返回所有启用的渠道类型
    const defaultChannels = this.getEnabledChannels()
      .map(item => item.config.type)
      .filter((value, index, self) => self.indexOf(value) === index)

    for (const rule of this.routingRules) {
      if (this.matchesRule(rule.match, severity, tags, alertName)) {
        return rule.channels.filter(channel => this.hasEnabledChannel(channel))
      }
    }

    return defaultChannels
  }

  /**
   * 检查是否有启用的特定类型渠道
   */
  private hasEnabledChannel(type: AlertChannelType): boolean {
    return this.getChannelsByType(type).some(item => item.config.enabled)
  }

  /**
   * 检查规则是否匹配
   */
  private matchesRule(
    matcher: ChannelMatcher,
    severity: 'p0' | 'p1' | 'p2' | 'p3',
    tags: string[],
    alertName: string
  ): boolean {
    // 检查严重级别
    if (matcher.severity && matcher.severity.length > 0 && !matcher.severity.includes(severity)) {
      return false
    }

    // 检查标签
    if (matcher.tags && matcher.tags.length > 0 && !matcher.tags.some(tag => tags.includes(tag))) {
      return false
    }

    // 检查告警名称（正则）
    if (matcher.alertName) {
      try {
        const regex = new RegExp(matcher.alertName)
        if (!regex.test(alertName)) {
          return false
        }
      } catch (e) {
        console.error('Invalid regex in channel routing rule:', e)
        return false
      }
    }

    return true
  }

  /**
   * 验证渠道配置
   */
  validateChannel(config: AlertChannelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.type) {
      errors.push('Missing channel type')
    }

    if (!config.name) {
      errors.push('Missing channel name')
    }

    switch (config.type) {
      case 'email': {
        const emailConfig = config as EmailChannelConfig
        // Nodemailer can use SMTP instead of API key
        if (!emailConfig.apiKey && !emailConfig.smtp) {
          errors.push('Email: Missing API key or SMTP configuration')
        }
        if (!emailConfig.from) {
          errors.push('Email: Missing from address')
        }
        if (!emailConfig.recipients || emailConfig.recipients.length === 0) {
          errors.push('Email: Missing recipients')
        }
        break
      }
      case 'slack': {
        const slackConfig = config as SlackChannelConfig
        if (!slackConfig.webhookUrl) {
          errors.push('Slack: Missing webhook URL')
        }
        break
      }
      case 'telegram': {
        const telegramConfig = config as TelegramChannelConfig
        if (!telegramConfig.botToken) {
          errors.push('Telegram: Missing bot token')
        }
        if (!telegramConfig.chatId) {
          errors.push('Telegram: Missing chat ID')
        }
        break
      }
      case 'webhook': {
        const webhookConfig = config as WebhookChannelConfig
        if (!webhookConfig.url) {
          errors.push('Webhook: Missing URL')
        }
        break
      }
      case 'feishu': {
        const feishuConfig = config as FeishuChannelConfig
        if (!feishuConfig.webhookUrl) {
          errors.push('Feishu: Missing webhook URL')
        }
        break
      }
      case 'dingtalk': {
        const dingtalkConfig = config as DingTalkChannelConfig
        if (!dingtalkConfig.webhookUrl) {
          errors.push('DingTalk: Missing webhook URL')
        }
        break
      }
      case 'sms': {
        const smsConfig = config as SMSChannelConfig
        if (!smsConfig.phones || smsConfig.phones.length === 0) {
          errors.push('SMS: Missing phone numbers')
        }
        // SMS is a reserved interface - no actual implementation
        // Can add custom provider later
        break
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 从环境变量加载配置
   */
  static fromEnvironment(): AlertChannelManager {
    const manager = new AlertChannelManager()

    // Email
    if (process.env.EMAIL_ENABLED === 'true') {
      manager.registerChannel('default-email', {
        type: 'email',
        enabled: true,
        name: 'Default Email',
        provider:
          (process.env.EMAIL_PROVIDER as 'resend' | 'sendgrid' | 'nodemailer' | 'custom') ||
          'resend',
        apiKey: process.env.EMAIL_API_KEY || '',
        from: process.env.EMAIL_FROM || 'alerts@7zi.studio',
        recipients: process.env.EMAIL_RECIPIENTS?.split(',') || [],
        cc: process.env.EMAIL_CC?.split(','),
        bcc: process.env.EMAIL_BCC?.split(','),
        retryAttempts: 3,
        timeoutMs: 30000,
      })
    }

    // Slack
    if (process.env.SLACK_ENABLED === 'true') {
      manager.registerChannel('default-slack', {
        type: 'slack',
        enabled: true,
        name: 'Default Slack',
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        username: process.env.SLACK_USERNAME || 'Alert Bot',
        iconEmoji: process.env.SLACK_ICON_EMOJI || ':warning:',
        attachments: true,
        retryAttempts: 3,
        timeoutMs: 10000,
      })
    }

    // Telegram
    if (process.env.TELEGRAM_ENABLED === 'true') {
      manager.registerChannel('default-telegram', {
        type: 'telegram',
        enabled: true,
        name: 'Default Telegram',
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
        parseMode: (process.env.TELEGRAM_PARSE_MODE as 'Markdown' | 'HTML') || 'Markdown',
        disableWebPagePreview: true,
        retryAttempts: 3,
        timeoutMs: 10000,
      })
    }

    // Webhook
    if (process.env.WEBHOOK_ENABLED === 'true') {
      manager.registerChannel('default-webhook', {
        type: 'webhook',
        enabled: true,
        name: 'Default Webhook',
        url: process.env.WEBHOOK_URL || '',
        method: (process.env.WEBHOOK_METHOD as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST',
        format: (process.env.WEBHOOK_FORMAT as 'json' | 'form' | 'text') || 'json',
        headers: process.env.WEBHOOK_HEADERS ? JSON.parse(process.env.WEBHOOK_HEADERS) : {},
        retryAttempts: 3,
        timeoutMs: 30000,
      })
    }

    // Feishu (飞书)
    if (process.env.FEISHU_ENABLED === 'true') {
      manager.registerChannel('default-feishu', {
        type: 'feishu',
        enabled: true,
        name: 'Default Feishu',
        webhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
        msgType: (process.env.FEISHU_MSG_TYPE as 'text' | 'post' | 'interactive') || 'interactive',
        retryAttempts: 3,
        timeoutMs: 10000,
      })
    }

    // DingTalk (钉钉)
    if (process.env.DINGTALK_ENABLED === 'true') {
      manager.registerChannel('default-dingtalk', {
        type: 'dingtalk',
        enabled: true,
        name: 'Default DingTalk',
        webhookUrl: process.env.DINGTALK_WEBHOOK_URL || '',
        secret: process.env.DINGTALK_SECRET,
        msgType:
          (process.env.DINGTALK_MSG_TYPE as 'text' | 'markdown' | 'link' | 'actionCard') ||
          'markdown',
        retryAttempts: 3,
        timeoutMs: 10000,
      })
    }

    // SMS (reserved interface - not implemented)
    if (process.env.SMS_ENABLED === 'true') {
      manager.registerChannel('default-sms', {
        type: 'sms',
        enabled: false, // Disabled by default - needs implementation
        name: 'Default SMS',
        provider:
          (process.env.SMS_PROVIDER as 'aliyun' | 'tencent' | 'twilio' | 'custom') || 'aliyun',
        apiKey: process.env.SMS_API_KEY,
        apiSecret: process.env.SMS_API_SECRET,
        signName: process.env.SMS_SIGN_NAME || '7zi Studio',
        templateCode: process.env.SMS_TEMPLATE_CODE,
        phones: process.env.SMS_PHONES?.split(',') || [],
        retryAttempts: 3,
        timeoutMs: 30000,
      })
    }

    // 默认路由规则
    manager.addRoutingRule({
      match: {
        severity: ['p0', 'p1'],
      },
      channels: ['email', 'slack', 'telegram', 'feishu', 'dingtalk', 'webhook'],
    })

    manager.addRoutingRule({
      match: {
        severity: ['p2'],
      },
      channels: ['slack', 'telegram', 'feishu', 'dingtalk', 'webhook'],
    })

    manager.addRoutingRule({
      match: {
        severity: ['p3'],
      },
      channels: ['webhook'],
    })

    return manager
  }

  /**
   * 导出配置为 JSON
   */
  exportConfig(): {
    channels: Record<string, AlertChannelConfig>
    routingRules: ChannelRoutingRule[]
  } {
    const channels: Record<string, AlertChannelConfig> = {}
    for (const [id, config] of this.channels.entries()) {
      channels[id] = config
    }

    return {
      channels,
      routingRules: this.routingRules,
    }
  }

  /**
   * 从 JSON 导入配置
   */
  importConfig(config: {
    channels?: Record<string, AlertChannelConfig>
    routingRules?: ChannelRoutingRule[]
  }): void {
    if (config.channels) {
      for (const [id, channelConfig] of Object.entries(config.channels)) {
        this.registerChannel(id, channelConfig)
      }
    }

    if (config.routingRules) {
      this.routingRules = config.routingRules
    }
  }
}

// ========================================
// Channel Sender
// ========================================

export interface SendResult {
  success: boolean
  channel: AlertChannelType
  channelId: string
  error?: string
  durationMs: number
}

export class AlertChannelSender {
  private manager: AlertChannelManager

  constructor(manager: AlertChannelManager) {
    this.manager = manager
  }

  /**
   * 发送告警到指定渠道
   */
  async sendToChannel(channelId: string, payload: Record<string, unknown>): Promise<SendResult> {
    const startTime = Date.now()
    const config = this.manager.getChannel(channelId)

    if (!config) {
      return {
        success: false,
        channel: 'webhook' as const,
        channelId,
        error: 'Channel not found',
        durationMs: Date.now() - startTime,
      }
    }

    if (!config.enabled) {
      return {
        success: false,
        channel: config.type,
        channelId,
        error: 'Channel is disabled',
        durationMs: Date.now() - startTime,
      }
    }

    try {
      const result = await this.sendByType(config, payload)
      return {
        success: true,
        channel: config.type,
        channelId,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        channel: config.type,
        channelId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 根据渠道类型发送
   */
  private async sendByType(
    config: AlertChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    switch (config.type) {
      case 'email':
        return this.sendEmail(config as EmailChannelConfig, payload)
      case 'slack':
        return this.sendSlack(config as SlackChannelConfig, payload)
      case 'telegram':
        return this.sendTelegram(config as TelegramChannelConfig, payload)
      case 'webhook':
        return this.sendWebhook(config as WebhookChannelConfig, payload)
      case 'feishu':
        return this.sendFeishu(config as FeishuChannelConfig, payload)
      case 'dingtalk':
        return this.sendDingTalk(config as DingTalkChannelConfig, payload)
      case 'sms':
        // SMS is a reserved interface - not implemented
        throw new Error('SMS channel is not implemented yet. Please use another channel.')
    }
  }

  /**
   * 发送邮件
   */
  private async sendEmail(
    config: EmailChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (config.provider === 'resend') {
      await this.sendResendEmail(config, payload)
    } else if (config.provider === 'sendgrid') {
      await this.sendSendGridEmail(config, payload)
    } else if (config.provider === 'nodemailer') {
      await this.sendNodemailerEmail(config, payload)
    } else {
      throw new Error(`Unsupported email provider: ${config.provider}`)
    }
  }

  /**
   * Nodemailer SMTP 发送邮件
   * 注意：这是一个接口定义，实际使用需要安装 nodemailer 包
   */
  private async sendNodemailerEmail(
    config: EmailChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!config.smtp) {
      throw new Error('Nodemailer requires SMTP configuration')
    }

    // Nodemailer implementation would go here
    // This is a placeholder that demonstrates the interface
    // In production, you would:
    // 1. Import nodemailer dynamically
    // 2. Create a transporter with SMTP config
    // 3. Send the email

    // For now, we'll simulate the API call
    const nodemailerPayload = {
      from: config.from,
      to: config.recipients.join(','),
      cc: config.cc?.join(','),
      bcc: config.bcc?.join(','),
      subject: `[${(payload.severity || 'INFO').toString().toUpperCase()}] ${payload.title || 'Alert'}`,
      html: payload.html || this.generateEmailHtml(payload),
    }

    // Log the payload for debugging (in production, use actual nodemailer)
    console.log('[Nodemailer] Would send email:', {
      smtp: config.smtp.host,
      ...nodemailerPayload,
    })

    // In production:
    // const nodemailer = await import('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: config.smtp.host,
    //   port: config.smtp.port,
    //   secure: config.smtp.secure ?? true,
    //   auth: config.smtp.auth,
    // });
    // await transporter.sendMail(nodemailerPayload);
  }

  private async sendResendEmail(
    config: EmailChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: config.recipients,
        cc: config.cc,
        bcc: config.bcc,
        subject: `[${(payload.severity || 'INFO').toString().toUpperCase()}] ${payload.title || 'Alert'}`,
        html: payload.html || this.generateEmailHtml(payload),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resend API error: ${error}`)
    }
  }

  private async sendSendGridEmail(
    config: EmailChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: config.recipients.map(email => ({ email })),
            cc: config.cc?.map(email => ({ email })),
            bcc: config.bcc?.map(email => ({ email })),
          },
        ],
        from: { email: config.from },
        subject: `[${(payload.severity || 'INFO').toString().toUpperCase()}] ${payload.title || 'Alert'}`,
        content: [
          {
            type: 'text/html',
            value: payload.html || this.generateEmailHtml(payload),
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SendGrid API error: ${error}`)
    }
  }

  /**
   * 发送 Slack
   */
  private async sendSlack(
    config: SlackChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    const slackPayload = config.attachments
      ? this.generateSlackAttachments(payload)
      : this.generateSlackText(payload)

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.username,
        icon_emoji: config.iconEmoji,
        ...slackPayload,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Slack webhook error: ${error}`)
    }
  }

  /**
   * 发送 Telegram
   */
  private async sendTelegram(
    config: TelegramChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    const text = this.generateTelegramText(payload)

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: config.parseMode,
        disable_web_page_preview: config.disableWebPagePreview,
        disable_notification: config.silent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Telegram API error: ${error}`)
    }
  }

  /**
   * 发送 Webhook
   */
  private async sendWebhook(
    config: WebhookChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    let body: string | Record<string, unknown>

    switch (config.format) {
      case 'json':
        body = JSON.stringify(payload)
        break
      case 'form':
        const formData = new FormData()
        for (const [key, value] of Object.entries(payload)) {
          formData.append(key, String(value))
        }
        body = formData
        break
      case 'text':
        body = JSON.stringify(payload, null, 2)
        break
    }

    const headers: Record<string, string> = {
      ...config.headers,
    }

    if (config.format === 'json') {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(config.url, {
      method: config.method,
      headers,
      body: body as string,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Webhook error: ${error}`)
    }
  }

  /**
   * 发送飞书消息
   */
  private async sendFeishu(
    config: FeishuChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    const severity = String(payload.severity || 'INFO')
    const title = config.title || String(payload.title || 'Alert')
    const message = config.text || String(payload.message || '')

    const feishuPayload: Record<string, unknown> = {
      msg_type: config.msgType || 'text',
    }

    if (config.msgType === 'interactive') {
      feishuPayload.card = {
        header: {
          title: { tag: 'plain_text', content: title },
          template: severity === 'p0' ? 'red' : severity === 'p1' ? 'orange' : 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: { tag: 'plain_text', content: message },
          },
          ...(config.btns?.map(btn => ({
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: btn.title },
                url: btn.url,
                type: 'primary',
              },
            ],
          })) || []),
        ],
      }
    } else if (config.msgType === 'post') {
      feishuPayload.content = {
        post: {
          zh_cn: {
            title,
            content: [[{ tag: 'text', text: message }]],
          },
        },
      }
    } else {
      feishuPayload.content = { text: `[${severity.toUpperCase()}] ${title}\n${message}` }
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feishuPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Feishu webhook error: ${error}`)
    }
  }

  /**
   * 发送钉钉消息
   */
  private async sendDingTalk(
    config: DingTalkChannelConfig,
    payload: Record<string, unknown>
  ): Promise<void> {
    const severity = String(payload.severity || 'INFO')
    const title = config.title || String(payload.title || 'Alert')
    const message = config.text || String(payload.message || '')

    const dingtalkPayload: Record<string, unknown> = {
      msgtype: config.msgType || 'text',
    }

    if (config.msgType === 'markdown') {
      dingtalkPayload.markdown = {
        title,
        text: `### ${title}\n\n${message}`,
      }
    } else if (config.msgType === 'link') {
      dingtalkPayload.link = {
        title,
        text: message,
        messageUrl: payload.url || 'https://example.com',
      }
    } else if (config.msgType === 'actionCard') {
      dingtalkPayload.actionCard = {
        title,
        text: message,
        btns:
          config.btns?.map(btn => ({
            title: btn.title,
            actionURL: btn.actionURL,
          })) || [],
      }
    } else {
      dingtalkPayload.text = {
        content: `[${severity.toUpperCase()}] ${title}\n${message}`,
      }
    }

    // 添加 @ 手机号
    if (config.atMobiles && config.atMobiles.length > 0) {
      dingtalkPayload.at = {
        atMobiles: config.atMobiles,
        isAtAll: false,
      }
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dingtalkPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DingTalk webhook error: ${error}`)
    }
  }

  // ========================================
  // Payload Generators
  // ========================================

  private generateEmailHtml(payload: Record<string, unknown>): string {
    const severity = String(payload.severity || 'INFO')
    const title = String(payload.title || 'Alert')
    const message = String(payload.message || '')
    const details = (payload.details as Record<string, string | number>) || {}

    const colorMap: Record<string, string> = {
      p0: '#ffebee',
      p1: '#fff3e0',
      p2: '#fffde7',
      p3: '#e8f5e9',
      INFO: '#e8f5e9',
    }

    const emojiMap: Record<string, string> = {
      p0: '🚨',
      p1: '🔴',
      p2: '🟡',
      p3: '🟢',
      INFO: '🟢',
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .alert { padding: 20px; border-radius: 8px; border-left: 4px solid; }
    .severity { font-weight: bold; font-size: 14px; margin-bottom: 8px; }
    .title { font-size: 20px; font-weight: bold; margin-bottom: 12px; }
    .message { font-size: 16px; margin-bottom: 16px; }
    .details { background: rgba(0,0,0,0.05); padding: 12px; border-radius: 4px; }
    .detail-row { display: flex; padding: 4px 0; }
    .detail-key { font-weight: bold; min-width: 120px; }
    .meta { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert" style="background-color: ${colorMap[severity] || '#f5f5f5'}; border-color: ${severity === 'p0' ? '#f44336' : severity === 'p1' ? '#ff9800' : '#ffeb3b'}">
      <div class="severity">${emojiMap[severity] || '🔔'} ${severity.toUpperCase()}</div>
      <div class="title">${title}</div>
      <div class="message">${message}</div>
      ${
        Object.keys(details).length > 0
          ? `
        <div class="details">
          ${Object.entries(details)
            .map(
              ([key, value]) => `
            <div class="detail-row">
              <span class="detail-key">${key}:</span>
              <span>${value}</span>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }
      <div class="meta">
        <p>Environment: ${process.env.NODE_ENV || 'unknown'}</p>
        <p>Time: ${new Date().toISOString()}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  private generateSlackAttachments(payload: Record<string, unknown>): Record<string, unknown> {
    const severity = String(payload.severity || 'INFO')
    const title = String(payload.title || 'Alert')
    const message = String(payload.message || '')
    const details = (payload.details as Record<string, string | number>) || {}

    const colorMap: Record<string, string> = {
      p0: 'danger',
      p1: 'warning',
      p2: 'good',
      p3: '#36a64f',
    }

    const emojiMap: Record<string, string> = {
      p0: '🚨',
      p1: '🔴',
      p2: '🟡',
      p3: '🟢',
      INFO: '🟢',
    }

    return {
      attachments: [
        {
          color: colorMap[severity] || '#36a64f',
          title: `${emojiMap[severity] || '🔔'} ${title}`,
          text: message,
          fields: Object.entries(details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
          footer: '7zi-frontend Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }
  }

  private generateSlackText(payload: Record<string, unknown>): Record<string, unknown> {
    const severity = String(payload.severity || 'INFO')
    const title = String(payload.title || 'Alert')
    const message = String(payload.message || '')

    const emojiMap: Record<string, string> = {
      p0: '🚨',
      p1: '🔴',
      p2: '🟡',
      p3: '🟢',
      INFO: '🟢',
    }

    const text = `${emojiMap[severity] || '🔔'} *${title}*\n\n${message}\n\n\`${new Date().toISOString()}\``

    return { text }
  }

  private generateTelegramText(payload: Record<string, unknown>): string {
    const severity = String(payload.severity || 'INFO')
    const title = String(payload.title || 'Alert')
    const message = String(payload.message || '')
    const details = (payload.details as Record<string, string | number>) || {}

    const emojiMap: Record<string, string> = {
      p0: '🚨',
      p1: '🔴',
      p2: '🟡',
      p3: '🟢',
      INFO: '🟢',
    }

    let text = `${emojiMap[severity] || '🔔'} *${title}*\n\n${message}\n\n`

    if (Object.keys(details).length > 0) {
      text += Object.entries(details)
        .map(([key, value]) => `*${key}:* \`${value}\``)
        .join('\n')
      text += '\n\n'
    }

    text += `\`${new Date().toISOString()}\``

    return text
  }
}

// ========================================
// Export singleton instances
// ========================================

let channelManagerInstance: AlertChannelManager | null = null

export function getChannelManager(): AlertChannelManager {
  if (!channelManagerInstance) {
    channelManagerInstance = AlertChannelManager.fromEnvironment()
  }
  return channelManagerInstance
}

export function createChannelManager(config?: {
  channels?: Record<string, AlertChannelConfig>
  routingRules?: ChannelRoutingRule[]
}): AlertChannelManager {
  const manager = new AlertChannelManager()
  if (config) {
    manager.importConfig(config)
  }
  channelManagerInstance = manager
  return manager
}

export function getChannelSender(): AlertChannelSender {
  return new AlertChannelSender(getChannelManager())
}

export default AlertChannelManager

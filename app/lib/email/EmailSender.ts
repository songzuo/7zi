/**
 * 邮件发送服务
 * 支持 SMTP、SendGrid、Resend 等多种发送方式
 */

export interface EmailConfig {
  // SMTP 配置
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;

  // SendGrid 配置
  sendgridApiKey?: string;

  // Resend 配置
  resendApiKey?: string;

  // 通用配置
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: EmailAddress | EmailAddress[];
  cc?: EmailAddress | EmailAddress[];
  bcc?: EmailAddress | EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: EmailAddress;
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type EmailProvider = 'smtp' | 'sendgrid' | 'resend' | 'log';

/**
 * 邮件发送器基类
 */
export abstract class EmailSender {
  protected config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  abstract send(options: EmailOptions): Promise<EmailResult>;
  abstract sendBatch(emails: EmailOptions[]): Promise<EmailResult[]>;

  /**
   * 格式化邮箱地址
   */
  protected formatAddress(addr: EmailAddress): string {
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  }

  /**
   * 格式化邮箱地址列表
   */
  protected formatAddresses(addrs: EmailAddress | EmailAddress[]): string {
    if (Array.isArray(addrs)) {
      return addrs.map(a => this.formatAddress(a)).join(', ');
    }
    return this.formatAddress(addrs);
  }
}

/**
 * 日志邮件发送器（开发环境使用）
 */
export class LogEmailSender extends EmailSender {
  async send(options: EmailOptions): Promise<EmailResult> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      to: this.formatAddresses(options.to),
      cc: options.cc ? this.formatAddresses(options.cc) : undefined,
      bcc: options.bcc ? this.formatAddresses(options.bcc) : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html ? `${options.html.substring(0, 200)}...` : undefined,
      attachments: options.attachments?.map(a => a.filename),
    };

    console.log('📧 [EMAIL]', JSON.stringify(logEntry, null, 2));

    return {
      success: true,
      messageId: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(emails.map(email => this.send(email)));
  }
}

/**
 * SMTP 邮件发送器
 */
export class SmtpEmailSender extends EmailSender {
  private transporter: any = null;

  private async getTransporter() {
    if (this.transporter) return this.transporter;

    // 动态导入 nodemailer
    const nodemailer = await import('nodemailer');

    this.transporter = nodemailer.default.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort || 587,
      secure: this.config.smtpSecure ?? false,
      auth: this.config.smtpUser ? {
        user: this.config.smtpUser,
        pass: this.config.smtpPass,
      } : undefined,
    });

    return this.transporter;
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: this.config.fromName 
          ? `${this.config.fromName} <${this.config.fromEmail}>`
          : this.config.fromEmail,
        to: this.formatAddresses(options.to),
        cc: options.cc ? this.formatAddresses(options.cc) : undefined,
        bcc: options.bcc ? this.formatAddresses(options.bcc) : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo ? this.formatAddress(options.replyTo) : this.config.replyTo,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
        headers: options.headers,
        priority: options.priority,
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(emails.map(email => this.send(email)));
  }
}

/**
 * SendGrid 邮件发送器
 */
export class SendGridEmailSender extends EmailSender {
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // 动态导入 @sendgrid/mail
      const sgMail = await import('@sendgrid/mail');
      
      sgMail.default.setApiKey(this.config.sendgridApiKey!);

      const msg = {
        to: Array.isArray(options.to) 
          ? options.to.map(a => ({ email: a.email, name: a.name }))
          : { email: options.to.email, name: options.to.name },
        cc: options.cc 
          ? (Array.isArray(options.cc) 
              ? options.cc.map(a => ({ email: a.email, name: a.name }))
              : { email: options.cc.email, name: options.cc.name })
          : undefined,
        bcc: options.bcc 
          ? (Array.isArray(options.bcc) 
              ? options.bcc.map(a => ({ email: a.email, name: a.name }))
              : { email: options.bcc.email, name: options.bcc.name })
          : undefined,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo 
          ? { email: options.replyTo.email, name: options.replyTo.name }
          : this.config.replyTo,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content) 
            ? a.content.toString('base64') 
            : Buffer.from(a.content).toString('base64'),
          type: a.contentType,
          disposition: 'attachment',
        })),
      };

      const [response] = await sgMail.default.send(msg);

      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        messageId: response.headers['x-message-id'],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
    // SendGrid 支持批量发送
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(this.config.sendgridApiKey!);

      const msgs = emails.map(options => ({
        to: Array.isArray(options.to)
          ? options.to.map(a => ({ email: a.email, name: a.name }))
          : { email: options.to.email, name: options.to.name },
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: options.subject,
        text: options.text,
        html: options.html,
      }));

      await sgMail.default.send(msgs);

      return msgs.map(() => ({
        success: true,
        messageId: `sendgrid-${Date.now()}`,
      }));
    } catch (error) {
      return emails.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }
}

/**
 * Resend 邮件发送器
 */
export class ResendEmailSender extends EmailSender {
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // 动态导入 resend
      const { Resend } = await import('resend');
      const resend = new Resend(this.config.resendApiKey);

      const { data, error } = await resend.emails.send({
        from: this.config.fromName 
          ? `${this.config.fromName} <${this.config.fromEmail}>`
          : this.config.fromEmail,
        to: Array.isArray(options.to) 
          ? options.to.map(a => a.email)
          : [options.to.email],
        cc: options.cc 
          ? (Array.isArray(options.cc) 
              ? options.cc.map(a => a.email)
              : [options.cc.email])
          : undefined,
        bcc: options.bcc 
          ? (Array.isArray(options.bcc) 
              ? options.bcc.map(a => a.email)
              : [options.bcc.email])
          : undefined,
        subject: options.subject,
        text: options.text,
        html: options.html,
        reply_to: options.replyTo?.email || this.config.replyTo,
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: Buffer.isBuffer(a.content) 
            ? a.content.toString('base64')
            : a.content,
        })),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
    return Promise.all(emails.map(email => this.send(email)));
  }
}

/**
 * 创建邮件发送器
 */
export function createEmailSender(config: EmailConfig, provider?: EmailProvider): EmailSender {
  const selectedProvider = provider || detectProvider(config);

  switch (selectedProvider) {
    case 'smtp':
      return new SmtpEmailSender(config);
    case 'sendgrid':
      return new SendGridEmailSender(config);
    case 'resend':
      return new ResendEmailSender(config);
    case 'log':
    default:
      return new LogEmailSender(config);
  }
}

/**
 * 检测邮件提供商
 */
function detectProvider(config: EmailConfig): EmailProvider {
  if (config.sendgridApiKey) return 'sendgrid';
  if (config.resendApiKey) return 'resend';
  if (config.smtpHost) return 'smtp';
  return 'log';
}

// 默认导出
export default createEmailSender;
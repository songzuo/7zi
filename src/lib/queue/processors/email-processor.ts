import { Job } from 'bull';
import { logger } from '../../logger';
import { QueueName } from '../queue-manager';

/**
 * Email job data structure
 */
export interface EmailJobData {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  from?: string;
  replyTo?: string;
}

/**
 * Simulated email service
 * In production, this would integrate with a real email service like SendGrid, AWS SES, etc.
 */
class EmailService {
  /**
   * Send an email
   */
  async send(data: EmailJobData): Promise<{ messageId: string }> {
    // Simulate email sending delay
    await this.delay(100 + Math.random() * 200);

    // Validate email
    if (!this.isValidEmail(data.to)) {
      throw new Error(`Invalid email address: ${data.to}`);
    }

    logger.info('[EmailService] Sending email', {
      to: data.to,
      subject: data.subject,
      from: data.from || 'noreply@7zi.com',
    });

    // In production, integrate with actual email service here
    // For now, simulate success
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('[EmailService] Email sent successfully', { messageId });

    return { messageId };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Simulate delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const emailService = new EmailService();

/**
 * Email processor function
 * Processes email jobs from the email queue
 */
export async function emailProcessor(job: Job<EmailJobData>): Promise<void> {
  const { data } = job;

  logger.info(`[EmailProcessor] Processing job`, {
    jobId: job.id,
    to: data.to,
    subject: data.subject,
  });

  try {
    // Validate job data
    if (!data.to || !data.subject) {
      throw new Error('Missing required fields: to and subject');
    }

    // Update job progress
    // await job.updateProgress(10);

    // Send email
    // await job.updateProgress(50);
    const result = await emailService.send(data);

    // await job.updateProgress(100);

    logger.info(`[EmailProcessor] Email sent successfully`, {
      jobId: job.id,
      messageId: result.messageId,
      to: data.to,
    });

    return;
  } catch (error: any) {
    logger.error(`[EmailProcessor] Failed to send email`, {
      jobId: job.id,
      error: error.message,
      data,
    });

    // Throw error so Bull can handle retries
    throw error;
  }
}

/**
 * Email job builder
 * Helper function to create email jobs with default values
 */
export function createEmailJob(data: Partial<EmailJobData>): EmailJobData {
  return {
    from: 'noreply@7zi.com',
    ...data,
  } as EmailJobData;
}

/**
 * Batch email processor
 * Process multiple emails in a single job
 */
export interface BatchEmailJobData {
  emails: EmailJobData[];
}

export async function batchEmailProcessor(job: Job<BatchEmailJobData>): Promise<void> {
  const { data } = job;

  logger.info(`[BatchEmailProcessor] Processing batch of ${data.emails.length} emails`, {
    jobId: job.id,
  });

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; error: string }>,
  };

  for (let i = 0; i < data.emails.length; i++) {
    const emailData = data.emails[i];

    try {
      await emailService.send(emailData);
      results.sent++;

      // Update progress
      // await job.updateProgress(((i + 1) / data.emails.length) * 100);
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        email: emailData.to,
        error: error.message,
      });

      logger.warn(`[BatchEmailProcessor] Failed to send email`, {
        to: emailData.to,
        error: error.message,
      });
    }
  }

  logger.info(`[BatchEmailProcessor] Batch completed`, {
    jobId: job.id,
    results,
  });

  // If any emails failed, throw an error
  if (results.failed > 0) {
    throw new Error(`Batch completed with ${results.failed} failures`);
  }
}

/**
 * Template email processor
 * Process email using templates
 */
export interface TemplateEmailJobData extends EmailJobData {
  template: string;
  templateData: Record<string, any>;
}

export async function templateEmailProcessor(
  job: Job<TemplateEmailJobData>
): Promise<void> {
  const { data } = job;

  logger.info(`[TemplateEmailProcessor] Processing template email`, {
    jobId: job.id,
    template: data.template,
    to: data.to,
  });

  try {
    // In production, render template here
    // For now, use provided html or text
    // await job.updateProgress(50);

    const emailData: EmailJobData = {
      ...data,
      html: data.html || '', // TODO: Implement template rendering
    };

    await emailService.send(emailData);

    // await job.updateProgress(100);

    logger.info(`[TemplateEmailProcessor] Template email sent successfully`, {
      jobId: job.id,
      template: data.template,
      to: data.to,
    });
  } catch (error: any) {
    logger.error(`[TemplateEmailProcessor] Failed to send template email`, {
      jobId: job.id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Simple template renderer (for demo purposes)
 * In production, use a proper template engine like Handlebars, EJS, etc.
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let html = template;

  // Simple variable replacement
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    html = html.replace(regex, String(data[key]));
  });

  return html;
}

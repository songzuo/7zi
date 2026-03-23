/**
 * Email Queue Example
 * Demonstrates how to use the Bull email queue for sending emails
 */

import { queueManager, QueueName } from '../queue-manager';
import { emailProcessor, createEmailJob, BatchEmailJobData, batchEmailProcessor } from '../processors/email-processor';
import { logger } from '../../logger';

/**
 * Example 1: Send a single email
 */
export async function sendSingleEmail(): Promise<void> {
  try {
    // Create email job data
    const emailJob = createEmailJob({
      to: 'user@example.com',
      subject: 'Welcome to 7zi!',
      html: `
        <h1>Welcome!</h1>
        <p>Thank you for signing up for 7zi.</p>
        <p>We're excited to have you on board!</p>
      `,
    });

    // Add job to email queue
    const job = await queueManager.addJob(QueueName.EMAIL, emailJob);

    logger.info('[EmailQueueExample] Single email queued', {
      jobId: job.id,
      to: emailJob.to,
      subject: emailJob.subject,
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to queue single email:', error);
    throw error;
  }
}

/**
 * Example 2: Send multiple emails
 */
export async function sendMultipleEmails(): Promise<void> {
  const recipients = [
    { to: 'user1@example.com', name: 'User 1' },
    { to: 'user2@example.com', name: 'User 2' },
    { to: 'user3@example.com', name: 'User 3' },
  ];

  try {
    // Queue multiple email jobs
    const jobs = await Promise.all(
      recipients.map((recipient) =>
        queueManager.addJob(
          QueueName.EMAIL,
          createEmailJob({
            to: recipient.to,
            subject: `Hello, ${recipient.name}!`,
            html: `<p>Hi ${recipient.name},</p><p>This is a test email from 7zi.</p>`,
          })
        )
      )
    );

    logger.info('[EmailQueueExample] Multiple emails queued', {
      count: jobs.length,
      jobIds: jobs.map((j) => j.id),
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to queue multiple emails:', error);
    throw error;
  }
}

/**
 * Example 3: Send a batch of emails in a single job
 */
export async function sendBatchEmails(): Promise<void> {
  const batchData: BatchEmailJobData = {
    emails: [
      {
        to: 'batch1@example.com',
        subject: 'Batch Email Test',
        html: '<p>This is batch email 1</p>',
      },
      {
        to: 'batch2@example.com',
        subject: 'Batch Email Test',
        html: '<p>This is batch email 2</p>',
      },
      {
        to: 'batch3@example.com',
        subject: 'Batch Email Test',
        html: '<p>This is batch email 3</p>',
      },
    ],
  };

  try {
    const job = await queueManager.addJob(QueueName.EMAIL, batchData, {
      // You can specify a custom processor for batch jobs
      // This would need to be configured separately
    });

    logger.info('[EmailQueueExample] Batch emails queued', {
      jobId: job.id,
      count: batchData.emails.length,
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to queue batch emails:', error);
    throw error;
  }
}

/**
 * Example 4: Send email with delay
 */
export async function sendDelayedEmail(): Promise<void> {
  try {
    const emailJob = createEmailJob({
      to: 'delayed@example.com',
      subject: 'Delayed Email',
      html: '<p>This email was sent after a delay</p>',
    });

    // Add job with 10 second delay
    const job = await queueManager.addJob(QueueName.EMAIL, emailJob, {
      delay: 10000, // 10 seconds
    });

    logger.info('[EmailQueueExample] Delayed email queued', {
      jobId: job.id,
      delay: 10000,
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to queue delayed email:', error);
    throw error;
  }
}

/**
 * Example 5: Send email with custom options
 */
export async function sendEmailWithOptions(): Promise<void> {
  try {
    const emailJob = createEmailJob({
      to: 'custom@example.com',
      subject: 'Custom Options Email',
      html: '<p>This email has custom options</p>',
    });

    const job = await queueManager.addJob(QueueName.EMAIL, emailJob, {
      // Higher priority
      priority: 10,
      // Custom job ID for tracking
      jobId: `custom_${Date.now()}`,
      // Add custom metadata
      ...emailJob,
    });

    logger.info('[EmailQueueExample] Email with custom options queued', {
      jobId: job.id,
      priority: 10,
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to queue email with options:', error);
    throw error;
  }
}

/**
 * Example 6: Monitor queue statistics
 */
export async function monitorEmailQueue(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> {
  try {
    const stats = await queueManager.getQueueStats(QueueName.EMAIL);

    logger.info('[EmailQueueExample] Email queue statistics', stats);

    return stats;
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to get queue statistics:', error);
    throw error;
  }
}

/**
 * Example 7: Check job status
 */
export async function checkJobStatus(jobId: string): Promise<void> {
  try {
    const queue = queueManager.getQueue(QueueName.EMAIL);

    if (!queue) {
      throw new Error('Email queue not found');
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      logger.warn('[EmailQueueExample] Job not found', { jobId });
      return;
    }

    const state = await job.getState();

    logger.info('[EmailQueueExample] Job status', {
      jobId,
      state,
      data: job.data,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to check job status:', error);
    throw error;
  }
}

/**
 * Example 8: Initialize and start email queue processor
 */
export async function startEmailQueueProcessor(): Promise<void> {
  try {
    // Process email jobs with concurrency of 5
    await queueManager.processQueue(QueueName.EMAIL, emailProcessor, 5);

    logger.info('[EmailQueueExample] Email queue processor started', {
      concurrency: 5,
    });
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to start email queue processor:', error);
    throw error;
  }
}

/**
 * Example 9: Pause and resume email queue
 */
export async function pauseAndResumeEmailQueue(): Promise<void> {
  try {
    // Pause the queue
    await queueManager.pauseQueue(QueueName.EMAIL);
    logger.info('[EmailQueueExample] Email queue paused');

    // Wait for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Resume the queue
    await queueManager.resumeQueue(QueueName.EMAIL);
    logger.info('[EmailQueueExample] Email queue resumed');
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to pause/resume email queue:', error);
    throw error;
  }
}

/**
 * Main example runner
 */
export async function runEmailQueueExamples(): Promise<void> {
  try {
    logger.info('[EmailQueueExample] Starting email queue examples...');

    // Example 1: Send single email
    await sendSingleEmail();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Example 2: Send multiple emails
    await sendMultipleEmails();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Example 3: Send batch emails
    await sendBatchEmails();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Example 4: Send delayed email
    await sendDelayedEmail();

    // Example 5: Send email with options
    await sendEmailWithOptions();

    // Example 6: Monitor queue
    await monitorEmailQueue();

    logger.info('[EmailQueueExample] All email queue examples completed');
  } catch (error) {
    logger.error('[EmailQueueExample] Failed to run examples:', error);
    throw error;
  }
}

/**
 * Usage in API routes or services
 *
 * Example API route:
 *
 * ```typescript
 * import { NextApiRequest, NextApiResponse } from 'next';
 * import { queueManager, QueueName } from '@/lib/queue/queue-manager';
 * import { createEmailJob } from '@/lib/queue/processors/email-processor';
 *
 * export default async function handler(
 *   req: NextApiRequest,
 *   res: NextApiResponse
 * ) {
 *   if (req.method !== 'POST') {
 *     return res.status(405).json({ error: 'Method not allowed' });
 *   }
 *
 *   const { to, subject, html } = req.body;
 *
 *   try {
 *     const job = await queueManager.addJob(
 *       QueueName.EMAIL,
 *       createEmailJob({ to, subject, html })
 *     );
 *
 *     return res.status(200).json({
 *       success: true,
 *       jobId: job.id,
 *       message: 'Email queued successfully',
 *     });
 *   } catch (error) {
 *     return res.status(500).json({
 *       success: false,
 *       error: 'Failed to queue email',
 *     });
 *   }
 * }
 * ```
 */

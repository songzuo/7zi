/**
 * Backup Scheduler Module
 * Handles automated backup scheduling
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { createBackup, deleteBackup, listBackups } from './backup-core';
import { BackupConfig, BackupJob, BackupFrequency, BackupStatus, BackupEventType, BackupEvent } from './types';
import fs from 'fs/promises';
import path from 'path';

const SCHEDULES_FILE = path.join(process.cwd(), 'backups', 'schedules.json');
const JOBS_FILE = path.join(process.cwd(), 'backups', 'jobs.json');
const EVENTS_FILE = path.join(process.cwd(), 'backups', 'events.json');

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    await fs.mkdir(backupsDir, { recursive: true });
  } catch (_error) {
    logger.error('Failed to create backup directory', error);
    throw error;
  }
}

/**
 * Get all backup schedules
 */
export async function getScheduledBackups(): Promise<BackupConfig[]> {
  try {
    await ensureBackupDir();

    try {
      const content = await fs.readFile(SCHEDULES_FILE, 'utf-8');
      const schedules = JSON.parse(content) as BackupConfig[];
      return schedules;
    } catch {
      return [];
    }
  } catch (_error) {
    logger.error('Failed to get scheduled backups', error);
    return [];
  }
}

/**
 * Get all backup jobs
 */
async function getJobs(): Promise<BackupJob[]> {
  try {
    try {
      const content = await fs.readFile(JOBS_FILE, 'utf-8');
      const jobs = JSON.parse(content) as BackupJob[];
      return jobs;
    } catch {
      return [];
    }
  } catch (_error) {
    logger.error('Failed to get backup jobs', error);
    return [];
  }
}

/**
 * Save backup schedules
 */
async function saveSchedules(schedules: BackupConfig[]): Promise<void> {
  await ensureBackupDir();
  await fs.writeFile(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf-8');
}

/**
 * Save backup jobs
 */
async function saveJobs(jobs: BackupJob[]): Promise<void> {
  await ensureBackupDir();
  await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
}

/**
 * Record backup event
 */
async function recordEvent(event: BackupEvent): Promise<void> {
  try {
    await ensureBackupDir();

    let events: BackupEvent[] = [];

    try {
      const content = await fs.readFile(EVENTS_FILE, 'utf-8');
      events = JSON.parse(content) as BackupEvent[];
    } catch {
      // File doesn't exist or is invalid, start fresh
    }

    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events = events.slice(-1000);
    }

    await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (_error) {
    logger.error('Failed to record backup event', error);
  }
}

/**
 * Create a backup schedule
 */
export async function scheduleBackup(config: Omit<BackupConfig, 'id'>): Promise<BackupConfig> {
  const schedules = await getScheduledBackups();

  const newConfig: BackupConfig = {
    id: uuidv4(),
    ...config,
    lastRunAt: undefined,
    nextRunAt: calculateNextRun(config.frequency),
  };

  schedules.push(newConfig);
  await saveSchedules(schedules);

  await recordEvent({
    type: BackupEventType.SCHEDULE_CREATED,
    timestamp: new Date().toISOString(),
    data: {
      scheduleId: newConfig.id,
      metadata: {
        name: newConfig.name,
        frequency: newConfig.frequency,
        retentionDays: newConfig.retentionDays,
      },
    },
  });

  logger.info(`Backup schedule created: ${newConfig.name}`, {
    category: 'backup',
    scheduleId: newConfig.id,
    frequency: newConfig.frequency,
  });

  return newConfig;
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency: BackupFrequency): string {
  const now = new Date();

  switch (frequency) {
    case BackupFrequency.DAILY:
      now.setDate(now.getDate() + 1);
      now.setHours(2, 0, 0, 0); // 2:00 AM
      break;

    case BackupFrequency.WEEKLY:
      now.setDate(now.getDate() + 7);
      now.setHours(2, 0, 0, 0); // 2:00 AM
      break;

    case BackupFrequency.MONTHLY:
      now.setMonth(now.getMonth() + 1);
      now.setDate(1);
      now.setHours(2, 0, 0, 0); // 2:00 AM on 1st of month
      break;

    case BackupFrequency.MANUAL:
    default:
      // Manual backups don't have a next run time
      return '';
  }

  return now.toISOString();
}

/**
 * Cancel a backup schedule
 */
export async function cancelScheduledBackup(scheduleId: string): Promise<boolean> {
  const schedules = await getScheduledBackups();
  const index = schedules.findIndex((s) => s.id === scheduleId);

  if (index === -1) {
    return false;
  }

  const removed = schedules.splice(index, 1)[0];
  await saveSchedules(schedules);

  await recordEvent({
    type: BackupEventType.SCHEDULE_DELETED,
    timestamp: new Date().toISOString(),
    data: {
      scheduleId,
      metadata: {
        name: removed.name,
      },
    },
  });

  logger.info(`Backup schedule cancelled: ${removed.name}`, {
    category: 'backup',
    scheduleId,
  });

  return true;
}

/**
 * Update a backup schedule
 */
export async function updateBackupSchedule(
  scheduleId: string,
  updates: Partial<BackupConfig>
): Promise<BackupConfig | null> {
  const schedules = await getScheduledBackups();
  const index = schedules.findIndex((s) => s.id === scheduleId);

  if (index === -1) {
    return null;
  }

  const schedule = schedules[index];
  const updated: BackupConfig = {
    ...schedule,
    ...updates,
    // Recalculate next run if frequency changed
    nextRunAt: updates.frequency ? calculateNextRun(updates.frequency) : schedule.nextRunAt,
  };

  schedules[index] = updated;
  await saveSchedules(schedules);

  logger.info(`Backup schedule updated: ${updated.name}`, {
    category: 'backup',
    scheduleId,
  });

  return updated;
}

/**
 * Run all scheduled backups that are due
 */
export async function runScheduledBackups(): Promise<BackupJob[]> {
  const schedules = await getScheduledBackups();
  const now = new Date();
  const jobs: BackupJob[] = [];

  for (const schedule of schedules) {
    if (!schedule.enabled) {
      continue;
    }

    // Check if it's time to run
    if (schedule.nextRunAt && new Date(schedule.nextRunAt) <= now) {
      const job = await executeBackupSchedule(schedule);
      jobs.push(job);
    }
  }

  return jobs;
}

/**
 * Execute a single backup schedule
 */
async function executeBackupSchedule(schedule: BackupConfig): Promise<BackupJob> {
  const job: BackupJob = {
    id: uuidv4(),
    configId: schedule.id,
    scheduledAt: schedule.nextRunAt || new Date().toISOString(),
    status: BackupStatus.RUNNING,
    startedAt: new Date().toISOString(),
  };

  try {
    // Save job as running
    const jobs = await getJobs();
    jobs.push(job);
    await saveJobs(jobs);

    logger.info(`Starting scheduled backup: ${schedule.name}`, {
      category: 'backup',
      scheduleId: schedule.id,
      jobId: job.id,
    });

    // Create backup
    const backup = await createBackup({
      compression: schedule.compression,
      encryption: schedule.encryption && schedule.encryptionKey ? {
        algorithm: schedule.encryption,
        key: schedule.encryptionKey,
      } : undefined,
      tables: schedule.tables,
    });

    // Update job as completed
    job.status = BackupStatus.COMPLETED;
    job.completedAt = new Date().toISOString();
    job.backupId = backup.id;

    // Update schedule next run time
    const schedules = await getScheduledBackups();
    const scheduleIndex = schedules.findIndex((s) => s.id === schedule.id);
    if (scheduleIndex !== -1) {
      schedules[scheduleIndex].lastRunAt = job.startedAt;
      schedules[scheduleIndex].nextRunAt = calculateNextRun(schedule.frequency);
      await saveSchedules(schedules);
    }

    // Clean up old backups based on retention policy
    await cleanupOldBackups(schedule.retentionDays);

    logger.info(`Scheduled backup completed: ${schedule.name}`, {
      category: 'backup',
      scheduleId: schedule.id,
      jobId: job.id,
      backupId: backup.id,
    });

  } catch (_error) {
    job.status = BackupStatus.FAILED;
    job.completedAt = new Date().toISOString();
    job.error = error instanceof Error ? error.message : String(error);

    logger.error(`Scheduled backup failed: ${schedule.name}`, error, {
      category: 'backup',
      scheduleId: schedule.id,
      jobId: job.id,
    });
  } finally {
    // Update job status
    const jobs = await getJobs();
    const jobIndex = jobs.findIndex((j) => j.id === job.id);
    if (jobIndex !== -1) {
      jobs[jobIndex] = job;
      await saveJobs(jobs);
    }
  }

  return job;
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups(retentionDays: number): Promise<void> {
  if (retentionDays <= 0) {
    return; // No cleanup needed
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const backups = await listBackups();

  for (const backup of backups) {
    const backupDate = new Date(backup.createdAt);
    if (backupDate < cutoffDate) {
      logger.info(`Deleting old backup: ${backup.filename}`, {
        category: 'backup',
        backupId: backup.id,
        age: Math.floor((Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24)),
      });

      await deleteBackup(backup.id);
    }
  }
}

/**
 * Get backup job history
 */
export async function getBackupJobs(limit: number = 50): Promise<BackupJob[]> {
  const jobs = await getJobs();
  return jobs
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, limit);
}

/**
 * Get jobs for a specific schedule
 */
export async function getJobsForSchedule(scheduleId: string): Promise<BackupJob[]> {
  const jobs = await getJobs();
  return jobs
    .filter((j) => j.configId === scheduleId)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}

/**
 * Manually trigger a backup for a schedule
 */
export async function triggerBackup(scheduleId: string): Promise<BackupJob | null> {
  const schedules = await getScheduledBackups();
  const schedule = schedules.find((s) => s.id === scheduleId);

  if (!schedule) {
    return null;
  }

  return executeBackupSchedule(schedule);
}

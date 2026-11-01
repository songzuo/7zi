/**
 * Backup Scheduler Module
 * Handles automated backup scheduling
 */

import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger'
import { createBackup, deleteBackup, listBackups } from './backup-core'
import {
  BackupConfig,
  BackupJob,
  BackupFrequency,
  BackupStatus,
  BackupEventType,
  BackupEvent,
} from './types'
import fs from 'fs/promises'
import path from 'path'
import { getBackupDir } from './paths'

/**
 * 进程内互斥锁：保护 schedules.json / jobs.json 的 "读-改-写" 事务。
 *
 * 之前 scheduleBackup / executeBackupSchedule 都是
 * `getXxx()` -> 修改数组 -> `saveXxx()`，并发调用时后写的会覆盖先写的
 * （经典 lost update）：并发建 5 个 schedule 只剩 1 个，
 * 并发 trigger 3 次只记录 1 个 job。
 *
 * 用 Promise 链当队列，保证同一时刻只有一个写事务在跑。
 */
let writeQueue: Promise<unknown> = Promise.resolve()

/**
 * 在互斥锁内执行一个读-改-写事务
 */
async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn)
  // 链上吞掉错误，避免一次失败阻塞后续队列
  writeQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(getBackupDir(), { recursive: true })
  } catch (error) {
    logger.error('Failed to create backup directory', error)
    throw error
  }
}

/**
 * Get all backup schedules
 */
export async function getScheduledBackups(): Promise<BackupConfig[]> {
  try {
    await ensureBackupDir()

    try {
      const content = await fs.readFile(path.join(getBackupDir(), 'schedules.json'), 'utf-8')
      const schedules = JSON.parse(content) as BackupConfig[]
      return Array.isArray(schedules) ? schedules : []
    } catch (error) {
      return []
    }
  } catch (error) {
    logger.error('Failed to get scheduled backups', error)
    return []
  }
}

/**
 * Get all backup jobs
 */
async function getJobs(): Promise<BackupJob[]> {
  try {
    try {
      const content = await fs.readFile(path.join(getBackupDir(), 'jobs.json'), 'utf-8')
      const jobs = JSON.parse(content) as BackupJob[]
      return Array.isArray(jobs) ? jobs : []
    } catch (error) {
      return []
    }
  } catch (error) {
    logger.error('Failed to get backup jobs', error)
    return []
  }
}

/**
 * Save backup schedules
 */
async function saveSchedules(schedules: BackupConfig[]): Promise<void> {
  await ensureBackupDir()
  await fs.writeFile(
    path.join(getBackupDir(), 'schedules.json'),
    JSON.stringify(schedules, null, 2),
    'utf-8'
  )
}

/**
 * Save backup jobs
 */
async function saveJobs(jobs: BackupJob[]): Promise<void> {
  await ensureBackupDir()
  await fs.writeFile(
    path.join(getBackupDir(), 'jobs.json'),
    JSON.stringify(jobs, null, 2),
    'utf-8'
  )
}

/**
 * Record backup event
 */
async function recordEvent(event: BackupEvent): Promise<void> {
  try {
    await ensureBackupDir()

    let events: BackupEvent[] = []
    const eventsFile = path.join(getBackupDir(), 'events.json')

    try {
      const content = await fs.readFile(eventsFile, 'utf-8')
      const parsed = JSON.parse(content) as BackupEvent[]
      events = Array.isArray(parsed) ? parsed : []
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }

    events.push(event)

    // Keep only last 1000 events
    if (events.length > 1000) {
      events = events.slice(-1000)
    }

    await fs.writeFile(eventsFile, JSON.stringify(events, null, 2), 'utf-8')
  } catch (error) {
    logger.error('Failed to record backup event', error)
  }
}

/**
 * Create a backup schedule
 */
export async function scheduleBackup(config: Omit<BackupConfig, 'id'>): Promise<BackupConfig> {
  const newConfig: BackupConfig = {
    id: uuidv4(),
    ...config,
    lastRunAt: undefined,
    nextRunAt: calculateNextRun(config.frequency),
  }

  await withWriteLock(async () => {
    const schedules = await getScheduledBackups()
    schedules.push(newConfig)
    await saveSchedules(schedules)
  })

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
  })

  logger.info(`Backup schedule created: ${newConfig.name}`, {
    category: 'backup',
    scheduleId: newConfig.id,
    frequency: newConfig.frequency,
  })

  return newConfig
}

/**
 * Calculate next run time based on frequency
 */
function calculateNextRun(frequency: BackupFrequency): string {
  const now = new Date()

  switch (frequency) {
    case BackupFrequency.DAILY:
      now.setDate(now.getDate() + 1)
      now.setHours(2, 0, 0, 0) // 2:00 AM
      break

    case BackupFrequency.WEEKLY:
      now.setDate(now.getDate() + 7)
      now.setHours(2, 0, 0, 0) // 2:00 AM
      break

    case BackupFrequency.MONTHLY:
      now.setMonth(now.getMonth() + 1)
      now.setDate(1)
      now.setHours(2, 0, 0, 0) // 2:00 AM on 1st of month
      break

    case BackupFrequency.MANUAL:
    default:
      // Manual backups don't have a next run time
      return ''
  }

  return now.toISOString()
}

/**
 * Cancel a backup schedule
 */
export async function cancelScheduledBackup(scheduleId: string): Promise<boolean> {
  const removed = await withWriteLock(async () => {
    const schedules = await getScheduledBackups()
    const index = schedules.findIndex(s => s.id === scheduleId)

    if (index === -1) {
      return null
    }

    const removed = schedules.splice(index, 1)[0]
    await saveSchedules(schedules)
    return removed
  })

  if (!removed) {
    return false
  }

  await recordEvent({
    type: BackupEventType.SCHEDULE_DELETED,
    timestamp: new Date().toISOString(),
    data: {
      scheduleId,
      metadata: {
        name: removed.name,
      },
    },
  })

  logger.info(`Backup schedule cancelled: ${removed.name}`, {
    category: 'backup',
    scheduleId,
  })

  return true
}

/**
 * Update a backup schedule
 */
export async function updateBackupSchedule(
  scheduleId: string,
  updates: Partial<BackupConfig>
): Promise<BackupConfig | null> {
  const updated = await withWriteLock(async () => {
    const schedules = await getScheduledBackups()
    const index = schedules.findIndex(s => s.id === scheduleId)

    if (index === -1) {
      return null
    }

    const schedule = schedules[index]
    const next: BackupConfig = {
      ...schedule,
      ...updates,
      // Recalculate next run only if the frequency changed.
      // 之前无条件取 `schedule.nextRunAt`，导致显式传入的 nextRunAt 更新被吞掉 ——
      // 调用方改不动下次执行时间，runScheduledBackups 也就永远不会到期。
      nextRunAt: updates.frequency
        ? calculateNextRun(updates.frequency)
        : updates.nextRunAt !== undefined
          ? updates.nextRunAt
          : schedule.nextRunAt,
    }

    schedules[index] = next
    await saveSchedules(schedules)
    return next
  })

  if (!updated) {
    return null
  }

  logger.info(`Backup schedule updated: ${updated.name}`, {
    category: 'backup',
    scheduleId,
  })

  return updated
}

/**
 * Run all scheduled backups that are due
 */
export async function runScheduledBackups(): Promise<BackupJob[]> {
  const schedules = await getScheduledBackups()
  const now = new Date()
  const jobs: BackupJob[] = []

  for (const schedule of schedules) {
    if (!schedule.enabled) {
      continue
    }

    // Check if it's time to run
    if (schedule.nextRunAt && new Date(schedule.nextRunAt) <= now) {
      const job = await executeBackupSchedule(schedule)
      jobs.push(job)
    }
  }

  return jobs
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
  }

  try {
    // Save job as running（读-改-写必须在锁内，否则并发 trigger 会丢 job）
    await withWriteLock(async () => {
      const jobs = await getJobs()
      jobs.push(job)
      await saveJobs(jobs)
    })

    logger.info(`Starting scheduled backup: ${schedule.name}`, {
      category: 'backup',
      scheduleId: schedule.id,
      jobId: job.id,
    })

    // Create backup
    const backup = await createBackup({
      compression: schedule.compression,
      encryption:
        schedule.encryption && schedule.encryptionKey
          ? {
              algorithm: schedule.encryption,
              key: schedule.encryptionKey,
            }
          : undefined,
      tables: schedule.tables,
    })

    // Update job as completed
    job.status = BackupStatus.COMPLETED
    job.completedAt = new Date().toISOString()
    job.backupId = backup.id

    // Update schedule next run time
    const schedules = await getScheduledBackups()
    const scheduleIndex = schedules.findIndex(s => s.id === schedule.id)
    if (scheduleIndex !== -1) {
      schedules[scheduleIndex].lastRunAt = job.startedAt
      schedules[scheduleIndex].nextRunAt = calculateNextRun(schedule.frequency)
      await saveSchedules(schedules)
    }

    // Clean up old backups based on retention policy
    await cleanupOldBackups(schedule.retentionDays)

    logger.info(`Scheduled backup completed: ${schedule.name}`, {
      category: 'backup',
      scheduleId: schedule.id,
      jobId: job.id,
      backupId: backup.id,
    })
  } catch (error) {
    job.status = BackupStatus.FAILED
    job.completedAt = new Date().toISOString()
    job.error = error instanceof Error ? error.message : String(error)

    logger.error(`Scheduled backup failed: ${schedule.name}`, error, {
      category: 'backup',
      scheduleId: schedule.id,
      jobId: job.id,
    })
  } finally {
    // Update job status
    await withWriteLock(async () => {
      const jobs = await getJobs()
      const jobIndex = jobs.findIndex(j => j.id === job.id)
      if (jobIndex !== -1) {
        jobs[jobIndex] = job
        await saveJobs(jobs)
      }
    })
  }

  return job
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups(retentionDays: number): Promise<void> {
  if (retentionDays <= 0) {
    return // No cleanup needed
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  const backups = await listBackups()

  for (const backup of backups) {
    const backupDate = new Date(backup.createdAt)
    if (backupDate < cutoffDate) {
      logger.info(`Deleting old backup: ${backup.filename}`, {
        category: 'backup',
        backupId: backup.id,
        age: Math.floor((Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24)),
      })

      await deleteBackup(backup.id)
    }
  }
}

/**
 * Get backup job history
 */
export async function getBackupJobs(limit: number = 50): Promise<BackupJob[]> {
  const jobs = await getJobs()

  // 主排序键：scheduledAt 倒序（新的在前）。
  // 次排序键：scheduledAt 完全相同时（例如 fake timers 让多次 trigger 落在
  // 同一毫秒），用原始写入顺序 —— 后写入的（更新的）排前面。
  // 否则同刻创建的 job 顺序不确定，"新 job 在前" 的断言会随机挂。
  const indexed = jobs.map((job, index) => ({ job, index }))
  indexed.sort((a, b) => {
    const byScheduled =
      new Date(b.job.scheduledAt).getTime() - new Date(a.job.scheduledAt).getTime()
    if (byScheduled !== 0) return byScheduled
    return b.index - a.index
  })

  return indexed.slice(0, limit).map(entry => entry.job)
}

/**
 * Get jobs for a specific schedule
 */
export async function getJobsForSchedule(scheduleId: string): Promise<BackupJob[]> {
  const jobs = await getJobs()
  return jobs
    .filter(j => j.configId === scheduleId)
    .sort((a, b) => {
      const byScheduled = new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      if (byScheduled !== 0) return byScheduled
      // 同刻创建的 job：后写入的排前面（与 getBackupJobs 保持一致）
      return jobs.indexOf(b) - jobs.indexOf(a)
    })
}

/**
 * Manually trigger a backup for a schedule
 */
export async function triggerBackup(scheduleId: string): Promise<BackupJob | null> {
  const schedules = await getScheduledBackups()
  const schedule = schedules.find(s => s.id === scheduleId)

  if (!schedule) {
    return null
  }

  return executeBackupSchedule(schedule)
}

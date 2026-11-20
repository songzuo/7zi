/**
 * Backup 域边界用例
 *
 * 覆盖：不存在的 id、损坏/非法元数据、空目录与排序、统计与列表一致性、
 * 损坏归档的恢复报错、加密/压缩的空输入与错误路径、调度器空态与并发。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

import {
  createBackup,
  listBackups,
  getBackup,
  deleteBackup,
  restoreBackup,
  getBackupStatistics,
} from '../backup-core'
import {
  getScheduledBackups,
  scheduleBackup,
  cancelScheduledBackup,
  updateBackupSchedule,
  runScheduledBackups,
  getBackupJobs,
  getJobsForSchedule,
  triggerBackup,
} from '../scheduler'
import {
  exportData,
  listExports,
  deleteExport,
  importData,
} from '../data-export'
import {
  compressBackup,
  decompressBackup,
  calculateCompressionRatio,
  estimateCompressedSize,
} from '../compression'
import {
  encryptBackup,
  decryptBackup,
  generateEncryptionKey,
  validateEncryptionKey,
  hashPassword,
  verifyPassword,
} from '../encryption'
import {
  BackupStatus,
  BackupFrequency,
  CompressionAlgorithm,
  EncryptionAlgorithm,
  ExportFormat,
} from '../types'
import { setupIsolatedDirs, IsolatedDirs } from './helpers'

/**
 * 写一个"合法格式但内容非法"的元数据侧车文件
 */
async function writeSidecar(
  dir: string,
  id: string,
  metadata: unknown,
  suffix = ''
): Promise<string> {
  const filename = `${id}.json${suffix}`
  await fs.writeFile(
    path.join(dir, filename),
    JSON.stringify({ metadata, data: {} }),
    'utf-8'
  )
  await fs.writeFile(
    path.join(dir, `${id}.metadata.json`),
    typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
    'utf-8'
  )
  return filename
}

const VALID_METADATA = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  filename: 'aaaaaaaa-1111-2222-3333-444444444444.json',
  version: '2.0.0',
  createdAt: '2026-03-21T10:00:00.000Z',
  updatedAt: '2026-03-21T10:00:00.000Z',
  sizeInBytes: 100,
  sizeInMB: 0.0001,
  compression: CompressionAlgorithm.NONE,
  encryption: EncryptionAlgorithm.NONE,
  checksum: 'a'.repeat(64),
  status: BackupStatus.COMPLETED,
  tables: ['users'],
  recordCounts: { users: 2 },
}

describe('Backup boundary cases', () => {
  let dirs: IsolatedDirs

  beforeEach(async () => {
    dirs = await setupIsolatedDirs('boundary')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'))
  })

  afterEach(async () => {
    vi.useRealTimers()
    await dirs.cleanup()
  })

  // ------------------------------------------------------------------
  // listBackups —— 空目录、非法元数据、辅助文件排除
  // ------------------------------------------------------------------
  describe('listBackups boundary', () => {
    it('returns empty array when the backup directory does not exist yet', async () => {
      const missing = path.join(dirs.backupDir, 'does-not-exist')
      process.env.BACKUP_DIR = missing

      const backups = await listBackups()

      expect(backups).toEqual([])
      // 目录应被自动创建
      await expect(fs.stat(missing)).resolves.toBeDefined()
    })

    it('ignores auxiliary files (events/jobs/schedules) in the backup directory', async () => {
      await fs.writeFile(path.join(dirs.backupDir, 'events.json'), '[]', 'utf-8')
      await fs.writeFile(path.join(dirs.backupDir, 'jobs.json'), '[]', 'utf-8')
      await fs.writeFile(path.join(dirs.backupDir, 'schedules.json'), '[]', 'utf-8')

      const backups = await listBackups()

      expect(backups).toEqual([])
    })

    it('ignores metadata sidecar files as standalone backups', async () => {
      await fs.writeFile(
        path.join(dirs.backupDir, 'aaaaaaaa-1111-2222-3333-444444444444.metadata.json'),
        JSON.stringify(VALID_METADATA),
        'utf-8'
      )

      const backups = await listBackups()

      expect(backups).toEqual([])
    })

    it('skips backups whose metadata sidecar is not valid JSON', async () => {
      await fs.writeFile(path.join(dirs.backupDir, 'broken.json'), '{"metadata":{}}', 'utf-8')
      await fs.writeFile(path.join(dirs.backupDir, 'broken.metadata.json'), '{not json', 'utf-8')

      const backups = await listBackups()

      expect(backups).toEqual([])
    })

    it('skips backups whose metadata is missing required fields', async () => {
      const { recordCounts, ...withoutRecordCounts } = VALID_METADATA
      await writeSidecar(dirs.backupDir, 'missing-recordcounts', withoutRecordCounts)
      await writeSidecar(dirs.backupDir, 'missing-id', { ...VALID_METADATA, id: undefined })
      await writeSidecar(dirs.backupDir, 'missing-createdat', { ...VALID_METADATA, createdAt: undefined })
      await writeSidecar(dirs.backupDir, 'bad-date', { ...VALID_METADATA, createdAt: 'not-a-date' })

      const backups = await listBackups()

      expect(backups).toEqual([])
    })

    it('sorts multiple backups by creation date, newest first', async () => {
      const first = await createBackup()
      vi.advanceTimersByTime(1000)
      const second = await createBackup()
      vi.advanceTimersByTime(1000)
      const third = await createBackup()

      const backups = await listBackups()

      expect(backups.map(b => b.id)).toEqual([third.id, second.id, first.id])
    })

    it('sorts backups by creation date even when the sidecar createdAt disagrees with insertion order', async () => {
      // 手工放两个备份，侧车里的 createdAt 决定顺序（而非目录枚举顺序）
      const older = { ...VALID_METADATA, id: 'older', createdAt: '2026-01-01T00:00:00.000Z' }
      const newer = { ...VALID_METADATA, id: 'newer', createdAt: '2026-06-01T00:00:00.000Z' }
      await writeSidecar(dirs.backupDir, 'older', older)
      await writeSidecar(dirs.backupDir, 'newer', newer)

      const backups = await listBackups()

      expect(backups.map(b => b.id)).toEqual(['newer', 'older'])
    })

    it('does not throw when the backup directory contains a subdirectory', async () => {
      await fs.mkdir(path.join(dirs.backupDir, 'nested.json'), { recursive: true })

      const backups = await listBackups()

      expect(Array.isArray(backups)).toBe(true)
    })
  })

  // ------------------------------------------------------------------
  // getBackup —— 不存在的 id、非法元数据、读取损坏归档
  // ------------------------------------------------------------------
  describe('getBackup boundary', () => {
    it('returns null for an empty backup id', async () => {
      expect(await getBackup('')).toBeNull()
    })

    it('returns null for a well-formed but unknown backup id', async () => {
      await createBackup()

      expect(await getBackup('11111111-9999-8888-7777-666666666666')).toBeNull()
    })

    it('returns null when the archive file is missing but metadata sidecar exists', async () => {
      await fs.writeFile(
        path.join(dirs.backupDir, 'ghost.metadata.json'),
        JSON.stringify(VALID_METADATA),
        'utf-8'
      )

      expect(await getBackup(VALID_METADATA.id)).toBeNull()
    })

    it('returns null when the archive content is corrupted', async () => {
      const id = 'corrupted-archive'
      await fs.writeFile(path.join(dirs.backupDir, `${id}.json`), '{not-json', 'utf-8')
      await fs.writeFile(
        path.join(dirs.backupDir, `${id}.metadata.json`),
        JSON.stringify({ ...VALID_METADATA, id }),
        'utf-8'
      )

      expect(await getBackup(id)).toBeNull()
    })

    it('exposes table data and system information in the payload', async () => {
      const created = await createBackup({ tables: ['users'] })

      const backup = await getBackup(created.id)

      expect(backup).not.toBeNull()
      expect(backup?.metadata.id).toBe(created.id)
      expect(backup?.data.data).toBeTypeOf('object')
      expect(backup?.data._system).toBeDefined()
      expect(backup?.data._system?.backupId).toBe(created.id)
      expect(backup?.data._system?.platform).toBe(process.platform)
    })

    it('returns null for an encrypted backup when no key can be supplied', async () => {
      const created = await createBackup({
        encryption: { algorithm: EncryptionAlgorithm.AES256GCM, key: 'x'.repeat(64) },
      })

      expect(await getBackup(created.id)).toBeNull()
    })
  })

  // ------------------------------------------------------------------
  // restoreBackup —— 不存在、损坏归档、dry run
  // ------------------------------------------------------------------
  describe('restoreBackup boundary', () => {
    it('fails with BACKUP_NOT_FOUND for an unknown backup id', async () => {
      const result = await restoreBackup({
        backupId: 'missing-backup-id',
        truncateTables: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('BACKUP_NOT_FOUND')
    })

    it('fails with BACKUP_NOT_FOUND for an empty backup id', async () => {
      const result = await restoreBackup({ backupId: '', truncateTables: false })

      expect(result.success).toBe(false)
      expect(result.error).toBe('BACKUP_NOT_FOUND')
    })

    it('fails with BACKUP_CORRUPTED when the archive is not valid JSON', async () => {
      const id = 'corrupt-restore'
      await fs.writeFile(path.join(dirs.backupDir, `${id}.json`), '{ this is not json', 'utf-8')
      await fs.writeFile(
        path.join(dirs.backupDir, `${id}.metadata.json`),
        JSON.stringify({ ...VALID_METADATA, id }),
        'utf-8'
      )

      const result = await restoreBackup({ backupId: id, truncateTables: false })

      expect(result.success).toBe(false)
      expect(result.error).toBe('BACKUP_CORRUPTED')
    })

    it('fails with BACKUP_CORRUPTED when the archive JSON has no metadata', async () => {
      const id = 'no-metadata-restore'
      await fs.writeFile(
        path.join(dirs.backupDir, `${id}.json`),
        JSON.stringify({ data: { users: [] } }),
        'utf-8'
      )
      await fs.writeFile(
        path.join(dirs.backupDir, `${id}.metadata.json`),
        JSON.stringify({ ...VALID_METADATA, id }),
        'utf-8'
      )

      const result = await restoreBackup({ backupId: id, truncateTables: false })

      expect(result.success).toBe(false)
      expect(result.error).toBe('BACKUP_CORRUPTED')
    })

    it('restores a gzip-compressed backup', async () => {
      const created = await createBackup({ compression: CompressionAlgorithm.GZIP })

      const result = await restoreBackup({ backupId: created.id, truncateTables: false })

      expect(result.success).toBe(true)
    })

    it('restores a brotli-compressed backup', async () => {
      const created = await createBackup({ compression: CompressionAlgorithm.BROTLI })

      const result = await restoreBackup({ backupId: created.id, truncateTables: false })

      expect(result.success).toBe(true)
    })

    it('does not modify anything in dry run mode', async () => {
      const created = await createBackup()

      const result = await restoreBackup({
        backupId: created.id,
        truncateTables: false,
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Dry run: Would restore backup')
    })
  })

  // ------------------------------------------------------------------
  // deleteBackup —— 不存在、重复删除、删除后统计一致
  // ------------------------------------------------------------------
  describe('deleteBackup boundary', () => {
    it('returns false for an unknown backup id', async () => {
      expect(await deleteBackup('nope')).toBe(false)
    })

    it('returns false when deleting the same backup twice', async () => {
      const created = await createBackup()

      expect(await deleteBackup(created.id)).toBe(true)
      expect(await deleteBackup(created.id)).toBe(false)
    })

    it('removes the backup from the list and from statistics', async () => {
      const created = await createBackup()
      await createBackup()

      await deleteBackup(created.id)

      const backups = await listBackups()
      const stats = await getBackupStatistics()

      expect(backups.find(b => b.id === created.id)).toBeUndefined()
      expect(stats.totalBackups).toBe(backups.length)
    })
  })

  // ------------------------------------------------------------------
  // getBackupStatistics —— 与实际列表一致
  // ------------------------------------------------------------------
  describe('getBackupStatistics boundary', () => {
    it('statistics totalBackups matches the actual list length', async () => {
      await createBackup()
      await createBackup()
      await createBackup()

      const backups = await listBackups()
      const stats = await getBackupStatistics()

      expect(stats.totalBackups).toBe(backups.length)
      expect(stats.totalBackups).toBe(3)
    })

    it('statistics newest/oldest point to the first/last entry of the sorted list', async () => {
      const first = await createBackup()
      vi.advanceTimersByTime(1000)
      const second = await createBackup()

      const backups = await listBackups()
      const stats = await getBackupStatistics()

      expect(stats.newestBackup?.id).toBe(backups[0].id)
      expect(stats.newestBackup?.id).toBe(second.id)
      expect(stats.oldestBackup?.id).toBe(backups[backups.length - 1].id)
      expect(stats.oldestBackup?.id).toBe(first.id)
    })

    it('ignores invalid metadata when computing totals', async () => {
      await createBackup()
      await writeSidecar(dirs.backupDir, 'garbage', { id: 'garbage' })

      const stats = await getBackupStatistics()

      expect(stats.totalBackups).toBe(1)
    })

    it('returns averageBackupSize of 0 when there are no backups', async () => {
      const stats = await getBackupStatistics()

      expect(stats.averageBackupSize).toBe(0)
      expect(stats.newestBackup).toBeUndefined()
      expect(stats.oldestBackup).toBeUndefined()
    })
  })

  // ------------------------------------------------------------------
  // scheduler —— 空态、已禁用、无调度、并发
  // ------------------------------------------------------------------
  describe('scheduler boundary', () => {
    it('returns empty arrays when no schedules and no jobs exist', async () => {
      expect(await getScheduledBackups()).toEqual([])
      expect(await getBackupJobs()).toEqual([])
      expect(await runScheduledBackups()).toEqual([])
    })

    it('returns null when triggering a backup for an unknown schedule', async () => {
      expect(await triggerBackup('unknown-schedule')).toBeNull()
    })

    it('returns false when cancelling an unknown schedule', async () => {
      expect(await cancelScheduledBackup('unknown-schedule')).toBe(false)
    })

    it('returns null when updating an unknown schedule', async () => {
      const updated = await updateBackupSchedule('unknown-schedule', { enabled: false })

      expect(updated).toBeNull()
    })

    it('skips disabled schedules when running scheduled backups', async () => {
      await scheduleBackup({
        name: 'disabled',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: false,
        notificationEnabled: false,
      })

      const jobs = await runScheduledBackups()

      expect(jobs).toEqual([])
      expect(await getBackupJobs()).toEqual([])
    })

    it('does not run a schedule whose nextRunAt is in the future', async () => {
      await scheduleBackup({
        name: 'future',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      })
      const [schedule] = await getScheduledBackups()
      await updateBackupSchedule(schedule.id, { nextRunAt: '2099-01-01T00:00:00.000Z' })

      const jobs = await runScheduledBackups()

      expect(jobs).toEqual([])
    })

    it('runs a due schedule and records a completed job', async () => {
      const schedule = await scheduleBackup({
        name: 'due',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      })
      await updateBackupSchedule(schedule.id, { nextRunAt: '2026-03-20T00:00:00.000Z' })

      const jobs = await runScheduledBackups()

      expect(jobs).toHaveLength(1)
      expect(jobs[0].status).toBe(BackupStatus.COMPLETED)
      expect(jobs[0].backupId).toBeTruthy()
    })

    it('getBackupJobs honours the limit argument', async () => {
      const schedule = await scheduleBackup({
        name: 'limit',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      })
      await updateBackupSchedule(schedule.id, { nextRunAt: '2026-03-20T00:00:00.000Z' })
      await runScheduledBackups()
      await updateBackupSchedule(schedule.id, { nextRunAt: '2026-03-20T00:00:00.000Z' })
      await runScheduledBackups()

      const all = await getBackupJobs(100)
      const limited = await getBackupJobs(1)

      expect(all.length).toBeGreaterThanOrEqual(2)
      expect(limited).toHaveLength(1)
    })

    it('getJobsForSchedule only returns jobs of that schedule', async () => {
      const schedule = await scheduleBackup({
        name: 'scoped',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      })
      await updateBackupSchedule(schedule.id, { nextRunAt: '2026-03-20T00:00:00.000Z' })
      await runScheduledBackups()

      const scoped = await getJobsForSchedule(schedule.id)
      const unrelated = await getJobsForSchedule('another-schedule')

      expect(scoped).toHaveLength(1)
      expect(unrelated).toEqual([])
    })

    it('cancelScheduledBackup removes the schedule from the list', async () => {
      const schedule = await scheduleBackup({
        name: 'cancel',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      })

      expect(await cancelScheduledBackup(schedule.id)).toBe(true)
      expect((await getScheduledBackups()).find(s => s.id === schedule.id)).toBeUndefined()
    })

    it('handles concurrent scheduleBackup calls without losing schedules', async () => {
      const configs = [1, 2, 3, 4, 5].map(n => ({
        name: `concurrent-${n}`,
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      }))

      await Promise.all(configs.map(config => scheduleBackup(config)))

      const schedules = await getScheduledBackups()
      for (const n of [1, 2, 3, 4, 5]) {
        expect(schedules.some(s => s.name === `concurrent-${n}`)).toBe(true)
      }
    })

    it('handles concurrent triggerBackup calls and records every job', async () => {
      const schedule = await scheduleBackup({
        name: 'concurrent-trigger',
        frequency: BackupFrequency.DAILY,
        retentionDays: 7,
        compression: CompressionAlgorithm.NONE,
        encryption: EncryptionAlgorithm.NONE,
        enabled: true,
        notificationEnabled: false,
      })

      const jobs = await Promise.all([
        triggerBackup(schedule.id),
        triggerBackup(schedule.id),
        triggerBackup(schedule.id),
      ])

      expect(jobs.every(j => j !== null)).toBe(true)
      expect(await getBackupJobs(100)).toHaveLength(3)
    })
  })

  // ------------------------------------------------------------------
  // concurrency —— backup 域自身的并发调用
  // ------------------------------------------------------------------
  describe('concurrency', () => {
    it('creates distinct backups under concurrent createBackup calls', async () => {
      const results = await Promise.all([
        createBackup(),
        createBackup(),
        createBackup(),
      ])

      const ids = results.map(r => r.id)
      expect(new Set(ids).size).toBe(3)

      const backups = await listBackups()
      expect(backups).toHaveLength(3)
    })

    it('listBackups is safe to call concurrently', async () => {
      await createBackup()

      const results = await Promise.all([
        listBackups(),
        listBackups(),
        listBackups(),
      ])

      expect(results.every(r => r.length === 1)).toBe(true)
    })
  })

  // ------------------------------------------------------------------
  // compression —— 空输入与错误路径
  // ------------------------------------------------------------------
  describe('compression boundary', () => {
    it('compresses and decompresses an empty string', async () => {
      const compressed = await compressBackup('', CompressionAlgorithm.GZIP)

      expect(typeof compressed).toBe('string')
      expect(await decompressBackup(compressed, CompressionAlgorithm.GZIP)).toBe('')
    })

    it('round-trips content through brotli', async () => {
      const original = 'x'.repeat(10000)
      const compressed = await compressBackup(original, CompressionAlgorithm.BROTLI)

      expect(await decompressBackup(compressed, CompressionAlgorithm.BROTLI)).toBe(original)
    })

    it('rejects unsupported algorithms', async () => {
      await expect(
        compressBackup('data', 'not-an-algorithm' as CompressionAlgorithm)
      ).rejects.toThrow()
    })

    it('rejects decompressing garbage input', async () => {
      await expect(
        decompressBackup('not-valid-base64-gzip', CompressionAlgorithm.GZIP)
      ).rejects.toThrow()
    })

    it('calculateCompressionRatio handles a zero compressed size', () => {
      // 压缩到 0 字节 = 100% 压缩率，不是 0
      expect(calculateCompressionRatio(100, 0)).toBe(100)
    })

    it('calculateCompressionRatio handles a zero original size', () => {
      expect(calculateCompressionRatio(0, 0)).toBe(0)
    })

    it('estimateCompressedSize handles zero input size', () => {
      expect(estimateCompressedSize(0, CompressionAlgorithm.GZIP)).toBeGreaterThanOrEqual(0)
    })
  })

  // ------------------------------------------------------------------
  // encryption —— 空输入与错误路径
  // ------------------------------------------------------------------
  describe('encryption boundary', () => {
    it('returns the plaintext unchanged for algorithm NONE', async () => {
      expect(await encryptBackup('plain', EncryptionAlgorithm.NONE, 'k')).toBe('plain')
      expect(await decryptBackup('plain', EncryptionAlgorithm.NONE, 'k')).toBe('plain')
    })

    it('encrypts an empty string and decrypts it back', async () => {
      const encrypted = await encryptBackup('', EncryptionAlgorithm.AES256GCM, 'password')

      expect(encrypted).not.toBe('')
      expect(await decryptBackup(encrypted, EncryptionAlgorithm.AES256GCM, 'password')).toBe('')
    })

    it('round-trips with AES256CBC', async () => {
      const encrypted = await encryptBackup('secret-data', EncryptionAlgorithm.AES256CBC, 'pw')

      expect(await decryptBackup(encrypted, EncryptionAlgorithm.AES256CBC, 'pw')).toBe('secret-data')
    })

    it('fails to decrypt with the wrong password', async () => {
      const encrypted = await encryptBackup('secret-data', EncryptionAlgorithm.AES256GCM, 'right-pw')

      await expect(
        decryptBackup(encrypted, EncryptionAlgorithm.AES256GCM, 'wrong-pw')
      ).rejects.toThrow()
    })

    it('fails to decrypt a truncated payload', async () => {
      const encrypted = await encryptBackup('secret-data', EncryptionAlgorithm.AES256GCM, 'pw')

      await expect(
        decryptBackup(encrypted.slice(0, 10), EncryptionAlgorithm.AES256GCM, 'pw')
      ).rejects.toThrow()
    })

    it('rejects an unsupported encryption algorithm', async () => {
      await expect(
        encryptBackup('data', 'rot13' as EncryptionAlgorithm, 'pw')
      ).rejects.toThrow()
    })

    it('generateEncryptionKey produces a valid 64-hex key', () => {
      const key = generateEncryptionKey()

      expect(key).toMatch(/^[0-9a-f]{64}$/)
      expect(validateEncryptionKey(key)).toBe(true)
    })

    it('validateEncryptionKey rejects malformed keys', () => {
      expect(validateEncryptionKey('')).toBe(false)
      expect(validateEncryptionKey('short')).toBe(false)
      expect(validateEncryptionKey('z'.repeat(64))).toBe(false)
    })

    it('hashPassword and verifyPassword round-trip, and reject a wrong password', async () => {
      const { hash, salt } = await hashPassword('my-password')

      expect(await verifyPassword('my-password', hash, salt)).toBe(true)
      expect(await verifyPassword('other-password', hash, salt)).toBe(false)
    })
  })

  // ------------------------------------------------------------------
  // data-export —— 空目录、非法文件、导入
  // ------------------------------------------------------------------
  describe('data-export boundary', () => {
    it('returns an empty array when the export directory is empty', async () => {
      expect(await listExports()).toEqual([])
    })

    it('ignores non-json files in the export directory', async () => {
      await fs.writeFile(path.join(dirs.exportDir, 'notes.txt'), 'hello', 'utf-8')

      expect(await listExports()).toEqual([])
    })

    it('lists a JSON export created by exportData', async () => {
      const result = await exportData({ format: ExportFormat.JSON, includeMetadata: true })

      const exports = await listExports()

      expect(exports).toHaveLength(1)
      expect(exports[0].filename).toBe(result.filename)
      expect(exports[0].format).toBe('json')
      expect(exports[0].size).toBeGreaterThan(0)
    })

    it('deleteExport returns false for an unknown file', async () => {
      expect(await deleteExport('nope.json')).toBe(false)
    })

    it('deleteExport removes an existing export', async () => {
      const result = await exportData({ format: ExportFormat.JSON, includeMetadata: true })

      expect(await deleteExport(result.filename)).toBe(true)
      expect(await listExports()).toEqual([])
    })

    it('importData reports a failure for an unknown file', async () => {
      const result = await importData('does-not-exist.json', { format: ExportFormat.JSON })

      expect(result.success).toBe(false)
    })

    it('importData dry-runs without throwing on a valid export', async () => {
      const exported = await exportData({ format: ExportFormat.JSON, includeMetadata: true })

      const result = await importData(exported.filename, {
        format: ExportFormat.JSON,
        dryRun: true,
      })

      expect(result.success).toBe(true)
    })
  })
})

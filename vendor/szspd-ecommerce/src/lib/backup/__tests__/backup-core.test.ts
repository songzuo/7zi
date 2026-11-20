/**
 * Backup Core Module Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createBackup,
  listBackups,
  getBackup,
  deleteBackup,
  restoreBackup,
  getBackupStatistics,
} from '../backup-core'
import { BackupStatus, CompressionAlgorithm, EncryptionAlgorithm } from '../types'

describe('Backup Core Module', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createBackup', () => {
    it('should create a backup with default options', async () => {
      const backup = await createBackup()

      expect(backup).toHaveProperty('id')
      expect(backup).toHaveProperty('filename')
      expect(backup).toHaveProperty('version')
      expect(backup).toHaveProperty('createdAt')
      expect(backup).toHaveProperty('sizeInBytes')
      expect(backup).toHaveProperty('sizeInMB')
      expect(backup).toHaveProperty('checksum')
      expect(backup.status).toBe(BackupStatus.COMPLETED)
      expect(backup.compression).toBe(CompressionAlgorithm.NONE)
      expect(backup.encryption).toBe(EncryptionAlgorithm.NONE)
      expect(backup.tables).toBeInstanceOf(Array)
      expect(backup.recordCounts).toBeInstanceOf(Object)
    })

    it('should create a backup with GZIP compression', async () => {
      const backup = await createBackup({
        compression: CompressionAlgorithm.GZIP,
      })

      expect(backup.compression).toBe(CompressionAlgorithm.GZIP)
      expect(backup.filename).toMatch(/\.json\.gz$/)
    })

    it('should create a backup with Brotli compression', async () => {
      const backup = await createBackup({
        compression: CompressionAlgorithm.BROTLI,
      })

      expect(backup.compression).toBe(CompressionAlgorithm.BROTLI)
      expect(backup.filename).toMatch(/\.json\.br$/)
    })

    it('should create a backup for specific tables', async () => {
      const backup = await createBackup({
        tables: ['users', 'tasks'],
      })

      expect(backup.tables).toEqual(['users', 'tasks'])
    })

    it('should calculate correct checksum', async () => {
      const backup = await createBackup()

      expect(backup.checksum).toMatch(/^[0-9a-f]{64}$/i)
    })

    it('should have positive size', async () => {
      const backup = await createBackup()

      expect(backup.sizeInBytes).toBeGreaterThan(0)
      expect(backup.sizeInMB).toBeGreaterThan(0)
    })
  })

  describe('listBackups', () => {
    it('should return array of backups', async () => {
      await createBackup()
      await createBackup()

      const backups = await listBackups()

      expect(Array.isArray(backups)).toBe(true)
      expect(backups.length).toBeGreaterThanOrEqual(2)
    })

    it('should return backups sorted by creation date (newest first)', async () => {
      const backup1 = await createBackup()
      vi.advanceTimersByTime(10)
      const backup2 = await createBackup()

      const backups = await listBackups()

      expect(backups[0].id).toBe(backup2.id)
      expect(backups[1].id).toBe(backup1.id)
    })

    it('should return empty array when no backups exist', async () => {
      const backups = await listBackups()

      expect(backups).toEqual([])
    })
  })

  describe('getBackup', () => {
    it('should get a specific backup by ID', async () => {
      const createdBackup = await createBackup()
      const backup = await getBackup(createdBackup.id)

      expect(backup).not.toBeNull()
      expect(backup?.metadata.id).toBe(createdBackup.id)
      expect(backup?.data).toHaveProperty('data')
    })

    it('should return null for non-existent backup', async () => {
      const backup = await getBackup('non-existent-id')

      expect(backup).toBeNull()
    })

    it('should include metadata in backup data', async () => {
      const createdBackup = await createBackup()
      const backup = await getBackup(createdBackup.id)

      expect(backup?.metadata).toHaveProperty('id')
      expect(backup?.metadata).toHaveProperty('version')
      expect(backup?.metadata).toHaveProperty('createdAt')
    })

    it('should include system information', async () => {
      const createdBackup = await createBackup()
      const backup = await getBackup(createdBackup.id)

      expect(backup?.data).toHaveProperty('_system')
      expect(backup?.data._system).toHaveProperty('platform')
      expect(backup?.data._system).toHaveProperty('nodeVersion')
    })
  })

  describe('deleteBackup', () => {
    it('should delete a backup', async () => {
      const createdBackup = await createBackup()
      const deleted = await deleteBackup(createdBackup.id)

      expect(deleted).toBe(true)

      const backups = await listBackups()
      expect(backups.find(b => b.id === createdBackup.id)).toBeUndefined()
    })

    it('should return false for non-existent backup', async () => {
      const deleted = await deleteBackup('non-existent-id')

      expect(deleted).toBe(false)
    })
  })

  describe('restoreBackup', () => {
    it('should restore a backup', async () => {
      const createdBackup = await createBackup()

      const result = await restoreBackup({
        backupId: createdBackup.id,
        truncateTables: false,
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Backup restored successfully')
    })

    it('should fail for non-existent backup', async () => {
      const result = await restoreBackup({
        backupId: 'non-existent-id',
        truncateTables: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('BACKUP_NOT_FOUND')
    })

    it('should support dry run mode', async () => {
      const createdBackup = await createBackup()

      const result = await restoreBackup({
        backupId: createdBackup.id,
        truncateTables: false,
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Dry run: Would restore backup')
    })

    it('should handle encrypted backups without key', async () => {
      const createdBackup = await createBackup({
        encryption: {
          algorithm: EncryptionAlgorithm.AES256GCM,
          key: 'test-key-123456789012345678901234567890123456789012345678901234',
        },
      })

      const result = await restoreBackup({
        backupId: createdBackup.id,
        truncateTables: false,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ENCRYPTED_BACKUP_NO_KEY')
    })
  })

  describe('getBackupStatistics', () => {
    it('should return statistics for existing backups', async () => {
      await createBackup()
      await createBackup()

      const stats = await getBackupStatistics()

      expect(stats.totalBackups).toBeGreaterThanOrEqual(2)
      expect(stats.totalSizeInBytes).toBeGreaterThan(0)
      expect(stats.totalSizeInMB).toBeGreaterThan(0)
      expect(stats.totalRecords).toBeGreaterThanOrEqual(0)
      expect(stats.averageBackupSize).toBeGreaterThan(0)
      expect(stats.newestBackup).toBeDefined()
      expect(stats.oldestBackup).toBeDefined()
    })

    it('should return zero statistics when no backups exist', async () => {
      const stats = await getBackupStatistics()

      expect(stats.totalBackups).toBe(0)
      expect(stats.totalSizeInBytes).toBe(0)
      expect(stats.totalSizeInMB).toBe(0)
      expect(stats.totalRecords).toBe(0)
      expect(stats.averageBackupSize).toBe(0)
    })
  })
})

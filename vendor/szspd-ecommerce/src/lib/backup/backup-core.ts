/**
 * Backup Core Module
 * Core backup and restore functionality
 */

import { getDatabase, getDatabaseSize } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import {
  BackupMetadata,
  BackupStatus,
  CompressionAlgorithm,
  EncryptionAlgorithm,
  RestoreOptions,
  BackupStatistics,
  BackupEventType,
  BackupEvent,
} from './types'
import { compressBackup, decompressBackup } from './compression'
import { encryptBackup, decryptBackup } from './encryption'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/utils'

const BACKUP_DIR = path.join(process.cwd(), 'backups')
const EVENTS_FILE = path.join(BACKUP_DIR, 'events.json')

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  } catch (error) {
    logger.error('Failed to create backup directory', error)
    throw error
  }
}

/**
 * Record backup event
 */
async function recordEvent(event: BackupEvent): Promise<void> {
  try {
    await ensureBackupDir()

    let events: BackupEvent[] = []

    try {
      const content = await fs.readFile(EVENTS_FILE, 'utf-8')
      events = JSON.parse(content) as BackupEvent[]
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }

    events.push(event)

    // Keep only last 1000 events
    if (events.length > 1000) {
      events = events.slice(-1000)
    }

    await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8')
  } catch (error) {
    logger.error('Failed to record backup event', error)
  }
}

/**
 * Get all backup events
 */
async function getEvents(limit?: number): Promise<BackupEvent[]> {
  try {
    const content = await fs.readFile(EVENTS_FILE, 'utf-8')
    const events = JSON.parse(content) as BackupEvent[]

    return limit ? events.slice(-limit) : events
  } catch (error) {
    return []
  }
}

/**
 * Get list of available backups
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  try {
    await ensureBackupDir()

    const files = await fs.readdir(BACKUP_DIR)
    const backups: BackupMetadata[] = []

    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.json.gz') || file.endsWith('.json.br')) {
        try {
          const filePath = path.join(BACKUP_DIR, file)
          const stats = await fs.stat(filePath)

          // Try to read metadata file
          const metadataPath = path.join(BACKUP_DIR, file.replace(/\.(gz|br)$/, '.metadata.json'))
          let metadata: BackupMetadata | null = null

          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf-8')
            metadata = JSON.parse(metadataContent) as BackupMetadata
          } catch (error) {
            // Metadata file doesn't exist, try to read from backup file
            try {
              let content = await fs.readFile(filePath, 'utf-8')
              // Handle compressed files
              if (file.endsWith('.gz') || file.endsWith('.br')) {
                content = await decompressBackup(
                  content,
                  file.endsWith('.gz') ? CompressionAlgorithm.GZIP : CompressionAlgorithm.BROTLI
                )
              }
              const backup = JSON.parse(content) as { metadata?: BackupMetadata }
              metadata = backup.metadata || null
            } catch (error) {
              // Can't read metadata from backup file
            }
          }

          if (metadata) {
            backups.push({
              ...metadata,
              filename: file,
              sizeInBytes: stats.size,
              sizeInMB: stats.size / (1024 * 1024),
            })
          }
        } catch (error) {
          logger.warn(`Failed to read backup file: ${file}`, { error: String(error) })
        }
      }
    }

    // Sort by creation date (newest first)
    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    logger.error('Failed to list backups', error)
    return []
  }
}

/**
 * Create a full database backup
 */
export async function createBackup(
  options: {
    compression?: CompressionAlgorithm
    encryption?: { algorithm: EncryptionAlgorithm; key: string }
    tables?: string[]
    userId?: string
  } = {}
): Promise<BackupMetadata> {
  const backupId = uuidv4()
  const timestamp = Date.now()
  const compression = options.compression || CompressionAlgorithm.NONE
  const encryption = options.encryption?.algorithm || EncryptionAlgorithm.NONE

  await ensureBackupDir()

  const db = getDatabase()
  const dbSize = getDatabaseSize()

  // Get all tables or filtered tables
  let tables: string[]
  if (options.tables && options.tables.length > 0) {
    tables = options.tables
  } else {
    const tablesResult = (await db.query(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `)) as { name: string }[]
    tables = Array.isArray(tablesResult) ? tablesResult.map(t => t.name) : []
  }

  // Export all tables
  const backupData: Record<string, unknown[]> = {}
  const recordCounts: Record<string, number> = {}

  for (const table of tables) {
    const tableData = await db.query(`SELECT * FROM ${table}`)
    backupData[table] = Array.isArray(tableData) ? tableData : []
    recordCounts[table] = Array.isArray(tableData) ? tableData.length : 0
  }

  // Create backup metadata
  const metadata: BackupMetadata = {
    id: backupId,
    filename: `${backupId}.json${compression === CompressionAlgorithm.GZIP ? '.gz' : compression === CompressionAlgorithm.BROTLI ? '.br' : ''}`,
    version: '2.0.0',
    createdAt: new Date(timestamp).toISOString(),
    updatedAt: new Date(timestamp).toISOString(),
    sizeInBytes: 0, // Will be calculated after saving
    sizeInMB: 0,
    compression,
    encryption,
    checksum: '',
    status: BackupStatus.COMPLETED,
    tables,
    recordCounts,
  }

  // Add database metadata
  const backup = {
    metadata,
    data: backupData,
    _system: {
      databaseSize: dbSize?.sizeInBytes ?? 0,
      exportedAt: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      backupId,
    },
  }

  // Save backup to file
  let content = JSON.stringify(backup, null, 2)

  // Compress if requested
  if (compression !== CompressionAlgorithm.NONE) {
    content = await compressBackup(content, compression)
  }

  // Encrypt if requested
  if (options.encryption && options.encryption.key) {
    content = await encryptBackup(content, options.encryption.algorithm, options.encryption.key)
  }

  const filePath = path.join(BACKUP_DIR, metadata.filename)
  await fs.writeFile(filePath, content, 'utf-8')

  // Calculate final size and checksum
  const stats = await fs.stat(filePath)
  metadata.sizeInBytes = stats.size
  metadata.sizeInMB = stats.size / (1024 * 1024)

  // Calculate checksum of original content (before encryption)
  const originalContent = JSON.stringify(backup, null, 2)
  metadata.checksum = createHash('sha256').update(originalContent).digest('hex')

  // Save metadata separately for faster listing
  const metadataPath = path.join(BACKUP_DIR, `${backupId}.metadata.json`)
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')

  // Record event
  await recordEvent({
    type: BackupEventType.BACKUP_CREATED,
    timestamp: new Date().toISOString(),
    data: {
      backupId,
      userId: options.userId,
      metadata: {
        size: metadata.sizeInMB,
        tables: tables.length,
        records: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
        compression,
        encryption,
      },
    },
  })

  logger.info(`Backup created: ${metadata.filename}`, {
    category: 'backup',
    backupId,
    size: metadata.sizeInMB,
    tables: tables.length,
    records: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
    compression,
    encryption,
    userId: options.userId,
  })

  return metadata
}

/**
 * Get a specific backup by ID
 */
export async function getBackup(
  backupId: string
): Promise<{ metadata: BackupMetadata; data: Record<string, unknown[]> } | null> {
  try {
    const backups = await listBackups()
    const backupMetadata = backups.find(b => b.id === backupId)

    if (!backupMetadata) {
      return null
    }

    const filePath = path.join(BACKUP_DIR, backupMetadata.filename)
    let content = await fs.readFile(filePath, 'utf-8')

    // Decrypt if encrypted
    if (backupMetadata.encryption !== EncryptionAlgorithm.NONE) {
      // Note: This requires the encryption key, which should be provided
      // For now, we'll throw an error if the backup is encrypted
      throw new Error('Encrypted backups require decryption key')
    }

    // Decompress if compressed
    if (backupMetadata.compression !== CompressionAlgorithm.NONE) {
      content = await decompressBackup(content, backupMetadata.compression)
    }

    const backup = JSON.parse(content) as {
      metadata: BackupMetadata
      data: Record<string, unknown[]>
    }

    return backup
  } catch (error) {
    logger.error(`Failed to get backup: ${backupId}`, error)
    return null
  }
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string, userId?: string): Promise<boolean> {
  try {
    const backups = await listBackups()
    const backup = backups.find(b => b.id === backupId)

    if (!backup) {
      return false
    }

    const filePath = path.join(BACKUP_DIR, backup.filename)
    const metadataPath = path.join(BACKUP_DIR, `${backupId}.metadata.json`)

    await fs.unlink(filePath)
    await fs.unlink(metadataPath).catch(() => {}) // Ignore if metadata file doesn't exist

    await recordEvent({
      type: BackupEventType.BACKUP_DELETED,
      timestamp: new Date().toISOString(),
      data: {
        backupId,
        userId,
        metadata: {
          filename: backup.filename,
          size: backup.sizeInMB,
        },
      },
    })

    logger.info(`Backup deleted: ${backup.filename}`, {
      category: 'backup',
      backupId,
      userId,
    })

    return true
  } catch (error) {
    logger.error(`Failed to delete backup: ${backupId}`, error)
    return false
  }
}

/**
 * Restore a backup
 */
export async function restoreBackup(
  options: RestoreOptions & { userId?: string }
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    let backupData: { metadata: BackupMetadata; data: Record<string, unknown[]> } | null = null
    const filePath = path.join(
      BACKUP_DIR,
      `${options.backupId}.json${options.backupId.endsWith('.gz') ? '.gz' : options.backupId.endsWith('.br') ? '.br' : ''}`
    )
    let content = await fs.readFile(filePath, 'utf-8')

    // Get backup metadata to check encryption
    const metadataPath = path.join(BACKUP_DIR, `${options.backupId}.metadata.json`)
    let metadata: BackupMetadata | null = null

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf-8')
      metadata = JSON.parse(metadataContent) as BackupMetadata
    } catch (error) {
      // Try to read from backup file header
    }

    // Decrypt if encrypted
    if (metadata?.encryption && metadata.encryption !== EncryptionAlgorithm.NONE) {
      if (!options.encryptionKey) {
        return {
          success: false,
          message: 'Backup is encrypted but no decryption key provided',
          error: 'ENCRYPTED_BACKUP_NO_KEY',
        }
      }
      content = await decryptBackup(content, metadata.encryption, options.encryptionKey)
    }

    // Decompress if compressed
    const compression = metadata?.compression || CompressionAlgorithm.NONE
    if (compression !== CompressionAlgorithm.NONE) {
      content = await decompressBackup(content, compression)
    }

    const backup = JSON.parse(content) as {
      metadata: BackupMetadata
      data: Record<string, unknown[]>
    }
    backupData = backup

    if (!backupData) {
      return {
        success: false,
        message: 'Backup not found or invalid',
        error: 'BACKUP_NOT_FOUND',
      }
    }

    if (options.dryRun) {
      return {
        success: true,
        message: 'Dry run: Would restore backup',
      }
    }

    const db = getDatabase()

    // Restore tables
    for (const table of backupData.metadata.tables) {
      const tableData = backupData.data[table] || []

      if (options.truncateTables) {
        await db.exec(`DELETE FROM ${table}`)
      }

      // Insert records
      for (const record of tableData) {
        const recordObj = record as Record<string, unknown>
        const columns = Object.keys(recordObj)
        const values = Object.values(recordObj)
        const placeholders = values.map(() => '?').join(', ')

        try {
          await db.exec(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          )
        } catch (error) {
          if (!options.skipErrors) {
            throw error
          }
          logger.warn(`Failed to insert record into ${table}`, { error: String(error) })
        }
      }
    }

    await recordEvent({
      type: BackupEventType.BACKUP_RESTORED,
      timestamp: new Date().toISOString(),
      data: {
        backupId: options.backupId,
        userId: options.userId,
        metadata: {
          tables: backupData.metadata.tables.length,
          records: Object.values(backupData.data).reduce((sum, records) => sum + records.length, 0),
          truncateTables: options.truncateTables,
        },
      },
    })

    logger.info(`Backup restored: ${options.backupId}`, {
      category: 'backup',
      backupId: options.backupId,
      userId: options.userId,
      truncateTables: options.truncateTables,
    })

    return {
      success: true,
      message: 'Backup restored successfully',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to restore backup: ${options.backupId}`, error)

    await recordEvent({
      type: BackupEventType.BACKUP_FAILED,
      timestamp: new Date().toISOString(),
      data: {
        backupId: options.backupId,
        userId: options.userId,
        metadata: {
          error: errorMessage,
        },
      },
    })

    return {
      success: false,
      message: 'Failed to restore backup',
      error: errorMessage,
    }
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStatistics(): Promise<BackupStatistics> {
  const backups = await listBackups()

  if (backups.length === 0) {
    return {
      totalBackups: 0,
      totalSizeInBytes: 0,
      totalSizeInMB: 0,
      totalRecords: 0,
      averageBackupSize: 0,
    }
  }

  const totalSizeInBytes = backups.reduce((sum, b) => sum + b.sizeInBytes, 0)
  const totalSizeInMB = backups.reduce((sum, b) => sum + b.sizeInMB, 0)
  const totalRecords = backups.reduce(
    (sum, b) => sum + Object.values(b.recordCounts).reduce((s, count) => s + count, 0),
    0
  )

  return {
    totalBackups: backups.length,
    totalSizeInBytes,
    totalSizeInMB,
    oldestBackup: backups[backups.length - 1],
    newestBackup: backups[0],
    totalRecords,
    averageBackupSize: totalSizeInBytes / backups.length,
  }
}

/**
 * Backup API
 * Create and manage full database backups with metadata
 *
 * GET /api/backup - List available backups
 * POST /api/backup - Create a new full backup
 */

import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getDatabaseSize } from '@/lib/db';
import { logger } from '@/lib/logger';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { withCors } from '@/middleware/cors';
import { createErrorResponse, createServiceUnavailableError, ErrorType } from '@/lib/api/error-handler';
import { createSuccessResponse } from '@/lib/api/utils';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  sizeInBytes: number;
  sizeInMB: number;
  version: string;
  tables: string[];
  recordCounts: Record<string, number>;
  checksum: string;
}

interface TableName {
  name: string;
}

interface CountResult {
  count: number;
}

interface BackupMetadataInternal {
  databaseSize: number;
  exportedAt: string;
  platform: NodeJS.Platform;
  nodeVersion: string;
}

interface BackupData {
  [key: string]: unknown[] | BackupMetadataInternal | undefined;
  _metadata?: BackupMetadataInternal;
}

const BACKUP_DIR = path.join(process.cwd(), 'backups');

/**
 * Sensitive fields blacklist - do not export these fields
 */
const SENSITIVE_FIELDS = ['password', 'api_key', 'token', 'refresh_token', 'secret', 'private_key'];

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create backup directory', error);
    throw error;
  }
}

/**
 * Get list of available backups
 */
async function getAvailableBackups(): Promise<BackupMetadata[]> {
  try {
    await ensureBackupDir();

    const files = await fs.readdir(BACKUP_DIR);
    const backups: BackupMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(BACKUP_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const backup = JSON.parse(content) as BackupMetadata & { data: BackupData };
          const stats = await fs.stat(filePath);

          backups.push({
            id: backup.id,
            filename: file,
            createdAt: backup.createdAt,
            sizeInBytes: stats.size,
            sizeInMB: stats.size / (1024 * 1024),
            version: backup.version,
            tables: backup.tables,
            recordCounts: backup.recordCounts,
            checksum: backup.checksum,
          });
        } catch (error) {
          logger.warn(`Failed to read backup file: ${file}`);
        }
      }
    }

    // Sort by creation date (newest first)
    return backups.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    logger.error('Failed to get available backups', error);
    return [];
  }
}

/**
 * Create a full database backup
 */
async function createBackup(): Promise<BackupMetadata> {
  const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const filename = `${backupId}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  await ensureBackupDir();

  const db = getDatabase();
  const dbSize = getDatabaseSize();
  const databaseSizeBytes = dbSize?.sizeInBytes ?? 0;

  // Get all tables using prepared statement
  const tablesStmt = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);
  const tableRows = tablesStmt.all() as Array<{ name: string }>;
  const tables = tableRows.map(t => t.name);

  // Batch get all table row counts (single UNION ALL query)
  let countQuery = '';
  const countParams: string[] = [];
  tables.forEach((table, index) => {
    if (index > 0) countQuery += ' UNION ALL ';
    countQuery += `SELECT '${table}' as table_name, COUNT(*) as row_count FROM ${table}`;
  });

  const countsStmt = db.prepare(countQuery);
  const rowCountData = countsStmt.all() as Array<{ table_name: string; row_count: number }>;

  // Create row count map
  const rowCountMap = new Map<string, number>();
  for (const row of rowCountData) {
    rowCountMap.set(row.table_name, row.row_count);
  }

  // Export all tables with safe columns - OPTIMIZED
  const backupData: BackupData = {};
  const recordCounts: Record<string, number> = {};

  for (const table of tables) {
    // Dynamically get table structure
    const pragmaStmt = db.prepare(`PRAGMA table_info(${table})`);
    const columns = pragmaStmt.all() as Array<{ name: string; type: string }>;

    // Filter sensitive fields
    const safeColumns = columns
      .map(c => c.name)
      .filter(col => !SENSITIVE_FIELDS.includes(col.toLowerCase()));

    if (safeColumns.length === 0) {
      // No safe columns to export
      backupData[table] = [];
      recordCounts[table] = rowCountMap.get(table) || 0;
      continue;
    }

    const columnsStr = safeColumns.join(', ');
    const tableDataStmt = db.prepare(`SELECT ${columnsStr} FROM ${table}`);
    const tableData = tableDataStmt.all();
    backupData[table] = Array.isArray(tableData) ? tableData : [];
    recordCounts[table] = rowCountMap.get(table) || 0;
  }

  // Create backup metadata
  const backup: BackupMetadata & { data: BackupData } = {
    id: backupId,
    filename,
    createdAt: new Date().toISOString(),
    sizeInBytes: 0, // Will be calculated after saving
    sizeInMB: 0, // Will be calculated after saving
    version: '1.1.0', // Updated: sensitive field filtering
    tables,
    recordCounts,
    checksum: '', // Will be calculated after saving
    data: backupData,
  };

  // Add database metadata
  backup.data._metadata = {
    databaseSize: databaseSizeBytes,
    exportedAt: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
  };

  // Save backup to file
  const jsonContent = JSON.stringify(backup, null, 2);
  await fs.writeFile(filePath, jsonContent, 'utf-8');

  // Calculate final size and checksum
  const stats = await fs.stat(filePath);
  backup.sizeInBytes = stats.size;
  backup.sizeInMB = stats.size / (1024 * 1024);

  // Simple checksum (hash of content)
  backup.checksum = crypto.createHash('sha256').update(jsonContent).digest('hex');

  // Update file with checksum
  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8');

  logger.info(`Backup created: ${filename}`, {
    category: 'backup',
    size: backup.sizeInMB,
    tables: tables.length,
    totalRecords: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
  });

  return backup;
}

/**
 * GET /api/backup
 * List available backups
 */
async function listBackupsHandler(request: NextRequest) {
  try {
    const backups = await getAvailableBackups();

    return createSuccessResponse({
      backups,
      count: backups.length,
      totalSizeMB: backups.reduce((sum, b) => sum + b.sizeInMB, 0).toFixed(2),
    });
  } catch (error) {
    logger.error('Failed to list backups', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to list backups'));
  }
}

/**
 * POST /api/backup
 * Create a new backup
 */
async function createBackupHandler(request: NextRequest) {
  try {
    const backup = await createBackup();

    return createSuccessResponse({
      backup: {
        id: backup.id,
        filename: backup.filename,
        createdAt: backup.createdAt,
        sizeInBytes: backup.sizeInBytes,
        sizeInMB: backup.sizeInMB.toFixed(2),
        version: backup.version,
        tables: backup.tables,
        recordCounts: backup.recordCounts,
        checksum: backup.checksum,
      },
      downloadUrl: `/api/backup/${backup.id}`,
    }, 201);
  } catch (error) {
    logger.error('Failed to create backup', error);
    return createServiceUnavailableError('Failed to create backup');
  }
}

/**
 * GET handler for listing backups
 */
export const GET = withCors(
  withRateLimit(listBackupsHandler, { windowMs: 60000, maxRequests: 60 })
);

/**
 * POST handler for creating backups
 */
export const POST = withCors(
  withRateLimit(createBackupHandler, { windowMs: 60000, maxRequests: 10 })
);

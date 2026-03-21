/**
 * Data Export Module
 * Handles data export and import in various formats (JSON, CSV)
 */

import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ExportFormat, ExportOptions, ImportOptions } from './types';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

/**
 * Ensure export directory exists
 */
async function ensureExportDir(): Promise<void> {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create export directory', error);
    throw error;
  }
}

/**
 * Export data to JSON format
 */
export async function exportData(options: ExportOptions): Promise<{ filename: string; path: string; size: number }> {
  await ensureExportDir();

  const db = getDatabase();
  const exportId = uuidv4();
  const timestamp = Date.now();

  // Get all tables or filtered tables
  let tables: string[];
  if (options.tables && options.tables.length > 0) {
    tables = options.tables;
  } else {
    const tablesResult = await db.query(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `) as { name: string }[];
    tables = Array.isArray(tablesResult) ? tablesResult.map((t) => t.name) : [];
  }

  // Export all tables
  const exportData: Record<string, unknown[]> = {};
  for (const table of tables) {
    const tableData = await db.query(`SELECT * FROM ${table}`);
    exportData[table] = Array.isArray(tableData) ? tableData : [];
  }

  // Create export object
  const exportObj = {
    version: '1.0.0',
    exportedAt: new Date(timestamp).toISOString(),
    format: 'json',
    tables,
    data: exportData,
    ...(options.includeMetadata && {
      metadata: {
        platform: process.platform,
        nodeVersion: process.version,
        exportId,
      },
    }),
  };

  // Save to file
  const filename = `export-${exportId}-${timestamp}.json`;
  const filePath = path.join(EXPORT_DIR, filename);
  const content = JSON.stringify(exportObj, null, 2);

  await fs.writeFile(filePath, content, 'utf-8');

  logger.info(`Data exported to JSON: ${filename}`, {
    category: 'export',
    exportId,
    tables: tables.length,
    records: Object.values(exportData).reduce((sum, records) => sum + records.length, 0),
  });

  return {
    filename,
    path: filePath,
    size: content.length,
  };
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(options: ExportOptions): Promise<{ filename: string; path: string; size: number }> {
  await ensureExportDir();

  const db = getDatabase();
  const exportId = uuidv4();
  const timestamp = Date.now();

  // Get all tables or filtered tables
  let tables: string[];
  if (options.tables && options.tables.length > 0) {
    tables = options.tables;
  } else {
    const tablesResult = await db.query(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `) as { name: string }[];
    tables = Array.isArray(tablesResult) ? tablesResult.map((t) => t.name) : [];
  }

  // Create export directory for CSV files
  const exportSubDir = path.join(EXPORT_DIR, `export-${exportId}-${timestamp}`);
  await fs.mkdir(exportSubDir, { recursive: true });

  let totalSize = 0;
  const exportedFiles: string[] = [];

  // Export each table to separate CSV file
  for (const table of tables) {
    const tableData = await db.query(`SELECT * FROM ${table}`);
    const records = Array.isArray(tableData) ? tableData : [];

    if (records.length === 0) {
      continue;
    }

    // Get column names
    const columns = Object.keys(records[0]);

    // Create CSV content
    const header = columns.join(',');
    const rows = records.map((record) => {
      return columns.map((col) => {
        const value = record[col];
        // Escape quotes and handle special characters
        if (value === null || value === undefined) {
          return '';
        }
        const strValue = String(value);
        // Wrap in quotes if contains comma, quote, or newline
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',');
    });

    const csvContent = [header, ...rows].join('\n');

    const filename = `${table}.csv`;
    const filePath = path.join(exportSubDir, filename);
    await fs.writeFile(filePath, csvContent, 'utf-8');

    totalSize += csvContent.length;
    exportedFiles.push(filename);
  }

  // Create manifest file
  const manifest = {
    version: '1.0.0',
    exportedAt: new Date(timestamp).toISOString(),
    format: 'csv',
    tables: exportedFiles,
    exportId,
  };

  const manifestPath = path.join(exportSubDir, 'manifest.json');
  const manifestContent = JSON.stringify(manifest, null, 2);
  await fs.writeFile(manifestPath, manifestContent, 'utf-8');

  logger.info(`Data exported to CSV: ${exportSubDir}`, {
    category: 'export',
    exportId,
    tables: exportedFiles.length,
    records: exportedFiles.length,
  });

  return {
    filename: path.basename(exportSubDir),
    path: exportSubDir,
    size: totalSize + manifestContent.length,
  };
}

/**
 * Import data from JSON format
 */
export async function importData(
  filename: string,
  options: ImportOptions
): Promise<{ success: boolean; message: string; error?: string; importedRecords?: number }> {
  try {
    const filePath = path.join(EXPORT_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const importObj = JSON.parse(content) as {
      version?: string;
      format?: string;
      tables?: string[];
      data?: Record<string, unknown[]>;
    };

    if (!importObj.data || !importObj.tables) {
      return {
        success: false,
        message: 'Invalid import file format',
        error: 'INVALID_FORMAT',
      };
    }

    if (options.dryRun) {
      const totalRecords = Object.values(importObj.data).reduce((sum, records) => sum + records.length, 0);
      return {
        success: true,
        message: `Dry run: Would import ${totalRecords} records from ${importObj.tables.length} tables`,
        importedRecords: totalRecords,
      };
    }

    const db = getDatabase();
    let importedRecords = 0;

    // Import data for each table
    for (const table of importObj.tables) {
      const tableData = importObj.data[table] || [];

      if (tableData.length === 0) {
        continue;
      }

      if (options.truncateTables) {
        await db.exec(`DELETE FROM ${table}`);
      }

      // Insert records
      for (const record of tableData) {
        const columns = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map(() => '?').join(', ');

        try {
          await db.exec(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
          importedRecords++;
        } catch (error) {
          if (!options.skipErrors) {
            throw error;
          }
          logger.warn(`Failed to insert record into ${table}`, error);
        }
      }
    }

    logger.info(`Data imported from JSON: ${filename}`, {
      category: 'import',
      tables: importObj.tables.length,
      importedRecords,
    });

    return {
      success: true,
      message: `Successfully imported ${importedRecords} records from ${importObj.tables.length} tables`,
      importedRecords,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to import data: ${filename}`, error);
    return {
      success: false,
      message: 'Failed to import data',
      error: errorMessage,
    };
  }
}

/**
 * Import data from CSV format
 */
export async function importFromCSV(
  directory: string,
  options: ImportOptions
): Promise<{ success: boolean; message: string; error?: string; importedRecords?: number }> {
  try {
    const dirPath = path.join(EXPORT_DIR, directory);

    // Read manifest
    const manifestPath = path.join(dirPath, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as {
      version?: string;
      format?: string;
      tables?: string[];
    };

    if (!manifest.tables) {
      return {
        success: false,
        message: 'Invalid import directory: missing manifest',
        error: 'INVALID_MANIFEST',
      };
    }

    if (options.dryRun) {
      return {
        success: true,
        message: `Dry run: Would import data from ${manifest.tables.length} CSV files`,
      };
    }

    const db = getDatabase();
    let importedRecords = 0;

    // Import each CSV file
    for (const table of manifest.tables) {
      const csvPath = path.join(dirPath, `${table}.csv`);
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        continue; // Empty file (only header or completely empty)
      }

      // Parse header
      const header = lines[0].split(',');
      const columns = header.map((col) => col.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

      if (options.truncateTables) {
        await db.exec(`DELETE FROM ${table}`);
      }

      // Parse and insert records
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values: (string | number | null)[] = [];
        let inQuotes = false;
        let currentField = '';

        for (let j = 0; j < line.length; j++) {
          const char = line[j];

          if (char === '"') {
            if (inQuotes && line[j + 1] === '"') {
              // Escaped quote
              currentField += '"';
              j++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator
            values.push(parseCSVField(currentField));
            currentField = '';
          } else {
            currentField += char;
          }
        }
        values.push(parseCSVField(currentField));

        try {
          const placeholders = values.map(() => '?').join(', ');
          await db.exec(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
          importedRecords++;
        } catch (error) {
          if (!options.skipErrors) {
            throw error;
          }
          logger.warn(`Failed to insert record into ${table}`, error);
        }
      }
    }

    logger.info(`Data imported from CSV: ${directory}`, {
      category: 'import',
      tables: manifest.tables.length,
      importedRecords,
    });

    return {
      success: true,
      message: `Successfully imported ${importedRecords} records from ${manifest.tables.length} CSV files`,
      importedRecords,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to import CSV: ${directory}`, error);
    return {
      success: false,
      message: 'Failed to import CSV data',
      error: errorMessage,
    };
  }
}

/**
 * Parse a CSV field value
 */
function parseCSVField(field: string): string | number | null {
  const trimmed = field.trim();

  if (trimmed === '') {
    return null;
  }

  // Try to parse as number
  if (/^-?\d+\.?\d*$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return num;
    }
  }

  // Remove quotes if present
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }

  return trimmed;
}

/**
 * Get list of available exports
 */
export async function listExports(): Promise<Array<{ filename: string; path: string; size: number; format: string }>> {
  try {
    await ensureExportDir();

    const entries = await fs.readdir(EXPORT_DIR, { withFileTypes: true });
    const exports: Array<{ filename: string; path: string; size: number; format: string }> = [];

    for (const entry of entries) {
      if (entry.name.endsWith('.json')) {
        const filePath = path.join(EXPORT_DIR, entry.name);
        const stats = await fs.stat(filePath);
        exports.push({
          filename: entry.name,
          path: filePath,
          size: stats.size,
          format: 'json',
        });
      } else if (entry.isDirectory() && entry.name.startsWith('export-')) {
        const dirPath = path.join(EXPORT_DIR, entry.name);
        const files = await fs.readdir(dirPath);

        if (files.includes('manifest.json')) {
          const totalSize = await getDirectorySize(dirPath);
          exports.push({
            filename: entry.name,
            path: dirPath,
            size: totalSize,
            format: 'csv',
          });
        }
      }
    }

    return exports.sort((a, b) => b.filename.localeCompare(a.filename));
  } catch (error) {
    logger.error('Failed to list exports', error);
    return [];
  }
}

/**
 * Get total size of a directory recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += await getDirectorySize(filePath);
    } else {
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

/**
 * Delete an export
 */
export async function deleteExport(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(EXPORT_DIR, filename);

    if (filename.endsWith('.json')) {
      await fs.unlink(filePath);
    } else if (filename.startsWith('export-')) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      return false;
    }

    logger.info(`Export deleted: ${filename}`, {
      category: 'export',
      filename,
    });

    return true;
  } catch (error) {
    logger.error(`Failed to delete export: ${filename}`, error);
    return false;
  }
}

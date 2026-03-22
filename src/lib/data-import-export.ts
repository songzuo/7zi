/**
 * Data Import/Export Module
 * Provides functionality to export and import data in CSV and JSON formats
 *
 * Supported tables:
 * - agents
 * - agent_tokens
 * - agent_data_access
 * - user_preferences
 * - audit_logs
 */

import { getDatabaseAsync } from './db';
import { logger } from './logger';
import { memoize } from './utils/async';

export type ExportFormat = 'csv' | 'json';
export type ImportFormat = 'csv' | 'json';

export type ImportMode = 'insert' | 'update' | 'upsert' | 'replace';

export interface ExportOptions {
  format: ExportFormat;
  tables: string[];
  filters?: {
    table: string;
    where?: string;
    params?: unknown[];
    limit?: number;
  }[];
  includeSchema?: boolean;
}

export interface ImportOptions {
  format: ImportFormat;
  mode: ImportMode;
  dryRun?: boolean;
  skipDuplicates?: boolean;
  batchSize?: number;
}

export interface ExportResult {
  format: ExportFormat;
  tables: string[];
  data: Record<string, unknown[]>;
  schema?: Record<string, string>;
  stats: {
    totalRows: number;
    tables: Record<string, number>;
  };
  exportedAt: string;
}

export interface ImportResult {
  success: boolean;
  mode: ImportMode;
  dryRun: boolean;
  stats: {
    totalRows: number;
    tables: Record<string, { inserted: number; updated: number; skipped: number; errors: number }>;
  };
  errors: string[];
  importedAt: string;
}

/**
 * Supported tables for export/import
 */
const SUPPORTED_TABLES = [
  'agents',
  'agent_tokens',
  'agent_data_access',
  'user_preferences',
  'audit_logs',
] as const;

/**
 * Get column definitions for a table
 * Memoized to avoid repeated database queries for the same table
 */
export const getTableSchema = async (tableName: string): Promise<Record<string, string>> => {
  const db = await getDatabaseAsync();
  const columns = db.queryRows(`
      PRAGMA table_info(${tableName})
    `);

  const schema: Record<string, string> = {};
  for (const col of columns) {
    const name = col.name as string;
    const type = col.type as string;
    const notnull = col.notnull as number;
    const pk = col.pk as number;

    let typeStr = type || 'TEXT';
    if (notnull) typeStr += ' NOT NULL';
    if (pk) typeStr += ' PRIMARY KEY';

    schema[name] = typeStr;
  }

  return schema;
};

/**
 * Get all table names
 */
export function getSupportedTables(): string[] {
  return [...SUPPORTED_TABLES];
}

/**
 * Validate if table is supported
 */
export function isValidTable(tableName: string): boolean {
  return SUPPORTED_TABLES.includes(tableName as typeof SUPPORTED_TABLES[number]);
}

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!['csv', 'json'].includes(options.format)) {
    errors.push(`Invalid format: ${options.format}. Must be 'csv' or 'json'`);
  }

  if (!options.tables || options.tables.length === 0) {
    errors.push('At least one table must be specified');
  }

  for (const table of options.tables) {
    if (!isValidTable(table)) {
      errors.push(`Unsupported table: ${table}. Supported tables: ${SUPPORTED_TABLES.join(', ')}`);
    }
  }

  if (options.filters) {
    for (const filter of options.filters) {
      if (!isValidTable(filter.table)) {
        errors.push(`Filter table not supported: ${filter.table}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate import options
 */
export function validateImportOptions(options: ImportOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!['csv', 'json'].includes(options.format)) {
    errors.push(`Invalid format: ${options.format}. Must be 'csv' or 'json'`);
  }

  if (!['insert', 'update', 'upsert', 'replace'].includes(options.mode)) {
    errors.push(`Invalid mode: ${options.mode}. Must be 'insert', 'update', 'upsert', or 'replace'`);
  }

  if (options.batchSize && (options.batchSize < 1 || options.batchSize > 1000)) {
    errors.push(`Invalid batchSize: ${options.batchSize}. Must be between 1 and 1000`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Export data from database
 */
export async function _exportData(options: ExportOptions): Promise<ExportResult> {
  const validation = validateExportOptions(options);
  if (!validation.valid) {
    throw new Error(`Invalid export options: ${validation.errors.join(', ')}`);
  }

  logger.info('Starting data export', {
    category: 'data-import-export',
    format: options.format,
    tables: options.tables,
  });

  const db = await getDatabaseAsync();
  const data: Record<string, unknown[]> = {};
  const schema: Record<string, string> = {};
  const stats: Record<string, number> = {};
  let totalRows = 0;

  for (const table of options.tables) {
    try {
      // Get table schema if requested
      if (options.includeSchema) {
        schema[table] = JSON.stringify(await getTableSchema(table));
      }

      // Build query with filters
      let query = `SELECT * FROM ${table}`;
      const params: unknown[] = [];

      const filter = options.filters?.find(f => f.table === table);
      if (filter?.where) {
        query += ` WHERE ${filter.where}`;
        if (filter.params) {
          params.push(...filter.params);
        }
      }

      if (filter?.limit) {
        query += ` LIMIT ${filter.limit}`;
      }

      // Execute query
      const rows = db.queryRows(query, params);
      data[table] = rows;
      stats[table] = rows.length;
      totalRows += rows.length;

      logger.debug(`Exported ${rows.length} rows from ${table}`, {
        category: 'data-import-export',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to export table ${table}: ${message}`, error, {
        category: 'data-import-export',
      });
      throw new Error(`Failed to export table ${table}: ${message}`);
    }
  }

  const result: ExportResult = {
    format: options.format,
    tables: options.tables,
    data,
    stats: {
      totalRows,
      tables: stats,
    },
    exportedAt: new Date().toISOString(),
  };

  if (options.includeSchema) {
    result.schema = schema;
  }

  logger.info('Data export completed', {
    category: 'data-import-export',
    totalRows,
    tableCount: options.tables.length,
  });

  return result;
}

/**
 * Convert export result to CSV format
 */
export function exportToCSV(data: ExportResult): string {
  const lines: string[] = [];

  for (const [table, rows] of Object.entries(data.data)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      lines.push(`# Table: ${table} (empty)`);
      lines.push('');
      continue;
    }

    lines.push(`# Table: ${table}`);
    lines.push('');

    // Header row
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    lines.push(headers.join(','));

    // Data rows
    for (const row of rows) {
      const values = headers.map(header => {
        const value = (row as Record<string, unknown>)[header];
        if (value === null || value === undefined) {
          return '';
        }

        const strValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
      lines.push(values.join(','));
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert export result to JSON format
 */
export function exportToJSON(data: ExportResult): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Parse CSV data
 */
export function parseCSV(csv: string): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};
  let currentTable = '';
  let headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  const lines = csv.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      // Save current table if any
      if (currentTable && headers.length > 0) {
        result[currentTable] = [...rows];
        rows.length = 0;
        headers = [];
      }
      continue;
    }

    // Table header
    if (trimmedLine.startsWith('# Table:')) {
      // Save previous table if any
      if (currentTable && headers.length > 0) {
        result[currentTable] = [...rows];
        rows.length = 0;
      }

      currentTable = trimmedLine.replace('# Table:', '').trim();
      continue;
    }

    // Header row (CSV headers)
    if (currentTable && headers.length === 0 && !trimmedLine.startsWith('#')) {
      headers = parseCSVLine(trimmedLine);
      continue;
    }

    // Data row
    if (currentTable && headers.length > 0 && !trimmedLine.startsWith('#')) {
      const values = parseCSVLine(trimmedLine);
      const row: Record<string, unknown> = {};

      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const value = values[i];

        // Try to parse as JSON for arrays/objects
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            row[header] = JSON.parse(value);
          } catch {
            row[header] = value;
          }
        } else if (value === '') {
          row[header] = null;
        } else {
          row[header] = value;
        }
      }

      rows.push(row);
    }
  }

  // Don't forget the last table
  if (currentTable && headers.length > 0) {
    result[currentTable] = [...rows];
  }

  return result;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse JSON data
 */
export function parseJSON(json: string): ExportResult {
  return JSON.parse(json);
}

/**
 * Import data into database
 */
export async function _importData(
  data: ExportResult,
  options: ImportOptions,
): Promise<ImportResult> {
  const validation = validateImportOptions(options);
  if (!validation.valid) {
    throw new Error(`Invalid import options: ${validation.errors.join(', ')}`);
  }

  logger.info('Starting data import', {
    category: 'data-import-export',
    format: options.format,
    mode: options.mode,
    dryRun: options.dryRun,
    tables: data.tables,
  });

  const db = await getDatabaseAsync();
  const errors: string[] = [];
  const stats: ImportResult['stats'] = {
    totalRows: 0,
    tables: {},
  };

  // Handle replace mode
  if (options.mode === 'replace') {
    if (!options.dryRun) {
      for (const table of data.tables) {
        try {
          db.exec(`DELETE FROM ${table}`);
          logger.debug(`Cleared table ${table} for replace mode`, {
            category: 'data-import-export',
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to clear table ${table}: ${message}`);
        }
      }
    }
  }

  // Import data for each table
  for (const [table, rows] of Object.entries(data.data)) {
    if (!isValidTable(table)) {
      errors.push(`Unsupported table: ${table}`);
      continue;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      logger.debug(`Skipping empty table: ${table}`, {
        category: 'data-import-export',
      });
      continue;
    }

    stats.tables[table] = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      // Get table schema to find primary key
      const schema = await getTableSchema(table);
      const primaryKey = Object.entries(schema).find(([_, type]) =>
        type.includes('PRIMARY KEY'),
      )?.[0];

      // Process in batches
      const batchSize = options.batchSize || 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        for (const row of batch) {
          try {
            if (!options.dryRun) {
              await importRow(db, table, row as Record<string, unknown>, options.mode, primaryKey, options.skipDuplicates);
            }

            // Update stats (simulate for dry run)
            if (options.mode === 'insert') {
              stats.tables[table]!.inserted++;
            } else if (options.mode === 'replace') {
              stats.tables[table]!.inserted++;
            } else if (options.mode === 'update' || options.mode === 'upsert') {
              // Check if row exists (simplified)
              stats.tables[table]!.updated++;
            }

            stats.totalRows++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            stats.tables[table]!.errors++;
            errors.push(`Failed to import row into ${table}: ${message}`);

            if (errors.length > 100) {
              throw new Error(`Too many errors (>100), stopping import`);
            }
          }
        }
      }

      logger.debug(`Imported table ${table}`, {
        category: 'data-import-export',
        stats: stats.tables[table],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to import table ${table}: ${message}`, error, {
        category: 'data-import-export',
      });
      errors.push(`Failed to import table ${table}: ${message}`);
    }
  }

  const result: ImportResult = {
    success: errors.length === 0,
    mode: options.mode,
    dryRun: options.dryRun || false,
    stats,
    errors,
    importedAt: new Date().toISOString(),
  };

  logger.info('Data import completed', {
    category: 'data-import-export',
    success: result.success,
    totalRows: result.stats.totalRows,
    errorCount: result.errors.length,
  });

  return result;
}

/**
 * Import a single row
 */
async function importRow(
  db: Awaited<ReturnType<typeof getDatabaseAsync>>,
  table: string,
  row: Record<string, unknown>,
  mode: ImportMode,
  primaryKey: string | undefined,
  skipDuplicates: boolean | undefined,
): Promise<void> {
  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = columns.map(() => '?').join(', ');

  if (mode === 'insert') {
    // Check for duplicate if skipping
    if (skipDuplicates && primaryKey) {
      const pkValue = row[primaryKey];
      const existing = db.queryRows(
        `SELECT 1 FROM ${table} WHERE ${primaryKey} = ? LIMIT 1`,
        [pkValue],
      );

      if (existing.length > 0) {
        throw new Error('Duplicate record');
      }
    }

    db.exec(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values,
    );
  } else if (mode === 'update') {
    if (!primaryKey) {
      throw new Error('Update mode requires a primary key');
    }

    const pkValue = row[primaryKey];
    const setClause = columns
      .filter(col => col !== primaryKey)
      .map(col => `${col} = ?`)
      .join(', ');

    const setValues = values.filter((_, idx) => columns[idx] !== primaryKey);

    if (setClause) {
      db.exec(
        `UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`,
        [...setValues, pkValue],
      );
    }
  } else if (mode === 'upsert') {
    if (!primaryKey) {
      throw new Error('Upsert mode requires a primary key');
    }

    // Check if exists
    const pkValue = row[primaryKey];
    const existing = db.queryRows(
      `SELECT 1 FROM ${table} WHERE ${primaryKey} = ? LIMIT 1`,
      [pkValue],
    );

    if (existing.length > 0) {
      // Update
      const setClause = columns
        .filter(col => col !== primaryKey)
        .map(col => `${col} = ?`)
        .join(', ');

      const setValues = values.filter((_, idx) => columns[idx] !== primaryKey);

      if (setClause) {
        db.exec(
          `UPDATE ${table} SET ${setClause} WHERE ${primaryKey} = ?`,
          [...setValues, pkValue],
        );
      }
    } else {
      // Insert
      db.exec(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values,
      );
    }
  } else if (mode === 'replace') {
    // Direct insert (table should be cleared first)
    db.exec(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values,
    );
  }
}

/**
 * Create a backup before import
 */
export async function createBackup(backupName?: string): Promise<string> {
  const db = await getDatabaseAsync();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = backupName || `backup-${timestamp}`;

  try {
    db.exec(`VACUUM INTO '/tmp/${name}.db'`);
    logger.info(`Created backup: ${name}`, {
      category: 'data-import-export',
    });
    return name;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to create backup: ${message}`, error, {
      category: 'data-import-export',
    });
    throw new Error(`Failed to create backup: ${message}`);
  }
}

/**
 * Get export file name
 */
export function getExportFileName(format: ExportFormat, tables: string[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tablesStr = tables.length > 3
    ? `${tables.length}-tables`
    : tables.join('-');
  return `${tablesStr}-export-${timestamp}.${format}`;
}

/**
 * Export data from database (public wrapper)
 */
export async function exportData(options: ExportOptions): Promise<ExportResult> {
  return _exportData(options);
}

/**
 * Import data to database (public wrapper)
 */
export async function importData(
  data: string,
  options: ImportOptions
): Promise<ImportResult> {
  const parsedData: ExportResult = JSON.parse(data);
  return await _importData(parsedData, options);
}

/**
 * CSV Export Utility
 * 
 * Provides functionality to export data as CSV files
 * 
 * Features:
 * - Convert arrays of objects to CSV
 * - Handle special characters and escaping
 * - Support for custom column selection
 * - Blob-based file download
 * - Date formatting options
 */

import { logger } from './logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface CSVColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export type CSVData = Record<string, unknown>[];

// ============================================================================
// CSV Export Functions
// ============================================================================

/**
 * Escape CSV value
 * - Wrap in quotes if contains comma, quote, or newline
 * - Escape quotes by doubling them
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  
  // Check if value needs escaping
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Format date value for CSV
 */
function formatCSVDate(value: unknown): string {
  if (!value) return '';
  
  const date = value instanceof Date ? value : new Date(String(value));
  
  if (isNaN(date.getTime())) return String(value);
  
  // Format: YYYY-MM-DD HH:mm:ss
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format number value for CSV
 */
function formatCSVNumber(value: unknown): string {
  if (value === null || value === undefined) return '';
  
  const num = Number(value);
  if (isNaN(num)) return String(value);
  
  // Format with 2 decimal places
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Convert data to CSV string
 */
export function convertToCSV(
  data: CSVData,
  columns?: CSVColumn[]
): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Determine columns
  let cols: CSVColumn[] = columns || [];
  
  if (cols.length === 0) {
    // Auto-detect columns from first object
    const keys = Object.keys(data[0]).filter(key => !key.startsWith('_'));
    cols = keys.map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
    }));
  }

  // Build header row
  const headers = cols.map(col => escapeCSVValue(col.label)).join(',');
  
  // Build data rows
  const rows = data.map(item => {
    return cols.map(col => {
      let value = item[col.key];
      
      // Apply custom format if provided
      if (col.format) {
        value = col.format(value);
      }
      
      // Auto-format dates and numbers
      if (col.key.toLowerCase().includes('date') || col.key.toLowerCase().includes('time') || col.key.toLowerCase().includes('created') || col.key.toLowerCase().includes('updated')) {
        value = formatCSVDate(value);
      } else if (typeof value === 'number') {
        value = formatCSVNumber(value);
      } else {
        value = escapeCSVValue(value);
      }
      
      return value;
    }).join(',');
  });

  // Add BOM for Excel UTF-8 compatibility
  return '\uFEFF' + [headers, ...rows].join('\n');
}

/**
 * Trigger file download
 */
export function downloadCSV(
  csv: string,
  filename: string
): void {
  // Create blob
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportToCSV(
  data: CSVData,
  filename: string,
  columns?: CSVColumn[]
): void {
  const csv = convertToCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Generate default filename with timestamp
 */
export function generateCSVFilename(prefix: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.csv`;
}

/**
 * Copy CSV to clipboard
 */
export async function copyCSVToClipboard(
  data: CSVData,
  columns?: CSVColumn[]
): Promise<void> {
  try {
    const csv = convertToCSV(data, columns);
    await navigator.clipboard.writeText(csv);
  } catch (_error) {
    logger.error('Failed to copy CSV to clipboard:', error);
    throw new Error('Failed to copy to clipboard');
  }
}

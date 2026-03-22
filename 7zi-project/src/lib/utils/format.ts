/**
 * Format utilities - formatFileSize, formatNumber
 * 
 * @module lib/utils/format
 */

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted file size
 * @example
 * formatFileSize(1024) // "1.0 KB"
 * formatFileSize(1048576) // "1.0 MB"
 */
export function formatFileSize(bytes: number, decimals: number = 1): string {
  if (isNaN(bytes)) return 'NaN B';
  if (!isFinite(bytes)) return 'Infinity B';
  if (bytes === 0) return `0 B`;

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);
  const formattedValue = value.toFixed(decimals).replace(/\.0+$|(\.\d*?)0+$/, '$1'); // Remove trailing zeros

  return `${formattedValue} ${units[i]}`;
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @param {string} separator - Thousands separator (default: ",")
 * @returns {string} Formatted number
 * @example
 * formatNumber(1000000) // "1,000,000"
 * formatNumber(1000000, ".") // "1.000.000"
 */
export function formatNumber(num: number, separator: string = ','): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

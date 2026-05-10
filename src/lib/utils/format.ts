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
  if (isNaN(bytes)) return 'NaN B'
  if (!isFinite(bytes)) return 'Infinity B'
  if (bytes === 0) return `${(0).toFixed(decimals)} B`

  // Handle negative values - format the absolute value and prepend minus sign
  const isNegative = bytes < 0
  const absBytes = Math.abs(bytes)

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const k = 1024
  const i = Math.floor(Math.log(absBytes) / Math.log(k))

  const value = absBytes / Math.pow(k, i)
  const formattedValue = value.toFixed(decimals)

  return `${isNegative ? '-' : ''}${formattedValue} ${units[i]}`
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
  // Handle negative numbers
  const isNegative = num < 0
  let absNum = Math.abs(num)
  
  // Split into integer and decimal parts
  const parts = absNum.toString().split('.')
  const integerPart = parts[0]
  const decimalPart = parts[1]
  
  // Format integer part with thousands separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
  
  // Recombine with decimal part if exists
  const result = decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
  
  return isNegative ? `-${result}` : result
}
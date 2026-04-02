/**
 * Browser utilities
 *
 * @module lib/utils/browser
 */

import { isClient } from './env'

/**
 * Get the current query parameters as an object
 * @returns {Record<string, string>} Query parameters
 * @example
 * // URL: ?search=hello&page=1
 * getQueryParams() // { search: "hello", page: "1" }
 */
export function getQueryParams(): Record<string, string> {
  if (!isClient()) return {}

  const params = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/**
 * Update query parameters in URL
 * @param {Record<string, string | number | boolean | undefined | null>} params - Parameters to update
 * @param {boolean} replace - Whether to replace current history state (default: true)
 * @example
 * updateQueryParams({ search: 'hello', page: 2 });
 */
export function updateQueryParams(
  params: Record<string, string | number | boolean | undefined | null>,
  replace: boolean = true
): void {
  if (!isClient()) return

  const url = new URL(window.location.href)
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value === undefined || value === null) {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, String(value))
    }
  })

  const method = replace ? 'replaceState' : 'pushState'
  window.history[method]({ path: url.href }, '', url.href)
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 * @example
 * await copyToClipboard('Hello, world!');
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isClient()) return false

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
      return true
    } finally {
      document.body.removeChild(textArea)
    }
  } catch (error) {
    // Clipboard API may fail if user denied permission or in certain contexts
    return false
  }
}

/**
 * Read text from clipboard
 * @returns {Promise<string | null>} Clipboard content or null
 * @example
 * const text = await readFromClipboard();
 */
export async function readFromClipboard(): Promise<string | null> {
  if (!isClient()) return null

  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText()
    }
    return null
  } catch (error) {
    // Clipboard API may fail if user denied permission or in certain contexts
    return null
  }
}

/**
 * Download a file from URL
 * @param {string} url - File URL
 * @param {string} filename - Optional filename
 * @example
 * downloadFile('https://example.com/file.pdf', 'document.pdf');
 */
export function downloadFile(url: string, filename?: string): void {
  const link = document.createElement('a')
  link.href = url
  if (filename) {
    link.download = filename
  }
  link.click()
  link.remove()
}

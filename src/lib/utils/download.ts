/**
 * File Download Utilities
 * Helper functions for downloading files in the browser
 * 
 * 注意：此模块的 downloadFile 用于将内容保存为文件
 * 如需从 URL 下载文件，请使用 @/lib/utils/browser 中的 downloadFile
 */

import { logger } from '../logger'

/**
 * Download a file with the given content and filename
 * 用于将文本内容保存为文件下载
 * 
 * @param content - File content to save
 * @param filename - Name of the downloaded file
 * @param mimeType - MIME type of the file (default: 'text/plain')
 * @example
 * downloadFile('Hello, world!', 'hello.txt');
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  // Create a blob with the content
  const blob = new Blob([content], { type: mimeType })

  // Create a temporary URL for the blob
  const url = window.URL.createObjectURL(blob)

  // Create a temporary link element
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  // Append to document, click, and remove
  document.body.appendChild(link)
  link.click()

  // Clean up
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Download a file from a URL
 */
export async function downloadFromUrl(url: string, filename?: string): Promise<void> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const content = await response.text()
    const actualFilename = filename || getFilenameFromUrl(url)
    const mimeType = response.headers.get('content-type') || 'text/plain'

    downloadFile(content, actualFilename, mimeType)
  } catch (error) {
    logger.error('Failed to download file:', error)
    throw error
  }
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop()

    return filename || 'download'
  } catch (error) {
    return 'download'
  }
}

/**
 * Download JSON data as a file
 */
export function downloadJson(data: unknown, filename: string): void {
  const content = JSON.stringify(data, null, 2)
  downloadFile(content, filename, 'application/json')
}

/**
 * Download CSV data as a file
 */
export function downloadCsv(content: string, filename: string): void {
  downloadFile(content, filename, 'text/csv; charset=utf-8')
}

/**
 * Create a download link for large files
 * This is useful for chunked downloads
 */
export function createDownloadLink(
  url: string,
  filename: string,
  target: '_blank' | '_self' = '_self'
): HTMLAnchorElement {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = target

  return link
}

/**
 * Trigger a chunked download for large files
 */
export async function downloadInChunks(
  url: string,
  filename: string,
  chunkSize: number = 1024 * 1024 // 1MB chunks
): Promise<void> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const chunks: Uint8Array[] = []
    let receivedLength = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      chunks.push(value)
      receivedLength += value.length
    }

    // Combine all chunks
    const combinedChunks = new Uint8Array(receivedLength)
    let position = 0

    for (const chunk of chunks) {
      combinedChunks.set(chunk, position)
      position += chunk.length
    }

    // Create blob and download
    const blob = new Blob([combinedChunks])
    downloadFile(URL.createObjectURL(blob), filename, 'application/octet-stream')
  } catch (error) {
    logger.error('Failed to download in chunks:', error)
    throw error
  }
}

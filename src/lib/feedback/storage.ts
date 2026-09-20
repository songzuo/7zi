/**
 * Feedback Storage Service
 * Handles file uploads for feedback attachments
 */

import { logger } from '../logger'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = process.env.FEEDBACK_UPLOAD_DIR || 'public/uploads/feedback'
const MAX_FILE_SIZE = parseInt(process.env.FEEDBACK_MAX_FILE_SIZE || String(10 * 1024 * 1024)) // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

export interface UploadedFile {
  id: string
  filename: string
  url: string
  size: number
  mimetype: string
}

/**
 * Ensure upload directory exists
 */
function ensureUploadDir(): void {
  const dir = path.resolve(process.cwd(), UPLOAD_DIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Validate file type
 */
export function isAllowedFileType(mimetype: string): boolean {
  return ALLOWED_TYPES.includes(mimetype.toLowerCase())
}

/**
 * Validate file size
 */
export function isAllowedFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

/**
 * Upload a single file
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  // Validate file type
  if (!isAllowedFileType(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}`)
  }

  // Validate file size
  if (!isAllowedFileSize(file.size)) {
    throw new Error(`File too large: ${file.size} bytes. Max: ${MAX_FILE_SIZE} bytes`)
  }

  ensureUploadDir()

  const id = randomUUID()
  const ext = path.extname(file.name) || '.jpg'
  const filename = `${id}${ext}`
  const filepath = path.resolve(process.cwd(), UPLOAD_DIR, filename)

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Write file
  await fs.promises.writeFile(filepath, buffer)

  const url = `/uploads/feedback/${filename}`

  logger.info('Feedback file uploaded', {
    category: 'feedback',
    fileId: id,
    filename: file.name,
    size: file.size,
    mimetype: file.type,
    url,
  })

  return {
    id,
    filename: file.name,
    url,
    size: file.size,
    mimetype: file.type,
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  const results: UploadedFile[] = []

  for (const file of files) {
    try {
      const uploaded = await uploadFile(file)
      results.push(uploaded)
    } catch (error) {
      logger.error('Failed to upload feedback file', {
        category: 'feedback',
        filename: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Continue with other files
    }
  }

  return results
}

/**
 * Delete an uploaded file
 */
export async function deleteFile(url: string): Promise<boolean> {
  try {
    const filename = path.basename(url)
    const filepath = path.resolve(process.cwd(), UPLOAD_DIR, filename)

    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath)
      logger.info('Feedback file deleted', {
        category: 'feedback',
        filename,
      })
      return true
    }
    return false
  } catch (error) {
    logger.error('Failed to delete feedback file', {
      category: 'feedback',
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * Get upload configuration
 */
export function getUploadConfig() {
  return {
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: Math.round(MAX_FILE_SIZE / (1024 * 1024)),
    allowedTypes: ALLOWED_TYPES,
    uploadDir: UPLOAD_DIR,
  }
}

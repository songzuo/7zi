import { NextRequest, NextResponse } from 'next/server'
/**
 * Multimodal API - Image Processing Endpoint
 * POST /api/multimodal/image
 *
 * @openapi
 * /api/multimodal/image:
 *   post:
 *     summary: Process and analyze images
 *     description: Upload and process images with optional compression and provider selection
 *     tags:
 *       - Multimodal
 *       - Image
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to process
 *               provider:
 *                 type: string
 *                 description: Specific provider to use (optional)
 *               maxSize:
 *                 type: integer
 *                 description: Maximum file size in bytes (default: 10MB)
 *               compress:
 *                 type: boolean
 *                 description: Whether to compress the image (default: false)
 *               quality:
 *                 type: number
 *                 description: Compression quality 0.0-1.0 (default: 0.8)
 *     responses:
 *       200:
 *         description: Image processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Invalid request or image validation failed
 *       413:
 *         description: Image too large
 *       415:
 *         description: Unsupported image format
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get available image processing providers
 *     description: List all available image processing providers with their health status
 *     tags:
 *       - Multimodal
 *       - Image
 *     responses:
 *       200:
 *         description: List of providers
 *       500:
 *         description: Internal server error
 */

import { getMultimodalService } from '@/lib/multimodal/multimodal-service'
import { validateImage, compressImage } from '@/lib/multimodal/image-utils'
import type { ImageUploadOptions } from '@/lib/multimodal/types'
import {
  createValidationError,
  createErrorResponse,
  createBadRequestError,
  ErrorType,
} from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'
import { createSuccessResponse } from '@/lib/api/utils'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 second timeout

// ============================================
// Validation Schemas
// ============================================

interface ImageProcessingFormData {
  image: File
  provider?: string
  maxSize?: number
  compress?: boolean
  quality?: number
}

interface ImageProcessingOptions extends ImageUploadOptions {
  provider?: string
}

/**
 * Validate and parse form data
 */
function validateAndParseFormData(
  formData: FormData
): { success: true; data: ImageProcessingFormData } | { success: false; error: string } {
  const file = formData.get('image') as File

  if (!file) {
    return { success: false, error: 'No image file provided' }
  }

  if (!(file instanceof File)) {
    return { success: false, error: 'Invalid image file' }
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `Unsupported image type: ${file.type}. Supported types: ${allowedTypes.join(', ')}`,
    }
  }

  // Parse options
  const maxSizeStr = formData.get('maxSize') as string
  const maxSize = maxSizeStr ? parseInt(maxSizeStr, 10) : 10 * 1024 * 1024

  if (isNaN(maxSize) || maxSize <= 0) {
    return { success: false, error: 'Invalid maxSize value' }
  }

  const compress = formData.get('compress') === 'true'
  const qualityStr = formData.get('quality') as string
  const quality = qualityStr ? parseFloat(qualityStr) : 0.8

  if (isNaN(quality) || quality < 0 || quality > 1) {
    return { success: false, error: 'Invalid quality value (must be between 0 and 1)' }
  }

  return {
    success: true,
    data: {
      image: file,
      provider: formData.get('provider') as string | undefined,
      maxSize,
      compress,
      quality,
    },
  }
}

/**
 * Enhanced error logging for image processing
 */
function logImageProcessingError(
  stage: string,
  error: unknown,
  context: {
    filename?: string
    fileType?: string
    fileSize?: number
    provider?: string
    compress?: boolean
    quality?: number
    [key: string]: unknown
  }
): void {
  logger.error(
    `Image processing error at ${stage}`,
    error instanceof Error ? error : new Error(String(error)),
    context
  )
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = performance.now()

  try {
    logger.info('Image processing request received', {
      requestId,
      category: 'multimodal',
    })

    // Parse form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (error) {
      logger.error(
        'Failed to parse form data',
        error instanceof Error ? error : new Error(String(error)),
        {
          requestId,
          category: 'multimodal',
        }
      )
      return createBadRequestError(
        'Failed to parse form data - ensure Content-Type is multipart/form-data'
      )
    }

    // Validate form data
    const validation = validateAndParseFormData(formData)

    if (!validation.success) {
      logger.warn('Image validation failed', {
        requestId,
        error: validation.error,
        category: 'multimodal',
      })
      return createValidationError(validation.error)
    }

    const { image, provider, maxSize, compress, quality } = validation.data

    // Log file details (without exposing full content)
    logger.info('Image file validated', {
      requestId,
      filename: image.name,
      fileType: image.type,
      fileSize: image.size,
      maxSize,
      compress,
      quality,
      provider: provider || 'default',
      category: 'multimodal',
    })

    // Read image buffer
    let buffer: Buffer
    try {
      buffer = Buffer.from(await image.arrayBuffer())
    } catch (error) {
      logImageProcessingError('buffer-creation', error, {
        filename: image.name,
        fileType: image.type,
      })
      return createBadRequestError('Failed to read image file')
    }

    // Validate image content
    const validation_result = await validateImage(buffer, maxSize)

    if (!validation_result.valid) {
      logger.warn('Image content validation failed', {
        requestId,
        error: validation_result.error,
        filename: image.name,
        category: 'multimodal',
      })

      if (validation_result.error?.includes('too large')) {
        return createValidationError(
          `Image file too large. Maximum size: ${((maxSize || 10 * 1024 * 1024) / (1024 * 1024)).toFixed(2)}MB`,
          { maxSize: maxSize || 10 * 1024 * 1024, providedSize: buffer.length }
        )
      }

      if (validation_result.error?.includes('format')) {
        return createValidationError(`Invalid image format: ${validation_result.error}`, {
          filename: image.name,
          fileType: image.type,
        })
      }

      return createValidationError(validation_result.error || 'Image validation failed')
    }

    // Compress if requested
    let processedBuffer: Buffer = buffer
    let compressionInfo: { originalSize: number; compressedSize: number; ratio: number } | undefined

    if (compress) {
      try {
        logger.debug('Starting image compression', {
          requestId,
          originalSize: buffer.length,
          quality,
          category: 'multimodal',
        })

        processedBuffer = await compressImage(buffer, quality)

        compressionInfo = {
          originalSize: buffer.length,
          compressedSize: processedBuffer.length,
          ratio: processedBuffer.length / buffer.length,
        }

        logger.info('Image compression completed', {
          requestId,
          ...compressionInfo,
          category: 'multimodal',
        })
      } catch (error) {
        logImageProcessingError('compression', error, {
          filename: image.name,
          quality,
          compress: true,
        })
        return createBadRequestError(
          'Failed to compress image - try without compression or lower quality'
        )
      }
    }

    // Get multimodal service
    let service
    try {
      service = getMultimodalService()
    } catch (error) {
      logger.error(
        'Failed to get multimodal service',
        error instanceof Error ? error : new Error(String(error)),
        {
          requestId,
          provider,
          category: 'multimodal',
        }
      )
      return createServiceUnavailableError('Image processing service temporarily unavailable')
    }

    // Process image
    let result
    try {
      logger.debug('Starting image processing', {
        requestId,
        provider: provider || 'default',
        category: 'multimodal',
      })

      result = await service.processImage(processedBuffer, { maxSize, compress, quality }, provider)

      const processingTime = performance.now() - startTime

      logger.info('Image processing completed', {
        requestId,
        provider: result.provider,
        processingTime: processingTime.toFixed(2),
        success: result.success,
        category: 'multimodal',
      })
    } catch (error) {
      logImageProcessingError('processing', error, {
        filename: image.name,
        provider,
        compress,
        quality,
      })
      return createBadRequestError('Failed to process image - please try again or contact support')
    }

    // Check result
    if (!result.success) {
      logImageProcessingError('result-check', result.error, {
        filename: image.name,
        provider: result.provider,
      })

      // Map specific error types to appropriate responses
      const errorLower = (result.error || '').toLowerCase()

      if (errorLower.includes('format') || errorLower.includes('unsupported')) {
        return createValidationError(`Unsupported image format: ${result.error}`, {
          filename: image.name,
          fileType: image.type,
        })
      }

      if (errorLower.includes('size') || errorLower.includes('too large')) {
        return createValidationError(`Image size issue: ${result.error}`, {
          filename: image.name,
          fileSize: buffer.length,
        })
      }

      if (errorLower.includes('provider') || errorLower.includes('service')) {
        return createServiceUnavailableError(
          `Image processing provider unavailable: ${provider || 'default'}`
        )
      }

      return createBadRequestError(result.error || 'Image processing failed')
    }

    // Success response
    return createSuccessResponse({
      data: result.data,
      metadata: {
        originalSize: buffer.length,
        processedSize: processedBuffer.length,
        compressionRatio: compressionInfo?.ratio,
        filename: image.name,
        type: image.type,
        provider: result.provider,
        processingTime: ((performance.now() - startTime) / 1000).toFixed(3),
      },
    })
  } catch (error) {
    logImageProcessingError('unexpected', error, {
      category: 'multimodal',
    })
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

// ============================================
// GET Handler
// ============================================

export async function GET() {
  try {
    const service = getMultimodalService()
    const providers = service.getProviders()

    // Get health status for each provider
    let health
    try {
      health = await service.healthCheck()
    } catch (error) {
      logger.error(
        'Failed to get provider health status',
        error instanceof Error ? error : new Error(String(error)),
        {
          category: 'multimodal',
        }
      )
      // Continue with empty health status
      health = {}
    }

    const providerStatus = providers.map(p => ({
      ...p,
      healthy: health[p.name] || false,
      status: health[p.name] ? 'operational' : 'unavailable',
    }))

    return createSuccessResponse({
      providers: providerStatus,
      total: providerStatus.length,
      operational: providerStatus.filter(p => p.healthy).length,
    })
  } catch (error) {
    logger.error(
      'Provider listing error',
      error instanceof Error ? error : new Error(String(error)),
      {
        category: 'multimodal',
      }
    )
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to list image processing providers')
    )
  }
}

/**
 * Create service unavailable error helper
 */
function createServiceUnavailableError(message: string) {
  const error = new Error(message)
  ;(error as { type?: string; statusCode?: number }).type = ErrorType.SERVICE_UNAVAILABLE
  ;(error as { type?: string; statusCode?: number }).statusCode = 503
  return createErrorResponse(error as Error)
}

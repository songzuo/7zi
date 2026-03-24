/**
 * Multimodal API - Audio Transcription Endpoint
 * POST /api/multimodal/audio
 *
 * @openapi
 * /api/multimodal/audio:
 *   post:
 *     summary: Transcribe audio files
 *     description: Upload and transcribe audio files with various options
 *     tags:
 *       - Multimodal
 *       - Audio
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file to transcribe
 *               provider:
 *                 type: string
 *                 description: Specific provider to use (optional)
 *               language:
 *                 type: string
 *                 description: Language code (default: zh-CN)
 *               model:
 *                 type: string
 *                 description: Model to use for transcription
 *               timestamps:
 *                 type: boolean
 *                 description: Include timestamps in result (default: false)
 *               speakerDiarization:
 *                 type: boolean
 *                 description: Identify different speakers (default: false)
 *     responses:
 *       200:
 *         description: Audio transcribed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     segments:
 *                       type: array
 *                       items:
 *                         type: object
 *                     language:
 *                       type: string
 *                     duration:
 *                       type: number
 *                     confidence:
 *                       type: number
 *                 metadata:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Invalid request or audio validation failed
 *       413:
 *         description: Audio file too large
 *       415:
 *         description: Unsupported audio format
 *       503:
 *         description: Transcription service unavailable
 *       504:
 *         description: Transcription timeout
 *   get:
 *     summary: Get available audio transcription providers
 *     description: List all available audio transcription providers with their health status
 *     tags:
 *       - Multimodal
 *       - Audio
 *     responses:
 *       200:
 *         description: List of providers
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMultimodalService } from '@/lib/multimodal/multimodal-service';
import { audioToBuffer, validateAudio, formatDuration } from '@/lib/multimodal/audio-utils';
import type {
  AudioTranscriptionOptions,
  AudioTranscriptionResult,
  TranscriptionSegment
} from '@/lib/multimodal/types';
import {
  createValidationError,
  createErrorResponse,
  createBadRequestError,
  ErrorType,
} from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';
import { createSuccessResponse } from '@/lib/api/utils';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minute timeout for longer audio files

// ============================================
// Type Definitions
// ============================================

/**
 * Formatted transcription data for API response
 */
interface FormattedTranscriptionData {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  durationFormatted: string;
  confidence: number;
  speakerDiarization: boolean;
  wordCount: number;
}

/**
 * Metadata for transcription response
 */
interface TranscriptionMetadata {
  originalSize: number;
  detectedType?: string;
  filename: string;
  type: string;
  duration: number;
  language: string;
  model: string;
}

// ============================================
// Constants and Configuration
// ============================================

const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB default max size
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
];

const SUPPORTED_LANGUAGES = [
  'zh-CN', 'zh-TW', 'en-US', 'en-GB', 'ja-JP', 'ko-KR', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR',
];

// ============================================
// Validation Schemas
// ============================================

interface AudioProcessingFormData {
  audio: File;
  provider?: string;
  language: string;
  model?: string;
  timestamps: boolean;
  speakerDiarization: boolean;
}

/**
 * Validate and parse form data
 */
function validateAndParseFormData(formData: FormData): { success: true; data: AudioProcessingFormData } | { success: false; error: string } {
  const file = formData.get('audio') as File;

  if (!file) {
    return { success: false, error: 'No audio file provided' };
  }

  if (!(file instanceof File)) {
    return { success: false, error: 'Invalid audio file' };
  }

  // Validate file type
  if (!SUPPORTED_AUDIO_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Unsupported audio type: ${file.type}. Supported types: ${SUPPORTED_AUDIO_TYPES.join(', ')}`,
    };
  }

  // Validate file size
  if (file.size > MAX_AUDIO_SIZE) {
    return {
      success: false,
      error: `Audio file too large. Maximum size: ${(MAX_AUDIO_SIZE / (1024 * 1024)).toFixed(0)}MB`,
    };
  }

  // Parse options
  const language = (formData.get('language') as string) || 'zh-CN';

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      error: `Unsupported language: ${language}. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`,
    };
  }

  const model = formData.get('model') as string || undefined;
  const timestamps = formData.get('timestamps') === 'true';
  const speakerDiarization = formData.get('speakerDiarization') === 'true';

  return {
    success: true,
    data: {
      audio: file,
      provider: formData.get('provider') as string || undefined,
      language,
      model,
      timestamps,
      speakerDiarization,
    },
  };
}

/**
 * Enhanced error logging for audio processing
 */
function logAudioProcessingError(
  stage: string,
  error: unknown,
  context: {
    filename?: string;
    fileType?: string;
    fileSize?: number;
    duration?: number;
    provider?: string;
    language?: string;
    model?: string;
    timestamps?: boolean;
    speakerDiarization?: boolean;
  }
): void {
  logger.error(`Audio processing error at ${stage}`, error instanceof Error ? error : new Error(String(error)), context);
}

/**
 * Format transcription result with enhanced error handling
 */
function formatTranscriptionResult(
  result: AudioTranscriptionResult,
  buffer: Buffer,
  file: File,
  validation: { valid: boolean; error?: string; detectedType?: string }
): {
  data: FormattedTranscriptionData;
  metadata: TranscriptionMetadata;
} {
  try {
    // Format segments with durations
    const segments = result.data?.segments?.map((seg: TranscriptionSegment) => ({
      ...seg,
      startFormatted: seg.start !== undefined ? formatDuration(seg.start) : undefined,
      endFormatted: seg.end !== undefined ? formatDuration(seg.end) : undefined,
    }));

    return {
      data: {
        text: result.data?.text || '',
        segments: segments || [],
        language: result.data?.language || result.data?.language_code || 'unknown',
        duration: result.data?.duration || result.data?.audio_duration || 0,
        durationFormatted: result.data?.duration ? formatDuration(result.data.duration) : '',
        confidence: result.data?.confidence || result.data?.confidence_score || 0,
        speakerDiarization: result.data?.speakerDiarization || false,
        wordCount: result.data?.text ? result.data.text.split(/\s+/).length : 0,
      },
      metadata: {
        originalSize: buffer.length,
        detectedType: validation.detectedType,
        filename: file.name,
        type: file.type,
        duration: result.data?.duration || 0,
        language: result.data?.language || 'unknown',
        model: result.data?.model || 'default',
      },
    };
  } catch (error) {
    try {
      logger.error('Failed to format transcription result', error instanceof Error ? error : new Error(String(error)));
    } catch (err) {}

    // Return basic format on error
    return {
      data: {
        text: result.data?.text || '',
        segments: [],
        language: 'unknown',
        duration: 0,
        durationFormatted: '',
        confidence: 0,
        speakerDiarization: false,
        wordCount: 0,
      },
      metadata: {
        originalSize: buffer.length,
        detectedType: validation.detectedType,
        filename: file.name,
        type: file.type,
        duration: 0,
        language: 'unknown',
        model: 'default',
      },
    };
  }
}

/**
 * Create service unavailable error helper
 */
function createServiceUnavailableError(message: string) {
  const error = new Error(message);
  (error as { type?: string; statusCode?: number }).type = ErrorType.SERVICE_UNAVAILABLE;
  (error as { type?: string; statusCode?: number }).statusCode = 503;
  return createErrorResponse(error as Error);
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    try {
      logger.info('Audio transcription request received', {
        requestId,
      });
    } catch (err) {
      // Logger might not be available in test environment
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      logger.error('Failed to parse form data', error instanceof Error ? error : new Error(String(error)), {
        requestId,
      });
      return createBadRequestError('Failed to parse form data - ensure Content-Type is multipart/form-data');
    }

    // Validate form data
    const validation = validateAndParseFormData(formData);

    if (!validation.success) {
      try {
        logger.warn('Audio validation failed', {
          requestId,
          error: validation.error,
        });
      } catch (err) {}
      return createValidationError(validation.error);
    }

    const { audio, provider, language, model, timestamps, speakerDiarization } = validation.data;

    // Log file details
    try {
      logger.info('Audio file validated', {
        requestId,
        filename: audio.name,
        fileType: audio.type,
        fileSize: audio.size,
        language,
        provider: provider || 'default',
        model: model || 'default',
        timestamps,
        speakerDiarization,
      });
    } catch (err) {}

    // Read audio buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await audio.arrayBuffer());
    } catch (error) {
      logAudioProcessingError('buffer-creation', error, {
        filename: audio.name,
        fileType: audio.type,
      });
      return createBadRequestError('Failed to read audio file');
    }

    // Validate audio content
    const contentValidation = await validateAudio(buffer);

    if (!contentValidation.valid) {
      try {
        logger.warn('Audio content validation failed', {
          requestId,
          error: contentValidation.error,
          filename: audio.name,
        });
      } catch (err) {}

      return createValidationError(
        contentValidation.error || 'Audio validation failed',
        { filename: audio.name, fileType: audio.type }
      );
    }

    // Get multimodal service
    let service;
    try {
      service = getMultimodalService();
    } catch (error) {
      try {
        logger.error('Failed to get multimodal service', error instanceof Error ? error : new Error(String(error)), {
          requestId,
          provider,
        });
      } catch (err) {}
      return createServiceUnavailableError('Audio transcription service temporarily unavailable');
    }

    // Process audio
    let result;
    try {
      try {
        logger.debug('Starting audio transcription', {
          requestId,
          provider: provider || 'default',
          language,
          model,
          timestamps,
          speakerDiarization,
        });
      } catch (err) {}

      const options: AudioTranscriptionOptions = {
        language,
        model,
        timestamps,
        speakerDiarization,
      };

      result = await service.processAudio(buffer, options, provider);

      const processingTime = performance.now() - startTime;

      try {
        logger.info('Audio transcription completed', {
          requestId,
          provider: result.provider,
          processingTime: processingTime.toFixed(2),
          success: result.success,
          duration: result.data?.duration || 0,
        });
      } catch (err) {}
    } catch (error) {
      logAudioProcessingError('transcription', error, {
        filename: audio.name,
        provider,
        language,
        model,
        timestamps,
        speakerDiarization,
      });

      // Check for timeout
      if (error instanceof Error && error.name === 'AbortError' || error instanceof Error && error.message.includes('timeout')) {
        return createServiceUnavailableError(
          'Audio transcription timeout - file may be too long or service is overloaded'
        );
      }

      return createBadRequestError('Failed to transcribe audio - please try again or contact support');
    }

    // Check result
    if (!result.success) {
      logAudioProcessingError('result-check', result.error, {
        filename: audio.name,
        provider: result.provider,
        language,
      });

      // Map specific error types to appropriate responses
      const errorLower = (result.error || '').toLowerCase();

      if (errorLower.includes('format') || errorLower.includes('unsupported')) {
        return createValidationError(
          `Unsupported audio format: ${result.error}`,
          { filename: audio.name, fileType: audio.type }
        );
      }

      if (errorLower.includes('size') || errorLower.includes('too large')) {
        return createValidationError(
          `Audio size issue: ${result.error}`,
          { filename: audio.name, fileSize: buffer.length }
        );
      }

      if (errorLower.includes('language') || errorLower.includes('not supported')) {
        return createValidationError(
          `Language not supported: ${result.error}`,
          { language }
        );
      }

      if (errorLower.includes('provider') || errorLower.includes('service')) {
        return createServiceUnavailableError(
          `Audio transcription provider unavailable: ${provider || 'default'}`
        );
      }

      return createBadRequestError(result.error || 'Audio transcription failed');
    }

    // Format and return result
    const formatted = formatTranscriptionResult(result, buffer, audio, contentValidation);

    return createSuccessResponse({
      data: formatted.data,
      metadata: {
        ...formatted.metadata,
        provider: result.provider,
        processingTime: ((performance.now() - startTime) / 1000).toFixed(3),
      },
    });

  } catch (error) {
    logAudioProcessingError('unexpected', error, {});
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'));
  }
}

// ============================================
// GET Handler
// ============================================

export async function GET() {
  try {
    const service = getMultimodalService();
    const providers = service.getProviders();

    // Filter for audio providers
    const audioProviders = providers.filter(p =>
      p.capabilities.includes('audio') || p.capabilities.includes('transcription')
    );

    // Get health status for each provider
    let health;
    try {
      health = await service.healthCheck();
    } catch (error) {
      try {
        logger.error('Failed to get provider health status', error instanceof Error ? error : new Error(String(error)));
      } catch (err) {}
      // Continue with empty health status
      health = {};
    }

    const providerStatus = audioProviders.map(p => ({
      ...p,
      healthy: health[p.name] || false,
      status: health[p.name] ? 'operational' : 'unavailable',
    }));

    return createSuccessResponse({
      providers: providerStatus,
      total: providerStatus.length,
      operational: providerStatus.filter(p => p.healthy).length,
      supportedLanguages: SUPPORTED_LANGUAGES,
      supportedTypes: SUPPORTED_AUDIO_TYPES,
      maxSizeBytes: MAX_AUDIO_SIZE,
      maxSizeMB: (MAX_AUDIO_SIZE / (1024 * 1024)).toFixed(0),
    });
  } catch (error) {
    try {
      logger.error('Audio provider listing error', error instanceof Error ? error : new Error(String(error)));
    } catch (err) {}
    return createErrorResponse(error instanceof Error ? error : new Error('Failed to list audio transcription providers'));
  }
}

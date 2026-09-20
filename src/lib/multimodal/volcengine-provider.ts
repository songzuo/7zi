/**
 * Volcengine Multimodal AI Provider
 * Supports image recognition and audio transcription
 */

import { logger } from '../logger'
import type {
  ImageRecognitionResult,
  AudioTranscriptionResult,
  AudioTranscriptionOptions,
  ImageData,
  TranscriptionData,
  VolcengineImageResponse,
  VolcengineTranscriptionResponse,
} from './types'

export class VolcengineProvider {
  private apiKey: string
  private region: string
  private endpoint: string

  constructor(config: { apiKey: string; region?: string }) {
    this.apiKey = config.apiKey
    this.region = config.region || 'cn-north-1'
    this.endpoint = `https://open.volcengineapi.com`
  }

  /**
   * Recognize objects and text in image
   */
  async recognizeImage(imageBuffer: Buffer): Promise<ImageRecognitionResult> {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/image/recognition`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(imageBuffer),
      })

      if (!response.ok) {
        throw new Error(`Volcengine API error: ${response.statusText}`)
      }

      const result: VolcengineImageResponse = await response.json()

      // Transform Volcengine response to our format
      const imageData: ImageData = {
        objects:
          result.objects?.map(obj => ({
            label: obj.label,
            confidence: obj.score,
            bbox: {
              x: obj.bbox.xmin,
              y: obj.bbox.ymin,
              width: obj.bbox.xmax - obj.bbox.xmin,
              height: obj.bbox.ymax - obj.bbox.ymin,
            },
          })) || [],
        text: result.ocr_text,
        tags: result.tags || [],
        confidence: result.confidence || 0.9,
      }

      return {
        success: true,
        data: imageData,
      }
    } catch (error) {
      logger.error('Volcengine image recognition error', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: AudioTranscriptionOptions = {}
  ): Promise<AudioTranscriptionResult> {
    try {
      const formData = new FormData()
      formData.append('audio', new Blob([new Uint8Array(audioBuffer)]))
      formData.append('language', options.language || 'zh-CN')
      formData.append('timestamps', String(options.timestamps || false))
      formData.append('speaker_diarization', String(options.speakerDiarization || false))

      const response = await fetch(`${this.endpoint}/api/v1/audio/transcription`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Volcengine API error: ${response.statusText}`)
      }

      const result: VolcengineTranscriptionResponse = await response.json()

      const transcriptionData: TranscriptionData = {
        text: result.text,
        segments: result.segments?.map(seg => ({
          text: seg.text,
          start: seg.start_time,
          end: seg.end_time,
          speaker: seg.speaker,
          confidence: seg.confidence,
        })),
        language: result.language,
        duration: result.duration,
        confidence: result.confidence || 0.9,
      }

      return {
        success: true,
        data: transcriptionData,
      }
    } catch (error) {
      logger.error('Volcengine audio transcription error', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/v1/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}

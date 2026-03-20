/**
 * Bailian Multimodal AI Provider
 * Alternative provider for image and audio processing
 */

import { logger } from '../logger';
import type {
  ImageRecognitionResult,
  AudioTranscriptionResult,
  AudioTranscriptionOptions,
  ImageData,
  TranscriptionData,
  BailianImageResponse,
  BailianTranscriptionResponse,
} from './types';

export class BailianProvider {
  private apiKey: string;
  private endpoint: string;

  constructor(config: { apiKey: string; endpoint?: string }) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'https://dashscope.aliyuncs.com/api/v1';
  }

  /**
   * Recognize objects and text in image
   */
  async recognizeImage(imageBuffer: Buffer): Promise<ImageRecognitionResult> {
    try {
      const formData = new FormData();
      formData.append('image', new Blob([new Uint8Array(imageBuffer)]));

      const response = await fetch(`${this.endpoint}/services/aigc/multimodal-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Bailian API error: ${response.statusText}`);
      }

      const result: BailianImageResponse = await response.json();

      // Transform Bailian response to our format
      const imageData: ImageData = {
        objects: result.output?.objects?.map((obj) => ({
          label: obj.name,
          confidence: obj.score,
          bbox: {
            x: obj.box.x,
            y: obj.box.y,
            width: obj.box.width,
            height: obj.box.height,
          },
        })) || [],
        text: result.output?.ocr_text,
        tags: result.output?.tags || [],
        confidence: result.output?.confidence || 0.9,
      };

      return {
        success: true,
        data: imageData,
      };
    } catch (error) {
      logger.error('Bailian image recognition error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(audioBuffer)]));

      const response = await fetch(`${this.endpoint}/services/audio/asr/transcription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Bailian API error: ${response.statusText}`);
      }

      const result: BailianTranscriptionResponse = await response.json();

      const transcriptionData: TranscriptionData = {
        text: result.output?.text || '',
        segments: result.output?.sentences?.map((seg) => ({
          text: seg.text,
          start: seg.begin_time,
          end: seg.end_time,
          speaker: seg.speaker,
          confidence: seg.confidence,
        })),
        language: result.output?.language || 'zh-CN',
        duration: result.output?.duration || 0,
        confidence: result.output?.confidence || 0.9,
      };

      return {
        success: true,
        data: transcriptionData,
      };
    } catch (error) {
      logger.error('Bailian audio transcription error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/services/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

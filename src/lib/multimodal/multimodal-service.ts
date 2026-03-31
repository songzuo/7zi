/**
 * Multimodal AI Service
 * Unified interface for image and audio processing
 */

import { logger } from '../logger';
import { VolcengineProvider } from './volcengine-provider';
import { BailianProvider } from './bailian-provider';
import type {
  ImageUploadOptions,
  ImageRecognitionResult,
  AudioTranscriptionOptions,
  AudioTranscriptionResult,
  MultimodalProvider,
  ProviderImplementation,
  TranscriptionData,
} from './types';

export class MultimodalService {
  private providers: Map<string, ProviderImplementation> = new Map();
  private defaultProvider: string;

  constructor() {
    // Initialize providers from environment variables
    this.initializeProviders();
    this.defaultProvider = this.getPreferredProvider();
  }

  private initializeProviders(): void {
    // Volcengine
    const volcengineKey = process.env.VOLCENGINE_API_KEY;
    if (volcengineKey) {
      this.providers.set('volcengine', new VolcengineProvider({
        apiKey: volcengineKey,
        region: process.env.VOLCENGINE_REGION || 'cn-north-1',
      }));
    }

    // Bailian
    const bailianKey = process.env.BAILIAN_API_KEY;
    if (bailianKey) {
      this.providers.set('bailian', new BailianProvider({
        apiKey: bailianKey,
        endpoint: process.env.BAILIAN_ENDPOINT,
      }));
    }
  }

  private getPreferredProvider(): string {
    const preferred = process.env.MULTIMODAL_PREFERRED_PROVIDER;
    if (preferred && this.providers.has(preferred)) {
      return preferred;
    }
    // Return first available provider
    return Array.from(this.providers.keys())[0] || '';
  }

  /**
   * Get active provider
   */
  private getProvider(name?: string) {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not available`);
    }
    return { provider, name: providerName };
  }

  /**
   * Get all available providers
   */
  getProviders(): MultimodalProvider[] {
    return Array.from(this.providers.keys()).map(name => ({
      name,
      type: name as 'volcengine' | 'bailian' | 'minimax',
      config: {},
      status: 'active',
      capabilities: [],
    }));
  }

  /**
   * Process image: upload and recognize
   */
  async processImage(
    imageBuffer: Buffer,
    options: ImageUploadOptions = {},
    providerName?: string
  ): Promise<ImageRecognitionResult> {
    try {
      // Validate image size
      const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
      if (imageBuffer.length > maxSize) {
        throw new Error(`Image size exceeds maximum allowed size of ${maxSize} bytes`);
      }

      // Get provider and process
      const { provider, name } = this.getProvider(providerName);
      const result = await provider.recognizeImage(imageBuffer);

      if (result.success && result.data) {
        result.data.tags = [...result.data.tags, `provider:${name}`];
      }

      return result;
    } catch (_error) {
      logger.error('Image processing error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process audio: upload and transcribe
   */
  async processAudio(
    audioBuffer: Buffer,
    options: AudioTranscriptionOptions = {},
    providerName?: string
  ): Promise<AudioTranscriptionResult> {
    try {
      // Validate audio size
      const maxAudioSize = (options.maxSize || 50 * 1024 * 1024); // 50MB default
      if (audioBuffer.length > maxAudioSize) {
        throw new Error(`Audio size exceeds maximum allowed size of ${maxAudioSize} bytes`);
      }

      // Get provider and process
      const { provider, name } = this.getProvider(providerName);
      const result = await provider.transcribeAudio(audioBuffer, options);

      if (result.success && result.data) {
        (result.data as TranscriptionData).tags = [...result.data.segments?.map((s: { text: string }) => s.text) || [], `provider:${name}`];
      }

      return result;
    } catch (_error) {
      logger.error('Audio processing error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Switch default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not available`);
    }
    this.defaultProvider = name;
  }
}

// Singleton instance
let multimodalService: MultimodalService | null = null;

export function getMultimodalService(): MultimodalService {
  if (!multimodalService) {
    multimodalService = new MultimodalService();
  }
  return multimodalService;
}

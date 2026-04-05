/**
 * STTRouter - 语音转文字路由器
 *
 * 集成到 multi-model router 模式，支持多提供商路由和自动降级
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type {
  STTProvider,
  STTRouterConfig,
  STTRouteResult,
  TranscriptionResult,
  TranscriptionWithSpeaker,
  WhisperConfig,
  StreamTranscriptionConfig,
  AudioEventListener,
  TranscriptionEvent,
  SupportedLanguage,
} from './types'
import { WhisperClient } from './WhisperClient'
import { TranscriptionStream } from './TranscriptionStream'

/**
 * 浏览器原生语音识别配置
 */
interface BrowserSTTConfig {
  language: SupportedLanguage
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
}

/**
 * STTRouter - 语音转文字路由器
 */
export class STTRouter {
  private config: Required<STTRouterConfig>
  private providers: Map<STTProvider, any> = new Map()
  private currentProvider: STTProvider
  private isInitialized = false

  constructor(config: STTRouterConfig) {
    this.config = {
      defaultProvider: config.defaultProvider,
      fallbackProviders: config.fallbackProviders || [],
      languageMapping: config.languageMapping || {},
      timeout: config.timeout || 30000,
    }
    this.currentProvider = this.config.defaultProvider
  }

  /**
   * 初始化路由器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // 初始化 Whisper 客户端
    const whisperClient = new WhisperClient({
      endpoint: process.env.NEXT_PUBLIC_WHISPER_ENDPOINT || 'https://api.openai.com',
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      useWASM: false,
    })

    // 检查 Whisper 是否可用
    const whisperAvailable = await whisperClient.isAvailable()
    if (whisperAvailable) {
      this.providers.set('whisper', whisperClient)
    }

    // 检查浏览器原生语音识别是否可用
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.providers.set('browser', null) // 浏览器原生不需要实例
    }

    // 如果默认提供商不可用，尝试使用备用提供商
    if (!this.providers.has(this.currentProvider)) {
      for (const fallback of this.config.fallbackProviders) {
        if (this.providers.has(fallback)) {
          this.currentProvider = fallback
          break
        }
      }
    }

    this.isInitialized = true
  }

  /**
   * 转录音频（完整音频）
   */
  async transcribe(
    audioBlob: Blob,
    whisperConfig: WhisperConfig,
    preferredProvider?: STTProvider
  ): Promise<STTRouteResult> {
    await this.initialize()

    const provider = preferredProvider || this.currentProvider
    let usedFallback = false

    try {
      // 尝试使用指定提供商
      const result = await this.transcribeWithProvider(
        provider,
        audioBlob,
        whisperConfig
      )

      return {
        provider,
        result,
        usedFallback,
      }
    } catch (error) {
      // 如果失败，尝试备用提供商
      console.warn(`Provider ${provider} failed, trying fallback`, error)

      for (const fallback of this.config.fallbackProviders) {
        if (fallback === provider) continue

        try {
          const result = await this.transcribeWithProvider(
            fallback,
            audioBlob,
            whisperConfig
          )

          usedFallback = true
          this.currentProvider = fallback

          return {
            provider: fallback,
            result,
            usedFallback,
          }
        } catch (fallbackError) {
          console.warn(`Fallback provider ${fallback} also failed`, fallbackError)
        }
      }

      // 所有提供商都失败
      throw new Error('All STT providers failed')
    }
  }

  /**
   * 使用指定提供商转录
   */
  private async transcribeWithProvider(
    provider: STTProvider,
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionResult> {
    switch (provider) {
      case 'whisper':
        return this.transcribeWithWhisper(audioBlob, whisperConfig)

      case 'browser':
        return this.transcribeWithBrowser(audioBlob, whisperConfig)

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  /**
   * 使用 Whisper 转录
   */
  private async transcribeWithWhisper(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionResult> {
    const client = this.providers.get('whisper')
    if (!client) {
      throw new Error('Whisper client not available')
    }

    return client.transcribe(audioBlob, whisperConfig)
  }

  /**
   * 使用浏览器原生语音识别转录
   */
  private async transcribeWithBrowser(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
        reject(new Error('Browser speech recognition not available'))
        return
      }

      const SpeechRecognition = (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.lang = this.mapLanguage(whisperConfig.language)
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        const confidence = event.results[0][0].confidence

        resolve({
          text: transcript,
          language: whisperConfig.language,
          confidence,
          timestamp: Date.now(),
          isFinal: true,
        })
      }

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`))
      }

      recognition.onend = () => {
        // 如果没有结果，视为错误
        reject(new Error('Speech recognition ended without result'))
      }

      // 播放音频并识别
      const audio = new Audio(URL.createObjectURL(audioBlob))
      audio.onended = () => {
        recognition.start()
      }
      audio.onerror = () => {
        reject(new Error('Failed to play audio'))
      }
      audio.play()
    })
  }

  /**
   * 带说话人分离的转录
   */
  async transcribeWithDiarization(
    audioBlob: Blob,
    whisperConfig: WhisperConfig,
    preferredProvider?: STTProvider
  ): Promise<STTRouteResult & { results: TranscriptionWithSpeaker[] }> {
    await this.initialize()

    const provider = preferredProvider || this.currentProvider
    const usedFallback = false

    try {
      const client = this.providers.get('whisper')
      if (!client) {
        throw new Error('Whisper client not available')
      }

      const results = await client.transcribeWithDiarization(
        audioBlob,
        whisperConfig
      )

      return {
        provider,
        result: results[0] || {
          text: '',
          language: whisperConfig.language,
          confidence: 0,
          timestamp: Date.now(),
          isFinal: true,
        },
        results,
        usedFallback,
      }
    } catch (error) {
      console.warn('Diarization failed, falling back to regular transcription', error)

      // 降级到普通转录
      const routeResult = await this.transcribe(audioBlob, whisperConfig, provider)

      return {
        ...routeResult,
        results: [
          {
            ...routeResult.result,
            speaker: {
              speakerId: 'speaker_1',
              label: '说话人 1',
              color: '#3B82F6',
            },
          },
        ],
        usedFallback: true,
      }
    }
  }

  /**
   * 创建实时转录流
   */
  async createStream(
    config: StreamTranscriptionConfig,
    preferredProvider?: STTProvider
  ): Promise<TranscriptionStream> {
    await this.initialize()

    const provider = preferredProvider || this.currentProvider

    if (provider !== 'websocket') {
      throw new Error(`Provider ${provider} does not support streaming`)
    }

    const stream = new TranscriptionStream(config)
    await stream.connect()

    return stream
  }

  /**
   * 映射语言代码
   */
  private mapLanguage(language: SupportedLanguage): string {
    const mapping = this.config.languageMapping[language]
    if (mapping) {
      return mapping
    }

    const defaultMapping: Record<SupportedLanguage, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      'zh-en': 'zh-CN',
    }

    return defaultMapping[language] || 'en-US'
  }

  /**
   * 获取当前提供商
   */
  getCurrentProvider(): STTProvider {
    return this.currentProvider
  }

  /**
   * 获取可用提供商列表
   */
  getAvailableProviders(): STTProvider[] {
    return Array.from(this.providers.keys())
  }

  /**
   * 切换提供商
   */
  async switchProvider(provider: STTProvider): Promise<void> {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} is not available`)
    }

    this.currentProvider = provider
  }

  /**
   * 检查提供商是否可用
   */
  isProviderAvailable(provider: STTProvider): boolean {
    return this.providers.has(provider)
  }

  /**
   * 销毁资源
   */
  async destroy(): Promise<void> {
    const providerEntries = Array.from(this.providers.entries())
    for (const [provider, client] of providerEntries) {
      if (client && typeof client.destroy === 'function') {
        await client.destroy()
      }
    }

    this.providers.clear()
    this.isInitialized = false
  }
}

/**
 * 创建全局 STT 路由器实例
 */
export const createSTTRouter = (config?: Partial<STTRouterConfig>): STTRouter => {
  return new STTRouter({
    defaultProvider: config?.defaultProvider || 'whisper',
    fallbackProviders: config?.fallbackProviders || ['browser'],
    languageMapping: config?.languageMapping,
    timeout: config?.timeout || 30000,
  })
}

/**
 * 默认 STT 路由器实例
 */
export const sttRouter = createSTTRouter()
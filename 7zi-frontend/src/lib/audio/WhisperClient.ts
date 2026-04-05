/**
 * WhisperClient - Whisper 语音识别客户端
 *
 * 提供 Whisper 模型的语音识别功能
 * 支持本地和远程模式
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type {
  WhisperConfig,
  WhisperModelSize,
  TranscriptionResult,
  TranscriptionWithSpeaker,
  SupportedLanguage,
} from './types'

/**
 * Whisper 响应
 */
interface WhisperResponse {
  text: string
  language: string
  segments?: Array<{
    id: number
    seek: number
    start: number
    end: number
    text: string
    tokens: number[]
    temperature: number
    avg_logprob: number
    compression_ratio: number
    no_speech_prob: number
    speaker?: string
  }>
}

/**
 * Whisper 错误
 */
export class WhisperError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'WhisperError'
  }
}

/**
 * WhisperClient 配置
 */
export interface WhisperClientConfig {
  /** Whisper API 端点 */
  endpoint: string
  /** API 密钥 */
  apiKey?: string
  /** 是否使用 WASM 模式（本地运行） */
  useWASM?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
  /** 重试次数 */
  retryAttempts?: number
}

/**
 * WhisperClient - Whisper 客户端
 */
export class WhisperClient {
  private config: Required<Omit<WhisperClientConfig, 'useWASM'>> & {
    useWASM: boolean
  }
  private wasmModel: any = null // Whisper WASM 模型实例

  constructor(config: WhisperClientConfig) {
    this.config = {
      endpoint: config.endpoint,
      apiKey: config.apiKey || '',
      useWASM: config.useWASM || false,
      timeout: config.timeout || 60000,
      retryAttempts: config.retryAttempts || 3,
    }
  }

  /**
   * 初始化 WASM 模型
   */
  private async initWASM(): Promise<void> {
    if (this.wasmModel) {
      return
    }

    try {
      // 动态导入 Whisper WASM 模块
      const { Whisper } = await import('@xenova/transformers')
      this.wasmModel = await Whisper.from_pretrained('openai/whisper-tiny', {
        quantized: true,
        progress_callback: (progress: any) => {
          // 可以在这里显示加载进度
          console.log('Whisper WASM loading:', progress)
        },
      })
    } catch (error) {
      throw new WhisperError(
        'Failed to initialize Whisper WASM model',
        'WASM_INIT_ERROR',
        error
      )
    }
  }

  /**
   * 转录音频（完整音频）
   */
  async transcribe(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionResult> {
    if (this.config.useWASM) {
      return this.transcribeWASM(audioBlob, whisperConfig)
    } else {
      return this.transcribeAPI(audioBlob, whisperConfig)
    }
  }

  /**
   * 使用 WASM 模型转录
   */
  private async transcribeWASM(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionResult> {
    try {
      await this.initWASM()

      // 将 Blob 转换为音频 URL
      const audioUrl = URL.createObjectURL(audioBlob)

      // 运行转录
      const output = await this.wasmModel(audioUrl, {
        language: whisperConfig.language === 'zh-en' ? 'chinese' : whisperConfig.language,
        task: whisperConfig.translate ? 'translate' : 'transcribe',
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      })

      // 清理 URL
      URL.revokeObjectURL(audioUrl)

      // 解析结果
      return {
        text: output.text?.trim() || '',
        language: whisperConfig.language,
        confidence: 0.9, // WASM 模型不提供置信度，使用默认值
        timestamp: Date.now(),
        isFinal: true,
      }
    } catch (error) {
      throw new WhisperError(
        'WASM transcription failed',
        'WASM_TRANSCRIBE_ERROR',
        error
      )
    }
  }

  /**
   * 使用 API 转录
   */
  private async transcribeAPI(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionResult> {
    const formData = new FormData()
    formData.append('file', audioBlob)
    formData.append('model', whisperConfig.modelSize)
    formData.append('language', whisperConfig.language)
    formData.append('response_format', 'verbose_json')

    if (whisperConfig.temperature) {
      formData.append('temperature', whisperConfig.temperature.toString())
    }

    const headers: Record<string, string> = {}
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await this.makeRequest<WhisperResponse>(
      `${this.config.endpoint}/v1/audio/transcriptions`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    )

    return {
      text: response.text?.trim() || '',
      language: response.language as SupportedLanguage,
      confidence: this.calculateConfidence(response),
      timestamp: Date.now(),
      isFinal: true,
    }
  }

  /**
   * 带说话人分离的转录
   */
  async transcribeWithDiarization(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionWithSpeaker[]> {
    // 如果使用 WASM，需要分块处理
    if (this.config.useWASM) {
      return this.transcribeWithDiarizationWASM(audioBlob, whisperConfig)
    }

    // 使用 API 进行说话人分离
    return this.transcribeWithDiarizationAPI(audioBlob, whisperConfig)
  }

  /**
   * WASM 模式下的说话人分离（简化版）
   */
  private async transcribeWithDiarizationWASM(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionWithSpeaker[]> {
    // 先进行转录
    const result = await this.transcribe(audioBlob, whisperConfig)

    // 简化版说话人分离：根据段落划分
    const segments = result.text.split(/[。！？.!?\n]+/).filter(s => s.trim())
    const results: TranscriptionWithSpeaker[] = []

    // 交替分配说话人（实际应用中应该使用专门的说话人分离算法）
    segments.forEach((segment, index) => {
      if (segment.trim()) {
        results.push({
          ...result,
          text: segment.trim(),
          speaker: {
            speakerId: index % 2 === 0 ? 'speaker_1' : 'speaker_2',
            label: index % 2 === 0 ? '说话人 1' : '说话人 2',
            color: index % 2 === 0 ? '#3B82F6' : '#10B981',
          },
          isFinal: true,
        })
      }
    })

    return results
  }

  /**
   * API 模式下的说话人分离
   */
  private async transcribeWithDiarizationAPI(
    audioBlob: Blob,
    whisperConfig: WhisperConfig
  ): Promise<TranscriptionWithSpeaker[]> {
    const formData = new FormData()
    formData.append('file', audioBlob)
    formData.append('model', whisperConfig.modelSize)
    formData.append('language', whisperConfig.language)
    formData.append('diarization', 'true')

    const headers: Record<string, string> = {}
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await this.makeRequest<WhisperResponse>(
      `${this.config.endpoint}/v1/audio/transcriptions`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    )

    // 解析带说话人信息的片段
    const results: TranscriptionWithSpeaker[] = []

    if (response.segments) {
      response.segments.forEach((segment) => {
        results.push({
          text: segment.text.trim(),
          language: whisperConfig.language,
          confidence: 1 - segment.no_speech_prob,
          timestamp: Date.now(),
          startTime: segment.start,
          endTime: segment.end,
          isFinal: true,
          speaker: segment.speaker
            ? {
                speakerId: segment.speaker,
                label: `说话人 ${segment.speaker}`,
                color: this.getSpeakerColor(segment.speaker),
              }
            : {
                speakerId: 'unknown',
                label: '未知说话人',
                color: '#9CA3AF',
              },
        })
      })
    }

    return results
  }

  /**
   * 获取说话人颜色
   */
  private getSpeakerColor(speakerId: string): string {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // yellow
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
    ]
    const hash = speakerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(response: WhisperResponse): number {
    if (!response.segments || response.segments.length === 0) {
      return 0.9
    }

    // 基于 no_speech_prob 计算平均置信度
    const avgNoSpeechProb =
      response.segments.reduce((sum, seg) => sum + seg.no_speech_prob, 0) /
      response.segments.length

    return 1 - avgNoSpeechProb
  }

  /**
   * 发起 HTTP 请求（带重试）
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new WhisperError(
          errorData.error?.message || `HTTP ${response.status}`,
          `HTTP_${response.status}`,
          errorData
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof WhisperError) {
        throw error
      }

      // 网络错误，尝试重试
      if (attempt < this.config.retryAttempts) {
        console.warn(`Whisper request failed, retrying (${attempt}/${this.config.retryAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        return this.makeRequest(url, options, attempt + 1)
      }

      throw new WhisperError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR',
        error
      )
    }
  }

  /**
   * 检查模型是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (this.config.useWASM) {
      try {
        await this.initWASM()
        return true
      } catch {
        return false
      }
    }

    try {
      const response = await fetch(`${this.config.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 获取支持的模型列表
   */
  async getSupportedModels(): Promise<WhisperModelSize[]> {
    if (this.config.useWASM) {
      return ['tiny', 'base', 'small', 'medium'] // WASM 仅支持小模型
    }

    try {
      const response = await fetch(`${this.config.endpoint}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await response.json()
      return data.data?.map((m: any) => m.id) || ['tiny', 'base', 'small']
    } catch {
      return ['tiny', 'base', 'small']
    }
  }

  /**
   * 销毁资源
   */
  async destroy(): Promise<void> {
    if (this.wasmModel) {
      try {
        await this.wasmModel.dispose()
        this.wasmModel = null
      } catch (error) {
        console.error('Failed to dispose Whisper WASM model:', error)
      }
    }
  }
}

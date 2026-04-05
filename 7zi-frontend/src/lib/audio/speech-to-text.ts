/**
 * Speech-to-Text (STT) - 语音转文字服务
 *
 * 支持实时流式转录和批量转录，使用 Web Audio API 采集音频
 * 目标准确率 >95%
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type {
  TranscriptionResult,
  TranscriptionWithSpeaker,
  TranscriptionEvent,
  AudioEventListener,
  WhisperConfig,
  SupportedLanguage,
  AudioFormat,
} from './types'
import { AudioProcessor } from './AudioProcessor'
import {
  getLanguageCode,
  generateId,
  float32ToInt16,
  audioBufferToBlob,
} from './utils'

/**
 * STT 配置选项
 */
export interface STTOptions {
  /** 语言 */
  language?: SupportedLanguage
  /** 是否启用实时转录 */
  realtime?: boolean
  /** 是否启用说话人分离 */
  enableDiarization?: boolean
  /** 模型配置 */
  model?: WhisperConfig
  /** WebSocket URL (用于实时转录) */
  websocketUrl?: string
  /** API 密钥 */
  apiKey?: string
  /** 音频格式 */
  audioFormat?: AudioFormat
}

/**
 * 实时转录配置
 */
export interface RealtimeTranscriptionConfig {
  /** 网络延迟阈值 (毫秒) */
  networkLatencyThreshold?: number
  /** 音频块大小 (毫秒) */
  chunkSize?: number
  /** 是否启用 VAD (语音活动检测) */
  enableVAD?: boolean
  /** VAD 静音阈值 (0-1) */
  vadThreshold?: number
}

/**
 * 批量转录配置
 */
export interface BatchTranscriptionConfig {
  /** 分片大小 (秒) */
  segmentSize?: number
  /** 重叠时间 (秒) */
  overlapSize?: number
  /** 最大并发数 */
  maxConcurrent?: number
}

/**
 * 语音转文字服务
 */
export class SpeechToText {
  private processor: AudioProcessor | null = null
  private websocket: WebSocket | null = null
  private listeners: Set<AudioEventListener> = new Set()
  private isTranscribing = false
  private config: Required<STTOptions>
  private realtimeConfig: Required<RealtimeTranscriptionConfig>
  private batchConfig: Required<BatchTranscriptionConfig>
  private partialResults: string[] = []
  private finalResults: TranscriptionWithSpeaker[] = []
  private sessionId: string = ''
  private audioBuffer: Float32Array[] = []
  private vadEnabled = false

  constructor(options: STTOptions = {}) {
    this.config = {
      language: options.language || 'zh',
      realtime: options.realtime ?? true,
      enableDiarization: options.enableDiarization ?? false,
      model: options.model || {
        modelSize: 'base',
        language: options.language || 'zh',
        translate: false,
        punctuation: true,
        temperature: 0,
      },
      websocketUrl:
        options.websocketUrl || process.env.NEXT_PUBLIC_STT_WEBSOCKET_URL || '',
      apiKey: options.apiKey || process.env.NEXT_PUBLIC_STT_API_KEY || '',
      audioFormat: options.audioFormat || 'wav',
    }

    this.realtimeConfig = {
      networkLatencyThreshold: 2000,
      chunkSize: 1000,
      enableVAD: options.realtime ?? true,
      vadThreshold: 0.01,
    }

    this.batchConfig = {
      segmentSize: 30,
      overlapSize: 2,
      maxConcurrent: 3,
    }

    this.sessionId = generateId()
  }

  /**
   * 初始化音频处理器
   */
  private async initProcessor(): Promise<void> {
    if (!this.processor) {
      this.processor = new AudioProcessor({
        sampleRate: 16000,
        channels: 1,
        silenceThreshold: this.realtimeConfig.vadThreshold,
        silenceDuration: 2000,
      })
    }
  }

  /**
   * 开始实时转录
   */
  async startRealtimeTranscription(
    config?: RealtimeTranscriptionConfig
  ): Promise<void> {
    if (this.isTranscribing) {
      throw new Error('Transcription already in progress')
    }

    if (config) {
      this.realtimeConfig = { ...this.realtimeConfig, ...config }
    }

    try {
      await this.initProcessor()
      await this.processor!.startRecording()

      this.isTranscribing = true
      this.vadEnabled = this.realtimeConfig.enableVAD

      // 启动 WebSocket 连接
      await this.connectWebSocket()

      // 开始处理音频流
      this.processAudioStream()

      this.emit({
        type: 'ready',
        timestamp: Date.now(),
      })
    } catch (error) {
      this.isTranscribing = false
      this.emit({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to start transcription',
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 停止实时转录
   */
  async stopRealtimeTranscription(): Promise<TranscriptionResult[]> {
    if (!this.isTranscribing) {
      return this.finalResults.map((r) => ({
        text: r.text,
        language: r.language,
        confidence: r.confidence,
        timestamp: r.timestamp,
        startTime: r.startTime,
        endTime: r.endTime,
        isFinal: r.isFinal,
      }))
    }

    this.isTranscribing = false

    // 停止录音
    if (this.processor) {
      await this.processor.stopRecording()
    }

    // 关闭 WebSocket
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    // 返回最终结果
    return this.finalResults.map((r) => ({
      text: r.text,
      language: r.language,
      confidence: r.confidence,
      timestamp: r.timestamp,
      startTime: r.startTime,
      endTime: r.endTime,
      isFinal: r.isFinal,
    }))
  }

  /**
   * 批量转录音频文件
   */
  async transcribeAudioFile(
    audioFile: File | Blob,
    config?: BatchTranscriptionConfig
  ): Promise<TranscriptionResult> {
    if (config) {
      this.batchConfig = { ...this.batchConfig, ...config }
    }

    try {
      // 将音频文件转换为 AudioBuffer
      const arrayBuffer = await audioFile.arrayBuffer()
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // 转换为 16kHz 单声道
      const convertedBuffer = this.convertTo16kHzMono(audioBuffer)

      // 如果文件较大，分片处理
      if (convertedBuffer.duration > this.batchConfig.segmentSize) {
        return await this.transcribeLargeAudio(convertedBuffer)
      }

      // 小文件直接转录
      return await this.transcribeSingleChunk(convertedBuffer)
    } catch (error) {
      this.emit({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
        timestamp: Date.now(),
      })
      throw error
    }
  }

  /**
   * 转录 AudioBuffer
   */
  async transcribeAudioBuffer(
    audioBuffer: AudioBuffer
  ): Promise<TranscriptionResult> {
    try {
      const convertedBuffer = this.convertTo16kHzMono(audioBuffer)
      return await this.transcribeSingleChunk(convertedBuffer)
    } catch (error) {
      throw new Error(`Failed to transcribe audio buffer: ${error}`)
    }
  }

  /**
   * 连接 WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    if (!this.config.websocketUrl) {
      throw new Error('WebSocket URL not configured')
    }

    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(
        `${this.config.websocketUrl}?session=${this.sessionId}&language=${getLanguageCode(this.config.language)}&api_key=${this.config.apiKey}`
      )

      this.websocket.onopen = () => {
        console.log('[STT] WebSocket connected')
        resolve()
      }

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data)
      }

      this.websocket.onerror = (error) => {
        console.error('[STT] WebSocket error:', error)
        reject(new Error('WebSocket connection failed'))
      }

      this.websocket.onclose = () => {
        console.log('[STT] WebSocket closed')
      }
    })
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      if (message.type === 'partial') {
        // 部分结果（实时）
        this.partialResults.push(message.text)
        this.emit({
          type: 'partial',
          result: {
            text: message.text,
            language: message.language || this.config.language,
            confidence: message.confidence || 0.9,
            timestamp: Date.now(),
            isFinal: false,
          },
          timestamp: Date.now(),
        })
      } else if (message.type === 'final') {
        // 最终结果
        const result: TranscriptionWithSpeaker = {
          text: message.text,
          language: message.language || this.config.language,
          confidence: message.confidence || 0.95,
          timestamp: Date.now(),
          startTime: message.start_time,
          endTime: message.end_time,
          isFinal: true,
          speaker: message.speaker
            ? {
                speakerId: message.speaker.id,
                label: message.speaker.name,
                color: message.speaker.color,
              }
            : undefined,
        }
        this.finalResults.push(result)
        this.emit({
          type: 'final',
          result,
          timestamp: Date.now(),
        })
      } else if (message.type === 'speaker_change') {
        // 说话人切换
        this.emit({
          type: 'speaker_change',
          result: {
            text: '',
            language: this.config.language,
            confidence: 1,
            timestamp: Date.now(),
            isFinal: false,
            speaker: {
              speakerId: message.speaker.id,
              label: message.speaker.name,
              color: message.speaker.color,
            },
          },
          timestamp: Date.now(),
        })
      } else if (message.type === 'error') {
        this.emit({
          type: 'error',
          error: message.error,
          timestamp: Date.now(),
        })
      }
    } catch (error) {
      console.error('[STT] Failed to parse WebSocket message:', error)
    }
  }

  /**
   * 处理音频流
   */
  private processAudioStream(): void {
    if (!this.processor) {
      return
    }

    let lastChunkTime = Date.now()

    // 定期发送音频块
    const intervalId = setInterval(() => {
      if (!this.isTranscribing) {
        clearInterval(intervalId)
        return
      }

      const now = Date.now()
      if (now - lastChunkTime >= this.realtimeConfig.chunkSize) {
        const audioData = this.processor.getAudioData()
        if (audioData && this.websocket?.readyState === WebSocket.OPEN) {
          // 转换为 Int16
          const int16Data = float32ToInt16(audioData)

          // 发送到服务器
          this.websocket.send(int16Data.buffer)
          lastChunkTime = now
        }
      }
    }, this.realtimeConfig.chunkSize / 2)
  }

  /**
   * 转换为 16kHz 单声道
   */
  private convertTo16kHzMono(audioBuffer: AudioBuffer): AudioBuffer {
    const offlineContext = new OfflineAudioContext(
      1, // 单声道
      Math.floor(audioBuffer.duration * 16000), // 16kHz 采样率
      16000
    )

    const source = offlineContext.createBufferSource()
    source.buffer = audioBuffer

    // 如果是立体声，混合为单声道
    if (audioBuffer.numberOfChannels > 1) {
      const channelMerger = offlineContext.createChannelMerger(1)
      source.connect(channelMerger)
      channelMerger.connect(offlineContext.destination)
    } else {
      source.connect(offlineContext.destination)
    }

    source.start()

    return offlineContext.startRendering()
  }

  /**
   * 转录单个音频块
   */
  private async transcribeSingleChunk(
    audioBuffer: AudioBuffer
  ): Promise<TranscriptionResult> {
    // 将 AudioBuffer 转换为 Blob
    const blob = await audioBufferToBlob(audioBuffer, this.config.audioFormat)
    const arrayBuffer = await blob.arrayBuffer()

    // 如果有 WebSocket URL，使用 WebSocket 批量转录
    if (this.config.websocketUrl) {
      return await this.transcribeViaWebSocket(arrayBuffer)
    }

    // 否则使用本地 Whisper（需要后端支持）
    return await this.transcribeLocally(arrayBuffer)
  }

  /**
   * 通过 WebSocket 转录
   */
  private async transcribeViaWebSocket(
    arrayBuffer: ArrayBuffer
  ): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(
        `${this.config.websocketUrl}?session=${generateId()}&language=${getLanguageCode(this.config.language)}&api_key=${this.config.apiKey}`
      )

      ws.onopen = () => {
        // 发送整个音频文件
        ws.send(arrayBuffer)
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'final') {
          ws.close()
          resolve({
            text: message.text,
            language: message.language || this.config.language,
            confidence: message.confidence || 0.95,
            timestamp: Date.now(),
            startTime: message.start_time,
            endTime: message.end_time,
            isFinal: true,
          })
        } else if (message.type === 'error') {
          ws.close()
          reject(new Error(message.error))
        }
      }

      ws.onerror = (error) => {
        ws.close()
        reject(new Error('WebSocket connection failed'))
      }

      // 超时处理
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
          reject(new Error('Transcription timeout'))
        }
      }, 60000) // 60秒超时
    })
  }

  /**
   * 本地转录（需要后端支持）
   */
  private async transcribeLocally(
    arrayBuffer: ArrayBuffer
  ): Promise<TranscriptionResult> {
    // 这里应该调用后端 API 进行转录
    // 暂时返回模拟数据
    return {
      text: '本地转录功能需要后端支持',
      language: this.config.language,
      confidence: 0,
      timestamp: Date.now(),
      isFinal: true,
    }
  }

  /**
   * 转录大音频文件（分片处理）
   */
  private async transcribeLargeAudio(
    audioBuffer: AudioBuffer
  ): Promise<TranscriptionResult> {
    const segmentSize = this.batchConfig.segmentSize
    const overlapSize = this.batchConfig.overlapSize
    const totalDuration = audioBuffer.duration

    const segments: { start: number; end: number }[] = []
    for (let start = 0; start < totalDuration; start += segmentSize - overlapSize) {
      const end = Math.min(start + segmentSize, totalDuration)
      segments.push({ start, end })
    }

    const results: TranscriptionResult[] = []
    const chunkSize = Math.floor(segmentSize * audioBuffer.sampleRate)

    // 并发处理多个片段
    const batchSize = this.batchConfig.maxConcurrent
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize)
      const batchPromises = batch.map(async ({ start, end }) => {
        const startSample = Math.floor(start * audioBuffer.sampleRate)
        const endSample = Math.floor(end * audioBuffer.sampleRate)
        const segmentBuffer = audioBuffer.context.createBuffer(
          1,
          endSample - startSample,
          audioBuffer.sampleRate
        )
        segmentBuffer.copyToChannel(
          audioBuffer.getChannelData(0).slice(startSample, endSample),
          0
        )
        return this.transcribeSingleChunk(segmentBuffer)
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    // 合并结果
    return this.mergeTranscriptionResults(results)
  }

  /**
   * 合并转录结果
   */
  private mergeTranscriptionResults(
    results: TranscriptionResult[]
  ): TranscriptionResult {
    const text = results.map((r) => r.text).join(' ')
    const confidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length

    return {
      text,
      language: this.config.language,
      confidence,
      timestamp: Date.now(),
      isFinal: true,
    }
  }

  /**
   * 添加事件监听器
   */
  on(listener: AudioEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 发射事件
   */
  private emit(event: TranscriptionEvent): void {
    this.listeners.forEach((listener) => listener(event))
  }

  /**
   * 获取当前转录结果
   */
  getCurrentTranscription(): string {
    return [...this.partialResults, ...this.finalResults.map((r) => r.text)].join(
      ' '
    )
  }

  /**
   * 获取最终结果
   */
  getFinalResults(): TranscriptionWithSpeaker[] {
    return [...this.finalResults]
  }

  /**
   * 重置转录状态
   */
  reset(): void {
    this.partialResults = []
    this.finalResults = []
    this.sessionId = generateId()
  }

  /**
   * 检查是否正在转录
   */
  isTranscribingNow(): boolean {
    return this.isTranscribing
  }

  /**
   * 销毁资源
   */
  async destroy(): Promise<void> {
    if (this.isTranscribing) {
      await this.stopRealtimeTranscription()
    }

    if (this.processor) {
      this.processor.destroy()
      this.processor = null
    }

    this.listeners.clear()
  }
}

/**
 * 创建 STT 实例的便捷函数
 */
export function createSTT(options?: STTOptions): SpeechToText {
  return new SpeechToText(options)
}

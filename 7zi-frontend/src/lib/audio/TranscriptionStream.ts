/**
 * TranscriptionStream - 实时转录流
 *
 * 通过 WebSocket 实现实时音频流转录
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type {
  StreamTranscriptionConfig,
  TranscriptionEvent,
  TranscriptionWithSpeaker,
  SupportedLanguage,
  AudioEventListener,
} from './types'
import { logger } from '@/lib/logger'

/**
 * WebSocket 消息类型
 */
type WSMessageType =
  | 'start'
  | 'stop'
  | 'audio'
  | 'transcript_partial'
  | 'transcript_final'
  | 'speaker_change'
  | 'error'
  | 'ready'
  | 'close'

/**
 * WebSocket 消息
 */
interface WSMessage {
  type: WSMessageType
  data?: unknown
  error?: string
}

/**
 * 转录流错误
 */
export class TranscriptionStreamError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'TranscriptionStreamError'
  }
}

/**
 * TranscriptionStream - 实时转录流
 */
export class TranscriptionStream {
  private ws: WebSocket | null = null
  private config: Required<Omit<StreamTranscriptionConfig, 'url' | 'apiKey'>> & {
    url: string
    apiKey?: string
  }
  private listeners: Set<AudioEventListener> = new Set()
  private isConnected = false
  private isConnecting = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private audioBuffer: Int16Array[] = []
  private isStreaming = false

  constructor(config: StreamTranscriptionConfig) {
    this.config = {
      url: config.url,
      apiKey: config.apiKey,
      language: config.language,
      model: config.model || 'whisper-1',
      enableDiarization: config.enableDiarization ?? false,
      retryAttempts: config.retryAttempts ?? 3,
      retryInterval: config.retryInterval ?? 1000,
    }
  }

  /**
   * 连接到 WebSocket 服务器
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      try {
        // 构建 WebSocket URL
        const wsUrl = new URL(this.config.url)
        if (this.config.apiKey) {
          wsUrl.searchParams.set('api_key', this.config.apiKey)
        }
        wsUrl.searchParams.set('language', this.config.language)
        wsUrl.searchParams.set('model', this.config.model)
        wsUrl.searchParams.set(
          'diarization',
          this.config.enableDiarization.toString()
        )

        this.ws = new WebSocket(wsUrl.toString())

        this.ws.onopen = () => {
          this.isConnected = true
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.emit({
            type: 'ready',
            timestamp: Date.now(),
          })
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          logger.error('WebSocket error:', error)
          this.isConnecting = false

          if (!this.isConnected) {
            reject(
              new TranscriptionStreamError(
                'WebSocket connection failed',
                'CONNECTION_ERROR',
                error
              )
            )
          }
        }

        this.ws.onclose = () => {
          this.isConnected = false
          this.isConnecting = false

          // 自动重连
          if (
            this.reconnectAttempts < this.config.retryAttempts &&
            this.isStreaming
          ) {
            this.scheduleReconnect()
          }
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * 处理 WebSocket 消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'transcript_partial':
          this.handlePartialTranscript(message.data as TranscriptionWithSpeaker)
          break

        case 'transcript_final':
          this.handleFinalTranscript(message.data as TranscriptionWithSpeaker)
          break

        case 'speaker_change':
          this.handleSpeakerChange(message.data as any)
          break

        case 'error':
          this.handleError(message.error || 'Unknown error')
          break

        case 'ready':
          this.emit({
            type: 'ready',
            timestamp: Date.now(),
          })
          break

        default:
          logger.debug('Unknown message type:', message.type)
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * 处理部分转录结果
   */
  private handlePartialTranscript(data: TranscriptionWithSpeaker): void {
    this.emit({
      type: 'partial',
      result: {
        ...data,
        isFinal: false,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    })
  }

  /**
   * 处理最终转录结果
   */
  private handleFinalTranscript(data: TranscriptionWithSpeaker): void {
    this.emit({
      type: 'final',
      result: {
        ...data,
        isFinal: true,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    })
  }

  /**
   * 处理说话人变更
   */
  private handleSpeakerChange(data: any): void {
    this.emit({
      type: 'speaker_change',
      timestamp: Date.now(),
    })
  }

  /**
   * 处理错误
   */
  private handleError(error: string): void {
    this.emit({
      type: 'error',
      error,
      timestamp: Date.now(),
    })
  }

  /**
   * 发送音频数据
   */
  sendAudio(audioData: Int16Array): void {
    if (!this.isConnected || !this.ws) {
      throw new TranscriptionStreamError(
        'WebSocket not connected',
        'NOT_CONNECTED'
      )
    }

    // 将 Int16Array 转换为 Base64
    // 确保 buffer 是 ArrayBuffer 而不是 SharedArrayBuffer
    const rawBuffer = audioData.buffer.slice(
      audioData.byteOffset,
      audioData.byteOffset + audioData.byteLength
    )
    const base64 = this.arrayBufferToBase64(rawBuffer as ArrayBuffer)

    this.ws.send(
      JSON.stringify({
        type: 'audio',
        data: base64,
      })
    )
  }

  /**
   * 发送音频 Blob
   */
  async sendAudioBlob(blob: Blob): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer()
    const int16Array = new Int16Array(arrayBuffer)
    this.sendAudio(int16Array)
  }

  /**
   * 将 ArrayBuffer 转换为 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * 开始流式转录
   */
  async start(): Promise<void> {
    if (!this.isConnected) {
      await this.connect()
    }

    if (!this.ws) {
      throw new TranscriptionStreamError(
        'WebSocket not initialized',
        'NOT_INITIALIZED'
      )
    }

    this.isStreaming = true
    this.audioBuffer = []

    // 发送开始信号
    this.ws.send(
      JSON.stringify({
        type: 'start',
        language: this.config.language,
        model: this.config.model,
        diarization: this.config.enableDiarization,
      })
    )
  }

  /**
   * 停止流式转录
   */
  stop(): void {
    if (!this.ws || !this.isStreaming) {
      return
    }

    this.isStreaming = false

    // 发送停止信号
    this.ws.send(
      JSON.stringify({
        type: 'stop',
      })
    )
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stop()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.isConnecting = false
    this.audioBuffer = []
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null

      if (this.isStreaming && !this.isConnected) {
        logger.debug(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.config.retryAttempts})`
        )
        this.connect().catch((error) => {
          logger.error('Reconnection failed:', error)
        })
      }
    }, this.config.retryInterval * this.reconnectAttempts)
  }

  /**
   * 添加事件监听器
   */
  addListener(listener: AudioEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 移除事件监听器
   */
  removeListener(listener: AudioEventListener): void {
    this.listeners.delete(listener)
  }

  /**
   * 发送事件
   */
  private emit(event: TranscriptionEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        logger.error('Listener error:', error)
      }
    })
  }

  /**
   * 检查是否已连接
   */
  get connected(): boolean {
    return this.isConnected
  }

  /**
   * 检查是否正在流式传输
   */
  get streaming(): boolean {
    return this.isStreaming
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    this.disconnect()
    this.listeners.clear()
  }
}

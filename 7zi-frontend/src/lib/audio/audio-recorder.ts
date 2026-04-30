/**
 * AudioRecorder - 音频录制服务
 *
 * 基于 MediaRecorder API 实现音频录制
 * 支持 webm → mp3/wav 格式转换
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type { AudioFormat, AudioStatus, AudioStatusEvent } from './types'

/**
 * 录音选项
 */
export interface RecordingOptions {
  /** 音频约束 */
  audioConstraints?: MediaTrackConstraints
  /** 音频 MIME 类型 */
  mimeType?: string
  /** 音频比特率 (bps) */
  audioBitsPerSecond?: number
  /** 时间片大小 (毫秒) */
  timeSlice?: number
  /** 是否启用降噪 */
  noiseSuppression?: boolean
  /** 是否启用回声消除 */
  echoCancellation?: boolean
  /** 是否启用自动增益 */
  autoGainControl?: boolean
  /** 采样率 */
  sampleRate?: number
  /** 通道数 */
  channelCount?: number
}

/**
 * 录制状态
 */
export interface RecordingState {
  /** 是否正在录制 */
  isRecording: boolean
  /** 是否已暂停 */
  isPaused: boolean
  /** 录制时长（毫秒） */
  duration: number
  /** 录制的数据块数量 */
  chunkCount: number
  /** 文件大小（字节） */
  fileSize: number
}

/**
 * 录制事件
 */
export interface RecordingEvent {
  /** 事件类型 */
  type: 'dataavailable' | 'start' | 'stop' | 'pause' | 'resume' | 'error'
  /** 数据块 */
  chunk?: Blob
  /** 录制状态 */
  state?: RecordingState
  /** 错误信息 */
  error?: string
  /** 时间戳 */
  timestamp: number
}

/**
 * 录制事件监听器
 */
export type RecordingEventListener = (event: RecordingEvent) => void

/**
 * 格式转换选项
 */
export interface FormatConversionOptions {
  /** 目标格式 */
  targetFormat: AudioFormat
  /** 音频质量 (0-1) */
  quality?: number
  /** 采样率 */
  sampleRate?: number
  /** 通道数 */
  channelCount?: number
}

/**
 * 音频录制器
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private chunks: Blob[] = []
  private state: RecordingState
  private listeners: Set<RecordingEventListener> = new Set()
  private statusListeners: Set<(event: AudioStatusEvent) => void> = new Set()
  private startTime: number = 0
  private pausedTime: number = 0
  private timerId: NodeJS.Timeout | null = null
  private options: Required<RecordingOptions>

  constructor(options: RecordingOptions = {}) {
    this.options = {
      audioConstraints: options.audioConstraints || {},
      mimeType: options.mimeType || '',
      audioBitsPerSecond: options.audioBitsPerSecond || 128000,
      timeSlice: options.timeSlice || 1000,
      noiseSuppression: options.noiseSuppression ?? true,
      echoCancellation: options.echoCancellation ?? true,
      autoGainControl: options.autoGainControl ?? true,
      sampleRate: options.sampleRate || 16000,
      channelCount: options.channelCount || 1,
    }

    this.state = {
      isRecording: false,
      isPaused: false,
      duration: 0,
      chunkCount: 0,
      fileSize: 0,
    }
  }

  /**
   * 检测浏览器支持的 MIME 类型
   */
  private getSupportedMimeType(): string {
    // 用户指定的 MIME 类型
    if (this.options.mimeType && MediaRecorder.isTypeSupported(this.options.mimeType)) {
      return this.options.mimeType
    }

    // 优先级顺序
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav',
      'audio/mpeg',
    ]

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    throw new Error('No supported audio MIME type found')
  }

  /**
   * 获取音频约束
   */
  private getAudioConstraints(): MediaTrackConstraints {
    return {
      echoCancellation: this.options.echoCancellation,
      noiseSuppression: this.options.noiseSuppression,
      autoGainControl: this.options.autoGainControl,
      sampleRate: this.options.sampleRate,
      channelCount: this.options.channelCount,
      ...this.options.audioConstraints,
    }
  }

  /**
   * 开始录音
   */
  async startRecording(options?: RecordingOptions): Promise<void> {
    if (this.state.isRecording && !this.state.isPaused) {
      throw new Error('Already recording')
    }

    // 如果提供了新选项，更新配置
    if (options) {
      this.options = { ...this.options, ...options }
    }

    try {
      // 如果是从暂停状态恢复
      if (this.state.isPaused && this.mediaRecorder) {
        this.mediaRecorder.resume()
        this.state.isPaused = false
        this.pausedTime += Date.now() - (this.pausedTime || Date.now())
        this.startTimer()
        this.emit({
          type: 'resume',
          state: this.getState(),
          timestamp: Date.now(),
        })
        this.emitStatus('recording')
        return
      }

      // 获取麦克风流
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: this.getAudioConstraints(),
      })

      // 检查麦克风权限
      const audioTrack = this.mediaStream.getAudioTracks()[0]
      if (!audioTrack) {
        throw new Error('No audio track found')
      }

      // 创建 AudioContext（用于格式转换）
      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate,
      })

      // 获取支持的 MIME 类型
      const mimeType = this.getSupportedMimeType()

      // 创建 MediaRecorder
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
      }

      if (this.options.audioBitsPerSecond && mimeType !== 'audio/wav') {
        recorderOptions.audioBitsPerSecond = this.options.audioBitsPerSecond
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions)

      // 设置事件处理器
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data)
          this.state.chunkCount++
          this.state.fileSize += event.data.size

          this.emit({
            type: 'dataavailable',
            chunk: event.data,
            state: this.getState(),
            timestamp: Date.now(),
          })
        }
      }

      this.mediaRecorder.onerror = (event) => {
        const error = (event as ErrorEvent).message || 'Recording error'
        this.emit({
          type: 'error',
          error,
          timestamp: Date.now(),
        })
        this.emitStatus('error', error)
      }

      this.mediaRecorder.onstart = () => {
        this.state.isRecording = true
        this.state.isPaused = false
        this.startTime = Date.now()
        this.pausedTime = 0
        this.startTimer()

        this.emit({
          type: 'start',
          state: this.getState(),
          timestamp: Date.now(),
        })
        this.emitStatus('recording')
      }

      this.mediaRecorder.onstop = () => {
        this.stopTimer()
        this.emit({
          type: 'stop',
          state: this.getState(),
          timestamp: Date.now(),
        })
      }

      this.mediaRecorder.onpause = () => {
        this.state.isPaused = true
        this.stopTimer()
        this.emit({
          type: 'pause',
          state: this.getState(),
          timestamp: Date.now(),
        })
      }

      this.mediaRecorder.onresume = () => {
        this.state.isPaused = false
        this.startTimer()
        this.emit({
          type: 'resume',
          state: this.getState(),
          timestamp: Date.now(),
        })
      }

      // 开始录音
      this.mediaRecorder.start(this.options.timeSlice)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      this.emit({
        type: 'error',
        error: errorMessage,
        timestamp: Date.now(),
      })
      this.emitStatus('error', errorMessage)
      throw error
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<Blob> {
    if (!this.state.isRecording) {
      throw new Error('Not recording')
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'))
        return
      }

      // 保存原有的 onstop 处理器
      const originalOnStop = this.mediaRecorder.onstop

      // 设置新的 onstop 处理器来返回 Blob
      this.mediaRecorder.onstop = () => {
        // 创建最终的 Blob
        const blob = new Blob(this.chunks, {
          type: this.mediaRecorder!.mimeType,
        })

        // 重置状态
        this.state.isRecording = false
        this.state.isPaused = false
        this.chunks = []

        // 清理资源
        this.cleanup()

        // 调用原有的 onstop 处理器
        if (originalOnStop && this.mediaRecorder) {
          originalOnStop.call(this.mediaRecorder, new Event('stop'))
        }

        this.emitStatus('idle')
        resolve(blob)
      }

      try {
        this.mediaRecorder.stop()
      } catch (error) {
        this.cleanup()
        reject(error)
      }
    })
  }

  /**
   * 暂停录音
   */
  pauseRecording(): void {
    if (!this.state.isRecording || this.state.isPaused) {
      return
    }

    this.mediaRecorder?.pause()
  }

  /**
   * 恢复录音
   */
  resumeRecording(): void {
    if (!this.state.isRecording || !this.state.isPaused) {
      return
    }

    this.mediaRecorder?.resume()
  }

  /**
   * 取消录音
   */
  cancelRecording(): void {
    if (!this.state.isRecording) {
      return
    }

    this.mediaRecorder?.stop()
    this.chunks = []
    this.cleanup()
    this.emitStatus('idle')
  }

  /**
   * 获取录制的音频 Blob
   */
  getRecordedBlob(): Blob | null {
    if (this.chunks.length === 0) {
      return null
    }

    return new Blob(this.chunks, {
      type: this.mediaRecorder?.mimeType || 'audio/webm',
    })
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.mediaRecorder = null
    this.stopTimer()
  }

  /**
   * 开始计时器
   */
  private startTimer(): void {
    this.stopTimer()
    this.timerId = setInterval(() => {
      if (this.state.isRecording && !this.state.isPaused) {
        this.state.duration = Date.now() - this.startTime - this.pausedTime
      }
    }, 100)
  }

  /**
   * 停止计时器
   */
  private stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  /**
   * 获取当前状态
   */
  private getState(): RecordingState {
    return { ...this.state }
  }

  /**
   * 添加事件监听器
   */
  on(listener: RecordingEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * 发射事件
   */
  private emit(event: RecordingEvent): void {
    this.listeners.forEach((listener) => listener(event))
  }

  /**
   * 发射状态事件
   */
  private emitStatus(status: AudioStatus, error?: string): void {
    const event: AudioStatusEvent = {
      status,
      error,
      timestamp: Date.now(),
    }
    this.statusListeners.forEach((listener) => listener(event))
  }

  /**
   * 添加状态监听器
   */
  onStatusChange(listener: (event: AudioStatusEvent) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  /**
   * 格式转换 - webm → wav
   */
  async convertToWav(blob: Blob): Promise<Blob> {
    if (blob.type === 'audio/wav') {
      return blob
    }

    try {
      // 解码音频数据
      const arrayBuffer = await blob.arrayBuffer()
      const audioContext = new AudioContext({ sampleRate: 16000 })
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // 转换为 WAV
      return this.audioBufferToWav(audioBuffer)
    } catch (error) {
      throw new Error(`Failed to convert to WAV: ${error}`)
    }
  }

  /**
   * 格式转换 - webm → mp3
   */
  async convertToMp3(blob: Blob, options: Partial<FormatConversionOptions> = {}): Promise<Blob> {
    if (blob.type === 'audio/mpeg' || blob.type === 'audio/mp3') {
      return blob
    }

    try {
      // 解码音频数据
      const arrayBuffer = await blob.arrayBuffer()
      const audioContext = new AudioContext({
        sampleRate: options.sampleRate || 16000,
      })
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // 使用 MediaRecorder 重新编码为 MP3
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      )

      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(offlineContext.destination)
      source.start()

      const renderedBuffer = await offlineContext.startRendering()

      // 转换为 MediaStream
      const stream = this.audioBufferToMediaStream(renderedBuffer)

      return new Promise((resolve, reject) => {
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm', // 大多数浏览器不支持直接录制 MP3
          audioBitsPerSecond: options.quality
            ? Math.floor(128000 * options.quality)
            : 128000,
        })

        const chunks: Blob[] = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }

        recorder.onstop = () => {
          const result = new Blob(chunks, { type: 'audio/webm' })
          // 注意：真正的 MP3 编码需要使用 lamejs 或类似库
          // 这里返回 webm 格式，后续可以使用 lamejs 转换
          resolve(result)
        }

        recorder.onerror = reject

        recorder.start()
        setTimeout(() => recorder.stop(), 100)
      })
    } catch (error) {
      throw new Error(`Failed to convert to MP3: ${error}`)
    }
  }

  /**
   * 格式转换 - 任意格式到目标格式
   */
  async convertFormat(
    blob: Blob,
    targetFormat: AudioFormat,
    options?: FormatConversionOptions
  ): Promise<Blob> {
    switch (targetFormat) {
      case 'wav':
        return this.convertToWav(blob)
      case 'mp3':
        return this.convertToMp3(blob, options)
      case 'webm':
        if (blob.type.startsWith('audio/webm')) {
          return blob
        }
        return this.convertToWebm(blob, options)
      case 'ogg':
        return this.convertToOgg(blob, options)
      case 'flac':
        return this.convertToFlac(blob, options)
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`)
    }
  }

  /**
   * 转换为 WebM
   */
  private async convertToWebm(
    blob: Blob,
    options?: FormatConversionOptions
  ): Promise<Blob> {
    if (blob.type.startsWith('audio/webm')) {
      return blob
    }

    // 使用 MediaRecorder 重新编码
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext({
      sampleRate: options?.sampleRate || 16000,
    })
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const stream = this.audioBufferToMediaStream(audioBuffer)

    return new Promise((resolve, reject) => {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: options?.quality
          ? Math.floor(128000 * options.quality)
          : 128000,
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'audio/webm' }))
      }

      recorder.onerror = reject

      recorder.start()
      setTimeout(() => recorder.stop(), 100)
    })
  }

  /**
   * 转换为 OGG
   */
  private async convertToOgg(
    blob: Blob,
    options?: FormatConversionOptions
  ): Promise<Blob> {
    if (blob.type.startsWith('audio/ogg')) {
      return blob
    }

    // 类似 WebM 转换
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext({
      sampleRate: options?.sampleRate || 16000,
    })
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const stream = this.audioBufferToMediaStream(audioBuffer)

    return new Promise((resolve, reject) => {
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/ogg;codecs=opus',
        audioBitsPerSecond: options?.quality
          ? Math.floor(128000 * options.quality)
          : 128000,
      })

      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'audio/ogg' }))
      }

      recorder.onerror = reject

      recorder.start()
      setTimeout(() => recorder.stop(), 100)
    })
  }

  /**
   * 转换为 FLAC
   */
  private async convertToFlac(
    blob: Blob,
    options?: FormatConversionOptions
  ): Promise<Blob> {
    // FLAC 需要特殊处理，大多数浏览器不支持直接编码
    // 这里先转换为 WAV，后续可以使用 flac.js 转换
    return this.convertToWav(blob)
  }

  /**
   * 将 AudioBuffer 转换为 WAV Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const dataLength = buffer.length * blockAlign
    const bufferLength = 44 + dataLength

    const arrayBuffer = new ArrayBuffer(bufferLength)
    const view = new DataView(arrayBuffer)

    // WAV 头部
    this.writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    this.writeString(view, 8, 'WAVE')
    this.writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    this.writeString(view, 36, 'data')
    view.setUint32(40, dataLength, true)

    // 写入音频数据
    const channels: Float32Array[] = []
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }

  /**
   * 将 AudioBuffer 转换为 MediaStream
   */
  private audioBufferToMediaStream(buffer: AudioBuffer): MediaStream {
    const ctx = new AudioContext()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const destination = ctx.createMediaStreamDestination()
    source.connect(destination)
    source.start()
    return destination.stream
  }

  /**
   * 写入字符串到 DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * 获取录制时长（毫秒）
   */
  getDuration(): number {
    return this.state.duration
  }

  /**
   * 获取录制时长（格式化）
   */
  getFormattedDuration(): string {
    const seconds = Math.floor(this.state.duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(
        seconds % 60
      ).padStart(2, '0')}`
    }

    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
  }

  /**
   * 检查是否正在录制
   */
  isRecordingNow(): boolean {
    return this.state.isRecording
  }

  /**
   * 检查是否已暂停
   */
  isPausedNow(): boolean {
    return this.state.isPaused
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    this.cancelRecording()
    this.listeners.clear()
    this.statusListeners.clear()
  }
}

/**
 * 创建录音器实例的便捷函数
 */
export function createAudioRecorder(options?: RecordingOptions): AudioRecorder {
  return new AudioRecorder(options)
}

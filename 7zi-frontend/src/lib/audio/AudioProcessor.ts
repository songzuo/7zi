/**
 * AudioProcessor - 音频处理核心
 *
 * 负责音频采集、预处理、格式转换等功能
 *
 * @package 7zi-frontend
 * @version 1.13.0
 */

import type {
  IAudioProcessor,
  AudioProcessorConfig,
  AudioFormat,
  AudioStatus,
  AudioStatusEvent,
} from './types'

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<AudioProcessorConfig> = {
  sampleRate: 16000,
  channels: 1,
  bitDepth: 16,
  silenceThreshold: 0.01,
  silenceDuration: 1000,
  maxBufferDuration: 30000,
}

/**
 * AudioProcessor - 音频处理器
 */
export class AudioProcessor implements IAudioProcessor {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private analyserNode: AnalyserNode | null = null
  private audioBuffer: Float32Array | null = null
  private isRecordingFlag = false
  private config: Required<AudioProcessorConfig>
  private status: AudioStatus = 'idle'
  private statusListeners: Set<(event: AudioStatusEvent) => void> = new Set()
  private silenceStartTime: number | null = null
  private recordingStartTime: number | null = null

  constructor(config: AudioProcessorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 初始化音频上下文
   */
  private async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      })
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * 开始录音
   */
  async startRecording(): Promise<void> {
    if (this.isRecordingFlag) {
      throw new Error('Already recording')
    }

    try {
      await this.initAudioContext()

      // 获取麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // 创建音频源
      if (!this.audioContext) {
        throw new Error('AudioContext not initialized')
      }
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

      // 创建分析器节点（用于音量检测）
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 2048
      if (this.sourceNode) {
        this.sourceNode.connect(this.analyserNode)
      }

      // 创建处理器节点
      const bufferSize = 4096
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        this.config.channels,
        this.config.channels
      )

      // 初始化音频缓冲区
      const maxSamples = Math.floor(
        (this.config.sampleRate * this.config.maxBufferDuration) / 1000
      )
      this.audioBuffer = new Float32Array(maxSamples)
      let bufferOffset = 0

      // 处理音频数据
      this.processorNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)

        // 检测静音
        const volume = this.calculateVolume(inputData)
        if (volume > this.config.silenceThreshold) {
          this.silenceStartTime = null
        } else if (this.silenceStartTime === null) {
          this.silenceStartTime = Date.now()
        }

        // 检查是否达到静音时长
        if (
          this.silenceStartTime !== null &&
          Date.now() - this.silenceStartTime > this.config.silenceDuration
        ) {
          // 静音时间过长，自动停止录音
          void this.stopRecording()
          return
        }

        // 将音频数据写入缓冲区
        if (this.audioBuffer && bufferOffset + inputData.length <= this.audioBuffer.length) {
          this.audioBuffer.set(inputData, bufferOffset)
          bufferOffset += inputData.length
        }
      }

      // 连接节点
      if (this.sourceNode && this.processorNode) {
        this.sourceNode.connect(this.processorNode)
      }
      if (this.processorNode && this.audioContext) {
        this.processorNode.connect(this.audioContext.destination)
      }

      this.isRecordingFlag = true
      this.recordingStartTime = Date.now()
      this.setStatus('recording')
    } catch (error) {
      this.setStatus('error', error instanceof Error ? error.message : 'Failed to start recording')
      throw error
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<AudioBuffer | null> {
    if (!this.isRecordingFlag) {
      return null
    }

    this.isRecordingFlag = false

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    // 断开节点连接
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    // 创建 AudioBuffer
    let audioBuffer: AudioBuffer | null = null
    if (this.audioBuffer && this.audioContext) {
      // 计算实际音频长度
      const recordingDuration = this.recordingStartTime
        ? Date.now() - this.recordingStartTime
        : 0
      const sampleCount = Math.floor(
        (this.config.sampleRate * recordingDuration) / 1000
      )

      if (sampleCount > 0) {
        audioBuffer = this.audioContext.createBuffer(
          this.config.channels,
          sampleCount,
          this.config.sampleRate
        )
        audioBuffer.copyToChannel(this.audioBuffer.slice(0, sampleCount), 0)
      }
    }

    this.setStatus('processing')
    return audioBuffer
  }

  /**
   * 获取音频数据
   */
  getAudioData(): Float32Array | null {
    return this.audioBuffer
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    if (!this.analyserNode) {
      return 0
    }

    const dataArray = new Float32Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getFloatFrequencyData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }

    return Math.sqrt(sum / dataArray.length)
  }

  /**
   * 检查是否正在录音
   */
  isRecording(): boolean {
    return this.isRecordingFlag
  }

  /**
   * 计算音量
   */
  private calculateVolume(data: Float32Array): number {
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i]
    }
    return Math.sqrt(sum / data.length)
  }

  /**
   * 设置状态
   */
  private setStatus(status: AudioStatus, error?: string): void {
    this.status = status
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
   * 获取当前状态
   */
  getStatus(): AudioStatus {
    return this.status
  }

  /**
   * 获取录音时长（毫秒）
   */
  getRecordingDuration(): number {
    if (!this.recordingStartTime) {
      return 0
    }
    return Date.now() - this.recordingStartTime
  }

  /**
   * 转换音频格式
   */
  async convertFormat(
    audioBuffer: AudioBuffer,
    format: AudioFormat
  ): Promise<Blob> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    // 使用 OfflineAudioContext 进行格式转换
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

    // 转换为 WAV 格式
    if (format === 'wav') {
      return this.audioBufferToWav(renderedBuffer)
    }

    // 其他格式需要使用 MediaRecorder
    const stream = this.audioBufferToStream(renderedBuffer)
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: `audio/${format}`,
    })

    const chunks: Blob[] = []
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: `audio/${format}` }))
      }

      mediaRecorder.onerror = reject
      mediaRecorder.start()
      setTimeout(() => mediaRecorder.stop(), 100)
    })
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
   * 写入字符串到 DataView
   */
  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  /**
   * 将 AudioBuffer 转换为 MediaStream
   */
  private audioBufferToStream(buffer: AudioBuffer): MediaStream {
    const ctx = new AudioContext()
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const destination = ctx.createMediaStreamDestination()
    source.connect(destination)
    source.start()
    return destination.stream
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    if (this.isRecordingFlag) {
      void this.stopRecording()
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.audioBuffer = null
    this.statusListeners.clear()
    this.setStatus('idle')
  }
}
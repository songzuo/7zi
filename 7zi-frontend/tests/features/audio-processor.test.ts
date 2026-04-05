/**
 * AudioProcessor Feature Tests - v1.13.0
 *
 * 测试音频处理核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioProcessor } from '@/lib/audio/AudioProcessor'
import type { AudioProcessorConfig, AudioFormat } from '@/lib/audio/types'

// Mock AudioBuffer
class MockAudioBuffer implements AudioBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  duration: number

  constructor(
    public config: {
      numberOfChannels: number
      length: number
      sampleRate: number
    }
  ) {
    this.numberOfChannels = config.numberOfChannels
    this.length = config.length
    this.sampleRate = config.sampleRate
    this.duration = this.length / this.sampleRate
  }

  getChannelData(channel: number): Float32Array {
    return new Float32Array(this.length)
  }

  copyFromChannel(destination: Float32Array, channelNumber: number, startInChannel?: number): void {
    // Mock implementation
  }

  copyToChannel(source: Float32Array, channelNumber: number, startInChannel?: number): void {
    // Mock implementation
  }
}

// Mock OfflineAudioContext
class MockOfflineAudioContext {
  numberOfChannels: number
  length: number
  sampleRate: number

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels
    this.length = length
    this.sampleRate = sampleRate
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
    } as any
  }

  createMediaStreamDestination() {
    return {
      stream: new MediaStream(),
    } as any
  }

  startRendering() {
    return Promise.resolve(new MockAudioBuffer({
      numberOfChannels: this.numberOfChannels,
      length: this.length,
      sampleRate: this.sampleRate,
    }))
  }
}

// Define AudioBuffer globally for tests
global.AudioBuffer = MockAudioBuffer as any
global.OfflineAudioContext = MockOfflineAudioContext as any

// Mock MediaStream
global.MediaStream = function() {
  this.active = true
  this.getTracks = vi.fn().mockReturnValue([])
  this.addTrack = vi.fn()
  this.removeTrack = vi.fn()
  this.clone = vi.fn().mockReturnThis()
  this.getAudioTracks = vi.fn().mockReturnValue([])
  this.getVideoTracks = vi.fn().mockReturnValue([])
} as any

// Mock MediaRecorder
class MockMediaRecorder {
  private events: { [key: string]: Function[] } = {}
  private stream: MediaStream
  private options: any

  constructor(stream: MediaStream, options?: any) {
    this.stream = stream
    this.options = options
  }

  ondataavailable: ((event: any) => void) | null = null
  onstop: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null

  start(timeslice?: number): void {
    // Mock implementation
  }

  stop(): void {
    // Mock implementation
    if (this.onstop) {
      this.onstop({} as any)
    }
  }

  addEventListener(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)
  }

  removeEventListener(event: string, listener: Function): void {
    const index = this.events[event]?.indexOf(listener)
    if (index > -1) {
      this.events[event]?.splice(index, 1)
    }
  }
}
global.MediaRecorder = MockMediaRecorder as any

// Mock AudioContext
class MockAudioContext {
  sampleRate = 16000
  state = 'running'

  async resume() {
    this.state = 'running'
  }

  createMediaStreamSource(stream: MediaStream) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as any
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getFloatFrequencyData: vi.fn(),
      disconnect: vi.fn(),
    } as any
  }

  createScriptProcessor(
    bufferSize: number,
    numberOfInputs: number,
    numberOfOutputs: number
  ) {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null as any,
    } as any
  }

  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ) {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate })
  }

  createMediaStreamDestination() {
    return {
      stream: new MediaStream(),
    } as any
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
    } as any
  }

  close() {
    return Promise.resolve()
  }
}

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn()

global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
  },
} as any

describe('AudioProcessor Feature Tests', () => {
  let processor: AudioProcessor
  let originalAudioContext: any

  beforeEach(() => {
    originalAudioContext = global.AudioContext
    global.AudioContext = MockAudioContext as any
    processor = new AudioProcessor({
      sampleRate: 16000,
      channels: 1,
    })
  })

  afterEach(() => {
    processor.destroy()
    vi.clearAllMocks()
    global.AudioContext = originalAudioContext
  })

  describe('录音功能', () => {
    it('应该成功开始录音', async () => {
      const mockStream = {
        getTracks: vi.fn(() => []),
      }

      mockGetUserMedia.mockResolvedValue(mockStream)

      await processor.startRecording()

      expect(processor.isRecording()).toBe(true)
      expect(processor.getStatus()).toBe('recording')
    })

    it('应该拒绝重复开始录音', async () => {
      mockGetUserMedia.mockResolvedValue({ getTracks: () => [] })

      await processor.startRecording()

      await expect(processor.startRecording()).rejects.toThrow('Already recording')
    })

    it('应该成功停止录音', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
      })

      await processor.startRecording()
      expect(processor.isRecording()).toBe(true)

      const audioBuffer = await processor.stopRecording()

      expect(processor.isRecording()).toBe(false)
      expect(processor.getStatus()).toBe('processing')
      expect(audioBuffer).toBeInstanceOf(AudioBuffer)
    })

    it('应该正确处理静音检测', async () => {
      const config: AudioProcessorConfig = {
        sampleRate: 16000,
        channels: 1,
        silenceThreshold: 0.01,
        silenceDuration: 1000,
      }

      const processorWithSilence = new AudioProcessor(config)

      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })

      await processorWithSilence.startRecording()

      // 静音检测应该在配置的阈值内工作
      expect(processorWithSilence.isRecording()).toBe(true)

      processorWithSilence.destroy()
    })
  })

  describe('音量检测', () => {
    it('应该返回当前音量', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        getFloatFrequencyData: vi.fn((dataArray: Float32Array) => {
          // 模拟音频数据
          for (let i = 0; i < dataArray.length; i++) {
            dataArray[i] = Math.random() * 100 - 100
          }
        }),
      } as unknown as AnalyserNode

      processor['analyserNode'] = mockAnalyser

      const volume = processor.getVolume()

      expect(volume).toBeGreaterThanOrEqual(0)
      expect(typeof volume).toBe('number')
    })

    it('应该在无分析器节点时返回 0', () => {
      const volume = processor.getVolume()
      expect(volume).toBe(0)
    })
  })

  describe('音频数据管理', () => {
    it('应该获取音频数据', () => {
      const testBuffer = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])
      processor['audioBuffer'] = testBuffer

      const data = processor.getAudioData()

      expect(data).toBe(testBuffer)
      expect(data?.length).toBe(5)
    })

    it('应该在无数据时返回 null', () => {
      const data = processor.getAudioData()
      expect(data).toBeNull()
    })

    it('应该正确计算录音时长', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })

      await processor.startRecording()

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 100))

      const duration = processor.getRecordingDuration()

      expect(duration).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1000) // 应该小于 1 秒
    })
  })

  describe('格式转换', () => {
    it('应该转换为 WAV 格式', async () => {
      // 先初始化 AudioContext
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })
      await processor.startRecording()
      await processor.stopRecording()

      const mockBuffer = new MockAudioBuffer({
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
      })

      const wavBlob = await processor.convertFormat(mockBuffer, 'wav')

      expect(wavBlob).toBeInstanceOf(Blob)
      expect(wavBlob.type).toBe('audio/wav')
      expect(wavBlob.size).toBeGreaterThan(0)
    })

    it('应该转换为 MP3 格式', async () => {
      // 先初始化 AudioContext
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })
      await processor.startRecording()
      await processor.stopRecording()

      const mockBuffer = new MockAudioBuffer({
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
      })

      const mp3Blob = await processor.convertFormat(mockBuffer, 'mp3')

      expect(mp3Blob).toBeInstanceOf(Blob)
      expect(mp3Blob.type).toBe('audio/mp3')
    })

    it('应该支持多种音频格式', async () => {
      // 先初始化 AudioContext
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })
      await processor.startRecording()
      await processor.stopRecording()

      const mockBuffer = new MockAudioBuffer({
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
      })

      const formats: AudioFormat[] = ['wav', 'mp3', 'ogg', 'webm', 'flac']

      for (const format of formats) {
        const blob = await processor.convertFormat(mockBuffer, format)
        expect(blob).toBeInstanceOf(Blob)
        expect(blob.type).toBe(`audio/${format}`)
      }
    })
  })

  describe('状态管理', () => {
    it('应该正确跟踪状态变化', () => {
      const statusEvents: any[] = []
      processor.onStatusChange((event) => {
        statusEvents.push(event)
      })

      processor['setStatus']('recording')
      processor['setStatus']('processing')
      processor['setStatus']('idle')

      expect(statusEvents).toHaveLength(3)
      expect(statusEvents[0].status).toBe('recording')
      expect(statusEvents[1].status).toBe('processing')
      expect(statusEvents[2].status).toBe('idle')
    })

    it('应该正确处理错误状态', () => {
      const statusEvents: any[] = []
      processor.onStatusChange((event) => {
        statusEvents.push(event)
      })

      processor['setStatus']('error', 'Test error message')

      expect(statusEvents).toHaveLength(1)
      expect(statusEvents[0].status).toBe('error')
      expect(statusEvents[0].error).toBe('Test error message')
    })

    it('应该能够移除状态监听器', () => {
      const statusListener = vi.fn()
      const removeListener = processor.onStatusChange(statusListener)

      removeListener()
      processor['setStatus']('recording')

      expect(statusListener).not.toHaveBeenCalled()
    })
  })

  describe('配置管理', () => {
    it('应该使用默认配置', () => {
      const defaultProcessor = new AudioProcessor()
      expect(defaultProcessor).toBeInstanceOf(AudioProcessor)
      defaultProcessor.destroy()
    })

    it('应该接受自定义配置', () => {
      const customConfig: AudioProcessorConfig = {
        sampleRate: 48000,
        channels: 2,
        bitDepth: 24,
        silenceThreshold: 0.02,
        silenceDuration: 2000,
        maxBufferDuration: 60000,
      }

      const customProcessor = new AudioProcessor(customConfig)
      expect(customProcessor).toBeInstanceOf(AudioProcessor)
      customProcessor.destroy()
    })
  })

  describe('资源清理', () => {
    it('应该正确销毁资源', () => {
      processor.destroy()

      expect(processor.isRecording()).toBe(false)
      expect(processor.getAudioData()).toBeNull()
      expect(processor.getStatus()).toBe('idle')
    })

    it('应该在销毁时停止录音', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })

      await processor.startRecording()
      expect(processor.isRecording()).toBe(true)

      processor.destroy()

      expect(processor.isRecording()).toBe(false)
    })
  })

  describe('边界情况', () => {
    it('应该处理空音频缓冲区', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => []),
      })

      await processor.startRecording()
      const audioBuffer = await processor.stopRecording()

      // 空缓冲区应该返回 null 或有效的 AudioBuffer
      expect(audioBuffer === null || audioBuffer instanceof AudioBuffer).toBe(true)
    })

    it('应该处理无效的音频格式', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: vi.fn(() => new Float32Array(16000)),
      } as any

      // 测试不支持的格式
      await expect(
        processor.convertFormat(mockBuffer, 'invalid' as any)
      ).rejects.toThrow()
    })

    it('应该处理麦克风权限拒绝', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))

      await expect(processor.startRecording()).rejects.toThrow()
      expect(processor.getStatus()).toBe('error')
    })
  })
})
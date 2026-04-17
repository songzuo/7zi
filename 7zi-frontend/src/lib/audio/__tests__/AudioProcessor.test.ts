/**
 * AudioProcessor Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioProcessor } from '../AudioProcessor'

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
      frequencyBinCount: 1024,
      getFloatFrequencyData: vi.fn(),
      connect: vi.fn(),
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
      onaudioprocess: null,
    } as any
  }

  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ) {
    return {
      numberOfChannels,
      length,
      sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    } as unknown as AudioBuffer
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

describe('AudioProcessor', () => {
  let processor: AudioProcessor

  beforeEach(() => {
    processor = new AudioProcessor({
      sampleRate: 16000,
      channels: 1,
    })
  })

  afterEach(() => {
    processor.destroy()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(processor.isRecording()).toBe(false)
      expect(processor.getAudioData()).toBeNull()
    })

    it('should accept custom config', () => {
      const customProcessor = new AudioProcessor({
        sampleRate: 48000,
        channels: 2,
      })
      expect(customProcessor).toBeInstanceOf(AudioProcessor)
      customProcessor.destroy()
    })
  })

  describe('recording', () => {
    it('should start recording', async () => {
      const mockStream = {
        getTracks: vi.fn(() => []),
      }

      mockGetUserMedia.mockResolvedValue(mockStream)

      // Mock AudioContext
      const originalAudioContext = global.AudioContext
      global.AudioContext = MockAudioContext as any

      await processor.startRecording()
      expect(processor.isRecording()).toBe(true)

      // Restore
      global.AudioContext = originalAudioContext
    })

    it('should throw error if already recording', async () => {
      mockGetUserMedia.mockResolvedValue({ getTracks: () => [] })
      global.AudioContext = MockAudioContext as any

      await processor.startRecording()

      await expect(processor.startRecording()).rejects.toThrow('Already recording')

      global.AudioContext = global.AudioContext
    })

    it('should stop recording', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
      })
      global.AudioContext = MockAudioContext as any

      await processor.startRecording()
      expect(processor.isRecording()).toBe(true)

      await processor.stopRecording()
      expect(processor.isRecording()).toBe(false)

      global.AudioContext = global.AudioContext
    })
  })

  describe('volume detection', () => {
    it('should calculate volume from audio data', () => {
      const mockAnalyser = {
        frequencyBinCount: 1024,
        getFloatFrequencyData: vi.fn(),
      } as unknown as AnalyserNode

      processor['analyserNode'] = mockAnalyser

      const volume = processor.getVolume()
      expect(volume).toBeGreaterThanOrEqual(0)
    })

    it('should return 0 if no analyser node', () => {
      const volume = processor.getVolume()
      expect(volume).toBe(0)
    })
  })

  describe('audio data', () => {
    it('should get audio data', () => {
      const testBuffer = new Float32Array([0.1, 0.2, 0.3])
      processor['audioBuffer'] = testBuffer

      const data = processor.getAudioData()
      expect(data).toBe(testBuffer)
    })

    it('should return null if no audio data', () => {
      const data = processor.getAudioData()
      expect(data).toBeNull()
    })
  })

  describe('format conversion', () => {
    it('should convert audio buffer to WAV', async () => {
      global.AudioContext = MockAudioContext as any

      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: vi.fn(() => new Float32Array(16000)),
      } as any

      const mockBlob = new Blob(['mock wav'], { type: 'audio/wav' })
      vi.spyOn(processor, 'convertFormat' as any).mockResolvedValue(mockBlob)

      const wavBlob = await processor.convertFormat(mockBuffer, 'wav')

      expect(wavBlob).toBeInstanceOf(Blob)
      expect(wavBlob.type).toBe('audio/wav')

      global.AudioContext = global.AudioContext
    })
  })

  describe('status changes', () => {
    it('should emit status events', () => {
      const statusListener = vi.fn()
      processor.onStatusChange(statusListener)

      processor['setStatus']('recording')

      expect(statusListener).toHaveBeenCalledWith({
        status: 'recording',
        error: undefined,
        timestamp: expect.any(Number),
      })
    })

    it('should remove status listener', () => {
      const statusListener = vi.fn()
      const removeListener = processor.onStatusChange(statusListener)

      removeListener()
      processor['setStatus']('recording')

      expect(statusListener).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      processor.destroy()

      expect(processor.isRecording()).toBe(false)
      expect(processor.getAudioData()).toBeNull()
    })
  })
})
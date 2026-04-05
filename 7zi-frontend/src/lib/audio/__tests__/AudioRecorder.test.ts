/**
 * AudioRecorder Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioRecorder, RecordingOptions, createAudioRecorder } from '../audio-recorder'

// Mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstart: ((event: Event) => void) | null = null
  onstop: ((event: Event) => void) | null = null
  onpause: ((event: Event) => void) | null = null
  onresume: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(
    public stream: any,
    public options?: MediaRecorderOptions
  ) {}

  static isTypeSupported(type: string): boolean {
    return true
  }

  start(_timeSlice?: number) {
    this.state = 'recording'
    // Call onstart synchronously to match real behavior
    if (this.onstart) {
      this.onstart(new Event('start'))
    }
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) {
      this.onstop(new Event('stop'))
    }
  }

  pause() {
    this.state = 'paused'
    if (this.onpause) {
      this.onpause(new Event('pause'))
    }
  }

  resume() {
    this.state = 'recording'
    if (this.onresume) {
      this.onresume(new Event('resume'))
    }
  }

  requestData() {
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) })
    }
  }
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn()

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }]
  }
  getAudioTracks() {
    return [{ stop: vi.fn(), getSettings: () => ({}) }]
  }
}

describe('AudioRecorder', () => {
  beforeEach(() => {
    // Setup global mocks
    global.AudioContext = class MockAudioContext {
      sampleRate = 16000
      state = 'running'
      async resume() {
        return Promise.resolve()
      }
      async close() {
        return Promise.resolve()
      }
      createMediaStreamDestination() {
        return { stream: new MediaStream() }
      }
    } as any

    global.OfflineAudioContext = class MockOfflineAudioContext {
      numberOfChannels = 1
      length = 16000
      sampleRate = 16000
      async startRendering() {
        return {
          numberOfChannels: 1,
          length: 16000,
          sampleRate: 16000,
          getChannelData: () => new Float32Array(16000),
          duration: 1,
        }
      }
    } as any

    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any),
      },
    } as any

    // Mock MediaRecorder globally
    global.MediaRecorder = MockMediaRecorder as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should create recorder with default options', () => {
      const recorder = new AudioRecorder()
      expect(recorder).toBeInstanceOf(AudioRecorder)
      recorder.destroy()
    })

    it('should create recorder with custom options', () => {
      const options: RecordingOptions = {
        sampleRate: 44100,
        channelCount: 2,
        noiseSuppression: false,
        echoCancellation: false,
        autoGainControl: true,
        audioBitsPerSecond: 256000,
        timeSlice: 500,
      }

      const recorder = new AudioRecorder(options)
      expect(recorder).toBeInstanceOf(AudioRecorder)
      recorder.destroy()
    })
  })

  describe('recording', () => {
    it('should start recording successfully', async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any)

      const recorder = new AudioRecorder()
      await recorder.startRecording()

      expect(mockGetUserMedia).toHaveBeenCalled()
      expect(recorder.isRecordingNow()).toBe(true)
      recorder.destroy()
    })

    it('should throw error if already recording', async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any)

      const recorder = new AudioRecorder()
      await recorder.startRecording()

      // Second call should throw
      await expect(recorder.startRecording()).rejects.toThrow('Already recording')
      recorder.destroy()
    })

    it('should stop recording and return blob', async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any)

      const recorder = new AudioRecorder()
      await recorder.startRecording()

      const blob = await recorder.stopRecording()
      expect(blob).toBeInstanceOf(Blob)
      expect(recorder.isRecordingNow()).toBe(false)
      recorder.destroy()
    })

    it('should throw error if stop when not recording', async () => {
      const recorder = new AudioRecorder()
      await expect(recorder.stopRecording()).rejects.toThrow('Not recording')
      recorder.destroy()
    })

    it('should pause recording', async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any)

      const recorder = new AudioRecorder()
      await recorder.startRecording()
      recorder.pauseRecording()
      expect(recorder.isPausedNow()).toBe(true)
      recorder.destroy()
    })

    it('should resume recording', async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any)

      const recorder = new AudioRecorder()
      await recorder.startRecording()
      recorder.pauseRecording()
      expect(recorder.isPausedNow()).toBe(true)
      recorder.resumeRecording()
      expect(recorder.isPausedNow()).toBe(false)
      recorder.destroy()
    })

    it('should cancel recording without errors', async () => {
      mockGetUserMedia.mockResolvedValue(new MockMediaStream() as any)

      const recorder = new AudioRecorder()
      await recorder.startRecording()
      
      // cancelRecording should not throw
      expect(() => recorder.cancelRecording()).not.toThrow()
      
      recorder.destroy()
    })
  })

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const recorder = new AudioRecorder()
      const listener = vi.fn()
      const removeListener = recorder.on(listener)
      expect(typeof removeListener).toBe('function')
      removeListener()
      recorder.destroy()
    })

    it('should add and remove status listeners', () => {
      const recorder = new AudioRecorder()
      const listener = vi.fn()
      const removeListener = recorder.onStatusChange(listener)
      expect(typeof removeListener).toBe('function')
      removeListener()
      recorder.destroy()
    })
  })

  describe('duration', () => {
    it('should return 0 when not recording', () => {
      const recorder = new AudioRecorder()
      expect(recorder.getDuration()).toBe(0)
      recorder.destroy()
    })

    it('should return formatted duration', () => {
      const recorder = new AudioRecorder()
      expect(recorder.getFormattedDuration()).toBe('0:00')
      recorder.destroy()
    })
  })

  describe('state checks', () => {
    it('should check if recording', () => {
      const recorder = new AudioRecorder()
      expect(recorder.isRecordingNow()).toBe(false)
      recorder.destroy()
    })

    it('should check if paused', () => {
      const recorder = new AudioRecorder()
      expect(recorder.isPausedNow()).toBe(false)
      recorder.destroy()
    })
  })

  describe('createAudioRecorder', () => {
    it('should create recorder instance via convenience function', () => {
      const recorder = createAudioRecorder()
      expect(recorder).toBeInstanceOf(AudioRecorder)
      recorder.destroy()
    })
  })

  describe('destroy', () => {
    it('should cleanup resources', () => {
      const recorder = new AudioRecorder()
      recorder.destroy()
      expect(recorder.isRecordingNow()).toBe(false)
    })
  })
})

/**
 * AudioUtils Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AudioUtils,
  NoiseReductionOptions,
  GainControlOptions,
  WaveformOptions,
  WaveformData,
  SpectrumData,
  AudioMetadata,
  reduceNoise,
  applyGain,
  generateWaveform,
  extractWaveformData,
  extractSpectrumData,
} from '../audio-utils'

// Mock AudioContext
class MockAudioContext {
  sampleRate = 16000
  state = 'running'

  async resume() {
    return Promise.resolve()
  }

  async close() {
    return Promise.resolve()
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels,
      length,
      sampleRate,
      getChannelData: (channel: number) => new Float32Array(length),
    }
  }

  createMediaStreamDestination() {
    return {
      stream: new MediaStream(),
    }
  }

  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: (data: Uint8Array) => {
        // Fill with mock frequency data
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.floor(Math.random() * 255)
        }
      },
      getFloatFrequencyData: (data: Float32Array) => {
        for (let i = 0; i < data.length; i++) {
          data[i] = -100 + Math.random() * 100
        }
      },
    }
  }

  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      connect: () => {},
      start: () => {},
    }
  }
}

describe('AudioUtils', () => {
  beforeEach(() => {
    global.AudioContext = MockAudioContext as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('reduceNoise', () => {
    it('should reduce noise in audio buffer', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.1),
      } as unknown as AudioBuffer

      const options: NoiseReductionOptions = {
        strength: 0.5,
        gateThreshold: 0.01,
        noiseSampleDuration: 100,
        adaptive: true,
      }

      const result = await AudioUtils.reduceNoise(mockBuffer, options)

      expect(result).toBeDefined()
      expect(result.numberOfChannels).toBe(mockBuffer.numberOfChannels)
      expect(result.length).toBe(mockBuffer.length)
    })

    it('should use default options', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(0.05),
      } as unknown as AudioBuffer

      const result = await AudioUtils.reduceNoise(mockBuffer)

      expect(result).toBeDefined()
    })

    it('should handle multi-channel audio', async () => {
      const mockBuffer = {
        numberOfChannels: 2,
        length: 8000,
        sampleRate: 16000,
        getChannelData: (channel: number) => new Float32Array(8000).fill(0.1),
      } as unknown as AudioBuffer

      const result = await AudioUtils.reduceNoise(mockBuffer)

      expect(result.numberOfChannels).toBe(2)
    })
  })

  describe('applyGain', () => {
    it('should apply gain to audio buffer', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const options: GainControlOptions = {
        gain: 2,
        autoGain: false,
      }

      const result = await AudioUtils.applyGain(mockBuffer, options)

      expect(result).toBeDefined()
    })

    it('should apply auto gain', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.1),
      } as unknown as AudioBuffer

      const options: GainControlOptions = {
        gain: 1,
        autoGain: true,
        targetLevel: 0.7,
      }

      const result = await AudioUtils.applyGain(mockBuffer, options)

      expect(result).toBeDefined()
    })

    it('should handle custom attack and release times', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const options: GainControlOptions = {
        gain: 1.5,
        attackTime: 20,
        releaseTime: 200,
      }

      const result = await AudioUtils.applyGain(mockBuffer, options)

      expect(result).toBeDefined()
    })
  })

  describe('generateWaveform', () => {
    it('should generate sine waveform', () => {
      const options: WaveformOptions = {
        type: 'sine',
        frequency: 440,
        amplitude: 0.5,
        duration: 1,
        sampleRate: 44100,
      }

      const buffer = AudioUtils.generateWaveform(options)

      expect(buffer).toBeDefined()
      expect(buffer.sampleRate).toBe(44100)
      expect(buffer.length).toBe(44100)
    })

    it('should generate square waveform', () => {
      const options: WaveformOptions = {
        type: 'square',
        frequency: 1000,
        amplitude: 0.8,
        duration: 0.5,
      }

      const buffer = AudioUtils.generateWaveform(options)

      expect(buffer).toBeDefined()
    })

    it('should generate sawtooth waveform', () => {
      const options: WaveformOptions = {
        type: 'sawtooth',
        frequency: 220,
        amplitude: 0.6,
      }

      const buffer = AudioUtils.generateWaveform(options)

      expect(buffer).toBeDefined()
    })

    it('should generate triangle waveform', () => {
      const options: WaveformOptions = {
        type: 'triangle',
        frequency: 880,
        amplitude: 0.7,
      }

      const buffer = AudioUtils.generateWaveform(options)

      expect(buffer).toBeDefined()
    })

    it('should use default options', () => {
      const buffer = AudioUtils.generateWaveform()

      expect(buffer).toBeDefined()
      expect(buffer.sampleRate).toBe(44100)
    })
  })

  describe('extractWaveformData', () => {
    it('should extract waveform data', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        duration: 1,
        getChannelData: () => new Float32Array(16000).map((_, i) => Math.sin(i * 0.01)),
      } as unknown as AudioBuffer

      const waveform = AudioUtils.extractWaveformData(mockBuffer, 100)

      expect(Array.isArray(waveform)).toBe(true)
      expect(waveform.length).toBe(100)
      waveform.forEach((point: WaveformData) => {
        expect(point).toHaveProperty('time')
        expect(point).toHaveProperty('amplitude')
        expect(point.amplitude).toBeGreaterThanOrEqual(0)
        expect(point.amplitude).toBeLessThanOrEqual(1)
      })
    })

    it('should use default sample count', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1000,
        sampleRate: 1000,
        duration: 1,
        getChannelData: () => new Float32Array(1000),
      } as unknown as AudioBuffer

      const waveform = AudioUtils.extractWaveformData(mockBuffer)

      expect(waveform.length).toBe(1000)
    })

    it('should handle mono audio', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 5000,
        sampleRate: 5000,
        duration: 1,
        getChannelData: () => new Float32Array(5000).fill(0.5),
      } as unknown as AudioBuffer

      const waveform = AudioUtils.extractWaveformData(mockBuffer, 50)

      expect(waveform.length).toBe(50)
    })
  })

  describe('extractSpectrumData', () => {
    it('should extract spectrum data', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 2048,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(2048),
      } as unknown as AudioBuffer

      const spectrum = AudioUtils.extractSpectrumData(mockBuffer, 2048)

      expect(Array.isArray(spectrum)).toBe(true)
      spectrum.forEach((point: SpectrumData) => {
        expect(point).toHaveProperty('frequency')
        expect(point).toHaveProperty('magnitude')
        expect(point.magnitude).toBeGreaterThanOrEqual(0)
        expect(point.magnitude).toBeLessThanOrEqual(1)
      })
    })

    it('should use default fft size', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 4096,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(4096),
      } as unknown as AudioBuffer

      const spectrum = AudioUtils.extractSpectrumData(mockBuffer)

      expect(Array.isArray(spectrum)).toBe(true)
    })
  })

  describe('calculateRMS', () => {
    it('should calculate RMS of audio buffer', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1000,
        getChannelData: () => new Float32Array([1.0, 0.5, 0.25, 0.0]),
      } as unknown as AudioBuffer

      const rms = AudioUtils.calculateRMS(mockBuffer)

      expect(rms).toBeGreaterThan(0)
      expect(rms).toBeLessThanOrEqual(1)
    })

    it('should handle stereo audio', () => {
      const mockBuffer = {
        numberOfChannels: 2,
        length: 1000,
        getChannelData: (channel: number) => new Float32Array([0.5, 0.5, 0.5, 0.5]),
      } as unknown as AudioBuffer

      const rms = AudioUtils.calculateRMS(mockBuffer)

      expect(rms).toBeGreaterThan(0)
    })
  })

  describe('calculatePeak', () => {
    it('should calculate peak of audio buffer', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1000,
        getChannelData: () => new Float32Array([0.1, 0.5, 0.8, 1.0, -0.5, -1.0]),
      } as unknown as AudioBuffer

      const peak = AudioUtils.calculatePeak(mockBuffer)

      expect(peak).toBe(1.0)
    })

    it('should return 0 for silence', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 100,
        getChannelData: () => new Float32Array(100).fill(0),
      } as unknown as AudioBuffer

      const peak = AudioUtils.calculatePeak(mockBuffer)

      expect(peak).toBe(0)
    })
  })

  describe('calculateDynamicRange', () => {
    it('should calculate dynamic range', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 1000,
        getChannelData: () => new Float32Array([0.01, 0.5, 1.0]),
      } as unknown as AudioBuffer

      const range = AudioUtils.calculateDynamicRange(mockBuffer)

      expect(range).toBeGreaterThan(0)
    })

    it('should return 0 for silence', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 100,
        getChannelData: () => new Float32Array(100).fill(0),
      } as unknown as AudioBuffer

      const range = AudioUtils.calculateDynamicRange(mockBuffer)

      expect(range).toBe(0)
    })
  })

  describe('detectSilence', () => {
    it('should detect silence segments', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 10000,
        sampleRate: 16000,
        getChannelData: () => {
          const data = new Float32Array(10000)
          // First 1000 samples: silence
          // Next 5000 samples: speech
          // Last 4000 samples: silence
          data.fill(0.001, 0, 1000)
          data.fill(0.5, 1000, 6000)
          data.fill(0.001, 6000, 10000)
          return data
        },
      } as unknown as AudioBuffer

      const silences = AudioUtils.detectSilence(mockBuffer, 0.01, 0.1)

      expect(Array.isArray(silences)).toBe(true)
    })

    it('should use default threshold', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 5000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(5000).fill(0),
      } as unknown as AudioBuffer

      const silences = AudioUtils.detectSilence(mockBuffer)

      expect(Array.isArray(silences)).toBe(true)
    })
  })

  describe('trimSilence', () => {
    it('should trim silence from audio', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 10000,
        sampleRate: 16000,
        getChannelData: () => {
          const data = new Float32Array(10000)
          data.fill(0.001, 0, 500)
          data.fill(0.5, 500, 9500)
          data.fill(0.001, 9500, 10000)
          return data
        },
      } as unknown as AudioBuffer

      const result = await AudioUtils.trimSilence(mockBuffer, 0.01, 0.05)

      expect(result).toBeDefined()
    })
  })

  describe('applyFade', () => {
    it('should apply fade in', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(1.0),
      } as unknown as AudioBuffer

      const result = await AudioUtils.applyFade(mockBuffer, 0.5, 0)

      expect(result).toBeDefined()
    })

    it('should apply fade out', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(1.0),
      } as unknown as AudioBuffer

      const result = await AudioUtils.applyFade(mockBuffer, 0, 0.5)

      expect(result).toBeDefined()
    })

    it('should apply both fade in and out', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(1.0),
      } as unknown as AudioBuffer

      const result = await AudioUtils.applyFade(mockBuffer, 0.3, 0.3)

      expect(result).toBeDefined()
    })

    it('should handle zero duration fade', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(0.8),
      } as unknown as AudioBuffer

      const result = await AudioUtils.applyFade(mockBuffer, 0, 0)

      expect(result).toBeDefined()
    })
  })

  describe('mixAudioBuffers', () => {
    it('should mix two audio buffers', async () => {
      const buffer1 = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(0.5),
      } as unknown as AudioBuffer

      const buffer2 = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(0.3),
      } as unknown as AudioBuffer

      const result = await AudioUtils.mixAudioBuffers([buffer1, buffer2])

      expect(result).toBeDefined()
    })

    it('should mix with custom gains', async () => {
      const buffer1 = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(1.0),
      } as unknown as AudioBuffer

      const buffer2 = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(1.0),
      } as unknown as AudioBuffer

      const result = await AudioUtils.mixAudioBuffers([buffer1, buffer2], [0.5, 0.5])

      expect(result).toBeDefined()
    })

    it('should throw error for empty buffers', async () => {
      await expect(AudioUtils.mixAudioBuffers([])).rejects.toThrow()
    })
  })

  describe('changePitch', () => {
    it('should change pitch up', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const result = await AudioUtils.changePitch(mockBuffer, 12) // Up one octave

      expect(result).toBeDefined()
      expect(result.length).toBeLessThan(mockBuffer.length)
    })

    it('should change pitch down', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const result = await AudioUtils.changePitch(mockBuffer, -12) // Down one octave

      expect(result).toBeDefined()
    })
  })

  describe('changeSpeed', () => {
    it('should change speed (faster)', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const result = await AudioUtils.changeSpeed(mockBuffer, 2) // 2x speed

      expect(result).toBeDefined()
      expect(result.length).toBeLessThan(mockBuffer.length)
    })

    it('should change speed (slower)', async () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 8000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(8000).fill(0.5),
      } as unknown as AudioBuffer

      const result = await AudioUtils.changeSpeed(mockBuffer, 0.5) // 0.5x speed

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(mockBuffer.length)
    })
  })

  describe('getMetadata', () => {
    it('should get audio metadata', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' })

      // Mock HTMLAudioElement
      const mockAudio = {
        duration: 10.5,
        src: '',
        onloadedmetadata: null as (() => void) | null,
        onerror: null as (() => void) | null,
      }

      const originalAudio = global.Audio
      global.Audio = class {
        constructor() {
          // Simulate async onloadedmetadata
          setTimeout(() => {
            if (mockAudio.onloadedmetadata) {
              mockAudio.onloadedmetadata()
            }
          }, 10)
          return mockAudio as any
        }
      } as any

      const metadata = await AudioUtils.getMetadata(blob)

      expect(metadata).toHaveProperty('duration')
      expect(metadata).toHaveProperty('format')
      expect(metadata.fileSize).toBe(blob.size)

      global.Audio = originalAudio
    }, 20000)
  })

  describe('audioBufferToWav', () => {
    it('should convert audio buffer to WAV blob', () => {
      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const wavBlob = AudioUtils.audioBufferToWav(mockBuffer)

      expect(wavBlob).toBeInstanceOf(Blob)
      expect(wavBlob.type).toBe('audio/wav')
    })

    it('should handle stereo audio', () => {
      const mockBuffer = {
        numberOfChannels: 2,
        length: 16000,
        sampleRate: 16000,
        getChannelData: (channel: number) => new Float32Array(16000).fill(0.5),
      } as unknown as AudioBuffer

      const wavBlob = AudioUtils.audioBufferToWav(mockBuffer)

      expect(wavBlob).toBeInstanceOf(Blob)
    })
  })

  describe('float32ToInt16', () => {
    it('should convert Float32Array to Int16Array', () => {
      const float32 = new Float32Array([0.5, -0.5, 1.0, -1.0])
      const int16 = AudioUtils.float32ToInt16(float32)

      expect(int16).toBeInstanceOf(Int16Array)
      expect(int16[0]).toBe(16383)
      expect(int16[1]).toBe(-16384)
      expect(int16[2]).toBe(32767)
      expect(int16[3]).toBe(-32768)
    })

    it('should clamp values', () => {
      const float32 = new Float32Array([2.0, -2.0])
      const int16 = AudioUtils.float32ToInt16(float32)

      expect(int16[0]).toBe(32767)
      expect(int16[1]).toBe(-32768)
    })
  })

  describe('int16ToFloat32', () => {
    it('should convert Int16Array to Float32Array', () => {
      const int16 = new Int16Array([16383, -16384, 32767, -32768])
      const float32 = AudioUtils.int16ToFloat32(int16)

      expect(float32).toBeInstanceOf(Float32Array)
      expect(float32[0]).toBeCloseTo(0.5, 2)
      expect(float32[1]).toBeCloseTo(-0.5, 2)
    })
  })
})

describe('Convenience functions', () => {
  it('reduceNoise should work as convenience function', async () => {
    const mockBuffer = {
      numberOfChannels: 1,
      length: 8000,
      sampleRate: 16000,
      getChannelData: () => new Float32Array(8000).fill(0.1),
    } as unknown as AudioBuffer

    const result = await reduceNoise(mockBuffer)
    expect(result).toBeDefined()
  })

  it('applyGain should work as convenience function', async () => {
    const mockBuffer = {
      numberOfChannels: 1,
      length: 8000,
      sampleRate: 16000,
      getChannelData: () => new Float32Array(8000).fill(0.5),
    } as unknown as AudioBuffer

    const result = await applyGain(mockBuffer, { gain: 1.5 })
    expect(result).toBeDefined()
  })

  it('generateWaveform should work as convenience function', () => {
    const buffer = generateWaveform({ type: 'sine', frequency: 440 })
    expect(buffer).toBeDefined()
  })

  it('extractWaveformData should work as convenience function', () => {
    const mockBuffer = {
      numberOfChannels: 1,
      length: 1000,
      sampleRate: 1000,
      duration: 1,
      getChannelData: () => new Float32Array(1000),
    } as unknown as AudioBuffer

    const data = extractWaveformData(mockBuffer, 50)
    expect(Array.isArray(data)).toBe(true)
  })

  it('extractSpectrumData should work as convenience function', () => {
    const mockBuffer = {
      numberOfChannels: 1,
      length: 2048,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(2048),
    } as unknown as AudioBuffer

    const data = extractSpectrumData(mockBuffer, 2048)
    expect(Array.isArray(data)).toBe(true)
  })
})

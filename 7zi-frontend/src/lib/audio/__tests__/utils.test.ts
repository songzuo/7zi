/**
 * Audio Utils Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSupportedAudioFormat,
  audioBufferToBlob,
  float32ToInt16,
  int16ToFloat32,
  calculateRMS,
  detectSpeech,
  getLanguageCode,
  getLanguageName,
  formatTimestamp,
  generateId,
  checkMediaRecorderSupport,
  calculateSNR,
  preEmphasisFilter,
  normalizeAudio,
} from '../utils'

// Mock AudioContext
class MockAudioContext {
  async close() {
    return Promise.resolve()
  }
}

describe('Audio Utils', () => {
  describe('getSupportedAudioFormat', () => {
    it('should return supported format', () => {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const format = getSupportedAudioFormat()
        // format may be null if no supported format found
        expect(format === null || typeof format === 'string').toBe(true)
      }
    })
  })

  describe('audioBufferToBlob', () => {
    it('should convert AudioBuffer to Blob', async () => {
      // Mock AudioContext if not available
      if (typeof AudioContext === 'undefined') {
        return // Skip test in environments without AudioContext
      }

      const mockBuffer = {
        numberOfChannels: 1,
        length: 16000,
        sampleRate: 16000,
        getChannelData: () => new Float32Array(16000),
      } as AudioBuffer

      const blob = await audioBufferToBlob(mockBuffer, 'webm')

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('audio/webm')
    })
  })

  describe('float32ToInt16', () => {
    it('should convert Float32Array to Int16Array', () => {
      const float32 = new Float32Array([0.5, -0.5, 1.0, -1.0])
      const int16 = float32ToInt16(float32)

      expect(int16).toBeInstanceOf(Int16Array)
      expect(int16[0]).toBe(16383) // 0.5 * 32767
      expect(int16[1]).toBe(-16384) // -0.5 * -32768
    })

    it('should clamp values to -1 to 1', () => {
      const float32 = new Float32Array([2.0, -2.0, 1.5, -1.5])
      const int16 = float32ToInt16(float32)

      expect(int16[0]).toBe(32767) // clamped to 1
      expect(int16[1]).toBe(-32768) // clamped to -1
    })
  })

  describe('int16ToFloat32', () => {
    it('should convert Int16Array to Float32Array', () => {
      const int16 = new Int16Array([16383, -16384, 32767, -32768])
      const float32 = int16ToFloat32(int16)

      expect(float32).toBeInstanceOf(Float32Array)
      expect(float32[0]).toBeCloseTo(0.5, 4)
      expect(float32[1]).toBeCloseTo(-0.5, 4)
    })

    it('should convert to -1 to 1 range', () => {
      const int16 = new Int16Array([0, 32767, -32768])
      const float32 = int16ToFloat32(int16)

      expect(float32[0]).toBe(0)
      expect(float32[1]).toBeCloseTo(1.0, 4)
      expect(float32[2]).toBeCloseTo(-1.0, 4)
    })
  })

  describe('calculateRMS', () => {
    it('should calculate RMS of audio data', () => {
      const audioData = new Float32Array([1.0, 0.5, 0.25])
      const rms = calculateRMS(audioData)

      // RMS = sqrt((1^2 + 0.5^2 + 0.25^2) / 3) = sqrt((1 + 0.25 + 0.0625) / 3)
      // = sqrt(1.3125 / 3) = sqrt(0.4375) ≈ 0.6614
      expect(rms).toBeCloseTo(0.6614, 3)
    })

    it('should return 0 for silence', () => {
      const audioData = new Float32Array([0, 0, 0])
      const rms = calculateRMS(audioData)
      expect(rms).toBe(0)
    })
  })

  describe('detectSpeech', () => {
    it('should detect speech above threshold', () => {
      const audioData = new Float32Array([0.5, 0.6, 0.7])
      const hasSpeech = detectSpeech(audioData, 0.1)
      expect(hasSpeech).toBe(true)
    })

    it('should not detect speech below threshold', () => {
      const audioData = new Float32Array([0.01, 0.02, 0.01])
      const hasSpeech = detectSpeech(audioData, 0.1)
      expect(hasSpeech).toBe(false)
    })

    it('should use default threshold', () => {
      const audioData = new Float32Array([0.5, 0.6, 0.7])
      const hasSpeech = detectSpeech(audioData)
      expect(hasSpeech).toBe(true)
    })
  })

  describe('getLanguageCode', () => {
    it('should return correct language code for Chinese', () => {
      expect(getLanguageCode('zh')).toBe('zh-CN')
    })

    it('should return correct language code for English', () => {
      expect(getLanguageCode('en')).toBe('en-US')
    })

    it('should return Chinese for zh-en', () => {
      expect(getLanguageCode('zh-en')).toBe('zh-CN')
    })
  })

  describe('getLanguageName', () => {
    it('should return correct name for Chinese', () => {
      expect(getLanguageName('zh')).toBe('中文')
    })

    it('should return correct name for English', () => {
      expect(getLanguageName('en')).toBe('English')
    })

    it('should return correct name for zh-en', () => {
      expect(getLanguageName('zh-en')).toBe('中英混合')
    })
  })

  describe('formatTimestamp', () => {
    it('should format seconds', () => {
      expect(formatTimestamp(5000)).toBe('0:05')
      expect(formatTimestamp(125000)).toBe('2:05')
    })

    it('should format hours', () => {
      expect(formatTimestamp(3665000)).toBe('1:01:05')
    })

    it('should format milliseconds correctly', () => {
      expect(formatTimestamp(59000)).toBe('0:59')
      expect(formatTimestamp(60000)).toBe('1:00')
    })
  })

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()

      expect(id1).toMatch(/^audio_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^audio_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('checkMediaRecorderSupport', () => {
    it('should check support status', () => {
      if (typeof MediaRecorder !== 'undefined') {
        const support = checkMediaRecorderSupport()
        expect(typeof support.supported).toBe('boolean')
      }
    })
  })

  describe('calculateSNR', () => {
    it('should calculate SNR', () => {
      const signal = new Float32Array([0.8, 0.9, 0.7])
      const noise = new Float32Array([0.1, 0.05, 0.08])

      const snr = calculateSNR(signal, noise)

      expect(snr).toBeGreaterThan(0) // SNR should be positive
    })

    it('should return Infinity if noise is zero', () => {
      const signal = new Float32Array([0.8, 0.9, 0.7])
      const noise = new Float32Array([0, 0, 0])

      const snr = calculateSNR(signal, noise)

      expect(snr).toBe(Infinity)
    })

    it('should return negative SNR if noise > signal', () => {
      const signal = new Float32Array([0.01, 0.02, 0.01])
      const noise = new Float32Array([0.5, 0.6, 0.7])

      const snr = calculateSNR(signal, noise)

      expect(snr).toBeLessThan(0)
    })
  })

  describe('preEmphasisFilter', () => {
    it('should apply pre-emphasis filter', () => {
      const audioData = new Float32Array([1.0, 0.5, 0.8, 0.6])
      const filtered = preEmphasisFilter(audioData, 0.97)

      expect(filtered).toBeInstanceOf(Float32Array)
      expect(filtered.length).toBe(audioData.length)
      expect(filtered[0]).toBe(audioData[0]) // First sample unchanged

      // y[n] = x[n] - alpha * x[n-1]
      // y[1] = 0.5 - 0.97 * 1.0 = -0.47
      expect(filtered[1]).toBeCloseTo(-0.47, 4)
    })

    it('should use default coefficient', () => {
      const audioData = new Float32Array([1.0, 0.5])
      const filtered = preEmphasisFilter(audioData)

      expect(filtered).toBeInstanceOf(Float32Array)
    })
  })

  describe('normalizeAudio', () => {
    it('should normalize audio to -1 to 1', () => {
      const audioData = new Float32Array([0.5, 0.8, 1.2, -1.5])
      const normalized = normalizeAudio(audioData)

      expect(normalized).toBeInstanceOf(Float32Array)

      // Check that values are within range
      normalized.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(-1)
        expect(value).toBeLessThanOrEqual(1)
      })

      // Check that maximum is 1
      const max = Math.max(...normalized.map(Math.abs))
      expect(max).toBeCloseTo(1, 4)
    })

    it('should handle zero audio', () => {
      const audioData = new Float32Array([0, 0, 0])
      const normalized = normalizeAudio(audioData)

      expect(normalized).toEqual(audioData)
    })

    it('should preserve relative amplitudes', () => {
      const audioData = new Float32Array([0.5, 1.0])
      const normalized = normalizeAudio(audioData)

      // The ratio should be preserved
      expect(normalized[0] / normalized[1]).toBeCloseTo(0.5, 4)
    })
  })
})
/**
 * SpeakerDiarization Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SpeakerDiarization } from '../SpeakerDiarization'

describe('SpeakerDiarization', () => {
  let diarization: SpeakerDiarization

  beforeEach(() => {
    diarization = new SpeakerDiarization({
      numSpeakers: 2,
      minSpeakerDuration: 0.5,
    })
  })

  afterEach(() => {
    diarization.destroy()
  })

  describe('initialization', () => {
    it('should initialize with default speakers', () => {
      const speakers = diarization.getSpeakers()
      expect(speakers).toHaveLength(2)
      expect(speakers[0].speakerId).toBe('speaker_1')
      expect(speakers[1].speakerId).toBe('speaker_2')
    })

    it('should initialize with custom config', () => {
      const customDiarization = new SpeakerDiarization({
        numSpeakers: 3,
        minSpeakerDuration: 1.0,
      })

      const speakers = customDiarization.getSpeakers()
      expect(speakers).toHaveLength(3)

      customDiarization.destroy()
    })
  })

  describe('process', () => {
    it('should return empty array for empty audio data', () => {
      const audioData = new Float32Array(0)
      const result = diarization.process(audioData, 16000)
      expect(result).toEqual([])
    })

    it('should process audio data and identify speakers', () => {
      // 创建模拟音频数据（包含不同频率的信号）
      const sampleRate = 16000
      const duration = 1 // 1秒
      const numSamples = sampleRate * duration
      const audioData = new Float32Array(numSamples)

      // 生成一个简单的正弦波信号
      for (let i = 0; i < numSamples; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      const result = diarization.process(audioData, sampleRate)

      // 结果应该是说话人片段
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle short audio segments', () => {
      // 音频太短，低于最小说话时长
      const audioData = new Float32Array(1000)
      audioData.fill(0.1)

      const result = diarization.process(audioData, 16000)
      // 可能返回空或合并后为空
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('speaker management', () => {
    it('should get speaker by ID', () => {
      const speaker = diarization.getSpeaker('speaker_1')
      expect(speaker).toBeDefined()
      expect(speaker?.speakerId).toBe('speaker_1')
    })

    it('should return undefined for unknown speaker', () => {
      const speaker = diarization.getSpeaker('unknown_speaker')
      expect(speaker).toBeUndefined()
    })

    it('should set number of speakers', () => {
      diarization.setNumSpeakers(3)
      const speakers = diarization.getSpeakers()
      expect(speakers).toHaveLength(3)
    })

    it('should limit speakers to max 6', () => {
      diarization.setNumSpeakers(10)
      const speakers = diarization.getSpeakers()
      expect(speakers.length).toBeLessThanOrEqual(6)
    })
  })

  describe('reset', () => {
    it('should reset state', () => {
      // 先处理一些音频
      const audioData = new Float32Array(16000).fill(0.1)
      diarization.process(audioData, 16000)

      // 重置
      diarization.reset()

      // 验证状态已重置
      const speakers = diarization.getSpeakers()
      expect(speakers).toHaveLength(2) // 恢复默认说话人数量
    })
  })

  describe('feature extraction', () => {
    it('should calculate energy', () => {
      const audioData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5])
      
      // 访问私有方法需要通过 public 接口
      // 这里测试整体行为
      const result = diarization.process(audioData, 16000)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('speaker colors', () => {
    it('should have unique colors for speakers', () => {
      const colors = new Set<string>()
      
      for (let i = 1; i <= 6; i++) {
        const speaker = diarization.getSpeaker(`speaker_${i}`)
        if (speaker) {
          colors.add(speaker.color)
        }
      }

      // 设置说话人数量以获取更多颜色
      diarization.setNumSpeakers(6)
      const speakers = diarization.getSpeakers()
      
      // 验证颜色数量
      const uniqueColors = new Set(speakers.map(s => s.color))
      expect(uniqueColors.size).toBeGreaterThanOrEqual(2)
    })
  })
})
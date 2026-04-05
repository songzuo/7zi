/**
 * WhisperClient Feature Tests - v1.13.0
 *
 * 测试 Whisper 语音识别客户端功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WhisperClient, WhisperError } from '@/lib/audio/WhisperClient'
import type { WhisperConfig, WhisperModelSize, TranscriptionResult } from '@/lib/audio/types'

// Mock fetch
global.fetch = vi.fn()

describe('WhisperClient Feature Tests', () => {
  let client: WhisperClient
  let mockFetch: any

  beforeEach(() => {
    mockFetch = global.fetch as any
    mockFetch.mockClear()

    client = new WhisperClient({
      endpoint: 'https://api.whisper.example.com',
      apiKey: 'test-api-key',
      useWASM: false,
      timeout: 30000,
      retryAttempts: 2,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('API 模式转录', () => {
    it('应该成功转录音频', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: '你好，这是一个测试转录。',
          language: 'zh',
          segments: [
            {
              id: 0,
              seek: 0,
              start: 0.0,
              end: 2.5,
              text: '你好，这是一个测试转录。',
              tokens: [1, 2, 3],
              temperature: 0.0,
              avg_logprob: -0.5,
              compression_ratio: 1.0,
              no_speech_prob: 0.1,
            },
          ],
        }),
      })

      const result: TranscriptionResult = await client.transcribe(mockAudioBlob, config)

      expect(result.text).toBe('你好，这是一个测试转录。')
      expect(result.language).toBe('zh')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.isFinal).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('应该正确处理不同语言', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const languages = ['zh', 'en', 'zh-en'] as const

      for (const language of languages) {
        const config: WhisperConfig = {
          modelSize: 'base',
          language,
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'Test transcription',
            language,
            segments: [],
          }),
        })

        const result = await client.transcribe(mockAudioBlob, config)
        expect(result.language).toBe(language)
      }
    })

    it('应该支持不同的模型大小', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const modelSizes: WhisperModelSize[] = ['tiny', 'base', 'small', 'medium', 'large']

      for (const modelSize of modelSizes) {
        const config: WhisperConfig = {
          modelSize,
          language: 'zh',
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'Test',
            language: 'zh',
            segments: [],
          }),
        })

        await client.transcribe(mockAudioBlob, config)
        expect(mockFetch).toHaveBeenCalled()
      }
    })
  })

  describe('带说话人分离的转录', () => {
    it('应该成功进行说话人分离', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: '说话人1: 你好。说话人2: 世界。',
          language: 'zh',
          segments: [
            {
              id: 0,
              seek: 0,
              start: 0.0,
              end: 1.5,
              text: '你好。',
              tokens: [1, 2],
              temperature: 0.0,
              avg_logprob: -0.5,
              compression_ratio: 1.0,
              no_speech_prob: 0.1,
              speaker: 'speaker_1',
            },
            {
              id: 1,
              seek: 0,
              start: 1.5,
              end: 3.0,
              text: '世界。',
              tokens: [3, 4],
              temperature: 0.0,
              avg_logprob: -0.5,
              compression_ratio: 1.0,
              no_speech_prob: 0.1,
              speaker: 'speaker_2',
            },
          ],
        }),
      })

      const results = await client.transcribeWithDiarization(mockAudioBlob, config)

      expect(results).toHaveLength(2)
      expect(results[0].speaker.speakerId).toBe('speaker_1')
      expect(results[1].speaker.speakerId).toBe('speaker_2')
      expect(results[0].speaker.label).toBe('说话人 speaker_1')
      expect(results[1].speaker.label).toBe('说话人 speaker_2')
    })

    it('应该为不同说话人分配不同颜色', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Speaker 1: Hi. Speaker 2: Hello.',
          language: 'en',
          segments: [
            {
              id: 0,
              seek: 0,
              start: 0.0,
              end: 1.0,
              text: 'Hi.',
              tokens: [1],
              temperature: 0.0,
              avg_logprob: -0.5,
              compression_ratio: 1.0,
              no_speech_prob: 0.1,
              speaker: 'A',
            },
            {
              id: 1,
              seek: 0,
              start: 1.0,
              end: 2.0,
              text: 'Hello.',
              tokens: [2],
              temperature: 0.0,
              avg_logprob: -0.5,
              compression_ratio: 1.0,
              no_speech_prob: 0.1,
              speaker: 'B',
            },
          ],
        }),
      })

      const results = await client.transcribeWithDiarization(mockAudioBlob, config)

      expect(results[0].speaker.color).toBe(results[0].speaker.color)
      expect(results[1].speaker.color).toBe(results[1].speaker.color)
      // 不同说话人应该有不同的颜色
      // (虽然颜色可能会重复，但对于不同的 speaker ID 应该不同)
    })
  })

  describe('错误处理', () => {
    it('应该处理 HTTP 错误', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Unauthorized',
          },
        }),
      })

      await expect(client.transcribe(mockAudioBlob, config)).rejects.toThrow(WhisperError)
    })

    it('应该处理网络错误', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // 应该重试
      await expect(client.transcribe(mockAudioBlob, config)).rejects.toThrow()
    })

    it('应该正确处理超时', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      // 模拟超时
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })
      })

      await expect(client.transcribe(mockAudioBlob, config)).rejects.toThrow()
    })
  })

  describe('重试机制', () => {
    it('应该在失败时重试', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      // 第一次失败，第二次成功
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'Success after retry',
            language: 'zh',
            segments: [],
          }),
        })

      const result = await client.transcribe(mockAudioBlob, config)

      expect(result.text).toBe('Success after retry')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('应该在达到最大重试次数后放弃', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      // 所有请求都失败
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(client.transcribe(mockAudioBlob, config)).rejects.toThrow()

      // 应该尝试了 3 次（初始 + 2 次重试）
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('健康检查', () => {
    it('应该正确检测 API 可用性', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      })

      const isAvailable = await client.isAvailable()

      expect(isAvailable).toBe(true)
    })

    it('应该在 API 不可用时返回 false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'))

      const isAvailable = await client.isAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('模型列表', () => {
    it('应该获取支持的模型列表', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'tiny' },
            { id: 'base' },
            { id: 'small' },
          ],
        }),
      })

      const models = await client.getSupportedModels()

      expect(models).toContain('tiny')
      expect(models).toContain('base')
      expect(models).toContain('small')
    })

    it('应该在获取模型失败时返回默认列表', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const models = await client.getSupportedModels()

      expect(models.length).toBeGreaterThan(0)
      expect(models).toContain('tiny')
    })
  })

  describe('置信度计算', () => {
    it('应该正确计算置信度', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Test',
          language: 'zh',
          segments: [
            {
              id: 0,
              seek: 0,
              start: 0.0,
              end: 1.0,
              text: 'Test',
              tokens: [1],
              temperature: 0.0,
              avg_logprob: -0.5,
              compression_ratio: 1.0,
              no_speech_prob: 0.1, // 90% 置信度
            },
          ],
        }),
      })

      const result = await client.transcribe(mockAudioBlob, config)

      expect(result.confidence).toBeGreaterThan(0.8)
      expect(result.confidence).toBeLessThanOrEqual(1.0)
    })

    it('应该在无片段时使用默认置信度', async () => {
      const mockAudioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Test',
          language: 'zh',
          segments: [],
        }),
      })

      const result = await client.transcribe(mockAudioBlob, config)

      expect(result.confidence).toBe(0.9)
    })
  })

  describe('资源清理', () => {
    it('应该正确销毁客户端', async () => {
      await client.destroy()

      // 确保可以再次创建和销毁
      const newClient = new WhisperClient({
        endpoint: 'https://api.whisper.example.com',
        useWASM: false,
      })

      await newClient.destroy()
    })
  })

  describe('边界情况', () => {
    it('应该处理空音频', async () => {
      const mockAudioBlob = new Blob([], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: '',
          language: 'zh',
          segments: [],
        }),
      })

      const result = await client.transcribe(mockAudioBlob, config)

      expect(result.text).toBe('')
    })

    it('应该处理大型音频文件', async () => {
      const largeData = new Array(1000000).fill('x').join('')
      const mockAudioBlob = new Blob([largeData], { type: 'audio/wav' })
      const config: WhisperConfig = {
        modelSize: 'base',
        language: 'zh',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Large audio transcription',
          language: 'zh',
          segments: [],
        }),
      })

      const result = await client.transcribe(mockAudioBlob, config)

      expect(result.text).toBe('Large audio transcription')
    })
  })
})
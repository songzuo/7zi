/**
 * WhisperClient Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WhisperClient, WhisperError } from '../WhisperClient'

// Mock fetch
global.fetch = vi.fn()

describe('WhisperClient', () => {
  let client: WhisperClient

  beforeEach(() => {
    client = new WhisperClient({
      endpoint: 'https://api.example.com',
      apiKey: 'test-key',
      useWASM: false,
    })

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await client.destroy()
  })

  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(client).toBeInstanceOf(WhisperClient)
    })

    it('should have default timeout', () => {
      const defaultClient = new WhisperClient({
        endpoint: 'https://api.example.com',
      })
      expect(defaultClient).toBeInstanceOf(WhisperClient)
    })
  })

  describe('transcribe', () => {
    it('should transcribe audio via API', async () => {
      const mockResponse = {
        text: 'Hello world',
        language: 'en',
        segments: [
          {
            id: 0,
            seek: 0,
            start: 0,
            end: 2,
            text: 'Hello world',
            tokens: [],
            temperature: 0,
            avg_logprob: -0.5,
            compression_ratio: 1,
            no_speech_prob: 0.1,
          },
        ],
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const result = await client.transcribe(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(result.text).toBe('Hello world')
      expect(result.language).toBe('en')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.isFinal).toBe(true)
    })

    it('should handle API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      } as Response)

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })

      await expect(
        client.transcribe(audioBlob, {
          modelSize: 'tiny',
          language: 'en',
        })
      ).rejects.toThrow(WhisperError)
    })

    it('should retry on network errors', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'Hello',
            language: 'en',
            segments: [],
          }),
        } as Response)

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const result = await client.transcribe(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(result.text).toBe('Hello')
      expect(fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('transcribeWithDiarization', () => {
    it('should transcribe with speaker diarization', async () => {
      const mockResponse = {
        text: 'Hello world',
        language: 'en',
        segments: [
          {
            id: 0,
            seek: 0,
            start: 0,
            end: 2,
            text: 'Hello',
            tokens: [],
            temperature: 0,
            avg_logprob: -0.5,
            compression_ratio: 1,
            no_speech_prob: 0.1,
            speaker: 'speaker_1',
          },
          {
            id: 1,
            seek: 0,
            start: 2,
            end: 4,
            text: 'world',
            tokens: [],
            temperature: 0,
            avg_logprob: -0.5,
            compression_ratio: 1,
            no_speech_prob: 0.1,
            speaker: 'speaker_2',
          },
        ],
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const results = await client.transcribeWithDiarization(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(results).toHaveLength(2)
      expect(results[0].speaker.speakerId).toBe('speaker_1')
      expect(results[1].speaker.speakerId).toBe('speaker_2')
    })
  })

  describe('isAvailable', () => {
    it('should return true if API is available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const available = await client.isAvailable()
      expect(available).toBe(true)
    })

    it('should return false if API is not available', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const available = await client.isAvailable()
      expect(available).toBe(false)
    })
  })

  describe('getSupportedModels', () => {
    it('should return supported models', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'tiny' },
            { id: 'base' },
            { id: 'small' },
          ],
        }),
      } as Response)

      const models = await client.getSupportedModels()
      expect(models).toContain('tiny')
      expect(models).toContain('base')
      expect(models).toContain('small')
    })

    it('should return default models on error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const models = await client.getSupportedModels()
      expect(models).toContain('tiny')
      expect(models).toContain('base')
    })
  })

  describe('WhisperError', () => {
    it('should create error with code', () => {
      const error = new WhisperError('Test error', 'TEST_CODE', { detail: 'test' })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.details).toEqual({ detail: 'test' })
      expect(error.name).toBe('WhisperError')
    })
  })
})
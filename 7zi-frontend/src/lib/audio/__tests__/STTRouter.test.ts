/**
 * STTRouter Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { STTRouter, createSTTRouter, sttRouter } from '../STTRouter'
import { WhisperClient } from '../WhisperClient'

// Mock WhisperClient
const mockWhisperClient = {
  transcribe: vi.fn(),
  transcribeWithDiarization: vi.fn(),
  isAvailable: vi.fn().mockResolvedValue(true),
  destroy: vi.fn(),
}

vi.mock('../WhisperClient', () => ({
  WhisperClient: vi.fn().mockImplementation(() => mockWhisperClient),
  WhisperError: class extends Error {
    constructor(message: string, public code: string, public details?: unknown) {
      super(message)
      this.name = 'WhisperError'
    }
  },
}))

// Mock browser speech recognition
const mockSpeechRecognition = vi.fn()
global.window = {
  ...global.window,
  webkitSpeechRecognition: mockSpeechRecognition,
} as any

describe('STTRouter', () => {
  let router: STTRouter

  beforeEach(() => {
    router = new STTRouter({
      defaultProvider: 'whisper',
      fallbackProviders: ['browser'],
    })

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await router.destroy()
  })

  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(router).toBeInstanceOf(STTRouter)
    })

    it('should initialize providers', async () => {
      await router.initialize()
      const providers = router.getAvailableProviders()
      expect(providers.length).toBeGreaterThan(0)
    })
  })

  describe('transcribe', () => {
    it('should transcribe with default provider', async () => {
      await router.initialize()

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const whisperClient = (router as any).providers.get('whisper')

      whisperClient.transcribe.mockResolvedValue({
        text: 'Hello world',
        language: 'en',
        confidence: 0.9,
        timestamp: Date.now(),
        isFinal: true,
      })

      const result = await router.transcribe(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(result.provider).toBe('whisper')
      expect(result.result.text).toBe('Hello world')
      expect(result.usedFallback).toBe(false)
    })

    it('should use fallback provider on error', async () => {
      await router.initialize()

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const whisperClient = (router as any).providers.get('whisper')

      // Whisper fails
      whisperClient.transcribe.mockRejectedValue(new Error('Whisper failed'))

      // Browser speech recognition mock
      mockSpeechRecognition.mockImplementation(() => ({
        lang: 'en-US',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onresult: null,
        onerror: null,
        onend: null,
        start: vi.fn(),
      }))

      const result = await router.transcribe(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(result.usedFallback).toBe(true)
    })

    it('should throw error if all providers fail', async () => {
      await router.initialize()

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const whisperClient = (router as any).providers.get('whisper')

      whisperClient.transcribe.mockRejectedValue(new Error('Whisper failed'))

      await expect(
        router.transcribe(audioBlob, {
          modelSize: 'tiny',
          language: 'en',
        })
      ).rejects.toThrow('All STT providers failed')
    })
  })

  describe('transcribeWithDiarization', () => {
    it('should transcribe with speaker diarization', async () => {
      await router.initialize()

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const whisperClient = (router as any).providers.get('whisper')

      whisperClient.transcribeWithDiarization.mockResolvedValue([
        {
          text: 'Hello',
          language: 'en',
          confidence: 0.9,
          timestamp: Date.now(),
          isFinal: true,
          speaker: {
            speakerId: 'speaker_1',
            label: '说话人 1',
            color: '#3B82F6',
          },
        },
      ])

      const result = await router.transcribeWithDiarization(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].speaker.speakerId).toBe('speaker_1')
    })

    it('should fallback to regular transcription on diarization error', async () => {
      await router.initialize()

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })
      const whisperClient = (router as any).providers.get('whisper')

      // Diarization fails
      whisperClient.transcribeWithDiarization.mockRejectedValue(
        new Error('Diarization failed')
      )

      // Regular transcription succeeds
      whisperClient.transcribe.mockResolvedValue({
        text: 'Hello',
        language: 'en',
        confidence: 0.9,
        timestamp: Date.now(),
        isFinal: true,
      })

      const result = await router.transcribeWithDiarization(audioBlob, {
        modelSize: 'tiny',
        language: 'en',
      })

      expect(result.usedFallback).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].speaker.speakerId).toBe('speaker_1')
    })
  })

  describe('createStream', () => {
    it('should create transcription stream', async () => {
      await router.initialize()

      const stream = await router.createStream({
        url: 'ws://localhost:8080/transcribe',
        language: 'zh',
      })

      expect(stream).toBeDefined()
      expect(stream.connected).toBe(true)

      stream.destroy()
    })

    it('should throw error for non-websocket provider', async () => {
      await router.initialize()

      await expect(
        router.createStream(
          {
            url: 'ws://localhost:8080/transcribe',
            language: 'zh',
          },
          'whisper'
        )
      ).rejects.toThrow('does not support streaming')
    })
  })

  describe('provider management', () => {
    it('should get current provider', () => {
      const provider = router.getCurrentProvider()
      expect(provider).toBe('whisper')
    })

    it('should get available providers', async () => {
      await router.initialize()
      const providers = router.getAvailableProviders()
      expect(Array.isArray(providers)).toBe(true)
    })

    it('should check provider availability', async () => {
      await router.initialize()
      expect(router.isProviderAvailable('whisper')).toBe(true)
    })

    it('should switch provider', async () => {
      await router.initialize()

      await router.switchProvider('browser')
      expect(router.getCurrentProvider()).toBe('browser')
    })

    it('should throw error when switching to unavailable provider', async () => {
      await router.initialize()

      await expect(router.switchProvider('websocket' as any)).rejects.toThrow(
        'is not available'
      )
    })
  })

  describe('language mapping', () => {
    it('should map language codes', async () => {
      const routerWithMapping = new STTRouter({
        defaultProvider: 'browser',
        languageMapping: {
          zh: 'zh-CN',
          en: 'en-GB',
        },
      })

      await routerWithMapping.initialize()

      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' })

      // Mock speech recognition
      mockSpeechRecognition.mockImplementation(() => ({
        lang: 'zh-CN',
        continuous: false,
        interimResults: false,
        maxAlternatives: 1,
        onresult: null,
        onerror: null,
        onend: null,
        start: vi.fn(),
      }))

      await routerWithMapping.transcribe(audioBlob, {
        modelSize: 'tiny',
        language: 'zh',
      })

      await routerWithMapping.destroy()
    })
  })

  describe('destroy', () => {
    it('should destroy all providers', async () => {
      await router.initialize()

      const whisperClient = (router as any).providers.get('whisper')
      whisperClient.destroy.mockResolvedValue(undefined)

      await router.destroy()

      expect(whisperClient.destroy).toHaveBeenCalled()
    })
  })
})

describe('createSTTRouter', () => {
  it('should create router with default config', () => {
    const router = createSTTRouter()
    expect(router).toBeInstanceOf(STTRouter)
    router.destroy()
  })

  it('should create router with custom config', () => {
    const router = createSTTRouter({
      defaultProvider: 'browser',
      fallbackProviders: ['whisper'],
    })
    expect(router).toBeInstanceOf(STTRouter)
    router.destroy()
  })
})

describe('sttRouter', () => {
  it('should export default router instance', () => {
    expect(sttRouter).toBeInstanceOf(STTRouter)
  })
})
// @ts-nocheck - Test file with complex type issues
/**
 * Multimodal Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MultimodalService } from '../multimodal-service'
import type { ImageUploadOptions, AudioTranscriptionOptions } from '../types'

// Mock providers
vi.mock('../volcengine-provider', vi => ({
  VolcengineProvider: vi.fn().mockImplementation(() => ({
    recognizeImage: vi.fn(),
    transcribeAudio: vi.fn(),
    healthCheck: vi.fn(),
  })),
}))

vi.mock('../bailian-provider', vi => ({
  BailianProvider: vi.fn().mockImplementation(() => ({
    recognizeImage: vi.fn(),
    transcribeAudio: vi.fn(),
    healthCheck: vi.fn(),
  })),
}))

describe('MultimodalService', () => {
  let service: MultimodalService

  beforeEach(() => {
    service = new MultimodalService()
    // Clear env vars
    delete process.env.VOLCENGINE_API_KEY
    delete process.env.BAILIAN_API_KEY
  })

  describe('Provider Initialization', () => {
    it('should initialize Volcengine provider when API key is present', () => {
      process.env.VOLCENGINE_API_KEY = 'test-key'
      const newService = new MultimodalService()
      const providers = newService.getProviders()
      expect(providers.some(p => p.name === 'volcengine')).toBe(true)
    })

    it('should initialize Bailian provider when API key is present', () => {
      process.env.BAILIAN_API_KEY = 'test-key'
      const newService = new MultimodalService()
      const providers = newService.getProviders()
      expect(providers.some(p => p.name === 'bailian')).toBe(true)
    })

    it('should return empty providers list when no API keys are set', () => {
      const providers = service.getProviders()
      expect(providers).toHaveLength(0)
    })
  })

  describe('Image Processing', () => {
    it('should validate image size', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
      const options: ImageUploadOptions = { maxSize: 10 * 1024 * 1024 }

      // Mock provider
      process.env.VOLCENGINE_API_KEY = 'test-key'
      const newService = new MultimodalService()

      const result = await newService.processImage(largeBuffer, options)
      expect(result.success).toBe(false)
      expect(result.error).toContain('exceeds')
    })

    it('should throw error when provider not available', async () => {
      const buffer = Buffer.alloc(1000)
      await expect(service.processImage(buffer, {}, 'nonexistent')).rejects.toThrow(
        "Provider 'nonexistent' not available"
      )
    })
  })

  describe('Audio Processing', () => {
    it('should validate audio size', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024) // 51MB
      const options = { maxSize: 50 * 1024 * 1024 } as unknown as AudioTranscriptionOptions

      // Mock provider
      process.env.VOLCENGINE_API_KEY = 'test-key'
      const newService = new MultimodalService()

      const result = await newService.processAudio(largeBuffer, options)
      expect(result.success).toBe(false)
      expect(result.error).toContain('exceeds')
    })

    it('should throw error when provider not available', async () => {
      const buffer = Buffer.alloc(1000)
      await expect(service.processAudio(buffer, {}, 'nonexistent')).rejects.toThrow(
        "Provider 'nonexistent' not available"
      )
    })
  })

  describe('Health Check', () => {
    it('should return health status for all providers', async () => {
      process.env.VOLCENGINE_API_KEY = 'test-key'
      process.env.BAILIAN_API_KEY = 'test-key'
      const newService = new MultimodalService()

      const health = await newService.healthCheck()
      expect(health).toHaveProperty('volcengine')
      expect(health).toHaveProperty('bailian')
    })

    it('should return empty object when no providers', async () => {
      const health = await service.healthCheck()
      expect(health).toEqual({})
    })
  })

  describe('Default Provider', () => {
    it('should set default provider from environment', () => {
      process.env.VOLCENGINE_API_KEY = 'test-key'
      process.env.MULTIMODAL_PREFERRED_PROVIDER = 'volcengine'
      const newService = new MultimodalService()

      expect(newService['defaultProvider']).toBe('volcengine')
    })

    it('should set default provider when provider exists', () => {
      process.env.VOLCENGINE_API_KEY = 'test-key'
      const newService = new MultimodalService()
      newService.setDefaultProvider('volcengine')

      expect(newService['defaultProvider']).toBe('volcengine')
    })

    it('should throw error when setting non-existent default provider', () => {
      expect(() => service.setDefaultProvider('nonexistent')).toThrow(
        "Provider 'nonexistent' not available"
      )
    })
  })
})

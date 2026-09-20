/**
 * Feature Extractor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FeatureExtractor } from '../feature-extractor'
import type { FeatureExtractorConfig } from '../types'

describe('FeatureExtractor', () => {
  let extractor: FeatureExtractor

  beforeEach(() => {
    extractor = new FeatureExtractor()
  })

  describe('Text Feature Extraction', () => {
    it('should extract features from simple text', () => {
      const result = extractor.extractFromText('Hello world')

      expect(result.features).toBeDefined()
      expect(result.features.length).toBe(11)
      expect(result.features.wordCount).toBe(2)
      expect(result.vector).toHaveLength(128)
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle empty text', () => {
      const result = extractor.extractFromText('')

      expect(result.features.wordCount).toBe(0)
      expect(result.features.length).toBe(0)
    })

    it('should extract features from complex text', () => {
      const text = 'The quick brown fox jumps over the lazy dog. It has 123 numbers!'
      const result = extractor.extractFromText(text)

      expect(result.features.wordCount).toBeGreaterThanOrEqual(12)
      expect(result.features.sentenceCount).toBe(2)
      expect(result.features.digitRatio).toBeGreaterThan(0)
      expect(result.features.punctuationRatio).toBeGreaterThan(0)
    })

    it('should include metadata when configured', () => {
      const result = extractor.extractFromText('test', { custom: 'value' })

      expect(result.metadata.type).toBe('text')
      expect(result.metadata.custom).toBe('value')
    })

    it('should normalize vectors when configured', () => {
      const result = extractor.extractFromText('Hello world')

      const norm = Math.sqrt(result.vector.reduce((sum, val) => sum + val * val, 0))
      expect(norm).toBeCloseTo(1, 10)
    })
  })

  describe('Structured Data Feature Extraction', () => {
    it('should extract features from simple object', () => {
      const data = { name: 'test', age: 25, active: true }
      const result = extractor.extractFromStructured(data)

      expect(result.features.fieldCount).toBe(3)
      expect(result.features.stringCount).toBe(1)
      expect(result.features.numberCount).toBe(1)
      expect(result.features.booleanCount).toBe(1)
    })

    it('should handle null and undefined values', () => {
      const data = { a: null, b: undefined, c: 'value' }
      const result = extractor.extractFromStructured(data)

      expect(result.features.nullCount).toBe(2)
      expect(result.features.fieldCount).toBe(3)
    })

    it('should handle nested objects', () => {
      const data = { a: { b: { c: 1 } } }
      const result = extractor.extractFromStructured(data)

      expect(result.features.nestingDepth).toBe(3)
    })

    it('should handle arrays', () => {
      const data = { items: [1, 2, 3], tags: ['a', 'b'] }
      const result = extractor.extractFromStructured(data)

      expect(result.features.arrayCount).toBe(2)
    })
  })

  describe('Interaction Feature Extraction', () => {
    it('should extract features from interaction', () => {
      const interaction = {
        userMessage: 'Hello',
        assistantResponse: 'Hi there! How can I help?',
        timestamp: Date.now(),
        rating: 5,
      }
      const result = extractor.extractFromInteraction(interaction)

      expect(result.features.wordCount).toBeGreaterThan(0)
      expect(result.features.responseWordCount).toBeGreaterThan(0)
      expect(result.features.rating).toBe(5)
      expect(result.features.timestamp).toBe(interaction.timestamp)
    })

    it('should calculate response ratio', () => {
      const interaction = {
        userMessage: 'Hi',
        assistantResponse: 'Hello! This is a longer response.',
        timestamp: Date.now(),
      }
      const result = extractor.extractFromInteraction(interaction)

      expect(result.features.responseRatio).toBeGreaterThan(1)
    })

    it('should handle missing rating', () => {
      const interaction = {
        userMessage: 'Hello',
        assistantResponse: 'Hi',
        timestamp: Date.now(),
      }
      const result = extractor.extractFromInteraction(interaction)

      expect(result.features.rating).toBe(0)
    })
  })

  describe('Custom Extractors', () => {
    it('should use custom extractor', () => {
      const config: Partial<FeatureExtractorConfig> = {
        customExtractors: {
          myExtractor: (data: unknown) => {
            const str = String(data)
            return str.length
          },
        },
      }
      const customExtractor = new FeatureExtractor(config)

      const result = customExtractor.extractCustom('hello', 'myExtractor')

      expect(result.features.custom).toBe(5)
      expect(result.metadata.extractor).toBe('myExtractor')
    })

    it('should throw error for unknown extractor', () => {
      expect(() => {
        extractor.extractCustom('data', 'unknown')
      }).toThrow("Custom extractor 'unknown' not found")
    })
  })

  describe('Vector Operations', () => {
    it('should pad vectors to target dimensions', () => {
      const config: Partial<FeatureExtractorConfig> = { dimensions: 256 }
      const extractor256 = new FeatureExtractor(config)

      const result = extractor256.extractFromText('test')

      expect(result.vector).toHaveLength(256)
    })

    it('should truncate vectors if too long', () => {
      const config: Partial<FeatureExtractorConfig> = { dimensions: 64 }
      const extractor64 = new FeatureExtractor(config)

      const result = extractor64.extractFromText('test')

      expect(result.vector).toHaveLength(64)
    })

    it('should disable normalization when configured', () => {
      const config: Partial<FeatureExtractorConfig> = { normalize: false }
      const noNormExtractor = new FeatureExtractor(config)

      const result = noNormExtractor.extractFromText('Hello world')

      const norm = Math.sqrt(result.vector.reduce((sum, val) => sum + val * val, 0))
      expect(norm).not.toBeCloseTo(1, 10)
    })
  })

  describe('Statistics and History', () => {
    it('should track extraction statistics', () => {
      extractor.extractFromText('test1')
      extractor.extractFromText('test2')
      extractor.extractFromStructured({ a: 1 })

      const stats = extractor.getStatistics()

      expect(stats.text).toBeDefined()
      expect(stats.text.count).toBe(2)
      expect(stats.structured).toBeDefined()
      expect(stats.structured.count).toBe(1)
    })

    it('should calculate average confidence', () => {
      extractor.extractFromText('test')
      extractor.extractFromText('test')

      const stats = extractor.getStatistics()

      expect(stats.text.avgConfidence).toBeGreaterThan(0)
      expect(stats.text.avgConfidence).toBeLessThanOrEqual(1)
    })

    it('should clear history', () => {
      extractor.extractFromText('test')
      extractor.clearHistory()

      const stats = extractor.getStatistics()

      expect(Object.keys(stats).length).toBe(0)
    })
  })

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on features', () => {
      const result = extractor.extractFromText('The quick brown fox jumps over the lazy dog')

      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should give lower confidence for sparse features', () => {
      const result = extractor.extractFromText('')

      expect(result.confidence).toBeLessThan(0.5)
    })
  })
})

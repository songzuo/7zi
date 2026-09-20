/**
 * Learning Pipeline Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LearningPipeline, getDefaultPipeline, resetDefaultPipeline } from '../index'

describe('LearningPipeline', () => {
  let pipeline: LearningPipeline

  beforeEach(() => {
    pipeline = new LearningPipeline()
    resetDefaultPipeline()
  })

  describe('Initialization', () => {
    it('should create all components', () => {
      expect(pipeline.featureExtractor).toBeDefined()
      expect(pipeline.vectorStore).toBeDefined()
      expect(pipeline.qualityAnalyzer).toBeDefined()
    })

    it('should accept custom configuration', () => {
      const customPipeline = new LearningPipeline({
        featureExtractor: { dimensions: 256 },
        vectorStore: { metric: 'euclidean' },
        qualityAnalyzer: { minAccuracy: 0.9 },
      })

      expect(customPipeline).toBeDefined()
    })
  })

  describe('Learning Operations', () => {
    it('should learn from text', async () => {
      await pipeline.learnFromText('doc-1', 'Hello world', { category: 'greeting' })

      const vector = pipeline.vectorStore.getVector('doc-1')
      expect(vector).toBeDefined()
      expect(vector?.metadata.category).toBe('greeting')
    })

    it('should learn from structured data', async () => {
      const data = { name: 'Test', value: 42 }

      await pipeline.learnFromStructured('data-1', data, { source: 'test' })

      const vector = pipeline.vectorStore.getVector('data-1')
      expect(vector).toBeDefined()
    })

    it('should learn from interaction', async () => {
      const interaction = {
        userMessage: 'Hello',
        assistantResponse: 'Hi there!',
        timestamp: Date.now(),
        rating: 5,
      }

      await pipeline.learnFromInteraction('int-1', interaction)

      const vector = pipeline.vectorStore.getVector('int-1')
      expect(vector).toBeDefined()
    })
  })

  describe('Search Operations', () => {
    beforeEach(async () => {
      await pipeline.learnFromText('doc-1', 'The quick brown fox jumps over the lazy dog')
      await pipeline.learnFromText('doc-2', 'Hello world this is a test')
      await pipeline.learnFromText('doc-3', 'Machine learning is fascinating')
    })

    it('should search for similar documents', async () => {
      const results = await pipeline.searchSimilar('Hello world', 2)

      expect(results).toHaveLength(2)
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('should return results ordered by similarity', async () => {
      const results = await pipeline.searchSimilar('Hello world')

      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
      }
    })
  })

  describe('Quality Analysis', () => {
    it('should analyze quality of learned features', async () => {
      await pipeline.learnFromText('doc-1', 'Test document')

      const assessment = await pipeline.analyzeQuality()

      expect(assessment).toBeDefined()
      expect(assessment.metrics).toBeDefined()
      expect(assessment.issues).toBeDefined()
      expect(assessment.recommendations).toBeDefined()
    })
  })

  describe('Statistics', () => {
    it('should return pipeline statistics', async () => {
      await pipeline.learnFromText('doc-1', 'Test')
      await pipeline.learnFromText('doc-2', 'Another test')

      const stats = pipeline.getStatistics()

      expect(stats.featureExtractor).toBeDefined()
      expect(stats.vectorStore).toBeDefined()
      expect(stats.quality).toBeDefined()
      expect(stats.vectorStore.totalVectors).toBe(2)
    })
  })

  describe('Default Pipeline', () => {
    it('should return singleton instance', () => {
      const pipeline1 = getDefaultPipeline()
      const pipeline2 = getDefaultPipeline()

      expect(pipeline1).toBe(pipeline2)
    })

    it('should reset default pipeline', () => {
      const pipeline1 = getDefaultPipeline()
      resetDefaultPipeline()
      const pipeline2 = getDefaultPipeline()

      expect(pipeline1).not.toBe(pipeline2)
    })
  })
})

describe('Exports', () => {
  it('should export all types', async () => {
    const types = await import('../types')

    expect(types).toBeDefined()
  })

  it('should export all core classes', async () => {
    const index = await import('../index')

    expect(index.FeatureExtractor).toBeDefined()
    expect(index.VectorStore).toBeDefined()
    expect(index.QualityAnalyzer).toBeDefined()
    expect(index.LearningPipeline).toBeDefined()
  })
})

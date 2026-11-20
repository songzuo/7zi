/**
 * Vector Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VectorStore } from '../vector-store'
import type { VectorStoreConfig } from '../types'

describe('VectorStore', () => {
  let store: VectorStore

  beforeEach(() => {
    store = new VectorStore()
  })

  const createVector = (value: number): number[] => {
    return Array(128).fill(value)
  }

  describe('Vector Operations', () => {
    it('should add a vector', async () => {
      const vector = createVector(0.5)
      await store.addVector('test-1', vector)

      const retrieved = store.getVector('test-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('test-1')
    })

    it('should reject vectors with wrong dimensions', async () => {
      const wrongVector = [0.1, 0.2, 0.3] // 3 dimensions, expected 128

      await expect(store.addVector('test', wrongVector)).rejects.toThrow(
        'Vector dimension mismatch'
      )
    })

    it('should store metadata', async () => {
      const vector = createVector(0.5)
      await store.addVector('test-1', vector, { type: 'document', category: 'test' })

      const retrieved = store.getVector('test-1')
      expect(retrieved?.metadata.type).toBe('document')
      expect(retrieved?.metadata.category).toBe('test')
    })

    it('should record timestamp', async () => {
      const before = Date.now()
      await store.addVector('test-1', createVector(0.5))
      const after = Date.now()

      const retrieved = store.getVector('test-1')
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(before)
      expect(retrieved?.timestamp).toBeLessThanOrEqual(after)
    })

    it('should remove a vector', async () => {
      await store.addVector('test-1', createVector(0.5))

      const removed = store.removeVector('test-1')

      expect(removed).toBe(true)
      expect(store.getVector('test-1')).toBeUndefined()
    })

    it('should return false when removing non-existent vector', () => {
      const removed = store.removeVector('non-existent')
      expect(removed).toBe(false)
    })
  })

  describe('Batch Operations', () => {
    it('should add multiple vectors', async () => {
      const vectors = [
        { id: 'vec-1', vector: createVector(0.1) },
        { id: 'vec-2', vector: createVector(0.2) },
        { id: 'vec-3', vector: createVector(0.3) },
      ]

      await store.addBatch(vectors)

      expect(store.getAllIds()).toHaveLength(3)
    })

    it('should import exported vectors', async () => {
      // Add some vectors
      await store.addVector('v1', createVector(0.1))
      await store.addVector('v2', createVector(0.2))

      // Export
      const exported = store.export()
      expect(exported).toHaveLength(2)

      // Clear and reimport
      store.clear()
      await store.import(exported)

      expect(store.getAllIds()).toHaveLength(2)
    })

    it('should merge with another store', async () => {
      // Setup first store
      await store.addVector('a', createVector(0.1))
      await store.addVector('b', createVector(0.2))

      // Create second store
      const store2 = new VectorStore()
      await store2.addVector('c', createVector(0.3))
      await store2.addVector('d', createVector(0.4))

      // Merge
      await store.merge(store2)

      expect(store.getAllIds()).toHaveLength(4)
    })

    it('should not overwrite existing vectors on merge', async () => {
      await store.addVector('a', createVector(0.1))

      const store2 = new VectorStore()
      await store2.addVector('a', createVector(0.9)) // Same ID, different value

      await store.merge(store2)

      const vector = store.getVector('a')
      // Original should be preserved
      expect(vector?.vector[0]).toBe(0.1)
    })
  })

  describe('Search Operations', () => {
    beforeEach(async () => {
      // Add some test vectors with different patterns
      await store.addVector('zeros', Array(128).fill(0))
      await store.addVector('ones', Array(128).fill(1))
      await store.addVector('half', Array(128).fill(0.5))
      await store.addVector(
        'random',
        Array(128)
          .fill(0)
          .map((_, i) => i / 128)
      )
    })

    it('should search for similar vectors', async () => {
      const query = Array(128).fill(0.9)
      const results = await store.search(query, 2)

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('ones') // Most similar
    })

    it('should return correct number of results', async () => {
      const query = Array(128).fill(0.5)
      const results = await store.search(query, 3)

      expect(results).toHaveLength(3)
    })

    it('should include distance in results', async () => {
      const query = Array(128).fill(0)
      const results = await store.search(query, 1)

      expect(results[0].distance).toBeDefined()
      // Zero vector distance should be minimal for zero vector query
      expect(results[0].distance).toBeLessThanOrEqual(1)
    })

    it('should reject queries with wrong dimensions', async () => {
      const wrongQuery = [0.1, 0.2, 0.3]

      await expect(store.search(wrongQuery)).rejects.toThrow('Query dimension mismatch')
    })

    it('should search with filter', async () => {
      // Add metadata to some vectors
      store.clear()
      await store.addVector('a', createVector(0.1), { category: 'A' })
      await store.addVector('b', createVector(0.2), { category: 'B' })
      await store.addVector('c', createVector(0.3), { category: 'A' })

      const query = createVector(0.5)
      const results = await store.searchWithFilter(query, meta => meta.category === 'A', 10)

      expect(results).toHaveLength(2)
      expect(results.every(r => r.metadata.category === 'A')).toBe(true)
    })

    it('should find neighbors for a vector', async () => {
      const neighbors = await store.findNeighbors('half', 2)

      expect(neighbors).toHaveLength(2)
      expect(neighbors.find(n => n.id === 'half')).toBeUndefined() // Should not include itself
    })

    it('should throw error for non-existent vector in findNeighbors', async () => {
      await expect(store.findNeighbors('non-existent')).rejects.toThrow('not found')
    })

    it('should perform batch search', async () => {
      const queries = [createVector(0), createVector(1)]
      const results = await store.batchSearch(queries, 2)

      expect(results).toHaveLength(2)
      expect(results[0]).toHaveLength(2)
      expect(results[1]).toHaveLength(2)
    })
  })

  describe('Distance Metrics', () => {
    it('should use cosine distance by default', async () => {
      const config: Partial<VectorStoreConfig> = { dimensions: 3, metric: 'cosine' }
      const cosineStore = new VectorStore(config)

      await cosineStore.addVector('a', [1, 0, 0])
      await cosineStore.addVector('b', [0, 1, 0])

      // These are orthogonal, cosine distance should be 1
      const results = await cosineStore.search([1, 0, 0], 2)
      const bResult = results.find(r => r.id === 'b')
      expect(bResult?.distance).toBeCloseTo(1, 5)
    })

    it('should support euclidean distance', async () => {
      const config: Partial<VectorStoreConfig> = { dimensions: 3, metric: 'euclidean' }
      const euclideanStore = new VectorStore(config)

      await euclideanStore.addVector('a', [0, 0, 0])
      await euclideanStore.addVector('b', [1, 1, 1])

      const results = await euclideanStore.search([0, 0, 0], 2)
      const bResult = results.find(r => r.id === 'b')
      expect(bResult?.distance).toBeCloseTo(Math.sqrt(3), 5)
    })

    it('should support dot product', async () => {
      const config: Partial<VectorStoreConfig> = { dimensions: 3, metric: 'dot' }
      const dotStore = new VectorStore(config)

      await dotStore.addVector('a', [1, 2, 3])
      await dotStore.addVector('b', [2, 3, 4])

      const results = await dotStore.search([1, 1, 1], 2)
      // Dot product with [1,1,1]: a=6, b=9
      expect(results[0].id).toBe('b')
      expect(results[0].score).toBe(9)
    })
  })

  describe('Query Operations', () => {
    it('should get all IDs', async () => {
      await store.addVector('a', createVector(0))
      await store.addVector('b', createVector(1))

      const ids = store.getAllIds()

      expect(ids).toHaveLength(2)
      expect(ids).toContain('a')
      expect(ids).toContain('b')
    })

    it('should get vectors by source', async () => {
      await store.addVector('a', createVector(0), {}, 'source1')
      await store.addVector('b', createVector(1), {}, 'source2')
      await store.addVector('c', createVector(2), {}, 'source1')

      const vectors = store.getBySource('source1')

      expect(vectors).toHaveLength(2)
    })

    it('should get vectors by time range', async () => {
      const now = Date.now()
      const oneHourAgo = now - 3600000
      const twoHoursAgo = now - 7200000

      // We'll just use the current time since vectors get timestamp automatically
      await store.addVector('a', createVector(0))
      await store.addVector('b', createVector(1))

      const vectors = store.getByTimeRange(0, now + 1000)

      expect(vectors).toHaveLength(2)
    })
  })

  describe('Statistics', () => {
    it('should return store statistics', async () => {
      await store.addVector('a', createVector(0), {}, 'source1')
      await store.addVector('b', createVector(1), {}, 'source2')

      const stats = store.getStatistics()

      expect(stats.totalVectors).toBe(2)
      expect(stats.dimensions).toBe(128)
      expect(stats.metric).toBe('cosine')
      expect(stats.sources).toBeDefined()
    })

    it('should record events', async () => {
      await store.addVector('a', createVector(0))
      await store.search(createVector(0.5))

      const events = store.getEvents()

      expect(events.length).toBeGreaterThan(0)
      expect(events.some(e => e.type === 'vector_storage')).toBe(true)
      expect(events.some(e => e.type === 'retrieval')).toBe(true)
    })

    it('should limit events history', async () => {
      for (let i = 0; i < 1100; i++) {
        await store.addVector(`v${i}`, createVector(i % 10))
      }

      const events = store.getEvents(10000)
      expect(events.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Clear and Reset', () => {
    it('should clear all vectors', async () => {
      await store.addVector('a', createVector(0))
      await store.addVector('b', createVector(1))

      store.clear()

      expect(store.getAllIds()).toHaveLength(0)
    })
  })
})

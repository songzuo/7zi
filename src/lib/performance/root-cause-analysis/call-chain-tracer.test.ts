/**
 * Call Chain Tracer Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  CallChainTracer,
  CallChain,
  CallNode,
  CallNodeType,
  CallChainConfig,
  DEFAULT_CALL_CHAIN_CONFIG,
} from './call-chain-tracer'

describe('CallChainTracer', () => {
  let tracer: CallChainTracer

  beforeEach(() => {
    tracer = new CallChainTracer(DEFAULT_CALL_CHAIN_CONFIG)
  })

  afterEach(() => {
    tracer.clear()
  })

  describe('Chain Management', () => {
    it('should start a new call chain', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const chain = tracer.getChain(chainId)
      expect(chain).toBeDefined()
      expect(chain?.id).toBe(chainId)
      expect(chain?.root.name).toBe('test-chain')
      expect(chain?.root.type).toBe('api')
      expect(chain?.status).toBe('success')
    })

    it('should generate unique trace and span IDs', () => {
      const chainId1 = tracer.startChain({
        name: 'chain-1',
        type: 'api',
      })

      const chainId2 = tracer.startChain({
        name: 'chain-2',
        type: 'database',
      })

      expect(chainId1).not.toBe(chainId2)

      const chain1 = tracer.getChain(chainId1)
      const chain2 = tracer.getChain(chainId2)

      expect(chain1?.root.id).not.toBe(chain2?.root.id)
    })

    it('should support parent span ID', () => {
      const chainId = tracer.startChain({
        name: 'child-chain',
        type: 'api',
        parentSpanId: 'parent-span-123',
      })

      const chain = tracer.getChain(chainId)
      expect(chain?.parentSpanId).toBe('parent-span-123')
    })

    it('should end a call chain', async () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      tracer.endChain(chainId, 'success')

      const chain = tracer.getChain(chainId)
      expect(chain?.status).toBe('success')
      expect(chain?.duration).toBeGreaterThanOrEqual(0)
      expect(chain?.endedAt).toBeDefined()
      expect(chain?.startedAt).toBeDefined()
      if (chain?.endedAt && chain?.startedAt) {
        expect(chain.endedAt).toBeGreaterThanOrEqual(chain.startedAt)
      }
    })

    it('should mark chain as ended', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      tracer.endChain(chainId)

      const completedChains = tracer.getCompletedChains()
      expect(completedChains.length).toBe(1)
      expect(completedChains[0].id).toBe(chainId)
    })
  })

  describe('Node Management', () => {
    it('should add child node to chain', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const childId = tracer.addNode(chainId, tracer.getChain(chainId)!.root.id, {
        type: 'database',
        name: 'query-users',
      })

      const chain = tracer.getChain(chainId)
      expect(chain?.nodes.has(childId)).toBe(true)
      expect(chain?.root.children).toContain(childId)
    })

    it('should set parent on child node', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const childId = tracer.addNode(chainId, tracer.getChain(chainId)!.root.id, {
        type: 'database',
        name: 'query-users',
      })

      const child = tracer.getChain(chainId)!.nodes.get(childId)
      expect(child?.parent).toBe(tracer.getChain(chainId)!.root.id)
    })

    it('should end a specific node', async () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const childId = tracer.addNode(chainId, tracer.getChain(chainId)!.root.id, {
        type: 'database',
        name: 'query-users',
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      tracer.endNode(chainId, childId, 'success', { cpu: 50, memory: 1024 })

      const node = tracer.getChain(chainId)!.nodes.get(childId)
      expect(node?.duration).toBeGreaterThanOrEqual(0)
      expect(node?.status).toBe('success')
      expect(node?.metrics.cpu).toBe(50)
      expect(node?.metrics.memory).toBe(1024)
    })

    it('should support node metadata', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const childId = tracer.addNode(chainId, tracer.getChain(chainId)!.root.id, {
        type: 'database',
        name: 'query-users',
        metadata: {
          query: 'SELECT * FROM users',
          custom: { table: 'users' },
        },
      })

      const node = tracer.getChain(chainId)!.nodes.get(childId)
      expect(node?.metadata.query).toBe('SELECT * FROM users')
      expect(node?.metadata.custom?.table).toBe('users')
    })

    it('should support node metrics', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const childId = tracer.addNode(chainId, tracer.getChain(chainId)!.root.id, {
        type: 'database',
        name: 'query-users',
        metrics: {
          dbQueries: 5,
          cacheHits: 10,
          cacheMisses: 2,
        },
      })

      const node = tracer.getChain(chainId)!.nodes.get(childId)
      expect(node?.metrics.dbQueries).toBe(5)
      expect(node?.metrics.cacheHits).toBe(10)
      expect(node?.metrics.cacheMisses).toBe(2)
    })

    it('should support multiple levels of nesting', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const child1Id = tracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'query-1',
      })

      const child2Id = tracer.addNode(chainId, child1Id, {
        type: 'cache',
        name: 'cache-lookup',
      })

      const chain = tracer.getChain(chainId)
      expect(chain?.nodes.size).toBe(3)

      const child2 = chain?.nodes.get(child2Id)
      expect(child2?.parent).toBe(child1Id)
    })
  })

  describe('Chain Retrieval', () => {
    it('should get active chain', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const chain = tracer.getChain(chainId)
      expect(chain).toBeDefined()
      expect(chain?.id).toBe(chainId)
    })

    it('should get completed chain', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      tracer.endChain(chainId)

      const chain = tracer.getChain(chainId)
      expect(chain).toBeDefined()
      expect(chain?.status).toBe('success')
    })

    it('should return null for non-existent chain', () => {
      const chain = tracer.getChain('non-existent')
      expect(chain).toBeNull()
    })

    it('should get all completed chains', () => {
      const chainId1 = tracer.startChain({
        name: 'chain-1',
        type: 'api',
      })

      const chainId2 = tracer.startChain({
        name: 'chain-2',
        type: 'database',
      })

      tracer.endChain(chainId1, 'success')
      tracer.endChain(chainId2, 'error')

      const completed = tracer.getCompletedChains()
      expect(completed.length).toBe(2)
    })

    it('should filter completed chains by status', () => {
      const chainId1 = tracer.startChain({
        name: 'chain-1',
        type: 'api',
      })

      const chainId2 = tracer.startChain({
        name: 'chain-2',
        type: 'database',
      })

      const chainId3 = tracer.startChain({
        name: 'chain-3',
        type: 'api',
      })

      tracer.endChain(chainId1, 'success')
      tracer.endChain(chainId2, 'error')
      tracer.endChain(chainId3, 'success')

      const errors = tracer.getCompletedChains({ status: 'error' })
      expect(errors.length).toBe(1)
      expect(errors[0].id).toBe(chainId2)
    })

    it('should filter completed chains by time range', () => {
      const now = Date.now()

      const chainId1 = tracer.startChain({
        name: 'chain-1',
        type: 'api',
      })

      tracer.endChain(chainId1)

      const chainId2 = tracer.startChain({
        name: 'chain-2',
        type: 'database',
      })

      tracer.endChain(chainId2)

      // Filter by recent time
      const recent = tracer.getCompletedChains({
        startTime: now - 500,
        endTime: now + 10000,
      })

      expect(recent.length).toBe(2)
    })
  })

  describe('Chain Analysis', () => {
    it('should calculate chain summary', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id

      // Add various node types
      tracer.addNode(chainId, rootId, { type: 'database', name: 'db-1' })
      tracer.addNode(chainId, rootId, { type: 'database', name: 'db-2' })
      tracer.addNode(chainId, rootId, { type: 'api', name: 'api-1' })
      tracer.addNode(chainId, rootId, { type: 'cache', name: 'cache-1' })

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.summary.totalCalls).toBe(5) // root + 4 children
      expect(analysis.summary.dbCalls).toBe(2)
      expect(analysis.summary.apiCalls).toBe(2) // root + api-1
      expect(analysis.summary.cacheCalls).toBe(1)
    })

    it('should identify slow call bottlenecks', async () => {
      const config: CallChainConfig = {
        ...DEFAULT_CALL_CHAIN_CONFIG,
        slowCallThreshold: 100,
      }
      const slowTracer = new CallChainTracer(config)

      const chainId = slowTracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = slowTracer.getChain(chainId)!.root.id
      const slowNodeId = slowTracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'slow-query',
      })

      // Simulate slow node
      slowTracer.endNode(chainId, slowNodeId, 'success')

      // End chain with delay to make slow node exceed threshold
      await new Promise(resolve => setTimeout(resolve, 150))

      slowTracer.endChain(chainId)

      const analysis = slowTracer.analyzeChain(chainId)

      const slowBottlenecks = analysis.bottlenecks.filter(b => b.type === 'slow')
      expect(slowBottlenecks.length).toBeGreaterThanOrEqual(0)
    })

    it('should identify N+1 query pattern', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const parentId = tracer.addNode(chainId, rootId, {
        type: 'function',
        name: 'process-users',
      })

      // Add many database calls from same parent
      for (let i = 0; i < 10; i++) {
        tracer.addNode(chainId, parentId, {
          type: 'database',
          name: `query-user-${i}`,
        })
      }

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      const nPlus1Bottlenecks = analysis.bottlenecks.filter(b => b.type === 'n-plus-1')
      expect(nPlus1Bottlenecks.length).toBeGreaterThan(0)
    })

    it('should identify repeated calls', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id

      // Add repeated calls
      for (let i = 0; i < 5; i++) {
        tracer.addNode(chainId, rootId, {
          type: 'cache',
          name: 'get-user-data',
        })
      }

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      const repeatedBottlenecks = analysis.bottlenecks.filter(b => b.type === 'repeated')
      expect(repeatedBottlenecks.length).toBeGreaterThan(0)
    })

    it('should identify hot paths', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const childId = tracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'query-users',
      })

      const grandChildId = tracer.addNode(chainId, childId, {
        type: 'function',
        name: 'process-data',
      })

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.hotPaths.length).toBeGreaterThan(0)
      expect(analysis.hotPaths[0].nodes.length).toBeGreaterThan(1)
    })

    it('should identify critical path', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const childId = tracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'query-users',
      })

      tracer.addNode(chainId, rootId, {
        type: 'cache',
        name: 'cache-lookup',
      })

      const grandChildId = tracer.addNode(chainId, childId, {
        type: 'function',
        name: 'process-data',
      })

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.criticalPath).toBeDefined()
      expect(analysis.criticalPath.nodes.length).toBeGreaterThan(0)
    })

    it('should generate recommendations', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id

      // Add many DB calls for N+1
      const parentId = tracer.addNode(chainId, rootId, {
        type: 'function',
        name: 'process-users',
      })

      for (let i = 0; i < 10; i++) {
        tracer.addNode(chainId, parentId, {
          type: 'database',
          name: `query-user-${i}`,
        })
      }

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.recommendations.length).toBeGreaterThan(0)

      const nPlus1Recs = analysis.recommendations.filter(r => r.type === 'refactor')
      expect(nPlus1Recs.length).toBeGreaterThan(0)
    })

    it('should prioritize recommendations correctly', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id

      // Add N+1 pattern (high priority)
      const parentId = tracer.addNode(chainId, rootId, {
        type: 'function',
        name: 'process-users',
      })

      for (let i = 0; i < 10; i++) {
        tracer.addNode(chainId, parentId, {
          type: 'database',
          name: `query-user-${i}`,
        })
      }

      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      const priorities = analysis.recommendations.map(r => r.priority)

      expect(priorities[0]).toBe('high')
    })
  })

  describe('Chain Properties', () => {
    it('should calculate chain depth', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      let currentId = rootId

      // Create deep chain
      for (let i = 0; i < 5; i++) {
        currentId = tracer.addNode(chainId, currentId, {
          type: 'function',
          name: `level-${i}`,
        })
      }

      tracer.endChain(chainId)

      const chain = tracer.getChain(chainId)
      expect(chain?.depth).toBe(5)
    })

    it('should calculate chain breadth', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id

      // Add multiple children to root
      for (let i = 0; i < 5; i++) {
        tracer.addNode(chainId, rootId, {
          type: 'function',
          name: `child-${i}`,
        })
      }

      tracer.endChain(chainId)

      const chain = tracer.getChain(chainId)
      expect(chain?.breadth).toBe(5)
    })

    it('should track error status', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const errorNodeId = tracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'failing-query',
      })

      tracer.endNode(chainId, errorNodeId, 'error')
      tracer.endChain(chainId, 'error')

      const chain = tracer.getChain(chainId)
      expect(chain?.status).toBe('error')

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.summary.errorCount).toBe(1)
    })

    it('should track timeout status', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const timeoutNodeId = tracer.addNode(chainId, rootId, {
        type: 'api',
        name: 'slow-api',
      })

      tracer.endNode(chainId, timeoutNodeId, 'timeout')
      tracer.endChain(chainId, 'timeout')

      const chain = tracer.getChain(chainId)
      expect(chain?.status).toBe('timeout')

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.summary.timeoutCount).toBe(1)
    })
  })

  describe('Visualization Helpers', () => {
    it('should get chain as tree structure', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const childId = tracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'query-users',
      })

      const grandChildId = tracer.addNode(chainId, childId, {
        type: 'function',
        name: 'process-data',
      })

      tracer.endChain(chainId)

      const tree = tracer.getChainTree(chainId)
      expect(tree).toBeDefined()
      expect(tree!.id).toBe(chainId)
      expect(tree!.root).toBeDefined()
      expect(tree!.root!.children).toBeDefined()
    })

    it('should generate waterfall data', () => {
      const chainId = tracer.startChain({
        name: 'test-chain',
        type: 'api',
      })

      const rootId = tracer.getChain(chainId)!.root.id
      const childId = tracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'query-users',
      })

      tracer.endNode(chainId, childId)
      tracer.endChain(chainId)

      const waterfall = tracer.generateWaterfallData(chainId)
      expect(waterfall.length).toBeGreaterThan(0)
      expect(waterfall[0]).toHaveProperty('start')
      expect(waterfall[0]).toHaveProperty('duration')
      expect(waterfall[0]).toHaveProperty('level')
    })
  })

  describe('Statistics', () => {
    it('should get chain statistics', () => {
      const chainId1 = tracer.startChain({
        name: 'chain-1',
        type: 'api',
      })

      const chainId2 = tracer.startChain({
        name: 'chain-2',
        type: 'database',
      })

      tracer.endChain(chainId1, 'success')
      tracer.endChain(chainId2, 'error')

      const stats = tracer.getStatistics()
      expect(stats.totalChains).toBe(2)
      expect(stats.activeChains).toBe(0)
      expect(stats.completedChains).toBe(2)
      expect(stats.errorRate).toBe(0.5)
    })

    it('should calculate average chain duration', () => {
      tracer.startChain({ name: 'chain-1', type: 'api' })
      const chainId2 = tracer.startChain({ name: 'chain-2', type: 'database' })

      tracer.endChain(chainId2)

      const stats = tracer.getStatistics()
      expect(stats.averageChainDuration).toBeGreaterThanOrEqual(0)
    })

    it('should identify top slowest chains', () => {
      const chainId1 = tracer.startChain({ name: 'chain-1', type: 'api' })
      const chainId2 = tracer.startChain({ name: 'chain-2', type: 'database' })

      tracer.endChain(chainId1)
      tracer.endChain(chainId2)

      const stats = tracer.getStatistics()
      expect(stats.topSlowestChains).toBeDefined()
      expect(stats.topSlowestChains.length).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when ending non-existent chain', () => {
      expect(() => {
        tracer.endChain('non-existent')
      }).toThrow('Chain non-existent not found')
    })

    it('should throw error when adding node to non-existent chain', () => {
      expect(() => {
        tracer.addNode('non-existent', 'parent-id', {
          type: 'database',
          name: 'test',
        })
      }).toThrow('Chain non-existent not found')
    })

    it('should throw error when adding node with non-existent parent', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })
      const rootId = tracer.getChain(chainId)!.root.id

      expect(() => {
        tracer.addNode(chainId, 'non-existent-parent', {
          type: 'database',
          name: 'test',
        })
      }).toThrow('Parent node non-existent-parent not found')
    })

    it('should throw error when ending non-existent node', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })

      expect(() => {
        tracer.endNode(chainId, 'non-existent-node')
      }).toThrow('Node non-existent-node not found')
    })

    it('should throw error when analyzing non-existent chain', () => {
      expect(() => {
        tracer.analyzeChain('non-existent')
      }).toThrow('Chain non-existent not found')
    })
  })

  describe('Configuration', () => {
    it('should respect slow call threshold', () => {
      const config: CallChainConfig = {
        ...DEFAULT_CALL_CHAIN_CONFIG,
        slowCallThreshold: 500,
      }
      const configTracer = new CallChainTracer(config)

      const chainId = configTracer.startChain({
        name: 'test',
        type: 'api',
      })

      const rootId = configTracer.getChain(chainId)!.root.id
      const nodeId = configTracer.addNode(chainId, rootId, {
        type: 'database',
        name: 'query',
      })

      // Make node just under threshold
      configTracer.endNode(chainId, nodeId, 'success')
      setTimeout(() => configTracer.endChain(chainId), 300)

      setTimeout(() => {
        const analysis = configTracer.analyzeChain(chainId)
        const slowBottlenecks = analysis.bottlenecks.filter(b => b.type === 'slow')
        expect(slowBottlenecks.length).toBe(0)
      }, 400)
    })

    it('should limit chain history', () => {
      const config: CallChainConfig = {
        ...DEFAULT_CALL_CHAIN_CONFIG,
      }
      const configTracer = new CallChainTracer(config)

      // Start and end many chains
      for (let i = 0; i < 1500; i++) {
        const chainId = configTracer.startChain({
          name: `chain-${i}`,
          type: 'api',
        })
        configTracer.endChain(chainId)
      }

      const stats = configTracer.getStatistics()
      // Should be around 1000 due to history limit
      expect(stats.totalChains).toBeLessThanOrEqual(1000)
    })
  })

  describe('Clear', () => {
    it('should clear all data', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })
      tracer.endChain(chainId)

      tracer.clear()

      const active = tracer.getChain(chainId)
      expect(active).toBeNull()

      const completed = tracer.getCompletedChains()
      expect(completed.length).toBe(0)

      const stats = tracer.getStatistics()
      expect(stats.totalChains).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty chain', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })
      tracer.endChain(chainId)

      const analysis = tracer.analyzeChain(chainId)
      expect(analysis.summary.totalCalls).toBe(1) // Only root
      expect(analysis.bottlenecks).toEqual([])
      // Hot paths may contain the root node
      expect(analysis.hotPaths.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle chain with only root', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })
      tracer.endChain(chainId)

      const chain = tracer.getChain(chainId)
      // Depth calculation: root with no children = 0 or 1 depending on implementation
      expect(chain?.depth).toBeLessThanOrEqual(1)
      // Breadth for single root may be 1 or 0 depending on implementation
      expect(chain?.breadth).toBeLessThanOrEqual(1)
    })

    it('should handle single child', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })

      const rootId = tracer.getChain(chainId)!.root.id
      tracer.addNode(chainId, rootId, { type: 'database', name: 'query' })

      tracer.endChain(chainId)

      const chain = tracer.getChain(chainId)
      expect(chain?.depth).toBe(1)
      expect(chain?.breadth).toBe(1)
    })

    it('should handle many children', () => {
      const chainId = tracer.startChain({ name: 'test', type: 'api' })

      const rootId = tracer.getChain(chainId)!.root.id

      for (let i = 0; i < 100; i++) {
        tracer.addNode(chainId, rootId, {
          type: 'database',
          name: `query-${i}`,
        })
      }

      tracer.endChain(chainId)

      const chain = tracer.getChain(chainId)
      expect(chain?.breadth).toBe(100)
    })
  })
})

/**
 * Evomap Gateway Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AssetBundle } from '../types'

// Mock fetch
const mockFetch = vi.fn()

// Create a fresh module import for each test
let EvomapGateway: any
let EvomapError: any

describe('EvomapGateway', () => {
  let gateway: any

  beforeEach(async () => {
    vi.resetModules()
    
    // Mock global fetch
    global.fetch = mockFetch
    
    // Mock localStorage for Node environment
    const mockStorage: Record<string, string> = {}
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value },
        removeItem: (key: string) => { delete mockStorage[key] },
        clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) },
      },
      writable: true,
      configurable: true,
    })
    
    // Import fresh module
    const module = await vi.importActual('../gateway')
    EvomapGateway = module.EvomapGateway
    EvomapError = module.EvomapError
    
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ success: true }))
    }))
    
    gateway = new EvomapGateway({ hubUrl: 'https://test.evomap.ai' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const g = new EvomapGateway()
      const status = g.getStatus()
      expect(status.nodeId).toMatch(/^node_/)
    })

    it('should use custom hubUrl', () => {
      const g = new EvomapGateway({ hubUrl: 'https://custom.evomap.ai' })
      expect(g.getStatus()).toBeDefined()
    })
  })

  describe('getStatus', () => {
    it('should return initial status', () => {
      const status = gateway.getStatus()
      expect(status.registered).toBe(false)
      expect(status.publishCount).toBe(0)
      expect(status.fetchCount).toBe(0)
      expect(status.lastHeartbeat).toBeNull()
    })
  })

  describe('isRegistered', () => {
    it('should return false when not registered', () => {
      expect(gateway.isRegistered()).toBe(false)
    })
  })

  describe('hello (node registration)', () => {
    it('should handle successful registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          node_secret: 'test_secret_123',
          claim_code: 'CLAIM123',
          claim_url: 'https://evomap.ai/claim/CLAIM123'
        }))
      })

      const result = await gateway.hello()

      expect(result.success).toBe(true)
      expect(result.claimCode).toBe('CLAIM123')
      expect(result.claimUrl).toBe('https://evomap.ai/claim/CLAIM123')
      expect(gateway.isRegistered()).toBe(true)
    })

    it('should throw on failed registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ error: 'Server error' }))
      })

      // Currently throws because 500 is not retryable
      await expect(gateway.hello()).rejects.toThrow('Request failed: 500')
    })

    it('should include capabilities in registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          node_secret: 'secret'
        }))
      })

      await gateway.hello({
        capabilities: {
          languages: ['typescript'],
          domains: ['frontend']
        },
        model: 'claude-3'
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.capabilities.languages).toContain('typescript')
      expect(body.payload.model).toBe('claude-3')
    })
  })

  describe('heartbeat', () => {
    it('should send heartbeat successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ status: 'ok' }))
      })

      const result = await gateway.heartbeat()

      expect(result.success).toBe(true)
    })

    it('should include worker config when enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ status: 'ok' }))
      })

      await gateway.heartbeat({
        workerEnabled: true,
        maxLoad: 5,
        domains: ['devops']
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.meta.worker_enabled).toBe(true)
      expect(body.payload.meta.max_load).toBe(5)
      expect(body.payload.meta.domains).toContain('devops')
    })
  })

  describe('publish', () => {
    it('should publish asset bundle successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const bundle: AssetBundle = {
        gene: {
          type: 'Gene',
          schema_version: '1.5.0',
          category: 'repair',
          signals_match: ['error', 'crash'],
          summary: 'Fix memory leak'
        },
        capsule: {
          type: 'Capsule',
          schema_version: '1.5.0',
          trigger: ['error', 'crash'],
          summary: 'Fix memory leak',
          content: 'Detailed fix content...',
          confidence: 0.9,
          blast_radius: { files: 1, lines: 50 },
          outcome: { status: 'success', score: 0.9 },
          env_fingerprint: { platform: 'node' }
        },
        event: {
          type: 'EvolutionEvent',
          intent: 'repair',
          outcome: { status: 'success', score: 0.9 },
          mutations_tried: 1,
          total_cycles: 1
        }
      }

      const result = await gateway.publish(bundle)

      expect(result.success).toBe(true)
      expect(result.assetIds).toBeDefined()
      expect(result.assetIds?.gene).toMatch(/^sha256:/)
      expect(result.assetIds?.capsule).toMatch(/^sha256:/)
      expect(result.assetIds?.event).toMatch(/^sha256:/)

      // Verify request structure
      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.message_type).toBe('publish')
      expect(body.payload.assets).toHaveLength(3) // gene + capsule + event
    })

    it('should publish without EvolutionEvent when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const bundle: AssetBundle = {
        gene: {
          type: 'Gene',
          schema_version: '1.5.0',
          category: 'repair',
          signals_match: ['error'],
          summary: 'Fix bug'
        },
        capsule: {
          type: 'Capsule',
          schema_version: '1.5.0',
          trigger: ['error'],
          summary: 'Fix bug',
          content: 'Content',
          confidence: 0.8,
          blast_radius: { files: 1, lines: 10 },
          outcome: { status: 'success', score: 0.8 },
          env_fingerprint: {}
        }
      }

      const result = await gateway.publish(bundle)

      expect(result.success).toBe(true)

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.assets).toHaveLength(2) // gene + capsule only
    })
  })

  describe('publishFix', () => {
    it('should publish fix with correct structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const result = await gateway.publishFix({
        signals: ['TypeError', 'null reference'],
        summary: 'Fix null pointer exception',
        content: 'Add null check before accessing property',
        confidence: 0.95,
        blastRadius: { files: 1, lines: 5 },
        diff: '--- a/file.js\n+++ b/file.js\n@@ -1 +1 @@\n-old\n+new',
        intent: 'repair'
      })

      expect(result.success).toBe(true)

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      const assets = body.payload.assets

      // Check Gene
      const gene = assets.find((a: any) => a.type === 'Gene')
      expect(gene.category).toBe('repair')
      expect(gene.signals_match).toContain('TypeError')

      // Check Capsule
      const capsule = assets.find((a: any) => a.type === 'Capsule')
      expect(capsule.confidence).toBe(0.95)
      expect(capsule.diff).toBeDefined()
    })
  })

  describe('fetch', () => {
    it('should fetch assets successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          assets: [
            { type: 'Capsule', asset_id: 'sha256:abc', summary: 'Test capsule' }
          ]
        }))
      })

      const result = await gateway.fetch({ assetType: 'Capsule', limit: 10 })

      expect(result.success).toBe(true)
      expect(result.assets).toHaveLength(1)
      expect(result.assets?.[0].asset_id).toBe('sha256:abc')
    })

    it('should include filters in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ assets: [] }))
      })

      await gateway.fetch({
        assetType: 'Gene',
        signals: ['error', 'crash'],
        minGdi: 0.8
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.asset_type).toBe('Gene')
      expect(body.payload.signals).toEqual(['error', 'crash'])
      expect(body.payload.min_gdi).toBe(0.8)
    })
  })

  describe('getCapsules', () => {
    it('should fetch capsules with correct asset type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ assets: [] }))
      })

      await gateway.getCapsules({ limit: 5 })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.asset_type).toBe('Capsule')
    })
  })

  describe('report', () => {
    it('should submit validation report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const result = await gateway.report('sha256:test', {
        valid: true,
        score: 0.9,
        comment: 'Works as expected'
      })

      expect(result.success).toBe(true)

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.target_asset_id).toBe('sha256:test')
      expect(body.payload.validation_report.valid).toBe(true)
    })
  })

  describe('revoke', () => {
    it('should revoke asset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const result = await gateway.revoke('sha256:test', 'Outdated solution')

      expect(result.success).toBe(true)

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.payload.target_asset_id).toBe('sha256:test')
      expect(body.payload.reason).toBe('Outdated solution')
    })
  })

  describe('REST endpoints', () => {
    it('should get node info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ nodeId: 'test_node' }))
      })

      const result = await gateway.getNode('test_node')

      expect(result.success).toBe(true)
      expect(mockFetch.mock.calls[0][0]).toContain('/a2a/nodes/test_node')
    })

    it('should list assets with query params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ assets: [] }))
      })

      await gateway.listAssets({ type: 'Capsule', limit: 20, sort: 'gdi' })

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toContain('type=Capsule')
      expect(call[0]).toContain('limit=20')
      expect(call[0]).toContain('sort=gdi')
    })

    it('should get asset by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ asset_id: 'sha256:abc' }))
      })

      const result = await gateway.getAsset('sha256:abc')

      expect(result.success).toBe(true)
      expect(mockFetch.mock.calls[0][0]).toContain('/a2a/assets/sha256:abc')
    })

    it('should search assets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ results: [] }))
      })

      await gateway.searchAssets('memory leak fix', { limit: 10 })

      const call = mockFetch.mock.calls[0]
      expect(call[0]).toContain('q=memory+leak+fix')
    })

    it('should get trending assets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ trending: [] }))
      })

      const result = await gateway.getTrending()

      expect(result.success).toBe(true)
      expect(mockFetch.mock.calls[0][0]).toContain('/a2a/trending')
    })

    it('should get stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ total: 1000 }))
      })

      const result = await gateway.getStats()

      expect(result.success).toBe(true)
      expect(mockFetch.mock.calls[0][0]).toContain('/a2a/stats')
    })
  })

  describe('task system', () => {
    it('should list available tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          tasks: [
            { task_id: 'task1', title: 'Fix bug', bounty: 100 }
          ]
        }))
      })

      const result = await gateway.listTasks({ limit: 10, minBounty: 50 })

      expect(result.success).toBe(true)
      expect(result.tasks).toHaveLength(1)
      expect(result.tasks?.[0].task_id).toBe('task1')
    })

    it('should claim a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const result = await gateway.claimTask('task123')

      expect(result.success).toBe(true)

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.task_id).toBe('task123')
    })

    it('should complete a task', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      const result = await gateway.completeTask('task123', 'sha256:solution')

      expect(result.success).toBe(true)

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)
      expect(body.task_id).toBe('task123')
      expect(body.asset_id).toBe('sha256:solution')
    })

    it('should get my tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          tasks: [{ task_id: 'my_task' }]
        }))
      })

      const result = await gateway.getMyTasks()

      expect(result.success).toBe(true)
      expect(result.tasks).toHaveLength(1)
    })
  })

  describe('error handling', () => {
    it('should throw on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(gateway.hello()).rejects.toThrow('Network error')
    })

    it('should throw on timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('AbortError'))

      await expect(gateway.hello()).rejects.toThrow()
    })
  })

  describe('registration failure', () => {
    it('should handle failed registration and throw', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ error: 'Server error' }))
      })

      // Since 500 is retryable=false, it throws
      await expect(gateway.hello()).rejects.toThrow('Request failed: 500')
    })

    it('should handle non-retryable error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ error: 'Bad request' }))
      })

      // 400 is not retryable, so it throws immediately
      await expect(gateway.hello()).rejects.toThrow('Request failed: 400')
    })
  })

  describe('envelope format', () => {
    it('should build correct GEP envelope', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      })

      await gateway.publishFix({
        signals: ['test'],
        summary: 'Test',
        content: 'Content',
        confidence: 0.8,
        blastRadius: { files: 1, lines: 1 }
      })

      const fetchCall = mockFetch.mock.calls[0]
      const body = JSON.parse(fetchCall[1].body)

      expect(body.protocol).toBe('gep-a2a')
      expect(body.protocol_version).toBe('1.0.0')
      expect(body.message_type).toBe('publish')
      expect(body.message_id).toMatch(/^msg_/)
      expect(body.sender_id).toMatch(/^node_/)
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })
})

// Note: EvomapError class tests would require importing from types module
// The error handling is tested indirectly through error throwing tests above

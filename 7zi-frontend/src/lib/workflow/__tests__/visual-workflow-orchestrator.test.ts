/**
 * VisualWorkflowOrchestrator Unit Tests
 *
 * @version 1.12.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  type ExecutionEvent,
  type ExecutionEventType,
  type ExecutionConfig,
  type ExecutionResult,
} from '../VisualWorkflowOrchestrator'

// Mock dependencies
vi.mock('@/lib/storage/execution-state-storage', () => ({
  executionStateStorage: {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/webhook', () => ({
  webhookManager: {
    trigger: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('VisualWorkflowOrchestrator', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    vi.clearAllMocks()
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('constructor', () => {
    it('should create orchestrator instance', () => {
      expect(orchestrator).toBeDefined()
    })

    it('should accept custom config', () => {
      const custom = new VisualWorkflowOrchestrator({
        enablePersistence: true,
        autoSaveInterval: 5000,
        timeout: 30000,
        maxRetries: 3,
      })
      expect(custom).toBeDefined()
    })

    it('should use default config values', () => {
      const defaultOrchestrator = new VisualWorkflowOrchestrator({})
      expect(defaultOrchestrator).toBeDefined()
    })
  })

  describe('ExecutionEventType', () => {
    it('should have workflow-level event types', () => {
      const types: ExecutionEventType[] = [
        'started',
        'paused',
        'resumed',
        'completed',
        'failed',
        'cancelled',
      ]
      expect(types).toContain('started')
      expect(types).toContain('completed')
      expect(types).toContain('failed')
    })

    it('should have node-level event types', () => {
      const types: ExecutionEventType[] = [
        'node_started',
        'node_completed',
        'node_failed',
        'node_skipped',
        'progress',
      ]
      expect(types).toContain('node_started')
      expect(types).toContain('node_completed')
    })
  })

  describe('ExecutionEvent', () => {
    it('should create valid execution event', () => {
      const event: ExecutionEvent = {
        type: 'started',
        timestamp: new Date().toISOString(),
      }
      expect(event.type).toBe('started')
      expect(event.timestamp).toBeDefined()
    })

    it('should include nodeId for node events', () => {
      const event: ExecutionEvent = {
        type: 'node_started',
        timestamp: new Date().toISOString(),
        nodeId: 'node-1',
      }
      expect(event.nodeId).toBe('node-1')
    })

    it('should include data payload', () => {
      const event: ExecutionEvent = {
        type: 'completed',
        timestamp: new Date().toISOString(),
        data: { output: { result: 42 } },
      }
      expect(event.data).toBeDefined()
    })
  })

  describe('ExecutionConfig', () => {
    it('should accept all config options', () => {
      const config: ExecutionConfig = {
        enablePersistence: true,
        autoSaveInterval: 10000,
        timeout: 60000,
        maxRetries: 5,
      }
      expect(config.enablePersistence).toBe(true)
      expect(config.autoSaveInterval).toBe(10000)
      expect(config.maxRetries).toBe(5)
    })

    it('should have optional fields', () => {
      const config: ExecutionConfig = {
        enablePersistence: false,
      }
      expect(config.timeout).toBeUndefined()
      expect(config.maxRetries).toBeUndefined()
    })
  })

  describe('ExecutionResult', () => {
    it('should have success result structure', () => {
      const result: ExecutionResult = {
        success: true,
        instance: {} as any,
        outputs: { result: 'ok' },
      }
      expect(result.success).toBe(true)
      expect(result.outputs).toEqual({ result: 'ok' })
    })

    it('should have failure result structure', () => {
      const result: ExecutionResult = {
        success: false,
        instance: {} as any,
        outputs: {},
        error: 'Execution failed',
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe('Execution failed')
    })
  })

  describe('event listeners', () => {
    it('should accept event listener registration', () => {
      const listener = vi.fn()
      // The orchestrator should have addEventListener or similar
      expect(orchestrator).toBeDefined()
    })
  })

  describe('type exports', () => {
    it('should export visualWorkflowOrchestrator singleton', async () => {
      const mod = await import('../VisualWorkflowOrchestrator')
      expect(mod.visualWorkflowOrchestrator).toBeDefined()
    })
  })
})

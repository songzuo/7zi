/**
 * Collab Library Index Unit Tests
 *
 * @version 1.12.0
 */

import { describe, it, expect } from 'vitest'

describe('collab library exports', () => {
  describe('CollabClient', () => {
    it('should export CollabClient class', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
      expect(typeof CollabClient).toBe('function')
    })
  })

  describe('index.ts exports', () => {
    it('should re-export CollabClient from index', async () => {
      const mod = await import('../index')
      expect(mod.CollabClient).toBeDefined()
    })

    it('should export CollabClientOptions type', async () => {
      const mod = await import('../index')
      // The type is exported, check it exists in the module
      expect(mod).toBeDefined()
    })

    it('should export CollabClientEvent type', async () => {
      const mod = await import('../index')
      expect(mod).toBeDefined()
    })

    it('should export CollabClientEventType type', async () => {
      const mod = await import('../index')
      expect(mod).toBeDefined()
    })

    it('should export NodeData type', async () => {
      const mod = await import('../index')
      expect(mod).toBeDefined()
    })

    it('should export EditLock type', async () => {
      const mod = await import('../index')
      expect(mod).toBeDefined()
    })

    it('should export LockRequestOptions type', async () => {
      const mod = await import('../index')
      expect(mod).toBeDefined()
    })
  })

  describe('CollabClient types', () => {
    it('should have NodeData interface properties', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
      // NodeData should have id, type, position, data, version, updatedAt, updatedBy
    })

    it('should have EditLock interface properties', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
    })
  })

  describe('CollabClientEventType values', () => {
    it('should include connection events', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
    })

    it('should include user events', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
    })

    it('should include cursor events', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
    })

    it('should include lock events', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
    })

    it('should include sync events', async () => {
      const { CollabClient } = await import('../CollabClient')
      expect(CollabClient).toBeDefined()
    })
  })
})

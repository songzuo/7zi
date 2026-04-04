/**
 * A2A Protocol v2 - Agent Registry Tests
 * 测试 Agent 注册表功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  InMemoryAgentRegistry,
  FileAgentRegistry,
  getAgentRegistry,
} from '../agent-registry'
import * as fs from 'fs'

describe('InMemoryAgentRegistry', () => {
  let registry: InMemoryAgentRegistry

  beforeEach(() => {
    registry = new InMemoryAgentRegistry(false) // Disable auto cleanup for tests
  })

  afterEach(() => {
    registry.close()
  })

  describe('register', () => {
    it('should register agent and return ID', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
      })

      expect(id).toBeDefined()
      expect(id).toMatch(/^agent-/)
    })

    it('should store agent with correct data', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
        load: 0.5,
        metadata: { version: '1.0.0' },
      })

      const agent = registry.get(id)

      expect(agent?.name).toBe('Test Agent')
      expect(agent?.url).toBe('http://localhost:3001')
      expect(agent?.capabilities).toEqual(['chat', 'streaming'])
      expect(agent?.skills).toEqual(['conversation'])
      expect(agent?.status).toBe('online')
      expect(agent?.load).toBe(0.5)
      expect(agent?.metadata).toEqual({ version: '1.0.0' })
    })

    it('should set lastHeartbeat timestamp', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      const agent = registry.get(id)
      expect(agent?.lastHeartbeat).toBeDefined()

      const timestamp = new Date(agent!.lastHeartbeat).getTime()
      expect(timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('should emit register event', () => {
      let eventEmitted = false

      registry.on('register', () => {
        eventEmitted = true
      })

      registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      expect(eventEmitted).toBe(true)
    })
  })

  describe('unregister', () => {
    it('should remove agent from registry', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      expect(registry.get(id)).toBeDefined()

      registry.unregister(id)

      expect(registry.get(id)).toBeUndefined()
    })

    it('should be idempotent', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.unregister(id)
      registry.unregister(id) // Should not throw

      expect(registry.get(id)).toBeUndefined()
    })

    it('should emit unregister event', () => {
      let eventEmitted = false

      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.on('unregister', () => {
        eventEmitted = true
      })

      registry.unregister(id)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('get', () => {
    it('should return agent by ID', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      const agent = registry.get(id)

      expect(agent).toBeDefined()
      expect(agent?.id).toBe(id)
    })

    it('should return undefined for non-existent agent', () => {
      const agent = registry.get('non-existent')
      expect(agent).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all registered agents', () => {
      registry.register({
        name: 'Agent 1',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.register({
        name: 'Agent 2',
        url: 'http://localhost:3002',
        capabilities: ['code'],
        skills: [],
        status: 'online',
      })

      const agents = registry.getAll()

      expect(agents.length).toBe(2)
    })

    it('should return empty array when no agents', () => {
      const agents = registry.getAll()
      expect(agents).toEqual([])
    })
  })

  describe('getByCapability', () => {
    it('should return agents with specific capability', () => {
      registry.register({
        name: 'Chat Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat', 'streaming'],
        skills: [],
        status: 'online',
      })

      registry.register({
        name: 'Code Agent',
        url: 'http://localhost:3002',
        capabilities: ['code'],
        skills: [],
        status: 'online',
      })

      const agents = registry.getByCapability('chat')

      expect(agents.length).toBe(1)
      expect(agents[0].name).toBe('Chat Agent')
    })

    it('should return empty array for non-existent capability', () => {
      const agents = registry.getByCapability('non-existent')
      expect(agents).toEqual([])
    })
  })

  describe('getBySkill', () => {
    it('should return agents with specific skill', () => {
      registry.register({
        name: 'Conversation Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: ['conversation', 'analysis'],
        status: 'online',
      })

      registry.register({
        name: 'Code Agent',
        url: 'http://localhost:3002',
        capabilities: ['code'],
        skills: ['programming'],
        status: 'online',
      })

      const agents = registry.getBySkill('conversation')

      expect(agents.length).toBe(1)
      expect(agents[0].name).toBe('Conversation Agent')
    })

    it('should return empty array for non-existent skill', () => {
      const agents = registry.getBySkill('non-existent')
      expect(agents).toEqual([])
    })
  })

  describe('getAvailable', () => {
    it('should return only online agents', () => {
      registry.register({
        name: 'Online Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.register({
        name: 'Offline Agent',
        url: 'http://localhost:3002',
        capabilities: ['code'],
        skills: [],
        status: 'offline',
      })

      registry.register({
        name: 'Busy Agent',
        url: 'http://localhost:3003',
        capabilities: ['analysis'],
        skills: [],
        status: 'busy',
      })

      const agents = registry.getAvailable()

      expect(agents.length).toBe(1)
      expect(agents[0].name).toBe('Online Agent')
    })
  })

  describe('updateStatus', () => {
    it('should update agent status', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.updateStatus(id, 'busy')

      const agent = registry.get(id)
      expect(agent?.status).toBe('busy')
    })

    it('should emit status_change event', () => {
      let eventEmitted = false

      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.on('status_change', () => {
        eventEmitted = true
      })

      registry.updateStatus(id, 'busy')

      expect(eventEmitted).toBe(true)
    })

    it('should throw error for non-existent agent', () => {
      expect(() => {
        registry.updateStatus('non-existent', 'busy')
      }).toThrow()
    })
  })

  describe('updateHeartbeat', () => {
    it('should update heartbeat timestamp', async () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      const before = registry.get(id)!.lastHeartbeat

      // Wait a bit then update heartbeat
      await new Promise<void>(resolve => {
        setTimeout(() => {
          registry.updateHeartbeat(id)
          resolve()
        }, 10)
      })

      const after = registry.get(id)!.lastHeartbeat
      expect(after).not.toBe(before)
    })

    it('should update load if provided', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.updateHeartbeat(id, 0.8)

      const agent = registry.get(id)
      expect(agent?.load).toBe(0.8)
    })

    it('should emit heartbeat event', () => {
      let eventEmitted = false

      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      registry.on('heartbeat', () => {
        eventEmitted = true
      })

      registry.updateHeartbeat(id)

      expect(eventEmitted).toBe(true)
    })
  })

  describe('cleanupInactive', () => {
    it('should remove inactive agents', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'offline',
      })

      // Manually set old heartbeat
      const agent = registry.get(id)!
      agent.lastHeartbeat = new Date(Date.now() - 400000).toISOString() // 400 seconds ago

      const removed = registry.cleanupInactive(300000) // 300 seconds timeout

      expect(removed).toBe(1)
      expect(registry.get(id)).toBeUndefined()
    })

    it('should not remove active agents', () => {
      const id = registry.register({
        name: 'Test Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: [],
        status: 'online',
      })

      const removed = registry.cleanupInactive(300000)

      expect(removed).toBe(0)
      expect(registry.get(id)).toBeDefined()
    })
  })

  describe('findBestAgent', () => {
    beforeEach(() => {
      registry.register({
        name: 'Low Load Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
        load: 0.2,
      })

      registry.register({
        name: 'High Load Agent',
        url: 'http://localhost:3002',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'online',
        load: 0.8,
      })

      registry.register({
        name: 'Offline Agent',
        url: 'http://localhost:3003',
        capabilities: ['chat', 'streaming'],
        skills: ['conversation'],
        status: 'offline',
      })
    })

    it('should find agent by capabilities', () => {
      const agent = registry.findBestAgent({
        capabilities: ['chat', 'streaming'],
      })

      expect(agent).toBeDefined()
      expect(agent?.name).toBe('Low Load Agent') // Should pick low load
    })

    it('should find agent by skills', () => {
      const agent = registry.findBestAgent({
        skills: ['conversation'],
      })

      expect(agent).toBeDefined()
      expect(agent?.name).toBe('Low Load Agent')
    })

    it('should respect maxLoad filter', () => {
      const agent = registry.findBestAgent({
        capabilities: ['chat'],
        maxLoad: 0.5,
      })

      expect(agent).toBeDefined()
      expect(agent?.load).toBeLessThanOrEqual(0.5)
    })

    it('should return null when no matching agent', () => {
      const agent = registry.findBestAgent({
        capabilities: ['non-existent'],
      })

      expect(agent).toBeNull()
    })
  })

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      registry.register({
        name: 'Online Agent',
        url: 'http://localhost:3001',
        capabilities: ['chat'],
        skills: ['conversation'],
        status: 'online',
      })

      registry.register({
        name: 'Offline Agent',
        url: 'http://localhost:3002',
        capabilities: ['code'],
        skills: ['programming'],
        status: 'offline',
      })

      registry.register({
        name: 'Busy Agent',
        url: 'http://localhost:3003',
        capabilities: ['analysis'],
        skills: [],
        status: 'busy',
      })

      const stats = registry.getStats()

      expect(stats.total).toBe(3)
      expect(stats.online).toBe(1)
      expect(stats.offline).toBe(1)
      expect(stats.busy).toBe(1)
      expect(stats.byCapability.chat).toBe(1)
      expect(stats.byCapability.code).toBe(1)
      expect(stats.byCapability.analysis).toBe(1)
      expect(stats.bySkill.conversation).toBe(1)
      expect(stats.bySkill.programming).toBe(1)
    })

    it('should return zero stats for empty registry', () => {
      const stats = registry.getStats()

      expect(stats.total).toBe(0)
      expect(stats.online).toBe(0)
      expect(stats.offline).toBe(0)
      expect(stats.busy).toBe(0)
    })
  })
})

describe('FileAgentRegistry', () => {
  const testFilePath = '/tmp/test-registry.json'

  beforeEach(() => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath)
    }
  })

  it('should persist registry to file', () => {
    const registry = new FileAgentRegistry(testFilePath, false)

    registry.register({
      name: 'Test Agent',
      url: 'http://localhost:3001',
      capabilities: ['chat'],
      skills: [],
      status: 'online',
    })

    registry.flush()

    // Load from file
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'))
    expect(data.agents).toBeDefined()
    expect(data.agents.length).toBe(1)

    registry.close()
  })

  it('should restore registry from file', () => {
    // Create and populate registry
    const registry1 = new FileAgentRegistry(testFilePath, false)

    const id = registry1.register({
      name: 'Test Agent',
      url: 'http://localhost:3001',
      capabilities: ['chat', 'streaming'],
      skills: ['conversation'],
      status: 'online',
    })

    registry1.flush()
    registry1.close()

    // Load registry from file
    const registry2 = new FileAgentRegistry(testFilePath, false)

    const agent = registry2.get(id)

    expect(agent).toBeDefined()
    expect(agent?.name).toBe('Test Agent')
    expect(agent?.capabilities).toEqual(['chat', 'streaming'])
    expect(agent?.skills).toEqual(['conversation'])

    registry2.close()
  })

  it('should persist updates to file', () => {
    const registry = new FileAgentRegistry(testFilePath, false)

    const id = registry.register({
      name: 'Test Agent',
      url: 'http://localhost:3001',
      capabilities: ['chat'],
      skills: [],
      status: 'online',
    })

    registry.updateStatus(id, 'busy')
    registry.flush()

    // Load from file
    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'))
    const agent = data.agents.find((a: any) => a.id === id)

    expect(agent.status).toBe('busy')

    registry.close()
  })
})

describe('getAgentRegistry', () => {
  it('should return singleton instance', () => {
    const registry1 = getAgentRegistry()
    const registry2 = getAgentRegistry()

    expect(registry1).toBe(registry2)
  })
})
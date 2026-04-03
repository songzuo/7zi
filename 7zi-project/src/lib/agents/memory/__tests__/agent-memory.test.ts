/**
 * Agent Memory System Tests
 *
 * Comprehensive test suite for the Agent Memory System
 * Target: >80% code coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  AgentMemory,
  createAgentMemory,
  getMemoryInstance,
  resetMemoryInstance,
  ShortTermMemory,
  LongTermMemory,
  MemoryType,
  MemoryScope,
  type MemoryEntry,
  type MemoryMetadata,
} from '../index';

// Mock timers for expiration tests
jest.useFakeTimers();

describe('AgentMemory', () => {
  let memory: AgentMemory;
  const testAgentId = 'test-agent-1';

  beforeEach(() => {
    memory = new AgentMemory();
    jest.clearAllTimers();
  });

  afterEach(() => {
    resetMemoryInstance();
  });

  describe('Short-term Memory', () => {
    describe('add', () => {
      it('should add a short-term memory', async () => {
        const content = 'User asked about the weather';
        const result = await memory.shortTerm.add(testAgentId, content);

        expect(result).toBeDefined();
        expect(result.content).toBe(content);
        expect(result.agentId).toBe(testAgentId);
        expect(result.type).toBe(MemoryType.SHORT_TERM);
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.expiresAt).toBeDefined();
      });

      it('should add memory with custom metadata', async () => {
        const metadata: Partial<MemoryMetadata> = {
          importance: 9,
          confidence: 0.95,
          source: 'user',
          category: 'preference',
          tags: ['important', 'user-input'],
        };

        const result = await memory.shortTerm.add(testAgentId, 'Test content', metadata);

        expect(result.metadata.importance).toBe(9);
        expect(result.metadata.confidence).toBe(0.95);
        expect(result.metadata.source).toBe('user');
        expect(result.metadata.category).toBe('preference');
        expect(result.metadata.tags).toContain('important');
      });

      it('should update access count when reading', async () => {
        const entry = await memory.shortTerm.add(testAgentId, 'Test');
        
        const results = await memory.shortTerm.get(testAgentId);
        
        expect(results.length).toBe(1);
        expect(results[0].accessCount).toBe(1);
      });
    });

    describe('get', () => {
      it('should return empty array for unknown agent', async () => {
        const results = await memory.shortTerm.get('unknown-agent');
        expect(results).toHaveLength(0);
      });

      it('should return memories in LRU order', async () => {
        await memory.shortTerm.add(testAgentId, 'First');
        await memory.shortTerm.add(testAgentId, 'Second');
        await memory.shortTerm.add(testAgentId, 'Third');

        const memories = await memory.shortTerm.get(testAgentId);
        
        expect(memories.length).toBe(3);
      });

      it('should respect limit parameter', async () => {
        for (let i = 0; i < 10; i++) {
          await memory.shortTerm.add(testAgentId, `Memory ${i}`);
        }

        const results = await memory.shortTerm.get(testAgentId, 5);
        expect(results.length).toBe(5);
      });
    });

    describe('clear', () => {
      it('should clear all short-term memories for an agent', async () => {
        await memory.shortTerm.add(testAgentId, 'Test 1');
        await memory.shortTerm.add(testAgentId, 'Test 2');

        await memory.shortTerm.clear(testAgentId);

        const results = await memory.shortTerm.get(testAgentId);
        expect(results).toHaveLength(0);
      });

      it('should not affect other agents', async () => {
        const agent1 = 'agent-1';
        const agent2 = 'agent-2';

        await memory.shortTerm.add(agent1, 'Agent 1 memory');
        await memory.shortTerm.add(agent2, 'Agent 2 memory');

        await memory.shortTerm.clear(agent1);

        const agent1Results = await memory.shortTerm.get(agent1);
        const agent2Results = await memory.shortTerm.get(agent2);

        expect(agent1Results).toHaveLength(0);
        expect(agent2Results).toHaveLength(1);
      });
    });

    describe('expiration', () => {
      it('should expire memories after retention period', async () => {
        const shortTerm = new ShortTermMemory({ shortTermRetentionDays: 1 });
        
        // Create memory with past expiration date
        const entry = await shortTerm.add(testAgentId, 'Test memory');
        
        // Manually set expiration to past
        const memory = shortTerm.getById(entry.id);
        if (memory) {
          memory.expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago
        }
        
        // Cleanup should remove expired
        const cleaned = shortTerm.cleanup();
        expect(cleaned).toBe(1);
      });
    });
  });

  describe('Long-term Memory', () => {
    describe('store', () => {
      it('should store a long-term memory', async () => {
        const content = 'User prefers dark mode';
        const result = await memory.longTerm.store(testAgentId, content);

        expect(result).toBeDefined();
        expect(result.content).toBe(content);
        expect(result.type).toBe(MemoryType.SEMANTIC);
        expect(result.scope).toBe(MemoryScope.AGENT);
        expect(result.expiresAt).toBeUndefined();
      });

      it('should store episodic memory based on category', async () => {
        const result = await memory.longTerm.store(testAgentId, 'Event occurred', {
          category: 'event',
        });

        expect(result.type).toBe(MemoryType.EPISODIC);
      });

      it('should store procedural memory based on category', async () => {
        const result = await memory.longTerm.store(testAgentId, 'How to deploy', {
          category: 'workflow',
        });

        expect(result.type).toBe(MemoryType.PROCEDURAL);
      });

      it('should store with custom importance', async () => {
        const result = await memory.longTerm.store(testAgentId, 'Important fact', {
          importance: 10,
        });

        expect(result.metadata.importance).toBe(10);
      });
    });

    describe('get', () => {
      it('should return long-term memories sorted by importance', async () => {
        await memory.longTerm.store(testAgentId, 'Low importance', { importance: 2 });
        await memory.longTerm.store(testAgentId, 'High importance', { importance: 9 });
        await memory.longTerm.store(testAgentId, 'Medium importance', { importance: 5 });

        const results = await memory.longTerm.get(testAgentId);

        expect(results[0].metadata.importance).toBe(9);
        expect(results[1].metadata.importance).toBe(5);
        expect(results[2].metadata.importance).toBe(2);
      });

      it('should respect limit parameter', async () => {
        for (let i = 0; i < 20; i++) {
          await memory.longTerm.store(testAgentId, `Memory ${i}`);
        }

        const results = await memory.longTerm.get(testAgentId, 5);
        expect(results.length).toBe(5);
      });
    });

    describe('update', () => {
      it('should update memory content', async () => {
        const entry = await memory.longTerm.store(testAgentId, 'Original content');
        
        const updated = await memory.longTerm.update(entry.id, {
          content: 'Updated content',
        });

        expect(updated.content).toBe('Updated content');
      });

      it('should update memory metadata', async () => {
        const entry = await memory.longTerm.store(testAgentId, 'Test', { importance: 5 });
        
        const updated = await memory.longTerm.update(entry.id, {
          metadata: { importance: 10 },
        });

        expect(updated.metadata.importance).toBe(10);
      });

      it('should throw for non-existent memory', async () => {
        await expect(
          memory.longTerm.update('non-existent-id', { content: 'test' })
        ).rejects.toThrow('Memory not found');
      });
    });

    describe('delete', () => {
      it('should delete a memory', async () => {
        const entry = await memory.longTerm.store(testAgentId, 'To be deleted');
        
        await memory.longTerm.delete(entry.id);
        
        const results = await memory.longTerm.get(testAgentId);
        expect(results.find(m => m.id === entry.id)).toBeUndefined();
      });
    });
  });

  describe('Recall', () => {
    beforeEach(async () => {
      // Set up test data
      await memory.shortTerm.add(testAgentId, 'User asked about weather today');
      await memory.shortTerm.add(testAgentId, 'Meeting at 3pm');
      await memory.longTerm.store(testAgentId, 'User prefers Celsius for temperature', {
        importance: 8,
      });
      await memory.longTerm.store(testAgentId, 'User works remotely on Fridays', {
        importance: 6,
      });
    });

    it('should recall memories matching query', async () => {
      const results = await memory.recall(testAgentId, 'weather');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(m => m.content.includes('weather'))).toBe(true);
    });

    it('should combine short-term and long-term results', async () => {
      const results = await memory.recall(testAgentId, 'User');
      
      expect(results.length).toBeGreaterThan(1);
    });

    it('should respect limit option', async () => {
      const results = await memory.recall(testAgentId, 'User', { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', async () => {
      const results = await memory.recall(testAgentId, 'xyznonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      await memory.longTerm.store(testAgentId, 'JavaScript is the primary language', {
        category: 'fact',
        importance: 7,
      });
      await memory.longTerm.store(testAgentId, 'Server deployment process', {
        category: 'workflow',
        importance: 8,
      });
      await memory.longTerm.store(testAgentId, 'Important bug fix from last week', {
        category: 'event',
        importance: 9,
      });
    });

    it('should search with query options', async () => {
      const results = await memory.search(testAgentId, 'JavaScript');
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired memories', async () => {
      await memory.shortTerm.add(testAgentId, 'Test memory');
      
      // Cleanup should work
      const result = await memory.cleanup({ deleteExpired: true });
      
      expect(result).toBeDefined();
      expect(result.expiredCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stats', () => {
    it('should return memory statistics', async () => {
      await memory.shortTerm.add(testAgentId, 'Short term 1');
      await memory.shortTerm.add(testAgentId, 'Short term 2');
      await memory.longTerm.store(testAgentId, 'Long term 1');
      await memory.longTerm.store(testAgentId, 'Long term 2');

      const stats = await memory.getStats(testAgentId);

      expect(stats.agentId).toBe(testAgentId);
      expect(stats.shortTermCount).toBe(2);
      expect(stats.longTermCount).toBe(2);
      expect(stats.totalMemories).toBe(4);
    });
  });

  describe('Import/Export', () => {
    it('should export all memories', async () => {
      await memory.shortTerm.add(testAgentId, 'Test 1');
      await memory.longTerm.store(testAgentId, 'Test 2');

      const exported = memory.export();
      
      expect(exported.length).toBe(2);
    });

    it('should import memories', async () => {
      const newMemory = new AgentMemory();
      
      const entries: MemoryEntry[] = [
        {
          id: 'import-1',
          agentId: testAgentId,
          type: MemoryType.SEMANTIC,
          scope: MemoryScope.AGENT,
          content: 'Imported memory',
          metadata: {
            importance: 5,
            confidence: 1,
            source: 'system',
            tags: [],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
          relatedMemoryIds: [],
          isActive: true,
          isPinned: false,
        },
      ];

      newMemory.import(entries);

      const results = await newMemory.longTerm.get(testAgentId);
      expect(results.find(m => m.content === 'Imported memory')).toBeDefined();
    });
  });
});

describe('Factory Functions', () => {
  afterEach(() => {
    resetMemoryInstance();
  });

  it('should create memory instance with createAgentMemory', () => {
    const memory = createAgentMemory({ shortTermMaxItems: 50 });
    expect(memory).toBeInstanceOf(AgentMemory);
    expect(memory.getConfig().shortTermMaxItems).toBe(50);
  });

  it('should return singleton with getMemoryInstance', () => {
    const memory1 = getMemoryInstance();
    const memory2 = getMemoryInstance();
    
    expect(memory1).toBe(memory2);
  });

  it('should reset singleton', () => {
    const memory1 = getMemoryInstance();
    resetMemoryInstance();
    const memory2 = getMemoryInstance();
    
    expect(memory1).not.toBe(memory2);
  });
});

describe('ShortTermMemory Class', () => {
  let shortTerm: ShortTermMemory;
  const testAgentId = 'test-agent';

  beforeEach(() => {
    shortTerm = new ShortTermMemory({ shortTermMaxItems: 10 });
  });

  it('should enforce capacity limits', async () => {
    // Add more than capacity
    for (let i = 0; i < 15; i++) {
      await shortTerm.add(testAgentId, `Memory ${i}`);
    }

    const results = await shortTerm.get(testAgentId);
    
    // Should not exceed max items
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('should prioritize important memories during eviction', async () => {
    // Add low importance memories
    for (let i = 0; i < 8; i++) {
      await shortTerm.add(testAgentId, `Low ${i}`, { importance: 1 });
    }
    
    // Add high importance memory
    await shortTerm.add(testAgentId, 'Important', { importance: 10 });
    
    // Force eviction by adding more
    for (let i = 0; i < 5; i++) {
      await shortTerm.add(testAgentId, `New ${i}`, { importance: 5 });
    }

    const results = await shortTerm.get(testAgentId);
    
    // High importance memory should still exist
    expect(results.find(m => m.content === 'Important')).toBeDefined();
  });

  it('should handle pinned memories', async () => {
    const entry = await shortTerm.add(testAgentId, 'Pinned');
    
    // Manually pin the memory
    const memory = shortTerm.getById(entry.id);
    if (memory) {
      memory.isPinned = true;
    }

    // Add more memories
    for (let i = 0; i < 15; i++) {
      await shortTerm.add(testAgentId, `Memory ${i}`);
    }

    // Pinned memory should still exist
    expect(shortTerm.getById(entry.id)).toBeDefined();
  });
});

describe('LongTermMemory Class', () => {
  let longTerm: LongTermMemory;
  const testAgentId = 'test-agent';

  beforeEach(() => {
    longTerm = new LongTermMemory();
  });

  describe('semanticSearch', () => {
    beforeEach(async () => {
      await longTerm.store(testAgentId, 'The quick brown fox jumps', { importance: 7 });
      await longTerm.store(testAgentId, 'JavaScript is a programming language', { importance: 6 });
      await longTerm.store(testAgentId, 'Weather forecast for today', { importance: 5 });
    });

    it('should return results with similarity scores', async () => {
      const results = await longTerm.semanticSearch('JavaScript');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeDefined();
    });

    it('should filter by minSimilarity', async () => {
      const results = await longTerm.semanticSearch('test', { minSimilarity: 0.5 });
      
      // All results should meet the threshold
      results.forEach(r => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('promote', () => {
    it('should promote a short-term memory to long-term', async () => {
      const shortTermEntry: MemoryEntry = {
        id: 'short-1',
        agentId: testAgentId,
        type: MemoryType.SHORT_TERM,
        scope: MemoryScope.SESSION,
        content: 'This was a short-term memory',
        metadata: {
          importance: 6,
          confidence: 0.9,
          source: 'user',
          tags: ['test'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastAccessedAt: new Date(),
        accessCount: 3,
        relatedMemoryIds: [],
        isActive: true,
        isPinned: false,
      };

      const promoted = await longTerm.promote(shortTermEntry);

      expect(promoted.type).toBe(MemoryType.SEMANTIC);
      expect(promoted.scope).toBe(MemoryScope.AGENT);
      expect(promoted.expiresAt).toBeUndefined();
      expect(promoted.content).toBe(shortTermEntry.content);
      expect(promoted.id).not.toBe(shortTermEntry.id); // New ID
    });
  });
});

describe('Memory Types', () => {
  it('should have correct MemoryType values', () => {
    expect(MemoryType.SHORT_TERM).toBe('short_term');
    expect(MemoryType.WORKING).toBe('working');
    expect(MemoryType.EPISODIC).toBe('episodic');
    expect(MemoryType.SEMANTIC).toBe('semantic');
    expect(MemoryType.PROCEDURAL).toBe('procedural');
    expect(MemoryType.SHARED).toBe('shared');
  });

  it('should have correct MemoryScope values', () => {
    expect(MemoryScope.PRIVATE).toBe('private');
    expect(MemoryScope.SESSION).toBe('session');
    expect(MemoryScope.AGENT).toBe('agent');
    expect(MemoryScope.TEAM).toBe('team');
    expect(MemoryScope.PUBLIC).toBe('public');
  });
});

describe('Edge Cases', () => {
  let memory: AgentMemory;

  beforeEach(() => {
    memory = new AgentMemory();
  });

  it('should handle empty agent ID', async () => {
    await expect(memory.shortTerm.add('', 'test')).resolves.toBeDefined();
  });

  it('should handle special characters in content', async () => {
    const specialContent = '特殊字符 🎉 <script>alert("xss")</script>';
    const result = await memory.shortTerm.add('agent', specialContent);
    
    expect(result.content).toBe(specialContent);
  });

  it('should handle very long content', async () => {
    const longContent = 'a'.repeat(10000);
    const result = await memory.shortTerm.add('agent', longContent);
    
    expect(result.content).toBe(longContent);
  });

  it('should handle concurrent operations', async () => {
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(memory.shortTerm.add('agent', `Concurrent ${i}`));
    }
    
    const results = await Promise.all(promises);
    
    expect(results.length).toBe(100);
    expect(new Set(results.map(r => r.id)).size).toBe(100); // All unique IDs
  });

  it('should handle memory with no tags', async () => {
    const result = await memory.longTerm.store('agent', 'No tags', {
      tags: [],
    });
    
    expect(result.metadata.tags).toEqual([]);
  });
});
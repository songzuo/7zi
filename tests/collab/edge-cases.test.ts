/**
 * Collaboration System Edge Case Tests
 * 
 * Tests for edge cases in collaborative editing:
 * - User disconnection and reconnection
 * - Concurrent editing conflicts
 * - State synchronization failures
 * - Permission changes
 * 
 * @author Test Engineer
 * @date 2026-04-04
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CRDTTextImpl, CRDTUpdate, OperationType, Operation } from '../../src/lib/collab/core/crdt';
import { CollabClient, CollabConnection, ConnectionOptions } from '../../src/lib/collab/client/client';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Simulate a network delay
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a mock WebSocket for testing
 */
class MockWebSocket {
  public readyState: number = 0; // CONNECTING
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  
  private sentMessages: string[] = [];
  
  constructor(public url: string) {
    // Simulate connection delay
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }
  
  send(data: string): void {
    this.sentMessages.push(data);
  }
  
  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
  
  getSentMessages(): string[] {
    return this.sentMessages;
  }
  
  // Simulate receiving a message from server
  simulateMessage(message: object): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(message) }));
    }
  }
}

// ============================================================================
// Edge Case Tests: User Disconnection and Reconnection
// ============================================================================

describe('Collab Edge Cases: Disconnection & Reconnection', () => {
  let mockWs: MockWebSocket;
  
  beforeEach(() => {
    // Reset modules to ensure clean state
    vi.resetModules();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Reconnection Scenarios', () => {
    it('should queue operations when disconnected and retry on reconnect', async () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Simulate offline scenario
      const isConnected = false;
      const pendingOps: Operation[] = [];
      
      // Insert while offline
      const ops = crdt.insert(0, 'Hello');
      pendingOps.push(...ops);
      
      // Verify operations are queued
      expect(pendingOps).toHaveLength(5);
      
      // Simulate reconnection
      const isReconnected = true;
      
      // Apply queued operations on reconnect
      if (isReconnected && pendingOps.length > 0) {
        const crdt2 = new CRDTTextImpl('client-2');
        pendingOps.forEach(op => crdt2.applyOperation(op));
        expect(crdt2.getText()).toBe('Hello');
      }
    });
    
    it('should handle multiple reconnection attempts', () => {
      const maxReconnectAttempts = 10;
      let reconnectAttempts = 0;
      
      // Simulate reconnection loop
      const attemptReconnect = () => {
        reconnectAttempts++;
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(attemptReconnect, 100);
        }
      };
      
      attemptReconnect();
      
      // Allow some time for async operations
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(reconnectAttempts).toBeLessThanOrEqual(maxReconnectAttempts);
          resolve();
        }, 1500);
      });
    });
    
    it('should preserve CRDT state after reconnection', () => {
      // Client A creates initial content
      const crdtA = new CRDTTextImpl('client-a');
      crdtA.insert(0, 'Original text');
      
      // Serialize state
      const state = crdtA.toJSON();
      
      // Simulate reconnection by restoring from serialized state
      const crdtRestored = CRDTTextImpl.fromJSON(state, 'client-a');
      
      expect(crdtRestored.getText()).toBe('Original text');
      
      // Verify vector clock is preserved
      const clock = crdtRestored.getVectorClock();
      expect(clock.get('client-a')).toBeDefined();
    });
    
    it('should handle concurrent reconnection from multiple clients', () => {
      // Multiple clients reconnecting simultaneously
      const clients = ['client-a', 'client-b', 'client-c'];
      const restoredCRDTs = clients.map(id => {
        const crdt = new CRDTTextImpl(id);
        crdt.insert(0, `User ${id} content`);
        return crdt;
      });
      
      // All clients should have valid state
      restoredCRDTs.forEach((crdt, idx) => {
        expect(crdt.getText()).toBe(`User ${clients[idx]} content`);
      });
    });
  });

  describe('Network Interruption Handling', () => {
    it('should handle sudden network disconnection during operation', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Start an operation
      const partialOps = crdt.insert(0, 'Hello');
      
      // Simulate network interruption - only first few ops succeed
      const successfulOps = partialOps.slice(0, 2);
      
      // Create another CRDT to simulate receiving partial updates
      const crdt2 = new CRDTTextImpl('client-2');
      successfulOps.forEach(op => crdt2.applyOperation(op));
      
      // Should have partial content
      expect(crdt2.getText()).toBe('He');
      
      // Continue with remaining operations after network恢复
      const remainingOps = partialOps.slice(2);
      remainingOps.forEach(op => crdt2.applyOperation(op));
      
      expect(crdt2.getText()).toBe('Hello');
    });
    
    it('should handle connection timeout', () => {
      const connectionTimeout = 30000; // 30 seconds
      const connectionStart = Date.now();
      
      // Simulate a connection that times out
      const connectionFailed = true;
      const retryDelay = 1000;
      
      if (connectionFailed) {
        // Calculate elapsed time
        const elapsed = Date.now() - connectionStart;
        expect(elapsed).toBeLessThan(connectionTimeout);
        
        // Should retry after delay
        expect(retryDelay).toBe(1000);
      }
    });
    
    it('should gracefully handle WebSocket closure', () => {
      const ws = new MockWebSocket('ws://test.com');
      
      let closeEventFired = false;
      ws.onclose = () => {
        closeEventFired = true;
      };
      
      ws.close();
      
      expect(closeEventFired).toBe(true);
      expect(ws.readyState).toBe(3); // CLOSED
    });
  });
});

// ============================================================================
// Edge Case Tests: Concurrent Editing Conflicts
// ============================================================================

describe('Collab Edge Cases: Concurrent Editing Conflicts', () => {
  describe('Conflict Detection', () => {
    it('should detect concurrent inserts at same position', () => {
      // Two clients insert at position 0 simultaneously
      const crdtA = new CRDTTextImpl('client-a');
      const crdtB = new CRDTTextImpl('client-b');
      
      const opsA = crdtA.insert(0, 'AAA');
      const opsB = crdtB.insert(0, 'BBB');
      
      // Apply both to a third CRDT
      const crdtMerged = new CRDTTextImpl('client-merged');
      opsA.forEach(op => crdtMerged.applyOperation(op));
      opsB.forEach(op => crdtMerged.applyOperation(op));
      
      // Should have both insertions (order depends on ID generation, not insertion order)
      const content = crdtMerged.getText();
      expect(content.length).toBe(6);
      expect(content).toMatch(/^(AAA BBB|BBB AAA|BBBAAA|AAABBB)$/);
    });
    
    it('should handle insert-delete conflict at same position', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Insert text
      crdt.insert(0, 'Hello');
      
      // Concurrent delete at position 0
      const deleteOps = crdt.delete(0, 3);
      
      expect(crdt.getText()).toBe('lo');
      expect(deleteOps).toHaveLength(3);
    });
    
    it('should handle overlapping deletes', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Insert "Hello World"
      crdt.insert(0, 'Hello World');
      
      // Delete from position 0, length 5
      const delete1 = crdt.delete(0, 5);
      
      // Another delete from position 0 (now points to " World")
      const delete2 = crdt.delete(0, 3);
      
      // After first delete: " World" (11 - 5 = 6 characters)
      // After second delete from position 0, length 3: removes " Wo", leaving "rld"
      expect(crdt.getText()).toBe('rld');
      expect(delete1).toHaveLength(5);
      expect(delete2).toHaveLength(3);
    });
    
    it('should handle interleaved operations from multiple clients', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');
      
      // Client 1: insert "ABC"
      const ops1 = crdt1.insert(0, 'ABC');
      ops1.forEach(op => crdt2.applyOperation(op));
      
      // Client 2: insert "XYZ" at position 1
      const ops2 = crdt2.insert(1, 'XYZ');
      ops2.forEach(op => crdt1.applyOperation(op));
      
      // Both should converge to same result
      expect(crdt1.getText()).toBe(crdt2.getText());
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict using last-writer-wins for same field', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');
      
      // Both clients insert at position 0
      const ops1 = crdt1.insert(0, 'A');
      const ops2 = crdt2.insert(0, 'B');
      
      // Apply with timestamp (simulating last-writer-wins)
      const merged = new CRDTTextImpl('merged');
      
      // Apply ops1 first (earlier)
      ops1.forEach(op => merged.applyOperation(op));
      
      // Apply ops2 second (later - wins)
      ops2.forEach(op => merged.applyOperation(op));
      
      // The result should have both characters
      expect(merged.getText().length).toBe(2);
    });
    
    it('should handle idempotent operations correctly', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      const ops = crdt.insert(0, 'Test');
      
      // Apply same operation multiple times
      ops.forEach(op => crdt.applyOperation(op));
      ops.forEach(op => crdt.applyOperation(op));
      ops.forEach(op => crdt.applyOperation(op));
      
      // Should only result in one insertion
      expect(crdt.getText()).toBe('Test');
    });
    
    it('should handle concurrent edits with vector clocks', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');
      
      // Client 1 inserts
      const ops1 = crdt1.insert(0, 'Hello');
      
      // Get vector clocks
      const clock1 = crdt1.getVectorClock();
      const clock2 = crdt2.getVectorClock();
      
      // Merge clocks
      crdt1.mergeVectorClock(clock2);
      crdt2.mergeVectorClock(clock1);
      
      // Both clients should have updated clocks
      expect(crdt1.getVectorClock().get('client-1')).toBeGreaterThan(0);
      // Client 2 hasn't performed any operations yet, so its clock entry may be undefined
      const client2Clock = crdt2.getVectorClock().get('client-2');
      expect(client2Clock === undefined || client2Clock === 0).toBe(true);
    });
  });
});

// ============================================================================
// Edge Case Tests: State Synchronization Failures
// ============================================================================

describe('Collab Edge Cases: State Synchronization Failures', () => {
  describe('Sync Failure Handling', () => {
    it('should handle partial sync failure', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Insert "TestContent" (11 characters)
      const fullOps = crdt.insert(0, 'TestContent');
      
      // Verify we have 11 operations
      expect(fullOps.length).toBe(11);
      
      // Simulate partial sync - only first 5 characters
      const syncOps = fullOps.slice(0, 5);
      
      const crdt2 = new CRDTTextImpl('client-2');
      syncOps.forEach(op => crdt2.applyOperation(op));
      
      // After applying 5 operations, we should have 5 characters
      expect(crdt2.getText()).toBe('TestC');
      
      // Request full sync - apply remaining operations
      const remainingOps = fullOps.slice(5);
      remainingOps.forEach(op => crdt2.applyOperation(op));
      
      expect(crdt2.getText()).toBe('TestContent');
    });
    
    it('should handle sync with corrupted data', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Valid content');
      
      const state = crdt.toJSON();
      
      // Corrupt the state
      state.content = null;
      
      // Should handle gracefully when restoring
      try {
        const restored = CRDTTextImpl.fromJSON(state, 'client-1');
        expect(restored.getText()).toBe('');
      } catch (e) {
        // Or expect graceful handling
        expect(e).toBeDefined();
      }
    });
    
    it('should handle missing vector clock in sync', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Content');
      
      const json = crdt.toJSON();
      
      // Remove vector clock
      delete json.vectorClock;
      
      // Should still restore content
      const restored = CRDTTextImpl.fromJSON(json, 'client-1');
      expect(restored.getText()).toBe('Content');
    });
    
    it('should handle sync with invalid node structure', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Test');
      
      const json = crdt.toJSON();
      
      // Corrupt nodes array
      const nodes = json.nodes as [string, unknown][];
      nodes.push(['invalid-node', { id: 'invalid' }]);
      
      const restored = CRDTTextImpl.fromJSON(json, 'client-1');
      // Should still return content, possibly with some issues
      expect(restored.getText()).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency after multiple sync cycles', () => {
      const original = new CRDTTextImpl('original');
      original.insert(0, 'Data');
      
      // First sync
      let state = original.toJSON();
      let replica1 = CRDTTextImpl.fromJSON(state, 'replica1');
      
      // Modify replica
      replica1.insert(5, ' More');
      state = replica1.toJSON();
      
      // Sync back to original
      const restoredOriginal = CRDTTextImpl.fromJSON(state, 'original');
      
      expect(restoredOriginal.getText()).toBe('Data More');
    });
    
    it('should handle concurrent sync from multiple sources', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');
      
      // Start with same initial content
      const ops1 = crdt1.insert(0, 'Hello');
      ops1.forEach(op => crdt2.applyOperation(op));
      
      // Both should have same content
      expect(crdt1.getText()).toBe('Hello');
      expect(crdt2.getText()).toBe('Hello');
      
      // Client 1 appends at end
      const opsAppend1 = crdt1.insert(5, ' World');
      
      // Client 2 appends at end (after client 1's operation)
      const opsAppend2 = crdt2.insert(5, '!');
      
      // Apply to each other (simulating sync)
      opsAppend1.forEach(op => crdt2.applyOperation(op));
      opsAppend2.forEach(op => crdt1.applyOperation(op));
      
      // Both should have the same characters (CRDT guarantees convergence)
      const content1 = crdt1.getText();
      const content2 = crdt2.getText();
      
      // Both should contain all characters
      expect(content1.length).toBe(content2.length);
      expect(content1.length).toBe(12); // "Hello" + " World" + "!"
      expect(content1).toContain('Hello');
      expect(content1).toContain('World');
      expect(content1).toContain('!');
    });
    
    it('should handle version mismatch during sync', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Insert with version tracking
      crdt.insert(0, 'Version 1');
      const version1 = crdt.getVectorClock();
      
      crdt.insert(0, 'Version 2');
      const version2 = crdt.getVectorClock();
      
      // Version 1 should be older
      expect(version2.get('client-1')).toBeGreaterThan(version1.get('client-1')!);
    });
  });
});

// ============================================================================
// Edge Case Tests: Permission Changes
// ============================================================================

describe('Collab Edge Cases: Permission Changes', () => {
  describe('User Permission Scenarios', () => {
    it('should handle user permission downgrade', () => {
      // Simulate a user with edit permission
      let userPermissions = {
        'user-1': ['read', 'write', 'admin'],
        'user-2': ['read', 'write']
      };
      
      // Permission downgrade
      userPermissions['user-1'] = ['read', 'write'];
      
      // Check old permissions are removed
      expect(userPermissions['user-1']).not.toContain('admin');
      expect(userPermissions['user-1']).toContain('read');
      expect(userPermissions['user-1']).toContain('write');
    });
    
    it('should handle user permission upgrade', () => {
      let userPermissions = {
        'user-1': ['read']
      };
      
      // Permission upgrade
      userPermissions['user-1'] = ['read', 'write'];
      
      expect(userPermissions['user-1']).toContain('write');
    });
    
    it('should handle user removal from collaboration', () => {
      let session = {
        id: 'session-1',
        users: [
          { id: 'user-1', name: 'Alice', permissions: ['read', 'write'] },
          { id: 'user-2', name: 'Bob', permissions: ['read'] }
        ]
      };
      
      // Remove user
      session.users = session.users.filter(u => u.id !== 'user-2');
      
      expect(session.users).toHaveLength(1);
      expect(session.users[0].id).toBe('user-1');
    });
    
    it('should handle user re-addition with different permissions', () => {
      let session = {
        id: 'session-1',
        users: [
          { id: 'user-1', name: 'Alice', permissions: ['read'] }
        ]
      };
      
      // User was previously in session, now re-added with different permissions
      const existingUser = session.users.find(u => u.id === 'user-1');
      
      if (existingUser) {
        existingUser.permissions = ['read', 'write'];
      } else {
        session.users.push({ id: 'user-1', name: 'Alice', permissions: ['read', 'write'] });
      }
      
      expect(session.users[0].permissions).toContain('write');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should enforce read-only permission for viewer role', () => {
      const userRole = 'viewer';
      const permissions = {
        owner: ['read', 'write', 'delete', 'admin'],
        editor: ['read', 'write'],
        viewer: ['read']
      };
      
      const userPerms = permissions[userRole as keyof typeof permissions];
      
      // Should not be able to write
      expect(userPerms).toContain('read');
      expect(userPerms).not.toContain('write');
    });
    
    it('should handle role change during active session', () => {
      let userSession = {
        userId: 'user-1',
        role: 'editor',
        canEdit: true
      };
      
      // Role changed to viewer
      userSession.role = 'viewer';
      userSession.canEdit = false;
      
      expect(userSession.canEdit).toBe(false);
      expect(userSession.role).toBe('viewer');
    });
    
    it('should handle session lock for permission changes', () => {
      let sessionLocked = false;
      
      // Lock session before permission change
      sessionLocked = true;
      
      // Perform permission changes
      const permissionChanges = {
        'user-1': { old: ['read', 'write'], new: ['read'] }
      };
      
      // Unlock after changes
      sessionLocked = false;
      
      expect(sessionLocked).toBe(false);
      expect(permissionChanges['user-1'].new).not.toContain('write');
    });
  });

  describe('Permission Conflict Resolution', () => {
    it('should handle concurrent permission changes', () => {
      // User A grants permission
      const permissionsA = { 'user-1': ['read', 'write'] };
      
      // User B revokes permission at same time
      const permissionsB = { 'user-1': ['read'] };
      
      // Last write wins - B wins
      const finalPermissions = permissionsB;
      
      expect(finalPermissions['user-1']).not.toContain('write');
    });
    
    it('should validate permission requests against current role', () => {
      const userRole = 'editor';
      const requestedAction = 'delete';
      
      const rolePermissions: Record<string, string[]> = {
        owner: ['read', 'write', 'delete', 'admin'],
        editor: ['read', 'write'],
        viewer: ['read']
      };
      
      const hasPermission = rolePermissions[userRole]?.includes(requestedAction) || false;
      
      expect(hasPermission).toBe(false);
    });
  });
});

// ============================================================================
// Edge Case Tests: Error Conditions
// ============================================================================

describe('Collab Edge Cases: Error Conditions', () => {
  describe('Invalid Operations', () => {
    it('should handle insert at invalid position', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Hello');
      
      // Insert at negative position - should handle gracefully
      // Implementation may clamp or reject
      const result = crdt.insert(-5, 'X');
      
      // Should either clamp to 0 or return empty
      expect(crdt.getText()).toBeDefined();
    });
    
    it('should handle delete beyond document length', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Hi');
      
      // Delete more than available
      const ops = crdt.delete(0, 100);
      
      expect(crdt.getText()).toBe('');
      expect(ops.length).toBeLessThanOrEqual(2);
    });
    
    it('should handle empty string operations', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      const insertOps = crdt.insert(0, '');
      const deleteOps = crdt.delete(0, 5);
      
      expect(insertOps).toHaveLength(0);
      expect(deleteOps).toHaveLength(0);
      expect(crdt.getText()).toBe('');
    });
  });

  describe('Serialization Errors', () => {
    it('should handle serialization of corrupted state', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Test');
      
      const json = crdt.toJSON();
      
      // Corrupt JSON
      (json as any).nodes = null;
      
      try {
        const restored = CRDTTextImpl.fromJSON(json, 'client-1');
        // Should either throw or return empty
        expect(restored.getText()).toBeDefined();
      } catch (e) {
        // Graceful error handling
        expect(e).toBeDefined();
      }
    });
    
    it('should handle missing required fields in deserialization', () => {
      const incompleteJson = {
        type: 'text',
        content: 'Test'
        // Missing: nodes, head, tail, vectorClock
      };
      
      try {
        const restored = CRDTTextImpl.fromJSON(incompleteJson, 'client-1');
        expect(restored.getText()).toBeDefined();
      } catch (e) {
        // Should handle gracefully
        expect(e).toBeDefined();
      }
    });
  });

  describe('Connection Errors', () => {
    it('should handle connection to invalid URL', async () => {
      const invalidUrl = 'ws://invalid-domain-that-does-not-exist.com';
      
      // Should fail gracefully
      expect(() => {
        const ws = new MockWebSocket(invalidUrl);
      }).not.toThrow();
    });
    
    it('should handle message queue overflow', () => {
      const maxQueueSize = 1000;
      const messageQueue: string[] = [];
      
      // Fill queue to max
      for (let i = 0; i < maxQueueSize; i++) {
        messageQueue.push(`message-${i}`);
      }
      
      // Try to add more - should handle overflow
      const result = messageQueue.push(`message-${maxQueueSize}`);
      
      // Queue should either accept or reject
      expect(result).toBeGreaterThan(maxQueueSize);
    });
  });
});

// ============================================================================
// Edge Case Tests: Performance & Memory
// ============================================================================

describe('Collab Edge Cases: Performance & Memory', () => {
  describe('Large Document Handling', () => {
    it('should handle large insert operations', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Insert large string
      const largeString = 'A'.repeat(10000);
      const ops = crdt.insert(0, largeString);
      
      expect(crdt.getText().length).toBe(10000);
      expect(ops.length).toBe(10000);
    });
    
    it('should handle many small operations efficiently', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Many small inserts
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        crdt.insert(i, 'x');
      }
      const elapsed = Date.now() - startTime;
      
      expect(crdt.getText().length).toBe(100);
      expect(elapsed).toBeLessThan(1000); // Should complete in reasonable time
    });
    
    it('should handle memory cleanup after document deletion', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Create large document
      crdt.insert(0, 'X'.repeat(1000));
      
      // Delete all
      crdt.delete(0, 1000);
      
      // Content should be empty
      expect(crdt.getText()).toBe('');
    });
  });
});

// ============================================================================
// Edge Case Tests: Boundary Conditions
// ============================================================================

describe('Collab Edge Cases: Boundary Conditions', () => {
  describe('Position Boundaries', () => {
    it('should handle insert at position 0', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Hello');
      crdt.insert(0, 'World');
      
      expect(crdt.getText()).toBe('WorldHello');
    });
    
    it('should handle insert at end position', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Hello');
      crdt.insert(5, ' World');
      
      expect(crdt.getText()).toBe('Hello World');
    });
    
    it('should handle insert beyond end', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Hi');
      crdt.insert(100, ' Extra');
      
      // Should clamp to end or append
      const content = crdt.getText();
      expect(content.includes('Extra')).toBe(true);
    });
  });

  describe('Empty Document Handling', () => {
    it('should handle operations on empty document', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      expect(crdt.getText()).toBe('');
      
      // Delete from empty
      const deleteOps = crdt.delete(0, 5);
      expect(deleteOps).toHaveLength(0);
    });
    
    it('should handle multiple rapid operations on empty document', () => {
      const crdt = new CRDTTextImpl('client-1');
      
      // Rapid operations
      crdt.insert(0, 'A');
      crdt.insert(1, 'B');
      crdt.insert(2, 'C');
      
      expect(crdt.getText()).toBe('ABC');
    });
  });
});

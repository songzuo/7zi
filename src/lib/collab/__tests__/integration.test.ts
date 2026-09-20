/**
 * Integration tests for collaborative editing system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { CollabServer, createSession, getDocumentState } from '../server/server';
import { CollabClient, joinSession } from '../client/client';
import { CRDTTextImpl } from '../core/crdt';

describe('Collaborative Editing Integration', () => {
  let server: CollabServer;
  const port = 9995;
  const serverUrl = `ws://localhost:${port}`;

  beforeEach(async () => {
    server = new CollabServer(port);
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    server.close();
  });

  describe('server functionality', () => {
    it('should create and manage sessions', () => {
      const session = createSession('doc-123');
      expect(session.documentId).toBe('doc-123');
      expect(session.clients.size).toBe(0);
    });

    it('should accept WebSocket connections', async () => {
      const ws = new WebSocket(serverUrl);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        ws.on('error', reject);
      });
    });

    it('should handle join message', async () => {
      const ws = new WebSocket(serverUrl);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'join',
            sessionId: 'session-123',
            data: {
              userId: 'user-123',
              name: 'Test User',
            },
          }));

          setTimeout(() => {
            ws.close();
            resolve();
          }, 100);
        });

        ws.on('error', reject);
      });
    });
  });

  describe('CRDT functionality', () => {
    it('should handle text operations correctly', () => {
      const crdt1 = new CRDTTextImpl('client-1');
      const crdt2 = new CRDTTextImpl('client-2');

      // Client 1 inserts
      const ops1 = crdt1.insert(0, 'Hello');

      // Apply to client 2
      ops1.forEach(op => crdt2.applyOperation(op));

      expect(crdt2.getText()).toBe('Hello');
    });

    it('should handle sequential operations', () => {
      const crdt = new CRDTTextImpl('client-1');

      crdt.insert(0, 'Hello');
      crdt.insert(5, ' World');
      crdt.delete(5, 1);

      expect(crdt.getText()).toBe('HelloWorld');
    });

    it('should serialize and deserialize correctly', () => {
      const crdt = new CRDTTextImpl('client-1');
      crdt.insert(0, 'Test content');

      const json = crdt.toJSON();
      const restored = CRDTTextImpl.fromJSON(json, 'client-2');

      expect(restored.getText()).toBe('Test content');
    });
  });

  describe('error handling', () => {
    it('should handle invalid messages gracefully', async () => {
      const ws = new WebSocket(serverUrl);

      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send('invalid json');
          setTimeout(() => {
            ws.close();
            resolve();
          }, 100);
        });
      });

      // Server should still be running
      expect(server.getAllSessions()).toBeDefined();
    });
  });
});
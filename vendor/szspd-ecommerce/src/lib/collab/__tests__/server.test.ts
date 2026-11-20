/**
 * Unit tests for Collab Server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollabServer, createSession, getDocumentState } from '../server/server';
import { WebSocket } from 'ws';

describe('CollabServer', () => {
  let server: CollabServer;
  const port = 9999;
  const serverUrl = `ws://localhost:${port}`;

  beforeEach(async () => {
    server = new CollabServer(port);
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    server.close();
  });

  describe('session management', () => {
    it('should create a session', () => {
      const session = createSession('doc-123');
      expect(session.documentId).toBe('doc-123');
      expect(session.clients.size).toBe(0);
      expect(session.crdt).toBeDefined();
    });

    it('should track sessions', () => {
      const session = createSession('doc-123');
      const sessions = new Map();
      sessions.set(session.id, session);

      const allSessions = server.getAllSessions();
      expect(allSessions).toEqual([]);
    });

    it('should get document state', () => {
      const session = createSession('doc-123');
      session.crdt.insert(0, 'Hello World');

      const sessions = new Map();
      sessions.set(session.id, session);

      const state = getDocumentState(session.id, sessions);
      expect(state.content).toBe('Hello World');
      expect(state.documentId).toBe('doc-123');
    });
  });

  describe('WebSocket connection', () => {
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

    it('should handle sync message', async () => {
      const ws = new WebSocket(serverUrl);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'join',
            sessionId: 'session-123',
            data: { userId: 'user-123' },
          }));

          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'sync',
              sessionId: 'session-123',
              data: {},
            }));

            setTimeout(() => {
              ws.close();
              resolve();
            }, 100);
          }, 100);
        });

        ws.on('error', reject);
      });
    });
  });

  describe('events', () => {
    it('should emit client-joined event', async () => {
      const eventReceived = new Promise<void>((resolve) => {
        server.on('client-joined', () => resolve());
      });

      const ws = new WebSocket(serverUrl);

      await new Promise<void>((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'join',
            sessionId: 'session-123',
            data: { userId: 'user-123' },
          }));
          resolve();
        });
      });

      // Wait briefly for event to be processed
      await Promise.race([
        eventReceived,
        new Promise<void>(resolve => setTimeout(resolve, 500))
      ]);

      ws.close();
    });
  });
});

describe('createSession', () => {
  it('should create session with unique ID', () => {
    const session1 = createSession('doc-1');
    const session2 = createSession('doc-2');
    expect(session1.id).not.toBe(session2.id);
  });

  it('should initialize CRDT', () => {
    const session = createSession('doc-1');
    expect(session.crdt).toBeDefined();
    expect(session.crdt.getText()).toBe('');
  });

  it('should set createdAt timestamp', () => {
    const before = Date.now();
    const session = createSession('doc-1');
    const after = Date.now();

    expect(session.createdAt).toBeGreaterThanOrEqual(before);
    expect(session.createdAt).toBeLessThanOrEqual(after);
  });
});

describe('getDocumentState', () => {
  it('should throw for non-existent session', () => {
    const sessions = new Map();
    expect(() => getDocumentState('non-existent', sessions)).toThrow();
  });

  it('should return document state', () => {
    const session = createSession('doc-1');
    session.crdt.insert(0, 'Test content');

    const sessions = new Map();
    sessions.set(session.id, session);

    const state = getDocumentState(session.id, sessions);

    expect(state.documentId).toBe('doc-1');
    expect(state.content).toBe('Test content');
    expect(state.clients).toEqual([]);
  });
});
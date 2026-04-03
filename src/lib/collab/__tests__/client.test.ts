/**
 * Unit tests for Collab Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CollabClient, CollabConnection, joinSession } from '../client/client';
import { WebSocket, WebSocketServer } from 'ws';

describe('CollabClient', () => {
  let client: CollabClient;
  let server: WebSocketServer;
  const port = 10001;
  const serverUrl = `ws://localhost:${port}`;

  beforeEach(async () => {
    server = new WebSocketServer({ port });

    // Mock server that echoes messages
    server.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          ws.send(JSON.stringify({
            type: 'sync',
            sessionId: message.sessionId,
            data: {
              documentId: 'doc-123',
              content: '',
              crdtState: null,
              clients: [{
                id: 'client-123',
                userId: 'user-123',
                name: 'Test User',
                color: '#FF6B6B',
              }],
              vectorClock: [],
            },
            timestamp: Date.now(),
          }));
        }
      });
    });

    client = new CollabClient({
      url: serverUrl,
      userId: 'user-123',
      userName: 'Test User',
      reconnect: false,
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    client.leaveSession();
    server.close();
  });

  describe('joinSession', () => {
    it('should connect to session', async () => {
      await client.joinSession('session-123');

      const status = client.getStatus();
      expect(status.connected).toBe(true);
      expect(status.sessionId).toBe('session-123');
    });

    it('should emit connected event', async () => {
      const handler = vi.fn();
      client.on('connected', handler);

      await client.joinSession('session-123');

      expect(handler).toHaveBeenCalledWith('session-123');
    });
  });

  describe('leaveSession', () => {
    it('should disconnect from session', async () => {
      await client.joinSession('session-123');
      client.leaveSession();

      const status = client.getStatus();
      expect(status.connected).toBe(false);
    });

    it('should emit left event', async () => {
      const handler = vi.fn();
      client.on('left', handler);

      await client.joinSession('session-123');
      client.leaveSession();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('should return connection status', async () => {
      let status = client.getStatus();
      expect(status.connected).toBe(false);

      await client.joinSession('session-123');

      status = client.getStatus();
      expect(status.connected).toBe(true);
    });
  });
});

describe('CollabConnection', () => {
  let connection: CollabConnection;
  let client: CollabClient;
  let server: WebSocketServer;
  const port = 10002;
  const serverUrl = `ws://localhost:${port}`;

  beforeEach(async () => {
    server = new WebSocketServer({ port });

    server.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'sync',
              sessionId: message.sessionId,
              data: {
                documentId: 'doc-123',
                content: '',
                crdtState: null,
                clients: [],
                vectorClock: [],
              },
              timestamp: Date.now(),
            }));
          }, 50);
        }
      });
    });

    client = new CollabClient({
      url: serverUrl,
      userId: 'user-123',
      reconnect: false,
    });

    await client.joinSession('session-123');
    
    // Wait for sync
    await new Promise<void>((resolve) => {
      const handler = () => {
        client.off('sync', handler);
        resolve();
      };
      client.on('sync', handler);
      
      // Timeout after 1 second
      setTimeout(() => {
        client.off('sync', handler);
        resolve();
      }, 1000);
    });
    
    connection = new CollabConnection(client);
  });

  afterEach(() => {
    connection.leave();
    server.close();
  });

  it('should provide content', () => {
    const content = connection.getContent();
    expect(typeof content).toBe('string');
  });

  it('should provide users', () => {
    const users = connection.getUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  it('should support subscriptions', () => {
    const handler = vi.fn();
    const unsubscribe = connection.onContentChange(handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

describe('joinSession factory', () => {
  let server: WebSocketServer;
  const port = 10003;
  const serverUrl = `ws://localhost:${port}`;

  beforeEach(async () => {
    server = new WebSocketServer({ port });

    server.on('connection', (ws) => {
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'sync',
              sessionId: message.sessionId,
              data: {
                documentId: 'doc-123',
                content: '',
                crdtState: null,
                clients: [],
                vectorClock: [],
              },
              timestamp: Date.now(),
            }));
          }, 50);
        }
      });
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(() => {
    server.close();
  });

  it('should create connection using factory', async () => {
    const connection = await joinSession('session-123', {
      url: serverUrl,
      userId: 'user-123',
      reconnect: false,
    });

    expect(connection).toBeInstanceOf(CollabConnection);

    connection.leave();
  });
});
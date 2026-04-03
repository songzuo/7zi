/**
 * A2A Protocol Tests
 */

import { A2AClient } from './A2AClient';
import { A2AServer } from './A2AServer';
import { A2AMessage } from './A2ATypes';

describe('A2A Protocol', () => {
  describe('A2AClient', () => {
    let client: A2AClient;

    beforeEach(() => {
      client = new A2AClient('test-agent');
    });

    afterEach(async () => {
      await client.disconnect();
    });

    test('should create client with agent ID', () => {
      expect(client).toBeDefined();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(false);
    });

    test('should connect successfully', async () => {
      await client.connect();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(true);
      expect(status.connectionId).not.toBeNull();
    });

    test('should disconnect successfully', async () => {
      await client.connect();
      await client.disconnect();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(false);
      expect(status.connectionId).toBeNull();
    });

    test('should send notification message', async () => {
      await client.connect();
      const message = await client.notify('agent-2', { text: 'Hello!' });
      expect(message.id).toBeDefined();
      expect(message.from).toBe('test-agent');
      expect(message.to).toBe('agent-2');
      expect(message.type).toBe('notification');
      expect(message.payload).toEqual({ text: 'Hello!' });
    });

    test('should send request message', async () => {
      await client.connect();
      const messagePromise = client.request('agent-2', { action: 'test' }, { timeout: 100 });
      
      // 快速失败测试（因为没有响应者）
      await expect(messagePromise).rejects.toThrow('timeout');
    });

    test('should queue messages when disconnected', async () => {
      const message = await client.notify('agent-1', { text: 'Queued message' });
      expect(message.id).toBeDefined();
      expect(message.type).toBe('notification');
    });

    test('should emit events', (done) => {
      client.on('connected', (event) => {
        expect(event.type).toBe('connected');
        done();
      });

      client.connect();
    });

    test('should handle received messages', async () => {
      await client.connect();

      return new Promise<void>((resolve) => {
        client.on('message', (message: A2AMessage) => {
          expect(message.to).toBe('test-agent');
          expect(message.payload).toEqual({ test: 'data' });
          resolve();
        });

        client.handleMessage({
          id: 'test-msg-1',
          from: 'other-agent',
          to: 'test-agent',
          type: 'notification',
          timestamp: Date.now(),
          payload: { test: 'data' }
        });
      });
    });

    test('should respond to requests', async () => {
      await client.connect();

      const requestMessage: A2AMessage = {
        id: 'req-1',
        from: 'agent-2',
        to: 'test-agent',
        type: 'request',
        timestamp: Date.now(),
        payload: { question: 'Hello?' }
      };

      const response = await client.respond('agent-2', requestMessage.id, { answer: 'Hi!' });
      expect(response.type).toBe('response');
      expect(response.correlationId).toBe(requestMessage.id);
      expect(response.payload).toEqual({ answer: 'Hi!' });
    });
  });

  describe('A2AServer', () => {
    let server: A2AServer;

    beforeEach(() => {
      server = new A2AServer({ port: 8080, maxConnections: 10 });
    });

    afterEach(async () => {
      await server.stop();
    });

    test('should create server with config', () => {
      expect(server).toBeDefined();
      const status = server.getStatus();
      expect(status.running).toBe(false);
      expect(status.maxConnections).toBe(10);
    });

    test('should start successfully', async () => {
      await server.start();
      const status = server.getStatus();
      expect(status.running).toBe(true);
    });

    test('should stop successfully', async () => {
      await server.start();
      await server.stop();
      const status = server.getStatus();
      expect(status.running).toBe(false);
    });

    test('should register agents', async () => {
      await server.start();
      const connectionId = await server.registerAgent('agent-1', { name: 'Test Agent' });
      expect(connectionId).toBeDefined();
      expect(server.getConnectionCount()).toBe(1);
    });

    test('should reject connections when max reached', async () => {
      const smallServer = new A2AServer({ maxConnections: 1 });
      await smallServer.start();

      await smallServer.registerAgent('agent-a');
      await expect(smallServer.registerAgent('agent-b')).rejects.toThrow('Maximum connections reached');

      await smallServer.stop();
    });

    test('should track agent online status', async () => {
      await server.start();
      await server.registerAgent('agent-1');

      expect(server.isAgentOnline('agent-1')).toBe(true);
      expect(server.isAgentOnline('unknown-agent')).toBe(false);
    });

    test('should disconnect agents', async () => {
      await server.start();
      await server.registerAgent('agent-1');

      expect(server.isAgentOnline('agent-1')).toBe(true);

      await server.disconnectAgent('agent-1');

      expect(server.isAgentOnline('agent-1')).toBe(false);
      expect(server.getConnectionCount()).toBe(0);
    });

    test('should handle heartbeat', async () => {
      await server.start();
      await server.registerAgent('agent-1');

      const message: A2AMessage = {
        id: 'heartbeat-1',
        from: 'agent-1',
        to: '__server__',
        type: 'heartbeat',
        timestamp: Date.now(),
        payload: { timestamp: Date.now() }
      };

      await server.handleMessage(message);
      // 应该不会抛出错误
    });

    test('should emit message events', (done) => {
      server.on('message:received', (message: A2AMessage) => {
        expect(message.from).toBe('agent-1');
        done();
      });

      server.start().then(() => {
        return server.registerAgent('agent-1');
      }).then(() => {
        return server.handleMessage({
          id: 'msg-1',
          from: 'agent-1',
          to: 'agent-2',
          type: 'notification',
          timestamp: Date.now(),
          payload: { text: 'Test' }
        });
      });
    });

    test('should maintain message history', async () => {
      await server.start();
      await server.registerAgent('agent-1');

      await server.handleMessage({
        id: 'msg-history-1',
        from: 'agent-1',
        to: 'agent-2',
        type: 'notification',
        timestamp: Date.now(),
        payload: { text: 'Test 1' }
      });

      await server.handleMessage({
        id: 'msg-history-2',
        from: 'agent-2',
        to: 'agent-1',
        type: 'notification',
        timestamp: Date.now(),
        payload: { text: 'Test 2' }
      });

      const history = server.getMessageHistory();
      expect(history.length).toBe(2);
    });

    test('should send messages from server', async () => {
      await server.start();
      await server.registerAgent('agent-1');

      const message = await server.send('agent-1', { server: 'message' }, 'notification');
      expect(message.id).toBeDefined();
      expect(message.from).toBe('__server__');
      expect(message.to).toBe('agent-1');
    });

    test('should get connections list', async () => {
      await server.start();
      await server.registerAgent('agent-1', { name: 'Agent 1' });
      await server.registerAgent('agent-2', { name: 'Agent 2' });

      const connections = server.getConnections();
      expect(connections.length).toBe(2);
      expect(connections[0].agentId).toBeDefined();
      expect(connections[0].status).toBe('connected');
    });
  });

  describe('Message Flow', () => {
    let server: A2AServer;
    let client1: A2AClient;
    let client2: A2AClient;

    beforeEach(async () => {
      server = new A2AServer();
      client1 = new A2AClient('agent-1');
      client2 = new A2AClient('agent-2');

      await server.start();
      await client1.connect();
      await client2.connect();

      await server.registerAgent('agent-1');
      await server.registerAgent('agent-2');
    });

    afterEach(async () => {
      await client1.disconnect();
      await client2.disconnect();
      await server.stop();
    });

    test('should create message with correct format', async () => {
      const message = await client1.send('agent-2', { data: 'test' }, 'notification');
      
      expect(message.id).toMatch(/^msg_\d+_[a-z0-9]+$/);
      expect(message.from).toBe('agent-1');
      expect(message.to).toBe('agent-2');
      expect(message.type).toBe('notification');
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.payload).toEqual({ data: 'test' });
    });

    test('should handle notification flow', async () => {
      const notification = await client1.notify('agent-2', { alert: 'test' });
      
      expect(notification.type).toBe('notification');
      expect(notification.from).toBe('agent-1');
      expect(notification.to).toBe('agent-2');
    });

    test('should handle response with correlation ID', async () => {
      const response = await client1.respond('agent-2', 'req-123', { result: 'ok' });
      
      expect(response.type).toBe('response');
      expect(response.correlationId).toBe('req-123');
      expect(response.payload).toEqual({ result: 'ok' });
    });

    test('should handle error messages', async () => {
      const errorMsg = await client1.sendError('agent-2', 'req-456', new Error('Test error'));
      
      expect(errorMsg.type).toBe('error');
      expect(errorMsg.correlationId).toBe('req-456');
      expect((errorMsg.payload as any).message).toBe('Test error');
    });
  });

  describe('Connection Management', () => {
    let server: A2AServer;

    beforeEach(async () => {
      server = new A2AServer({ maxConnections: 5 });
      await server.start();
    });

    afterEach(async () => {
      await server.stop();
    });

    test('should track multiple connections', async () => {
      await server.registerAgent('agent-1');
      await server.registerAgent('agent-2');
      await server.registerAgent('agent-3');

      expect(server.getConnectionCount()).toBe(3);
    });

    test('should handle connection metadata', async () => {
      await server.registerAgent('agent-1', { name: 'Test Agent', version: '1.0' });
      
      const connections = server.getConnections();
      expect(connections[0].metadata).toEqual({ name: 'Test Agent', version: '1.0' });
    });

    test('should handle duplicate registration', async () => {
      await server.registerAgent('agent-1');
      
      // 注册相同的 agentId 应该替换旧的连接
      await server.registerAgent('agent-1');
      
      expect(server.getConnectionCount()).toBe(1);
    });
  });
});

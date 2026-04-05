/**
 * A2A Client Tests
 */

import { A2AClient } from './A2AClient';
import { A2AMessage } from './A2ATypes';

describe('A2AClient', () => {
  let client: A2AClient;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('构造函数', () => {
    test('应该创建客户端实例', () => {
      client = new A2AClient('test-agent');
      expect(client).toBeDefined();
    });

    test('应该接受配置选项', () => {
      client = new A2AClient('test-agent', {
        serverUrl: 'localhost:9090',
        reconnectInterval: 3000,
        heartbeatInterval: 15000,
        autoReconnect: false,
      });
      expect(client).toBeDefined();
    });

    test('应该使用默认配置', () => {
      client = new A2AClient('test-agent');
      // 配置应该已应用默认值
      expect(client).toBeDefined();
    });
  });

  describe('连接管理', () => {
    test('应该能够连接', async () => {
      client = new A2AClient('test-agent');
      await client.connect();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    test('重复连接应该是幂等的', async () => {
      client = new A2AClient('test-agent');
      await client.connect();
      await client.connect(); // 第二次调用
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    test('应该能够断开连接', async () => {
      client = new A2AClient('test-agent');
      await client.connect();
      await client.disconnect();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(false);
    });

    test('重复断开应该是幂等的', async () => {
      client = new A2AClient('test-agent');
      await client.connect();
      await client.disconnect();
      await client.disconnect(); // 第二次调用
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('消息发送', () => {
    beforeEach(async () => {
      client = new A2AClient('test-agent');
      await client.connect();
    });

    test('应该能够发送通知消息', async () => {
      const message = await client.notify('target-agent', { data: 'test' });
      expect(message).toBeDefined();
      expect(message.from).toBe('test-agent');
      expect(message.to).toBe('target-agent');
      expect(message.type).toBe('notification');
    });

    test('应该能够发送消息（指定类型）', async () => {
      const message = await client.send('target-agent', { data: 'test' }, 'notification');
      expect(message.type).toBe('notification');
    });

    test('未连接时消息应该入队', async () => {
      client = new A2AClient('test-agent');
      // 不连接
      const message = await client.notify('target-agent', { data: 'test' });
      expect(message).toBeDefined();
    });
  });

  describe('请求-响应', () => {
    beforeEach(async () => {
      client = new A2AClient('test-agent');
      await client.connect();
    });

    test('应该能够发送请求', async () => {
      const requestPromise = client.request('target-agent', { data: 'test' }, { timeout: 1000 });

      // 模拟响应
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pending = (client as any).pendingRequests;
        const requestId = pending.keys().next().value;
        if (requestId) {
          client.handleMessage({
            id: 'response-id',
            from: 'target-agent',
            to: 'test-agent',
            type: 'response',
            timestamp: Date.now(),
            payload: { result: 'success' },
            correlationId: requestId,
          });
        }
      }, 10);

      const result = await requestPromise;
      expect(result).toEqual({ result: 'success' });
    });

    test('请求超时应该抛出错误', async () => {
      await expect(
        client.request('target-agent', { data: 'test' }, { timeout: 100 })
      ).rejects.toThrow('timeout');
    });
  });

  describe('消息处理', () => {
    beforeEach(async () => {
      client = new A2AClient('test-agent');
      await client.connect();
    });

    test('应该能够处理心跳消息', async () => {
      const heartbeatHandler = jest.fn();
      client.on('heartbeat', heartbeatHandler);

      await client.handleMessage({
        id: 'heartbeat-id',
        from: 'server',
        to: 'test-agent',
        type: 'heartbeat',
        timestamp: Date.now(),
        payload: {},
      });

      expect(heartbeatHandler).toHaveBeenCalled();
    });

    test('应该能够处理响应消息', async () => {
      const requestId = 'request-123';
      const responsePayload = { result: 'ok' };

      // 设置一个待处理的请求
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).pendingRequests.set(requestId, {
        resolve: jest.fn(),
        reject: jest.fn(),
        timeout: setTimeout(() => {}, 10000),
      });

      await client.handleMessage({
        id: 'response-id',
        from: 'server',
        to: 'test-agent',
        type: 'response',
        timestamp: Date.now(),
        payload: responsePayload,
        correlationId: requestId,
      });

      // 验证请求已被移除
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).pendingRequests.has(requestId)).toBe(false);
    });

    test('应该能够处理错误消息', async () => {
      const requestId = 'request-123';

      const rejectFn = jest.fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (client as any).pendingRequests.set(requestId, {
        resolve: jest.fn(),
        reject: rejectFn,
        timeout: setTimeout(() => {}, 10000),
      });

      await client.handleMessage({
        id: 'error-id',
        from: 'server',
        to: 'test-agent',
        type: 'error',
        timestamp: Date.now(),
        payload: { message: 'Something went wrong' },
        correlationId: requestId,
      });

      expect(rejectFn).toHaveBeenCalled();
    });
  });

  describe('事件', () => {
    test('连接时应该发送 connected 事件', async () => {
      client = new A2AClient('test-agent');
      const handler = jest.fn();
      client.on('connected', handler);

      await client.connect();
      expect(handler).toHaveBeenCalled();
    });

    test('断开时应该发送 disconnected 事件', async () => {
      client = new A2AClient('test-agent');
      await client.connect();

      const handler = jest.fn();
      client.on('disconnected', handler);

      await client.disconnect();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('状态查询', () => {
    test('getConnectionStatus 应该返回连接状态', () => {
      client = new A2AClient('test-agent');
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(false);
    });

    test('连接后应该返回 true', async () => {
      client = new A2AClient('test-agent');
      await client.connect();
      const status = client.getConnectionStatus();
      expect(status.connected).toBe(true);
    });

    test('getPendingRequestCount 应该返回待处理请求数', () => {
      client = new A2AClient('test-agent');
      const count = client.getPendingRequestCount();
      expect(typeof count).toBe('number');
    });
  });
});

/**
 * A2A Server Tests
 */

import { A2AServer } from './A2AServer';
import { A2AMessage } from './A2ATypes';

describe('A2AServer', () => {
  let server: A2AServer;

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('构造函数', () => {
    test('应该创建服务器实例', () => {
      server = new A2AServer();
      expect(server).toBeDefined();
    });

    test('应该接受配置选项', () => {
      server = new A2AServer({
        port: 9090,
        host: '0.0.0.0',
        heartbeatInterval: 15000,
        maxConnections: 50,
      });
      expect(server).toBeDefined();
    });

    test('应该使用默认配置', () => {
      server = new A2AServer();
      expect(server).toBeDefined();
    });
  });

  describe('启动和停止', () => {
    test('应该能够启动服务器', async () => {
      server = new A2AServer();
      await server.start();
      const status = server.getStatus();
      expect(status.running).toBe(true);
    });

    test('重复启动应该是幂等的', async () => {
      server = new A2AServer();
      await server.start();
      await server.start(); // 第二次调用
      const status = server.getStatus();
      expect(status.running).toBe(true);
    });

    test('应该能够停止服务器', async () => {
      server = new A2AServer();
      await server.start();
      await server.stop();
      const status = server.getStatus();
      expect(status.running).toBe(false);
    });

    test('重复停止应该是幂等的', async () => {
      server = new A2AServer();
      await server.start();
      await server.stop();
      await server.stop(); // 第二次调用
      const status = server.getStatus();
      expect(status.running).toBe(false);
    });
  });

  describe('代理注册', () => {
    beforeEach(async () => {
      server = new A2AServer();
      await server.start();
    });

    test('应该能够注册代理', async () => {
      const connectionId = await server.registerAgent('test-agent');
      expect(connectionId).toBeDefined();
      expect(typeof connectionId).toBe('string');
    });

    test('应该能够注册带元数据的代理', async () => {
      const connectionId = await server.registerAgent('test-agent', {
        version: '1.0.0',
        region: 'us-east-1',
      });
      expect(connectionId).toBeDefined();
    });

    test('应该拒绝超过最大连接数', async () => {
      server = new A2AServer({ maxConnections: 2 });
      await server.start();

      await server.registerAgent('agent1');
      await server.registerAgent('agent2');

      await expect(server.registerAgent('agent3')).rejects.toThrow('Maximum connections');
    });

    test('应该能够断开代理', async () => {
      await server.registerAgent('test-agent');
      await server.disconnectAgent('test-agent');

      const isOnline = server.isAgentOnline('test-agent');
      expect(isOnline).toBe(false);
    });
  });

  describe('消息处理', () => {
    beforeEach(async () => {
      server = new A2AServer();
      await server.start();
    });

    test('应该能够处理消息', async () => {
      await server.registerAgent('sender');
      await server.registerAgent('receiver');

      const message: A2AMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'receiver',
        type: 'notification',
        timestamp: Date.now(),
        payload: { data: 'test' },
      };

      await server.handleMessage(message);
      // 消息应该被处理
    });

    test('应该记录消息历史', async () => {
      await server.registerAgent('sender');
      await server.registerAgent('receiver');

      const message: A2AMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'receiver',
        type: 'notification',
        timestamp: Date.now(),
        payload: { data: 'test' },
      };

      await server.handleMessage(message);
      const history = server.getMessageHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('连接状态', () => {
    beforeEach(async () => {
      server = new A2AServer();
      await server.start();
    });

    test('getConnections 应该返回连接列表', async () => {
      await server.registerAgent('agent1');
      await server.registerAgent('agent2');

      const connections = server.getConnections();
      expect(connections.length).toBe(2);
    });

    test('getConnectionCount 应该返回连接数', async () => {
      await server.registerAgent('agent1');
      await server.registerAgent('agent2');

      const count = server.getConnectionCount();
      expect(count).toBe(2);
    });

    test('isAgentOnline 应该返回在线状态', async () => {
      await server.registerAgent('agent1');

      expect(server.isAgentOnline('agent1')).toBe(true);
      expect(server.isAgentOnline('unknown')).toBe(false);
    });
  });

  describe('事件', () => {
    test('启动时应该发送 connected 事件', async () => {
      server = new A2AServer();
      const handler = jest.fn();
      server.on('connected', handler);

      await server.start();
      expect(handler).toHaveBeenCalled();
    });

    test('停止时应该发送 disconnected 事件', async () => {
      server = new A2AServer();
      await server.start();

      const handler = jest.fn();
      server.on('disconnected', handler);

      await server.stop();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('状态查询', () => {
    test('getStatus 应该返回运行状态', () => {
      server = new A2AServer();
      const status = server.getStatus();
      expect(status.running).toBe(false);
    });

    test('启动后应该返回 true', async () => {
      server = new A2AServer();
      await server.start();
      const status = server.getStatus();
      expect(status.running).toBe(true);
    });

    test('getMessageHistory 应该返回消息历史', async () => {
      server = new A2AServer();
      await server.start();
      const history = server.getMessageHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });
});

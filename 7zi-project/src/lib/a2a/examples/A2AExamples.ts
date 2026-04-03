/**
 * A2A Protocol Usage Examples
 */

import { A2AClient } from '../A2AClient';
import { A2AServer } from '../A2AServer';
import { A2AMessage } from '../A2ATypes';

/**
 * Example 1: Basic Client-Server Setup
 */
export async function example1_basicSetup() {
  console.log('=== Example 1: Basic Client-Server Setup ===\n');

  // 创建服务器
  const server = new A2AServer({
    port: 8080,
    host: 'localhost',
    heartbeatInterval: 30000,
    maxConnections: 10
  });

  // 启动服务器
  await server.start();
  console.log('✓ Server started');

  // 创建客户端
  const client1 = new A2AClient('agent-1', {
    serverUrl: 'localhost:8080',
    autoReconnect: true
  });

  const client2 = new A2AClient('agent-2', {
    serverUrl: 'localhost:8080',
    autoReconnect: true
  });

  // 连接客户端
  await client1.connect();
  await client2.connect();
  console.log('✓ Clients connected');

  // 注册代理到服务器
  await server.registerAgent('agent-1', { name: 'Agent 1' });
  await server.registerAgent('agent-2', { name: 'Agent 2' });
  console.log('✓ Agents registered');

  // 检查服务器状态
  const status = server.getStatus();
  console.log(`Server status: ${JSON.stringify(status, null, 2)}`);

  // 清理
  await client1.disconnect();
  await client2.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Example 2: Sending Notifications
 */
export async function example2_notifications() {
  console.log('=== Example 2: Sending Notifications ===\n');

  const server = new A2AServer();
  const client1 = new A2AClient('agent-1');
  const client2 = new A2AClient('agent-2');

  await server.start();
  await client1.connect();
  await client2.connect();

  await server.registerAgent('agent-1');
  await server.registerAgent('agent-2');

  // 设置消息监听器
  client2.on('message', (message: A2AMessage) => {
    console.log(`Agent 2 received: ${JSON.stringify(message.payload)}`);
  });

  // 发送通知
  await client1.notify('agent-2', { text: 'Hello from Agent 1!' });
  console.log('✓ Notification sent');

  // 发送带优先级的通知
  await client1.send('agent-2', { alert: 'High priority message!' }, 'notification', {
    priority: 'high'
  });
  console.log('✓ High priority notification sent');

  await client1.disconnect();
  await client2.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Example 3: Request-Response Pattern
 */
export async function example3_requestResponse() {
  console.log('=== Example 3: Request-Response Pattern ===\n');

  const server = new A2AServer();
  const client1 = new A2AClient('agent-1');
  const client2 = new A2AClient('agent-2');

  await server.start();
  await client1.connect();
  await client2.connect();

  await server.registerAgent('agent-1');
  await server.registerAgent('agent-2');

  // 设置 client2 处理请求
  client2.on('message', async (message: A2AMessage) => {
    if (message.type === 'request') {
      console.log(`Agent 2 received request: ${JSON.stringify(message.payload)}`);

      // 处理请求并发送响应
      const result = {
        status: 'success',
        data: { processed: true, timestamp: Date.now() }
      };

      await client2.respond('agent-1', message.id, result);
      console.log('✓ Response sent');
    }
  });

  // client1 发送请求
  console.log('Agent 1 sending request...');
  const response = await client1.request('agent-2', { action: 'process' }, {
    timeout: 5000
  });

  console.log(`Agent 1 received response: ${JSON.stringify(response)}`);

  await client1.disconnect();
  await client2.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Example 4: Error Handling
 */
export async function example4_errorHandling() {
  console.log('=== Example 4: Error Handling ===\n');

  const server = new A2AServer();
  const client1 = new A2AClient('agent-1');
  const client2 = new A2AClient('agent-2');

  await server.start();
  await client1.connect();
  await client2.connect();

  await server.registerAgent('agent-1');
  await server.registerAgent('agent-2');

  // 设置 client2 返回错误
  client2.on('message', async (message: A2AMessage) => {
    if (message.type === 'request') {
      console.log('Agent 2 received request, returning error...');
      await client2.sendError('agent-1', message.id, new Error('Processing failed'));
    }
  });

  // client1 发送请求并捕获错误
  try {
    await client1.request('agent-2', { action: 'fail' }, { timeout: 5000 });
    console.log('❌ Should have thrown an error');
  } catch (error) {
    console.log(`✓ Error caught: ${(error as Error).message}`);
  }

  await client1.disconnect();
  await client2.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Example 5: Event Handling
 */
export async function example5_eventHandling() {
  console.log('=== Example 5: Event Handling ===\n');

  const server = new A2AServer();
  const client1 = new A2AClient('agent-1');

  await server.start();
  await client1.connect();
  await server.registerAgent('agent-1');

  // 监听客户端事件
  client1.on('connected', (event) => {
    console.log(`Client connected: ${JSON.stringify(event.data)}`);
  });

  client1.on('disconnected', (event) => {
    console.log(`Client disconnected: ${JSON.stringify(event.data)}`);
  });

  client1.on('message', (message: A2AMessage) => {
    console.log(`Client received message: ${message.type}`);
  });

  client1.on('heartbeat', (event) => {
    console.log('Heartbeat received');
  });

  // 监听服务器事件
  server.on('message:received', (message: A2AMessage) => {
    console.log(`Server received message from ${message.from}`);
  });

  server.on('message:forward', (message: A2AMessage) => {
    console.log(`Server forwarding message to ${message.to}`);
  });

  // 发送一些消息触发事件
  await client1.notify('agent-2', { text: 'Test message' });

  await client1.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Example 6: Message History
 */
export async function example6_messageHistory() {
  console.log('=== Example 6: Message History ===\n');

  const server = new A2AServer();
  const client1 = new A2AClient('agent-1');
  const client2 = new A2AClient('agent-2');

  await server.start();
  await client1.connect();
  await client2.connect();

  await server.registerAgent('agent-1');
  await server.registerAgent('agent-2');

  // 发送多条消息
  for (let i = 1; i <= 5; i++) {
    await client1.notify('agent-2', { message: `Message ${i}` });
  }

  // 获取消息历史
  const history = server.getMessageHistory();
  console.log(`Total messages in history: ${history.length}`);

  // 获取最近 3 条消息
  const recent = server.getMessageHistory(3);
  console.log(`Recent 3 messages:`);
  recent.forEach((msg, index) => {
    console.log(`  ${index + 1}. ${msg.id}: ${JSON.stringify(msg.payload)}`);
  });

  await client1.disconnect();
  await client2.disconnect();
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Example 7: Connection Management
 */
export async function example7_connectionManagement() {
  console.log('=== Example 7: Connection Management ===\n');

  const server = new A2AServer({ maxConnections: 5 });
  const clients: A2AClient[] = [];

  await server.start();

  // 创建多个客户端
  for (let i = 1; i <= 3; i++) {
    const client = new A2AClient(`agent-${i}`);
    await client.connect();
    await server.registerAgent(`agent-${i}`);
    clients.push(client);
  }

  console.log(`Connected agents: ${server.getConnectionCount()}`);

  // 检查代理在线状态
  console.log(`Agent 1 online: ${server.isAgentOnline('agent-1')}`);
  console.log(`Agent 99 online: ${server.isAgentOnline('agent-99')}`);

  // 获取连接列表
  const connections = server.getConnections();
  console.log('Connections:');
  connections.forEach((conn) => {
    console.log(`  - ${conn.agentId} (${conn.status})`);
  });

  // 断开一个代理
  await server.disconnectAgent('agent-1');
  console.log(`After disconnect: ${server.getConnectionCount()} agents`);

  // 清理
  for (const client of clients) {
    await client.disconnect();
  }
  await server.stop();
  console.log('✓ Cleanup complete\n');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running A2A Protocol Examples\n');

  try {
    await example1_basicSetup();
    await example2_notifications();
    await example3_requestResponse();
    await example4_errorHandling();
    await example5_eventHandling();
    await example6_messageHistory();
    await example7_connectionManagement();

    console.log('✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
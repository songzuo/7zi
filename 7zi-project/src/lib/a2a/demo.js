#!/usr/bin/env node
/**
 * A2A Protocol Demo Script
 * 快速演示 A2A 协议的基本功能
 */

const { A2AClient, A2AServer } = require('./dist/lib/a2a');

async function runDemo() {
  console.log('🚀 A2A Protocol Demo\n');
  console.log('════════════════════════════════════════\n');

  // 1. 创建并启动服务器
  console.log('1️⃣  Starting A2A Server...');
  const server = new A2AServer({
    port: 8080,
    maxConnections: 10
  });

  await server.start();
  console.log('   ✓ Server started on port 8080\n');

  // 2. 创建客户端
  console.log('2️⃣  Creating clients...');
  const alice = new A2AClient('alice');
  const bob = new A2AClient('bob');

  await alice.connect();
  await bob.connect();
  console.log('   ✓ Alice connected');
  console.log('   ✓ Bob connected\n');

  // 3. 注册代理到服务器
  console.log('3️⃣  Registering agents...');
  await server.registerAgent('alice', { name: 'Alice', role: 'user' });
  await server.registerAgent('bob', { name: 'Bob', role: 'assistant' });
  console.log('   ✓ Alice registered');
  console.log('   ✓ Bob registered\n');

  // 4. 显示服务器状态
  console.log('4️⃣  Server status:');
  const status = server.getStatus();
  console.log(`   - Running: ${status.running}`);
  console.log(`   - Connections: ${status.connections}/${status.maxConnections}\n`);

  // 5. Bob 监听消息
  console.log('5️⃣  Setting up Bob to handle messages...');
  bob.on('message', async (message) => {
    console.log(`\n   📩 Bob received message from ${message.from}:`);
    console.log(`      Type: ${message.type}`);
    console.log(`      Payload: ${JSON.stringify(message.payload)}`);

    // 如果是请求，发送响应
    if (message.type === 'request') {
      console.log('\n   💬 Bob sending response...');
      await bob.respond('alice', message.id, {
        result: 'success',
        message: 'Hello Alice! I received your message.',
        timestamp: Date.now()
      });
      console.log('   ✓ Response sent');
    }
  });

  // 6. Alice 发送通知
  console.log('6️⃣  Alice sending notification to Bob...');
  await alice.notify('bob', {
    greeting: 'Hello Bob!',
    timestamp: Date.now()
  });
  console.log('   ✓ Notification sent');

  // 等待处理
  await new Promise(resolve => setTimeout(resolve, 500));

  // 7. Alice 发送请求
  console.log('\n7️⃣  Alice sending request to Bob...');
  const response = await alice.request('bob', {
    question: 'How are you today?'
  }, {
    timeout: 5000
  });
  console.log('\n   📬 Alice received response:');
  console.log(`      ${JSON.stringify(response, null, 2)}`);

  // 8. 查看消息历史
  console.log('\n8️⃣  Message history:');
  const history = server.getMessageHistory();
  console.log(`   Total messages: ${history.length}`);
  history.forEach((msg, index) => {
    console.log(`   ${index + 1}. ${msg.from} → ${msg.to}: ${msg.type}`);
  });

  // 9. 检查连接状态
  console.log('\n9️⃣  Connection status:');
  console.log(`   Alice online: ${server.isAgentOnline('alice')}`);
  console.log(`   Bob online: ${server.isAgentOnline('bob')}`);
  console.log(`   Charlie online: ${server.isAgentOnline('charlie')}`);

  // 10. 清理
  console.log('\n🔟 Cleaning up...');
  await alice.disconnect();
  await bob.disconnect();
  await server.stop();
  console.log('   ✓ All connections closed');
  console.log('   ✓ Server stopped\n');

  console.log('════════════════════════════════════════');
  console.log('✅ Demo completed successfully!\n');
}

// 运行演示
runDemo().catch((error) => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});

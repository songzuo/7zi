/**
 * WebSocket 服务器启动脚本
 * 
 * 独立运行的实时协作服务器
 */

import { createServer } from 'http';
import { notificationServer } from './server';

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3001;
const HOST = process.env.WS_HOST || '0.0.0.0';

// 创建 HTTP 服务器
const httpServer = createServer((req, res) => {
  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      connections: notificationServer.getConnectionCount(),
      onlineUsers: notificationServer.getOnlineUsers(),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // 广播消息端点（需要认证）
  if (req.url === '/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // 简单的 API Key 验证
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== process.env.WS_API_KEY && process.env.NODE_ENV === 'production') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // 发送系统公告
        if (data.type === 'announcement') {
          notificationServer.sendSystemAnnouncement({
            title: data.title,
            content: data.content,
            level: data.level || 'info',
            actionUrl: data.actionUrl,
            actionText: data.actionText,
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 默认响应
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    name: 'AI Team Dashboard WebSocket Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      broadcast: '/broadcast (POST)',
    },
  }));
});

// 初始化 WebSocket 服务器
notificationServer.initialize(httpServer);

// 启动服务器
httpServer.listen(PORT, HOST, () => {
  console.log(`[WebSocket Server] Running on http://${HOST}:${PORT}`);
  console.log(`[WebSocket Server] Health check: http://${HOST}:${PORT}/health`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[WebSocket Server] SIGTERM received, shutting down...');
  notificationServer.close();
  httpServer.close(() => {
    console.log('[WebSocket Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[WebSocket Server] SIGINT received, shutting down...');
  notificationServer.close();
  httpServer.close(() => {
    console.log('[WebSocket Server] Server closed');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('[WebSocket Server] Uncaught exception:', error);
  notificationServer.close();
  httpServer.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[WebSocket Server] Unhandled rejection:', reason);
});
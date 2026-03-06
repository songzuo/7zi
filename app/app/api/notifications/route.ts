/**
 * WebSocket 连接入口 API
 * 
 * 处理 WebSocket 升级请求
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { notificationServer } from '@/lib/realtime/server';

// Next.js API 路由不支持 WebSocket 升级
// 这个文件提供 REST API 接口来获取 WebSocket 状态

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // 返回 WebSocket 服务状态
    return res.status(200).json({
      status: 'available',
      endpoint: process.env.WEBSOCKET_URL || '/api/ws',
      onlineUsers: notificationServer.getOnlineUsers(),
      connectionCount: notificationServer.getConnectionCount(),
    });
  }

  if (req.method === 'POST') {
    // 发送系统公告（需要管理员权限）
    const { title, content, level = 'info', actionUrl, actionText } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Missing title or content' });
    }

    notificationServer.sendSystemAnnouncement({
      title,
      content,
      level,
      actionUrl,
      actionText,
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
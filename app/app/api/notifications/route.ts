/**
 * 通知服务 REST API
 * 
 * 提供通知服务状态查询和系统公告发送功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationServer } from '@/lib/realtime/server';

export async function GET(request: NextRequest) {
  try {
    // 返回 WebSocket 服务状态
    return NextResponse.json({
      status: 'available',
      endpoint: process.env.WEBSOCKET_URL || '/api/ws',
      onlineUsers: notificationServer.getOnlineUsers(),
      connectionCount: notificationServer.getConnectionCount(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get notification status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, level = 'info', actionUrl, actionText } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing title or content' },
        { status: 400 }
      );
    }

    notificationServer.sendSystemAnnouncement({
      title,
      content,
      level,
      actionUrl,
      actionText,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send announcement' },
      { status: 500 }
    );
  }
}
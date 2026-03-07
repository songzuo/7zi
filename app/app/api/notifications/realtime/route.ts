/**
 * 实时通知 API - WebSocket 状态和管理
 * 
 * GET: 获取在线用户和连接状态
 * POST: 发送通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationServer } from '@/lib/realtime/server';
import { notificationService } from '@/lib/realtime/notification-service';

/**
 * GET /api/notifications/realtime
 * 获取实时通知状态
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  switch (action) {
    case 'status':
      return NextResponse.json({
        success: true,
        data: {
          connections: notificationServer.getConnectionCount(),
          onlineUsers: notificationServer.getOnlineUsers(),
          serverTime: new Date().toISOString(),
        },
      });

    case 'online':
      return NextResponse.json({
        success: true,
        data: {
          onlineUsers: notificationServer.getOnlineUsers(),
          count: notificationServer.getConnectionCount(),
        },
      });

    case 'check_user':
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json(
          { success: false, error: '缺少 userId 参数' },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        data: {
          userId,
          isOnline: notificationServer.isUserOnline(userId),
        },
      });

    default:
      return NextResponse.json({
        success: true,
        data: {
          connections: notificationServer.getConnectionCount(),
          onlineUsers: notificationServer.getOnlineUsers(),
          features: [
            'task_notifications',
            'member_status',
            'system_announcements',
            'project_updates',
            'browser_notifications',
          ],
        },
      });
  }
}

/**
 * POST /api/notifications/realtime
 * 发送实时通知
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, target } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: '缺少通知类型' },
        { status: 400 }
      );
    }

    let sent = 0;

    switch (type) {
      case 'task_status_change':
        notificationService.notifyTaskStatusChange(payload);
        sent = 1;
        break;

      case 'task_assignment':
        notificationService.notifyTaskAssignment(payload);
        sent = 1;
        break;

      case 'task_comment':
        notificationService.notifyTaskComment(payload);
        sent = 1;
        break;

      case 'member_status':
        notificationService.notifyMemberStatus(payload);
        sent = 1;
        break;

      case 'system_announcement':
        notificationService.broadcastSystemAnnouncement(payload);
        sent = notificationServer.getConnectionCount();
        break;

      case 'project_update':
        notificationService.notifyProjectUpdate(payload);
        sent = 1;
        break;

      case 'custom':
        notificationService.sendCustomNotification(payload);
        sent = target?.userIds?.length || notificationServer.getConnectionCount();
        break;

      default:
        return NextResponse.json(
          { success: false, error: '未知的通知类型' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        sent,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[API] Realtime notification error:', error);
    return NextResponse.json(
      { success: false, error: '发送通知失败' },
      { status: 500 }
    );
  }
}
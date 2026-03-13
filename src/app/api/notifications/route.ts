/**
 * 通知管理 API
 * 提供通知的 CRUD 操作
 * 
 * @module api/notifications
 * @description 通知管理端点，支持获取、创建、更新和删除通知
 * 
 * @example
 * // 获取通知列表
 * GET /api/notifications?userId=user-001&read=false
 * 
 * // 创建新通知
 * POST /api/notifications
 * {
 *   "type": "task_assigned",
 *   "title": "新任务分配",
 *   "message": "您被分配了新任务",
 *   "userId": "user-001"
 * }
 * 
 * // 标记为已读
 * PUT /api/notifications/notif-001
 * {
 *   "read": true
 * }
 * 
 * // 删除通知
 * DELETE /api/notifications/notif-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { Notification, NotificationType } from '@/lib/types/notification-types';
import { NotificationService } from '@/lib/services/notification-service';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';

/**
 * 获取当前用户ID
 * 从认证token中提取用户ID
 */
async function getCurrentUserId(request: NextRequest): Promise<string> {
  const token = extractToken(request);
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      return payload.sub;
    }
  }
  return 'anonymous';
}

// ============================================
// GET /api/notifications - 获取通知列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 查询参数
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') as NotificationType | null;
    const read = searchParams.get('read');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // 如果没有提供userId，尝试从token获取
    const currentUserId = userId || await getCurrentUserId(request);

    const result = NotificationService.getNotifications({
      userId: currentUserId,
      type: type || undefined,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error('Error fetching notifications', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/notifications - 创建通知
// ============================================

export async function POST(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查
    const token = extractToken(request);
    let userId = 'anonymous';
    let userRole = 'user';
    
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        userId = payload.sub;
        userRole = payload.role;
      }
    }

    const body = await request.json();
    
    // 输入验证
    if (!body.type || !['task_assigned', 'project_update', 'mention', 'system_alert'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be one of: task_assigned, project_update, mention, system_alert' },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Notification title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Notification message is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required and must be a string' },
        { status: 400 }
      );
    }

    const newNotification = NotificationService.createNotification({
      type: body.type,
      title: body.title,
      message: body.message,
      userId: body.userId,
      priority: body.priority,
      link: body.link,
      metadata: body.metadata,
    });

    apiLogger.audit('Notification created via API', {
      notificationId: newNotification.id,
      type: newNotification.type,
      createdBy: userId,
      userRole,
    });

    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    apiLogger.error('Error creating notification', error);
    return NextResponse.json(
      { error: 'Failed to create notification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

// ============================================
// PUT /api/notifications - 标记通知为已读
// ============================================

export async function PUT(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查
    const token = extractToken(request);
    let userId = 'anonymous';
    
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        userId = payload.sub;
      }
    }

    const body = await request.json();
    const { id, read, markAllRead } = body;

    // 标记全部已读
    if (markAllRead) {
      const count = NotificationService.markAllAsRead(userId);
      return NextResponse.json({
        success: true,
        message: `${count} notifications marked as read`,
        count,
      });
    }

    // 单个通知操作需要ID
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // 检查通知是否存在
    const existingNotification = NotificationService.getNotification(id);
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // 验证权限 (只能操作自己的通知，除非是管理员)
    if (existingNotification.userId !== userId) {
      const payload = token ? await verifyToken(token) : null;
      if (!payload || !isAdmin(payload)) {
        return NextResponse.json(
          { error: 'You do not have permission to update this notification' },
          { status: 403 }
        );
      }
    }

    const updatedNotification = NotificationService.markAsRead(id);

    apiLogger.audit('Notification marked as read', {
      notificationId: id,
      updatedBy: userId,
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    apiLogger.error('Error updating notification', error);
    return NextResponse.json(
      { error: 'Failed to update notification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

// ============================================
// DELETE /api/notifications - 删除通知
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查
    const token = extractToken(request);
    let userId = 'anonymous';
    
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        userId = payload.sub;
      }
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    // 删除用户所有通知
    if (deleteAll) {
      const count = NotificationService.deleteAllUserNotifications(userId);
      return NextResponse.json({
        success: true,
        message: `${count} notifications deleted`,
        count,
      });
    }

    // 单个删除需要ID
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // 检查通知是否存在
    const existingNotification = NotificationService.getNotification(id);
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // 验证权限 (只能删除自己的通知，除非是管理员)
    if (existingNotification.userId !== userId) {
      const payload = token ? await verifyToken(token) : null;
      if (!payload || !isAdmin(payload)) {
        return NextResponse.json(
          { error: 'You do not have permission to delete this notification' },
          { status: 403 }
        );
      }
    }

    const deleted = NotificationService.deleteNotification(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    apiLogger.audit('Notification deleted', {
      notificationId: id,
      deletedBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    apiLogger.error('Error deleting notification', error);
    return NextResponse.json(
      { error: 'Failed to delete notification', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

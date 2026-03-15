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
import {
  withErrorHandler,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  serverError,
  successResponse,
} from '@/lib/middleware';

// 模块级别创建 CSRF 中间件（复用实例）
const csrfMiddleware = createCsrfMiddleware();

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

export const GET = withErrorHandler(async (request: NextRequest) => {
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

  return successResponse(result);
});

// ============================================
// POST /api/notifications - 创建通知
// ============================================

export const POST = withErrorHandler(async (request: NextRequest) => {
  // CSRF 保护检查
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
    return validationError('Invalid notification type. Must be one of: task_assigned, project_update, mention, system_alert', 'type', request);
  }

  if (!body.title || typeof body.title !== 'string') {
    return validationError('Notification title is required and must be a string', 'title', request);
  }

  if (!body.message || typeof body.message !== 'string') {
    return validationError('Notification message is required and must be a string', 'message', request);
  }

  if (!body.userId || typeof body.userId !== 'string') {
    return validationError('User ID is required and must be a string', 'userId', request);
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
});

// ============================================
// PUT /api/notifications - 标记通知为已读
// ============================================

export const PUT = withErrorHandler(async (request: NextRequest) => {
  // CSRF 保护检查
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
    return successResponse({
      message: `${count} notifications marked as read`,
      count,
    });
  }

  // 单个通知操作需要ID
  if (!id) {
    return validationError('Notification ID is required', 'id', request);
  }

  // 检查通知是否存在
  const existingNotification = NotificationService.getNotification(id);
  if (!existingNotification) {
    return notFoundError('Notification', id, request);
  }

  // 验证权限 (只能操作自己的通知，除非是管理员)
  if (existingNotification.userId !== userId) {
    const payload = token ? await verifyToken(token) : null;
    if (!payload || !isAdmin(payload)) {
      return forbiddenError('You do not have permission to update this notification', request);
    }
  }

  const updatedNotification = NotificationService.markAsRead(id);

  apiLogger.audit('Notification marked as read', {
    notificationId: id,
    updatedBy: userId,
  });

  return successResponse(updatedNotification);
});

// ============================================
// DELETE /api/notifications - 删除通知
// ============================================

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  // CSRF 保护检查
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
    return successResponse({
      message: `${count} notifications deleted`,
      count,
    });
  }

  // 单个删除需要ID
  if (!id) {
    return validationError('Notification ID is required', 'id', request);
  }

  // 检查通知是否存在
  const existingNotification = NotificationService.getNotification(id);
  if (!existingNotification) {
    return notFoundError('Notification', id, request);
  }

  // 验证权限 (只能删除自己的通知，除非是管理员)
  if (existingNotification.userId !== userId) {
    const payload = token ? await verifyToken(token) : null;
    if (!payload || !isAdmin(payload)) {
      return forbiddenError('You do not have permission to delete this notification', request);
    }
  }

  const deleted = NotificationService.deleteNotification(id);

  if (!deleted) {
    return serverError('Failed to delete notification', request);
  }

  apiLogger.audit('Notification deleted', {
    notificationId: id,
    deletedBy: userId,
  });

  return successResponse({
    message: 'Notification deleted successfully',
  });
});

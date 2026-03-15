/**
 * 通知偏好设置 API
 * 提供用户通知偏好的获取和更新
 * 
 * @module api/notifications/preferences
 * @description 通知偏好设置端点，支持获取和更新偏好
 * 
 * @example
 * // 获取偏好设置
 * GET /api/notifications/preferences?userId=user-001
 * 
 * // 更新偏好设置
 * PUT /api/notifications/preferences
 * {
 *   "email": true,
 *   "push": false,
 *   "slack": true,
 *   "digest": "daily",
 *   "taskAssigned": true,
 *   "taskCompleted": true,
 *   "mentions": true
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import {
  withErrorHandler,
  validationError,
  successResponse,
} from '@/lib/middleware';
import { z } from 'zod';

// 模块级别创建 CSRF 中间件（复用实例）
const csrfMiddleware = createCsrfMiddleware();

/**
 * 摘要频率类型
 */
export type DigestFrequency = 'none' | 'daily' | 'weekly';

/**
 * 通知偏好设置接口
 */
export interface NotificationPreferences {
  userId: string;
  /** 邮件通知 */
  email: boolean;
  /** 推送通知 */
  push: boolean;
  /** Slack 通知 */
  slack: boolean;
  /** 摘要频率 */
  digest: DigestFrequency;
  /** 任务分配通知 */
  taskAssigned: boolean;
  /** 任务完成通知 */
  taskCompleted: boolean;
  /** 提及通知 */
  mentions: boolean;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 更新偏好设置请求体
 */
export interface UpdatePreferencesBody {
  email?: boolean;
  push?: boolean;
  slack?: boolean;
  digest?: DigestFrequency;
  taskAssigned?: boolean;
  taskCompleted?: boolean;
  mentions?: boolean;
}

/**
 * Zod 验证模式 - 更新偏好设置
 */
const updatePreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  slack: z.boolean().optional(),
  digest: z.enum(['none', 'daily', 'weekly']).optional(),
  taskAssigned: z.boolean().optional(),
  taskCompleted: z.boolean().optional(),
  mentions: z.boolean().optional(),
});

/**
 * 默认偏好设置
 */
const defaultPreferences: Omit<NotificationPreferences, 'userId' | 'updatedAt'> = {
  email: true,
  push: true,
  slack: false,
  digest: 'daily',
  taskAssigned: true,
  taskCompleted: true,
  mentions: true,
};

// 模拟用户偏好存储（生产环境应使用数据库）
const userPreferencesStore: Map<string, NotificationPreferences> = new Map();

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

/**
 * 获取用户偏好设置
 */
function getUserPreferences(userId: string): NotificationPreferences {
  const existing = userPreferencesStore.get(userId);
  if (existing) {
    return existing;
  }
  
  // 返回默认偏好设置
  return {
    userId,
    ...defaultPreferences,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 更新用户偏好设置
 */
function updateUserPreferences(
  userId: string,
  updates: UpdatePreferencesBody
): NotificationPreferences {
  const current = getUserPreferences(userId);
  
  const updated: NotificationPreferences = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  userPreferencesStore.set(userId, updated);
  
  return updated;
}

// ============================================
// GET /api/notifications/preferences - 获取用户偏好
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  
  // 优先使用查询参数中的 userId，否则从 token 获取
  const queryUserId = searchParams.get('userId');
  const currentUserId = queryUserId || await getCurrentUserId(request);

  const preferences = getUserPreferences(currentUserId);

  apiLogger.debug('Notification preferences retrieved', {
    userId: currentUserId,
  });

  return successResponse({
    preferences,
  });
});

// ============================================
// PUT /api/notifications/preferences - 更新用户偏好
// ============================================

export const PUT = withErrorHandler(async (request: NextRequest) => {
  // CSRF 保护检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 获取当前用户
  const currentUserId = await getCurrentUserId(request);

  // 解析请求体
  let body: UpdatePreferencesBody;
  try {
    body = await request.json();
  } catch {
    return validationError('Invalid JSON body', 'body', request);
  }

  // 验证请求体
  const validationResult = updatePreferencesSchema.safeParse(body);
  if (!validationResult.success) {
    const zodError = validationResult.error;
    const errors = zodError.issues.map((issue: z.ZodIssue) =>
      `${issue.path.join('.')}: ${issue.message}`
    ).join(', ');
    return validationError(`Validation failed: ${errors}`, 'body', request);
  }

  // 更新偏好设置
  const updatedPreferences = updateUserPreferences(currentUserId, validationResult.data);

  apiLogger.audit('Notification preferences updated', {
    userId: currentUserId,
    changes: validationResult.data,
  });

  return successResponse({
    preferences: updatedPreferences,
    message: 'Notification preferences updated successfully',
  });
});

// ============================================
// POST /api/notifications/preferences/reset - 重置为默认
// ============================================

export const POST = withErrorHandler(async (request: NextRequest) => {
  // CSRF 保护检查
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 获取当前用户
  const currentUserId = await getCurrentUserId(request);

  // 重置为默认偏好设置
  const resetPreferences: NotificationPreferences = {
    userId: currentUserId,
    ...defaultPreferences,
    updatedAt: new Date().toISOString(),
  };

  userPreferencesStore.set(currentUserId, resetPreferences);

  apiLogger.audit('Notification preferences reset to defaults', {
    userId: currentUserId,
  });

  return successResponse({
    preferences: resetPreferences,
    message: 'Notification preferences reset to defaults',
  });
});
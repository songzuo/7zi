/**
 * 项目管理 API - 列表和创建
 * GET /api/projects - 获取项目列表
 * POST /api/projects - 创建项目
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProjectStatus, ProjectPriority } from '@/types/project-types';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import { 
  projects, 
  createProject, 
  getProjectsByStatus,
  getProjectsByPriority
} from '@/lib/data/projects';
import {
  validationError,
  authError,
  successResponse,
  serverError,
} from '@/lib/middleware';
import { AppError } from '@/lib/errors';

/**
 * 错误响应格式 (统一)
 * @typedef {Object} ApiErrorResponse
 * @property {string} error - 错误代码
 * @property {string} code - 错误代码
 * @property {string} message - 用户友好的错误消息
 * @property {string} timestamp - 时间戳
 * @property {string} [path] - 请求路径
 * @property {string} [requestId] - 请求ID
 */

// ============================================
// GET /api/projects - 获取项目列表
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as ProjectStatus | null;
  const priority = searchParams.get('priority') as ProjectPriority | null;
  const assignee = searchParams.get('assignee');

  let filteredProjects = [...projects];

  if (status) {
    filteredProjects = getProjectsByStatus(status);
  }

  if (priority) {
    filteredProjects = getProjectsByPriority(priority);
  }

  if (assignee) {
    filteredProjects = filteredProjects.filter(project => 
      project.members?.includes(assignee)
    );
  }

  return successResponse(filteredProjects);
}

// ============================================
// POST /api/projects - 创建项目
// ============================================

export async function POST(request: NextRequest) {
  // CSRF 检查
  const csrfMiddleware = createCsrfMiddleware();
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 认证检查
  const token = extractToken(request);
  if (!token) {
    return authError('Authentication required', request);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return authError('Invalid or expired token', request);
  }

  const body = await request.json();

  // 输入验证
  if (!body.name || typeof body.name !== 'string') {
    return validationError('Project name is required and must be a string', 'name', request);
  }

  const newProject = createProject(body);

  apiLogger.audit('Project created', {
    projectId: newProject.id,
    createdBy: payload.email,
  });

  return successResponse(newProject, undefined);
}

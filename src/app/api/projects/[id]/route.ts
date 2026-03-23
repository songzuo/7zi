/**
 * Project Detail API Route
 * 项目详情 API 路由
 *
 * Endpoints:
 * - GET /api/projects/:id - 获取项目详情
 * - PUT /api/projects/:id - 更新项目
 * - DELETE /api/projects/:id - 删除项目
 *
 * @module project-detail-api
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { withAuth } from '@/middleware/auth';
import {
  getProjectById,
  updateProject,
  deleteProject,
} from '../database';
import {
  validateProjectId,
  validateUpdateProjectRequest,
} from '../validation';
import {
  ProjectResponse,
  UpdateProjectResponse,
  DeleteProjectResponse,
  ErrorResponse,
} from '../types';
import { createAppError, ErrorCodes, formatErrorMessage } from '@/lib/errors';

// ============================================================================
// GET /api/projects/:id - 获取项目详情
// ============================================================================

/**
 * GET /api/projects/:id
 *
 * 获取指定项目的详细信息
 *
 * @auth Required
 *
 * @param id - 项目 ID
 *
 * @returns {Promise<NextResponse>} JSON 响应
 *
 * @example
 * ```http
 * GET /api/projects/1
 * Authorization: Bearer <token>
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/projects/1', {
 *   headers: {
 *     'Authorization': 'Bearer ' + token
 *   }
 * });
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "data": {
 * //     "id": 1,
 * //     "name": "Website Redesign",
 * //     "description": "Complete overhaul of the company website",
 * //     "status": "active",
 * //     "priority": "high",
 * //     "progress": 65,
 * //     "ownerId": "user123",
 * //     "startDate": "2024-03-01T00:00:00.000Z",
 * //     "endDate": "2024-06-30T00:00:00.000Z",
 * //     "createdAt": "2024-03-01T12:00:00.000Z",
 * //     "updatedAt": "2024-03-15T14:30:00.000Z"
 * //   }
 * // }
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    try {
      // 获取项目 ID
      const { id } = await params;
      const projectId = validateProjectId(id);

      // 获取项目详情
      const project = getProjectById(projectId);

      if (!project) {
        throw createAppError('Project not found', ErrorCodes.NOT_FOUND, 404);
      }

      const response: ProjectResponse = {
        success: true,
        data: project,
      };

      logger.info('Project retrieved', {
        userId: ctx?.userId || req.headers.get('X-User-Id'),
        projectId,
      });

      return NextResponse.json(response);
    } catch (error) {
      logger.error('Failed to get project', {
        error,
        userId: ctx?.userId || request.headers.get('X-User-Id'),
      });

      if (error instanceof Error && (error as any).code) {
        const appError = error as any;
        return NextResponse.json(
          {
            success: false,
            error: formatErrorMessage(error),
            code: appError.code,
          } as ErrorResponse,
          { status: appError.statusCode || 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: formatErrorMessage(error),
          code: ErrorCodes.SERVER_ERROR,
        } as ErrorResponse,
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// PUT /api/projects/:id - 更新项目
// ============================================================================

/**
 * PUT /api/projects/:id
 *
 * 更新指定项目的信息
 *
 * @auth Required
 *
 * @param id - 项目 ID
 *
 * @body {string} [name] - 项目名称
 * @body {string} [description] - 项目描述
 * @body {string} [status] - 项目状态
 * @body {string} [priority] - 项目优先级
 * @body {number} [progress] - 进度百分比 0-100
 * @body {string|null} [startDate] - 开始日期
 * @body {string|null} [endDate] - 结束日期
 *
 * @returns {Promise<NextResponse>} JSON 响应
 *
 * @example
 * ```http
 * PUT /api/projects/1
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "name": "Website Redesign (Updated)",
 *   "progress": 75
 * }
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/projects/1', {
 *   method: 'PUT',
 *   headers: {
 *     'Authorization': 'Bearer ' + token,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     name: 'Website Redesign (Updated)',
 *     progress: 75
 *   })
 * });
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "data": {
 * //     "id": 1,
 * //     "name": "Website Redesign (Updated)",
 * //     ...
 * //   },
 * //   "message": "Project updated successfully"
 * // }
 * ```
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    try {
      // 获取项目 ID
      const { id } = await params;
      const projectId = validateProjectId(id);

      // 解析请求体
      const body = await req.json();

      // 验证请求数据
      const validatedRequest = validateUpdateProjectRequest(body);

      // 更新项目
      const project = updateProject(projectId, validatedRequest);

      if (!project) {
        throw createAppError('Project not found', ErrorCodes.NOT_FOUND, 404);
      }

      const response: UpdateProjectResponse = {
        success: true,
        data: project,
        message: 'Project updated successfully',
      };

      logger.info('Project updated', {
        userId: ctx?.userId || req.headers.get('X-User-Id'),
        projectId,
      });

      return NextResponse.json(response);
    } catch (error) {
      logger.error('Failed to update project', {
        error,
        userId: ctx?.userId || request.headers.get('X-User-Id'),
      });

      if (error instanceof Error && (error as any).code) {
        const appError = error as any;
        return NextResponse.json(
          {
            success: false,
            error: formatErrorMessage(error),
            code: appError.code,
            details: appError.details,
          } as ErrorResponse,
          { status: appError.statusCode || 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: formatErrorMessage(error),
          code: ErrorCodes.SERVER_ERROR,
        } as ErrorResponse,
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// DELETE /api/projects/:id - 删除项目
// ============================================================================

/**
 * DELETE /api/projects/:id
 *
 * 删除指定项目
 *
 * @auth Required
 *
 * @param id - 项目 ID
 *
 * @returns {Promise<NextResponse>} JSON 响应
 *
 * @example
 * ```http
 * DELETE /api/projects/1
 * Authorization: Bearer <token>
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/projects/1', {
 *   method: 'DELETE',
 *   headers: {
 *     'Authorization': 'Bearer ' + token
 *   }
 * });
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "message": "Project deleted successfully"
 * // }
 * ```
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    try {
      // 获取项目 ID
      const { id } = await params;
      const projectId = validateProjectId(id);

      // 删除项目
      deleteProject(projectId);

      const response: DeleteProjectResponse = {
        success: true,
        message: 'Project deleted successfully',
      };

      logger.info('Project deleted', {
        userId: ctx?.userId || req.headers.get('X-User-Id'),
        projectId,
      });

      return NextResponse.json(response);
    } catch (error) {
      logger.error('Failed to delete project', {
        error,
        userId: ctx?.userId || request.headers.get('X-User-Id'),
      });

      if (error instanceof Error && (error as any).code) {
        const appError = error as any;
        return NextResponse.json(
          {
            success: false,
            error: formatErrorMessage(error),
            code: appError.code,
          } as ErrorResponse,
          { status: appError.statusCode || 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: formatErrorMessage(error),
          code: ErrorCodes.SERVER_ERROR,
        } as ErrorResponse,
        { status: 500 }
      );
    }
  });
}

// ============================================================================
// OPTIONS /api/projects/:id - CORS 预检请求
// ============================================================================

/**
 * OPTIONS /api/projects/:id
 *
 * 处理 CORS 预检请求
 */
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    {},
    {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    }
  );
}

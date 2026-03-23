/**
 * Projects API Route
 * 项目管理 API 路由
 *
 * Endpoints:
 * - GET /api/projects - 获取项目列表（支持分页、筛选、排序）
 * - POST /api/projects - 创建新项目
 *
 * @module projects-api
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { withAuth } from '@/middleware/auth';
import { initializeProjectTable } from './database';
import {
  createProject,
  listProjects,
  getProjectStats,
} from './database';
import {
  validateCreateProjectRequest,
  validateListProjectsQuery,
} from './validation';
import {
  ListProjectsResponse,
  CreateProjectResponse,
  ProjectStats,
  ErrorResponse,
} from './types';
import { createAppError, ErrorCodes, formatErrorMessage } from '@/lib/errors';

// ============================================================================
// Initialization
// ============================================================================

// 确保数据库表已创建
try {
  initializeProjectTable();
} catch (error) {
  logger.error('Failed to initialize project table', error);
}

// ============================================================================
// GET /api/projects - 获取项目列表
// ============================================================================

/**
 * GET /api/projects
 *
 * 获取项目列表，支持分页、筛选和排序
 *
 * @auth Required
 *
 * @queryparam page - 页码（默认：1）
 * @queryparam limit - 每页数量（默认：20，最大：100）
 * @queryparam status - 项目状态筛选 (active|in-progress|on-hold|completed|archived)
 * @queryparam priority - 项目优先级筛选 (low|medium|high|urgent)
 * @queryparam ownerId - 所有者用户 ID 筛选
 * @queryparam search - 搜索关键词（匹配名称或描述）
 * @queryparam sortBy - 排序字段 (createdAt|updatedAt|name|priority|progress)
 * @queryparam sortOrder - 排序方向 (asc|desc)
 *
 * @returns {Promise<NextResponse>} JSON 响应
 *
 * @example
 * ```http
 * GET /api/projects?page=1&limit=20&status=active&sortBy=createdAt&sortOrder=desc
 * Authorization: Bearer <token>
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/projects?page=1&limit=20', {
 *   headers: {
 *     'Authorization': 'Bearer ' + token
 *   }
 * });
 * const data = await response.json();
 * // {
 * //   "success": true,
 * //   "data": [...],
 * //   "pagination": {
 * //     "page": 1,
 * //     "limit": 20,
 * //     "total": 100,
 * //     "totalPages": 5,
 * //     "hasNext": true,
 * //     "hasPrev": false
 * //   }
 * // }
 * ```
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // 获取用户 ID
      const userId = req.headers.get('X-User-Id');
      if (!userId) {
        throw createAppError('User ID not found', ErrorCodes.AUTHENTICATION);
      }

      // 验证查询参数
      const query = validateListProjectsQuery(req.nextUrl.searchParams);

      // 获取项目列表
      const { projects, total } = listProjects(query, userId);

      // 计算分页信息
      const page = query.page || 1;
      const limit = query.limit || 20;
      const totalPages = Math.ceil(total / limit);

      const response: ListProjectsResponse = {
        success: true,
        data: projects,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      logger.info('Projects list retrieved', {
        userId,
        count: projects.length,
        total,
      });

      return NextResponse.json(response);
    } catch (error) {
      logger.error('Failed to list projects', { error, userId: request.headers.get('X-User-Id') });

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
// POST /api/projects - 创建新项目
// ============================================================================

/**
 * POST /api/projects
 *
 * 创建新项目
 *
 * @auth Required
 *
 * @body {string} name - 项目名称（必填）
 * @body {string} description - 项目描述（必填）
 * @body {string} [status] - 项目状态（默认：active）
 * @body {string} [priority] - 项目优先级（默认：medium）
 * @body {number} [progress] - 进度百分比 0-100（默认：0）
 * @body {string|null} [startDate] - 开始日期
 * @body {string|null} [endDate] - 结束日期
 *
 * @returns {Promise<NextResponse>} JSON 响应
 *
 * @example
 * ```http
 * POST /api/projects
 * Authorization: Bearer <token>
 * Content-Type: application/json
 *
 * {
 *   "name": "Website Redesign",
 *   "description": "Complete overhaul of the company website",
 *   "status": "active",
 *   "priority": "high",
 *   "progress": 0
 * }
 * ```
 *
 * @example
 * ```javascript
 * const response = await fetch('/api/projects', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer ' + token,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     name: 'Website Redesign',
 *     description: 'Complete overhaul of the company website',
 *     status: 'active',
 *     priority: 'high',
 *     progress: 0
 *   })
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
 * //     "progress": 0,
 * //     "ownerId": "user123",
 * //     "startDate": null,
 * //     "endDate": null,
 * //     "createdAt": "2024-03-23T12:00:00.000Z",
 * //     "updatedAt": "2024-03-23T12:00:00.000Z"
 * //   },
 * //   "message": "Project created successfully"
 * // }
 * ```
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // 获取用户 ID
      const userId = req.headers.get('X-User-Id');
      if (!userId) {
        throw createAppError('User ID not found', ErrorCodes.AUTHENTICATION);
      }

      // 解析请求体
      const body = await req.json();

      // 验证请求数据
      const validatedRequest = validateCreateProjectRequest(body);

      // 创建项目
      const project = createProject(validatedRequest, userId);

      const response: CreateProjectResponse = {
        success: true,
        data: project,
        message: 'Project created successfully',
      };

      logger.info('Project created', { userId, projectId: project.id });

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      logger.error('Failed to create project', { error, userId: request.headers.get('X-User-Id') });

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
// OPTIONS /api/projects - CORS 预检请求
// ============================================================================

/**
 * OPTIONS /api/projects
 *
 * 处理 CORS 预检请求
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    }
  );
}

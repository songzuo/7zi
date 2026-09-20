/**
 * Projects API Route
 * GET  /api/projects - 获取项目列表
 * POST /api/projects - 创建新项目
 */

import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/api/error-handler'

/**
 * GET /api/projects - 获取项目列表
 */
export async function GET(_request: NextRequest) {
  return createSuccessResponse([], 200)
}

/**
 * POST /api/projects - 创建新项目
 */
export async function POST(_request: NextRequest) {
  return createSuccessResponse({}, 201)
}

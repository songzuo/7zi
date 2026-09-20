/**
 * POST /api/reports/custom
 * 自定义报表 API
 * 
 * @version 1.10.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { reportGenerator } from '@/lib/ai/reports'
import {
  ReportLanguage,
  ReportTone,
} from '@/lib/ai/reports/types'
import {
  createErrorResponse,
  createSuccessResponse,
  createValidationError,
} from '@/lib/api/error-handler'

/**
 * POST /api/reports/custom
 * 生成自定义报表
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必需字段
    if (!body.title) {
      return createValidationError('title is required')
    }

    if (!body.timeRange) {
      return createValidationError('timeRange is required')
    }

    if (!body.sections || !Array.isArray(body.sections) || body.sections.length === 0) {
      return createValidationError('sections must be a non-empty array')
    }

    logger.info('[API] Generating custom report', {
      title: body.title,
      sectionsCount: body.sections.length,
    })

    // 生成自定义报表
    const report = await reportGenerator.generateCustom({
      title: body.title,
      description: body.description,
      sections: body.sections,
      timeRange: body.timeRange,
      customRange: body.customRange,
      filters: body.filters,
      language: body.language as ReportLanguage,
      tone: body.tone as ReportTone,
    })

    // 返回结果
    return createSuccessResponse({
      report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[API] Failed to generate custom report', error)
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}
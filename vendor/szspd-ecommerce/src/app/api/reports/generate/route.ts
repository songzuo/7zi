/**
 * POST /api/reports/generate
 * 生成报表 API
 * 
 * @version 1.10.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { reportGenerator } from '@/lib/ai/reports'
import {
  ReportGenerateRequest,
  ReportTemplateType,
  ReportLanguage,
  ReportTone,
  TimeRange,
} from '@/lib/ai/reports/types'
import {
  createErrorResponse,
  createSuccessResponse,
  createValidationError,
} from '@/lib/api/error-handler'

/**
 * POST /api/reports/generate
 * 生成报表
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 验证必需字段
    if (!body.timeRange) {
      return createValidationError('timeRange is required')
    }

    // 构建请求
    const reportRequest: ReportGenerateRequest = {
      templateId: body.templateId,
      templateType: body.templateType as ReportTemplateType,
      timeRange: body.timeRange as TimeRange,
      customRange: body.customRange,
      language: body.language as ReportLanguage,
      tone: body.tone as ReportTone,
      variables: body.variables,
      filters: body.filters,
      options: {
        includeCharts: body.includeCharts,
        includeRawData: body.includeRawData,
        includeInsights: body.includeInsights,
        maxSections: body.maxSections,
      },
    }

    logger.info('[API] Generating report', {
      templateType: reportRequest.templateType,
      timeRange: reportRequest.timeRange,
    })

    // 生成报表
    const report = await reportGenerator.generate(reportRequest)

    // 返回结果
    return createSuccessResponse({
      report,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[API] Failed to generate report', error)
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}

/**
 * GET /api/reports/generate
 * 获取支持的报表类型和选项
 */
export async function GET() {
  try {
    const supportedTypes = reportGenerator.getSupportedTemplateTypes()
    const templates = reportGenerator.getTemplates()

    return createSuccessResponse({
      supportedTypes,
      templates: templates.map(t => ({
        id: t.id,
        type: t.type,
        name: t.name,
        description: t.description,
        supportedLanguages: t.supportedLanguages,
        supportedTones: t.supportedTones,
      })),
      options: {
        timeRanges: ['today', 'week', 'month', 'quarter', 'year', 'custom'],
        languages: ['zh-CN', 'en-US', 'zh-TW', 'ja-JP'],
        tones: ['formal', 'concise', 'detailed', 'casual', 'technical'],
      },
    })
  } catch (error) {
    logger.error('[API] Failed to get report options', error)
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}
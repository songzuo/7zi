/**
 * GET /api/reports/templates
 * 获取报表模板列表 API
 * 
 * @version 1.10.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { reportGenerator } from '@/lib/ai/reports'
import { ReportLanguage } from '@/lib/ai/reports/types'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api/error-handler'

/**
 * GET /api/reports/templates
 * 获取所有报表模板
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const language = searchParams.get('language')

    // 获取所有模板
    let templates = reportGenerator.getTemplates()

    // 按类型过滤
    if (type) {
      templates = templates.filter(t => t.type === type)
    }

    // 按语言过滤
    if (language) {
      templates = templates.filter(t => t.supportedLanguages.includes(language as ReportLanguage))
    }

    // 返回模板信息（不包含完整的模板内容）
    const templateSummaries = templates.map(t => ({
      id: t.id,
      type: t.type,
      name: t.name,
      description: t.description,
      version: t.version,
      supportedLanguages: t.supportedLanguages,
      supportedTones: t.supportedTones,
      variables: t.variables.map(v => ({
        key: v.key,
        label: v.label,
        type: v.type,
        required: v.required,
        description: v.description,
      })),
      metadata: t.metadata,
    }))

    return createSuccessResponse({
      templates: templateSummaries,
      total: templateSummaries.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('[API] Failed to get templates', error)
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'))
  }
}
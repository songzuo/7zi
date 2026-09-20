/**
 * @fileoverview Data Import Preview API
 * @description 文件预览 API 端点
 * @version 1.12.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { dataImportService } from '@/lib/import'
import type { ImportFormat } from '@/lib/import/types'

/**
 * POST /api/import/preview - 预览文件
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '文件不能为空' }, { status: 400 })
    }

    // 解析格式
    const format = formData.get('format') as ImportFormat | null
    const maxRows = parseInt(formData.get('maxRows') as string) || 10

    // 检测格式（如果未指定）
    const detectedFormat = format || dataImportService.detectFormat(file.name)

    // 预览文件
    const preview = await dataImportService.previewFile(file, file.name, detectedFormat, maxRows)

    return NextResponse.json({
      success: true,
      preview,
    })
  } catch (error) {
    console.error('文件预览失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '文件预览失败',
      },
      { status: 500 }
    )
  }
}
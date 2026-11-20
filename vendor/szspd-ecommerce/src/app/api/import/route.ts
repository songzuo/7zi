/**
 * @fileoverview Data Import API Routes
 * @description 数据导入 API 端点
 * @version 1.12.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { dataImportService } from '@/lib/import'
import type { ImportOptions, ImportFormat } from '@/lib/import/types'

/**
 * POST /api/import - 创建导入任务
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '文件不能为空' }, { status: 400 })
    }

    // 解析选项
    const optionsJson = formData.get('options') as string
    const options: ImportOptions = JSON.parse(optionsJson)

    // 检测格式（如果未指定）
    if (!options.format) {
      options.format = dataImportService.detectFormat(file.name)
    }

    // 创建任务
    const task = await dataImportService.createTask(file, file.name, options)

    // 异步执行导入
    dataImportService.executeTask(task.id).catch(error => {
      console.error('导入任务执行失败:', error)
    })

    return NextResponse.json({
      success: true,
      taskId: task.id,
      task,
    })
  } catch (error) {
    console.error('创建导入任务失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '创建导入任务失败',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/import - 获取任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (taskId) {
      // 获取单个任务
      const task = dataImportService.getTask(taskId)
      if (!task) {
        return NextResponse.json({ error: '任务不存在' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        task,
      })
    } else {
      // 获取所有任务（简化实现）
      return NextResponse.json({
        success: true,
        tasks: [],
      })
    }
  } catch (error) {
    console.error('获取导入任务失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '获取导入任务失败',
      },
      { status: 500 }
    )
  }
}
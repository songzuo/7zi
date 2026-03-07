/**
 * 数据导入 API 路由
 * 支持 CSV 和 JSON 格式的任务数据导入
 * @module app/api/import/route
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  importData,
  validateImportFile,
  generateCSVTemplate,
  generateJSONTemplate,
  type ImportOptions,
} from '@/lib/db/import';

/**
 * POST /api/import
 * 导入任务数据
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsJson = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未提供文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const content = await file.text();
    const filename = file.name;

    // 验证文件格式
    const validation = validateImportFile(content, filename);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 解析导入选项
    let options: ImportOptions = {};
    if (optionsJson) {
      try {
        options = JSON.parse(optionsJson);
      } catch {
        // 忽略无效的选项 JSON
      }
    }

    // 执行导入
    const result = await importData(content, filename, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导入失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import
 * 获取导入模板或预览数据
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const format = searchParams.get('format');

  // 获取模板
  if (action === 'template') {
    if (format === 'csv') {
      const template = generateCSVTemplate();
      return new NextResponse(template, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="import-template.csv"',
        },
      });
    }

    if (format === 'json') {
      const template = generateJSONTemplate();
      return new NextResponse(template, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': 'attachment; filename="import-template.json"',
        },
      });
    }

    return NextResponse.json(
      { error: '不支持的模板格式，请使用 csv 或 json' },
      { status: 400 }
    );
  }

  // 获取导入帮助信息
  return NextResponse.json({
    supportedFormats: ['csv', 'json'],
    fields: [
      { name: 'title', required: true, description: '任务标题' },
      { name: 'description', required: false, description: '任务描述' },
      { name: 'priority', required: false, description: '优先级 (high/medium/low)', default: 'medium' },
      { name: 'status', required: false, description: '状态 (todo/in_progress/review/done)', default: 'todo' },
      { name: 'tags', required: false, description: '标签（逗号分隔）' },
      { name: 'assignee', required: false, description: '负责人' },
      { name: 'dueDate', required: false, description: '截止日期 (ISO 格式)' },
    ],
    maxFileSize: '10MB',
    maxRecords: 1000,
  });
}
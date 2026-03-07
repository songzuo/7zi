/**
 * 文件上传 API
 * POST /api/files - 上传文件
 * GET /api/files - 获取文件列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import {
  initializeFilesTable,
  createFile,
  getAllFiles,
  filterFiles,
  getFileStats,
  getFileByHash,
} from '@/lib/db/files.repository';

// 允许的文件类型
const ALLOWED_MIME_TYPES = [
  // 图片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // 文档
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  // 压缩文件
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // 代码
  'application/json',
  'application/javascript',
  'text/html',
  'text/css',
  'text/xml',
];

// 最大文件大小 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 上传目录
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * 计算文件哈希
 */
function calculateHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * 生成唯一文件名
 */
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}${ext}`;
}

/**
 * 获取 MIME 类型分类
 */
function getMimeTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  if (mimeType.startsWith('text/')) return 'text';
  return 'other';
}

/**
 * GET /api/files - 获取文件列表
 */
export async function GET(request: NextRequest) {
  try {
    await initializeFilesTable();

    const { searchParams } = new URL(request.url);
    
    // 检查是否请求统计信息
    if (searchParams.get('stats') === 'true') {
      const stats = await getFileStats();
      return NextResponse.json(stats);
    }

    // 解析筛选参数
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const filter = {
      mimeType: searchParams.get('mimeType') || undefined,
      uploadedBy: searchParams.get('uploadedBy') || undefined,
      taskId: searchParams.get('taskId') || undefined,
      search: searchParams.get('search') || undefined,
      maxSize: searchParams.get('maxSize') ? parseInt(searchParams.get('maxSize')!) : undefined,
      minSize: searchParams.get('minSize') ? parseInt(searchParams.get('minSize')!) : undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    // 是否有筛选条件
    const hasFilters = Object.values(filter).some(v => v !== undefined);
    
    let files;
    if (hasFilters) {
      files = await filterFiles(filter);
    } else {
      files = await getAllFiles(limit, offset);
    }

    return NextResponse.json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files - 上传文件
 */
export async function POST(request: NextRequest) {
  try {
    await initializeFilesTable();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 检查文件类型
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 计算哈希检查重复
    const hash = calculateHash(buffer);
    const existingFile = await getFileByHash(hash);
    
    if (existingFile) {
      return NextResponse.json({
        success: true,
        data: existingFile,
        message: 'File already exists (duplicate detected)',
        duplicate: true,
      });
    }

    // 确保上传目录存在
    const categoryDir = path.join(UPLOAD_DIR, getMimeTypeCategory(file.type));
    if (!existsSync(categoryDir)) {
      await mkdir(categoryDir, { recursive: true });
    }

    // 生成文件名和路径
    const filename = generateFilename(file.name);
    const filePath = path.join(categoryDir, filename);
    const relativePath = path.relative(UPLOAD_DIR, filePath);

    // 写入文件
    await writeFile(filePath, buffer);

    // 创建数据库记录
    const fileRecord = await createFile({
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: relativePath,
      hash,
      uploadedBy: formData.get('uploadedBy') as string || undefined,
      taskId: formData.get('taskId') as string || undefined,
      description: formData.get('description') as string || undefined,
    });

    return NextResponse.json({
      success: true,
      data: fileRecord,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
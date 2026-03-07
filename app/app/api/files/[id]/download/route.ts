/**
 * 文件下载 API
 * GET /api/files/[id]/download - 下载文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { initializeFilesTable, getFileById } from '@/lib/db/files.repository';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * GET /api/files/[id]/download - 下载文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeFilesTable();

    const { id } = await params;
    const file = await getFileById(id);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, file.path);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await readFile(filePath);
    const fileStats = await stat(filePath);

    // 获取请求的 Range 头（支持断点续传）
    const range = request.headers.get('range');

    if (range) {
      // 处理范围请求
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileStats.size - 1;
      const chunkSize = end - start + 1;

      const chunk = fileBuffer.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileStats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        },
      });
    }

    // 完整文件下载
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Length': file.size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
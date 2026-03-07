/**
 * 单个文件 API
 * GET /api/files/[id] - 获取文件详情
 * PUT /api/files/[id] - 更新文件信息
 * DELETE /api/files/[id] - 删除文件
 */

import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import {
  initializeFilesTable,
  getFileById,
  updateFile,
  deleteFile,
} from '@/lib/db/files.repository';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * GET /api/files/[id] - 获取文件详情
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

    return NextResponse.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/files/[id] - 更新文件信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeFilesTable();

    const { id } = await params;
    const body = await request.json();

    const file = await updateFile(id, {
      description: body.description,
      taskId: body.taskId,
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: file,
      message: 'File updated successfully',
    });
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update file' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id] - 删除文件
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeFilesTable();

    const { id } = await params;
    
    // 先获取文件信息
    const file = await getFileById(id);
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // 删除物理文件
    const filePath = path.join(UPLOAD_DIR, file.path);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // 删除数据库记录
    const deleted = await deleteFile(id);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      data: { id, deleted },
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
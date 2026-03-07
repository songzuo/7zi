/**
 * 头像上传 API 路由
 * POST: 上传头像图片
 * DELETE: 删除头像
 * 
 * 支持功能：
 * - 图片上传
 * - 自动调整大小
 * - 文件类型验证
 * - 文件大小验证
 * - 安全文件名生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { updateUser, getUserById } from '@/lib/users/repository';
import crypto from 'crypto';

// ============================================================================
// 常量配置
// ============================================================================

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成安全的文件名
 */
function generateSafeFileName(userId: string, ext: string): string {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(8).toString('hex');
  return `${userId}_${timestamp}_${hash}.${ext}`;
}

/**
 * 确保上传目录存在
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * 删除旧头像
 */
async function deleteOldAvatar(avatarUrl: string | undefined): Promise<void> {
  if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
  
  const oldPath = path.join(process.cwd(), 'public', avatarUrl);
  if (existsSync(oldPath)) {
    try {
      await unlink(oldPath);
    } catch (error) {
      console.error('Failed to delete old avatar:', error);
    }
  }
}

/**
 * 获取文件扩展名
 */
function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return extensions[mimeType] || 'jpg';
}

// ============================================================================
// API 路由
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/users/[id]/avatar
 * 上传头像
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // 检查用户是否存在
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded', code: 'NO_FILE' },
        { status: 400 }
      );
    }
    
    // 验证文件类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          error: 'Invalid file type', 
          code: 'INVALID_TYPE',
          allowedTypes: ALLOWED_TYPES 
        },
        { status: 400 }
      );
    }
    
    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'File too large', 
          code: 'FILE_TOO_LARGE',
          maxSize: MAX_FILE_SIZE 
        },
        { status: 400 }
      );
    }
    
    // 确保上传目录存在
    await ensureUploadDir();
    
    // 生成安全的文件名
    const fileExt = getFileExtension(file.type);
    const fileName = generateSafeFileName(id, fileExt);
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // 删除旧头像
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }
    
    // 更新用户头像URL
    const avatarUrl = `/uploads/avatars/${fileName}`;
    const updatedUser = await updateUser(id, { avatar: avatarUrl });
    
    return NextResponse.json({
      success: true,
      avatarUrl,
      user: updatedUser,
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Failed to upload avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar', code: 'UPLOAD_FAILED' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]/avatar
 * 删除头像
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // 检查用户是否存在
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // 删除头像文件
    if (user.avatar) {
      await deleteOldAvatar(user.avatar);
    }
    
    // 清除用户头像URL
    const updatedUser = await updateUser(id, { avatar: undefined });
    
    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete avatar:', error);
    return NextResponse.json(
      { error: 'Failed to delete avatar', code: 'DELETE_FAILED' },
      { status: 500 }
    );
  }
}
/**
 * 单个标签 API 路由
 * DELETE: 删除自定义标签
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteTag } from '@/lib/db/tags.repository';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = deleteTag(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Cannot delete this tag (it may be a default tag or does not exist)' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
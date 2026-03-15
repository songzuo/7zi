/**
 * 博客评论单个操作 API
 * 提供单个评论的 GET, PUT, DELETE 操作
 * 
 * @module api/comments/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CommentsAPI');
const DATA_FILE = path.join(process.cwd(), 'data', 'comments.json');

interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 读取评论数据
function loadComments(): Comment[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    logger.error('Error loading comments', error);
  }
  return [];
}

// 保存评论数据
function saveComments(comments: Comment[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(comments, null, 2));
  } catch (error) {
    logger.error('Error saving comments', error);
    throw error;
  }
}

// 提取评论 ID
function getCommentId(request: NextRequest): string | null {
  const urlParts = request.url.split('/');
  const id = urlParts[urlParts.length - 1];
  // 过滤掉查询参数
  return id ? id.split('?')[0] : null;
}

// 安全解析请求体
async function safeParseBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text || text.trim() === '') {
      return null;
    }
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// ============================================
// GET /api/comments/:id - 获取单个评论
// ============================================

export async function GET(request: NextRequest) {
  try {
    const id = getCommentId(request);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }
    
    const comments = loadComments();
    const comment = comments.find(c => c.id === id);
    
    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Error fetching comment', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/comments/:id - 更新评论
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const id = getCommentId(request);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }
    
    const comments = loadComments();
    const index = comments.findIndex(c => c.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    const body = await safeParseBody(request);
    
    // 检查请求体是否为空
    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required for update' },
        { status: 400 }
      );
    }
    
    let hasUpdates = false;
    
    // 更新 content 字段
    if (body.content !== null && body.content !== undefined) {
      if (typeof body.content !== 'string') {
        return NextResponse.json(
          { error: 'Content must be a string' },
          { status: 400 }
        );
      }
      if (body.content.trim() === '') {
        return NextResponse.json(
          { error: 'Content cannot be empty' },
          { status: 400 }
        );
      }
      if (body.content.length > 5000) {
        return NextResponse.json(
          { error: 'Content must be less than 5000 characters' },
          { status: 400 }
        );
      }
      comments[index].content = body.content.trim();
      hasUpdates = true;
    }
    
    // 更新 author 字段
    if (body.author !== null && body.author !== undefined) {
      if (typeof body.author !== 'string') {
        return NextResponse.json(
          { error: 'Author must be a string' },
          { status: 400 }
        );
      }
      if (body.author.trim() === '') {
        return NextResponse.json(
          { error: 'Author cannot be empty' },
          { status: 400 }
        );
      }
      comments[index].author = body.author.trim();
      hasUpdates = true;
    }
    
    if (hasUpdates) {
      comments[index].updatedAt = new Date().toISOString();
      saveComments(comments);
    }
    
    return NextResponse.json({
      success: true,
      data: comments[index]
    });
  } catch (error) {
    logger.error('Error updating comment', error);
    return NextResponse.json(
      { error: 'Failed to update comment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

// ============================================
// DELETE /api/comments/:id - 删除评论
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const id = getCommentId(request);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }
    
    const comments = loadComments();
    const index = comments.findIndex(c => c.id === id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    comments.splice(index, 1);
    saveComments(comments);
    
    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting comment', error);
    return NextResponse.json(
      { error: 'Failed to delete comment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

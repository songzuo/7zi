/**
 * 博客评论单个操作 API
 * 提供单个评论的 GET, PUT, DELETE 操作
 * 
 * @module api/comments/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
  }
  return [];
}

// 保存评论数据
function saveComments(comments: Comment[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(comments, null, 2));
}

// 提取评论 ID
function getCommentId(request: NextRequest): string | null {
  const urlParts = request.url.split('/');
  return urlParts[urlParts.length - 1] || null;
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
    console.error('Error fetching comment:', error);
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
    
    const body = await request.json();
    
    // 更新字段
    if (body.content !== undefined) {
      if (typeof body.content !== 'string') {
        return NextResponse.json(
          { error: 'Content must be a string' },
          { status: 400 }
        );
      }
      if (body.content.length > 5000) {
        return NextResponse.json(
          { error: 'Content must be less than 5000 characters' },
          { status: 400 }
        );
      }
      comments[index].content = body.content;
    }
    
    if (body.author !== undefined) {
      if (typeof body.author !== 'string') {
        return NextResponse.json(
          { error: 'Author must be a string' },
          { status: 400 }
        );
      }
      comments[index].author = body.author;
    }
    
    comments[index].updatedAt = new Date().toISOString();
    
    saveComments(comments);
    
    return NextResponse.json({
      success: true,
      data: comments[index]
    });
  } catch (error) {
    console.error('Error updating comment:', error);
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
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

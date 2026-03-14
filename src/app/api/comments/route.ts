/**
 * 博客评论 API
 * 提供评论的 CRUD 操作
 * 
 * @module api/comments
 * @description 博客评论管理端点
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
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

// ============================================
// GET /api/comments - 获取评论列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    let comments = loadComments();
    
    // 按文章筛选
    if (postId) {
      comments = comments.filter(c => c.postId === postId);
    }
    
    // 按创建时间倒序排列
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({
      success: true,
      data: comments,
      total: comments.length
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/comments - 创建评论
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.postId || typeof body.postId !== 'string') {
      return NextResponse.json(
        { error: 'Post ID is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!body.author || typeof body.author !== 'string') {
      return NextResponse.json(
        { error: 'Author is required and must be a string' },
        { status: 400 }
      );
    }
    
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }
    
    // 内容长度限制
    if (body.content.length > 5000) {
      return NextResponse.json(
        { error: 'Content must be less than 5000 characters' },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    const newComment: Comment = {
      id: uuidv4(),
      postId: body.postId,
      author: body.author,
      content: body.content,
      createdAt: now,
      updatedAt: now
    };
    
    // 保存评论
    const comments = loadComments();
    comments.push(newComment);
    saveComments(comments);
    
    return NextResponse.json({
      success: true,
      data: newComment
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
}

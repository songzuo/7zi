/**
 * 博客评论 API
 * 提供评论的 CRUD 操作
 * 
 * @module api/comments
 * @description 博客评论管理端点
 */

import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import {
  apiError,
  badRequest,
  notFound,
  success,
  handleApiRequest,
  validateRequired,
  validateString,
  validateRange,
} from '@/lib/api-error';

const DATA_FILE = path.join(process.cwd(), 'data', 'comments.json');

interface Comment {
  id: string;
  postId: string;
  author: string;
  content: string;
  tags?: string[];
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
    console.error('Error loading comments:', error);
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
    console.error('Error saving comments:', error);
    throw error;
  }
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
// GET /api/comments - 获取评论列表
// ============================================

export const GET = handleApiRequest(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  
  let comments = loadComments();
  
  // 按文章筛选
  if (postId) {
    comments = comments.filter(c => c.postId === postId);
  }
  
  // 按创建时间倒序排列
  comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return success({ comments, total: comments.length }, request);
});

// ============================================
// POST /api/comments - 创建评论
// ============================================

export const POST = handleApiRequest(async (request: NextRequest) => {
  const body = await request.json();
  
  // 验证必填字段 - postId
  const postIdError = validateRequired(body.postId, 'postId', request);
  if (postIdError) return postIdError;
  
  const postIdStrError = validateString(body.postId, 'postId', request);
  if (postIdStrError) return postIdStrError;
  
  // 验证必填字段 - author
  const authorError = validateRequired(body.author, 'author', request);
  if (authorError) return authorError;
  
  const authorStrError = validateString(body.author, 'author', request);
  if (authorStrError) return authorStrError;
  
  // 验证必填字段 - content
  const contentError = validateRequired(body.content, 'content', request);
  if (contentError) return contentError;
  
  const contentStrError = validateString(body.content, 'content', request);
  if (contentStrError) return contentStrError;
  
  // 验证内容长度
  if (body.content.length > 5000) {
    return badRequest('内容不能超过 5000 个字符', { field: 'content', maxLength: 5000 }, request);
  }
  
  // 处理可选字段 - tags
  let tags: string[] = [];
  if (Array.isArray(body.tags)) {
    tags = body.tags.filter((t: unknown): t is string => typeof t === 'string');
  }
  
  const now = new Date().toISOString();
  const newComment: Comment = {
    id: uuidv4(),
    postId: body.postId.trim(),
    author: body.author.trim(),
    content: body.content.trim(),
    tags,
    createdAt: now,
    updatedAt: now
  };
  
  // 保存评论
  const comments = loadComments();
  comments.push(newComment);
  saveComments(comments);
  
  return success(newComment, request);
});

/**
 * 标签 API 路由
 * GET: 获取所有标签
 * POST: 创建新标签
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllTags, getCustomTags, createTag } from '@/lib/db/tags.repository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customOnly = searchParams.get('custom') === 'true';
    
    const tags = customOnly ? getCustomTags() : getAllTags();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const tag = createTag({
      name: body.name,
      color: body.color || 'blue',
    });
    
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Failed to create tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
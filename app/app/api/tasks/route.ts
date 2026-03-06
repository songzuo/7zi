/**
 * 任务 API 路由
 * GET: 获取所有任务
 * POST: 创建新任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, createTask, filterTasks } from '@/lib/db/tasks.repository';
import { TaskPriority, TaskStatus } from '@/lib/tasks/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // 检查是否有筛选条件
    const hasFilters = searchParams.has('priority') || 
                       searchParams.has('status') || 
                       searchParams.has('assignee') || 
                       searchParams.has('search') ||
                       searchParams.has('tags');
    
    if (hasFilters) {
      const filter = {
        priority: searchParams.get('priority') as TaskPriority | undefined,
        status: searchParams.get('status') as TaskStatus | undefined,
        assignee: searchParams.get('assignee') || undefined,
        search: searchParams.get('search') || undefined,
        tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      };
      
      const tasks = filterTasks(filter);
      return NextResponse.json({ tasks });
    }
    
    const tasks = getAllTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const task = createTask({
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      status: body.status || 'todo',
      tags: body.tags || [],
      assignee: body.assignee,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
    });
    
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
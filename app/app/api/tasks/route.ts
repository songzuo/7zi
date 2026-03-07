/**
 * 任务 API 路由
 * GET: 获取所有任务（支持高级筛选）
 * POST: 创建新任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, createTask, filterTasks } from '@/lib/db/tasks.repository';
import { TaskPriority, TaskStatus, TaskFilter } from '@/lib/tasks/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // 检查是否有筛选条件
    const hasFilters = searchParams.has('priority') || 
                       searchParams.has('status') || 
                       searchParams.has('assignee') || 
                       searchParams.has('search') ||
                       searchParams.has('tags') ||
                       searchParams.has('dueDateFrom') ||
                       searchParams.has('dueDateTo') ||
                       searchParams.has('createdFrom') ||
                       searchParams.has('createdTo') ||
                       searchParams.has('completedFrom') ||
                       searchParams.has('completedTo') ||
                       searchParams.has('sortBy') ||
                       searchParams.has('sortOrder');
    
    if (hasFilters) {
      const filter: TaskFilter = {
        priority: searchParams.get('priority') as TaskPriority | undefined,
        status: searchParams.get('status') as TaskStatus | undefined,
        assignee: searchParams.get('assignee') || undefined,
        search: searchParams.get('search') || undefined,
        tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
        // 高级筛选 - 日期范围
        dueDateFrom: searchParams.get('dueDateFrom') || undefined,
        dueDateTo: searchParams.get('dueDateTo') || undefined,
        createdFrom: searchParams.get('createdFrom') || undefined,
        createdTo: searchParams.get('createdTo') || undefined,
        completedFrom: searchParams.get('completedFrom') || undefined,
        completedTo: searchParams.get('completedTo') || undefined,
        // 排序
        sortBy: searchParams.get('sortBy') as TaskFilter['sortBy'] | undefined,
        sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' | undefined,
      };
      
      const tasks = filterTasks(filter);
      return NextResponse.json({ 
        tasks,
        filter: {
          applied: filter,
          count: tasks.length,
        }
      });
    }
    
    const tasks = getAllTasks();
    return NextResponse.json({ 
      tasks,
      filter: {
        applied: null,
        count: tasks.length,
      }
    });
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
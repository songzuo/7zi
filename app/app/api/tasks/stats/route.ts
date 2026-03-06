/**
 * 任务统计 API 路由
 * GET: 获取任务统计信息
 */

import { NextResponse } from 'next/server';
import { getTaskStats } from '@/lib/db/tasks.repository';

export async function GET() {
  try {
    const stats = getTaskStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to fetch task stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task stats' },
      { status: 500 }
    );
  }
}
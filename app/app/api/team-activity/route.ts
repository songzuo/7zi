/**
 * 团队活动追踪 API
 * GET /api/team-activity - 获取活动列表
 * POST /api/team-activity - 创建新活动
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamActivityRepository } from '@/lib/team-activity/repository';
import type { TeamActivity } from '@/lib/team-activity/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 50;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : 0;
    const memberId = searchParams.get('memberId') || undefined;
    const type = searchParams.get('type') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const result = await teamActivityRepository.getActivities({
      limit,
      offset,
      memberId,
      type: type as any,
      priority: priority as any,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch team activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.type || !body.memberId || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, memberId, title' },
        { status: 400 }
      );
    }

    const activity = await teamActivityRepository.addActivity({
      type: body.type,
      memberId: body.memberId,
      memberName: body.memberName || 'Unknown',
      memberRole: body.memberRole || 'Executor',
      memberAvatar: body.memberAvatar,
      title: body.title,
      description: body.description || body.title,
      timestamp: body.timestamp || new Date().toISOString(),
      priority: body.priority || 'normal',
      metadata: body.metadata,
      tags: body.tags,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Failed to create team activity:', error);
    return NextResponse.json(
      { error: 'Failed to create team activity' },
      { status: 500 }
    );
  }
}
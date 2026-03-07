/**
 * 用户活动日志 API
 * GET: 获取活动列表
 * POST: 创建新活动
 */

import { NextRequest, NextResponse } from 'next/server';
import { userActivityRepository } from '@/lib/user-activity/repository';
import type { CreateUserActivityParams } from '@/lib/user-activity/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // 解析查询参数
    const userId = searchParams.get('userId') || undefined;
    const type = searchParams.get('type')?.split(',') as any;
    const source = searchParams.get('source') as any;
    const severity = searchParams.get('severity') as any;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;
    const sortBy = searchParams.get('sortBy') as any || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') as any || 'desc';

    const result = await userActivityRepository.getActivities({
      userId,
      type,
      source,
      severity,
      startDate,
      endDate,
      search,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: result.activities,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return NextResponse.json(
      { success: false, error: '获取活动列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const params: CreateUserActivityParams = {
      userId: body.userId || 'current-user',
      type: body.type,
      title: body.title,
      description: body.description,
      metadata: body.metadata,
      source: body.source || 'web',
      severity: body.severity || 'info',
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
      sessionId: body.sessionId,
      duration: body.duration,
    };

    // 验证必填字段
    if (!params.type || !params.title) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：type, title' },
        { status: 400 }
      );
    }

    const activity = await userActivityRepository.createActivity(params);

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Error creating user activity:', error);
    return NextResponse.json(
      { success: false, error: '创建活动记录失败' },
      { status: 500 }
    );
  }
}
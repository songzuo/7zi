/**
 * 用户活动统计 API
 * GET: 获取活动统计数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { userActivityRepository } from '@/lib/user-activity/repository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!, 10) : 7;

    // 获取统计数据
    const stats = await userActivityRepository.getStats(userId);
    
    // 获取趋势数据
    const trend = await userActivityRepository.getTrend(userId, days);
    
    // 获取时间线数据
    const timeline = await userActivityRepository.getTimeline(userId, 10);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        trend,
        timeline,
      },
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
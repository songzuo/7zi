/**
 * 团队成员 API
 * GET /api/team-activity/members - 获取成员列表
 * PATCH /api/team-activity/members - 更新成员状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { teamActivityRepository } from '@/lib/team-activity/repository';

export async function GET() {
  try {
    const members = await teamActivityRepository.getMembers();
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.memberId || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, status' },
        { status: 400 }
      );
    }

    await teamActivityRepository.updateMemberStatus(body.memberId, body.status);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update member status:', error);
    return NextResponse.json(
      { error: 'Failed to update member status' },
      { status: 500 }
    );
  }
}
/**
 * 团队概览 API
 * GET /api/team-activity/overview
 */

import { NextResponse } from 'next/server';
import { teamActivityRepository } from '@/lib/team-activity/repository';

export async function GET() {
  try {
    const overview = await teamActivityRepository.getOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Failed to fetch team overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team overview' },
      { status: 500 }
    );
  }
}
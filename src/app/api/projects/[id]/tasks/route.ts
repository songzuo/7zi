/**
 * 项目任务 API - GET /api/projects/:id/tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { getProjectById } from '@/lib/data/projects';
import { getTasksByProjectId } from '@/lib/data/tasks';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = getProjectById(id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const tasks = getTasksByProjectId(id);

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    apiLogger.error('Error fetching project tasks', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project tasks',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

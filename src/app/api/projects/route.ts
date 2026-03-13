/**
 * 项目管理 API - 列表和创建
 * GET /api/projects - 获取项目列表
 * POST /api/projects - 创建项目
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProjectStatus, ProjectPriority } from '@/types/project-types';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import { 
  projects, 
  createProject, 
  getProjectsByStatus,
  getProjectsByPriority
} from '@/lib/data/projects';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ProjectStatus | null;
    const priority = searchParams.get('priority') as ProjectPriority | null;
    const assignee = searchParams.get('assignee');

    let filteredProjects = [...projects];

    if (status) {
      filteredProjects = getProjectsByStatus(status);
    }

    if (priority) {
      filteredProjects = getProjectsByPriority(priority);
    }

    if (assignee) {
      filteredProjects = filteredProjects.filter(project => 
        project.members?.includes(assignee)
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredProjects,
    });
  } catch (error) {
    apiLogger.error('Failed to fetch projects', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token', code: 'AUTH_INVALID' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const newProject = createProject(body);

    return NextResponse.json({
      success: true,
      data: newProject,
    }, { status: 201 });
  } catch (error) {
    apiLogger.error('Failed to create project', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

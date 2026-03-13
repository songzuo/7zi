/**
 * 项目详情 API - GET/PUT/DELETE /api/projects/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import { getProjectById, updateProject, deleteProject } from '@/lib/data/projects';

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

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    apiLogger.error('Error fetching project by ID', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    const { id } = await params;
    const body = await request.json();
    const updated = updateProject(id, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    apiLogger.error('Error updating project', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    const { id } = await params;
    const deleted = deleteProject(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted',
    });
  } catch (error) {
    apiLogger.error('Error deleting project', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

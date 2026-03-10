/**
 * 项目管理 API
 * 提供完整的 CRUD 操作，带认证和授权检查
 */

import { NextRequest, NextResponse } from 'next/server';
import { Project, ProjectCategory } from '@/types/common';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import { projects, getProjectBySlug } from '@/lib/data/projects';

// ============================================
// GET /api/projects - 获取项目列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ProjectCategory | null;
    const status = searchParams.get('status') as 'active' | 'completed' | 'paused' | null;

    let filteredProjects = [...projects];

    // 按类别过滤
    if (category) {
      filteredProjects = filteredProjects.filter(project => project.category === category);
    }

    // 按状态过滤（基于 duration 字段推断状态）
    if (status) {
      // 这里可以根据实际需求实现状态过滤逻辑
      // 目前项目数据中没有明确的状态字段，所以暂时不实现
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

// ============================================
// POST /api/projects - 创建项目
// ============================================

export async function POST(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查 - 必须登录
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to create projects'
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired token', 
          code: 'AUTH_INVALID',
          message: 'Please log in again'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 输入验证
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Project title is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'Project description is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.category || !['website', 'app', 'ai', 'design'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Valid project category is required (website, app, ai, design)' },
        { status: 400 }
      );
    }

    const newProject: Project = {
      id: uuidv4(),
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      title: body.title,
      description: body.description,
      category: body.category as ProjectCategory,
      thumbnail: body.thumbnail || '/images/portfolio/default-thumb.jpg',
      images: body.images || [],
      techStack: Array.isArray(body.techStack) ? body.techStack : [],
      client: body.client || undefined,
      duration: body.duration || 'TBD',
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      testimonial: body.testimonial || undefined,
      links: body.links || {},
    };

    // 在实际应用中，这里应该保存到数据库
    // 目前使用内存存储，仅用于演示
    projects.push(newProject);

    apiLogger.audit('Project created', {
      projectId: newProject.id,
      createdBy: payload.email,
      userRole: payload.role,
    });

    return NextResponse.json({
      success: true,
      data: newProject,
    }, { status: 201 });
  } catch (error) {
    apiLogger.error('Error creating project', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

// ============================================
// PUT /api/projects/:id - 更新项目
// ============================================

export async function PUT(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查 - 必须登录
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to update projects'
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired token', 
          code: 'AUTH_INVALID',
          message: 'Please log in again'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectIndex = projects.findIndex(project => project.id === id);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const existingProject = projects[projectIndex];
    
    // 验证更新数据
    if (updateData.title !== undefined && (typeof updateData.title !== 'string' || !updateData.title.trim())) {
      return NextResponse.json(
        { error: 'Project title must be a non-empty string' },
        { status: 400 }
      );
    }

    if (updateData.description !== undefined && (typeof updateData.description !== 'string' || !updateData.description.trim())) {
      return NextResponse.json(
        { error: 'Project description must be a non-empty string' },
        { status: 400 }
      );
    }

    if (updateData.category !== undefined && !['website', 'app', 'ai', 'design'].includes(updateData.category)) {
      return NextResponse.json(
        { error: 'Valid project category is required (website, app, ai, design)' },
        { status: 400 }
      );
    }

    // 更新项目
    const updatedProject: Project = {
      ...existingProject,
      ...updateData,
      id: existingProject.id, // 确保ID不变
    };

    projects[projectIndex] = updatedProject;

    apiLogger.audit('Project updated', {
      projectId: updatedProject.id,
      updatedBy: payload.email,
      userRole: payload.role,
      changes: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    apiLogger.error('Error updating project', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

// ============================================
// DELETE /api/projects/:id - 删除项目 (需要管理员权限)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    // CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 认证检查 - 必须登录
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to delete projects'
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired token', 
          code: 'AUTH_INVALID',
          message: 'Please log in again'
        },
        { status: 401 }
      );
    }

    // 管理员权限检查
    if (!isAdmin(payload)) {
      return NextResponse.json(
        { 
          error: 'Admin access required', 
          code: 'ADMIN_REQUIRED',
          message: 'Only administrators can delete projects',
          userRole: payload.role
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const projectIndex = projects.findIndex(project => project.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const deletedProject = projects[projectIndex];
    projects.splice(projectIndex, 1);

    apiLogger.audit('Project deleted by admin', {
      projectId: deletedProject.id,
      deletedBy: payload.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
      data: deletedProject,
    });
  } catch (error) {
    apiLogger.error('Error deleting project', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}
/**
 * 项目管理 API
 * 提供完整的 CRUD 操作，带认证和授权检查，支持与任务系统的集成
 */

import { NextRequest, NextResponse } from 'next/server';
import { Project, ProjectStatus, ProjectPriority } from '@/types/project-types';
import { Task } from '@/lib/types/task-types';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import { 
  projects, 
  getProjectById, 
  createProject, 
  updateProject, 
  deleteProject,
  getProjectsByStatus,
  getProjectsByPriority
} from '@/lib/data/projects';
import { getTasksByProjectId } from '@/lib/data/tasks';

// ============================================
// GET /api/projects - 获取项目列表
// 支持查询参数：status, priority, assignee
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as ProjectStatus | null;
    const priority = searchParams.get('priority') as ProjectPriority | null;
    const assignee = searchParams.get('assignee');

    let filteredProjects = [...projects];

    // 按状态过滤
    if (status) {
      filteredProjects = getProjectsByStatus(status);
    }

    // 按优先级过滤
    if (priority) {
      filteredProjects = getProjectsByPriority(priority);
    }

    // 按分配的团队成员过滤
    if (assignee) {
      filteredProjects = filteredProjects.filter(project => 
        project.teamMembers?.includes(assignee)
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

// ============================================
// POST /api/projects - 创建项目
// 需要认证，支持完整的项目元数据
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
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Project name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
      return NextResponse.json(
        { error: 'Project description is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // 验证状态
    const validStatuses: ProjectStatus[] = ['active', 'completed', 'paused'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid project status. Valid values: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // 验证优先级
    const validPriorities: ProjectPriority[] = ['low', 'medium', 'high', 'critical'];
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid project priority. Valid values: ${validPriorities.join(', ')}` },
        { status: 400 }
      );
    }

    // 验证团队成员（如果提供）
    let teamMembers: string[] = [];
    if (body.teamMembers) {
      if (!Array.isArray(body.teamMembers)) {
        return NextResponse.json(
          { error: 'teamMembers must be an array of strings' },
          { status: 400 }
        );
      }
      teamMembers = body.teamMembers.filter(member => typeof member === 'string' && member.trim());
    }

    const newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> = {
      name: body.name.trim(),
      description: body.description.trim(),
      status: body.status || 'active',
      priority: body.priority || 'medium',
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      teamMembers: teamMembers,
      metadata: body.metadata || {},
    };

    const createdProject = createProject(newProject);

    apiLogger.audit('Project created', {
      projectId: createdProject.id,
      createdBy: payload.email,
      userRole: payload.role,
    });

    return NextResponse.json({
      success: true,
      data: createdProject,
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
// GET /api/projects/:id - 获取项目详情
// ============================================

export async function GET_PROJECT_BY_ID(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

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

    const { pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // 验证项目是否存在
    const existingProject = getProjectById(id);
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // 验证更新数据
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json(
          { error: 'Project name must be a non-empty string' },
          { status: 400 }
        );
      }
    }

    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || !body.description.trim()) {
        return NextResponse.json(
          { error: 'Project description must be a non-empty string' },
          { status: 400 }
        );
      }
    }

    // 验证状态
    const validStatuses: ProjectStatus[] = ['active', 'completed', 'paused'];
    if (body.status !== undefined && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid project status. Valid values: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // 验证优先级
    const validPriorities: ProjectPriority[] = ['low', 'medium', 'high', 'critical'];
    if (body.priority !== undefined && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid project priority. Valid values: ${validPriorities.join(', ')}` },
        { status: 400 }
      );
    }

    // 验证团队成员
    let teamMembers: string[] | undefined = undefined;
    if (body.teamMembers !== undefined) {
      if (!Array.isArray(body.teamMembers)) {
        return NextResponse.json(
          { error: 'teamMembers must be an array of strings' },
          { status: 400 }
        );
      }
      teamMembers = body.teamMembers.filter(member => typeof member === 'string' && member.trim());
    }

    const updateData: Partial<Project> = {
      name: body.name?.trim(),
      description: body.description?.trim(),
      status: body.status,
      priority: body.priority,
      startDate: body.startDate,
      endDate: body.endDate,
      teamMembers: teamMembers,
      metadata: body.metadata,
    };

    // 移除 undefined 值
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const updatedProject = updateProject(id, updateData);

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

    const { pathname } = new URL(request.url);
    const id = pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const deletedProject = deleteProject(id);
    if (!deletedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

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

// ============================================
// GET /api/projects/:id/tasks - 获取项目相关任务
// ============================================

export async function GET_PROJECT_TASKS(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const id = pathname.split('/').slice(0, -1).pop(); // 获取 /api/projects/:id 部分

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // 验证项目是否存在
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

// ============================================
// 动态路由处理
// ============================================

export {
  GET_PROJECT_BY_ID as GET_PROJECT,
  GET_PROJECT_TASKS as GET_PROJECT_TASKS_ROUTE
};
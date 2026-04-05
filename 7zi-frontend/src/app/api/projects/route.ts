/**
 * Project Management API Route
 *
 * 演示资源级别权限控制和速率限制
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  UserWithRoles,
  createUserWithRoles,
  RequirePermission,
  RequireRoleLevel,
  ResourceType,
  ActionType,
  PermissionDeniedError,
  Permissions,
  PermissionContext,
  canAccessResource,
} from '@/lib/permissions'
import { UserRole } from '@/lib/auth'
import {
  createSuccessResponse,
  createUnauthorizedError,
  createForbiddenError,
  createNotFoundError,
  createErrorResponse,
  ErrorType,
} from '@/lib/api/error-handler'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api-rate-limit'
import { withCSRF } from '@/lib/middleware/csrf'

/**
 * API 上下文
 */
interface ApiContext {
  user: UserWithRoles
  request: NextRequest
  params?: Record<string, string>
}

/**
 * 模拟的用户数据
 */
const users: Record<string, UserWithRoles> = {
  'user-1': createUserWithRoles(
    {
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ['super_admin']
  ),
  'user-2': createUserWithRoles(
    {
      id: 'user-2',
      username: 'team_leader',
      email: 'team_leader@example.com',
      role: UserRole.USER,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ['team_leader']
  ),
  'user-3': createUserWithRoles(
    {
      id: 'user-3',
      username: 'developer',
      email: 'developer@example.com',
      role: UserRole.USER,
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ['developer']
  ),
}

/**
 * 模拟的项目数据
 */
interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

interface ProjectCreateData {
  name: string
  description: string
}

const projects: Record<string, Project> = {
  'project-1': {
    id: 'project-1',
    name: 'Alpha Project',
    description: 'First project',
    ownerId: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  'project-2': {
    id: 'project-2',
    name: 'Beta Project',
    description: 'Second project',
    ownerId: 'user-3',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

/**
 * GET /api/projects - 列出所有项目
 * 需要 project:read 权限
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'user-3'
    const user = users[userId]

    if (!user) {
      return createUnauthorizedError('User not found')
    }

    const ctx: ApiContext = { user, request }
    const projectController = new ProjectController()

    return await projectController.listProjects(ctx)
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return createForbiddenError(error.message, {
        requiredPermissions: error.requiredPermissions,
        missingPermissions: error.missingPermissions,
      })
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * POST /api/projects - 创建新项目
 * 需要 project:create 权限
 * 速率限制：100 请求/分钟
 * Requires CSRF protection
 */
export const POST = withRateLimit(RATE_LIMIT_PRESETS.relaxed, withCSRF(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id') || 'user-3'
    const user = users[userId]

    if (!user) {
      return createUnauthorizedError('User not found')
    }

    const ctx: ApiContext = { user, request }
    const projectController = new ProjectController()

    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(new Error('Invalid JSON'), 400, {})
    }

    // Validate required fields
    if (!body || typeof body !== 'object') {
      return createErrorResponse(new Error('Invalid request body'), 400, {})
    }

    const data = body as ProjectCreateData

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return createErrorResponse(new Error('Project name is required'), 400, {})
    }

    return await projectController.createProject(ctx, data)
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return createForbiddenError(error.message, {
        requiredPermissions: error.requiredPermissions,
        missingPermissions: error.missingPermissions,
      })
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}))

/**
 * 项目控制器类
 */
class ProjectController {
  /**
   * 列出所有项目 - 需要 project:read 权限
   */
  @RequirePermission(ResourceType.PROJECT, ActionType.READ)
  async listProjects(ctx: ApiContext): Promise<NextResponse> {
    const { user } = ctx

    // 实际业务逻辑：根据权限过滤项目
    // 这里简单返回所有项目
    const projectList = Object.values(projects).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      ownerId: p.ownerId,
      isOwner: p.ownerId === user.id,
    }))

    return createSuccessResponse(projectList)
  }

  /**
   * 创建新项目 - 需要 project:create 权限
   */
  @RequirePermission(ResourceType.PROJECT, ActionType.CREATE)
  async createProject(ctx: ApiContext, projectData: unknown): Promise<NextResponse> {
    const { user } = ctx

    const data = projectData as ProjectCreateData

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: data.name,
      description: data.description,
      ownerId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    projects[newProject.id] = newProject

    return createSuccessResponse(newProject, 201)
  }

  /**
   * 更新项目 - 需要 project:update 权限，并且必须是项目所有者或管理员
   */
  async updateProject(ctx: ApiContext, projectId: string, updates: unknown): Promise<NextResponse> {
    const { user } = ctx

    const project = projects[projectId]
    if (!project) {
      return createNotFoundError('Project not found')
    }

    // 检查权限（资源级别）
    const permissionContext: PermissionContext = {
      userId: user.id,
      resourceOwnerId: project.ownerId,
      resourceId: projectId,
      resourceType: ResourceType.PROJECT,
    }

    // 如果是项目所有者或超级管理员，允许更新
    if (project.ownerId === user.id || user.roles.some(r => r.level >= 100)) {
      const updatedProject = {
        ...project,
        ...(updates as Partial<Project>),
        updatedAt: new Date(),
      }

      projects[projectId] = updatedProject

      return createSuccessResponse(updatedProject)
    }

    // 否则检查是否有 project:manage 权限
    const permissionCheck = canAccessResource(
      user,
      ResourceType.PROJECT,
      ActionType.UPDATE,
      permissionContext
    )

    if (!permissionCheck.allowed) {
      throw new PermissionDeniedError(
        permissionCheck.requiredPermissions,
        permissionCheck.missingPermissions,
        permissionCheck.reason
      )
    }

    // 执行更新
    const updatedProject = {
      ...project,
      ...(updates as Partial<Project>),
      updatedAt: new Date(),
    }

    projects[projectId] = updatedProject

    return createSuccessResponse(updatedProject)
  }

  /**
   * 删除项目 - 需要 project:delete 权限，并且必须是项目所有者或管理员
   */
  async deleteProject(ctx: ApiContext, projectId: string): Promise<NextResponse> {
    const { user } = ctx

    const project = projects[projectId]
    if (!project) {
      return createNotFoundError('Project not found')
    }

    // 检查权限（资源级别）
    const permissionContext: PermissionContext = {
      userId: user.id,
      resourceOwnerId: project.ownerId,
      resourceId: projectId,
      resourceType: ResourceType.PROJECT,
    }

    // 如果是项目所有者或超级管理员，允许删除
    if (project.ownerId === user.id || user.roles.some(r => r.level >= 100)) {
      delete projects[projectId]

      return createSuccessResponse({
        message: `Project ${projectId} deleted`,
      })
    }

    // 否则检查是否有 project:delete 权限
    const permissionCheck = canAccessResource(
      user,
      ResourceType.PROJECT,
      ActionType.DELETE,
      permissionContext
    )

    if (!permissionCheck.allowed) {
      throw new PermissionDeniedError(
        permissionCheck.requiredPermissions,
        permissionCheck.missingPermissions,
        permissionCheck.reason
      )
    }

    // 执行删除
    delete projects[projectId]

    return createSuccessResponse({
      message: `Project ${projectId} deleted`,
    })
  }

  /**
   * 管理项目 - 需要角色等级 >= 60（团队负责人级别）
   */
  @RequireRoleLevel(60)
  async manageProject(ctx: ApiContext, projectId: string): Promise<NextResponse> {
    const { user } = ctx

    const project = projects[projectId]
    if (!project) {
      return createNotFoundError('Project not found')
    }

    return createSuccessResponse({
      project,
      canManage: true,
    })
  }

  /**
   * 导出项目数据 - 需要 data:export 权限
   */
  @RequirePermission(ResourceType.DATA, ActionType.EXPORT)
  async exportProject(ctx: ApiContext, projectId: string): Promise<NextResponse> {
    const { user } = ctx

    const project = projects[projectId]
    if (!project) {
      return createNotFoundError('Project not found')
    }

    return createSuccessResponse(project)
  }

  /**
   * 获取单个项目 - 需要 project:read 权限
   */
  async getProject(ctx: ApiContext, projectId: string): Promise<NextResponse> {
    const { user } = ctx

    const project = projects[projectId]
    if (!project) {
      return createNotFoundError('Project not found')
    }

    // 检查项目读取权限
    const permissionContext: PermissionContext = {
      userId: user.id,
      resourceOwnerId: project.ownerId,
      resourceId: projectId,
      resourceType: ResourceType.PROJECT,
    }

    // 项目所有者或管理员可以读取
    if (project.ownerId === user.id || user.roles.some(r => r.level >= 100)) {
      return createSuccessResponse(project)
    }

    // 否则检查是否有 project:read 权限
    const permissionCheck = canAccessResource(
      user,
      ResourceType.PROJECT,
      ActionType.READ,
      permissionContext
    )

    if (!permissionCheck.allowed) {
      throw new PermissionDeniedError(
        permissionCheck.requiredPermissions,
        permissionCheck.missingPermissions,
        permissionCheck.reason
      )
    }

    return createSuccessResponse(project)
  }
}

/**
 * 单个项目路由: GET /api/projects/[id]
 */
export async function getProject(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id') || 'user-3'
    const user = users[userId]

    if (!user) {
      return createUnauthorizedError('User not found')
    }

    const ctx: ApiContext = { user, request, params }
    const projectController = new ProjectController()

    return await projectController.getProject(ctx, params.id)
  } catch (error) {
    if (error instanceof PermissionDeniedError) {
      return createForbiddenError(error.message, {
        requiredPermissions: error.requiredPermissions,
        missingPermissions: error.missingPermissions,
      })
    }

    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}

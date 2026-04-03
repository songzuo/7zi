/**
 * v1.12.0 Fine-Grained RBAC Middleware
 * 细粒度权限检查中间件
 */

import { NextRequest, NextResponse } from 'next/server'
import { ResourceType, ActionType, PermissionCheckRequest, PermissionCheckResultV2 } from './types'
import { PermissionEngine, createPermissionEngine } from './engine'
import { AuditLogManager, createAuditLogManager } from './audit'
import { getUserPermissionContextV2, getPermissions } from './repository-v2'
import { logger } from '../logger'

/**
 * 中间件配置
 */
interface MiddlewareConfig {
  /** 权限引擎 */
  engine?: PermissionEngine
  /** 审计日志管理器 */
  auditManager?: AuditLogManager
  /** 是否返回详细错误 */
  detailedErrors?: boolean
  /** 是否启用性能监控 */
  enableProfiling?: boolean
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MiddlewareConfig = {
  detailedErrors: false,
  enableProfiling: false,
}

/**
 * 创建错误响应
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

/**
 * 创建未授权响应
 */
function createUnauthorizedResponse(): NextResponse {
  return createErrorResponse('Authentication required', 'UNAUTHORIZED', 401)
}

/**
 * 创建禁止访问响应
 */
function createForbiddenResponse(reason?: string): NextResponse {
  return createErrorResponse(
    reason || 'Insufficient permissions',
    'FORBIDDEN',
    403
  )
}

/**
 * 从请求中提取用户上下文
 */
async function extractUserContext(request: NextRequest): Promise<{
  userId: string
  roles: string[]
  permissions: string[]
  customPermissions?: string[]
  tenantId?: string
  teamIds?: string[]
} | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  if (!token || token.length < 10) {
    return null
  }

  try {
    const { authenticateToken } = await import('../auth/service')
    const authResult = await authenticateToken(token)

    if (!authResult) {
      return null
    }

    const { user } = authResult

    // 获取完整的权限上下文
    const permissionContext = await getUserPermissionContextV2(user.id)

    if (!permissionContext) {
      return null
    }

    return {
      userId: user.id,
      roles: user.roles || [],
      permissions: user.permissions || [],
      customPermissions: user.customPermissions,
      tenantId: user.tenantId,
      teamIds: permissionContext.teamIds,
    }
  } catch (error) {
    logger.error('Failed to extract user context from request', error)
    return null
  }
}

/**
 * 从请求中提取资源上下文
 */
function extractResourceContext(
  request: NextRequest,
  resourceType: ResourceType,
  resourceIdParam: string = 'id'
): {
  resourceType: ResourceType
  resourceId: string
  attributes: Record<string, unknown>
} {
  const url = new URL(request.url)
  const resourceId = url.pathname.split('/').pop() || url.searchParams.get(resourceIdParam) || ''

  // 从请求体或查询参数中提取资源属性
  let attributes: Record<string, unknown> = {}

  try {
    if (request.method !== 'GET') {
      const body = request.clone()
      const json = body.json()
      attributes = (await json) as Record<string, unknown> || {}
    }

    // 添加查询参数作为属性
    url.searchParams.forEach((value, key) => {
      attributes[key] = value
    })
  } catch {
    // 忽略解析错误
  }

  return {
    resourceType,
    resourceId,
    attributes,
  }
}

/**
 * 细粒度权限检查中间件
 */
export function withFineGrainedPermission(
  resourceType: ResourceType,
  action: ActionType,
  config: Partial<MiddlewareConfig> = {}
) {
  const middlewareConfig = { ...DEFAULT_CONFIG, ...config }
  const engine = middlewareConfig.engine || createPermissionEngine()
  const auditManager = middlewareConfig.auditManager || createAuditLogManager()

  return async (
    request: NextRequest,
    handler: (request: NextRequest, userContext: any) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const startTime = performance.now()

    try {
      // 1. 提取用户上下文
      const userContext = await extractUserContext(request)
      if (!userContext) {
        return createUnauthorizedResponse()
      }

      // 2. 提取资源上下文
      const resourceContext = extractResourceContext(request, resourceType)

      // 3. 获取所有权限
      const allPermissions = await getPermissions()

      // 4. 构建权限检查请求
      const checkRequest: PermissionCheckRequest = {
        user: {
          userId: userContext.userId,
          roles: userContext.roles,
          permissions: userContext.permissions,
          customPermissions: userContext.customPermissions,
          tenantId: userContext.tenantId,
          teamIds: userContext.teamIds,
          attributes: {
            userId: userContext.userId,
            roles: userContext.roles,
            tenantId: userContext.tenantId,
            teamIds: userContext.teamIds,
          },
        },
        resource: {
          ...resourceContext,
          attributes: {
            ...resourceContext.attributes,
            resourceType,
            id: resourceContext.resourceId,
          },
        },
        action,
      }

      // 5. 执行权限检查
      const checkResult: PermissionCheckResultV2 = await engine.checkPermission(
        checkRequest,
        allPermissions
      )

      // 6. 性能监控
      if (middlewareConfig.enableProfiling) {
        const elapsed = performance.now() - startTime
        logger.info('Permission check completed', {
          elapsedMs: elapsed,
          allowed: checkResult.allowed,
          source: checkResult.source,
          resourceType,
          action,
          userId: userContext.userId,
        })

        // 警告：如果检查时间超过 1ms
        if (elapsed > 1) {
          logger.warn('Permission check exceeded 1ms threshold', {
            elapsedMs: elapsed,
            resourceType,
            action,
            userId: userContext.userId,
          })
        }
      }

      // 7. 记录审计日志
      await auditManager.logCheck(checkRequest, checkResult)

      // 8. 检查结果
      if (!checkResult.allowed) {
        if (middlewareConfig.detailedErrors) {
          return createErrorResponse(
            checkResult.denyReason || 'Permission denied',
            'FORBIDDEN',
            403,
            {
              source: checkResult.source,
              missingPermissions: checkResult.missingPermissions,
              unmetConditions: checkResult.unmetConditions,
              matchedPermissionId: checkResult.matchedPermissionId,
            }
          )
        } else {
          return createForbiddenResponse(checkResult.denyReason)
        }
      }

      // 9. 调用处理函数
      return handler(request, {
        ...userContext,
        permissionCheckResult: checkResult,
      })
    } catch (error) {
      logger.error('Permission middleware error', error)

      return createErrorResponse(
        middlewareConfig.detailedErrors && error instanceof Error
          ? error.message
          : 'Internal server error',
        'INTERNAL_ERROR',
        500
      )
    }
  }
}

/**
 * 批量权限检查中间件
 */
export function withBatchPermissions(
  checks: Array<{
    resourceType: ResourceType
    action: ActionType
    resourceIdParam?: string
  }>,
  config: Partial<MiddlewareConfig> = {}
) {
  const middlewareConfig = { ...DEFAULT_CONFIG, ...config }
  const engine = middlewareConfig.engine || createPermissionEngine()
  const auditManager = middlewareConfig.auditManager || createAuditLogManager()

  return async (
    request: NextRequest,
    handler: (request: NextRequest, userContext: any, results: PermissionCheckResultV2[]) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const startTime = performance.now()

    try {
      // 1. 提取用户上下文
      const userContext = await extractUserContext(request)
      if (!userContext) {
        return createUnauthorizedResponse()
      }

      // 2. 获取所有权限
      const allPermissions = await getPermissions()

      // 3. 批量检查权限
      const results: PermissionCheckResultV2[] = []

      for (const check of checks) {
        const resourceContext = extractResourceContext(
          request,
          check.resourceType,
          check.resourceIdParam
        )

        const checkRequest: PermissionCheckRequest = {
          user: {
            userId: userContext.userId,
            roles: userContext.roles,
            permissions: userContext.permissions,
            customPermissions: userContext.customPermissions,
            tenantId: userContext.tenantId,
            teamIds: userContext.teamIds,
            attributes: {
              userId: userContext.userId,
              roles: userContext.roles,
              tenantId: userContext.tenantId,
              teamIds: userContext.teamIds,
            },
          },
          resource: resourceContext,
          action: check.action,
        }

        const checkResult = await engine.checkPermission(checkRequest, allPermissions)
        results.push(checkResult)
        await auditManager.logCheck(checkRequest, checkResult)
      }

      // 4. 检查是否所有权限都通过
      const allAllowed = results.every(r => r.allowed)

      if (!allAllowed) {
        return createErrorResponse(
          'One or more permissions are missing',
          'FORBIDDEN',
          403,
          {
            results: results.map(r => ({
              allowed: r.allowed,
              source: r.source,
              denyReason: r.denyReason,
            })),
          }
        )
      }

      // 5. 性能监控
      if (middlewareConfig.enableProfiling) {
        const elapsed = performance.now() - startTime
        logger.info('Batch permission check completed', {
          elapsedMs: elapsed,
          checkCount: checks.length,
          userId: userContext.userId,
        })
      }

      // 6. 调用处理函数
      return handler(request, userContext, results)
    } catch (error) {
      logger.error('Batch permission middleware error', error)

      return createErrorResponse(
        middlewareConfig.detailedErrors && error instanceof Error
          ? error.message
          : 'Internal server error',
        'INTERNAL_ERROR',
        500
      )
    }
  }
}

/**
 * 可选权限检查中间件 (不拒绝，只提供上下文)
 */
export function withOptionalPermission(
  resourceType: ResourceType,
  action: ActionType,
  config: Partial<MiddlewareConfig> = {}
) {
  const middlewareConfig = { ...DEFAULT_CONFIG, ...config }
  const engine = middlewareConfig.engine || createPermissionEngine()

  return async (
    request: NextRequest,
    handler: (request: NextRequest, userContext: any | null, checkResult: PermissionCheckResultV2 | null) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // 提取用户上下文（可选）
      const userContext = await extractUserContext(request)

      if (!userContext) {
        return handler(request, null, null)
      }

      // 获取所有权限
      const allPermissions = await getPermissions()

      // 提取资源上下文
      const resourceContext = extractResourceContext(request, resourceType)

      // 执行权限检查
      const checkRequest: PermissionCheckRequest = {
        user: {
          userId: userContext.userId,
          roles: userContext.roles,
          permissions: userContext.permissions,
          customPermissions: userContext.customPermissions,
          tenantId: userContext.tenantId,
          teamIds: userContext.teamIds,
          attributes: {
            userId: userContext.userId,
            roles: userContext.roles,
            tenantId: userContext.tenantId,
            teamIds: userContext.teamIds,
          },
        },
        resource: resourceContext,
        action,
      }

      const checkResult = await engine.checkPermission(checkRequest, allPermissions)

      // 调用处理函数（不拒绝）
      return handler(request, userContext, checkResult)
    } catch (error) {
      logger.error('Optional permission middleware error', error)

      // 出错时不拒绝，继续处理
      return handler(request, null, null)
    }
  }
}

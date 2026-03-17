/**
 * 智能体中间件
 * Agent Middleware - 验证智能体身份和权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAgentToken, hasPermission, hasAllPermissions } from '@/lib/agents/auth-service';
import { updateAgentLastActive } from '@/lib/agents/repository';
import { AgentApiResponse } from '@/lib/agent/types';

/**
 * 智能体认证中间件
 */
export async function withAgentAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AgentContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // 从 Header 获取 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Missing authorization header', 'UNAUTHORIZED', 401, requestId);
    }

    const token = authHeader.substring(7);
    const payload = await verifyAgentToken(token);

    if (!payload) {
      return createErrorResponse('Invalid or expired token', 'INVALID_TOKEN', 401, requestId);
    }

    // 更新最后活跃时间
    await updateAgentLastActive(payload.agentId);

    // 构建上下文
    const context: AgentContext = {
      agentId: payload.agentId,
      role: payload.role,
      permissions: payload.permissions,
      requestId,
    };

    // 执行处理器
    return handler(request, context);
  } catch (error) {
    console.error('Agent auth error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
      requestId
    );
  }
}

/**
 * 权限检查中间件
 */
export function withPermissions(...requiredPermissions: string[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: AgentContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withAgentAuth(request, async (req, context) => {
      const hasAll = requiredPermissions.every((p) => hasPermission(context.permissions, p));

      if (!hasAll) {
        return createErrorResponse(
          'Insufficient permissions',
          'FORBIDDEN',
          403,
          context.requestId
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * 任意权限检查中间件
 */
export function withAnyPermission(...permissions: string[]) {
  return async (
    request: NextRequest,
    handler: (request: NextRequest, context: AgentContext) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    return withAgentAuth(request, async (req, context) => {
      const hasAny = permissions.some((p) => hasPermission(context.permissions, p));

      if (!hasAny) {
        return createErrorResponse(
          'Insufficient permissions',
          'FORBIDDEN',
          403,
          context.requestId
        );
      }

      return handler(req, context);
    });
  };
}

/**
 * 智能体上下文
 */
export interface AgentContext {
  agentId: string;
  role: string;
  permissions: string[];
  requestId: string;
}

/**
 * 生成请求 ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建错误响应
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number,
  requestId: string
): NextResponse {
  const response: AgentApiResponse<null> = {
    success: false,
    error: {
      code,
      message,
    },
    requestId,
  };
  return NextResponse.json(response, { status });
}

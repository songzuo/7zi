/**
 * 智能体认证 API
 * Agent Authentication API
 * 
 * @openapi
 * /agent/auth/register:
 *   post:
 *     summary: 注册新智能体
 *     description: 创建新的智能体账户并获取 API Key
 *     tags:
 *       - Agent Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - role
 *               - provider
 *             properties:
 *               name:
 *                 type: string
 *                 description: 智能体名称
 *               role:
 *                 type: string
 *                 enum: [director, expert, consultant, architect, executor, admin, tester, designer, marketer, sales, finance, media]
 *                 description: 智能体角色
 *               provider:
 *                 type: string
 *                 enum: [minimax, bailian, volcengine, self-claude, openai, anthropic]
 *                 description: AI 提供商
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 权限列表
 *               metadata:
 *                 type: object
 *                 description: 元数据配置
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
 *                     apiKey:
 *                       type: string
 *                       description: API 密钥（仅显示一次）
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 * 
 * /agent/auth/login:
 *   post:
 *     summary: 智能体登录
 *     description: 使用 API Key 进行认证，获取访问令牌
 *     tags:
 *       - Agent Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agentId
 *               - apiKey
 *             properties:
 *               agentId:
 *                 type: string
 *                 description: 智能体 ID
 *               apiKey:
 *                 type: string
 *                 description: API 密钥
 *     responses:
 *       200:
 *         description: 认证成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
 *                     token:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: integer
 *                         tokenType:
 *                           type: string
 *       401:
 *         description: 认证失败
 * 
 * /agent/auth/refresh:
 *   post:
 *     summary: 刷新令牌
 *     description: 使用刷新令牌获取新的访问令牌
 *     tags:
 *       - Agent Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 刷新成功
 *       401:
 *         description: 刷新令牌无效
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerAgent, authenticateAgent, refreshAgentToken } from '@/lib/agents/auth-service';
import { AgentRole, AgentProvider, AgentApiResponse } from '@/lib/agent/types';
import { generateRequestId } from '@/lib/utils';

/**
 * POST /api/agent/auth/register
 * 注册新智能体
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { action, ...data } = body;

    // 根据 action 处理不同操作
    switch (action) {
      case 'register':
        return await handleRegister(data, requestId);
      case 'login':
        return await handleLogin(data, requestId);
      case 'refresh':
        return await handleRefresh(data, requestId);
      default:
        // 默认为登录（兼容旧版）
        if (data.agentId && data.apiKey) {
          return await handleLogin(data, requestId);
        }
        return createErrorResponse('Invalid action', 'INVALID_ACTION', 400, requestId);
    }
  } catch (error) {
    console.error('Agent auth error:', error);
    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      requestId
    );
  }
}

/**
 * 处理注册请求
 */
async function handleRegister(data: Record<string, unknown>, requestId: string): Promise<NextResponse> {
  // 验证必填字段
  if (!data.name || typeof data.name !== 'string') {
    return createErrorResponse('Name is required', 'MISSING_NAME', 400, requestId);
  }

  if (!data.role || !Object.values(AgentRole).includes(data.role as AgentRole)) {
    return createErrorResponse('Invalid role', 'INVALID_ROLE', 400, requestId);
  }

  if (!data.provider || !Object.values(AgentProvider).includes(data.provider as AgentProvider)) {
    return createErrorResponse('Invalid provider', 'INVALID_PROVIDER', 400, requestId);
  }

  const result = await registerAgent({
    name: data.name,
    role: data.role as AgentRole,
    provider: data.provider as AgentProvider,
    permissions: data.permissions as string[] | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
  });

  const response: AgentApiResponse = {
    success: true,
    data: {
      agent: {
        id: result.agent.id,
        name: result.agent.name,
        role: result.agent.role,
        provider: result.agent.provider,
        status: result.agent.status,
        permissions: result.agent.permissions,
        metadata: result.agent.metadata,
        createdAt: result.agent.createdAt,
      },
      apiKey: result.plainApiKey, // 仅在创建时返回
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return NextResponse.json(response, { status: 201 });
}

/**
 * 处理登录请求
 */
async function handleLogin(data: Record<string, unknown>, requestId: string): Promise<NextResponse> {
  if (!data.agentId || typeof data.agentId !== 'string') {
    return createErrorResponse('Agent ID is required', 'MISSING_AGENT_ID', 400, requestId);
  }

  if (!data.apiKey || typeof data.apiKey !== 'string') {
    return createErrorResponse('API Key is required', 'MISSING_API_KEY', 400, requestId);
  }

  const result = await authenticateAgent({
    agentId: data.agentId,
    apiKey: data.apiKey,
  });

  if (!result) {
    return createErrorResponse('Invalid credentials', 'INVALID_CREDENTIALS', 401, requestId);
  }

  const response: AgentApiResponse = {
    success: true,
    data: {
      agent: {
        id: result.agent.id,
        name: result.agent.name,
        role: result.agent.role,
        provider: result.agent.provider,
        status: result.agent.status,
        permissions: result.agent.permissions,
      },
      token: result.token,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return NextResponse.json(response);
}

/**
 * 处理刷新令牌请求
 */
async function handleRefresh(data: Record<string, unknown>, requestId: string): Promise<NextResponse> {
  if (!data.refreshToken || typeof data.refreshToken !== 'string') {
    return createErrorResponse('Refresh token is required', 'MISSING_REFRESH_TOKEN', 400, requestId);
  }

  const token = await refreshAgentToken(data.refreshToken);

  if (!token) {
    return createErrorResponse('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401, requestId);
  }

  const response: AgentApiResponse = {
    success: true,
    data: { token },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return NextResponse.json(response);
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
  const response: AgentApiResponse = {
    success: false,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return NextResponse.json(response, { status });
}

// 导出工具函数供其他模块使用
export { createErrorResponse };
/**
 * 智能体认证 API
 * Agent Authentication API
 * 
 * POST /api/agents/auth - 智能体认证，获取令牌
 * POST /api/agents/auth/refresh - 刷新令牌
 * POST /api/agents/auth/logout - 注销令牌
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createAgentToken,
  validateAgentApiKey,
  validateAgentToken,
  refreshAgentToken,
  revokeAgentToken,
} from '@/lib/agents';

/**
 * @openapi
 * /api/agents/auth:
 *   post:
 *     summary: 智能体认证
 *     description: 使用 agentId 和 apiKey 进行认证，获取访问令牌
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
 *                 description: 智能体 API Key
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 请求的权限范围
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
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 agent:
 *                   type: object
 *       401:
 *         description: 认证失败
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.agentId || !body.apiKey) {
      return NextResponse.json(
        { success: false, error: 'agentId and apiKey are required' },
        { status: 400 }
      );
    }

    // 验证 API Key
    const agent = await validateAgentApiKey(body.agentId, body.apiKey);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Invalid agentId or apiKey' },
        { status: 401 }
      );
    }

    // 创建令牌
    const scopes = body.scopes || ['read', 'write'];
    const token = await createAgentToken(agent.id, scopes, 30);

    // 不返回 apiKey
    const { ...agentWithoutKey } = agent;

    return NextResponse.json({
      success: true,
      token: token.token,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      agent: agentWithoutKey,
    });
  } catch (error) {
    console.error('Agent auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
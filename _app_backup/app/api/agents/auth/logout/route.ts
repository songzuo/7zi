/**
 * 智能体注销 API
 * Agent Logout API
 * 
 * POST /api/agents/auth/logout - 注销令牌
 */

import { NextRequest, NextResponse } from 'next/server';
import { revokeAgentToken } from '@/lib/agents';

/**
 * @openapi
 * /api/agents/auth/logout:
 *   post:
 *     summary: 注销令牌
 *     description: 撤销当前访问令牌
 *     tags:
 *       - Agent Auth
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 注销成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  try {
    // 从 Authorization header 获取 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const revoked = await revokeAgentToken(token);

    if (!revoked) {
      return NextResponse.json(
        { success: false, error: 'Token not found or already revoked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token revoked successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
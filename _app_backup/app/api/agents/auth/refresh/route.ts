/**
 * 智能体令牌刷新 API
 * Agent Token Refresh API
 * 
 * POST /api/agents/auth/refresh - 刷新访问令牌
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAgentToken } from '@/lib/agents';

/**
 * @openapi
 * /api/agents/auth/refresh:
 *   post:
 *     summary: 刷新令牌
 *     description: 使用 refresh token 获取新的访问令牌
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
 *       401:
 *         description: 无效的刷新令牌
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.refreshToken) {
      return NextResponse.json(
        { success: false, error: 'refreshToken is required' },
        { status: 400 }
      );
    }

    const token = await refreshAgentToken(body.refreshToken);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: token.token,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
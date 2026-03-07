/**
 * 钱包存款 API
 * Wallet Deposit API
 * 
 * POST /api/agents/wallet/deposit - 存款
 */

import { NextRequest, NextResponse } from 'next/server';
import { deposit, getWalletByAgentId } from '@/lib/agents';
import { validateAgentToken } from '@/lib/agents/repository';

/**
 * @openapi
 * /api/agents/wallet/deposit:
 *   post:
 *     summary: 钱包存款
 *     description: 向智能体钱包存入金额
 *     tags:
 *       - Agent Wallet
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: 存款金额
 *               agentId:
 *                 type: string
 *                 description: 目标智能体 ID（管理员操作时使用）
 *               description:
 *                 type: string
 *                 description: 存款说明
 *               metadata:
 *                 type: object
 *                 description: 元数据
 *     responses:
 *       200:
 *         description: 存款成功
 *       400:
 *         description: 参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  try {
    // 验证授权
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await validateAgentToken(token);
    
    if (!authResult) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 验证金额
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // 获取目标智能体 ID
    let targetAgentId = body.agentId || authResult.agent.id;
    
    // 如果操作其他智能体钱包，需要检查权限
    if (targetAgentId !== authResult.agent.id) {
      // TODO: 检查是否有权限操作其他智能体钱包
      // 目前只允许操作自己的钱包
      const hasAdminScope = authResult.token.scopes.includes('admin');
      if (!hasAdminScope) {
        return NextResponse.json(
          { success: false, error: 'No permission to operate on other agent wallet' },
          { status: 403 }
        );
      }
    }

    const transaction = await deposit(
      targetAgentId,
      body.amount,
      body.description,
      body.metadata
    );

    const wallet = await getWalletByAgentId(targetAgentId);

    return NextResponse.json({
      success: true,
      transaction,
      wallet,
    });
  } catch (error) {
    console.error('Deposit error:', error);
    const message = error instanceof Error ? error.message : 'Deposit failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
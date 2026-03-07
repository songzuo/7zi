/**
 * 钱包提款 API
 * Wallet Withdraw API
 * 
 * POST /api/agents/wallet/withdraw - 提款
 */

import { NextRequest, NextResponse } from 'next/server';
import { withdraw, getWalletByAgentId } from '@/lib/agents';
import { validateAgentToken } from '@/lib/agents/repository';

/**
 * @openapi
 * /api/agents/wallet/withdraw:
 *   post:
 *     summary: 钱包提款
 *     description: 从智能体钱包提取金额
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
 *                 description: 提款金额
 *               description:
 *                 type: string
 *                 description: 提款说明
 *               metadata:
 *                 type: object
 *                 description: 元数据
 *     responses:
 *       200:
 *         description: 提款成功
 *       400:
 *         description: 参数错误或余额不足
 *       401:
 *         description: 未授权
 *       404:
 *         description: 钱包不存在
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
    const agentId = authResult.agent.id;

    // 验证金额
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // 检查钱包是否存在
    const wallet = await getWalletByAgentId(agentId);
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const transaction = await withdraw(
      agentId,
      body.amount,
      body.description,
      body.metadata
    );

    const updatedWallet = await getWalletByAgentId(agentId);

    return NextResponse.json({
      success: true,
      transaction,
      wallet: updatedWallet,
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    const message = error instanceof Error ? error.message : 'Withdraw failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
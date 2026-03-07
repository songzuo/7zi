/**
 * 智能体钱包 API
 * Agent Wallet API
 * 
 * GET /api/agents/wallet - 获取钱包信息
 * POST /api/agents/wallet/deposit - 存款
 * POST /api/agents/wallet/withdraw - 提款
 * POST /api/agents/wallet/transfer - 转账
 * POST /api/agents/wallet/consume - 消费
 * POST /api/agents/wallet/reward - 奖励
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getWalletByAgentId,
  getWalletBalance,
  getTransactions,
  getWalletStats,
  deposit,
  withdraw,
  transfer,
  consume,
  reward,
  freezeBalance,
  unfreezeBalance,
  TransactionType,
  TransactionStatus,
} from '@/lib/agents';
import { validateAgentToken } from '@/lib/agents/repository';

/**
 * 验证智能体授权
 */
async function validateAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const result = await validateAgentToken(token);
  
  return result ? result.agent.id : null;
}

/**
 * @openapi
 * /api/agents/wallet:
 *   get:
 *     summary: 获取钱包信息
 *     description: 获取智能体钱包余额和统计信息
 *     tags:
 *       - Agent Wallet
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: 智能体 ID（管理员可指定）
 *       - in: query
 *         name: stats
 *         schema:
 *           type: boolean
 *         description: 是否返回详细统计
 *       - in: query
 *         name: transactions
 *         schema:
 *           type: boolean
 *         description: 是否返回交易记录
 *     responses:
 *       200:
 *         description: 成功返回钱包信息
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function GET(request: NextRequest) {
  try {
    // 验证授权
    const authAgentId = await validateAuth(request);
    if (!authAgentId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // 获取要查询的智能体 ID（默认为当前授权的智能体）
    let agentId = authAgentId;
    const requestedAgentId = searchParams.get('agentId');
    
    // 如果指定了其他智能体 ID，需要验证权限（这里简化处理，实际需要权限检查）
    if (requestedAgentId && requestedAgentId !== authAgentId) {
      // TODO: 检查是否有权限查看其他智能体钱包
      agentId = requestedAgentId;
    }

    const includeStats = searchParams.get('stats') === 'true';
    const includeTransactions = searchParams.get('transactions') === 'true';

    const wallet = await getWalletByAgentId(agentId);
    
    if (!wallet) {
      return NextResponse.json({
        success: true,
        wallet: null,
        balance: { balance: 0, frozen: 0, available: 0 },
        message: 'Wallet not found. Create one by making a deposit.',
      });
    }

    const response: Record<string, unknown> = {
      success: true,
      wallet,
      balance: await getWalletBalance(agentId),
    };

    if (includeStats) {
      response.stats = await getWalletStats(agentId);
    }

    if (includeTransactions) {
      const limit = parseInt(searchParams.get('limit') || '50');
      const type = searchParams.get('type') as TransactionType | null;
      const status = searchParams.get('status') as TransactionStatus | null;
      
      response.transactions = await getTransactions(agentId, {
        limit,
        type: type || undefined,
        status: status || undefined,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
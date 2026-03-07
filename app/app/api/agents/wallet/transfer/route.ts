/**
 * 钱包转账 API
 * Wallet Transfer API
 */

import { NextRequest, NextResponse } from 'next/server';
import { transfer, getWalletByAgentId } from '@/lib/agents';
import { validateAgentToken } from '@/lib/agents/repository';

/**
 * POST /api/agents/wallet/transfer - 转账
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authResult = await validateAgentToken(token);
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const fromAgentId = authResult.agent.id;

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount is required' }, { status: 400 });
    }

    if (!body.toAgentId) {
      return NextResponse.json({ success: false, error: 'toAgentId is required' }, { status: 400 });
    }

    if (body.toAgentId === fromAgentId) {
      return NextResponse.json({ success: false, error: 'Cannot transfer to the same wallet' }, { status: 400 });
    }

    const fromWallet = await getWalletByAgentId(fromAgentId);
    if (!fromWallet) {
      return NextResponse.json({ success: false, error: 'Source wallet not found' }, { status: 404 });
    }

    const transactions = await transfer(fromAgentId, body.toAgentId, body.amount, body.description, body.metadata);

    return NextResponse.json({
      success: true,
      fromTransaction: transactions.fromTransaction,
      toTransaction: transactions.toTransaction,
      fromWallet: await getWalletByAgentId(fromAgentId),
      toWallet: await getWalletByAgentId(body.toAgentId),
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Transfer failed' },
      { status: 500 }
    );
  }
}
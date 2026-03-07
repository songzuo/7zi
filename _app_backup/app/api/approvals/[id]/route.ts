/**
 * 审批操作 API 路由
 * Approval Action API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApprovalWorkflowService } from '@/lib/approval/workflow';
import { ApprovalRepository } from '@/lib/approval/repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/approvals/[id]
 * 获取审批详情
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const approval = ApprovalWorkflowService.getApproval(id);
    
    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    console.error('Error fetching approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approval' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals/[id]
 * 执行审批操作（批准/拒绝/取消）
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'user-1';
    
    const action = body.action;
    const comment = body.comment;
    const reason = body.reason;
    
    if (!action || !['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be: approve, reject, or cancel' },
        { status: 400 }
      );
    }
    
    let approval;
    
    switch (action) {
      case 'approve':
        approval = ApprovalWorkflowService.approve(id, userId, comment);
        break;
        
      case 'reject':
        if (!reason) {
          return NextResponse.json(
            { success: false, error: 'Reason is required for rejection' },
            { status: 400 }
          );
        }
        approval = ApprovalWorkflowService.reject(id, userId, reason);
        break;
        
      case 'cancel':
        approval = ApprovalWorkflowService.cancel(id, userId, reason);
        break;
    }
    
    return NextResponse.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    console.error('Error processing approval action:', error);
    const message = error instanceof Error ? error.message : 'Failed to process action';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/approvals/[id]
 * 删除审批请求（仅取消状态的可以删除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const approval = ApprovalRepository.get(id);
    
    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      );
    }
    
    // 只有取消状态的可以删除
    if (approval.status !== 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Only cancelled approvals can be deleted' },
        { status: 400 }
      );
    }
    
    ApprovalRepository.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Approval deleted',
    });
  } catch (error) {
    console.error('Error deleting approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete approval' },
      { status: 500 }
    );
  }
}
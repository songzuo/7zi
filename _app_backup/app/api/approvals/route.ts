/**
 * 审批系统 API 路由
 * Approval System API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApprovalWorkflowService } from '@/lib/approval/workflow';
import { ApprovalRepository } from '@/lib/approval/repository';
import {
  ApprovalType,
  ApprovalStatus,
  ApprovalPriority,
  CreateApprovalRequest,
  ApprovalListQuery,
} from '@/lib/approval/types';

/**
 * GET /api/approvals
 * 获取审批列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 从 header 获取用户信息
    const userId = request.headers.get('x-user-id') || 'user-1'; // 默认管理员
    
    // 构建查询参数
    const query: ApprovalListQuery = {
      status: searchParams.get('status')?.split(',') as ApprovalStatus[] | undefined,
      type: searchParams.get('type')?.split(',') as ApprovalType[] | undefined,
      requesterId: searchParams.get('requesterId') || undefined,
      approverId: searchParams.get('approverId') || undefined,
      priority: searchParams.get('priority') as ApprovalPriority | undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      sortBy: searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'priority' | undefined,
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' | undefined,
    };
    
    // 如果查询 "my-pending"，则获取待我审批的
    if (searchParams.get('my-pending') === 'true') {
      const pending = ApprovalWorkflowService.getPendingApprovals(userId);
      return NextResponse.json({
        success: true,
        data: pending,
      });
    }
    
    // 如果查询 "my-requests"，则获取我的申请
    if (searchParams.get('my-requests') === 'true') {
      const myRequests = ApprovalWorkflowService.getMyRequests(userId);
      return NextResponse.json({
        success: true,
        data: myRequests,
      });
    }
    
    // 如果查询 "stats"，则返回统计
    if (searchParams.get('stats') === 'true') {
      const stats = ApprovalWorkflowService.getStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }
    
    // 常规列表查询
    const result = ApprovalRepository.list(query);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approvals
 * 创建审批请求
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'user-4'; // 默认成员
    
    const createData: CreateApprovalRequest = {
      type: body.type as ApprovalType,
      priority: body.priority as ApprovalPriority,
      title: body.title,
      description: body.description,
      data: body.data || {},
      requestedPermission: body.requestedPermission,
      requestedRole: body.requestedRole,
      expiresAt: body.expiresAt,
      approverIds: body.approverIds,
    };
    
    // 验证必填字段
    if (!createData.type || !createData.title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title' },
        { status: 400 }
      );
    }
    
    const approval = ApprovalWorkflowService.createRequest(createData, userId);
    
    return NextResponse.json({
      success: true,
      data: approval,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create approval' },
      { status: 500 }
    );
  }
}
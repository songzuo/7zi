/**
 * 审批工作流配置 API
 * Approval Workflow Configuration API
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApprovalWorkflowService } from '@/lib/approval/workflow';
import { ApprovalWorkflowConfig } from '@/lib/approval/types';

/**
 * GET /api/approvals/workflows
 * 获取所有工作流配置
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type) {
      // 获取特定类型的配置
      const config = ApprovalWorkflowService.getWorkflowConfig(type as any);
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Workflow config not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: config,
      });
    }
    
    // 获取所有配置
    const configs = ApprovalWorkflowService.getAllWorkflowConfigs();
    
    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Error fetching workflow configs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow configs' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/approvals/workflows
 * 更新工作流配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const config: ApprovalWorkflowConfig = {
      type: body.type,
      name: body.name,
      description: body.description,
      approverStrategy: body.approverStrategy,
      autoApproverRoles: body.autoApproverRoles,
      minApprovers: body.minApprovers,
      requireAllApprovers: body.requireAllApprovers,
      defaultExpiryHours: body.defaultExpiryHours,
      autoApproveOnExpiry: body.autoApproveOnExpiry,
      notifyRequester: body.notifyRequester,
      notifyApprovers: body.notifyApprovers,
    };
    
    if (!config.type || !config.name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, name' },
        { status: 400 }
      );
    }
    
    ApprovalWorkflowService.updateWorkflowConfig(config);
    
    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error updating workflow config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow config' },
      { status: 500 }
    );
  }
}
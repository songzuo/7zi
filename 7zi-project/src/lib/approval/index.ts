/**
 * 审批系统模块导出
 * Approval System Module Exports
 */

// 类型导出
export * from './types';

// 权限类型导入
import { Permission } from '../permissions/types';

// 工作流服务导出
export { ApprovalWorkflowService } from './workflow';

// 便捷函数
import { ApprovalWorkflowService } from './workflow';
import {
  ApprovalRequest,
  ApprovalType,
} from './types';

/**
 * 检查操作是否需要审批
 */
export function requiresApproval(type: ApprovalType, _permission?: Permission): boolean {
  return ApprovalWorkflowService.requiresApproval(type);
}

/**
 * 快速创建审批请求
 */
export function createApprovalRequest(
  type: ApprovalType,
  title: string,
  description: string,
  data: Record<string, unknown>,
  requesterId: string
): ApprovalRequest {
  return ApprovalWorkflowService.createRequest(
    { type, title, description, data },
    requesterId
  );
}

/**
 * 获取待审批列表
 */
export function getPendingApprovals(approverId: string): ApprovalRequest[] {
  return ApprovalWorkflowService.getPendingApprovals(approverId);
}

/**
 * 获取我的申请
 */
export function getMyRequests(requesterId: string): ApprovalRequest[] {
  return ApprovalWorkflowService.getMyRequests(requesterId);
}

/**
 * 批准
 */
export function approveApproval(approvalId: string, approverId: string, comment?: string): ApprovalRequest {
  return ApprovalWorkflowService.approve(approvalId, approverId, comment);
}

/**
 * 拒绝
 */
export function rejectApproval(approvalId: string, approverId: string, reason: string): ApprovalRequest {
  return ApprovalWorkflowService.reject(approvalId, approverId, reason);
}

/**
 * 取消
 */
export function cancelApproval(approvalId: string, requesterId: string, reason?: string): ApprovalRequest {
  return ApprovalWorkflowService.cancel(approvalId, requesterId, reason);
}
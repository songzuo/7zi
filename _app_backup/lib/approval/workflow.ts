/**
 * 审批工作流服务
 * Approval Workflow Service
 */

import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
  ApprovalWorkflowConfig,
  CreateApprovalRequest,
  DEFAULT_WORKFLOW_CONFIGS,
  SENSITIVE_PERMISSIONS,
} from './types';
import { ApprovalRepository } from './repository';
import { Permission, Role } from '../permissions/types';

/**
 * 工作流配置存储
 */
class WorkflowConfigStore {
  private configs: Map<ApprovalType, ApprovalWorkflowConfig> = new Map();

  constructor() {
    // 加载默认配置
    for (const config of DEFAULT_WORKFLOW_CONFIGS) {
      this.configs.set(config.type, config);
    }
  }

  get(type: ApprovalType): ApprovalWorkflowConfig | undefined {
    return this.configs.get(type);
  }

  set(config: ApprovalWorkflowConfig): void {
    this.configs.set(config.type, config);
  }

  getAll(): ApprovalWorkflowConfig[] {
    return Array.from(this.configs.values());
  }
}

const workflowConfigStore = new WorkflowConfigStore();

/**
 * 模拟用户服务（实际应从用户服务获取）
 */
interface UserInfo {
  id: string;
  name: string;
  role: Role;
}

// 模拟用户数据
const mockUsers: Map<string, UserInfo> = new Map([
  ['user-1', { id: 'user-1', name: '管理员', role: Role.ADMIN }],
  ['user-2', { id: 'user-2', name: '经理A', role: Role.MANAGER }],
  ['user-3', { id: 'user-3', name: '经理B', role: Role.MANAGER }],
  ['user-4', { id: 'user-4', name: '成员A', role: Role.MEMBER }],
  ['user-5', { id: 'user-5', name: '成员B', role: Role.MEMBER }],
]);

/**
 * 审批工作流服务
 */
export class ApprovalWorkflowService {
  /**
   * 检查操作是否需要审批
   */
  static requiresApproval(
    type: ApprovalType,
    permission?: Permission
  ): boolean {
    // 检查权限是否在敏感权限列表中
    if (permission && SENSITIVE_PERMISSIONS.includes(permission)) {
      return true;
    }

    // 检查操作类型是否有工作流配置
    const config = workflowConfigStore.get(type);
    return !!config;
  }

  /**
   * 创建审批请求
   */
  static createRequest(
    data: CreateApprovalRequest,
    requesterId: string
  ): ApprovalRequest {
    // 获取请求人信息
    const requester = mockUsers.get(requesterId);
    if (!requester) {
      throw new Error(`User not found: ${requesterId}`);
    }

    // 获取工作流配置
    const config = workflowConfigStore.get(data.type);
    
    // 设置默认过期时间
    if (!data.expiresAt && config?.defaultExpiryHours) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + config.defaultExpiryHours);
      data.expiresAt = expiryDate.toISOString();
    }

    // 创建审批请求
    const request = ApprovalRepository.create(
      data,
      requesterId,
      requester.name
    );

    // 自动选择审批人
    if (config && config.approverStrategy === 'role-based') {
      this.assignApprovers(request, config);
    }

    return request;
  }

  /**
   * 分配审批人
   */
  private static assignApprovers(
    request: ApprovalRequest,
    config: ApprovalWorkflowConfig
  ): void {
    if (!config.autoApproverRoles) return;

    // 查找符合角色的用户
    const approvers = Array.from(mockUsers.values())
      .filter(user => 
        config.autoApproverRoles!.includes(user.role) &&
        user.id !== request.requesterId
      )
      .slice(0, config.minApprovers || 1);

    // 添加审批人
    for (let i = 0; i < approvers.length; i++) {
      ApprovalRepository.addApprover(request.id, {
        userId: approvers[i].id,
        userName: approvers[i].name,
        status: ApprovalStatus.PENDING,
        order: i,
      });
    }

    // 更新总步骤数
    ApprovalRepository.update(request.id, {
      totalSteps: approvers.length,
    });
  }

  /**
   * 批准审批
   */
  static approve(
    approvalId: string,
    approverId: string,
    comment?: string
  ): ApprovalRequest {
    const request = ApprovalRepository.get(approvalId);
    if (!request) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval is not pending: ${request.status}`);
    }

    // 检查是否是审批人
    const approver = request.approvers.find(a => a.userId === approverId);
    if (!approver) {
      throw new Error(`User is not an approver: ${approverId}`);
    }

    if (approver.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approver has already acted: ${approver.status}`);
    }

    const approverInfo = mockUsers.get(approverId);
    return ApprovalRepository.approve(
      approvalId,
      approverId,
      approverInfo?.name || 'Unknown',
      comment
    )!;
  }

  /**
   * 拒绝审批
   */
  static reject(
    approvalId: string,
    approverId: string,
    reason: string
  ): ApprovalRequest {
    const request = ApprovalRepository.get(approvalId);
    if (!request) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval is not pending: ${request.status}`);
    }

    // 检查是否是审批人
    const approver = request.approvers.find(a => a.userId === approverId);
    if (!approver) {
      throw new Error(`User is not an approver: ${approverId}`);
    }

    if (approver.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approver has already acted: ${approver.status}`);
    }

    const approverInfo = mockUsers.get(approverId);
    return ApprovalRepository.reject(
      approvalId,
      approverId,
      approverInfo?.name || 'Unknown',
      reason
    )!;
  }

  /**
   * 取消审批（仅申请人可取消）
   */
  static cancel(approvalId: string, requesterId: string, reason?: string): ApprovalRequest {
    const request = ApprovalRepository.get(approvalId);
    if (!request) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    if (request.requesterId !== requesterId) {
      throw new Error('Only requester can cancel');
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval is not pending: ${request.status}`);
    }

    return ApprovalRepository.cancel(approvalId, reason)!;
  }

  /**
   * 获取待审批列表
   */
  static getPendingApprovals(approverId: string): ApprovalRequest[] {
    return ApprovalRepository.getPendingForApprover(approverId);
  }

  /**
   * 获取我的申请
   */
  static getMyRequests(requesterId: string): ApprovalRequest[] {
    return ApprovalRepository.getByRequester(requesterId);
  }

  /**
   * 获取审批详情
   */
  static getApproval(approvalId: string): ApprovalRequest | null {
    return ApprovalRepository.get(approvalId);
  }

  /**
   * 获取工作流配置
   */
  static getWorkflowConfig(type: ApprovalType): ApprovalWorkflowConfig | undefined {
    return workflowConfigStore.get(type);
  }

  /**
   * 更新工作流配置
   */
  static updateWorkflowConfig(config: ApprovalWorkflowConfig): void {
    workflowConfigStore.set(config);
  }

  /**
   * 获取所有工作流配置
   */
  static getAllWorkflowConfigs(): ApprovalWorkflowConfig[] {
    return workflowConfigStore.getAll();
  }

  /**
   * 获取审批统计
   */
  static getStats() {
    return ApprovalRepository.getStats();
  }

  /**
   * 执行已批准的操作
   * 这个方法应该在审批通过后调用，执行实际的操作
   */
  static async executeApprovedAction(request: ApprovalRequest): Promise<boolean> {
    if (request.status !== ApprovalStatus.APPROVED) {
      throw new Error('Approval is not approved');
    }

    // 根据审批类型执行不同操作
    switch (request.type) {
      case ApprovalType.PERMISSION_REQUEST:
        // 授予权限
        console.log(`Granting permission ${request.requestedPermission} to user ${request.requesterId}`);
        // 实际应调用权限服务
        return true;

      case ApprovalType.ROLE_CHANGE:
        // 变更角色
        console.log(`Changing role to ${request.requestedRole} for user ${request.requesterId}`);
        // 实际应调用用户服务
        return true;

      case ApprovalType.DELETE_TASK:
        // 删除任务
        console.log(`Deleting task: ${request.data.taskId}`);
        return true;

      case ApprovalType.DELETE_USER:
        // 删除用户
        console.log(`Deleting user: ${request.data.targetUserId}`);
        return true;

      case ApprovalType.BATCH_OPERATION:
        // 执行批量操作
        console.log(`Executing batch operation: ${request.data.operation}`);
        return true;

      case ApprovalType.EXPORT_DATA:
        // 导出数据
        console.log(`Exporting data: ${request.data.exportType}`);
        return true;

      default:
        console.log(`Custom action execution for: ${request.type}`);
        return true;
    }
  }

  /**
   * 检查并处理过期审批
   */
  static checkExpiredApprovals(): ApprovalRequest[] {
    const expired = ApprovalRepository.checkExpired();
    
    // 可以在这里添加通知逻辑
    for (const request of expired) {
      console.log(`Approval expired: ${request.id}`);
    }

    return expired;
  }
}
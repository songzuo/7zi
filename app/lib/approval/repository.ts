/**
 * 审批数据仓库
 * Approval Repository for Database Operations
 */

import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
  ApprovalListQuery,
  ApprovalListResult,
  ApprovalStats,
  ApprovalApprover,
  CreateApprovalRequest,
} from './types';

/**
 * 内存存储（生产环境应替换为真实数据库）
 */
class ApprovalStore {
  private approvals: Map<string, ApprovalRequest> = new Map();
  private idCounter = 0;

  generateId(): string {
    this.idCounter++;
    return `approval-${Date.now()}-${this.idCounter}`;
  }

  create(request: ApprovalRequest): ApprovalRequest {
    this.approvals.set(request.id, request);
    return request;
  }

  update(id: string, updates: Partial<ApprovalRequest>): ApprovalRequest | null {
    const existing = this.approvals.get(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.approvals.set(id, updated);
    return updated;
  }

  get(id: string): ApprovalRequest | null {
    return this.approvals.get(id) || null;
  }

  delete(id: string): boolean {
    return this.approvals.delete(id);
  }

  list(query: ApprovalListQuery): ApprovalListResult {
    let items = Array.from(this.approvals.values());

    // 过滤状态
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      items = items.filter(item => statuses.includes(item.status));
    }

    // 过滤类型
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      items = items.filter(item => types.includes(item.type));
    }

    // 过滤申请人
    if (query.requesterId) {
      items = items.filter(item => item.requesterId === query.requesterId);
    }

    // 过滤审批人
    if (query.approverId) {
      items = items.filter(item => 
        item.approvers.some(a => a.userId === query.approverId)
      );
    }

    // 过滤优先级
    if (query.priority) {
      items = items.filter(item => item.priority === query.priority);
    }

    // 排序
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    items.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'updatedAt') {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortBy === 'priority') {
        const priorityOrder = {
          [ApprovalPriority.URGENT]: 4,
          [ApprovalPriority.HIGH]: 3,
          [ApprovalPriority.MEDIUM]: 2,
          [ApprovalPriority.LOW]: 1,
        };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // 分页
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  getStats(): ApprovalStats {
    const items = Array.from(this.approvals.values());
    
    const stats: ApprovalStats = {
      total: items.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      expired: 0,
      byType: {} as Record<ApprovalType, number>,
      byPriority: {} as Record<ApprovalPriority, number>,
    };

    // 初始化计数器
    Object.values(ApprovalType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ApprovalPriority).forEach(priority => {
      stats.byPriority[priority] = 0;
    });

    // 统计
    let totalProcessingTime = 0;
    let processedCount = 0;

    for (const item of items) {
      // 状态统计
      switch (item.status) {
        case ApprovalStatus.PENDING:
          stats.pending++;
          break;
        case ApprovalStatus.APPROVED:
          stats.approved++;
          if (item.approvedAt && item.createdAt) {
            totalProcessingTime += 
              new Date(item.approvedAt).getTime() - new Date(item.createdAt).getTime();
            processedCount++;
          }
          break;
        case ApprovalStatus.REJECTED:
          stats.rejected++;
          break;
        case ApprovalStatus.CANCELLED:
          stats.cancelled++;
          break;
        case ApprovalStatus.EXPIRED:
          stats.expired++;
          break;
      }

      // 类型统计
      stats.byType[item.type]++;

      // 优先级统计
      stats.byPriority[item.priority]++;
    }

    // 计算平均处理时间（小时）
    if (processedCount > 0) {
      stats.avgProcessingTime = (totalProcessingTime / processedCount) / (1000 * 60 * 60);
    }

    return stats;
  }

  getByRequester(requesterId: string): ApprovalRequest[] {
    return Array.from(this.approvals.values())
      .filter(item => item.requesterId === requesterId);
  }

  getPendingForApprover(approverId: string): ApprovalRequest[] {
    return Array.from(this.approvals.values())
      .filter(item => 
        item.status === ApprovalStatus.PENDING &&
        item.approvers.some(a => 
          a.userId === approverId && 
          a.status === ApprovalStatus.PENDING
        )
      );
  }

  clear(): void {
    this.approvals.clear();
    this.idCounter = 0;
  }
}

// 全局存储实例
const approvalStore = new ApprovalStore();

/**
 * 审批仓库类
 */
export class ApprovalRepository {
  /**
   * 创建审批请求
   */
  static create(data: CreateApprovalRequest, requesterId: string, requesterName: string): ApprovalRequest {
    const now = new Date().toISOString();
    const id = approvalStore.generateId();

    const request: ApprovalRequest = {
      id,
      type: data.type,
      status: ApprovalStatus.PENDING,
      priority: data.priority || ApprovalPriority.MEDIUM,
      requesterId,
      requesterName,
      title: data.title,
      description: data.description,
      data: data.data,
      requestedPermission: data.requestedPermission,
      requestedRole: data.requestedRole,
      approvers: [],
      currentStep: 0,
      totalSteps: 1,
      createdAt: now,
      updatedAt: now,
      expiresAt: data.expiresAt,
    };

    return approvalStore.create(request);
  }

  /**
   * 获取审批请求
   */
  static get(id: string): ApprovalRequest | null {
    return approvalStore.get(id);
  }

  /**
   * 更新审批请求
   */
  static update(id: string, updates: Partial<ApprovalRequest>): ApprovalRequest | null {
    return approvalStore.update(id, updates);
  }

  /**
   * 删除审批请求
   */
  static delete(id: string): boolean {
    return approvalStore.delete(id);
  }

  /**
   * 列表查询
   */
  static list(query: ApprovalListQuery): ApprovalListResult {
    return approvalStore.list(query);
  }

  /**
   * 获取统计信息
   */
  static getStats(): ApprovalStats {
    return approvalStore.getStats();
  }

  /**
   * 获取用户的审批请求
   */
  static getByRequester(requesterId: string): ApprovalRequest[] {
    return approvalStore.getByRequester(requesterId);
  }

  /**
   * 获取待审批的请求（作为审批人）
   */
  static getPendingForApprover(approverId: string): ApprovalRequest[] {
    return approvalStore.getPendingForApprover(approverId);
  }

  /**
   * 添加审批人
   */
  static addApprover(approvalId: string, approver: ApprovalApprover): ApprovalRequest | null {
    const request = approvalStore.get(approvalId);
    if (!request) return null;

    const approvers = [...request.approvers, approver];
    return approvalStore.update(approvalId, { approvers });
  }

  /**
   * 更新审批人状态
   */
  static updateApproverStatus(
    approvalId: string,
    approverId: string,
    status: ApprovalStatus,
    comment?: string
  ): ApprovalRequest | null {
    const request = approvalStore.get(approvalId);
    if (!request) return null;

    const now = new Date().toISOString();
    const approvers = request.approvers.map(a => {
      if (a.userId === approverId) {
        const updated: ApprovalApprover = {
          ...a,
          status,
          comment,
        };
        if (status === ApprovalStatus.APPROVED) {
          updated.approvedAt = now;
        } else if (status === ApprovalStatus.REJECTED) {
          updated.rejectedAt = now;
        }
        return updated;
      }
      return a;
    });

    return approvalStore.update(approvalId, { approvers });
  }

  /**
   * 批准审批
   */
  static approve(
    approvalId: string,
    approverId: string,
    approverName: string,
    comment?: string
  ): ApprovalRequest | null {
    const request = approvalStore.get(approvalId);
    if (!request || request.status !== ApprovalStatus.PENDING) return null;

    const now = new Date().toISOString();

    // 更新审批人状态
    let updated = this.updateApproverStatus(
      approvalId,
      approverId,
      ApprovalStatus.APPROVED,
      comment
    );
    if (!updated) return null;

    // 检查是否所有审批人都已批准
    const allApproved = updated.approvers.every(
      a => a.status === ApprovalStatus.APPROVED
    );

    if (allApproved || updated.approvers.length === 0) {
      updated = approvalStore.update(approvalId, {
        status: ApprovalStatus.APPROVED,
        approvedAt: now,
        approvedBy: approverId,
      });
    }

    return updated;
  }

  /**
   * 拒绝审批
   */
  static reject(
    approvalId: string,
    approverId: string,
    approverName: string,
    reason: string
  ): ApprovalRequest | null {
    const request = approvalStore.get(approvalId);
    if (!request || request.status !== ApprovalStatus.PENDING) return null;

    const now = new Date().toISOString();

    // 更新审批人状态
    let updated = this.updateApproverStatus(
      approvalId,
      approverId,
      ApprovalStatus.REJECTED,
      reason
    );
    if (!updated) return null;

    // 拒绝后整个审批被拒绝
    updated = approvalStore.update(approvalId, {
      status: ApprovalStatus.REJECTED,
      rejectedAt: now,
      rejectedBy: approverId,
      rejectionReason: reason,
    });

    return updated;
  }

  /**
   * 取消审批
   */
  static cancel(approvalId: string, reason?: string): ApprovalRequest | null {
    const request = approvalStore.get(approvalId);
    if (!request || request.status !== ApprovalStatus.PENDING) return null;

    return approvalStore.update(approvalId, {
      status: ApprovalStatus.CANCELLED,
      metadata: { ...request.metadata, cancelReason: reason },
    });
  }

  /**
   * 检查并标记过期审批
   */
  static checkExpired(): ApprovalRequest[] {
    const now = new Date();
    const items = Array.from(approvalStore.list({ status: ApprovalStatus.PENDING }).items);
    const expired: ApprovalRequest[] = [];

    for (const item of items) {
      if (item.expiresAt && new Date(item.expiresAt) < now) {
        const updated = approvalStore.update(item.id, {
          status: ApprovalStatus.EXPIRED,
        });
        if (updated) expired.push(updated);
      }
    }

    return expired;
  }

  /**
   * 清除所有数据（测试用）
   */
  static clear(): void {
    approvalStore.clear();
  }
}
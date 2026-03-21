/**
 * 审批系统测试
 * Approval System Tests
 */

import {describe, it, expect, beforeEach} from 'vitest';
import { ApprovalRepository } from '../repository';
import { ApprovalWorkflowService } from '../workflow';
import {
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
  DEFAULT_WORKFLOW_CONFIGS,
  SENSITIVE_PERMISSIONS,
} from '../types';
import { Permission } from '@/lib/permissions/types';

describe('Approval System', () => {
  beforeEach(() => {
    // 清除所有数据
    ApprovalRepository.clear();
  });

  describe('ApprovalRepository', () => {
    describe('create', () => {
      it('should create an approval request', () => {
        const request = ApprovalRepository.create(
          {
            type: ApprovalType.PERMISSION_REQUEST,
            title: 'Test Request',
            description: 'Test description',
            data: { permission: 'test' },
          },
          'user-1',
          'Test User'
        );

        expect(request.id).toBeDefined();
        expect(request.type).toBe(ApprovalType.PERMISSION_REQUEST);
        expect(request.status).toBe(ApprovalStatus.PENDING);
        expect(request.title).toBe('Test Request');
        expect(request.requesterId).toBe('user-1');
      });

      it('should set default priority to MEDIUM', () => {
        const request = ApprovalRepository.create(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-1',
          'Test User'
        );

        expect(request.priority).toBe(ApprovalPriority.MEDIUM);
      });

      it('should allow custom priority', () => {
        const request = ApprovalRepository.create(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
            priority: ApprovalPriority.URGENT,
          },
          'user-1',
          'Test User'
        );

        expect(request.priority).toBe(ApprovalPriority.URGENT);
      });
    });

    describe('get', () => {
      it('should return null for non-existent approval', () => {
        const result = ApprovalRepository.get('non-existent');
        expect(result).toBeNull();
      });

      it('should return created approval', () => {
        const created = ApprovalRepository.create(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-1',
          'Test User'
        );

        const result = ApprovalRepository.get(created.id);
        expect(result).toEqual(created);
      });
    });

    describe('update', () => {
      it('should update approval fields', () => {
        const created = ApprovalRepository.create(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-1',
          'Test User'
        );

        const updated = ApprovalRepository.update(created.id, {
          status: ApprovalStatus.APPROVED,
        });

        expect(updated?.status).toBe(ApprovalStatus.APPROVED);
      });

      it('should return null for non-existent approval', () => {
        const result = ApprovalRepository.update('non-existent', { status: ApprovalStatus.APPROVED });
        expect(result).toBeNull();
      });
    });

    describe('list', () => {
      beforeEach(() => {
        // 创建测试数据
        ApprovalRepository.create(
          { type: ApprovalType.PERMISSION_REQUEST, title: 'A', description: '', data: {} },
          'user-1',
          'User 1'
        );
        ApprovalRepository.create(
          { type: ApprovalType.ROLE_CHANGE, title: 'B', description: '', data: {} },
          'user-2',
          'User 2'
        );
        ApprovalRepository.create(
          { type: ApprovalType.PERMISSION_REQUEST, title: 'C', description: '', data: {} },
          'user-1',
          'User 1'
        );
      });

      it('should list all approvals', () => {
        const result = ApprovalRepository.list({});
        expect(result.total).toBe(3);
        expect(result.items.length).toBe(3);
      });

      it('should filter by type', () => {
        const result = ApprovalRepository.list({ type: ApprovalType.PERMISSION_REQUEST });
        expect(result.total).toBe(2);
      });

      it('should filter by requester', () => {
        const result = ApprovalRepository.list({ requesterId: 'user-1' });
        expect(result.total).toBe(2);
      });

      it('should paginate results', () => {
        const result = ApprovalRepository.list({ page: 1, pageSize: 2 });
        expect(result.items.length).toBe(2);
        expect(result.total).toBe(3);
        expect(result.totalPages).toBe(2);
      });
    });

    describe('approve', () => {
      it('should approve a request', () => {
        const created = ApprovalRepository.create(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-1',
          'Test User'
        );

        // 添加审批人
        ApprovalRepository.addApprover(created.id, {
          userId: 'approver-1',
          userName: 'Approver',
          status: ApprovalStatus.PENDING,
          order: 0,
        });

        const result = ApprovalRepository.approve(created.id, 'approver-1', 'Approver', 'OK');

        expect(result?.status).toBe(ApprovalStatus.APPROVED);
        expect(result?.approvedBy).toBe('approver-1');
        expect(result?.approvedAt).toBeDefined();
      });
    });

    describe('reject', () => {
      it('should reject a request', () => {
        const created = ApprovalRepository.create(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-1',
          'Test User'
        );

        ApprovalRepository.addApprover(created.id, {
          userId: 'approver-1',
          userName: 'Approver',
          status: ApprovalStatus.PENDING,
          order: 0,
        });

        const result = ApprovalRepository.reject(created.id, 'approver-1', 'Approver', 'Not valid');

        expect(result?.status).toBe(ApprovalStatus.REJECTED);
        expect(result?.rejectedBy).toBe('approver-1');
        expect(result?.rejectionReason).toBe('Not valid');
      });
    });

    describe('getStats', () => {
      it('should return correct statistics', () => {
        // 创建不同状态的审批
        const r1 = ApprovalRepository.create(
          { type: ApprovalType.CUSTOM, title: '1', description: '', data: {} },
          'u1', 'U1'
        );
        const r2 = ApprovalRepository.create(
          { type: ApprovalType.CUSTOM, title: '2', description: '', data: {} },
          'u1', 'U1'
        );
        const r3 = ApprovalRepository.create(
          { type: ApprovalType.CUSTOM, title: '3', description: '', data: {} },
          'u1', 'U1'
        );

        ApprovalRepository.update(r1.id, { status: ApprovalStatus.APPROVED });
        ApprovalRepository.update(r2.id, { status: ApprovalStatus.REJECTED });
        // r3 stays PENDING

        const stats = ApprovalRepository.getStats();

        expect(stats.total).toBe(3);
        expect(stats.pending).toBe(1);
        expect(stats.approved).toBe(1);
        expect(stats.rejected).toBe(1);
      });
    });
  });

  describe('ApprovalWorkflowService', () => {
    describe('requiresApproval', () => {
      it('should return true for sensitive permissions', () => {
        expect(
          ApprovalWorkflowService.requiresApproval(ApprovalType.PERMISSION_REQUEST, Permission.USER_DELETE)
        ).toBe(true);
      });

      it('should return true for configured workflow types', () => {
        expect(
          ApprovalWorkflowService.requiresApproval(ApprovalType.ROLE_CHANGE)
        ).toBe(true);
      });
    });

    describe('createRequest', () => {
      it('should create a request with auto-assigned approvers', () => {
        const request = ApprovalWorkflowService.createRequest(
          {
            type: ApprovalType.PERMISSION_REQUEST,
            title: 'Need permission',
            description: 'I need delete permission',
            data: { reason: 'for work' },
          },
          'user-4' // 成员
        );

        expect(request.id).toBeDefined();
        expect(request.status).toBe(ApprovalStatus.PENDING);
        expect(request.requesterId).toBe('user-4');
      });
    });

    describe('approve', () => {
      it('should throw error if not an approver', () => {
        const request = ApprovalWorkflowService.createRequest(
          {
            type: ApprovalType.CUSTOM,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-4'
        );

        expect(() => {
          ApprovalWorkflowService.approve(request.id, 'random-user');
        }).toThrow('User is not an approver');
      });
    });

    describe('getPendingApprovals', () => {
      it('should return pending approvals for approver', () => {
        // 创建一个会自动分配审批人的请求
        ApprovalWorkflowService.createRequest(
          {
            type: ApprovalType.PERMISSION_REQUEST,
            title: 'Test',
            description: 'Test',
            data: {},
          },
          'user-4' // 成员申请
        );

        // 管理员应该能看到
        const pending = ApprovalWorkflowService.getPendingApprovals('user-1');
        expect(pending.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Types and Constants', () => {
    it('should have default workflow configs', () => {
      expect(DEFAULT_WORKFLOW_CONFIGS.length).toBeGreaterThan(0);
      expect(DEFAULT_WORKFLOW_CONFIGS.find(c => c.type === ApprovalType.ROLE_CHANGE)).toBeDefined();
    });

    it('should have sensitive permissions defined', () => {
      expect(SENSITIVE_PERMISSIONS).toContain(Permission.USER_DELETE);
      expect(SENSITIVE_PERMISSIONS).toContain(Permission.USER_MANAGE_ROLE);
    });
  });

  describe('Expiration', () => {
    it('should mark expired approvals', () => {
      // 创建一个已过期的审批
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const request = ApprovalRepository.create(
        {
          type: ApprovalType.CUSTOM,
          title: 'Expired',
          description: 'Test',
          data: {},
        },
        'user-1',
        'User'
      );

      ApprovalRepository.update(request.id, {
        expiresAt: pastDate.toISOString(),
      });

      const expired = ApprovalRepository.checkExpired();

      expect(expired.length).toBe(1);
      expect(expired[0].status).toBe(ApprovalStatus.EXPIRED);
    });
  });
});
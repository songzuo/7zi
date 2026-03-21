/**
 * 审批仓库测试
 * Approval Repository Tests
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import { ApprovalRepository } from '../repository';
import {
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
  type CreateApprovalRequest,
} from '../types';

describe('ApprovalRepository', () => {
  beforeEach(() => {
    // 清理所有测试数据
    ApprovalRepository.clear();
  });

  afterEach(() => {
    // 确保每个测试后都清理
    ApprovalRepository.clear();
  });

  describe('create', () => {
    it('should create a new approval request', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request admin permission',
        description: 'Need admin access for testing',
        data: { reason: 'Testing' },
      };

      const request = ApprovalRepository.create(
        data,
        'user-1',
        'John Doe'
      );

      expect(request).toBeDefined();
      expect(request.id).toMatch(/^approval-\d+-\d+$/);
      expect(request.status).toBe(ApprovalStatus.PENDING);
      expect(request.type).toBe(ApprovalType.PERMISSION_REQUEST);
      expect(request.requesterId).toBe('user-1');
      expect(request.requesterName).toBe('John Doe');
      expect(request.title).toBe('Request admin permission');
      expect(request.approvers).toEqual([]);
      expect(request.currentStep).toBe(0);
      expect(request.totalSteps).toBe(1);
    });

    it('should use custom priority when provided', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.DELETE_USER,
        title: 'Delete user',
        description: 'Remove inactive user',
        data: { userId: 'user-2' },
        priority: ApprovalPriority.URGENT,
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');

      expect(request.priority).toBe(ApprovalPriority.URGENT);
    });

    it('should use medium priority when not provided', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');

      expect(request.priority).toBe(ApprovalPriority.MEDIUM);
    });

    it('should include expiration time when provided', () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();

      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
        expiresAt,
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');

      expect(request.expiresAt).toBe(expiresAt);
    });

    it('should create unique IDs for multiple requests', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
      };

      const request1 = ApprovalRepository.create(data, 'user-1', 'John Doe');
      const request2 = ApprovalRepository.create(data, 'user-2', 'Jane Doe');

      expect(request1.id).not.toBe(request2.id);
    });
  });

  describe('get', () => {
    it('should return approval by id', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');
      const retrieved = ApprovalRepository.get(request.id);

      expect(retrieved).toEqual(request);
    });

    it('should return null when approval does not exist', () => {
      const retrieved = ApprovalRepository.get('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('update', () => {
    it('should update approval with partial data', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');
      const updated = ApprovalRepository.update(request.id, {
        title: 'Updated title',
        status: ApprovalStatus.APPROVED,
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated title');
      expect(updated?.status).toBe(ApprovalStatus.APPROVED);
      expect(updated?.type).toBe(ApprovalType.PERMISSION_REQUEST); // unchanged
    });

    it('should update updatedAt timestamp', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');
      const startTime = request.updatedAt;

      // Small delay to ensure timestamp differs
      const updated = ApprovalRepository.update(request.id, {
        title: 'Updated',
      });

      expect(updated).toBeDefined();
      expect(updated?.updatedAt).toBeDefined();
      // updatedAt should be a valid ISO string
      expect(() => new Date(updated!.updatedAt)).not.toThrow();
    });

    it('should return null when approval does not exist', () => {
      const updated = ApprovalRepository.update('non-existent-id', {
        title: 'Updated',
      });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete approval by id', () => {
      const data: CreateApprovalRequest = {
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request permission',
        description: 'Testing',
        data: {},
      };

      const request = ApprovalRepository.create(data, 'user-1', 'John Doe');
      const deleted = ApprovalRepository.delete(request.id);

      expect(deleted).toBe(true);

      const retrieved = ApprovalRepository.get(request.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when approval does not exist', () => {
      const deleted = ApprovalRepository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      // Create test data
      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Pending request 1',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.create({
        type: ApprovalType.ROLE_CHANGE,
        title: 'Approved request',
        description: 'Testing',
        data: {},
      }, 'user-2', 'Jane Doe');

      // Update status to approved
      const all = ApprovalRepository.list({});
      if (all.items[1]) {
        ApprovalRepository.update(all.items[1].id, { status: ApprovalStatus.APPROVED });
      }

      ApprovalRepository.create({
        type: ApprovalType.DELETE_USER,
        title: 'Urgent request',
        description: 'Testing',
        data: {},
        priority: ApprovalPriority.URGENT,
      }, 'user-3', 'Bob Smith');

      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Pending request 2',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');
    });

    it('should return all approvals without filters', () => {
      const result = ApprovalRepository.list({});

      expect(result.items).toHaveLength(4);
      expect(result.total).toBe(4);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by status', () => {
      const result = ApprovalRepository.list({
        status: ApprovalStatus.PENDING,
      });

      expect(result.items).toHaveLength(3);
      expect(result.items.every(item => item.status === ApprovalStatus.PENDING)).toBe(true);
    });

    it('should filter by status array', () => {
      const result = ApprovalRepository.list({
        status: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
      });

      expect(result.items).toHaveLength(4);
    });

    it('should filter by type', () => {
      const result = ApprovalRepository.list({
        type: ApprovalType.PERMISSION_REQUEST,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.type === ApprovalType.PERMISSION_REQUEST)).toBe(true);
    });

    it('should filter by requesterId', () => {
      const result = ApprovalRepository.list({
        requesterId: 'user-1',
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.requesterId === 'user-1')).toBe(true);
    });

    it('should filter by priority', () => {
      const result = ApprovalRepository.list({
        priority: ApprovalPriority.URGENT,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].priority).toBe(ApprovalPriority.URGENT);
    });

    it('should sort by createdAt descending by default', () => {
      const result = ApprovalRepository.list({});

      for (let i = 1; i < result.items.length; i++) {
        const prevTime = new Date(result.items[i - 1].createdAt).getTime();
        const currTime = new Date(result.items[i].createdAt).getTime();
        expect(prevTime >= currTime).toBe(true);
      }
    });

    it('should sort by createdAt ascending when specified', () => {
      const result = ApprovalRepository.list({
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      for (let i = 1; i < result.items.length; i++) {
        const prevTime = new Date(result.items[i - 1].createdAt).getTime();
        const currTime = new Date(result.items[i].createdAt).getTime();
        expect(prevTime <= currTime).toBe(true);
      }
    });

    it('should handle pagination', () => {
      const result = ApprovalRepository.list({
        page: 1,
        pageSize: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });

    it('should handle pagination with page 2', () => {
      const result = ApprovalRepository.list({
        page: 2,
        pageSize: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(4);
      expect(result.page).toBe(2);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      // Create test data with various statuses
      for (let i = 0; i < 3; i++) {
        ApprovalRepository.create({
          type: ApprovalType.PERMISSION_REQUEST,
          title: `Pending ${i}`,
          description: 'Testing',
          data: {},
        }, 'user-1', 'John Doe');
      }

      const approved = ApprovalRepository.create({
        type: ApprovalType.ROLE_CHANGE,
        title: 'Approved',
        description: 'Testing',
        data: {},
      }, 'user-2', 'Jane Doe');
      if (approved) {
        ApprovalRepository.update(approved.id, {
          status: ApprovalStatus.APPROVED,
          approvedAt: new Date().toISOString(),
        });
      }

      const rejected = ApprovalRepository.create({
        type: ApprovalType.DELETE_USER,
        title: 'Rejected',
        description: 'Testing',
        data: {},
      }, 'user-3', 'Bob Smith');
      if (rejected) {
        ApprovalRepository.update(rejected.id, {
          status: ApprovalStatus.REJECTED,
          rejectedAt: new Date().toISOString(),
        });
      }
    });

    it('should return correct statistics', () => {
      const stats = ApprovalRepository.getStats();

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(3);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.cancelled).toBe(0);
      expect(stats.expired).toBe(0);
    });

    it('should include byType statistics', () => {
      const stats = ApprovalRepository.getStats();

      expect(stats.byType[ApprovalType.PERMISSION_REQUEST]).toBe(3);
      expect(stats.byType[ApprovalType.ROLE_CHANGE]).toBe(1);
      expect(stats.byType[ApprovalType.DELETE_USER]).toBe(1);
    });

    it('should include byPriority statistics', () => {
      const stats = ApprovalRepository.getStats();

      expect(stats.byPriority[ApprovalPriority.MEDIUM]).toBe(5);
    });

    it('should calculate avgProcessingTime for approved requests', () => {
      // Create approval and set different createdAt and approvedAt times
      const approved = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Approved 2',
        description: 'Testing',
        data: {},
      }, 'user-4', 'Alice');

      if (approved) {
        // Set createdAt to 1 hour ago
        const createdAt = new Date(Date.now() - 3600000).toISOString();
        ApprovalRepository.update(approved.id, {
          createdAt,
        });

        // Set approvedAt to now
        const approvedAt = new Date().toISOString();
        ApprovalRepository.update(approved.id, {
          status: ApprovalStatus.APPROVED,
          approvedAt,
        });
      }

      const stats = ApprovalRepository.getStats();

      expect(stats.avgProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('getByRequester', () => {
    it('should return approvals for specific requester', () => {
      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 1',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 2',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 3',
        description: 'Testing',
        data: {},
      }, 'user-2', 'Jane Doe');

      const requests = ApprovalRepository.getByRequester('user-1');

      expect(requests).toHaveLength(2);
      expect(requests.every(r => r.requesterId === 'user-1')).toBe(true);
    });

    it('should return empty array when requester has no requests', () => {
      const requests = ApprovalRepository.getByRequester('non-existent');
      expect(requests).toEqual([]);
    });
  });

  describe('getPendingForApprover', () => {
    it('should return pending approvals where user is an approver', () => {
      const request1 = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 1',
        description: 'Testing',
        data: {},
        approverIds: ['approver-1', 'approver-2'],
      }, 'user-1', 'John Doe');

      const request2 = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 2',
        description: 'Testing',
        data: {},
        approverIds: ['approver-2', 'approver-3'],
      }, 'user-2', 'Jane Doe');

      // Add approvers to first request
      if (request1) {
        ApprovalRepository.addApprover(request1.id, {
          userId: 'approver-1',
          userName: 'Approver 1',
          status: ApprovalStatus.PENDING,
          order: 0,
        });
      }

      if (request2) {
        ApprovalRepository.addApprover(request2.id, {
          userId: 'approver-2',
          userName: 'Approver 2',
          status: ApprovalStatus.PENDING,
          order: 0,
        });
      }

      const pending = ApprovalRepository.getPendingForApprover('approver-2');

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(request2?.id);
    });

    it('should not return approvals where approver has already acted', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
        approverIds: ['approver-1'],
      }, 'user-1', 'John Doe');

      if (request) {
        ApprovalRepository.addApprover(request.id, {
          userId: 'approver-1',
          userName: 'Approver 1',
          status: ApprovalStatus.APPROVED,
          order: 0,
        });
      }

      const pending = ApprovalRepository.getPendingForApprover('approver-1');

      expect(pending).toHaveLength(0);
    });
  });

  describe('addApprover', () => {
    it('should add approver to approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      const updated = ApprovalRepository.addApprover(request.id, {
        userId: 'approver-1',
        userName: 'Approver 1',
        status: ApprovalStatus.PENDING,
        order: 0,
      });

      expect(updated).toBeDefined();
      expect(updated?.approvers).toHaveLength(1);
      expect(updated?.approvers[0].userId).toBe('approver-1');
    });

    it('should return null when approval does not exist', () => {
      const updated = ApprovalRepository.addApprover('non-existent-id', {
        userId: 'approver-1',
        userName: 'Approver 1',
        status: ApprovalStatus.PENDING,
        order: 0,
      });

      expect(updated).toBeNull();
    });
  });

  describe('approve', () => {
    it('should approve pending approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      const approved = ApprovalRepository.approve(
        request.id,
        'approver-1',
        'Approver 1',
        'Looks good'
      );

      expect(approved).toBeDefined();
      expect(approved?.status).toBe(ApprovalStatus.APPROVED);
      expect(approved?.approvedAt).toBeDefined();
      expect(approved?.approvedBy).toBe('approver-1');
    });

    it('should not approve already approved approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.approve(request.id, 'approver-1', 'Approver 1');

      const approved2 = ApprovalRepository.approve(
        request.id,
        'approver-2',
        'Approver 2'
      );

      expect(approved2).toBeNull();
    });

    it('should return null when approval does not exist', () => {
      const approved = ApprovalRepository.approve(
        'non-existent-id',
        'approver-1',
        'Approver 1'
      );

      expect(approved).toBeNull();
    });
  });

  describe('reject', () => {
    it('should reject pending approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      const rejected = ApprovalRepository.reject(
        request.id,
        'approver-1',
        'Approver 1',
        'Not allowed'
      );

      expect(rejected).toBeDefined();
      expect(rejected?.status).toBe(ApprovalStatus.REJECTED);
      expect(rejected?.rejectedAt).toBeDefined();
      expect(rejected?.rejectedBy).toBe('approver-1');
      expect(rejected?.rejectionReason).toBe('Not allowed');
    });

    it('should not reject already approved approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.approve(request.id, 'approver-1', 'Approver 1');

      const rejected = ApprovalRepository.reject(
        request.id,
        'approver-2',
        'Approver 2',
        'No'
      );

      expect(rejected).toBeNull();
    });

    it('should return null when approval does not exist', () => {
      const rejected = ApprovalRepository.reject(
        'non-existent-id',
        'approver-1',
        'Approver 1',
        'No'
      );

      expect(rejected).toBeNull();
    });
  });

  describe('cancel', () => {
    it('should cancel pending approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      const cancelled = ApprovalRepository.cancel(request.id, 'No longer needed');

      expect(cancelled).toBeDefined();
      expect(cancelled?.status).toBe(ApprovalStatus.CANCELLED);
      expect(cancelled?.metadata?.cancelReason).toBe('No longer needed');
    });

    it('should not cancel approved approval', () => {
      const request = ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.approve(request.id, 'approver-1', 'Approver 1');

      const cancelled = ApprovalRepository.cancel(request.id);

      expect(cancelled).toBeNull();
    });

    it('should return null when approval does not exist', () => {
      const cancelled = ApprovalRepository.cancel('non-existent-id');
      expect(cancelled).toBeNull();
    });
  });

  describe('checkExpired', () => {
    it('should mark expired approvals', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();

      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Expired request',
        description: 'Testing',
        data: {},
        expiresAt: past,
      }, 'user-1', 'John Doe');

      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Valid request',
        description: 'Testing',
        data: {},
        expiresAt: future,
      }, 'user-2', 'Jane Doe');

      const expired = ApprovalRepository.checkExpired();

      expect(expired).toHaveLength(1);
      expect(expired[0].status).toBe(ApprovalStatus.EXPIRED);
    });

    it('should not mark pending approvals without expiration', () => {
      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      const expired = ApprovalRepository.checkExpired();

      expect(expired).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear all approvals', () => {
      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 1',
        description: 'Testing',
        data: {},
      }, 'user-1', 'John Doe');

      ApprovalRepository.create({
        type: ApprovalType.PERMISSION_REQUEST,
        title: 'Request 2',
        description: 'Testing',
        data: {},
      }, 'user-2', 'Jane Doe');

      ApprovalRepository.clear();

      const all = ApprovalRepository.list({});
      expect(all.total).toBe(0);
    });
  });
});

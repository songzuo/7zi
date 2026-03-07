/**
 * 审批系统 React Hooks
 * Approval System React Hooks
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalType,
  ApprovalPriority,
  ApprovalListQuery,
  ApprovalListResult,
  ApprovalStats,
  CreateApprovalRequest,
} from '@/lib/approval/types';
import { ApprovalRepository } from '@/lib/approval/repository';
import { ApprovalWorkflowService } from '@/lib/approval/workflow';

/**
 * 获取审批列表 Hook
 */
export function useApprovals(query?: ApprovalListQuery) {
  const [data, setData] = useState<ApprovalListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = ApprovalRepository.list(query || {});
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * 获取待审批列表 Hook
 */
export function usePendingApprovals(approverId: string) {
  const [data, setData] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    try {
      const result = ApprovalWorkflowService.getPendingApprovals(approverId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [approverId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * 获取我的申请 Hook
 */
export function useMyRequests(requesterId: string) {
  const [data, setData] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    try {
      const result = ApprovalWorkflowService.getMyRequests(requesterId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [requesterId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * 获取审批详情 Hook
 */
export function useApproval(approvalId: string | null) {
  const [data, setData] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!approvalId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = ApprovalWorkflowService.getApproval(approvalId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [approvalId]);

  return { data, loading, error };
}

/**
 * 获取审批统计 Hook
 */
export function useApprovalStats() {
  const [data, setData] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    try {
      const result = ApprovalWorkflowService.getStats();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * 审批操作 Hook
 */
export function useApprovalActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (
    data: CreateApprovalRequest,
    requesterId: string
  ): Promise<ApprovalRequest | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = ApprovalWorkflowService.createRequest(data, requesterId);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(async (
    approvalId: string,
    approverId: string,
    comment?: string
  ): Promise<ApprovalRequest | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = ApprovalWorkflowService.approve(approvalId, approverId, comment);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (
    approvalId: string,
    approverId: string,
    reason: string
  ): Promise<ApprovalRequest | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = ApprovalWorkflowService.reject(approvalId, approverId, reason);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (
    approvalId: string,
    requesterId: string,
    reason?: string
  ): Promise<ApprovalRequest | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = ApprovalWorkflowService.cancel(approvalId, requesterId, reason);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    approve,
    reject,
    cancel,
    loading,
    error,
  };
}

/**
 * 审批筛选器 Hook
 */
export function useApprovalFilters() {
  const [filters, setFilters] = useState<ApprovalListQuery>({
    status: undefined,
    type: undefined,
    priority: undefined,
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const setStatus = useCallback((status: ApprovalStatus | undefined) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  }, []);

  const setType = useCallback((type: ApprovalType | undefined) => {
    setFilters(prev => ({ ...prev, type, page: 1 }));
  }, []);

  const setPriority = useCallback((priority: ApprovalPriority | undefined) => {
    setFilters(prev => ({ ...prev, priority, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilters(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy: 'createdAt' | 'updatedAt' | 'priority', sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const reset = useCallback(() => {
    setFilters({
      status: undefined,
      type: undefined,
      priority: undefined,
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  }, []);

  return {
    filters,
    setStatus,
    setType,
    setPriority,
    setPage,
    setPageSize,
    setSort,
    reset,
  };
}
/**
 * Zustand Store - 状态管理
 * 
 * 使用 Zustand 进行全局状态管理
 * 支持持久化、中间件、选择器优化
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// 类型定义
// ============================================================================

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  login?: string;
}

export interface Milestone {
  id: number;
  title: string;
  due_on: string;
}

export interface Issue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Label[];
  assignee: User | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  body?: string;
  html_url: string;
  milestone: Milestone | null;
  comments?: number;
}

export interface Contribution {
  id: string;
  memberId: string;
  issueId: number;
  action: 'created' | 'commented' | 'closed' | 'reviewed';
  timestamp: string;
  description: string;
}

export interface AIMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: 'idle' | 'working' | 'busy' | 'offline';
  statusMessage?: string;
  currentTask: Issue | null;
  skills: string[];
  provider: string;
  completedTasks: number;
  activeIssues: number;
  contributionHistory: Contribution[];
}

export interface FilterState {
  state: 'open' | 'closed' | 'all';
  assignee?: string;
  labels?: string[];
  milestone?: number;
}

export interface DashboardState {
  // 数据
  issues: Issue[];
  members: AIMember[];
  contributions: Contribution[];
  
  // 状态
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 筛选
  filter: FilterState;
  
  // 分页
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // WebSocket
  isConnected: boolean;
  lastSyncAt: Date | null;
}

export interface DashboardActions {
  // 数据操作
  setIssues: (issues: Issue[]) => void;
  updateIssue: (issue: Issue) => void;
  setMembers: (members: AIMember[]) => void;
  updateMemberStatus: (memberId: string, status: AIMember['status'], statusMessage?: string) => void;
  setContributions: (contributions: Contribution[]) => void;
  
  // 状态操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date | null) => void;
  
  // 筛选操作
  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;
  
  // 分页操作
  setPagination: (pagination: Partial<DashboardState['pagination']>) => void;
  
  // WebSocket
  setConnected: (connected: boolean) => void;
  setLastSyncAt: (date: Date | null) => void;
  
  // 数据刷新
  refreshData: () => Promise<void>;
  refreshIssues: () => Promise<void>;
  refreshMembers: () => Promise<void>;
}

export type DashboardStore = DashboardState & DashboardActions;

// ============================================================================
// 初始状态
// ============================================================================

const initialState: DashboardState = {
  // 数据
  issues: [],
  members: [],
  contributions: [],
  
  // 状态
  isLoading: false,
  error: null,
  lastUpdated: null,
  
  // 筛选
  filter: {
    state: 'open',
    assignee: undefined,
    labels: undefined,
    milestone: undefined
  },
  
  // 分页
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  
  // WebSocket
  isConnected: false,
  lastSyncAt: null
};

// ============================================================================
// API 配置
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

// ============================================================================
// 创建 Store
// ============================================================================

export const useDashboardStore = create<DashboardStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // ----------------------------------------------------------------------
      // 数据操作
      // ----------------------------------------------------------------------

      setIssues: (issues) => {
        set((state) => {
          state.issues = issues;
          state.lastUpdated = new Date();
        });
      },

      updateIssue: (issue) => {
        set((state) => {
          const index = state.issues.findIndex(i => i.id === issue.id);
          if (index !== -1) {
            state.issues[index] = issue;
          } else {
            state.issues.unshift(issue);
          }
          state.lastUpdated = new Date();
        });
      },

      setMembers: (members) => {
        set((state) => {
          state.members = members;
          state.lastUpdated = new Date();
        });
      },

      updateMemberStatus: (memberId, status, statusMessage) => {
        set((state) => {
          const member = state.members.find(m => m.id === memberId);
          if (member) {
            member.status = status;
            if (statusMessage) {
              member.statusMessage = statusMessage;
            }
          }
        });
      },

      setContributions: (contributions) => {
        set((state) => {
          state.contributions = contributions;
        });
      },

      // ----------------------------------------------------------------------
      // 状态操作
      // ----------------------------------------------------------------------

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
          state.isLoading = false;
        });
      },

      setLastUpdated: (date) => {
        set((state) => {
          state.lastUpdated = date;
        });
      },

      // ----------------------------------------------------------------------
      // 筛选操作
      // ----------------------------------------------------------------------

      setFilter: (filter) => {
        set((state) => {
          state.filter = { ...state.filter, ...filter };
        });
      },

      resetFilter: () => {
        set((state) => {
          state.filter = initialState.filter;
        });
      },

      // ----------------------------------------------------------------------
      // 分页操作
      // ----------------------------------------------------------------------

      setPagination: (pagination) => {
        set((state) => {
          state.pagination = { ...state.pagination, ...pagination };
        });
      },

      // ----------------------------------------------------------------------
      // WebSocket
      // ----------------------------------------------------------------------

      setConnected: (connected) => {
        set((state) => {
          state.isConnected = connected;
        });
      },

      setLastSyncAt: (date) => {
        set((state) => {
          state.lastSyncAt = date;
        });
      },

      // ----------------------------------------------------------------------
      // 数据刷新
      // ----------------------------------------------------------------------

      refreshData: async () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          await Promise.all([
            get().refreshIssues(),
            get().refreshMembers()
          ]);
          
          set((state) => {
            state.lastUpdated = new Date();
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : '刷新失败';
          });
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      refreshIssues: async () => {
        const { filter, pagination } = get();
        
        const params = new URLSearchParams({
          state: filter.state,
          page: pagination.page.toString(),
          limit: pagination.limit.toString()
        });

        if (filter.assignee) {
          params.set('assignee', filter.assignee);
        }

        const response = await fetch(`${API_BASE_URL}/issues?${params}`);
        
        if (!response.ok) {
          throw new Error('获取任务列表失败');
        }

        const data = await response.json();
        
        set((state) => {
          state.issues = data.data;
          state.pagination = data.pagination;
        });
      },

      refreshMembers: async () => {
        const response = await fetch(`${API_BASE_URL}/members`);
        
        if (!response.ok) {
          throw new Error('获取成员列表失败');
        }

        const data = await response.json();
        
        set((state) => {
          state.members = data.data;
        });
      }
    })),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filter: state.filter,
        pagination: state.pagination
      }),
      onRehydrateStorage: () => (state) => {
        // 重新水合后的操作
        console.log('Dashboard store rehydrated');
      }
    }
  )
);

// ============================================================================
// 选择器 (Selectors) - 性能优化
// ============================================================================

export const selectOpenIssues = (state: DashboardStore) =>
  state.issues.filter(issue => issue.state === 'open');

export const selectClosedIssues = (state: DashboardStore) =>
  state.issues.filter(issue => issue.state === 'closed');

export const selectWorkingMembers = (state: DashboardStore) =>
  state.members.filter(member => member.status === 'working');

export const selectMemberById = (memberId: string) => (state: DashboardStore) =>
  state.members.find(member => member.id === memberId);

export const selectIssuesByAssignee = (assigneeId: string) => (state: DashboardStore) =>
  state.issues.filter(issue => issue.assignee?.id === assigneeId);

export const selectFilteredIssues = (state: DashboardStore) => {
  const { issues, filter } = state;
  
  return issues.filter(issue => {
    if (filter.state !== 'all' && issue.state !== filter.state) return false;
    if (filter.assignee && issue.assignee?.id !== filter.assignee) return false;
    if (filter.labels?.length && !issue.labels.some(l => filter.labels?.includes(l.name))) return false;
    return true;
  });
};

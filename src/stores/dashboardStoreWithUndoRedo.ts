/**
 * @fileoverview Dashboard Store with Undo-Redo
 * @description Enhanced dashboard store with undo-redo functionality
 */




import type { UnifiedTeamMember } from '@/types/members';
import type { GitHubIssue } from '@/types/common';
import type { HistoryState } from '@/lib/undo-redo/types';

// ============================================================================
// Types
// ============================================================================

export interface DashboardState {
  // Data
  members: UnifiedTeamMember[];
  issues: GitHubIssue[];
  activities: ActivityItem[];

  // Loading state
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Configuration
  owner: string;
  repo: string;
  token: string | null;
  refreshInterval: number;

  // Actions
  setConfig: (owner: string, repo: string, token?: string) => void;
  fetchAllData: () => Promise<void>;
  updateMemberStatus: (memberId: string, status: UnifiedTeamMember['status']) => void;
  updateMemberTask: (memberId: string, task: string | undefined) => void;
  addMember: (member: UnifiedTeamMember) => void;
  removeMember: (memberId: string) => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export interface DashboardStateWithUndoRedo extends DashboardState {
  // Undo-redo actions (added by middleware)
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  skipNextHistoryPush: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pastStatesCount: number;
  futureStatesCount: number;
  getHistorySnapshot: () => HistoryState;
  exportHistory: () => string;
  importHistory: (json: string) => { success: boolean; error?: string };
}

export interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}

// ============================================================================
// Constants
// ============================================================================

const AI_MEMBERS: UnifiedTeamMember[] = [
  {
    id: 'agent-world-expert',
    name: '智能体世界专家',
    role: '视角转换/未来布局',
    emoji: '🌟',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
    status: 'working',
    provider: 'minimax',
    currentTask: '#42 分析市场趋势',
    completedTasks: 156
  },
  {
    id: 'consultant',
    name: '咨询师',
    role: '研究/分析',
    emoji: '📚',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=consultant',
    status: 'working',
    provider: 'minimax',
    currentTask: '#38 竞品调研报告',
    completedTasks: 203
  },
  {
    id: 'architect',
    name: '架构师',
    role: '设计/规划',
    emoji: '🏗️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=architect',
    status: 'busy',
    provider: 'self-claude',
    currentTask: '#45 系统架构评审',
    completedTasks: 178
  },
  {
    id: 'executor',
    name: 'Executor',
    role: '执行/实现',
    emoji: '⚡',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=executor',
    status: 'working',
    provider: 'volcengine',
    currentTask: '#51 实现看板功能',
    completedTasks: 312
  },
  {
    id: 'sysadmin',
    name: '系统管理员',
    role: '运维/部署',
    emoji: '🛡️',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sysadmin',
    status: 'idle',
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 145
  },
  {
    id: 'tester',
    name: '测试员',
    role: '测试/调试',
    emoji: '🧪',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=tester',
    status: 'working',
    provider: 'minimax',
    currentTask: '#49 单元测试编写',
    completedTasks: 267
  },
  {
    id: 'designer',
    name: '设计师',
    role: 'UI 设计',
    emoji: '🎨',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=designer',
    status: 'busy',
    provider: 'self-claude',
    currentTask: '#47 界面优化',
    completedTasks: 189
  },
  {
    id: 'marketing',
    name: '推广专员',
    role: '推广/SEO',
    emoji: '📣',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=marketing',
    status: 'idle',
    provider: 'volcengine',
    currentTask: undefined,
    completedTasks: 134
  },
  {
    id: 'sales',
    name: '销售客服',
    role: '销售/客服',
    emoji: '💼',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sales',
    status: 'offline',
    provider: 'bailian',
    currentTask: undefined,
    completedTasks: 98
  },
  {
    id: 'finance',
    name: '财务',
    role: '会计/审计',
    emoji: '💰',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=finance',
    status: 'idle',
    provider: 'minimax',
    currentTask: undefined,
    completedTasks: 76
  },
  {
    id: 'media',
    name: '媒体',
    role: '媒体/宣传',
    emoji: '📺',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=media',
    status: 'working',
    provider: 'self-claude',
    currentTask: '#44 宣传文案撰写',
    completedTasks: 112
  }
];

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchGitHubAPI<T>(
  url: string,
  token?: string | null
): Promise<T> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('仓库不存在');
    } else if (response.status === 401) {
      throw new Error('GitHub Token 无效');
    } else if (response.status === 403) {
      throw new Error('GitHub API 速率限制，请稍后重试');
    }
    throw new Error(`请求失败：${response.statusText}`);
  }

  return response.json();
}

async function fetchIssues(
  owner: string,
  repo: string,
  token?: string | null
): Promise<GitHubIssue[]> {
  const data = await fetchGitHubAPI<GitHubIssue[]>(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`,
    token
  );
  // Filter out PRs (GitHub API returns PRs as issues)
  return data.filter((item) => !('pull_request' in item));
}

async function fetchCommits(
  owner: string,
  repo: string,
  token?: string | null
): Promise<GitHubCommit[]> {
  return fetchGitHubAPI<GitHubCommit[]>(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`,
    token
  );
}

function mergeActivities(
  issues: GitHubIssue[],
  commits: GitHubCommit[]
): ActivityItem[] {
  const activities: ActivityItem[] = [];

  // Add Commits
  commits.forEach((commit) => {
    activities.push({
      id: `commit-${commit.sha}`,
      type: 'commit',
      title: commit.commit.message.split('\n')[0] || '无标题提交',
      author: commit.commit.author.name || '未知',
      avatar: commit.author?.avatar_url,
      timestamp: commit.commit.author.date,
      url: commit.html_url,
    });
  });

  // Add Issues
  issues.forEach((issue) => {
    activities.push({
      id: `issue-${issue.number}`,
      type: 'issue',
      title: `${issue.state === 'open' ? '🟢' : '✅'} #${issue.number}: ${issue.title}`,
      author: issue.assignee?.login || '未分配',
      avatar: issue.assignee?.avatar_url,
      timestamp: issue.updated_at,
      url: issue.html_url,
    });
  });

  // Sort by time
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Keep only last 20
  return activities.slice(0, 20);
}

// ============================================================================
// Store Implementation with Undo-Redo
// ============================================================================

// @ts-ignore - UndoRedo middleware type augmentation issue with Zustand v5
export const useDashboardStore = create<DashboardStateWithUndoRedo>()(
  devtools(
    undoRedo(
      (set, get) => ({
        // Initial state
        members: AI_MEMBERS,
        issues: [],
        activities: [],
        isLoading: false,
        error: null,
        lastUpdated: null,
        owner: 'songzhuo',
        repo: 'openclaw-workspace',
        token: null,
        refreshInterval: DEFAULT_REFRESH_INTERVAL,

        // Undo-redo actions (will be overridden by middleware)
        undo: () => {},
        redo: () => {},
        clearHistory: () => {},
        skipNextHistoryPush: () => {},
        canUndo: false,
        canRedo: false,
        pastStatesCount: 0,
        futureStatesCount: 0,
        getHistorySnapshot: () => ({ past: [], present: get(), future: [], currentIndex: 0, isUndoing: false, isRedoing: false }),
        exportHistory: () => '',
        importHistory: () => ({ success: false }),

        // Set config (not recorded in history)
        setConfig: (owner, repo, token) => {
          // @ts-ignore - skipNextHistoryPush is added by middleware
          get().skipNextHistoryPush();
          set({ owner, repo, token: token || null });
        },

        // Fetch all data (not recorded in history)
        fetchAllData: async () => {
          const { owner, repo, token } = get();

          // @ts-ignore - skipNextHistoryPush is added by middleware
          get().skipNextHistoryPush();
          set({ isLoading: true, error: null });

          try {
            // Parallel fetch Issues and Commits
            const [issuesData, commitsData] = await Promise.all([
              fetchIssues(owner, repo, token).catch((err) => {
                console.warn('Issues fetch failed:', err);
                return [];
              }),
              fetchCommits(owner, repo, token).catch((err) => {
                console.warn('Commits fetch failed:', err);
                return [];
              }),
            ]);

            // Merge activities
            const mergedActivities = mergeActivities(issuesData, commitsData);

            set({
              issues: issuesData,
              activities: mergedActivities,
              isLoading: false,
              lastUpdated: new Date(),
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : '数据加载失败';
            set({
              error: errorMessage,
              isLoading: false,
            });
          }
        },

        // Update member status
        updateMemberStatus: (memberId, status) => {
          const currentState = get();
          const member = currentState.members.find(m => m.id === memberId);
          const previousStatus = member?.status;

          set((state) => ({
            members: state.members.map((m) =>
              m.id === memberId ? { ...m, status } : m
            ),
          }));

          // Record in undo-redo manager
          if (previousStatus) {
            import('@/lib/undo-redo').then(({ pushOperation }) => {
              pushOperation(
                'update',
                `更新成员状态: ${member?.name} ${previousStatus} → ${status}`,
                () => {
                  useDashboardStore.getState().updateMemberStatus(memberId, previousStatus);
                },
                () => {
                  useDashboardStore.getState().updateMemberStatus(memberId, status);
                }
              );
            });
          }
        },

        // Update member task
        updateMemberTask: (memberId, task) => {
          const currentState = get();
          const member = currentState.members.find(m => m.id === memberId);
          const previousTask = member?.currentTask;

          set((state) => ({
            members: state.members.map((m) =>
              m.id === memberId ? { ...m, currentTask: task } : m
            ),
          }));

          // Record in undo-redo manager
          if (previousTask !== undefined || task !== undefined) {
            import('@/lib/undo-redo').then(({ pushOperation }) => {
              pushOperation(
                'update',
                `更新成员任务: ${member?.name}`,
                () => {
                  useDashboardStore.getState().updateMemberTask(memberId, previousTask);
                },
                () => {
                  useDashboardStore.getState().updateMemberTask(memberId, task);
                }
              );
            });
          }
        },

        // Add member
        addMember: (member) => {
          set((state) => ({
            members: [...state.members, member],
          }));

          // Record in undo-redo manager
          import('@/lib/undo-redo').then(({ pushOperation }) => {
            pushOperation(
              'create',
              `添加成员: ${member.name}`,
              () => {
                // @ts-ignore - member.id type issue (string | number vs string)
                useDashboardStore.getState().removeMember(String(member.id));
              },
              () => {
                useDashboardStore.getState().addMember(member);
              }
            );
          });
        },

        // Remove member
        removeMember: (memberId) => {
          const currentState = get();
          const member = currentState.members.find(m => m.id === memberId);

          set((state) => ({
            members: state.members.filter((m) => m.id !== memberId),
          }));

          // Record in undo-redo manager
          if (member) {
            import('@/lib/undo-redo').then(({ pushOperation }) => {
              pushOperation(
                'delete',
                `删除成员: ${member.name}`,
                () => {
                  useDashboardStore.getState().addMember(member);
                },
                () => {
                  useDashboardStore.getState().removeMember(memberId);
                }
              );
            });
          }
        },

        // Refresh data (not recorded in history)
        refreshData: async () => {
          await get().fetchAllData();
        },

        // Clear error (not recorded in history)
        clearError: () => {
          // @ts-ignore - skipNextHistoryPush is added by middleware
          get().skipNextHistoryPush();
          set({ error: null });
        },
      }),
      {
        maxHistorySize: 50,
        excludeActionTypes: ['setConfig', 'fetchAllData', 'refreshData', 'clearError'],
      }
    // @ts-ignore - Type mismatch with undo-redo middleware (Zustand v5 type limitation)
    ),
    { name: 'dashboard-store' }
  )
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get all members
 */
export const useMembers = () => useDashboardStore((s) => s.members);

/**
 * Get all Issues
 */
export const useIssues = () => useDashboardStore((s) => s.issues);

/**
 * Get activity log
 */
export const useActivities = () => useDashboardStore((s) => s.activities);

/**
 * Get loading state
 */
export const useDashboardLoading = () => useDashboardStore((s) => s.isLoading);

/**
 * Get error message
 */
export const useDashboardError = () => useDashboardStore((s) => s.error);

/**
 * Get last update time
 */
export const useLastUpdated = () => useDashboardStore((s) => s.lastUpdated);

/**
 * Get statistics (derived data)
 */
export const useDashboardStats = () =>
  useDashboardStore((s) => ({
    totalMembers: s.members.length,
    working: s.members.filter((m) => m.status === 'working').length,
    busy: s.members.filter((m) => m.status === 'busy').length,
    idle: s.members.filter((m) => m.status === 'idle').length,
    offline: s.members.filter((m) => m.status === 'offline').length,
    openIssues: s.issues.filter((i) => i.state === 'open').length,
    closedIssues: s.issues.filter((i) => i.state === 'closed').length,
  }));

/**
 * Get members grouped by status
 */
export const useMembersByStatus = () =>
  useDashboardStore((s) => ({
    working: s.members.filter((m) => m.status === 'working'),
    busy: s.members.filter((m) => m.status === 'busy'),
    idle: s.members.filter((m) => m.status === 'idle'),
    offline: s.members.filter((m) => m.status === 'offline'),
  }));

/**
 * Get single member
 */
export const useMember = (memberId: string) =>
  useDashboardStore((s) => s.members.find((m) => m.id === memberId));

// ============================================================================
// Undo-Redo Hooks
// ============================================================================

/**
 * Get undo/redo functions
 */
export const useDashboardUndoRedo = () =>
  useDashboardStore((s) => ({
    undo: s.undo,
    redo: s.redo,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
    clearHistory: s.clearHistory,
  }));

// ============================================================================
// External API (for non-React environment)
// ============================================================================

/**
 * Get dashboard state snapshot
 */
export const getDashboardSnapshot = () => useDashboardStore.getState();

/**
 * Set dashboard config (external call)
 */
export const setDashboardConfig = (owner: string, repo: string, token?: string) => {
  useDashboardStore.getState().setConfig(owner, repo, token);
};

/**
 * Trigger data refresh (external call)
 */
export const refreshDashboardData = async () => {
  await useDashboardStore.getState().fetchAllData();
};

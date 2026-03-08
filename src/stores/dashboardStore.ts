/**
 * @fileoverview Dashboard 状态管理 Store
 * @description 使用 Zustand 实现的 Dashboard 数据状态管理
 * 
 * 功能:
 * - AI 成员状态管理
 * - GitHub Issues 数据
 * - 活动日志
 * - 自动刷新和数据缓存
 * 
 * @example
 * // 在组件中使用
 * const stats = useDashboardStats();
 * const members = useMembers();
 * const { fetchAllData, isLoading } = useDashboardStore();
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// 类型定义
// ============================================================================

export interface AIMember {
  id: string;
  name: string;
  role: string;
  emoji: string;
  avatar: string;
  status: 'idle' | 'working' | 'busy' | 'offline';
  provider: string;
  currentTask?: string;
  completedTasks: number;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  assignee?: { login: string; avatar_url: string } | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
  author?: { avatar_url: string } | null;
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

export interface DashboardStats {
  totalMembers: number;
  working: number;
  busy: number;
  idle: number;
  offline: number;
  openIssues: number;
  closedIssues: number;
}

interface DashboardState {
  // 数据
  members: AIMember[];
  issues: GitHubIssue[];
  activities: ActivityItem[];
  
  // 加载状态
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // 配置
  owner: string;
  repo: string;
  token: string | null;
  refreshInterval: number;
  
  // 操作
  setConfig: (owner: string, repo: string, token?: string) => void;
  fetchAllData: () => Promise<void>;
  updateMemberStatus: (memberId: string, status: AIMember['status']) => void;
  updateMemberTask: (memberId: string, task: string | undefined) => void;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

// ============================================================================
// 常量
// ============================================================================

const AI_MEMBERS: AIMember[] = [
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

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 秒

// ============================================================================
// 辅助函数
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
  // 过滤掉 PR（GitHub API 中 PR 也作为 issue 返回）
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

  // 添加 Commits
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

  // 添加 Issues
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

  // 按时间排序
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // 只保留最近 20 条
  return activities.slice(0, 20);
}

// ============================================================================
// Store 实现
// ============================================================================

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // 初始状态
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

      // 设置配置
      setConfig: (owner, repo, token) => {
        set({ owner, repo, token: token || null });
      },

      // 获取所有数据
      fetchAllData: async () => {
        const { owner, repo, token } = get();
        
        set({ isLoading: true, error: null });

        try {
          // 并行获取 Issues 和 Commits
          const [issuesData, commitsData] = await Promise.all([
            fetchIssues(owner, repo, token),
            fetchCommits(owner, repo, token),
          ]);

          // 合并活动
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

      // 更新成员状态
      updateMemberStatus: (memberId, status) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, status } : m
          ),
        }));
      },

      // 更新成员任务
      updateMemberTask: (memberId, task) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, currentTask: task } : m
          ),
        }));
      },

      // 刷新数据
      refreshData: async () => {
        await get().fetchAllData();
      },

      // 清除错误
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'dashboard-store' }
  )
);

// ============================================================================
// 选择器 Hooks
// ============================================================================

/**
 * 获取所有成员
 */
export const useMembers = () => useDashboardStore((s) => s.members);

/**
 * 获取所有 Issues
 */
export const useIssues = () => useDashboardStore((s) => s.issues);

/**
 * 获取活动日志
 */
export const useActivities = () => useDashboardStore((s) => s.activities);

/**
 * 获取加载状态
 */
export const useDashboardLoading = () => useDashboardStore((s) => s.isLoading);

/**
 * 获取错误信息
 */
export const useDashboardError = () => useDashboardStore((s) => s.error);

/**
 * 获取最后更新时间
 */
export const useLastUpdated = () => useDashboardStore((s) => s.lastUpdated);

/**
 * 获取统计数据（派生数据）
 */
export const useDashboardStats = (): DashboardStats =>
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
 * 获取按状态分组的成员
 */
export const useMembersByStatus = () =>
  useDashboardStore((s) => ({
    working: s.members.filter((m) => m.status === 'working'),
    busy: s.members.filter((m) => m.status === 'busy'),
    idle: s.members.filter((m) => m.status === 'idle'),
    offline: s.members.filter((m) => m.status === 'offline'),
  }));

/**
 * 获取单个成员
 */
export const useMember = (memberId: string) =>
  useDashboardStore((s) => s.members.find((m) => m.id === memberId));

// ============================================================================
// 外部访问 API（用于非 React 环境）
// ============================================================================

/**
 * 获取 Dashboard 状态快照
 */
export const getDashboardSnapshot = () => useDashboardStore.getState();

/**
 * 设置 Dashboard 配置（外部调用）
 */
export const setDashboardConfig = (owner: string, repo: string, token?: string) => {
  useDashboardStore.getState().setConfig(owner, repo, token);
};

/**
 * 触发数据刷新（外部调用）
 */
export const refreshDashboardData = async () => {
  await useDashboardStore.getState().fetchAllData();
};
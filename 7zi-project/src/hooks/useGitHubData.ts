/**
 * @fileoverview GitHub API Hook
 * @description 统一的 GitHub API 数据获取逻辑
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { GitHubIssue, GitHubCommit, GitHubStats, ActivityItem } from '@/types';

interface UseGitHubDataOptions {
  owner: string;
  repo: string;
  token?: string | null;
  refreshInterval?: number;
  issuesPerPage?: number;
  commitsPerPage?: number;
}

interface UseGitHubDataReturn {
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  stats: GitHubStats | null;
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

/**
 * GitHub 数据 Hook
 * 
 * 从 GitHub API 获取 Issues、Commits 和仓库统计
 */
export function useGitHubData({
  owner,
  repo,
  token,
  refreshInterval = 5 * 60 * 1000,
  issuesPerPage = 50,
  commitsPerPage = 30,
}: UseGitHubDataOptions): UseGitHubDataReturn {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 构建请求头
  const getHeaders = useCallback(() => {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    return headers;
  }, [token]);

  // 获取 Issues
  const fetchIssues = useCallback(async (): Promise<GitHubIssue[]> => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=${issuesPerPage}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      if (response.status === 404) throw new Error(`仓库 ${owner}/${repo} 不存在`);
      if (response.status === 403) throw new Error('GitHub API 速率限制');
      throw new Error(`获取 Issues 失败: ${response.statusText}`);
    }

    const data = await response.json();
    // 过滤掉 PR
    return data.filter((item: GitHubIssue & { pull_request?: unknown }) => !item.pull_request);
  }, [owner, repo, issuesPerPage, getHeaders]);

  // 获取 Commits
  const fetchCommits = useCallback(async (): Promise<GitHubCommit[]> => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${commitsPerPage}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      if (response.status === 404) throw new Error(`仓库 ${owner}/${repo} 不存在`);
      if (response.status === 403) throw new Error('GitHub API 速率限制');
      throw new Error(`获取 Commits 失败: ${response.statusText}`);
    }

    return response.json();
  }, [owner, repo, commitsPerPage, getHeaders]);

  // 获取仓库统计
  const fetchStats = useCallback(async (): Promise<GitHubStats> => {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`获取统计失败: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
    };
  }, [owner, repo, getHeaders]);

  // 合并活动
  const mergeActivities = useCallback((issuesData: GitHubIssue[], commitsData: GitHubCommit[]): ActivityItem[] => {
    const items: ActivityItem[] = [];

    // 添加 Commits
    commitsData.forEach(commit => {
      items.push({
        id: `commit-${commit.sha}`,
        type: 'commit',
        title: commit.commit.message.split('\n')[0] || '无标题提交',
        author: commit.commit.author.name,
        avatar: commit.author?.avatar_url,
        timestamp: commit.commit.author.date,
        url: commit.html_url,
      });
    });

    // 添加 Issues
    issuesData.forEach(issue => {
      items.push({
        id: `issue-${issue.number}`,
        type: 'issue',
        title: `#${issue.number}: ${issue.title}`,
        author: issue.assignee?.login || '未分配',
        avatar: issue.assignee?.avatar_url,
        timestamp: issue.updated_at,
        url: issue.html_url,
      });
    });

    // 按时间排序
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items.slice(0, 20);
  }, []);

  // 刷新数据
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [issuesData, commitsData, statsData] = await Promise.all([
        fetchIssues().catch(() => [] as GitHubIssue[]),
        fetchCommits().catch(() => [] as GitHubCommit[]),
        fetchStats().catch(() => null),
      ]);

      setIssues(issuesData);
      setCommits(commitsData);
      setStats(statsData);
      setActivities(mergeActivities(issuesData, commitsData));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [fetchIssues, fetchCommits, fetchStats, mergeActivities]);

  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  // 自动刷新
  useEffect(() => {
    if (!refreshInterval) return;
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  return {
    issues,
    commits,
    stats,
    activities,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
}

// ============================================================================
// Mock 数据生成器（用于开发/降级）
// ============================================================================

export function getMockCommits(): GitHubCommit[] {
  const now = Date.now();
  return [
    {
      sha: 'abc123',
      commit: {
        message: 'feat: 添加 AI 聊天组件和团队状态展示',
        author: { name: 'Executor', date: new Date().toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'executor' },
    },
    {
      sha: 'def456',
      commit: {
        message: 'feat: 实现暗色/亮色模式切换',
        author: { name: '设计师', date: new Date(now - 3600000).toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'designer' },
    },
    {
      sha: 'ghi789',
      commit: {
        message: 'fix: 优化响应式布局和动画效果',
        author: { name: '架构师', date: new Date(now - 7200000).toISOString() },
      },
      html_url: '#',
      author: { avatar_url: undefined, login: 'architect' },
    },
  ];
}

export function getMockStats(): GitHubStats {
  return {
    stars: 128,
    forks: 24,
    openIssues: 5,
  };
}

export function getMockIssues(): GitHubIssue[] {
  return [
    {
      number: 1,
      title: '实现用户认证系统',
      state: 'open',
      labels: [{ name: 'feature', color: '3B82F6' }],
      assignee: { login: 'executor', avatar_url: '' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      html_url: '#',
    },
    {
      number: 2,
      title: '优化首页加载性能',
      state: 'closed',
      labels: [{ name: 'performance', color: '10B981' }],
      assignee: { login: 'architect', avatar_url: '' },
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      html_url: '#',
    },
  ];
}
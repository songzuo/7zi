'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

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

interface UseDashboardDataReturn {
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
}

/**
 * Dashboard 数据 Hook
 * 
 * 从 GitHub API 获取 Issues 和 Commits 数据
 * 支持自动刷新和错误处理
 */
export function useDashboardData(
  owner: string,
  repo: string,
  token?: string | null
): UseDashboardDataReturn {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 构建 API 请求头 - 使用 useMemo 避免依赖问题
  const headers = useMemo<HeadersInit>(() => {
    const h: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    if (token) {
      h['Authorization'] = `token ${token}`;
    }
    return h;
  }, [token]);

  // 获取 Issues
  const fetchIssues = useCallback(async (): Promise<GitHubIssue[]> => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`仓库 ${owner}/${repo} 不存在`);
        } else if (response.status === 401) {
          throw new Error('GitHub Token 无效');
        } else if (response.status === 403) {
          throw new Error('GitHub API 速率限制，请稍后重试');
        }
        throw new Error(`获取 Issues 失败：${response.statusText}`);
      }

      const data = await response.json();
      // 过滤掉 PR（GitHub API 中 PR 也作为 issue 返回）
      const issuesOnly = data.filter((item: { pull_request?: unknown }) => !item.pull_request);
      setIssues(issuesOnly);
      return issuesOnly;
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      throw err;
    }
  }, [owner, repo, headers]);

  // 获取 Commits
  const fetchCommits = useCallback(async (): Promise<GitHubCommit[]> => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`仓库 ${owner}/${repo} 不存在`);
        } else if (response.status === 401) {
          throw new Error('GitHub Token 无效');
        } else if (response.status === 403) {
          throw new Error('GitHub API 速率限制，请稍后重试');
        }
        throw new Error(`获取 Commits 失败：${response.statusText}`);
      }

      const data = await response.json();
      setCommits(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch commits:', err);
      throw err;
    }
  }, [owner, repo, headers]);

  // 合并活动和排序
  const mergeActivities = useCallback((issuesData: GitHubIssue[], commitsData: GitHubCommit[]) => {
    const activityItems: ActivityItem[] = [];

    // 添加 Commits 作为活动
    commitsData.forEach(commit => {
      activityItems.push({
        id: `commit-${commit.sha}`,
        type: 'commit',
        title: commit.commit.message.split('\n')[0] || '无标题提交',
        author: commit.commit.author.name || '未知',
        avatar: commit.author?.avatar_url,
        timestamp: commit.commit.author.date,
        url: commit.html_url
      });
    });

    // 添加 Issues 作为活动
    issuesData.forEach(issue => {
      activityItems.push({
        id: `issue-${issue.number}`,
        type: 'issue',
        title: `${issue.state === 'open' ? '🟢' : '✅'} #${issue.number}: ${issue.title}`,
        author: issue.assignee?.login || '未分配',
        avatar: issue.assignee?.avatar_url,
        timestamp: issue.updated_at,
        url: issue.html_url
      });
    });

    // 按时间排序（最新的在前）
    activityItems.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // 只保留最近的 20 条
    return activityItems.slice(0, 20);
  }, []);

  // 刷新数据
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 并行获取 Issues 和 Commits
      const [issuesData, commitsData] = await Promise.all([
        fetchIssues().catch(err => {
          console.warn('Issues fetch failed:', err);
          return [];
        }),
        fetchCommits().catch(err => {
          console.warn('Commits fetch failed:', err);
          return [];
        })
      ]);

      // 合并活动
      const mergedActivities = mergeActivities(issuesData, commitsData);
      setActivities(mergedActivities);

      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '数据加载失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchIssues, fetchCommits, mergeActivities]);

  // 初始加载
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    issues,
    commits,
    activities,
    isLoading,
    error,
    lastUpdated,
    refreshData
  };
}

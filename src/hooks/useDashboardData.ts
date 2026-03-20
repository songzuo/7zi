'use client';

import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

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
 * 通过服务端 API 代理获取 GitHub 数据
 * Token 不再暴露在客户端
 */
export function useDashboardData(
  owner: string,
  repo: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _token?: string | null // 保留参数签名以保持向后兼容，但不再使用
): UseDashboardDataReturn {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 获取 Issues - 通过服务端 API 代理
  const fetchIssues = useCallback(async (): Promise<GitHubIssue[]> => {
    try {
      // 使用服务端 API 代理，不再直接调用 GitHub API
      const response = await fetch(
        `/api/github/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `获取 Issues 失败：${response.statusText}`);
      }

      const data = await response.json();
      setIssues(data);
      return data;
    } catch (err) {
      logger.error('Failed to fetch issues:', err);
      throw err;
    }
  }, [owner, repo]);

  // 获取 Commits - 通过服务端 API 代理
  const fetchCommits = useCallback(async (): Promise<GitHubCommit[]> => {
    try {
      // 使用服务端 API 代理，不再直接调用 GitHub API
      const response = await fetch(
        `/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `获取 Commits 失败：${response.statusText}`);
      }

      const data = await response.json();
      setCommits(data);
      return data;
    } catch (err) {
      logger.error('Failed to fetch commits:', err);
      throw err;
    }
  }, [owner, repo]);

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
      // 使用 Promise.allSettled 允许两个请求独立完成
      const [issuesResult, commitsResult] = await Promise.allSettled([
        fetchIssues(),
        fetchCommits()
      ]);

      let issuesData: GitHubIssue[] = [];
      let commitsData: GitHubCommit[] = [];
      let errorMessage: string | null = null;

      // 处理 Issues 结果
      if (issuesResult.status === 'rejected') {
        console.warn('Issues fetch failed:', issuesResult.reason);
        const err = issuesResult.reason;
        errorMessage = err instanceof Error ? err.message : '获取 Issues 失败';
      } else {
        issuesData = issuesResult.value;
      }

      // 处理 Commits 结果
      if (commitsResult.status === 'rejected') {
        console.warn('Commits fetch failed:', commitsResult.reason);
        // 只在还没有错误时设置错误信息
        if (!errorMessage) {
          const err = commitsResult.reason;
          errorMessage = err instanceof Error ? err.message : '获取 Commits 失败';
        }
      } else {
        commitsData = commitsResult.value;
      }

      // 如果有错误，设置错误状态
      if (errorMessage) {
        setError(errorMessage);
      }

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
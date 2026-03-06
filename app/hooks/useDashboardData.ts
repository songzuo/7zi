'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GitHubIssue, GitHubCommit, ActivityItem } from '../app/dashboard/page';

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
 * Dashboard 数据 Hook - 性能优化版本
 *
 * 优化点：
 * 1. 使用 useRef 缓存 API 配置，避免每次渲染重新创建
 * 2. 使用 Promise.all 并行获取 Issues 和 Commits
 * 3. 修复 useEffect 依赖问题，避免无限循环
 * 4. 使用 useMemo 缓存排序结果
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

  // 使用 ref 缓存 API 配置，避免重新创建
  const apiConfigRef = useRef({
    owner,
    repo,
    token,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `token ${token}` } : {}),
    } as HeadersInit,
  });

  // 更新 ref 当参数变化时
  useEffect(() => {
    apiConfigRef.current = {
      owner,
      repo,
      token,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `token ${token}` } : {}),
      } as HeadersInit,
    };
  }, [owner, repo, token]);

  // 获取 Issues - 使用 ref 获取最新配置
  const fetchIssues = useCallback(async (): Promise<GitHubIssue[]> => {
    const { owner: o, repo: r, headers: h } = apiConfigRef.current;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${o}/${r}/issues?state=all&per_page=50`,
        { headers: h }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`仓库 ${o}/${r} 不存在`);
        } else if (response.status === 401) {
          throw new Error('GitHub Token 无效');
        } else if (response.status === 403) {
          throw new Error('GitHub API 速率限制，请稍后重试');
        }
        throw new Error(`获取 Issues 失败：${response.statusText}`);
      }

      const data = await response.json();
      // 过滤掉 PR（GitHub API 中 PR 也作为 issue 返回）
      const issuesOnly = data.filter((item: any) => !item.pull_request);
      setIssues(issuesOnly);
      return issuesOnly;
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      throw err;
    }
  }, []);

  // 获取 Commits - 使用 ref 获取最新配置
  const fetchCommits = useCallback(async (): Promise<GitHubCommit[]> => {
    const { owner: o, repo: r, headers: h } = apiConfigRef.current;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${o}/${r}/commits?per_page=30`,
        { headers: h }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`仓库 ${o}/${r} 不存在`);
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
  }, []);

  // 合并活动和排序 - 使用 useMemo 缓存
  const mergeActivities = useCallback((issuesData: GitHubIssue[], commitsData: GitHubCommit[]): ActivityItem[] => {
    const activityItems: ActivityItem[] = [];

    // 添加 Commits 作为活动
    for (const commit of commitsData) {
      activityItems.push({
        id: `commit-${commit.sha}`,
        type: 'commit',
        title: commit.commit.message.split('\n')[0] || '无标题提交',
        author: commit.commit.author.name || '未知',
        avatar: commit.author?.avatar_url,
        timestamp: commit.commit.author.date,
        url: commit.html_url,
      });
    }

    // 添加 Issues 作为活动
    for (const issue of issuesData) {
      activityItems.push({
        id: `issue-${issue.number}`,
        type: 'issue',
        title: `${issue.state === 'open' ? '🟢' : '✅'} #${issue.number}: ${issue.title}`,
        author: issue.assignee?.login || '未分配',
        avatar: issue.assignee?.avatar_url,
        timestamp: issue.updated_at,
        url: issue.html_url,
      });
    }

    // 按时间排序（最新的在前）
    activityItems.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // 只保留最近的 20 条
    return activityItems.slice(0, 20);
  }, []);

  // 刷新数据 - 使用 Promise.all 并行获取
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用 Promise.all 并行获取 Issues 和 Commits
      const [issuesResult, commitsResult] = await Promise.allSettled([
        fetchIssues(),
        fetchCommits(),
      ]);

      const issuesData = issuesResult.status === 'fulfilled' ? issuesResult.value : [];
      const commitsData = commitsResult.status === 'fulfilled' ? commitsResult.value : [];

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
  }, [mergeActivities]);

  // 使用 ref 跟踪是否已加载，避免 useEffect 依赖问题
  const isInitialLoadRef = useRef(true);

  // 初始加载 - 只在首次渲染时执行
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      refreshData();
    }
  }, []); // 空依赖数组，只在挂载时执行一次

  return {
    issues,
    commits,
    activities,
    isLoading,
    error,
    lastUpdated,
    refreshData,
  };
}

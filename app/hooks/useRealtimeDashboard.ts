'use client';

import { useEffect, useCallback, useState } from 'react';
import { useDashboardData } from './useDashboardData';
import { useWebSocket, WebSocketMessage } from './useWebSocket';

export interface GitHubIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  created_at: string;
  updated_at: string;
  html_url: string;
  assignee?: { login: string; avatar_url: string } | null;
  pull_request?: object;
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
  type: 'commit' | 'issue' | 'comment' | 'push' | 'pull_request' | 'release' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}

interface UseRealtimeDashboardOptions {
  owner: string;
  repo: string;
  token?: string | null;
  wsUrl?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRealtimeDashboardReturn {
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
  isRealtimeConnected: boolean;
  pendingUpdates: number;
  clearPendingUpdates: () => void;
}

/**
 * 实时 Dashboard Hook - 结合 REST API 和 WebSocket
 * 
 * 功能：
 * 1. 初始数据通过 REST API 获取
 * 2. 实时更新通过 WebSocket 推送
 * 3. 自动重连和错误处理
 * 4. 显示待处理更新计数
 */
export function useRealtimeDashboard(
  options: UseRealtimeDashboardOptions
): UseRealtimeDashboardReturn {
  const {
    owner,
    repo,
    token,
    wsUrl,
    autoRefresh = true,
    refreshInterval = 60000, // 默认 1 分钟
  } = options;

  const [pendingUpdates, setPendingUpdates] = useState(0);
  
  // 使用原有的 dashboard data hook
  const dashboardData = useDashboardData(owner, repo, token);
  
  // WebSocket 连接
  const { 
    isConnected: isRealtimeConnected, 
    lastMessage,
    subscribe,
    unsubscribe,
  } = useWebSocket({
    url: wsUrl,
    onMessage: handleWebSocketMessage,
  });

  // 处理 WebSocket 消息
  function handleWebSocketMessage(message: WebSocketMessage) {
    console.log('📨 WebSocket message received:', message.type);
    
    switch (message.type) {
      case 'push':
      case 'issues':
      case 'pull_request':
      case 'release':
        // 有新事件，增加待处理计数
        setPendingUpdates((prev) => prev + 1);
        break;
    }
  }

  // 订阅仓库
  useEffect(() => {
    if (isRealtimeConnected && owner && repo) {
      subscribe(owner, repo);
    }
  }, [isRealtimeConnected, owner, repo, subscribe]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      dashboardData.refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, dashboardData.refreshData]);

  // 当有待处理更新时自动刷新
  useEffect(() => {
    if (pendingUpdates > 0) {
      // 延迟刷新，避免频繁请求
      const timeout = setTimeout(() => {
        dashboardData.refreshData();
        setPendingUpdates(0);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [pendingUpdates, dashboardData]);

  // 清理待处理更新
  const clearPendingUpdates = useCallback(() => {
    setPendingUpdates(0);
  }, []);

  return {
    issues: dashboardData.issues,
    commits: dashboardData.commits,
    activities: dashboardData.activities,
    isLoading: dashboardData.isLoading,
    error: dashboardData.error,
    lastUpdated: dashboardData.lastUpdated,
    refreshData: dashboardData.refreshData,
    isRealtimeConnected,
    pendingUpdates,
    clearPendingUpdates,
  };
}

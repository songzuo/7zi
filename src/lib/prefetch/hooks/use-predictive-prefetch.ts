/**
 * usePredictivePrefetch Hook
 * 
 * 自动预测预加载
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  PredictivePrefetcher,
  globalPrefetcher,
  type UserContext,
  type PrefetchPrediction,
} from '../predictive-prefetcher';
import {
  UserBehaviorAnalyzer,
  globalBehaviorAnalyzer,
} from '../user-behavior';

export interface UsePredictivePrefetchOptions {
  /** 是否启用 */
  enabled?: boolean;
  /** 置信度阈值 */
  confidenceThreshold?: number;
  /** 预加载延迟 (ms) */
  delay?: number;
  /** 最大预加载数量 */
  maxPrefetches?: number;
  /** 是否预加载数据 */
  prefetchData?: boolean;
  /** 是否追踪用户行为 */
  trackBehavior?: boolean;
  /** 调试模式 */
  debug?: boolean;
  /** 预加载回调 */
  onPrefetch?: (predictions: PrefetchPrediction[]) => void;
}

export interface PredictionResult {
  currentPath: string;
  predictions: PrefetchPrediction[];
  prefetched: string[];
  timestamp: number;
}

/**
 * 自动预测预加载 Hook
 */
export function usePredictivePrefetch(options: UsePredictivePrefetchOptions = {}) {
  const {
    enabled = true,
    confidenceThreshold = 0.3,
    delay = 1000,
    maxPrefetches = 3,
    prefetchData = true,
    trackBehavior = true,
    debug = false,
    onPrefetch,
  } = options;

  const prefetcherRef = useRef<PredictivePrefetcher>(globalPrefetcher);
  const behaviorAnalyzerRef = useRef<UserBehaviorAnalyzer>(globalBehaviorAnalyzer);
  const currentPathRef = useRef<string>('');
  const previousPathRef = useRef<string>('');
  const [predictions, setPredictions] = useState<PrefetchPrediction[]>([]);
  const [isPrefetching, setIsPrefetching] = useState(false);

  // 构建用户上下文
  const buildUserContext = useCallback((): UserContext => {
    return {
      currentPath: currentPathRef.current,
      previousPath: previousPathRef.current,
      sessionDuration: getSessionDuration(),
      taskContext: getTaskContext(currentPathRef.current),
      userRole: getUserRole(),
    };
  }, []);

  // 执行预测预加载
  const executePredictivePrefetch = useCallback(async () => {
    if (!enabled || isPrefetching) return;

    setIsPrefetching(true);

    try {
      const context = buildUserContext();
      
      // 获取预测
      const predictedPages = prefetcherRef.current.predictNextPages(context)
        .filter(p => p.confidence >= confidenceThreshold)
        .slice(0, maxPrefetches);

      if (predictedPages.length === 0) {
        if (debug) {
          console.log('[usePredictivePrefetch] No predictions found');
        }
        return;
      }

      setPredictions(predictedPages);

      if (debug) {
        console.log('[usePredictivePrefetch] Predictions:', predictedPages);
      }

      // 延迟预加载
      await new Promise(resolve => setTimeout(resolve, delay));

      // 执行预加载
      const paths = predictedPages.map(p => p.path);
      const results = await prefetcherRef.current.prefetch(paths);

      if (debug) {
        console.log('[usePredictivePrefetch] Prefetch results:', results);
      }

      // 预加载数据
      if (prefetchData) {
        await prefetchDataForPaths(paths);
      }

      if (onPrefetch) {
        onPrefetch(predictedPages);
      }
    } finally {
      setIsPrefetching(false);
    }
  }, [
    enabled,
    isPrefetching,
    buildUserContext,
    confidenceThreshold,
    maxPrefetches,
    delay,
    prefetchData,
    debug,
    onPrefetch,
  ]);

  // 记录页面访问
  const recordPageVisit = useCallback((path: string) => {
    if (!trackBehavior) return;

    const previousPath = currentPathRef.current;
    previousPathRef.current = previousPath;
    currentPathRef.current = path;

    // 记录到行为分析器
    if (previousPath && previousPath !== path) {
      behaviorAnalyzerRef.current.recordNavigation(previousPath, path);
    } else {
      behaviorAnalyzerRef.current.recordVisit(path);
    }

    // 执行预测预加载
    executePredictivePrefetch();
  }, [trackBehavior, executePredictivePrefetch]);

  // 手动触发预加载
  const manualPrefetch = useCallback(async (paths: string[]) => {
    setIsPrefetching(true);

    try {
      const results = await prefetcherRef.current.prefetch(paths);

      if (debug) {
        console.log('[usePredictivePrefetch] Manual prefetch results:', results);
      }

      return results;
    } finally {
      setIsPrefetching(false);
    }
  }, [debug]);

  // 获取特定路径的预测
  const getPredictionsForPath = useCallback((path: string): PrefetchPrediction[] => {
    const context: UserContext = {
      currentPath: path,
      previousPath: previousPathRef.current,
      sessionDuration: getSessionDuration(),
    };

    return prefetcherRef.current.predictNextPages(context)
      .filter(p => p.confidence >= confidenceThreshold)
      .slice(0, maxPrefetches);
  }, [confidenceThreshold, maxPrefetches]);

  // 初始化
  useEffect(() => {
    if (!enabled) return;

    // 获取当前路径
    currentPathRef.current = window.location.pathname;

    // 开始会话
    if (trackBehavior) {
      behaviorAnalyzerRef.current.startSession(currentPathRef.current);
    }

    // 初始预加载
    executePredictivePrefetch();

    // 监听路由变化
    const handleRouteChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPathRef.current) {
        recordPageVisit(newPath);
      }
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);

      // 结束会话
      if (trackBehavior) {
        behaviorAnalyzerRef.current.endSession();
      }
    };
  }, [enabled, trackBehavior, executePredictivePrefetch, recordPageVisit]);

  return {
    predictions,
    isPrefetching,
    recordPageVisit,
    manualPrefetch,
    getPredictionsForPath,
    currentPath: currentPathRef.current,
  };
}

/**
 * 获取会话持续时间
 */
function getSessionDuration(): number {
  // 从 sessionStorage 获取会话开始时间
  if (typeof sessionStorage === 'undefined') return 0;

  const startTime = sessionStorage.getItem('session-start-time');
  if (!startTime) {
    const now = Date.now();
    sessionStorage.setItem('session-start-time', String(now));
    return 0;
  }

  return Date.now() - parseInt(startTime, 10);
}

/**
 * 获取任务上下文
 */
function getTaskContext(path: string): UserContext['taskContext'] | undefined {
  // 根据路径推断任务上下文
  if (path.startsWith('/tasks/') && path !== '/tasks') {
    const id = path.split('/tasks/')[1]?.split('/')[0];
    return {
      type: 'task-editing',
      id,
    };
  }

  if (path.startsWith('/projects/')) {
    return {
      type: 'project-view',
    };
  }

  return undefined;
}

/**
 * 获取用户角色
 */
function getUserRole(): string | undefined {
  // 从 localStorage 获取用户角色
  if (typeof localStorage === 'undefined') return undefined;

  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.role;
    }
  } catch {
    // 忽略解析错误
  }

  return undefined;
}

/**
 * 预加载路径数据
 */
async function prefetchDataForPaths(paths: string[]): Promise<void> {
  const dataMap: Record<string, string[]> = {
    '/dashboard': ['/api/dashboard/stats'],
    '/tasks': ['/api/tasks'],
    '/settings': ['/api/user/preferences'],
    '/projects': ['/api/projects'],
  };

  for (const path of paths) {
    const endpoints = dataMap[path] || [];

    for (const endpoint of endpoints) {
      try {
        // 使用 link 预加载
        if (typeof document !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.as = 'fetch';
          link.href = endpoint;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
        }
      } catch {
        // 忽略预加载错误
      }
    }
  }
}

export default usePredictivePrefetch;

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query 全局配置
 * 
 * 缓存策略：
 * - staleTime: 数据被认为"新鲜"的时间（不会重新请求）
 * - gcTime: 未使用数据保留在缓存中的时间
 * - retry: 失败重试次数
 * - refetchOnWindowFocus: 窗口聚焦时是否重新请求
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据在 5 分钟内被认为是新鲜的，不会自动重新请求
        staleTime: 5 * 60 * 1000,
        // 缓存数据保留 30 分钟
        gcTime: 30 * 60 * 1000,
        // 失败后重试 1 次
        retry: 1,
        // 窗口聚焦时不自动重新请求（减少不必要的请求）
        refetchOnWindowFocus: false,
        // 网络重连时重新请求
        refetchOnReconnect: true,
      },
      mutations: {
        // 变更操作重试 0 次（避免重复创建等）
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 服务端：每次创建新的 QueryClient
    return makeQueryClient();
  } else {
    // 客户端：复用同一个 QueryClient
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发工具 - 仅在开发环境显示 */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// 导出获取 QueryClient 的方法（用于命令式操作）
export { getQueryClient };

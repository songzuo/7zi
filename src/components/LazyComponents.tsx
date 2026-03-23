'use client';

/**
 * Lazy Loading Components - 代码分割和懒加载统一管理
 *
 * 本文件集中管理所有大型组件的动态导入，实现：
 * - 代码分割（Code Splitting）
 * - 按需加载（Lazy Loading）
 * - Loading Fallback
 * - 优化首屏加载速度
 */

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';

// ============================================================================
// 通用 Loading Fallback 组件
// ============================================================================

interface LoadingFallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = '加载中...',
  size = 'md',
  className = '',
}) => (
  <div className={`p-8 flex items-center justify-center ${className}`}>
    <div className="text-center">
      <LoadingSpinner size={size} />
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  </div>
);

// ============================================================================
// Dashboard 相关组件动态导入
// ============================================================================

/**
 * AI 聊天组件
 * - 大小: ~AIChat.tsx
 * - 用途: AI 助手聊天窗口
 */
export const LazyAIChat = dynamic(
  () => import('@/components/AIChat').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback message="加载 AI 助手..." size="md" />,
    ssr: false,
  }
);

/**
 * GitHub 活动组件
 * - 大小: ~GitHubActivity.tsx
 * - 用途: GitHub 活动展示
 */
export const LazyGitHubActivity = dynamic(
  () => import('@/components/GitHubActivity').then(mod => ({ default: mod.GitHubActivity })),
  {
    loading: () => <LoadingFallback message="加载 GitHub 活动..." size="md" />,
    ssr: false,
  }
);

/**
 * 项目仪表盘组件
 * - 大小: ~ProjectDashboard.tsx
 * - 用途: 项目概览仪表盘
 */
export const LazyProjectDashboard = dynamic(
  () => import('@/components/ProjectDashboard').then(mod => ({ default: mod.ProjectDashboard })),
  {
    loading: () => <LoadingFallback message="加载项目仪表盘..." size="md" />,
    ssr: false,
  }
);

/**
 * 任务看板组件
 * - 大小: ~300 行
 * - 用途: 显示 GitHub Issues 任务列表
 */
export const LazyTaskBoard = dynamic(
  () => import('@/components/TaskBoard').then(mod => ({ default: mod.TaskBoard })),
  {
    loading: () => <LoadingFallback message="加载任务看板..." size="md" />,
    ssr: false,
  }
);

/**
 * 活动日志组件
 * - 大小: ~250 行
 * - 用途: 显示 GitHub Commits 活动日志
 */
export const LazyActivityLog = dynamic(
  () => import('@/components/ActivityLog').then(mod => ({ default: mod.ActivityLog })),
  {
    loading: () => <LoadingFallback message="加载活动日志..." size="md" />,
    ssr: false,
  }
);

/**
 * 实时仪表盘组件
 * - 大小: ~450 行
 * - 用途: 实时性能监控和统计数据
 */
export const LazyRealtimeDashboard = dynamic(
  () => import('@/components/RealtimeDashboard').then(mod => ({ default: mod.RealtimeDashboard })),
  {
    loading: () => (
      <LoadingFallback
        message="加载实时仪表盘..."
        size="lg"
        className="bg-zinc-900 rounded-xl"
      />
    ),
    ssr: false,
  }
);

/**
 * 团队活动追踪组件
 * - 大小: ~545 行
 * - 用途: 团队成员活动追踪和统计
 */
export const LazyTeamActivityTracker = dynamic(
  () => import('@/components/TeamActivityTracker').then(mod => ({ default: mod.TeamActivityTracker })),
  {
    loading: () => (
      <LoadingFallback
        message="加载团队活动追踪..."
        size="md"
        className="bg-white dark:bg-zinc-800 rounded-xl"
      />
    ),
    ssr: false,
  }
);

// ============================================================================
// 分析和监控组件动态导入
// ============================================================================

/**
 * 分析仪表盘组件
 * - 大小: ~584 行
 * - 用途: 详细的数据分析和图表
 */
export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard').then(mod => ({ default: mod.AnalyticsDashboard })),
  {
    loading: () => (
      <LoadingFallback
        message="加载分析仪表盘..."
        size="lg"
        className="bg-white dark:bg-zinc-800 rounded-xl"
      />
    ),
    ssr: false,
  }
);

/**
 * 监控仪表盘组件
 * - 大小: ~449 行
 * - 用途: 系统监控指标展示
 */
export const LazyMetricsDashboard = dynamic(
  () => import('@/components/monitoring/MetricsDashboard').then(mod => ({ default: mod.MetricsDashboard })),
  {
    loading: () => (
      <LoadingFallback
        message="加载监控仪表盘..."
        size="lg"
        className="bg-zinc-900 rounded-xl"
      />
    ),
    ssr: false,
  }
);

// ============================================================================
// 协作和会议组件动态导入
// ============================================================================

/**
 * 知识图谱 3D 场景组件
 * - 大小: ~3873 行
 * - 用途: 交互式 3D 知识图谱可视化
 */
export const LazyKnowledgeLatticeScene = dynamic(
  () => import('@/components/knowledge-lattice/KnowledgeLatticeScene'),
  {
    loading: () => (
      <LoadingFallback
        message="加载知识图谱..."
        size="lg"
        className="bg-zinc-900 rounded-lg"
      />
    ),
    ssr: false,
  }
);

/**
 * 会议房间组件
 * - 大小: ~575 行
 * - 用途: 实时协作会议
 */
export const LazyMeetingRoom = dynamic(
  () => import('@/components/meeting/MeetingRoom').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <LoadingFallback
        message="加载会议房间..."
        size="lg"
        className="bg-white dark:bg-zinc-800 rounded-xl"
      />
    ),
    ssr: false,
  }
);

/**
 * 协作组件
 * - 大小: ~349 行
 * - 用途: 实时协作编辑
 * @deprecated 使用 ConnectionStatus 和 UserList 组件替代
 */
// export const LazyCollaboration = dynamic(
//   () => import('@/components/collaboration/OptimizedComponents').then(mod => ({ default: mod.default })),
//   {
//     loading: () => (
//       <LoadingFallback
//         message="加载协作组件..."
//         size="md"
//         className="bg-white dark:bg-zinc-800 rounded-xl"
//       />
//     ),
//     ssr: false,
//   }
// );

// ============================================================================
// 功能组件动态导入
// ============================================================================

/**
 * 数据导出导入组件
 * - 大小: ~554 行
 * - 用途: 数据备份和恢复
 */
export const LazyDataExportImport = dynamic(
  () => import('@/components/DataExportImport/index').then(mod => ({ default: mod.DataExportImport })),
  {
    loading: () => (
      <LoadingFallback
        message="加载数据管理..."
        size="md"
        className="bg-white dark:bg-zinc-800 rounded-xl"
      />
    ),
    ssr: false,
  }
);

/**
 * 全局搜索组件
 * - 大小: ~528 行
 * - 用途: 站内搜索
 */
export const LazyGlobalSearch = dynamic(
  () => import('@/components/search/GlobalSearch').then(mod => ({ default: mod.GlobalSearch })),
  {
    loading: () => <LoadingFallback message="加载搜索..." size="sm" />,
    ssr: false,
  }
);

/**
 * 动画进度条组件
 * - 大小: ~663 行
 * - 用途: 动态进度展示
 */
export const LazyAnimatedProgressBar = dynamic(
  () => import('@/components/AnimatedProgressBar').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback message="加载进度条..." size="sm" />,
    ssr: false,
  }
);

/**
 * 用户设置页面组件
 * - 大小: ~652 行
 * - 用途: 用户偏好设置
 */
export const LazyUserSettings = dynamic(
  () => import('@/components/UserSettings/UserSettingsPage').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <LoadingFallback
        message="加载设置..."
        size="md"
        className="bg-white dark:bg-zinc-800 rounded-xl"
      />
    ),
    ssr: false,
  }
);

/**
 * 反馈管理面板组件
 * - 大小: ~541 行
 * - 用途: 管理用户反馈
 */
export const LazyFeedbackManagement = dynamic(
  () => import('@/components/admin/FeedbackManagementPanel').then(mod => ({ default: mod.FeedbackManagementPanel })),
  {
    loading: () => (
      <LoadingFallback
        message="加载反馈管理..."
        size="md"
        className="bg-white dark:bg-zinc-800 rounded-xl"
      />
    ),
    ssr: false,
  }
);

/**
 * 增强反馈模态框组件
 * - 大小: ~440 行
 * - 用途: 用户反馈提交
 */
export const LazyEnhancedFeedbackModal = dynamic(
  () => import('@/components/EnhancedFeedbackModal').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingFallback message="加载反馈表单..." size="sm" />,
    ssr: false,
  }
);

// ============================================================================
// 示例组件动态导入
// ============================================================================

/**
 * 懒加载图片组件
 * - 大小: ~568 行
 * - 用途: 图片懒加载和优化
 */
export const LazyLazyLoadImage = dynamic(
  () => import('@/components/LazyLoadImage').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" style={{ minHeight: '200px' }} />
    ),
    ssr: false,
  }
);

// ============================================================================
// 性能监控仪表盘（7zi-frontend 项目）
// ============================================================================

/**
 * 性能仪表盘组件
 * - 大小: ~332 行
 * - 来源: 7zi-frontend 项目
 * - 用途: 性能监控指标
 * @deprecated PerformanceDashboard 组件不存在，使用 PerformanceMonitor 替代
 */
// export const LazyPerformanceDashboard = dynamic(
//   () => import('@/components/PerformanceDashboard').then(mod => ({ default: mod.PerformanceDashboard })),
//   {
//     loading: () => (
//       <LoadingFallback
//         message="加载性能仪表盘..."
//         size="lg"
//         className="bg-zinc-900 rounded-lg"
//       />
//     ),
//     ssr: false,
//   }
// );

/**
 * 简化性能仪表盘组件
 * - 大小: ~100 行
 * - 来源: 7zi-frontend 项目
 * - 用途: 轻量级性能监控
 * @deprecated SimplePerformanceDashboard 组件不存在
 */
// export const LazySimplePerformanceDashboard = dynamic(
//   () => import('@/components/SimplePerformanceDashboard').then(mod => ({ default: mod.SimplePerformanceDashboard })),
//   {
//     loading: () => (
//       <LoadingFallback
//         message="加载监控..."
//         size="sm"
//         className="bg-zinc-900 rounded-lg"
//       />
//     ),
//     ssr: false,
//   }
// );

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建自定义 loading fallback
 */
export const createLoadingFallback = (
  message: string,
  size: 'sm' | 'md' | 'lg' = 'md',
  className: string = ''
): React.FC => {
  return () => <LoadingFallback message={message} size={size} className={className} />;
};

/**
 * 预加载组件（可选优化）
 * 注意：谨慎使用，不要预加载所有组件
 */
export const preloadComponent = (componentLoader: () => Promise<{ default: React.ComponentType }>) => {
  componentLoader();
};

/**
 * 批量预加载（在路由变化时调用）
 */
export const preloadComponents = (loaders: Array<() => void>) => {
  // 使用 requestIdleCallback 在浏览器空闲时预加载
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      loaders.forEach(loader => loader());
    });
  } else {
    // 降级方案
    setTimeout(() => {
      loaders.forEach(loader => loader());
    }, 1000);
  }
};

'use client';

/**
 * @fileoverview 性能优化 - Lazy Loading 组件 (增强版)
 * @description 集中管理大型组件的动态导入，减少初始包体积
 * 
 * 优化策略:
 * 1. 使用 next/dynamic 进行代码分割
 * 2. 添加 loading 占位符
 * 3. 按需加载非首屏组件
 * 4. 视口检测懒加载
 * 5. 预加载关键组件
 * 6. 添加 User Timing API 标记
 */

import dynamic from 'next/dynamic';
import { LoadingSpinner } from './LoadingSpinner';
import { useEffect, useState, useRef, ComponentType } from 'react';
import { measureAsync } from '@/lib/performance-optimization';

// Loading 占位组件
const LoadingPlaceholder = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <LoadingSpinner size="lg" />
  </div>
);

// 骨架屏占位组件 - 更好的用户体验
const SkeletonPlaceholder = ({ height = 200 }: { height?: number }) => (
  <div 
    className="animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-2xl"
    style={{ minHeight: height }}
  />
);

/**
 * 视口检测 Hook - 只有进入视口才加载组件
 */
function useIntersectionObserver(
  ref: React.RefObject<Element | null>,
  options: IntersectionObserverInit = { rootMargin: '200px' }
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}

/**
 * 高阶组件：视口懒加载包装器
 */
interface LazyWrapperProps {
  component: ComponentType;
  height?: number;
  rootMargin?: string;
}

export function LazyViewportWrapper({ 
  component: Component, 
  height = 200,
  rootMargin = '200px' 
}: LazyWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldLoad = useIntersectionObserver(ref, { rootMargin });

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {shouldLoad ? <Component /> : <SkeletonPlaceholder height={height} />}
    </div>
  );
}

/**
 * AI 聊天组件 - 仅在用户交互时加载
 * 这是一个较大的组件，包含多个子组件
 * 🚀 优化：使用 measureAsync 追踪加载时间
 */
export const LazyAIChat = dynamic(
  () => measureAsync('ai-chat-load', () => import('./AIChat').then((mod) => ({ default: mod.default }))),
  {
    ssr: false, // 客户端渲染，不需要 SSR
    loading: () => null, // 聊天按钮不需要 loading
  }
);

/**
 * 项目看板组件 - 滚动到视口时加载
 * 包含多个数据展示和交互逻辑
 * 🚀 优化：使用 measureAsync 追踪加载时间
 */
export const LazyProjectDashboard = dynamic(
  () => measureAsync('project-dashboard-load', () => import('./ProjectDashboard').then((mod) => ({ default: mod.ProjectDashboard }))),
  {
    ssr: true,
    loading: () => <SkeletonPlaceholder height={400} />,
  }
);

/**
 * GitHub 活动组件 - 滚动到视口时加载
 * 需要 API 调用，适合延迟加载
 * 🚀 优化：使用 measureAsync 追踪加载时间
 */
export const LazyGitHubActivity = dynamic(
  () => measureAsync('github-activity-load', () => import('./GitHubActivity').then((mod) => ({ default: mod.GitHubActivity }))),
  {
    ssr: true,
    loading: () => <SkeletonPlaceholder height={300} />,
  }
);

/**
 * Hero 3D 组件 - 包含复杂的动画和鼠标交互
 * 仅在桌面端且用户交互时加载
 * 🚀 优化：使用 measureAsync 追踪加载时间
 */
export const LazyHero3D = dynamic(
  () => measureAsync('hero-3d-load', () => import('./Hero3D').then((mod) => ({ default: mod.Hero3D }))),
  {
    ssr: true,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    ),
  }
);

/**
 * 知识图谱 3D 场景组件 - 包含 Three.js 和 React Three Fiber
 * 🚀 优化：独立异步加载，减少主包体积 (982KB)
 * 🚀 优化：使用 measureAsync 追踪加载时间
 */
export const LazyKnowledgeLatticeScene = dynamic(
  () => measureAsync(
    'knowledge-lattice-3d-load',
    () => import('./knowledge-lattice/KnowledgeLatticeScene').then((mod) => ({ default: mod.default }))
  ),
  {
    ssr: false,  // Three.js 不需要 SSR
    loading: () => (
      <div className="flex items-center justify-center min-h-[600px] bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">Loading 3D Scene...</p>
        </div>
      </div>
    ),
  }
);

/**
 * 通知中心组件 - 用户点击时加载
 * 包含复杂的状态管理和动画
 */
export const LazyNotificationCenter = dynamic(
  () => import('./NotificationCenter/NotificationCenter').then((mod) => ({ default: mod.NotificationCenter })),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 设置面板组件 - 用户点击时加载
 */
export const LazySettingsPanel = dynamic(
  () => import('./SettingsPanel').then((mod) => ({ default: mod.SettingsPanel })),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 任务看板组件 - 数据密集型组件
 */
export const LazyTaskBoard = dynamic(
  () => import('./TaskBoard').then((mod) => ({ default: mod.TaskBoard })),
  {
    ssr: true,
    loading: () => <SkeletonPlaceholder height={400} />,
  }
);

/**
 * 联系表单组件 - 交互时加载
 */
export const LazyContactForm = dynamic(
  () => import('./ContactForm').then((mod) => ({ default: mod.ContactForm })),
  {
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    ),
  }
);

/**
 * 用户设置页面组件 - 仅在设置页面加载
 */
export const LazyUserSettingsPage = dynamic(
  () => import('./UserSettings/UserSettingsPage').then((mod) => ({ default: mod.UserSettingsPage })),
  {
    ssr: true,
    loading: LoadingPlaceholder,
  }
);

/**
 * PWA 安装提示组件 - 客户端判断后加载
 */
export const LazyPWAInstallPrompt = dynamic(
  () => import('./PWAInstallPrompt').then((mod) => ({ default: mod.PWAInstallPrompt })),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 预加载函数 - 用于关键组件的预加载
 */
export const preloadComponents = {
  aiChat: () => import('./AIChat'),
  projectDashboard: () => import('./ProjectDashboard'),
  githubActivity: () => import('./GitHubActivity'),
};

/**
 * 导出类型
 */
export type LazyComponentProps = {
  fallback?: React.ReactNode;
};
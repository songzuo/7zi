/**
 * Code Splitting Utilities
 * 代码分割工具
 * 
 * 功能：
 * - 动态导入大型依赖（Three.js, 等）
 * - 按路由分割代码
 * - 预加载策略
 * - Chunk 优化
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// ============================================
// Type Definitions
// ============================================

/**
 * Helper type to extract default export from modules
 */
type ModuleDefault<T> = T extends { default: infer U } ? U : T;

// ============================================
// Three.js 优化导入
// ============================================

/**
 * 动态导入 Three.js 核心
 *
 * Three.js 是一个非常大的库（~600KB+），
 * 应该只在需要 3D 功能的页面中动态导入
 */
export const ThreeJS = dynamic<{ children?: React.ReactNode }>(
  () => import('three').then((mod) => mod as unknown as ComponentType<{ children?: React.ReactNode }>),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 动态导入 React Three Fiber
 */
export const ReactThreeFiber = dynamic<{ children?: React.ReactNode }>(
  () => import('@react-three/fiber').then((mod) => mod.default as unknown as ComponentType<{ children?: React.ReactNode }>),
  {
    ssr: false,
    loading: () => null,
  }
);

/**
 * 动态导入 React Three Drei
 */
export const ReactThreeDrei = dynamic<{ children?: React.ReactNode }>(
  () => import('@react-three/drei').then((mod) => mod as unknown as ComponentType<{ children?: React.ReactNode }>),
  {
    ssr: false,
    loading: () => null,
  }
);

// ============================================
// 知识图谱 3D 组件优化
// ============================================

/**
 * 知识图谱场景 - 完全动态加载
 */
export const OptimizedKnowledgeLatticeScene = dynamic(
  () => import('@/components/knowledge-lattice/KnowledgeLatticeScene'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[600px] bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-2xl">
        <p className="text-zinc-500">Loading 3D scene...</p>
      </div>
    ),
  }
);

// ============================================
// Excel 工具优化
// ============================================

/**
 * SheetJS (xlsx) 库 - 完全动态加载
 */
export const SheetJS = dynamic<{ children?: React.ReactNode }>(
  () => import('xlsx').then((mod) => mod as unknown as ComponentType<{ children?: React.ReactNode }>),
  {
    ssr: false,
    loading: () => null,
  }
);

// ============================================
// 重型图表库
// ============================================

/**
 * Chart.js 按需加载
 * 注意：chart.js 暂未安装，如需使用请先运行: npm install chart.js
 */
// export const ChartJS = dynamic<{ children?: React.ReactNode }>(
//   () => import('chart.js').then((mod) => mod.Chart) as any,
//   {
//     ssr: false,
//     loading: () => null,
//   }
// );

// ============================================
// Markdown 处理
// ============================================

/**
 * Markdown 解析器 - 延迟加载
 * 注意：marked 暂未安装，如需使用请先运行: npm install marked
 */
// export const MarkdownParser = dynamic(
//   () => import('marked'),
//   {
//     ssr: false,
//     loading: () => null,
//   }
// );

// ============================================
// 预加载工具
// ============================================

/**
 * 预加载 Chunk
 */
export function preloadChunk<T = unknown>(importFn: () => Promise<T>): void {
  if (typeof window !== 'undefined') {
    importFn().catch(console.error);
  }
}

/**
 * 预加载 Three.js 及相关库
 */
export function preloadThreeJS(): void {
  if (typeof window === 'undefined') return;

  // Type for requestIdleCallback options
  interface IdleCallbackOptions {
    timeout?: number;
  }

  // Type for window with requestIdleCallback
  type WindowWithIdleCallback = Window & {
    requestIdleCallback?: (callback: () => void, options?: IdleCallbackOptions) => number;
  }

  // 使用 requestIdleCallback 进行预加载
  const schedule = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      (window as WindowWithIdleCallback).requestIdleCallback?.(callback, { timeout: 5000 });
    } else {
      setTimeout(callback, 100);
    }
  };

  schedule(() => {
    preloadChunk(() => import('three'));
  });

  schedule(() => {
    preloadChunk(() => import('@react-three/fiber'));
  });

  schedule(() => {
    preloadChunk(() => import('@react-three/drei'));
  });

  schedule(() => {
    preloadChunk(() => import('@/components/knowledge-lattice/KnowledgeLatticeScene'));
  });
}

// ============================================
// Hooks
// ============================================

import { useState, useEffect } from 'react';

/**
 * Hook: 使用 Intersection Observer 进行懒加载
 */
export function useLazyLoad(
  componentRef: React.RefObject<HTMLElement | null>,
  options: { rootMargin?: string; threshold?: number } = {}
) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = componentRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options.rootMargin || '200px',
        threshold: options.threshold || 0,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [componentRef, options.rootMargin, options.threshold]);

  return shouldLoad;
}

// ============================================
// 最佳实践建议
// ============================================

/**
 * 获取代码分割最佳实践
 */
export function getCodeSplittingBestPractices(): string[] {
  return [
    'Three.js 应该始终使用 dynamic import 动态导入',
    '使用 ssr: false 避免服务端渲染 Three.js',
    '大型库（如 xlsx）应该按需加载',
    '使用 next/dynamic 的 loading 回调提供加载状态',
    '使用 preloadChunk 在空闲时间预加载资源',
    '移动端应该使用轻量级替代方案',
    '使用 React.Suspense 配合动态导入优化用户体验',
    '避免在首屏渲染时导入重型库',
    '使用 bundle analyzer 分析包体积',
    '配置 webpack splitChunks 优化缓存',
  ];
}

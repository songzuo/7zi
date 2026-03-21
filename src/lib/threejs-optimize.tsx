/**
 * Three.js Dynamic Import Optimizer
 * 优化 Three.js 动态导入，减少主包体积
 * 
 * 功能：
 * - 异步加载 Three.js 组件
 * - 预加载关键资源
 * - 资源优先级管理
 * - 内存管理
 */

import dynamic, { type DynamicOptions } from 'next/dynamic';

// ============================================
// 类型定义
// ============================================

/**
 * Three.js component props type
 */
export interface ThreeJSComponentProps {
  children?: React.ReactNode;
}

export interface ThreeJSComponentOptions {
  /** 是否预加载 */
  preload?: boolean;
  /** 预加载延迟 (ms) */
  preloadDelay?: number;
  /** 加载时显示的占位符类型 */
  placeholderType?: 'spinner' | 'skeleton' | 'blur';
  /** 是否启用调试 */
  debug?: boolean;
  ssr?: boolean;
  loading?: () => React.ReactNode | null;
}

// ============================================
// Three.js 动态导入选项
// ============================================

const DEFAULT_OPTIONS: ThreeJSComponentOptions = {
  ssr: false, // Three.js 不需要 SSR
  loading: () => null,
};

// ============================================
// Knowledge Lattice Scene
// 知识图谱 3D 场景 (Three.js + React Three Fiber)
// ============================================

export const LazyKnowledgeLatticeScene = dynamic(
  () => import('@/components/knowledge-lattice/KnowledgeLatticeScene'),
  {
    ...DEFAULT_OPTIONS,
    loading: ({ error, isLoading, pastDelay }) => {
      if (error) {
        return (
          <div className="flex items-center justify-center min-h-[600px] text-red-500">
            <p>Failed to load 3D scene: {error.message}</p>
          </div>
        );
      }
      if (isLoading) {
        return (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        );
      }
      if (pastDelay) {
        return (
          <div className="flex items-center justify-center min-h-[600px] bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-2xl">
            <p className="text-zinc-500">Loading 3D scene...</p>
          </div>
        );
      }
      return null;
    },
  }
);

// ============================================
// Preload Manager
// 预加载管理器
// ============================================

class PreloadManager {
  private preloaded: Set<string> = new Set();
  private preloading: Set<string> = new Set();

  /**
   * 预加载 Three.js 组件
   */
  async preload(
    componentName: string,
    options: ThreeJSComponentOptions = {}
  ): Promise<void> {
    const { preloadDelay = 2000, debug = false } = options;

    // 如果已经预加载或正在预加载，直接返回
    if (this.preloaded.has(componentName) || this.preloading.has(componentName)) {
      return;
    }

    this.preloading.add(componentName);

    // 延迟预加载，避免阻塞首屏渲染
    await new Promise((resolve) => setTimeout(resolve, preloadDelay));

    try {
      switch (componentName) {
        case 'KnowledgeLatticeScene':
          await import('@/components/knowledge-lattice/KnowledgeLatticeScene');
          break;
        default:
          if (debug) {
            console.warn(`[ThreeJS Preload] Unknown component: ${componentName}`);
          }
      }

      this.preloaded.add(componentName);
      
      if (debug) {
        console.log(`[ThreeJS Preload] Preloaded: ${componentName}`);
      }
    } catch (error) {
      console.error(`[ThreeJS Preload] Failed to preload ${componentName}:`, error);
    } finally {
      this.preloading.delete(componentName);
    }
  }

  /**
   * 预加载多个组件
   */
  async preloadAll(
    components: string[],
    options: ThreeJSComponentOptions = {}
  ): Promise<void> {
    const { preloadDelay = 2000 } = options;

    // 逐个预加载，避免并发过多
    for (const component of components) {
      await this.preload(component, { ...options, preloadDelay });
    }
  }

  /**
   * 检查是否已预加载
   */
  isPreloaded(componentName: string): boolean {
    return this.preloaded.has(componentName);
  }

  /**
   * 获取已预加载的组件列表
   */
  getPreloadedList(): string[] {
    return Array.from(this.preloaded);
  }

  /**
   * 清除预加载状态
   */
  clear(): void {
    this.preloaded.clear();
    this.preloading.clear();
  }
}

// 单例导出
export const preloadManager = new PreloadManager();

// ============================================
// Hooks
// ============================================

import { useState, useEffect, useRef } from 'react';

/**
 * 使用 Intersection Observer 进行懒加载
 */
export function useLazyLoad3D(
  componentName: string,
  options: ThreeJSComponentOptions = {}
) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: options.preloadDelay ? `${options.preloadDelay}px` : '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [componentName, options.preloadDelay]);

  return { ref, shouldLoad };
}

// ============================================
// Three.js Bundle Optimization
// ============================================

export function getThreeJSBundleAdvice(): string[] {
  return [
    'Use dynamic imports for all Three.js components',
    'Enable tree-shaking by importing only needed modules',
    'Use @react-three/drei for optimized 3D primitives',
    'Lazy load textures and models after initial render',
    'Consider using low-poly models for mobile devices',
    'Use compressed textures (Draco compression for GLB)',
    'Implement LOD (Level of Detail) for complex models',
    'Use instancing for repeated geometries',
    'Disable shadows for non-essential elements',
    'Use requestAnimationFrame throttling for background tabs',
  ];
}

// ============================================
// Memory Management
// ============================================

export function disposeThreeJSResources(container: HTMLElement): void {
  // 递归查找并处理所有 Three.js 相关资源
  const canvases = container.querySelectorAll('canvas');
  
  canvases.forEach((canvas) => {
    // 获取 WebGL 上下文
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    if (gl) {
      // 强制释放 WebGL 资源
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }

    // 清除画布
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // 触发垃圾回收提示
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as Window & { gc?: () => void }).gc?.();
  }
}

export default {
  LazyKnowledgeLatticeScene,
  preloadManager,
  useLazyLoad3D,
  getThreeJSBundleAdvice,
  disposeThreeJSResources,
};

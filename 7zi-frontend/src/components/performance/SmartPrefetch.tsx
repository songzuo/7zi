'use client'

/**
 * 智能预加载组件
 * 基于用户行为预测进行资源预加载
 *
 * @version 1.0.0
 * @date 2026-03-29
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

// ============================================
// 类型定义
// ============================================

export interface PrefetchConfig {
  /** 预加载 URL */
  url: string
  /** 优先级 (1-10, 10最高) */
  priority?: number
  /** 预加载类型 */
  type?: 'page' | 'image' | 'api' | 'script' | 'style'
  /** 预加载条件 */
  condition?: () => boolean
  /** 延迟预加载 (ms) */
  delay?: number
}

export interface UserBehavior {
  /** 鼠标悬停时间 */
  hoverTime: number
  /** 滚动方向 */
  scrollDirection: 'up' | 'down' | 'left' | 'right' | null
  /** 视口位置 */
  viewportPosition: number
  /** 最后交互时间 */
  lastInteraction: number
}

export interface SmartPrefetchProps {
  /** 预加载配置列表 */
  configs: PrefetchConfig[]
  /** 是否启用悬停预加载 */
  enableHoverPrefetch?: boolean
  /** 悬停触发阈值 (ms) */
  hoverThreshold?: number
  /** 是否启用可视区域预加载 */
  enableViewportPrefetch?: boolean
  /** 可视区域预加载距离 (px) */
  viewportDistance?: number
  /** 最大并发预加载数 */
  maxConcurrent?: number
  /** 预加载回调 */
  onPrefetch?: (url: string, type: string) => void
  /** 子元素 */
  children?: React.ReactNode
}

// ============================================
// 用户行为追踪 Hook
// ============================================

function useUserBehavior() {
  const [behavior, setBehavior] = useState<UserBehavior>({
    hoverTime: 0,
    scrollDirection: null,
    viewportPosition: 0,
    lastInteraction: Date.now(),
  })

  const lastScrollY = useRef(0)
  const hoverStartRef = useRef<number | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const direction = currentY > lastScrollY.current ? 'down' : 'up'
      lastScrollY.current = currentY

      setBehavior(prev => ({
        ...prev,
        scrollDirection: direction,
        viewportPosition: currentY / (document.body.scrollHeight - window.innerHeight),
        lastInteraction: Date.now(),
      }))
    }

    const handleInteraction = () => {
      setBehavior(prev => ({
        ...prev,
        lastInteraction: Date.now(),
      }))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleInteraction, { passive: true })
    window.addEventListener('touchstart', handleInteraction, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  const startHover = useCallback(() => {
    hoverStartRef.current = Date.now()
  }, [])

  const endHover = useCallback(() => {
    if (hoverStartRef.current !== null) {
      const hoverTime = Date.now() - hoverStartRef.current
      setBehavior(prev => ({
        ...prev,
        hoverTime,
        lastInteraction: Date.now(),
      }))
      hoverStartRef.current = null
    }
  }, [])

  return { behavior, startHover, endHover }
}

// ============================================
// 预加载执行器
// ============================================

class PrefetchExecutor {
  private queue: Array<{ config: PrefetchConfig; resolve: () => void }> = []
  private active = 0
  private maxConcurrent: number
  private prefetched = new Set<string>()

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
  }

  async prefetch(config: PrefetchConfig): Promise<void> {
    // 已预加载则跳过
    if (this.prefetched.has(config.url)) {
      return
    }

    // 检查条件
    if (config.condition && !config.condition()) {
      return
    }

    const task = new Promise<void>(resolve => {
      this.queue.push({ config, resolve })
      this.processQueue()
    })

    return task
  }

  private processQueue() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    this.active++

    const { config, resolve } = this.queue.shift()!

    this.executePrefetch(config)
      .then(() => {
        this.prefetched.add(config.url)
      })
      .finally(() => {
        this.active--
        resolve()
        this.processQueue()
      })
  }

  private async executePrefetch(config: PrefetchConfig): Promise<void> {
    const delay = config.delay ?? 0

    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay))
    }

    switch (config.type) {
      case 'page':
        return this.prefetchPage(config.url)
      case 'image':
        return this.prefetchImage(config.url)
      case 'api':
        return this.prefetchApi(config.url)
      case 'script':
        return this.prefetchScript(config.url)
      case 'style':
        return this.prefetchStyle(config.url)
      default:
        return this.prefetchPage(config.url)
    }
  }

  private prefetchPage(url: string): Promise<void> {
    return new Promise(resolve => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      link.onload = () => resolve()
      link.onerror = () => resolve()
      document.head.appendChild(link)
    })
  }

  private prefetchImage(url: string): Promise<void> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = url
    })
  }

  private prefetchApi(url: string): Promise<void> {
    return fetch(url, { method: 'GET', credentials: 'include' })
      .then(() => {})
      .catch(() => {})
  }

  private prefetchScript(url: string): Promise<void> {
    return new Promise(resolve => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = url
      link.onload = () => resolve()
      link.onerror = () => resolve()
      document.head.appendChild(link)
    })
  }

  private prefetchStyle(url: string): Promise<void> {
    return new Promise(resolve => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = url
      link.onload = () => resolve()
      link.onerror = () => resolve()
      document.head.appendChild(link)
    })
  }

  clear() {
    this.prefetched.clear()
  }
}

// 全局预加载执行器实例
const globalExecutor = new PrefetchExecutor()

// ============================================
// 可视区域检测组件
// ============================================

interface ViewportPrefetchProps {
  configs: PrefetchConfig[]
  distance?: number
  onPrefetch?: (url: string) => void
}

function ViewportPrefetch({ configs, distance = 200, onPrefetch }: ViewportPrefetchProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const url = entry.target.getAttribute('data-prefetch-url')
            if (url) {
              const config = configs.find(c => c.url === url)
              if (config) {
                globalExecutor.prefetch(config)
                onPrefetch?.(url)
              }
            }
          }
        })
      },
      { rootMargin: `${distance}px` }
    )

    // 观察所有带有预加载标记的元素
    const targets = container.querySelectorAll('[data-prefetch-url]')
    targets.forEach(target => observer.observe(target))

    return () => observer.disconnect()
  }, [configs, distance, onPrefetch])

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      {configs.map(config => (
        <div
          key={config.url}
          data-prefetch-url={config.url}
          style={{ display: 'none' }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// ============================================
// 悬停预加载组件
// ============================================

interface HoverPrefetchProps {
  url: string
  type?: PrefetchConfig['type']
  threshold?: number
  onPrefetch?: (url: string) => void
  children: React.ReactNode
}

export function HoverPrefetch({
  url,
  type = 'page',
  threshold = 100,
  onPrefetch,
  children,
}: HoverPrefetchProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      globalExecutor.prefetch({ url, type })
      onPrefetch?.(url)
    }, threshold)
  }, [url, type, threshold, onPrefetch])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  )
}

// ============================================
// 智能预加载主组件
// ============================================

export function SmartPrefetch({
  configs,
  enableHoverPrefetch = true,
  hoverThreshold = 100,
  enableViewportPrefetch = true,
  viewportDistance = 200,
  maxConcurrent = 3,
  onPrefetch,
  children,
}: SmartPrefetchProps) {
  const { behavior } = useUserBehavior()
  const executorRef = useRef(new PrefetchExecutor(maxConcurrent))

  // 根据优先级和用户行为预测预加载
  const sortedConfigs = useMemo(() => {
    return [...configs]
      .sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5))
      .filter(c => !c.condition || c.condition())
  }, [configs])

  // 高优先级资源立即预加载
  useEffect(() => {
    const highPriority = sortedConfigs.filter(c => (c.priority ?? 5) >= 8)
    highPriority.forEach(config => {
      executorRef.current.prefetch(config)
    })
  }, [sortedConfigs])

  const handlePrefetch = useCallback(
    (url: string) => {
      const config = configs.find(c => c.url === url)
      if (config) {
        onPrefetch?.(url, config.type ?? 'page')
      }
    },
    [configs, onPrefetch]
  )

  return (
    <>
      {enableViewportPrefetch && (
        <ViewportPrefetch
          configs={sortedConfigs}
          distance={viewportDistance}
          onPrefetch={handlePrefetch}
        />
      )}
      {children}
    </>
  )
}

// ============================================
// 预加载链接组件
// ============================================

interface PrefetchLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  prefetchType?: PrefetchConfig['type']
  prefetchDelay?: number
  prefetchOnHover?: boolean
  prefetchInViewport?: boolean
}

export const PrefetchLink = ({
  href,
  prefetchType = 'page',
  prefetchDelay = 0,
  prefetchOnHover = true,
  prefetchInViewport = true,
  children,
  ...props
}: PrefetchLinkProps) => {
  const ref = useRef<HTMLAnchorElement>(null)
  const prefetchedRef = useRef(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 可视区域预加载
  useEffect(() => {
    if (!prefetchInViewport) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !prefetchedRef.current) {
            globalExecutor.prefetch({
              url: href,
              type: prefetchType,
              delay: prefetchDelay,
            })
            prefetchedRef.current = true
          }
        })
      },
      { rootMargin: '200px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [href, prefetchType, prefetchDelay, prefetchInViewport])

  // 悬停预加载
  const handleMouseEnter = useCallback(() => {
    if (!prefetchOnHover || prefetchedRef.current) return

    hoverTimerRef.current = setTimeout(() => {
      globalExecutor.prefetch({
        url: href,
        type: prefetchType,
        delay: 0,
      })
      prefetchedRef.current = true
    }, 100)
  }, [href, prefetchType, prefetchOnHover])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  return (
    <a
      ref={ref}
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </a>
  )
}

// ============================================
// Hook: 使用智能预加载
// ============================================

export function useSmartPrefetch(configs: PrefetchConfig[]) {
  const executorRef = useRef(globalExecutor)

  useEffect(() => {
    // 组件挂载时预加载高优先级资源
    const highPriority = configs.filter(c => (c.priority ?? 5) >= 8)
    highPriority.forEach(config => {
      executorRef.current.prefetch(config)
    })
  }, [configs])

  const prefetchNow = useCallback((url: string, type: PrefetchConfig['type'] = 'page') => {
    executorRef.current.prefetch({ url, type, priority: 10 })
  }, [])

  return { prefetchNow }
}

export default SmartPrefetch

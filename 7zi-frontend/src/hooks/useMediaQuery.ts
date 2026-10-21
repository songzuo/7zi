/**
 * useMediaQuery - 媒体查询 Hook
 *
 * 功能特性：
 * - 响应式断点检测
 * - 性能优化（防抖）
 * - TypeScript 类型支持
 * - 移动端/平板/桌面检测
 * - 自动清理
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MediaQueryOptions {
  /**
   * 防抖延迟（毫秒）
   * @default 150
   */
  debounceDelay?: number
}

/**
 * useMediaQuery Hook
 *
 * @param query - CSS 媒体查询字符串
 * @param options - 配置选项
 * @returns 是否匹配媒体查询
 *
 * @example
 * // 基础用法
 * const isMobile = useMediaQuery('(max-width: 639px)');
 *
 * @example
 * // 防抖配置
 * const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)', {
 *   debounceDelay: 200,
 * });
 */
export function useMediaQuery(query: string, options: MediaQueryOptions = {}): boolean {
  const { debounceDelay = 150 } = options

  const [matches, setMatches] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)

    // 初始化状态
    setMatches(media.matches)

    let debounceTimer: NodeJS.Timeout

    const handleChange = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        setMatches(media.matches)
      }, debounceDelay)
    }

    // 添加监听器
    media.addEventListener('change', handleChange)

    return () => {
      clearTimeout(debounceTimer)
      media.removeEventListener('change', handleChange)
    }
  }, [query, debounceDelay])

  // 服务器端渲染时返回 false
  return isClient ? matches : false
}

/**
 * 检测是否为移动设备
 * @returns 是否为移动设备（宽度 < 640px）
 *
 * @example
 * const isMobile = useIsMobile();
 * if (isMobile) {
 *   return <MobileView />;
 * }
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)')
}

/**
 * 检测是否为平板设备
 * @returns 是否为平板设备（640px ≤ 宽度 < 1024px）
 *
 * @example
 * const isTablet = useIsTablet();
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
}

/**
 * 检测是否为桌面设备
 * @returns 是否为桌面设备（宽度 ≥ 1024px）
 *
 * @example
 * const isDesktop = useIsDesktop();
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}

/**
 * 检测是否为大屏设备
 * @returns 是否为大屏设备（宽度 ≥ 1280px）
 *
 * @example
 * const isLargeDesktop = useIsLargeDesktop();
 */
export function useIsLargeDesktop(): boolean {
  return useMediaQuery('(min-width: 1280px)')
}

/**
 * 检测设备方向
 * @returns 是否为横屏
 *
 * @example
 * const isLandscape = useIsLandscape();
 */
export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)')
}

/**
 * 检测是否为竖屏
 * @returns 是否为竖屏
 *
 * @example
 * const isPortrait = useIsPortrait();
 */
export function useIsPortrait(): boolean {
  return useMediaQuery('(orientation: portrait)')
}

/**
 * 检测是否支持触摸
 * @returns 是否为触摸设备
 *
 * @example
 * const isTouchDevice = useIsTouchDevice();
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)')
}

/**
 * 检测用户是否偏好减少动画
 * @returns 是否偏好减少动画
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * 检测深色模式偏好
 * @returns 是否偏好深色模式
 *
 * @example
 * const prefersDark = usePrefersDarkMode();
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

/**
 * 设备类型 Hook
 * 返回当前设备的类型信息
 *
 * @returns 设备类型对象
 *
 * @example
 * const device = useDeviceType();
 * console.log(device.type); // 'mobile' | 'tablet' | 'desktop'
 * console.log(device.orientation); // 'landscape' | 'portrait'
 */
export interface DeviceType {
  type: 'mobile' | 'tablet' | 'desktop'
  orientation: 'landscape' | 'portrait'
  isTouch: boolean
  prefersReducedMotion: boolean
}

export function useDeviceType(): DeviceType {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isLandscape = useIsLandscape()
  const isTouch = useIsTouchDevice()
  const prefersReducedMotion = usePrefersReducedMotion()

  const type: DeviceType['type'] = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

  return {
    type,
    orientation: isLandscape ? 'landscape' : 'portrait',
    isTouch,
    prefersReducedMotion,
  }
}

/**
 * 响应式值 Hook
 * 根据屏幕宽度返回不同的值
 *
 * @param values - 响应式值配置
 * @returns 当前屏幕对应的值
 *
 * @example
 * const fontSize = useResponsiveValue({
 *   mobile: '14px',
 *   tablet: '16px',
 *   desktop: '18px',
 * });
 */
export interface ResponsiveValueConfig<T> {
  mobile: T
  tablet?: T
  desktop?: T
  largeDesktop?: T
}

export function useResponsiveValue<T>(values: ResponsiveValueConfig<T>): T {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const isDesktop = useIsDesktop()
  const isLargeDesktop = useIsLargeDesktop()

  if (isLargeDesktop && values.largeDesktop) {
    return values.largeDesktop
  }

  if (isDesktop && values.desktop) {
    return values.desktop
  }

  if (isTablet && values.tablet) {
    return values.tablet
  }

  return values.mobile
}

/**
 * 窗口尺寸 Hook
 * 返回当前窗口尺寸和断点信息
 *
 * @returns 窗口尺寸对象
 *
 * @example
 * const { width, height, breakpoint } = useWindowSize();
 * console.log(`Width: ${width}px, Breakpoint: ${breakpoint}`);
 */
export interface WindowSize {
  width: number
  height: number
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large-desktop'
}

export function useWindowSize(): WindowSize | null {
  const [windowSize, setWindowSize] = useState<WindowSize | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    if (typeof window === 'undefined') return

    const updateSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      let breakpoint: WindowSize['breakpoint'] = 'mobile'
      if (width >= 1280) {
        breakpoint = 'large-desktop'
      } else if (width >= 1024) {
        breakpoint = 'desktop'
      } else if (width >= 640) {
        breakpoint = 'tablet'
      }

      setWindowSize({ width, height, breakpoint })
    }

    updateSize()

    // 使用防抖优化性能
    let debounceTimer: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(updateSize, 150)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(debounceTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return windowSize
}

export default useMediaQuery

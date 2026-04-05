/**
 * 统一的响应式断点配置
 * 与 Tailwind CSS 标准断点保持一致
 *
 * Tailwind 标准断点:
 * - sm: 640px
 * - md: 768px
 * - lg: 1024px
 * - xl: 1280px
 * - 2xl: 1536px
 */

export const BREAKPOINTS = {
  sm: 640, // Small screens (landscape phones)
  md: 768, // Medium screens (tablets)
  lg: 1024, // Large screens (laptops)
  xl: 1280, // Extra large screens (desktops)
  '2xl': 1536, // 2X large screens
} as const

export type BreakpointKey = keyof typeof BREAKPOINTS

/**
 * 检查当前视口宽度是否小于指定断点
 * @param breakpoint 断点名称
 * @returns boolean
 */
export function isBelowBreakpoint(breakpoint: BreakpointKey): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < BREAKPOINTS[breakpoint]
}

/**
 * 检查当前视口宽度是否大于等于指定断点
 * @param breakpoint 断点名称
 * @returns boolean
 */
export function isAtLeastBreakpoint(breakpoint: BreakpointKey): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= BREAKPOINTS[breakpoint]
}

/**
 * 获取当前适用的断点
 * @returns 当前断点名称
 */
export function getCurrentBreakpoint(): BreakpointKey {
  if (typeof window === 'undefined') return 'md'

  const width = window.innerWidth

  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  return 'sm'
}


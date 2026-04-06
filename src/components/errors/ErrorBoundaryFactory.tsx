/**
 * @fileoverview Page Error Boundary Factory
 * @description 统一的页面级错误边界生成器，减少重复代码
 */

'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * 创建页面级错误边界组件
 * @param title - 错误标题
 * @returns 错误边界组件
 *
 * @example
 * ```tsx
 * // 在 page/error.tsx 中使用
 * export default createPageErrorBoundary('首页加载失败');
 * ```
 */
export function createPageErrorBoundary(title: string) {
  return function PageError({
    error,
    reset,
  }: {
    error: Error & { digest?: string }
    reset: () => void
  }) {
    return <ErrorBoundary error={error} reset={reset} title={title} />
  }
}

/**
 * 预定义的错误边界组件
 */
export const HomeError = createPageErrorBoundary('首页加载失败')
export const AboutError = createPageErrorBoundary('关于我们页面加载失败')
export const BlogError = createPageErrorBoundary('博客页面加载失败')
export const BlogSlugError = createPageErrorBoundary('文章加载失败')
export const ContactError = createPageErrorBoundary('联系我们页面加载失败')
export const DashboardError = createPageErrorBoundary('控制面板加载失败')
export const TeamError = createPageErrorBoundary('团队成员页面加载失败')

// 导出错误页面组件
export { default as UnauthorizedPage } from './UnauthorizedPage'
export { default as ForbiddenPage } from './ForbiddenPage'

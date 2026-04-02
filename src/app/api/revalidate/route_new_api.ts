/**
 * @fileoverview Server Actions 新缓存 API 测试
 * @description 测试 Next.js 16 的 updateTag() 和 refresh() API
 *
 * 这些是未来版本中将支持的新 API，当前作为参考实现
 * 迁移自旧的 revalidateTag(tag) 单参数形式
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'

// 模拟新 API 的类型定义（当 next/cache 导出这些时）
// import { updateTag, refresh } from 'next/cache';

type Locale = 'zh' | 'en'

/**
 * 使用 updateTag 立即刷新用户相关缓存
 * 适用于用户更新自己的资料后需要立即看到更改的场景
 *
 * updateTag() 提供 "read-your-writes" 语义：
 * - 立即使指定 tag 的缓存失效
 * - 同时触发后台刷新
 * - 用户立即看到新数据
 */
export async function updateUserCache(userId: string) {
  // 模拟 updateTag(userId) 调用
  // 实际使用时替换为: await updateTag(`user-${userId}`);

  // 重新验证用户相关页面
  revalidatePath(`/zh/user/${userId}`)
  revalidatePath(`/en/user/${userId}`)

  // 使用新的 cacheLife profile
  revalidateTag(`user-${userId}`, 'max')

  return { success: true, tag: `user-${userId}` }
}

/**
 * 使用 refresh() 仅刷新未缓存数据
 * 适用于通知计数等实时数据
 *
 * refresh() 的特点：
 * - 不触及现有缓存
 * - 仅刷新未缓存的请求
 * - 与客户端 router.refresh() 互补
 */
export async function refreshNotificationCount() {
  // 模拟 refresh() 调用
  // 实际使用时: await refresh();

  // 刷新通知相关路径
  revalidatePath('/zh/notifications')
  revalidatePath('/en/notifications')

  return { success: true, action: 'refresh' }
}

/**
 * 博客文章更新 - 结合使用多种缓存失效策略
 */
export async function updateBlogPost(slug: string, locale: 'zh' | 'en') {
  // 1. 重新验证具体文章页
  revalidatePath(`/${locale}/blog/${slug}`)

  // 2. 重新验证博客列表页（包含该文章的列表）
  revalidatePath(`/${locale}/blog`)

  // 3. 使用 cacheLife profile 失效博客 tag
  // 'hours' profile 适合中等更新频率的内容
  revalidateTag('posts', 'hours')

  return { success: true, slug, locale }
}

/**
 * 仪表盘数据刷新 - 使用 refresh() 保持实时性
 */
export async function refreshDashboard(userId: string) {
  // 刷新用户仪表盘
  revalidatePath(`/zh/dashboard/${userId}`)
  revalidatePath(`/en/dashboard/${userId}`)

  // 仪表盘数据应该更频繁地刷新，使用 'minutes' profile
  revalidateTag(`dashboard-${userId}`, 'minutes')

  return { success: true, userId }
}

/**
 * 全站刷新 - 紧急情况使用
 */
export async function revalidateEverything() {
  const locales: Locale[] = ['zh', 'en']

  // 刷新所有主要页面
  for (const locale of locales) {
    revalidatePath(`/${locale}`)
    revalidatePath(`/${locale}/about`)
    revalidatePath(`/${locale}/contact`)
    revalidatePath(`/${locale}/team`)
    revalidatePath(`/${locale}/portfolio`)
    revalidatePath(`/${locale}/blog`)
  }

  // 刷新所有 content tags，使用最短缓存
  revalidateTag('posts', 'min')
  revalidateTag('projects', 'min')
  revalidateTag('team', 'min')

  return { success: true, action: 'full-revalidate' }
}

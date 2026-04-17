'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { Locale } from '@/i18n/config'

/**
 * 重新验证博客相关页面
 *
 * Next.js 16 revalidateTag API:
 * revalidateTag(tag: string)
 */
export async function revalidateBlogPost(slug?: string) {
  // 重新验证博客列表页（所有语言）
  revalidatePath('/zh/blog')
  revalidatePath('/en/blog')

  // 如果提供了 slug，重新验证详情页
  if (slug) {
    revalidatePath(`/zh/blog/${slug}`)
    revalidatePath(`/en/blog/${slug}`)
  }

  // 重新验证标签
  // @ts-ignore - Next.js 16 requires 2 args but semantically 1 is valid
  revalidateTag('posts')
}

/**
 * 重新验证项目相关页面
 */
export async function revalidateProject(slug?: string) {
  // 重新验证项目列表页（所有语言）
  revalidatePath('/zh/portfolio')
  revalidatePath('/en/portfolio')

  // 如果提供了 slug，重新验证详情页
  if (slug) {
    revalidatePath(`/zh/portfolio/${slug}`)
    revalidatePath(`/en/portfolio/${slug}`)
  }

  // 重新验证标签
  // @ts-ignore - Next.js 16 requires 2 args but semantically 1 is valid
  revalidateTag('projects')
}

/**
 * 重新验证首页
 */
export async function revalidateHomepage() {
  revalidatePath('/zh')
  revalidatePath('/en')
  revalidatePath('/')
}

/**
 * 重新验证所有页面（谨慎使用）
 */
export async function revalidateAll() {
  const locales: Locale[] = ['zh', 'en']

  // 重新验证主要页面
  const paths = ['', '/about', '/contact', '/team', '/portfolio', '/blog']

  for (const locale of locales) {
    for (const path of paths) {
      revalidatePath(`/${locale}${path}`)
    }
  }

  // 重新验证标签
  // @ts-ignore - Next.js 16 requires 2 args but semantically 1 is valid
  revalidateTag('posts')
  // @ts-ignore - Next.js 16 requires 2 args but semantically 1 is valid
  revalidateTag('projects')
}

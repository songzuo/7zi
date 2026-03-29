'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { Locale } from '@/i18n/config';

/**
 * 重新验证博客相关页面
 * 
 * 使用新的 cacheLife profile API:
 * - 'max': 最大程度缓存
 * - 'min': 最小程度缓存  
 * - 'hours': 按小时
 * - 'minutes': 按分钟
 * 
 * 迁移自旧的 revalidateTag(tag) 单参数形式
 */
export async function revalidateBlogPost(slug?: string) {
  // 重新验证博客列表页（所有语言）
  revalidatePath('/zh/blog');
  revalidatePath('/en/blog');

  // 如果提供了 slug，重新验证详情页
  if (slug) {
    revalidatePath(`/zh/blog/${slug}`);
    revalidatePath(`/en/blog/${slug}`);
  }

  // 使用新的 cacheLife profile API 重新验证标签
  // 'max' = 最大缓存时间，适合博客内容（变化不频繁）
  revalidateTag('posts', 'max');
}

/**
 * 重新验证项目相关页面
 */
export async function revalidateProject(slug?: string) {
  // 重新验证项目列表页（所有语言）
  revalidatePath('/zh/portfolio');
  revalidatePath('/en/portfolio');

  // 如果提供了 slug，重新验证详情页
  if (slug) {
    revalidatePath(`/zh/portfolio/${slug}`);
    revalidatePath(`/en/portfolio/${slug}`);
  }

  // 使用 'max' profile，适合项目展示页
  revalidateTag('projects', 'max');
}

/**
 * 重新验证首页
 */
export async function revalidateHomepage() {
  revalidatePath('/zh');
  revalidatePath('/en');
  revalidatePath('/');
}

/**
 * 重新验证所有页面（谨慎使用）
 */
export async function revalidateAll() {
  const locales: Locale[] = ['zh', 'en'];

  // 重新验证主要页面
  const paths = ['', '/about', '/contact', '/team', '/portfolio', '/blog'];

  for (const locale of locales) {
    for (const path of paths) {
      revalidatePath(`/${locale}${path}`);
    }
  }

  // 重新验证标签，使用新的 cacheLife profile
  revalidateTag('posts', 'max');
  revalidateTag('projects', 'max');
}

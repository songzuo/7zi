/**
 * SEO Metadata 配置文件
 * 集中管理所有页面的 metadata
 */

import { Metadata } from 'next'

export interface PageMetadata {
  title: string
  description: string
  keywords?: string[]
  image?: string
  noIndex?: boolean
  alternates?: {
    canonical?: string
    languages?: Record<string, string>
  }
}

export const siteConfig = {
  name: '7zi Frontend',
  description: 'Next.js 最佳实践演示项目 - 图片优化、国际化、主题系统',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com',
  ogImage: '/images/og-default.jpg',
  twitterHandle: '@7zi_dev',
}

export function generatePageMetadata(page: PageMetadata): Metadata {
  const { title, description, keywords, image, noIndex, alternates } = page
  const ogImage = image ? `${siteConfig.url}${image}` : `${siteConfig.url}${siteConfig.ogImage}`

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    keywords,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [ogImage],
      type: 'website',
      siteName: siteConfig.name,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [ogImage],
      creator: siteConfig.twitterHandle,
    },
    alternates: {
      canonical: alternates?.canonical,
      languages: alternates?.languages,
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  }
}

// 各页面 metadata 配置
export const pageMetadataConfig: Record<string, PageMetadata> = {
  home: {
    title: '首页',
    description:
      '7zi Frontend - Next.js 最佳实践演示项目，包含图片优化、国际化、主题系统、WebSocket 等功能演示',
    keywords: ['Next.js', 'React', '图片优化', 'WebP', 'AVIF', 'TypeScript'],
  },
  imageOptimization: {
    title: '图片优化示例',
    description:
      'Next.js Image 组件最佳实践 - WebP/AVIF 自动转换、懒加载、响应式图片、LCP 性能优化',
    keywords: ['Next.js Image', 'WebP', 'AVIF', '图片优化', '懒加载', '响应式图片'],
    image: '/images/og-image-optimization.jpg',
  },
  notificationDemo: {
    title: '通知系统示例',
    description: 'React 通知系统演示 - 支持多种类型、动画效果、可自定义位置和样式',
    keywords: ['React', 'Notification', 'Toast', '通知组件'],
  },
  designSystem: {
    title: '设计系统文档',
    description: '7zi Frontend 设计系统文档，包含组件库、设计 Token、颜色系统、排版规范',
    keywords: ['设计系统', 'Design System', '组件库', 'Design Token'],
  },
  feedback: {
    title: '用户反馈',
    description: '提交您的反馈和建议，帮助我们改进产品体验',
    keywords: ['反馈', '建议', '用户反馈'],
    noIndex: false,
  },
  knowledgeLattice: {
    title: '知识图谱 3D 可视化',
    description: '交互式 3D 知识图谱可视化，展示知识节点之间的连接关系',
    keywords: ['知识图谱', '3D 可视化', 'Three.js', 'Knowledge Graph'],
    image: '/images/og-knowledge-lattice.jpg',
  },
  i18nDemo: {
    title: '国际化示例',
    description: 'Next.js 国际化最佳实践演示 - 多语言切换、路由配置、翻译管理',
    keywords: ['i18n', '国际化', '多语言', 'Next.js i18n'],
  },
  darkModeDemo: {
    title: '暗色模式示例',
    description: 'Next.js 暗色模式演示 - 主题切换、系统偏好适配、持久化存储',
    keywords: ['Dark Mode', '暗色模式', '主题切换', 'Theme'],
  },
  websocketDemo: {
    title: 'WebSocket 状态演示',
    description: 'WebSocket 连接状态监控演示 - 实时连接状态、重连机制、消息流',
    keywords: ['WebSocket', '实时通信', '状态监控', 'Socket.io'],
  },
  monitoringExample: {
    title: '监控示例',
    description: '前端监控示例 - 性能监控、错误追踪、用户行为分析',
    keywords: ['监控', 'Monitoring', 'APM', '性能分析'],
  },
}
